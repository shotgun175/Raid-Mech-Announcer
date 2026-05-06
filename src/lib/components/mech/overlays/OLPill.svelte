<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import { upcomingFrom, type OverlayProps } from "./_shared";
  import { mechStore } from "$lib/mech-store.svelte";

  let { mechanics, currentBar, activeMech = null, repeatCountdown = null }: OverlayProps = $props();
  const next = $derived(upcomingFrom(mechanics, currentBar)[0] ?? null);
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const urgent = $derived(barsAway <= 10);
  const showActiveMech = $derived(activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker);
  const repeatUrgent = $derived(repeatCountdown != null && repeatCountdown > 0 && repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5));
</script>

<div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-family: Inter, sans-serif;">
  {#if showActiveMech && activeMech}
    <div style="background: rgba(10,10,10,0.9); border: 1px solid rgba(167,139,250,{repeatUrgent ? '0.5' : '0.22'}); border-left: 3px solid #a78bfa; border-radius: 0 4px 4px 0; padding: 7px 14px; display: flex; align-items: center; gap: 8px; min-width: 200px;">
      <span style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #a78bfa; text-transform: uppercase; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.28); border-radius: 3px; padding: 1px 5px; flex-shrink: 0;">active</span>
      <div style="width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; {repeatUrgent ? 'animation: mech-pulse 0.7s infinite;' : 'opacity: 0.5;'}"></div>
      <span style="font-size: 12.5px; font-weight: 600; color: #c4b5fd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{activeMech.name}</span>
      <span style="font-size: 11px; color: #525252; font-family: ui-monospace, monospace; flex-shrink: 0;">↻</span>
      <span style="font-size: 15px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent ? '#f87171' : '#a78bfa'}; flex-shrink: 0;">{formatTimer(repeatCountdown)}</span>
    </div>
  {/if}

  {#if next && sev}
    <div style="background: {urgent ? `${sev.color}26` : 'rgba(23,23,23,0.85)'}; backdrop-filter: blur(10px); border: 1px solid {urgent ? sev.color : 'rgba(64,64,64,0.5)'}; border-radius: 24px; padding: 7px 18px; display: inline-flex; align-items: center; gap: 10px; box-shadow: {urgent ? `0 0 20px ${sev.color}60, 0 4px 20px rgba(0,0,0,0.6)` : '0 4px 20px rgba(0,0,0,0.5)'}; transition: all 0.3s; user-select: none;">
      <div style="width: 7px; height: 7px; border-radius: 50%; background: {sev.color}; box-shadow: 0 0 8px {sev.color}; {urgent ? 'animation: mech-pulse 1.2s infinite;' : ''} flex-shrink: 0;"></div>
      <span style="font-size: 13px; font-weight: 700; color: {sev.color}; white-space: nowrap;">{next.name}</span>
      <span style="font-size: 11px; color: #a3a3a3;">in</span>
      <span style="font-size: 13px; font-family: ui-monospace, monospace; font-weight: 700; color: #fafafa;">{barsAway}</span>
      <span style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em;">bars</span>
      {#if next.phase}
        <span style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; border-left: 1px solid #262626; padding-left: 10px; font-family: ui-monospace, monospace; flex-shrink: 0;">P{next.phase}</span>
      {/if}
    </div>
  {/if}
</div>
