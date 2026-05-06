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

<!-- inline-flex column so both pills auto-match the wider one's width -->
<div style="display: inline-flex; flex-direction: column; gap: 6px; font-family: Inter, sans-serif;">
  {#if showActiveMech && activeMech}
    <div style="background: rgba(167,139,250,0.08); border: 1px solid rgba(167,139,250,{repeatUrgent ? '0.5' : '0.35'}); border-radius: 24px; padding: 5px 18px; display: flex; align-items: center; justify-content: center; gap: 9px; box-shadow: 0 0 {repeatUrgent ? '16px rgba(248,113,113,0.2)' : '12px rgba(167,139,250,0.1)'}, 0 4px 16px rgba(0,0,0,0.5);">
      <div style="width: 6px; height: 6px; border-radius: 50%; background: #a78bfa; box-shadow: 0 0 6px #a78bfa; flex-shrink: 0; {repeatUrgent ? 'animation: mech-pulse 0.7s infinite;' : 'opacity: 0.6;'}"></div>
      <span style="font-size: 11px; font-weight: 500; color: #7c6db5; white-space: nowrap;">{activeMech.name}</span>
      <span style="font-size: 13px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent ? '#f87171' : '#c4b5fd'}; white-space: nowrap;">↻ {formatTimer(repeatCountdown)}</span>
    </div>
  {/if}

  {#if next && sev}
    <div style="background: {urgent ? `${sev.color}26` : 'rgba(23,23,23,0.85)'}; backdrop-filter: blur(10px); border: 1px solid {urgent ? sev.color : 'rgba(64,64,64,0.5)'}; border-radius: 24px; padding: 7px 18px; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: {urgent ? `0 0 20px ${sev.color}60, 0 4px 20px rgba(0,0,0,0.6)` : '0 4px 20px rgba(0,0,0,0.5)'}; transition: all 0.3s; user-select: none;">
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
