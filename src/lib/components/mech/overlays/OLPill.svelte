<script lang="ts">
  import { PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import { upcomingFrom, type OverlayProps } from "./_shared";

  let { mechanics, currentBar }: OverlayProps = $props();
  const next = $derived(upcomingFrom(mechanics, currentBar)[0] ?? null);
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const urgent = $derived(barsAway <= 10);
</script>

{#if next && sev}
  <div
    style="
    background: {urgent ? `${sev.color}26` : 'rgba(23,23,23,0.85)'};
    backdrop-filter: blur(10px);
    border: 1px solid {urgent ? sev.color : 'rgba(64,64,64,0.5)'};
    border-radius: 24px;
    padding: 7px 18px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: {urgent ? `0 0 20px ${sev.color}60, 0 4px 20px rgba(0,0,0,0.6)` : '0 4px 20px rgba(0,0,0,0.5)'};
    transition: all 0.3s;
    user-select: none;
  "
  >
    <div
      style="width: 7px; height: 7px; border-radius: 50%; background: {sev.color}; box-shadow: 0 0 8px {sev.color}; {urgent
        ? 'animation: mech-pulse 1.2s infinite;'
        : ''} flex-shrink: 0;"
    ></div>
    <span style="font-size: 13px; font-weight: 700; color: {sev.color}; white-space: nowrap;">{next.name}</span>
    <span style="font-size: 11px; color: #a3a3a3;">in</span>
    <span style="font-size: 13px; font-family: ui-monospace, monospace; font-weight: 700; color: #fafafa;"
      >{barsAway}</span
    >
    <span style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em;">bars</span>
    {#if next.phase}
      <span
        style="font-size: 10px; color: {PHASE_COLORS[
          next.phase
        ]}; font-weight: 700; border-left: 1px solid #262626; padding-left: 10px; font-family: ui-monospace, monospace; flex-shrink: 0;"
        >P{next.phase}</span
      >
    {/if}
  </div>
{/if}

<style>
  @keyframes mech-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.6;
      transform: scale(1.4);
    }
  }
</style>
