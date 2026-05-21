<script lang="ts">
  import OLCardStack from "$lib/components/mech/overlays/OLCardStack.svelte";
  import OLCompact from "$lib/components/mech/overlays/OLCompact.svelte";
  import OLCombined from "$lib/components/mech/overlays/OLCombined.svelte";
  import OLHudStrip from "$lib/components/mech/overlays/OLHudStrip.svelte";
  import OLPill from "$lib/components/mech/overlays/OLPill.svelte";
  import { BOSS_HP_COLORS, formatGate, SEVERITY } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";
  import { peerState } from "$lib/mech-peer.svelte";
  import { speakTts } from "$lib/utils/tts";
  import { filterByDifficulty } from "$lib/utils/difficulty";
  import { onDestroy } from "svelte";
  import type { Difficulty, Mechanic } from "$lib/mech-types";

  type VariantId = "standard" | "compact" | "hud" | "card" | "pill";

  const gate = $derived(mechStore.selectedGate);
  const isLive = $derived(mechStore.isLive);
  const activeDifficulty = $derived<Difficulty | null>(
    gate ? ((mechStore.difficultyMap[gate.raid] as Difficulty) ?? null) : null
  );
  const visibleMechanics = $derived(gate ? filterByDifficulty(gate.mechanics, activeDifficulty) : []);

  let variant = $state<VariantId>((mechStore.mechSettings.overlayVariant as VariantId) ?? "standard");
  // svelte-ignore state_referenced_locally
  let _simBar = $state(gate?.totalBars ?? 300);
  const simBar = $derived(mechStore.liveBar ?? _simBar);

  let playing = $state(false);
  let speed = $state(3);
  let lastAnnounced = $state<{ name: string; severity: string } | null>(null);
  let firedSet = new Set<string>();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let overlayEl = $state<HTMLElement | null>(null);
  let dragPos = $state<{ x: number; y: number } | null>(null);

  let activeMechSim = $state<Mechanic | null>(null);
  let repeatCountdownSim = $state<number | null>(null);
  let repeatTimerSim: ReturnType<typeof setInterval> | null = null;
  let repeatAnnouncedSim = false;

  function startSimTimer(mech: Mechanic) {
    peerState.pushDebugLog(
      `[TTS][preview] startSimTimer "${mech.name}" repeat=${mech.repeatSecs}s live=${mechStore.isLive}`
    );
    if (repeatTimerSim) {
      clearInterval(repeatTimerSim);
      repeatTimerSim = null;
    }
    activeMechSim = mech;
    repeatCountdownSim = mech.repeatSecs!;
    repeatAnnouncedSim = false;
    repeatTimerSim = setInterval(() => {
      if (repeatCountdownSim === null || activeMechSim === null) return;
      repeatCountdownSim--;
      if (repeatCountdownSim <= 0) {
        repeatCountdownSim = activeMechSim.repeatSecs!;
        repeatAnnouncedSim = false;
      }
      const cfg = mechStore.mechSettings;
      if (!repeatAnnouncedSim && repeatCountdownSim > 0 && repeatCountdownSim <= cfg.repeatLead) {
        repeatAnnouncedSim = true;
        const secsLeft = repeatCountdownSim;
        peerState.pushDebugLog(
          `[TTS][preview] sim-timer fire "${activeMechSim.name}" secsLeft=${secsLeft} live=${mechStore.isLive}`
        );
        fireAnnouncement(
          activeMechSim.name,
          activeMechSim.severity,
          activeMechSim.ttsEnabled,
          `${activeMechSim.ttsText || activeMechSim.name} in ${secsLeft} second${secsLeft === 1 ? "" : "s"}`
        );
      }
    }, 1000);
  }

  function clearSimTimer() {
    if (repeatTimerSim) {
      peerState.pushDebugLog(`[TTS][preview] clearSimTimer (was "${activeMechSim?.name ?? "?"}")`);
      clearInterval(repeatTimerSim);
      repeatTimerSim = null;
    }
    activeMechSim = null;
    repeatCountdownSim = null;
    repeatAnnouncedSim = false;
  }

  $effect(() => {
    if (gate) {
      _simBar = gate.totalBars;
      firedSet = new Set();
      clearSimTimer();
    }
  });

  $effect(() => {
    if (!gate || isLive) return;
    const cfg = mechStore.mechSettings;
    visibleMechanics.forEach((m) => {
      if (m.hpBar == null) return;

      // HP trigger: fires once as _simBar enters the lead window before the mechanic
      const fireAt = m.hpBar + cfg.lead;
      const initKey = `${m.id}-initial`;
      if (_simBar <= fireAt && _simBar > m.hpBar && !firedSet.has(initKey)) {
        firedSet.add(initKey);
        const barsLeft = _simBar - m.hpBar;
        peerState.pushDebugLog(
          `[TTS][preview] sim-initial fire "${m.name}" simBar=${_simBar} hpBar=${m.hpBar} live=${isLive}`
        );
        fireAnnouncement(
          m.name,
          m.severity,
          m.ttsEnabled,
          `${m.ttsText || m.name} in ${barsLeft} bar${barsLeft === 1 ? "" : "s"}`
        );
      }
    });

    // Detect active hp+timer mechanic in sim
    const newActive =
      [...visibleMechanics]
        .filter((m) => m.repeatSecs != null && m.hpBar != null && _simBar < (m.hpBar ?? 0))
        .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
        .at(-1) ?? null;
    if (newActive?.id !== activeMechSim?.id) {
      if (newActive) startSimTimer(newActive);
      else clearSimTimer();
    }

    // Drive the encouragement state from the sim — setBossStatus only runs during live.
    mechStore.recomputeEncourage(_simBar, gate.id);
  });

  function fireAnnouncement(name: string, severity: string, ttsEnabled: boolean, ttsText: string) {
    // Suppress preview announcements during a real fight — the mech-overlay
    // window owns live announcements; otherwise both windows fire and the TTS
    // audio doubles up.
    if (mechStore.isLive) {
      peerState.pushDebugLog(`[TTS][preview] SUPPRESSED (live) "${name}"`);
      return;
    }
    peerState.pushDebugLog(`[TTS][preview] speakTts "${name}" tts=${ttsEnabled} text="${ttsText}"`);
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
        .then((r) => peerState.pushDebugLog(`[webhook][preview] sent "${name}" status=${r.status}`))
        .catch((e) =>
          peerState.pushDebugLog(`[webhook][preview] FAILED "${name}" ${e instanceof Error ? e.message : String(e)}`)
        );
    }
    lastAnnounced = { name, severity };
    setTimeout(() => {
      lastAnnounced = null;
    }, 3000);
  }

  $effect(() => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (playing && !isLive) {
      intervalId = setInterval(() => {
        if (_simBar <= 0) {
          playing = false;
          _simBar = 0;
          return;
        }
        _simBar = _simBar - 1;
      }, 1000 / speed);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  });

  function togglePlay() {
    if (_simBar <= 0) {
      _simBar = gate?.totalBars ?? 300;
      firedSet = new Set();
    }
    playing = !playing;
  }

  const variants: { id: VariantId; label: string }[] = [
    { id: "standard", label: "★ Standard" },
    { id: "compact", label: "Compact List" },
    { id: "hud", label: "HUD Strip" },
    { id: "card", label: "Card Stack" },
    { id: "pill", label: "Minimal Pill" }
  ];

  const gateName = $derived(gate ? `G${formatGate(gate.gate)} · ${gate.raid.toUpperCase()}` : "");
  const bossName = $derived(gate ? gate.boss.split(",")[0] : "");

  const barColor = $derived.by(() => {
    if (!gate) return BOSS_HP_COLORS[0];
    const idx = Math.max(0, Math.ceil((simBar / gate.totalBars) * BOSS_HP_COLORS.length) - 1);
    return BOSS_HP_COLORS[idx % BOSS_HP_COLORS.length];
  });

  const overlayDefaultStyle = "position: absolute; top: 60px; left: 50%; transform: translateX(-50%);";

  function startDrag(e: MouseEvent) {
    if (e.button !== 0 || !overlayEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const parentRect = overlayEl.parentElement!.getBoundingClientRect();
    const ox = e.clientX - rect.left,
      oy = e.clientY - rect.top;
    // Snap to absolute position immediately so the element doesn't jump on first move
    dragPos = { x: rect.left - parentRect.left, y: rect.top - parentRect.top };
    const onMove = (me: MouseEvent) => {
      dragPos = { x: me.clientX - parentRect.left - ox, y: me.clientY - parentRect.top - oy };
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  onDestroy(() => {
    clearSimTimer();
  });
</script>

<div style="display: flex; flex-direction: column; height: 100%;">
  <!-- Controls bar -->
  <div
    style="padding: 10px 16px; border-bottom: 1px solid #262626; background: rgba(23,23,23,0.7); display: flex; align-items: center; gap: 12px; flex-shrink: 0; flex-wrap: wrap;"
  >
    <span
      style="font-size: 12px; color: #a3a3a3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0;"
      >Style</span
    >
    <div
      style="display: flex; gap: 2px; background: #0a0a0a; border-radius: 5px; padding: 2px; border: 1px solid #262626;"
    >
      {#each variants as v (v.id)}
        <button
          onclick={() => {
            variant = v.id;
            dragPos = null;
            mechStore.updateSetting("overlayVariant", v.id);
          }}
          style="background: {variant === v.id
            ? '#262626'
            : 'transparent'}; border: none; border-radius: 3px; padding: 4px 10px; color: {variant === v.id
            ? '#fafafa'
            : '#a3a3a3'}; cursor: pointer; font-size: 12px; font-weight: {variant === v.id
            ? 600
            : 400}; transition: all 0.15s; font-family: inherit;">{v.label}</button
        >
      {/each}
    </div>
    <div style="margin-left: auto; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      <span
        style="font-size: 12px; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; flex-shrink: 0;"
        >Simulate HP:</span
      >
      <input
        type="range"
        min={0}
        max={gate?.totalBars ?? 300}
        value={simBar}
        oninput={(e) => {
          if (!isLive) {
            playing = false;
            _simBar = parseInt((e.target as HTMLInputElement).value);
          }
        }}
        style="width: 130px; accent-color: #38bdf8; {isLive ? 'opacity: 0.4; cursor: not-allowed;' : ''}"
      />
      <span
        style="font-size: 12px; font-family: ui-monospace, monospace; color: {isLive
          ? '#4ade80'
          : '#38bdf8'}; min-width: 60px; font-weight: 600; flex-shrink: 0;"
      >
        {simBar}/{gate?.totalBars ?? 300}{#if isLive}
          <span style="font-size: 12px;">LIVE</span>{/if}
      </span>
      {#if !isLive}
        <select
          bind:value={speed}
          style="background: #262626; border: 1px solid #262626; border-radius: 3px; padding: 3px 6px; color: #fafafa; font-size: 12px; outline: none; font-family: inherit;"
        >
          <option value={1}>1×</option>
          <option value={3}>3×</option>
          <option value={8}>8×</option>
        </select>
        <button
          onclick={togglePlay}
          style="background: {playing ? 'rgba(251,146,60,0.1)' : 'rgba(56,189,248,0.1)'}; border: 1px solid {playing
            ? '#fb923c60'
            : 'rgba(56,189,248,0.3)'}; border-radius: 3px; padding: 4px 12px; color: {playing
            ? '#fb923c'
            : '#38bdf8'}; cursor: pointer; font-size: 12px; font-weight: 700; font-family: inherit; flex-shrink: 0; min-width: 92px; text-align: center;"
          >{playing ? "⏸ PAUSE" : _simBar <= 0 ? "↺ RESTART" : "▶ PLAY"}</button
        >
      {:else}
        <span style="font-size: 12px; color: #4ade80; font-weight: 700; font-family: ui-monospace, monospace;"
          >● LIVE</span
        >
      {/if}
    </div>
  </div>

  <!-- Simulation area -->
  <div
    style="flex: 1; position: relative; overflow: hidden; background: radial-gradient(ellipse at 50% 70%, rgba(40,25,60,0.4) 0%, transparent 60%), linear-gradient(180deg, #050506 0%, #0a0c12 50%, #050406 100%);"
  >
    <!-- Fake boss HP bar -->
    {#if gate}
      <div
        style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 340px; text-align: center;"
      >
        <div
          style="font-size: 12px; color: rgba(255,255,255,0.5); letter-spacing: 0.08em; margin-bottom: 4px; font-weight: 500;"
        >
          {gate.boss.toUpperCase()}
        </div>
        <div
          style="height: 7px; border-radius: 4px; background: rgba(255,255,255,0.1); overflow: hidden; border: 1px solid rgba(255,255,255,0.12);"
        >
          <div
            style="height: 100%; width: {(simBar / gate.totalBars) *
              100}%; background: {barColor}; transition: all 0.3s;"
          ></div>
        </div>
        <div
          style="font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 3px; font-family: ui-monospace, monospace;"
        >
          {simBar} / {gate.totalBars} bars
        </div>
      </div>
    {/if}

    <!-- Draggable overlay widget -->
    {#if gate}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        bind:this={overlayEl}
        style="{dragPos
          ? `position: absolute; left: ${dragPos.x}px; top: ${dragPos.y}px;`
          : overlayDefaultStyle} cursor: grab;"
        onmousedown={startDrag}
      >
        {#if variant === "standard"}
          <OLCombined
            mechanics={visibleMechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            {bossName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
        {:else if variant === "compact"}
          <OLCompact
            mechanics={visibleMechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            {bossName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
        {:else if variant === "hud"}
          <OLHudStrip
            mechanics={visibleMechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            {bossName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
        {:else if variant === "card"}
          <OLCardStack
            mechanics={visibleMechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
        {:else}
          <OLPill
            mechanics={visibleMechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
        {/if}

        {#if lastAnnounced}
          {@const s = SEVERITY[lastAnnounced.severity as keyof typeof SEVERITY]}
          <div
            style="margin-top: 8px; background: {s.dim}; border: 1px solid {s.border}; border-radius: 4px; padding: 6px 12px; font-size: 12px; color: {s.color}; font-weight: 600; text-align: center;"
          >
            🔊 {lastAnnounced.name}
          </div>
        {/if}
      </div>
    {:else}
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center;">
        <div style="font-size: 13px; color: #8a8a8a;">Select a gate in the Raid Editor to preview</div>
      </div>
    {/if}
  </div>

  <!-- Footer -->
  <div
    style="flex-shrink: 0; padding: 8px 16px; background: #0f0f0f; border-top: 1px solid #262626; display: flex; align-items: center; justify-content: center; gap: 6px;"
  >
    <span style="font-size: 12px; color: #8a8a8a;"
      >Drag the widget to reposition · Use the slider or ▶ Play to simulate HP draining</span
    >
  </div>
</div>
