<script lang="ts">
  import OLCombined from "$lib/components/mech/overlays/OLCombined.svelte";
  import OLCompact from "$lib/components/mech/overlays/OLCompact.svelte";
  import OLHudStrip from "$lib/components/mech/overlays/OLHudStrip.svelte";
  import OLCardStack from "$lib/components/mech/overlays/OLCardStack.svelte";
  import OLPill from "$lib/components/mech/overlays/OLPill.svelte";
  import OverlayControls from "$lib/components/mech/overlays/OverlayControls.svelte";
  import { SEVERITY } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";
  import { speakTts } from "$lib/utils/tts";
  import type { BossStatusData, Gate, Mechanic, MechSettings } from "$lib/mech-types";
  import { setClickthrough } from "$lib/api";
  import { listen, type UnlistenFn } from "@tauri-apps/api/event";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { LogicalSize } from "@tauri-apps/api/window";
  import { onDestroy, onMount } from "svelte";

  // Live data received via Tauri IPC events from the app window
  let currentBar = $state<number | null>(null);
  let totalBars = $state(300);
  let bossName = $state("");
  let gateId = $state<string | null>(null);

  const gate = $derived(gateId ? (mechStore.raids.find((r) => r.id === gateId) ?? null) : null);
  const variant = $derived(mechStore.mechSettings.overlayVariant);
  const gateName = $derived(gate ? `G${gate.gate} · ${gate.raid.toUpperCase()}` : "");
  const displayBossName = $derived(gate ? gate.boss.split(",")[0] : bossName);
  const displayBar = $derived(currentBar ?? totalBars);
  const clickThrough = $derived(mechStore.mechSettings.clickThrough);

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
    if (repeatTimerId) { clearInterval(repeatTimerId); repeatTimerId = null; }
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
        announce(
          activeMech.name, activeMech.severity, activeMech.ttsEnabled,
          `${activeMech.ttsText || activeMech.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
        );
      }
    }, 1000);
  }

  function clearRepeatTimer() {
    if (repeatTimerId) { clearInterval(repeatTimerId); repeatTimerId = null; }
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
    const cfg = mechStore.mechSettings;
    if (ttsEnabled) {
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.pitch ?? 1, cfg.ttsRate ?? 1.0);
    }
    if (cfg.hook) {
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
              footer: { text: `Mech Announcer · ${gate?.raid} G${gate?.gate}` }
            }
          ]
        })
      }).catch((e) => console.warn("Webhook error", e));
    }
    lastAnnounced = { name, severity };
    if (announceTimer) clearTimeout(announceTimer);
    announceTimer = setTimeout(() => {
      lastAnnounced = null;
    }, 3000);
  }

  $effect(() => {
    if (currentBar == null || !gate) return;
    const bar = currentBar;
    const cfg = mechStore.mechSettings;
    gate.mechanics.forEach((m) => {
      if (m.hpBar == null) return;

      // HP trigger: fires once as bar enters the lead window before the mechanic
      const fireAt = m.hpBar + cfg.lead;
      const initKey = `${m.id}-initial`;
      if (bar <= fireAt && bar > m.hpBar && !lastFiredKey.has(initKey)) {
        lastFiredKey.add(initKey);
        const barsLeft = bar - m.hpBar;
        announce(
          m.name, m.severity, m.ttsEnabled,
          `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`
        );
      }
    });

    // Detect the most recently triggered hp+timer mechanic; reset timer when it changes
    const newActive =
      [...gate.mechanics]
        .filter((m) => m.repeatSecs != null && m.hpBar != null && bar < (m.hpBar ?? 0))
        .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
        .at(-1) ?? null;
    if (newActive?.id !== activeMech?.id) {
      if (newActive) startRepeatTimer(newActive);
      else clearRepeatTimer();
    }
  });

  // Auto-resize to content when a gate loads. Fires once per gate — ResizeObserver
  // disconnects after the first measurement so it doesn't fight manual resizes mid-fight.
  $effect(() => {
    if (!gate || !contentEl) return;
    const el = contentEl;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      getCurrentWebviewWindow()
        .setSize(new LogicalSize(Math.ceil(width) + 48, Math.ceil(height) + 32))
        .catch(() => {});
      ro.disconnect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  });

  // Set compact waiting size when idle (on mount and on fight end).
  $effect(() => {
    if (gate) return;
    getCurrentWebviewWindow()
      .setSize(new LogicalSize(360, 90))
      .catch(() => {});
  });

  onMount(async () => {
    const win = getCurrentWebviewWindow();

    const unBoss = await listen<BossStatusData | null>("mech:boss-status", (event) => {
      const data = event.payload;
      if (!data || data.isDead) {
        currentBar = null;
        gateId = null;
        return;
      }
      currentBar = data.currentBars;
      totalBars = data.totalBars;
      bossName = data.name;
      // Prefer the gateId already resolved by the main window to avoid re-matching
      // against a potentially stale or differently-ordered raids snapshot here.
      if (data.gateId) {
        gateId = data.gateId;
      } else {
        const matched = mechStore.findBestGate(data.name);
        if (matched) gateId = matched.id;
      }
    });

    // Show on live connection — no focus steal
    const unShow = await listen("mech:overlay-show", async () => {
      await win.show();
    });

    // Show on boot for preview/positioning (app sends this at startup)
    const unPreview = await listen("mech:overlay-preview", async () => {
      await win.show();
    });

    const unHide = await listen("mech:overlay-hide", async () => {
      // Only hide when live data ends — keep visible if in preview mode
      if (currentBar === null) await win.hide();
    });

    const unSettings = await listen<MechSettings>("mech:settings-changed", (event) => {
      mechStore.applyRemoteSettings(event.payload);
    });

    const unRaids = await listen<Gate[]>("mech:raids-changed", (event) => {
      mechStore.applyRemoteRaids(event.payload);
    });

    const unFightStart = await listen("mech:fight-start", () => {
      lastFiredKey = new Set();
      clearRepeatTimer();
    });

    const unConfirm = await listen("mech:confirm", () => {
      if (activeMech) {
        repeatCountdown = activeMech.repeatSecs!;
        repeatAnnouncedThisCycle = false;
      }
    });

    unlisteners.push(unBoss, unShow, unPreview, unHide, unSettings, unRaids, unFightStart, unConfirm);
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
{#if currentBar == null}
  <!-- Preview / positioning mode -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div onmousedown={startDrag} class="absolute top-4 left-1/2 -translate-x-1/2 select-none" style="cursor: grab;">
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(56,189,248,0.3); border-radius: 8px; padding: 10px 18px; display: flex; align-items: center; gap: 10px; font-family: Inter, sans-serif;"
    >
      <div style="width: 8px; height: 8px; border-radius: 50%; background: #525252;"></div>
      <span style="font-size: 13px; color: #a3a3a3; font-weight: 500;">Mech Announcer — waiting for LOA Logs</span>
    </div>
  </div>
{:else if gate}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={contentEl}
    onmousedown={startDrag}
    class="absolute top-4 left-1/2 -translate-x-1/2 select-none"
    style="z-index: 10; cursor: {clickThrough ? 'default' : 'grab'};"
  >
    {#if variant === "standard"}
      <OLCombined
        mechanics={gate.mechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
        {activeMech}
        {repeatCountdown}
      />
    {:else if variant === "compact"}
      <OLCompact mechanics={gate.mechanics} currentBar={displayBar} {totalBars} {gateName} bossName={displayBossName} />
    {:else if variant === "hud"}
      <OLHudStrip
        mechanics={gate.mechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
      />
    {:else if variant === "card"}
      <OLCardStack mechanics={gate.mechanics} currentBar={displayBar} {totalBars} {gateName} />
    {:else}
      <OLPill mechanics={gate.mechanics} currentBar={displayBar} {totalBars} {gateName} />
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
