<script lang="ts">
  import OLCardStack from "$lib/components/mech/overlays/OLCardStack.svelte";
  import OLCompact from "$lib/components/mech/overlays/OLCompact.svelte";
  import OLCombined from "$lib/components/mech/overlays/OLCombined.svelte";
  import OLHudStrip from "$lib/components/mech/overlays/OLHudStrip.svelte";
  import OLPill from "$lib/components/mech/overlays/OLPill.svelte";
  import { BOSS_HP_COLORS, SEVERITY } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";
  import Header from "../Header.svelte";

  type VariantId = "combined" | "compact" | "hud" | "card" | "pill";

  const gate = $derived(mechStore.selectedGate);
  const isLive = $derived(mechStore.isLive);

  let variant = $state<VariantId>("combined");
  let _simBar = $state(gate?.totalBars ?? 300);
  const simBar = $derived(mechStore.liveBar ?? _simBar);

  let playing = $state(false);
  let speed = $state(3);
  let lastAnnounced = $state<{ name: string; severity: string } | null>(null);
  let firedSet = new Set<string>();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let overlayEl = $state<HTMLElement | null>(null);
  let dragPos = $state<{ x: number; y: number } | null>(null);

  $effect(() => {
    if (gate) { _simBar = gate.totalBars; firedSet = new Set(); }
  });

  // TTS lead-time firing
  $effect(() => {
    if (!gate || isLive) return;
    const lead = mechStore.mechSettings.lead;
    gate.mechanics.forEach(m => {
      if (m.hpBar == null) return;
      const fireAt = m.hpBar + lead;
      const cycleKey = `${m.id}-${Math.floor(_simBar / (m.repeatSecs ?? 999999))}`;
      if (_simBar <= fireAt && _simBar > m.hpBar && !firedSet.has(cycleKey)) {
        firedSet.add(cycleKey);
        fireAnnouncement(m.name, m.severity, m.ttsEnabled, m.ttsText);
      }
    });
  });

  function fireAnnouncement(name: string, severity: string, ttsEnabled: boolean, ttsText: string) {
    const cfg = mechStore.mechSettings;
    if (ttsEnabled) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(ttsText || name);
        u.volume = (cfg.vol ?? 80) / 100;
        u.pitch = cfg.pitch ?? 1;
        speechSynthesis.speak(u);
      } catch (e) { console.warn("TTS error", e); }
    }
    if (cfg.hook) {
      const colorMap: Record<string, number> = { normal: 0x38bdf8, major: 0xfb923c, wipe: 0xf87171 };
      const emoji = severity === "wipe" ? "💀" : severity === "major" ? "⚠️" : "ℹ️";
      fetch(cfg.hook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `${emoji} ${name}`,
            color: colorMap[severity] ?? 0x38bdf8,
            footer: { text: `Mech Announcer · ${gate?.raid} G${gate?.gate}` },
          }],
        }),
      }).catch(e => console.warn("Webhook error", e));
    }
    lastAnnounced = { name, severity };
    setTimeout(() => { lastAnnounced = null; }, 3000);
  }

  $effect(() => {
    if (playing && !isLive) {
      intervalId = setInterval(() => {
        if (_simBar <= 0) { playing = false; _simBar = 0; return; }
        _simBar = _simBar - 1;
      }, 1000 / speed);
    } else {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
    }
    return () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
  });

  function togglePlay() {
    if (_simBar <= 0) { _simBar = gate?.totalBars ?? 300; firedSet = new Set(); }
    playing = !playing;
  }

  const variants: { id: VariantId; label: string }[] = [
    { id: "combined", label: "★ Combined" },
    { id: "compact", label: "Compact List" },
    { id: "hud", label: "HUD Strip" },
    { id: "card", label: "Card Stack" },
    { id: "pill", label: "Minimal Pill" },
  ];

  const gateName = $derived(gate ? `G${gate.gate} · ${gate.raid.toUpperCase()}` : "");
  const bossName = $derived(gate ? gate.boss.split(",")[0] : "");

  const barColor = $derived(() => {
    if (!gate) return BOSS_HP_COLORS[0];
    const idx = Math.max(0, Math.ceil((simBar / gate.totalBars) * BOSS_HP_COLORS.length) - 1);
    return BOSS_HP_COLORS[idx % BOSS_HP_COLORS.length];
  });

  const overlayDefaultStyle = $derived(
    variant === "hud"      ? "position: absolute; top: 40px; left: 50%; transform: translateX(-50%);"
    : variant === "pill"   ? "position: absolute; bottom: 110px; left: 50%; transform: translateX(-50%);"
    : variant === "card"   ? "position: absolute; top: 80px; right: 30px;"
    : variant === "combined" ? "position: absolute; top: 60px; left: 50%; transform: translateX(-50%);"
    :                        "position: absolute; top: 70px; right: 20px;"
  );

  function startDrag(e: MouseEvent) {
    if (e.button !== 0 || !overlayEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const ox = e.clientX - rect.left, oy = e.clientY - rect.top;
    const onMove = (me: MouseEvent) => { dragPos = { x: me.clientX - ox, y: me.clientY - oy }; };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
</script>

<Header title="Overlay Preview" />

<div style="display: flex; flex-direction: column; overflow: hidden; height: calc(100vh - 64px);">
  <!-- Controls bar -->
  <div style="padding: 10px 22px; border-bottom: 1px solid #262626; background: rgba(23,23,23,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; gap: 14px; flex-shrink: 0; flex-wrap: wrap;">
    <span style="font-size: 10px; color: #a3a3a3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0;">Overlay Style</span>
    <div style="display: flex; gap: 2px; background: #0a0a0a; border-radius: 5px; padding: 2px; border: 1px solid #262626;">
      {#each variants as v (v.id)}
        <button
          onclick={() => { variant = v.id; dragPos = null; }}
          style="background: {variant === v.id ? '#262626' : 'transparent'}; border: none; border-radius: 3px; padding: 5px 12px; color: {variant === v.id ? '#fafafa' : '#a3a3a3'}; cursor: pointer; font-size: 11.5px; font-weight: {variant === v.id ? 600 : 400}; transition: all 0.15s; font-family: inherit;"
        >{v.label}</button>
      {/each}
    </div>
    <div style="margin-left: auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <span style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; flex-shrink: 0;">Simulate HP:</span>
      <input
        type="range" min={0} max={gate?.totalBars ?? 300}
        value={simBar}
        oninput={(e) => { if (!isLive) { playing = false; _simBar = parseInt((e.target as HTMLInputElement).value); } }}
        style="width: 160px; accent-color: #38bdf8; {isLive ? 'opacity: 0.4; cursor: not-allowed;' : ''}"
      />
      <span style="font-size: 12px; font-family: ui-monospace, monospace; color: {isLive ? '#4ade80' : '#38bdf8'}; min-width: 60px; font-weight: 600; flex-shrink: 0;">
        {simBar}/{gate?.totalBars ?? 300}{#if isLive} <span style="font-size: 9px;">LIVE</span>{/if}
      </span>
      {#if !isLive}
        <select bind:value={speed} style="background: #262626; border: 1px solid #262626; border-radius: 3px; padding: 4px 8px; color: #fafafa; font-size: 11px; outline: none; font-family: inherit;">
          <option value={1}>1× sim</option>
          <option value={3}>3× sim</option>
          <option value={8}>8× sim</option>
        </select>
        <button
          onclick={togglePlay}
          style="background: {playing ? 'rgba(251,146,60,0.1)' : 'rgba(56,189,248,0.1)'}; border: 1px solid {playing ? '#fb923c60' : 'rgba(56,189,248,0.3)'}; border-radius: 3px; padding: 5px 14px; color: {playing ? '#fb923c' : '#38bdf8'}; cursor: pointer; font-size: 11.5px; font-weight: 700; font-family: inherit; flex-shrink: 0;"
        >{playing ? "⏸ PAUSE" : _simBar <= 0 ? "↺ RESTART" : "▶ PLAY"}</button>
      {:else}
        <span style="font-size: 11px; color: #4ade80; font-weight: 700; font-family: ui-monospace, monospace;">● LIVE</span>
      {/if}
    </div>
  </div>

  <!-- Simulated game background -->
  <div style="flex: 1; position: relative; overflow: hidden; background: radial-gradient(ellipse at 50% 70%, rgba(40,25,60,0.4) 0%, transparent 60%), linear-gradient(180deg, #050506 0%, #0a0c12 50%, #050406 100%);">
    <!-- Fake boss HP bar -->
    {#if gate}
      <div style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 340px; text-align: center;">
        <div style="font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.08em; margin-bottom: 4px;">{gate.boss.toUpperCase()}</div>
        <div style="height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
          <div style="height: 100%; width: {(simBar / gate.totalBars) * 100}%; background: {barColor()}; transition: all 0.3s;" />
        </div>
        <div style="font-size: 9px; color: rgba(255,255,255,0.25); margin-top: 3px; font-family: ui-monospace, monospace;">{simBar} / {gate.totalBars} BARS</div>
      </div>
    {/if}

    <!-- Fake skill bar -->
    <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px;">
      {#each Array(8) as _, i (i)}
        <div style="width: 40px; height: 40px; border-radius: 3px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);" />
      {/each}
    </div>

    <!-- Draggable overlay -->
    {#if gate}
      <div
        bind:this={overlayEl}
        style="{dragPos ? `position: absolute; left: ${dragPos.x}px; top: ${dragPos.y}px;` : overlayDefaultStyle} cursor: grab;"
        onmousedown={startDrag}
      >
        {#if variant === "combined"}
          <OLCombined mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} bossName={bossName} />
        {:else if variant === "compact"}
          <OLCompact mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else if variant === "hud"}
          <OLHudStrip mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else if variant === "card"}
          <OLCardStack mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else}
          <OLPill mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {/if}

        {#if lastAnnounced}
          {@const s = SEVERITY[lastAnnounced.severity as keyof typeof SEVERITY]}
          <div style="margin-top: 6px; background: {s.dim}; border: 1px solid {s.border}; border-radius: 4px; padding: 5px 12px; font-size: 11px; color: {s.color}; font-weight: 600; text-align: center;">
            🔊 Announced: {lastAnnounced.name}
          </div>
        {/if}
      </div>
    {/if}

    <div style="position: absolute; bottom: 80px; left: 20px; font-size: 10px; color: rgba(255,255,255,0.18); letter-spacing: 0.05em;">SIMULATED IN-GAME VIEW · USE SLIDER OR ▶ TO TEST</div>
  </div>
</div>
