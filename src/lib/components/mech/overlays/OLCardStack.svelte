<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, type OverlayProps } from "./overlay-utils";
  import { mechStore } from "$lib/mech-store.svelte";

  let { mechanics, currentBar, totalBars, activeMech = null, repeatCountdown = null }: OverlayProps = $props();
  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 3));
  const primary = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(primary ? SEVERITY[primary.severity] : null);
  const barsAway = $derived(primary ? currentBar - (primary.hpBar ?? 0) : 0);
  const progress = $derived(Math.min(1, Math.max(0, 1 - barsAway / 30)));
  const showActiveMech = $derived(
    activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker
  );
  const repeatUrgent = $derived(
    repeatCountdown != null && repeatCountdown > 0 && repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5)
  );
</script>

<div style="display: flex; flex-direction: column; gap: 3px; min-width: 300px; font-family: Inter, sans-serif;">
  {#if showActiveMech && activeMech}
    <div
      style="background: rgba(10,10,10,0.9); border: 1px solid rgba(167,139,250,{repeatUrgent
        ? '0.5'
        : '0.22'}); border-left: 3px solid #a78bfa; border-radius: 0 4px 4px 0; padding: 7px 14px; display: flex; align-items: center; gap: 8px;"
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
          : '#a78bfa'}; flex-shrink: 0;">{formatTimer(repeatCountdown)}</span
      >
    </div>
  {/if}

  {#if primary && sev}
    <div
      style="background: rgba(10,10,10,0.92); backdrop-filter: blur(12px); border: 1px solid {sev.color}60; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 13px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}14;"
    >
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if primary.phase}
              <span
                style="font-size: 10px; color: {PHASE_COLORS[primary.phase]}; font-weight: 700; letter-spacing: 0.08em;"
                >PHASE {primary.phase}</span
              >
            {/if}
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #fafafa; line-height: 1.15;">{primary.name}</div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div
            style="font-size: 24px; font-family: ui-monospace, monospace; font-weight: 700; color: {sev.color}; line-height: 1;"
          >
            {barsAway}
          </div>
          <div
            style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;"
          >
            bars away
          </div>
        </div>
      </div>
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div style="height: 100%; width: {progress * 100}%; background: {sev.color}; transition: width 0.3s;"></div>
      </div>
      {#if primary.repeatSecs}
        <div style="margin-top: 7px; font-size: 10px; color: #a78bfa; font-family: ui-monospace, monospace;">
          ↻ Repeats every {formatTimer(primary.repeatSecs)}
        </div>
      {/if}
    </div>
  {:else if mechStore.liveEncourageMessage}
    <div
      style="background: rgba(10,10,10,0.92); backdrop-filter: blur(12px); border: 1px solid #f472b660; border-left: 3px solid #f472b6; border-radius: 0 5px 5px 0; padding: 13px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px #f472b614; display: flex; align-items: center; gap: 12px;"
    >
      <span
        style="font-size: 10px; font-weight: 800; letter-spacing: 0.1em; color: #f472b6; text-transform: uppercase; background: rgba(244,114,182,0.12); border: 1px solid rgba(244,114,182,0.28); border-radius: 3px; padding: 2px 6px; flex-shrink: 0;"
        >push</span
      >
      <span style="font-size: 17px; font-weight: 700; color: #fafafa; line-height: 1.15;"
        >{mechStore.liveEncourageMessage}</span
      >
    </div>
  {/if}

  {#if primary && sev}
    {#each rest as m (m.id)}
      {@const s = SEVERITY[m.severity]}
      <div
        style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;"
      >
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7;"></div>
          <span
            style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >{m.name}</span
          >
          {#if m.phase}<span
              style="font-size: 9px; color: {PHASE_COLORS[
                m.phase
              ]}; opacity: 0.8; font-family: ui-monospace, monospace;">P{m.phase}</span
            >{/if}
        </div>
        <span style="font-size: 10.5px; font-family: ui-monospace, monospace; color: #525252; flex-shrink: 0;"
          >{m.hpBar}</span
        >
      </div>
    {/each}
  {/if}
</div>
