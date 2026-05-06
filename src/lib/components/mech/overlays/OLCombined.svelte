<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";
  import { mechStore } from "$lib/mech-store.svelte";

  let {
    mechanics,
    currentBar,
    totalBars,
    bossName = "",
    activeMech = null,
    repeatCountdown = null
  }: OverlayProps = $props();

  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 4));
  const next = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const pct = $derived((currentBar / totalBars) * 100);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const progress = $derived(next ? Math.min(1, Math.max(0, 1 - barsAway / 30)) : 0);

  const showActiveMech = $derived(
    activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker
  );
  const repeatUrgent = $derived(
    repeatCountdown != null &&
    repeatCountdown > 0 &&
    repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5)
  );
</script>

<div style="display: flex; flex-direction: column; gap: 4px; width: 400px; font-family: Inter, sans-serif;">
  <!-- Boss HP bar -->
  <div
    style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.7);"
  >
    <div
      style="position: relative; height: 30px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(0,0,0,0.5);"
    >
      <div
        style="position: absolute; inset: 0; background: {barColor}; opacity: 0.78; width: {pct}%; transition: width 0.3s, background 0.3s;"
      ></div>
      <!-- Text row: boss name left, HP right -->
      <div
        style="position: absolute; inset: 0; display: flex; align-items: center; padding: 0 9px; gap: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.9);"
      >
        <span
          style="flex: 1; min-width: 0; font-size: 13px; color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{bossName}</span
        >
        <span
          style="font-size: 12px; font-family: ui-monospace, monospace; color: white; font-weight: 600; white-space: nowrap; flex-shrink: 0; opacity: 0.85;"
          >{pct.toFixed(1)}%&nbsp;·&nbsp;{currentBar}×</span
        >
      </div>
      {#each mechanics.filter((m) => m.hpBar != null && m.hpBar <= currentBar) as m (m.id)}
        {@const ms = SEVERITY[m.severity]}
        <div
          style="position: absolute; left: {((m.hpBar ?? 0) / totalBars) *
            100}%; top: 0; width: 2px; height: 100%; background: {ms.color}; box-shadow: 0 0 6px {ms.color};"
        ></div>
      {/each}
    </div>
  </div>

  <!-- Active repeating mechanic row (Option A) — sits between HP bar and primary card -->
  {#if showActiveMech && activeMech}
    <div
      style="background: rgba(10,10,10,0.9); border: 1px solid rgba(167,139,250,{repeatUrgent ? '0.5' : '0.22'}); border-left: 3px solid #a78bfa; border-radius: 0 4px 4px 0; padding: 7px 14px; display: flex; align-items: center; gap: 8px;"
    >
      <span
        style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #a78bfa; text-transform: uppercase; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.28); border-radius: 3px; padding: 1px 5px; flex-shrink: 0;"
        >active</span
      >
      <div
        style="width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; {repeatUrgent
          ? 'animation: mech-pulse 0.7s infinite;'
          : 'opacity: 0.5;'}"
      ></div>
      <span
        style="font-size: 12.5px; font-weight: 600; color: #c4b5fd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >{activeMech.name}</span
      >
      <span style="font-size: 11px; color: #525252; font-family: ui-monospace, monospace; flex-shrink: 0;">↻</span>
      <span
        style="font-size: 15px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent
          ? '#f87171'
          : '#a78bfa'}; flex-shrink: 0;"
        >{formatTimer(repeatCountdown)}</span
      >
    </div>
  {/if}

  <!-- Primary card: next upcoming mechanic -->
  {#if next && sev}
    <div
      style="background: rgba(10,10,10,0.9); backdrop-filter: blur(12px); border: 1px solid {sev.color}66; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 12px 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}1a;"
    >
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 9px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if next.phase && mechStore.mechSettings.showPhaseLabels}
              <span
                style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; letter-spacing: 0.08em;"
                >PHASE {next.phase}</span
              >
            {/if}
            {#if next.repeatSecs}
              <span style="font-size: 10px; color: #a78bfa; font-family: ui-monospace, monospace;">
                ↻ {formatTimer(next.repeatSecs)}
              </span>
            {/if}
          </div>
          <div style="display: flex; align-items: baseline; gap: 7px; line-height: 1.15;">
            <span
              style="font-size: 16.5px; font-weight: 700; color: #fafafa; letter-spacing: -0.01em;">{next.name}</span
            >
            {#if next.hpBar != null}
              <span style="font-size: 14px; color: #6b6b6b; font-family: ui-monospace, monospace; font-weight: 500;"
                >· {next.hpBar}×</span
              >
            {/if}
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div
            style="font-size: 23px; font-family: ui-monospace, monospace; font-weight: 700; color: {sev.color}; line-height: 1;"
          >
            {barsAway <= 0 ? "NOW" : barsAway}
          </div>
          <div
            style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;"
          >
            {barsAway === 0 ? "incoming" : "bars away"}
          </div>
        </div>
      </div>
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div
          style="height: 100%; width: {Math.min(100, progress * 100)}%; background: {sev.color}; transition: width 0.3s;"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Secondary rows -->
  {#each rest as m (m.id)}
    {@const s = SEVERITY[m.severity]}
    <div
      style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;"
    >
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <div
          style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7; flex-shrink: 0;"
        ></div>
        <span style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{m.name}</span
        >
        {#if m.phase && mechStore.mechSettings.showPhaseLabels}
          <span
            style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; opacity: 0.8; font-family: ui-monospace, monospace;"
            >P{m.phase}</span
          >
        {/if}
        {#if m.repeatSecs}
          <span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻</span>
        {/if}
      </div>
      <div style="display: flex; align-items: baseline; gap: 4px; flex-shrink: 0;">
        <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #525252; font-weight: 600;"
          >{m.hpBar}</span
        >
        <span style="font-size: 9px; color: #525252;">×</span>
      </div>
    </div>
  {/each}
</div>

