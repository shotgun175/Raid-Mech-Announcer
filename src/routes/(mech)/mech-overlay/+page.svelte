<script lang="ts">
  import OLCombined from "$lib/components/mech/overlays/OLCombined.svelte";
  import OLCompact from "$lib/components/mech/overlays/OLCompact.svelte";
  import OLHudStrip from "$lib/components/mech/overlays/OLHudStrip.svelte";
  import OLCardStack from "$lib/components/mech/overlays/OLCardStack.svelte";
  import OLPill from "$lib/components/mech/overlays/OLPill.svelte";
  import OverlayControls from "$lib/components/mech/overlays/OverlayControls.svelte";
  import { formatGate, SEVERITY } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";
  import { isBossSwapPhase } from "$lib/data/raid-library";
  import { speakTts } from "$lib/utils/tts";
  import type { BossStatusData, Difficulty, Gate, Mechanic, MechSettings } from "$lib/mech-types";
  import { filterByDifficulty } from "$lib/utils/difficulty";
  import { activeRepeatMech, topMechPerThreshold } from "$lib/utils/mechanics";
  import { setClickthrough, stopTts } from "$lib/api";
  import { emit, listen, type UnlistenFn } from "@tauri-apps/api/event";

  // Cross-window debug log helper — the PeerJS strip lives in the main window;
  // the overlay emits and the main window's +layout listener pipes it through.
  const ttsLog = (msg: string) => emit("tts:debug", msg).catch(() => {});
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { LogicalSize } from "@tauri-apps/api/window";
  import { onDestroy, onMount } from "svelte";

  // Live data received via Tauri IPC events from the app window
  let currentBar = $state<number | null>(null);
  let totalBars = $state(300);
  let bossName = $state("");
  let gateId = $state<string | null>(null);
  let peerConnected = $state(false);
  // Set when the main window signals prolonged silence (~20s): stop showing the
  // "phase transition…" placeholder while keeping gateId, so HP resuming before the
  // 60s reset restores the live display without a re-match. Cleared when HP resumes
  // (boss-status with data) or on fight-start / encounter-end.
  let extendedSilence = $state(false);

  const gate = $derived(gateId ? (mechStore.raids.find((r) => r.id === gateId) ?? null) : null);
  const variant = $derived(mechStore.mechSettings.overlayVariant);
  const gateName = $derived(gate ? `G${formatGate(gate.gate)} · ${gate.raid.toUpperCase()}` : "");
  // On a boss-swap gate (e.g. Armoche G1), the live boss differs from the gate's listed primary
  // once the swap happens (Echidna -> Brelshaza). In that phase we name the live boss and render
  // no mechs (the listed mechs belong to the first boss, on a different HP pool).
  const inSwapPhase = $derived(!!gate && isBossSwapPhase(gate, bossName));
  const displayBossName = $derived(inSwapPhase ? bossName.split(",")[0] : gate ? gate.boss.split(",")[0] : bossName);
  const displayBar = $derived(currentBar ?? totalBars);
  // A boolean (not the raw bar count) so the resize effect re-runs only when HP appears or
  // goes silent — not on every HP tick, which would re-measure and fight manual resizes.
  const hasLiveHp = $derived(currentBar != null);
  const clickThrough = $derived(mechStore.mechSettings.clickThrough);
  // True when LOA Logs reports a tiny HP pool mid-fight (e.g. Echidna G2 stagger phase: 1/1 bars
  // vs gate's 285). 5% threshold catches stagger bars (0.35%) without triggering on real
  // later phases that may have a smaller but legitimate bar count.
  const isPhaseTransition = $derived(
    gate != null && currentBar != null && totalBars > 0 && totalBars < gate.totalBars * 0.05
  );
  const activeDifficulty = $derived<Difficulty | null>(
    gate ? ((mechStore.difficultyMap[gate.raid] as Difficulty) ?? null) : null
  );
  const visibleMechanics = $derived(gate && !inSwapPhase ? filterByDifficulty(gate.mechanics, activeDifficulty) : []);

  let lastAnnounced = $state<{ name: string; severity: string } | null>(null);
  let contentEl = $state<HTMLElement | null>(null);
  let announceTimer: ReturnType<typeof setTimeout> | null = null;
  let lastFiredKey = new Set<string>();
  const unlisteners: UnlistenFn[] = [];

  let activeMech = $state<Mechanic | null>(null);
  let repeatCountdown = $state<number | null>(null);
  let repeatTimerId: ReturnType<typeof setInterval> | null = null;
  let repeatAnnouncedThisCycle = false;

  function startRepeatTimer(mech: Mechanic) {
    ttsLog(`[TTS][overlay] startRepeatTimer "${mech.name}" repeat=${mech.repeatSecs}s`);
    if (repeatTimerId) {
      clearInterval(repeatTimerId);
      repeatTimerId = null;
    }
    activeMech = mech;
    repeatCountdown = mech.repeatSecs!;
    repeatAnnouncedThisCycle = false;
    repeatTimerId = setInterval(() => {
      if (repeatCountdown === null || activeMech === null) return;
      repeatCountdown--;
      if (repeatCountdown <= 0) {
        repeatCountdown = activeMech.repeatSecs!;
        repeatAnnouncedThisCycle = false;
      }
      const cfg = mechStore.mechSettings;
      if (!repeatAnnouncedThisCycle && repeatCountdown > 0 && repeatCountdown <= cfg.repeatLead) {
        repeatAnnouncedThisCycle = true;
        const secsLeft = repeatCountdown;
        ttsLog(`[TTS][overlay] repeat-timer fire "${activeMech.name}" secsLeft=${secsLeft}`);
        announce(
          activeMech.name,
          activeMech.severity,
          activeMech.ttsEnabled,
          `${activeMech.ttsText || activeMech.name} in ${secsLeft} second${secsLeft === 1 ? "" : "s"}`
        );
      }
    }, 1000);
  }

  function clearRepeatTimer() {
    if (repeatTimerId) {
      ttsLog(`[TTS][overlay] clearRepeatTimer (was "${activeMech?.name ?? "?"}")`);
      clearInterval(repeatTimerId);
      repeatTimerId = null;
    }
    activeMech = null;
    repeatCountdown = null;
    repeatAnnouncedThisCycle = false;
  }

  // Apply click-through and always-on-top to this window whenever the settings change
  $effect(() => {
    setClickthrough(clickThrough).catch(() => {});
  });

  $effect(() => {
    getCurrentWebviewWindow()
      .setAlwaysOnTop(mechStore.mechSettings.alwaysOnTop)
      .catch(() => {});
  });

  $effect(() => {
    document.documentElement.style.opacity = String(mechStore.mechSettings.opacity / 100);
  });

  // Initiate OS-level window drag on mousedown (only works when click-through is off)
  async function startDrag(e: MouseEvent) {
    if (e.button !== 0 || clickThrough) return;
    try {
      await getCurrentWebviewWindow().startDragging();
    } catch {}
  }

  function announce(name: string, severity: string, ttsEnabled: boolean, ttsText: string) {
    ttsLog(`[TTS][overlay] speakTts "${name}" tts=${ttsEnabled} bar=${currentBar} text="${ttsText}"`);
    const cfg = mechStore.mechSettings;
    if (ttsEnabled && cfg.announcementsEnabled !== false) {
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.ttsRate ?? 1.0);
    }
    if (cfg.hook && cfg.webhookEnabled !== false) {
      const colorMap: Record<string, number> = { normal: 0x38bdf8, major: 0xfb923c, wipe: 0xf87171 };
      const emoji = severity === "wipe" ? "💀" : severity === "major" ? "⚠️" : "ℹ️";
      fetch(cfg.hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: `${emoji} ${name}`,
              color: colorMap[severity] ?? 0x38bdf8,
              footer: { text: `Mech Announcer · ${gate?.raid} G${gate ? formatGate(gate.gate) : ""}` }
            }
          ]
        })
      })
        .then((r) => ttsLog(`[webhook] sent "${name}" status=${r.status}`))
        .catch((e) => ttsLog(`[webhook] FAILED "${name}" ${e instanceof Error ? e.message : String(e)}`));
    }
    lastAnnounced = { name, severity };
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      lastAnnounced = null;
    }, 3000);
  }

  $effect(() => {
    if (currentBar == null || !gate || isPhaseTransition) return;
    const bar = currentBar;
    const cfg = mechStore.mechSettings;
    // Mechs entering their hp-initial lead window this tick that haven't fired yet.
    const firing = visibleMechanics.filter(
      (m) => m.hpBar != null && bar <= m.hpBar + cfg.lead && bar > m.hpBar && !lastFiredKey.has(`${m.id}-initial`)
    );
    // Mark every entering mech fired so suppressed ones don't re-announce later, but only
    // speak one per shared hpBar — two mechs on the same threshold (e.g. Serca G1 Safe Zone +
    // Maiden Bingo at x100) would otherwise announce over each other. Losers still render.
    firing.forEach((m) => lastFiredKey.add(`${m.id}-initial`));
    topMechPerThreshold(firing).forEach((m) => {
      const barsLeft = bar - m.hpBar!;
      ttsLog(`[TTS][overlay] hp-initial fire "${m.name}" bar=${bar} hpBar=${m.hpBar}`);
      announce(
        m.name,
        m.severity,
        m.ttsEnabled,
        `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? "" : "s"}`
      );
    });

    // The active repeating mech is the one whose HP threshold was crossed most recently
    // (lowest hpBar the bar has dropped below). Crossing a later threshold overrides the
    // current one even if the user has been resetting its timer via confirm — confirm only
    // touches repeatCountdown, and this re-runs on every HP update.
    const newActive = activeRepeatMech(visibleMechanics, bar);
    if (newActive?.id !== activeMech?.id) {
      if (newActive) startRepeatTimer(newActive);
      else clearRepeatTimer();
    }
  });

  // Window size follows the overlay's live state. It only expands for the full mech overlay (a
  // matched gate showing real live HP). Every other state renders just a small pill (idle, no
  // gate matched, HP silent/placeholder, or a tiny-pool stagger phase such as a 1/1-bar clone
  // like "Abyssal Afterimage"), so it collapses to the compact waiting size instead of sitting
  // large. Content is measured once per expand (the ResizeObserver disconnects after the first
  // read) so manual mid-fight resizes aren't fought, and it re-expands when real HP resumes.
  $effect(() => {
    if (!gate || !hasLiveHp || isPhaseTransition) {
      getCurrentWebviewWindow()
        .setSize(new LogicalSize(500, 100))
        .catch(() => {});
      return;
    }
    if (!contentEl) return;
    const el = contentEl;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      const w = Math.ceil(width) + 48;
      const h = Math.ceil(height) + 48;
      ttsLog(`[overlay] auto-resize → ${w}×${h}`);
      getCurrentWebviewWindow()
        .setSize(new LogicalSize(w, h))
        .catch(() => {});
      ro.disconnect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  onMount(async () => {
    const win = getCurrentWebviewWindow();

    const unBoss = await listen<BossStatusData | null>("mech:boss-status", (event) => {
      const data = event.payload;
      if (!data || data.isDead) {
        // HP went silent (tier-1, 8s+) but the gate may still be active (phase transition,
        // brief stagger gap), so gateId and lastFiredKey are preserved for a clean resume.
        // The repeat timer IS stopped here: without live HP we can't know a repeating mech is
        // still due, and leaving it running announced a mech after a wipe. It restarts from the
        // HP-watching effect if HP resumes. Per-fight teardown is mech:encounter-end's job.
        if (currentBar !== null) ttsLog(`[TTS][overlay] boss-status cleared (was ${currentBar})`);
        currentBar = null;
        bossName = "";
        mechStore.applyRemoteEncourageMessage(null);
        clearRepeatTimer();
        stopTts(); // kill any queued/in-flight speech the moment HP goes silent (wipe/transition)
        return;
      }
      currentBar = data.currentBars;
      totalBars = data.totalBars;
      bossName = data.name;
      extendedSilence = false; // HP resumed — exit the extended-silence (placeholder-hidden) state
      // Prefer the gateId already resolved by the main window to avoid re-matching
      // against a potentially stale or differently-ordered raids snapshot here.
      if (data.gateId) {
        gateId = data.gateId;
      } else {
        const matched = mechStore.findBestGate(data.name);
        if (matched) gateId = matched.id;
      }
      // Encouragement line is picked in the main window so both windows agree.
      mechStore.applyRemoteEncourageMessage(data.encourageMessage ?? null);
    });

    // Show on live connection — no focus steal
    const unShow = await listen("mech:overlay-show", async () => {
      ttsLog(`[overlay] event mech:overlay-show → win.show()`);
      await win.show();
    });

    // Show on boot for preview/positioning (app sends this at startup)
    const unPreview = await listen("mech:overlay-preview", async () => {
      ttsLog(`[overlay] event mech:overlay-preview → win.show()`);
      await win.show();
    });

    const unHide = await listen("mech:overlay-hide", async () => {
      // Only hide when live data ends — keep visible if in preview mode
      const willHide = currentBar === null;
      ttsLog(`[overlay] event mech:overlay-hide → ${willHide ? "win.hide()" : "kept visible (preview)"}`);
      if (willHide) await win.hide();
    });

    const unSettings = await listen<MechSettings>("mech:settings-changed", (event) => {
      mechStore.applyRemoteSettings(event.payload);
    });

    const unRaids = await listen<Gate[]>("mech:raids-changed", (event) => {
      mechStore.applyRemoteRaids(event.payload);
    });

    const unFightStart = await listen("mech:fight-start", () => {
      ttsLog(`[TTS][overlay] fight-start → reset firedKey + repeatTimer`);
      lastFiredKey = new Set();
      clearRepeatTimer();
      extendedSilence = false;
    });

    // Prolonged silence (~20s): drop the "phase transition…" placeholder but keep gateId +
    // fired keys. The main window keeps the gate alive until the 60s reset, so HP resuming
    // before then restores the live display cleanly (handled by the boss-status listener).
    const unQuiet = await listen("mech:overlay-quiet", () => {
      ttsLog(`[overlay] overlay-quiet → hide placeholder (gate state kept)`);
      extendedSilence = true;
    });

    const unConfirm = await listen("mech:confirm", () => {
      if (activeMech) {
        repeatCountdown = activeMech.repeatSecs!;
        repeatAnnouncedThisCycle = false;
      }
    });

    const unDiff = await listen<Record<string, string>>("mech:difficulty-changed", (event) => {
      mechStore.applyRemoteDifficultyMap(event.payload);
    });

    const unPeer = await listen<{ isConnected: boolean }>("mech:peer-status", (event) => {
      peerConnected = event.payload.isConnected;
    });

    // Main window signals a true encounter end (LOA fight-end, boss isDead matching
    // active gate, or Tier-2 silence safety net). Drop all per-fight state so the next
    // boss-status event re-binds against the new gate cleanly.
    const unEnd = await listen("mech:encounter-end", () => {
      ttsLog(`[overlay] encounter-end → clear gateId + fired keys + repeat timer`);
      gateId = null;
      currentBar = null;
      bossName = "";
      mechStore.applyRemoteEncourageMessage(null);
      clearRepeatTimer();
      stopTts(); // flush any queued/in-flight speech so nothing leaks out after stop/clear/end
      lastFiredKey = new Set();
      extendedSilence = false;
    });

    unlisteners.push(
      unBoss,
      unShow,
      unPreview,
      unHide,
      unSettings,
      unRaids,
      unFightStart,
      unQuiet,
      unConfirm,
      unDiff,
      unPeer,
      unEnd
    );
  });

  onDestroy(() => {
    unlisteners.forEach((fn) => fn());
    if (announceTimer) clearTimeout(announceTimer);
    clearRepeatTimer();
  });
</script>

<!--
  data-tauri-drag-region on the container allows dragging the window when
  click-through is OFF. When click-through is ON all mouse events pass
  straight through to the game so dragging is intentionally impossible.

  When not live, show a preview pill so the user can position and check scale.
-->
{#if currentBar == null && gate && !extendedSilence}
  <!-- Gate is active but boss went silent (phase transition / brief stagger gap).
       Overlay stays visible with a placeholder until HP resumes — but only until the
       ~20s extended-silence mark (extendedSilence), after which it falls through to the
       idle pill so a wipe doesn't sit on this for the full 60s. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    class="absolute top-8 left-1/2 -translate-x-1/2 select-none"
    style="cursor: grab; width: max-content;"
  >
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(167,139,250,0.3); border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif;"
    >
      <div
        style="width: 8px; height: 8px; border-radius: 50%; background: #a78bfa; animation: mech-pulse 2s ease-in-out infinite;"
      ></div>
      <span style="font-size: 13px; color: #c4b5fd; font-weight: 500;"
        >{gate.boss.split(",")[0]} - phase transition…</span
      >
    </div>
  </div>
{:else if currentBar == null}
  <!-- No data and no gate: truly idle, waiting for LOA Logs / fight start. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    class="absolute top-8 left-1/2 -translate-x-1/2 select-none"
    style="cursor: grab; width: max-content;"
  >
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif;"
    >
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #525252;"></div>
      <span style="font-size: 13px; color: #a3a3a3; font-weight: 500;"
        >Mech Announcer - {peerConnected ? "waiting for fight to start" : "waiting for LOA Logs"}</span
      >
    </div>
  </div>
{:else if !gate}
  <!-- HP data flowing but boss name didn't match any imported gate -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    class="absolute top-8 left-1/2 -translate-x-1/2 select-none"
    style="cursor: grab; width: max-content;"
  >
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(251,146,60,0.3); border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif;"
    >
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #fb923c; opacity: 0.6;"></div>
      <span style="font-size: 13px; color: #a3a3a3; font-weight: 500;">
        {bossName ? `"${bossName}" - import this raid to see mechanics` : "Mech Announcer - no gate matched"}
      </span>
    </div>
  </div>
{:else if isPhaseTransition}
  <!-- Different HP pool mid-fight (e.g. Echidna G2 stagger phase: 1/1 vs gate's 285 bars) -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    onmousedown={startDrag}
    class="absolute top-8 left-1/2 -translate-x-1/2 select-none"
    style="cursor: grab; width: max-content;"
  >
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(167,139,250,0.3); border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif;"
    >
      <div
        style="width: 8px; height: 8px; border-radius: 50%; background: #a78bfa; animation: mech-pulse 2s ease-in-out infinite;"
      ></div>
      <span style="font-size: 13px; color: #c4b5fd; font-weight: 500;">{bossName || "Phase transition…"}</span>
    </div>
  </div>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={contentEl}
    onmousedown={startDrag}
    class="absolute top-8 left-1/2 -translate-x-1/2 select-none"
    style="z-index: 10; cursor: {clickThrough ? 'default' : 'grab'};"
  >
    {#if variant === "standard"}
      <OLCombined
        mechanics={visibleMechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
        {activeMech}
        {repeatCountdown}
      />
    {:else if variant === "compact"}
      <OLCompact
        mechanics={visibleMechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
        {activeMech}
        {repeatCountdown}
      />
    {:else if variant === "hud"}
      <OLHudStrip
        mechanics={visibleMechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
        {activeMech}
        {repeatCountdown}
      />
    {:else if variant === "card"}
      <OLCardStack
        mechanics={visibleMechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        {activeMech}
        {repeatCountdown}
      />
    {:else}
      <OLPill
        mechanics={visibleMechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        {activeMech}
        {repeatCountdown}
      />
    {/if}

    {#if lastAnnounced}
      {@const sev = SEVERITY[lastAnnounced.severity as keyof typeof SEVERITY]}
      <div
        style="margin-top: 8px; background: {sev.dim}; border: 1px solid {sev.border}; border-radius: 4px; padding: 6px 14px; font-size: 13px; color: {sev.color}; font-weight: 600; text-align: center;"
      >
        🔊 {lastAnnounced.name}
      </div>
    {/if}
  </div>
{/if}

<OverlayControls {clickThrough} />
