<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars }: OverlayProps = $props();
  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 3));
  const primary = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(primary ? SEVERITY[primary.severity] : null);
  const barsAway = $derived(primary ? currentBar - (primary.hpBar ?? 0) : 0);
  const progress = $derived(Math.min(1, Math.max(0, 1 - barsAway / 30)));
</script>

{#if primary && sev}
  <div style="display: flex; flex-direction: column; gap: 3px; min-width: 300px;">
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
  </div>
{/if}
