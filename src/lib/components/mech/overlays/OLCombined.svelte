<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars, gateName, bossName = "" }: OverlayProps = $props();

  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 4));
  const next = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const pct = $derived((currentBar / totalBars) * 100);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const progress = $derived(next ? Math.min(1, Math.max(0, 1 - barsAway / 30)) : 0);

  // Repeat cycle state
  const repeatState = $derived(() => {
    if (!next?.repeatSecs || barsAway > 0) return null;
    const rb = next.repeatSecs;
    const barsSinceFire = (next.hpBar ?? 0) - currentBar;
    const cycle = Math.floor(barsSinceFire / rb);
    const nextRepeatBar = (next.hpBar ?? 0) - (cycle + 1) * rb;
    const repeatBarsLeft = currentBar - nextRepeatBar;
    const repeatProgress = 1 - repeatBarsLeft / rb;
    const urgent = repeatBarsLeft <= 10;
    return { nextRepeatBar, repeatBarsLeft, repeatProgress, urgent };
  });

  const rs = $derived(repeatState());
  const showRepeat = $derived(rs != null && rs.nextRepeatBar > 0);
  const displayBars = $derived(showRepeat ? rs!.repeatBarsLeft : barsAway);
  const displayLabel = $derived(showRepeat ? "until repeat" : barsAway === 0 ? "incoming" : "bars away");
  const barFill = $derived(showRepeat ? rs!.repeatProgress : progress);
</script>

<div style="display: flex; flex-direction: column; gap: 4px; width: 400px; font-family: Inter, sans-serif;">
  <!-- Boss HP bar -->
  <div style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.7);">
    <div style="position: relative; height: 26px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(0,0,0,0.5);">
      <div style="position: absolute; inset: 0; background: {barColor}; opacity: 0.78; width: {pct}%; transition: width 0.3s, background 0.3s;" />
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11.5px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">
        <span>{bossName}</span>
        <span style="font-family: ui-monospace, monospace; font-weight: 600;">{pct.toFixed(1)}%</span>
      </div>
      <div style="position: absolute; right: 9px; top: 50%; transform: translateY(-50%); font-size: 11px; font-family: ui-monospace, monospace; color: white; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">{currentBar}×</div>
      <div style="position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 9px; color: #38bdf8; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">{gateName}</div>
      {#each mechanics.filter(m => m.hpBar != null && m.hpBar <= currentBar) as m (m.id)}
        {@const ms = SEVERITY[m.severity]}
        <div style="position: absolute; left: {((m.hpBar ?? 0) / totalBars) * 100}%; top: 0; width: 2px; height: 100%; background: {ms.color}; box-shadow: 0 0 6px {ms.color};" />
      {/each}
    </div>
  </div>

  <!-- Primary card -->
  {#if next && sev}
    <div style="background: rgba(10,10,10,0.9); backdrop-filter: blur(12px); border: 1px solid {sev.color}66; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 12px 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}1a;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 9px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if next.phase}
              <span style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; letter-spacing: 0.08em;">PHASE {next.phase}</span>
            {/if}
            {#if next.repeatSecs}
              <span style="font-size: 10px; color: {showRepeat ? (rs?.urgent ? sev.color : '#a78bfa') : '#a78bfa'}; font-family: ui-monospace, monospace; font-weight: {showRepeat ? 700 : 400}; {rs?.urgent ? 'animation: mech-pulse 1s infinite;' : ''}">
                ↻ {showRepeat ? `repeating · ${formatTimer(next.repeatSecs)}` : formatTimer(next.repeatSecs)}
              </span>
            {/if}
          </div>
          <div style="font-size: 16.5px; font-weight: 700; color: {showRepeat ? '#a3a3a3' : '#fafafa'}; line-height: 1.15; letter-spacing: -0.01em;">{next.name}</div>
          {#if showRepeat && rs}
            <div style="font-size: 10px; color: #525252; margin-top: 2px; font-family: ui-monospace, monospace;">fired @ {next.hpBar}× · next @ {Math.max(0, rs.nextRepeatBar)}×</div>
          {/if}
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div style="font-size: 23px; font-family: ui-monospace, monospace; font-weight: 700; color: {rs?.urgent ? sev.color : showRepeat ? '#a78bfa' : sev.color}; line-height: 1;">
            {displayBars <= 0 ? "NOW" : displayBars}
          </div>
          <div style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;">{displayLabel}</div>
        </div>
      </div>
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div style="height: 100%; width: {Math.min(100, barFill * 100)}%; background: {showRepeat ? (rs?.urgent ? sev.color : '#a78bfa') : sev.color}; transition: width 0.3s;" />
      </div>
    </div>
  {/if}

  <!-- Secondary rows -->
  {#each rest as m (m.id)}
    {@const s = SEVERITY[m.severity]}
    <div style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <div style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7; flex-shrink: 0;" />
        <span style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span>
        {#if m.phase}
          <span style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; opacity: 0.8; font-family: ui-monospace, monospace;">P{m.phase}</span>
        {/if}
        {#if m.repeatSecs}
          <span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻</span>
        {/if}
      </div>
      <div style="display: flex; align-items: baseline; gap: 4px; flex-shrink: 0;">
        <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #525252; font-weight: 600;">{m.hpBar}</span>
        <span style="font-size: 9px; color: #525252;">×</span>
      </div>
    </div>
  {/each}
</div>

<style>
  @keyframes mech-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.4); }
  }
</style>
