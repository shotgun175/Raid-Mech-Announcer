<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars, gateName }: OverlayProps = $props();
  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 3));
  const barColor = $derived(hpBarColor(currentBar, totalBars));
</script>

{#if upcoming.length === 0}
  <div style="background: rgba(23,23,23,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; padding: 8px 14px; color: #a3a3a3; font-size: 12px;">Awaiting first mech...</div>
{:else}
  <div style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; min-width: 260px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
    <div style="height: 3px; background: rgba(0,0,0,0.5);"><div style="height: 100%; width: {(currentBar / totalBars) * 100}%; background: {barColor}; opacity: 0.9;" /></div>
    <div style="padding: 6px 12px; background: rgba(10,10,10,0.5); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 10px; color: #38bdf8; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">{gateName}</span>
      <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #fafafa; font-weight: 600;">{currentBar}<span style="color: #525252; font-weight: 400;">×</span></span>
    </div>
    {#each upcoming as m, i (m.id)}
      {@const sev = SEVERITY[m.severity]}
      <div style="padding: 7px 12px; border-bottom: {i < upcoming.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'}; background: {i === 0 ? `${sev.color}0d` : 'transparent'}; display: flex; align-items: center; gap: 10px;">
        <div style="width: 5px; height: 5px; border-radius: 50%; background: {sev.color}; flex-shrink: 0; box-shadow: {i === 0 ? `0 0 6px ${sev.color}` : 'none'};" />
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 12.5px; font-weight: {i === 0 ? 700 : 500}; color: {i === 0 ? '#fafafa' : '#a3a3a3'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span>
            {#if m.phase}<span style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; font-weight: 700; font-family: ui-monospace, monospace;">P{m.phase}</span>{/if}
            {#if m.repeatSecs}<span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻{formatTimer(m.repeatSecs)}</span>{/if}
          </div>
          {#if i === 0}<div style="font-size: 10px; color: {sev.color}; font-family: ui-monospace, monospace;">{currentBar - (m.hpBar ?? 0)} bars away</div>{/if}
        </div>
        <div style="font-size: 12px; font-family: ui-monospace, monospace; color: {i === 0 ? sev.color : '#525252'}; font-weight: 700; flex-shrink: 0;">{m.hpBar}</div>
      </div>
    {/each}
  </div>
{/if}
