<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./overlay-utils";
  import { mechStore } from "$lib/mech-store.svelte";

  let {
    mechanics,
    currentBar,
    totalBars,
    bossName = "",
    activeMech = null,
    repeatCountdown = null
  }: OverlayProps = $props();
  const next = $derived(upcomingFrom(mechanics, currentBar)[0] ?? null);
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const showActiveMech = $derived(
    activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker
  );
  const repeatUrgent = $derived(
    repeatCountdown != null && repeatCountdown > 0 && repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5)
  );
</script>

<!-- Single connected block: HP bar → [active strip] → NEXT row -->
<div
  style="display: flex; flex-direction: column; min-width: 480px; font-family: Inter, sans-serif; box-shadow: 0 8px 30px rgba(0,0,0,0.6);"
>
  <!-- Boss HP bar -->
  <div
    style="background: rgba(23,23,23,0.75); backdrop-filter: blur(10px); border: 1px solid rgba(64,64,64,0.4); border-radius: {showActiveMech
      ? '3px 3px 0 0'
      : next
        ? '3px 3px 0 0'
        : '3px'}; overflow: hidden;"
  >
    <div
      style="position: relative; height: 26px; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.4);"
    >
      <div
        style="position: absolute; inset: 0; background: {barColor}; opacity: 0.75; width: {(currentBar / totalBars) *
          100}%; transition: width 0.3s;"
      ></div>
      <div
        style="position: absolute; inset: 0; display: flex; align-items: center; padding: 0 9px; gap: 8px; font-size: 13px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.8);"
      >
        <span style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{bossName}</span
        >
        <span style="font-family: ui-monospace, monospace; font-size: 12px; flex-shrink: 0; opacity: 0.85;"
          >{currentBar}/{totalBars}</span
        >
      </div>
      {#if next && sev}
        <div
          style="position: absolute; left: {((next.hpBar ?? 0) / totalBars) *
            100}%; top: 0; width: 2px; height: 100%; background: {sev.color}; box-shadow: 0 0 6px {sev.color};"
        ></div>
      {/if}
    </div>
  </div>

  <!-- Active mech strip — flush between HP bar and NEXT row -->
  {#if showActiveMech && activeMech}
    <div
      style="background: {repeatUrgent
        ? 'rgba(20,8,8,0.92)'
        : 'rgba(12,8,24,0.92)'}; border: 1px solid rgba(167,139,250,{repeatUrgent
        ? '0.3'
        : '0.22'}); border-top: none; padding: 5px 14px; display: flex; align-items: center; gap: 10px;"
    >
      <div
        style="width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; {repeatUrgent
          ? 'animation: mech-pulse 0.7s infinite;'
          : 'opacity: 0.55;'}"
      ></div>
      <span
        style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #a78bfa; text-transform: uppercase; flex-shrink: 0;"
        >active</span
      >
      <span
        style="font-size: 12px; font-weight: 600; color: #c4b5fd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >{activeMech.name}</span
      >
      <span style="font-size: 10px; color: #525252; font-family: ui-monospace, monospace; flex-shrink: 0;"
        >↻ repeating</span
      >
      <span
        style="font-size: 14px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent
          ? '#f87171'
          : '#a78bfa'}; flex-shrink: 0;">{formatTimer(repeatCountdown)}</span
      >
    </div>
  {/if}

  <!-- NEXT row -->
  <div
    style="background: rgba(23,23,23,0.75); border: 1px solid rgba(64,64,64,0.4); border-top: none; border-radius: 0 0 3px 3px; overflow: hidden;"
  >
    <div style="padding: 8px 14px; display: flex; align-items: center; gap: 14px;">
      {#if next && sev}
        <span
          style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; flex-shrink: 0;"
          >NEXT</span
        >
        <div
          style="width: 7px; height: 7px; border-radius: 50%; background: {sev.color}; box-shadow: 0 0 6px {sev.color}; flex-shrink: 0;"
        ></div>
        <span
          style="font-size: 14px; font-weight: 700; color: {sev.color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{next.name}</span
        >
        {#if next.phase}
          <MechBadge
            label="P{next.phase}"
            color={PHASE_COLORS[next.phase]}
            bg="{PHASE_COLORS[next.phase]}18"
            border="{PHASE_COLORS[next.phase]}60"
            small
          />
        {/if}
        <span style="margin-left: auto; display: flex; align-items: baseline; gap: 4px; flex-shrink: 0;">
          <span style="font-size: 18px; font-family: ui-monospace, monospace; font-weight: 700; color: #fafafa;"
            >{currentBar - (next.hpBar ?? 0)}</span
          >
          <span style="font-size: 10px; color: #525252;">bars</span>
        </span>
      {:else}
        <span style="font-size: 12px; color: #525252;">No upcoming mechanics</span>
      {/if}
    </div>
  </div>
</div>
