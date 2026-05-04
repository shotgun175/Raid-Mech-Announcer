<script lang="ts">
  import { formatTimer, PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import type { Mechanic } from "$lib/mech-types";
  import MechBadge from "./MechBadge.svelte";

  interface Props {
    mech: Mechanic;
    isNext: boolean;
    isPast: boolean;
    onEdit: (m: Mechanic) => void;
    onDelete: (id: string) => void;
  }
  let { mech, isNext, isPast, onEdit, onDelete }: Props = $props();

  let hovered = $state(false);
  const sev = $derived(SEVERITY[mech.severity]);
  const phaseColor = $derived(mech.phase ? PHASE_COLORS[mech.phase] : null);
</script>

<div
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
  role="row"
  tabindex="0"
  style="
    display: grid;
    grid-template-columns: 78px 60px 1fr 110px 86px 78px;
    padding: 8px 14px;
    border-bottom: 1px solid #262626;
    background: {isNext ? 'rgba(56,189,248,0.06)' : hovered ? '#202020' : 'transparent'};
    border-left: {isNext ? '2px solid var(--color-accent-500)' : '2px solid transparent'};
    opacity: {isPast ? 0.4 : 1};
    align-items: center;
    transition: background 0.15s;
  "
>
  <!-- HP / Timer -->
  <div
    style="font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; color: {isNext
      ? 'var(--color-accent-500)'
      : '#fafafa'};"
  >
    {#if mech.hpBar != null}
      {mech.hpBar}<span style="font-size: 12px; color: #8a8a8a; font-weight: 400; margin-left: 2px;">×</span>
    {:else}
      <span style="font-size: 12px; color: #fbbf24;">⏱ {formatTimer(mech.timerSecs)}</span>
    {/if}
  </div>

  <!-- Phase badge -->
  <div>
    {#if phaseColor}
      <div
        style="width: 19px; height: 19px; border-radius: 3px; background: {phaseColor}20; border: 1px solid {phaseColor}60; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: {phaseColor}; font-family: ui-monospace, monospace;"
      >
        P{mech.phase}
      </div>
    {/if}
  </div>

  <!-- Name + notes -->
  <div style="padding-right: 12px; min-width: 0;">
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
      <span
        style="font-weight: 600; font-size: 13px; color: {isNext
          ? 'var(--color-accent-500)'
          : '#fafafa'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{mech.name}</span
      >
      {#if isNext}
        <span
          style="font-size: 12px; color: var(--color-accent-500); font-weight: 700; letter-spacing: 0.06em; flex-shrink: 0;"
          >▶ NEXT</span
        >
      {/if}
    </div>
    {#if mech.notes}
      <div
        style="font-size: 12px; color: #a3a3a3; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;"
      >
        {mech.notes}
      </div>
    {/if}
  </div>

  <!-- Severity badge -->
  <div><MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small /></div>

  <!-- Repeat + TTS -->
  <div
    style="font-size: 12px; color: #a3a3a3; display: flex; gap: 6px; align-items: center; font-family: ui-monospace, monospace;"
  >
    {#if mech.repeatSecs}
      <span style="color: #a78bfa;">↻{formatTimer(mech.repeatSecs)}</span>
    {/if}
    {#if mech.ttsEnabled}
      <span title="TTS enabled" style="color: var(--color-accent-500);">🔊</span>
    {/if}
  </div>

  <!-- Actions -->
  <div style="display: flex; justify-content: flex-end;">
    <button
      onclick={() => onEdit(mech)}
      title="Edit"
      style="background: transparent; border: none; cursor: pointer; padding: 4px 7px; border-radius: 4px; font-size: 12px; color: #a3a3a3; transition: color 0.15s, background 0.15s;"
      onmouseenter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#fafafa";
        (e.currentTarget as HTMLElement).style.background = "#262626";
      }}
      onmouseleave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#a3a3a3";
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}>✎</button
    >
    <button
      onclick={() => onDelete(mech.id)}
      title="Delete"
      style="background: transparent; border: none; cursor: pointer; padding: 4px 7px; border-radius: 4px; font-size: 12px; color: #f87171; transition: color 0.15s, background 0.15s;"
      onmouseenter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#fca5a5";
        (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)";
      }}
      onmouseleave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "#f87171";
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}>✕</button
    >
  </div>
</div>
