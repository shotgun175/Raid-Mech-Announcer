<script lang="ts">
  import { formatTimer, PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import type { Difficulty, Mechanic } from "$lib/mech-types";
  import { mechStore } from "$lib/mech-store.svelte";
  import { DIFFICULTY_ORDER, DIFFICULTY_STYLE } from "$lib/utils/difficulty";
  import MechBadge from "./MechBadge.svelte";

  interface Props {
    mech: Mechanic;
    isNext: boolean;
    isPast: boolean;
    availableDifficulties: Difficulty[];
    // True only when this mech's gate has a matching library entry AND this
    // mech's key exists in that library entry. Hides the ↺ for orphaned
    // library mechs (e.g. moved into a custom raid) where reset would no-op.
    canResetToLibrary: boolean;
    onEdit: (m: Mechanic) => void;
    onDelete: (id: string) => void;
    onResetToLibrary: (id: string) => void;
  }
  let { mech, isNext, isPast, availableDifficulties, canResetToLibrary, onEdit, onDelete, onResetToLibrary }: Props =
    $props();

  let hovered = $state(false);
  const sev = $derived(SEVERITY[mech.severity]);
  const phaseColor = $derived(mech.phase ? PHASE_COLORS[mech.phase] : null);
  // Only show difficulty badges when the mech is restricted to a strict subset
  // of the gate's available difficulties. Universal mechs (tagged with every
  // available mode) would render every badge on every row — pure noise.
  const showDifficultyBadges = $derived.by(() => {
    if (!mech.difficulties?.length) return false;
    return availableDifficulties.some((d) => !mech.difficulties!.includes(d));
  });
  // Render badges in canonical order (Solo → Normal → Hard → Nightmare) so
  // toggle-click order in the modal doesn't leak into the row display.
  const orderedDifficulties = $derived(
    mech.difficulties ? DIFFICULTY_ORDER.filter((d) => mech.difficulties!.includes(d)) : []
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  onmouseenter={() => (hovered = true)}
  onmouseleave={() => (hovered = false)}
  onclick={() => mechStore.clearChangedMech(mech.id)}
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
      {#if mechStore.changedMechIds.has(mech.id)}
        <span
          title="This mech was updated by the latest library version. Click anywhere on the row to dismiss this dot."
          style="flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--color-accent-500); box-shadow: 0 0 4px var(--color-accent-500);"
        ></span>
      {/if}
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
      {#if showDifficultyBadges}
        <span style="display: flex; gap: 3px; flex-shrink: 0;">
          {#each orderedDifficulties as d}
            {@const sty = DIFFICULTY_STYLE[d]}
            <span
              style="background: {sty.bg}; border: 1px solid {sty.border}; border-radius: 2px; padding: 1px 4px; color: {sty.color}; font-size: 9px; font-weight: 700; letter-spacing: 0.04em;"
              >{sty.label}</span
            >
          {/each}
        </span>
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
      {#if mechStore.mechSettings.announcementsEnabled === false}
        <span
          title="TTS announcements are off globally. Enable in Settings → Announcements to hear this mech."
          style="color: #737373;">🔇</span
        >
      {:else}
        <span title="TTS enabled" style="color: var(--color-accent-500);">🔊</span>
      {/if}
    {/if}
  </div>

  <!-- Actions -->
  <div style="display: flex; justify-content: flex-end;">
    {#if mech.origin === "library" && mech.userEdited && canResetToLibrary}
      <button
        onclick={() => onResetToLibrary(mech.id)}
        title="Reset to library default"
        style="background: transparent; border: none; cursor: pointer; padding: 4px 7px; border-radius: 4px; font-size: 13px; color: #a3a3a3; transition: color 0.15s, background 0.15s;"
        onmouseenter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--color-accent-500)";
          (e.currentTarget as HTMLElement).style.background = "#262626";
        }}
        onmouseleave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "#a3a3a3";
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}>↺</button
      >
    {/if}
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
