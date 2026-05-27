<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
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
  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 3));
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const showActiveMech = $derived(
    activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker
  );
  const repeatUrgent = $derived(
    repeatCountdown != null && repeatCountdown > 0 && repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5)
  );
</script>

<div style="display: flex; flex-direction: column; gap: 4px; font-family: Inter, sans-serif;">
  {#if upcoming.length === 0 && !mechStore.liveEncourageMessage}
    <div
      style="background: rgba(23,23,23,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; padding: 8px 14px; color: #a3a3a3; font-size: 12px;"
    >
      Awaiting first mech...
    </div>
  {:else}
    <div
      style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; min-width: 260px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.6);"
    >
      <div style="height: 3px; background: rgba(0,0,0,0.5);">
        <div
          style="height: 100%; width: {(currentBar / totalBars) * 100}%; background: {barColor}; opacity: 0.9;"
        ></div>
      </div>
      <div
        style="padding: 6px 12px; background: rgba(10,10,10,0.5); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center;"
      >
        <span
          style="font-size: 12px; color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;"
          >{bossName}</span
        >
        <span style="font-size: 13px; font-family: ui-monospace, monospace; color: #fafafa; font-weight: 600;"
          >{currentBar}<span style="color: #525252; font-weight: 400;">×</span></span
        >
      </div>
      <!-- Active mech row — anchored inside card, right below boss name -->
      {#if showActiveMech && activeMech}
        <div
          style="padding: 5px 12px; background: rgba(12,8,24,0.7); border-bottom: 1px solid rgba(167,139,250,0.15); display: flex; align-items: center; gap: 8px; border-left: 2px solid #a78bfa;"
        >
          <div
            style="width: 4px; height: 4px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; {repeatUrgent
              ? 'animation: mech-pulse 0.7s infinite;'
              : 'opacity: 0.55;'}"
          ></div>
          <span
            style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #7c6db5; text-transform: uppercase; flex-shrink: 0;"
            >active</span
          >
          <span
            style="font-size: 11.5px; font-weight: 600; color: #c4b5fd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >{activeMech.name}</span
          >
          <span
            style="font-size: 12px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent
              ? '#f87171'
              : '#a78bfa'}; flex-shrink: 0;">↻ {formatTimer(repeatCountdown)}</span
          >
        </div>
      {/if}
      {#if upcoming.length === 0 && mechStore.liveEncourageMessage}
        <div
          style="padding: 9px 12px; background: rgba(244,114,182,0.08); border-left: 2px solid #f472b6; display: flex; align-items: center; gap: 10px;"
        >
          <span
            style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #f472b6; text-transform: uppercase; flex-shrink: 0;"
            >push</span
          >
          <span style="font-size: 12.5px; font-weight: 700; color: #fafafa;">{mechStore.liveEncourageMessage}</span>
        </div>
      {/if}
      {#each upcoming as m, i (m.id)}
        {@const sev = SEVERITY[m.severity]}
        <div
          style="padding: 7px 12px; border-bottom: {i < upcoming.length - 1
            ? '1px solid rgba(255,255,255,0.04)'
            : 'none'}; background: {i === 0
            ? `${sev.color}0d`
            : 'transparent'}; display: flex; align-items: center; gap: 10px;"
        >
          <div
            style="width: 5px; height: 5px; border-radius: 50%; background: {sev.color}; flex-shrink: 0; box-shadow: {i ===
            0
              ? `0 0 6px ${sev.color}`
              : 'none'};"
          ></div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span
                style="font-size: 12.5px; font-weight: {i === 0 ? 700 : 500}; color: {i === 0
                  ? '#fafafa'
                  : '#a3a3a3'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span
              >
              {#if m.phase}<span
                  style="font-size: 9px; color: {PHASE_COLORS[
                    m.phase
                  ]}; font-weight: 700; font-family: ui-monospace, monospace;">P{m.phase}</span
                >{/if}
              {#if m.repeatSecs}<span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;"
                  >↻{formatTimer(m.repeatSecs)}</span
                >{/if}
            </div>
            {#if i === 0}<div style="font-size: 10px; color: {sev.color}; font-family: ui-monospace, monospace;">
                {currentBar - (m.hpBar ?? 0)} bars away
              </div>{/if}
          </div>
          <div
            style="font-size: 12px; font-family: ui-monospace, monospace; color: {i === 0
              ? sev.color
              : '#525252'}; font-weight: 700; flex-shrink: 0;"
          >
            {m.hpBar}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
