<script lang="ts">
  import { PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import type { Mechanic } from "$lib/mech-types";

  interface Props {
    mechanics: Mechanic[];
    totalBars: number;
    currentBar: number;
  }
  let { mechanics, totalBars, currentBar }: Props = $props();

  const hpMechs = $derived(mechanics.filter((m) => m.hpBar != null).sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0)));
  const drainPct = $derived((currentBar / totalBars) * 100);

  const phaseBoundaries = $derived.by(() => {
    const firstHpBarByPhase: Record<number, number> = {};
    [...mechanics]
      .filter((m) => m.hpBar != null && m.phase != null)
      .sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0))
      .forEach((m) => {
        if (m.phase != null && firstHpBarByPhase[m.phase] == null) firstHpBarByPhase[m.phase] = m.hpBar!;
      });
    // Phases 2+ mark where each phase begins (its first/highest-HP mechanic).
    const markers = Object.entries(firstHpBarByPhase)
      .filter(([p]) => parseInt(p) > 1)
      .map(([p, bar]) => ({ phase: parseInt(p), bar }));
    // Phase 1 is the opening of the fight, so pin it to full HP (start of the bar)
    // whenever any phase-1 mechanic exists, rather than to its first mechanic.
    if (mechanics.some((m) => m.phase === 1)) markers.push({ phase: 1, bar: totalBars });
    return markers;
  });
</script>

<div style="position: relative; height: 58px; padding: 10px 0 14px;">
  <!-- Rail -->
  <div
    style="position: absolute; left: 0; right: 0; top: 30px; height: 8px; background: #0c0c0c; border-radius: 3px; overflow: hidden; border: 1px solid #262626;"
  >
    <!-- Filled portion: left=low HP (red), right=full HP (green) — drains from right -->
    <div
      style="position: absolute; left: 0; top: 0; bottom: 0; width: {drainPct}%; background: linear-gradient(90deg, #f87171 0%, #facc15 55%, #4ade80 100%); transition: width 0.3s;"
    ></div>
    {#if drainPct < 100}
      <!-- Drained/hatched region -->
      <div
        style="position: absolute; right: 0; top: 0; bottom: 0; width: {100 -
          drainPct}%; background: repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0 4px, rgba(255,255,255,0.05) 4px 8px); border-left: 1px dashed rgba(255,255,255,0.18);"
      ></div>
    {/if}
  </div>

  <!-- Mechanic tick marks -->
  {#each hpMechs as m (m.id)}
    {@const pct = ((m.hpBar ?? 0) / totalBars) * 100}
    {@const sev = SEVERITY[m.severity]}
    {@const drained = (m.hpBar ?? 0) > currentBar}
    <div style="position: absolute; left: {pct}%; top: 22px; transform: translateX(-50%); pointer-events: none;">
      <div
        style="width: 2px; height: 24px; background: {sev.color}; border-radius: 1px; opacity: {drained
          ? 0.28
          : 1}; box-shadow: {!drained ? `0 0 5px ${sev.color}` : 'none'};"
      ></div>
      <div
        style="font-size: 12px; font-family: ui-monospace, monospace; color: {drained
          ? '#8a8a8a'
          : sev.color}; opacity: {drained
          ? 0.55
          : 1}; margin-top: 2px; transform: translateX(-50%); position: relative; left: 1px; font-weight: 700; white-space: nowrap;"
      >
        {m.hpBar}
      </div>
    </div>
  {/each}

  <!-- Phase boundary markers sit in the band above the rail with a connector dropping to it.
       P2+ mark where each phase begins; P1 is pinned to full HP (the right/start edge). -->
  {#each phaseBoundaries as { phase, bar }}
    {@const pct = (bar / totalBars) * 100}
    {@const pc = PHASE_COLORS[phase]}
    {@const drained = bar > currentBar}
    {@const atStart = bar >= totalBars}
    <div
      style="position: absolute; top: 0; {atStart
        ? 'right: 2px;'
        : `left: ${pct}%; transform: translateX(-50%);`} pointer-events: none; display: flex; flex-direction: column; align-items: {atStart
        ? 'flex-end'
        : 'center'};"
    >
      <div
        style="font-size: 11px; font-family: ui-monospace, monospace; color: {pc}; opacity: {drained
          ? 0.45
          : 1}; font-weight: 800; white-space: nowrap; line-height: 1; background: {pc}1f; border: 1px solid {pc}55; border-radius: 3px; padding: 2px 5px;"
      >
        P{phase}
      </div>
      <div
        style="width: 1px; height: 16px; background: {pc}; opacity: {drained ? 0.25 : 0.7}; box-shadow: {drained
          ? 'none'
          : `0 0 4px ${pc}`}; margin-top: 2px;"
      ></div>
    </div>
  {/each}

  <!-- Drain edge pointer (sky-400 glow line at currentBar position) -->
  <div
    style="position: absolute; left: {drainPct}%; top: 20px; width: 2px; height: 20px; background: var(--color-accent-500); box-shadow: 0 0 8px var(--color-accent-500);"
  ></div>

  <!-- Axis labels: DEAD on left, MAX on right — bar drains right→left -->
  <span
    style="position: absolute; left: 2px; bottom: 0; font-size: 12px; color: #8a8a8a; font-family: ui-monospace, monospace; font-weight: 600; opacity: 0.5;"
    >DEAD</span
  >
  <span
    style="position: absolute; right: 2px; bottom: 0; font-size: 12px; color: #8a8a8a; font-family: ui-monospace, monospace; font-weight: 600; opacity: 0.5;"
    >{totalBars}</span
  >
</div>
