<script lang="ts">
  import GateSidebar from "$lib/components/mech/GateSidebar.svelte";
  import HPTimeline from "$lib/components/mech/HPTimeline.svelte";
  import MechBadge from "$lib/components/mech/MechBadge.svelte";
  import MechModal from "$lib/components/mech/MechModal.svelte";
  import MechRow from "$lib/components/mech/MechRow.svelte";
  import { mechStore } from "$lib/mech-store.svelte";
  import type { Difficulty, Mechanic } from "$lib/mech-types";
  import { libraryByRaid } from "$lib/data/raid-library";
  import { activeDifficultyForGate, filterByDifficulty } from "$lib/utils/difficulty";
  import Header from "../Header.svelte";
  import { formatGate } from "$lib/mech-constants";

  let showModal = $state(false);
  let editMech = $state<Mechanic | null>(null);

  const gate = $derived(mechStore.selectedGate);
  // Prefer the gate's own availableDifficulties (set when the user adds a
  // custom raid via the sidebar), then fall back to the library entry by
  // raid-name, then to ["Normal", "Hard"] for legacy data.
  const availableDifficulties = $derived<Difficulty[]>(
    gate?.availableDifficulties ?? libraryByRaid[gate?.raid ?? ""]?.[0]?.availableDifficulties ?? ["Normal", "Hard"]
  );

  // Set of library mech keys for THIS gate's library entry (if any). Drives
  // whether the per-mech reset (↺) button shows: a library-origin mech moved
  // into a custom raid (or whose gate has no library entry anymore) has no
  // library default to revert to, so the button would be a no-op — hide it.
  const libraryMechKeysForGate = $derived<Set<string>>(
    new Set(
      (gate ? libraryByRaid[gate.raid] ?? [] : [])
        .find((e) => e.gate === gate?.gate)
        ?.mechanics.map((m) => m.key) ?? []
    )
  );

  // svelte-ignore state_referenced_locally
  let _manualBar = $state(gate?.totalBars ?? 300);
  $effect(() => {
    _manualBar = gate?.totalBars ?? 300;
  });

  const simBar = $derived(mechStore.liveBar ?? _manualBar);
  const isLive = $derived(mechStore.isLive);

  const activeDifficulty = $derived(activeDifficultyForGate(mechStore.difficultyMap, gate?.raid ?? ""));
  const sorted = $derived(
    gate
      ? filterByDifficulty([...gate.mechanics], activeDifficulty).sort((a, b) => (b.hpBar ?? -1) - (a.hpBar ?? -1))
      : []
  );
  const nextId = $derived(sorted.find((m) => m.hpBar != null && (m.hpBar ?? 0) <= simBar)?.id ?? null);

  function openAdd() {
    editMech = null;
    showModal = true;
  }
  function openEdit(m: Mechanic) {
    editMech = m;
    showModal = true;
  }
  function closeModal() {
    showModal = false;
    editMech = null;
  }

  function saveMechanic(m: Mechanic) {
    if (gate) mechStore.upsertMechanic(gate.id, m);
    closeModal();
  }

  function deleteMechanic(id: string) {
    if (gate) mechStore.deleteMechanic(gate.id, id);
  }

  function resetMechToLibrary(id: string) {
    if (gate) mechStore.resetMechToLibraryDefault(gate.id, id);
  }

  const bossTypeColor = $derived(
    !gate ? "#fbbf24" : gate.bossType === "HUMAN" ? "#fbbf24" : gate.bossType === "ANCIENT" ? "#a78bfa" : "#f87171"
  );
</script>

<Header title="Raid Editor" />

<div style="display: flex; overflow: hidden; height: calc(100% - 4rem);">
  <GateSidebar />

  {#if gate}
    <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0;">
      <!-- Boss header -->
      <div
        class="border-b border-accent-500/20"
        style="padding: 14px 22px; display: flex; align-items: center; gap: 14px; flex-shrink: 0; background: rgba(23,23,23,0.7); backdrop-filter: blur(8px);"
      >
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
            <MechBadge
              label="Gate {formatGate(gate.gate)}"
              color="var(--color-accent-500)"
              bg="color-mix(in oklch, var(--color-accent-500) 10%, transparent)"
              border="color-mix(in oklch, var(--color-accent-500) 30%, transparent)"
              small
            />
            <MechBadge label={gate.bossType} color={bossTypeColor} small />
            {#if gate.weakness !== "No Weakness"}
              <MechBadge label={gate.weakness} color="#4ade80" small />
            {/if}
            {#if !gate.tauntable}
              <MechBadge label="Not Tauntable" color="#8a8a8a" small />
            {/if}
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #fafafa;">{gate.boss}</div>
        </div>
        <div style="text-align: right; flex-shrink: 0;">
          <div
            style="font-size: 12px; color: #8a8a8a; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600;"
          >
            Total HP
          </div>
          <div
            style="font-size: 22px; font-weight: 700; font-family: ui-monospace, monospace; color: var(--color-accent-500); line-height: 1.1;"
          >
            {gate.totalBars}
          </div>
          <div style="font-size: 12px; color: #8a8a8a;">bars</div>
        </div>
      </div>

      <!-- HP Timeline + sim slider -->
      <div
        class="border-b border-accent-500/20"
        style="padding: 10px 22px 14px; background: rgba(20,20,20,0.4); flex-shrink: 0;"
      >
        <HPTimeline mechanics={sorted} totalBars={gate.totalBars} currentBar={simBar} />
        <div
          style="display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 12px; color: #8a8a8a; font-family: ui-monospace, monospace; font-weight: 600;"
        >
          <span style="letter-spacing: 0.08em; text-transform: uppercase;">Simulate HP</span>
          <input
            type="range"
            min={0}
            max={gate.totalBars}
            value={simBar}
            oninput={(e) => {
              if (!isLive) _manualBar = Number((e.target as HTMLInputElement).value);
            }}
            style="flex: 1; accent-color: var(--color-accent-500); height: 4px; {isLive
              ? 'opacity: 0.5; cursor: not-allowed;'
              : ''}"
          />
          <span style="color: {isLive ? '#4ade80' : 'var(--color-accent-500)'}; min-width: 80px; text-align: right;">
            {simBar}× / {gate.totalBars}×
            {#if isLive}<span style="font-size: 12px; color: #4ade80; margin-left: 3px;">LIVE</span>{/if}
          </span>
        </div>
      </div>

      <!-- Table header -->
      <div
        class="border-b border-accent-500/20"
        style="display: grid; grid-template-columns: 78px 60px 1fr 110px 86px 78px; padding: 7px 14px; background: #0c0c0c; font-size: 12px; font-weight: 700; color: #8a8a8a; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0;"
      >
        <div>HP Bar</div>
        <div>Phase</div>
        <div>Mechanic</div>
        <div>Severity</div>
        <div>Repeat</div>
        <div style="text-align: right;">
          <button
            onclick={openAdd}
            style="background: color-mix(in oklch, var(--color-accent-500) 10%, transparent); border: 1px solid color-mix(in oklch, var(--color-accent-500) 30%, transparent); border-radius: 3px; padding: 3px 9px; color: var(--color-accent-500); cursor: pointer; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; font-family: inherit;"
            >+ ADD</button
          >
        </div>
      </div>

      <!-- Mechanic rows -->
      <div style="flex: 1; overflow-y: auto;">
        {#if sorted.length === 0}
          <div style="padding: 48px; text-align: center; color: #8a8a8a; font-size: 13px;">
            No mechanics yet.<br />
            <button
              onclick={openAdd}
              style="margin-top: 12px; background: color-mix(in oklch, var(--color-accent-500) 10%, transparent); border: 1px solid color-mix(in oklch, var(--color-accent-500) 30%, transparent); border-radius: 4px; padding: 8px 16px; color: var(--color-accent-500); cursor: pointer; font-size: 12px; font-family: inherit;"
              >+ Add First Mechanic</button
            >
          </div>
        {:else}
          {#each sorted as m (m.id)}
            <MechRow
              mech={m}
              isNext={m.id === nextId}
              isPast={m.hpBar != null && (m.hpBar ?? 0) > simBar}
              {availableDifficulties}
              canResetToLibrary={!!m.key && libraryMechKeysForGate.has(m.key)}
              onEdit={openEdit}
              onDelete={deleteMechanic}
              onResetToLibrary={resetMechToLibrary}
            />
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <MechModal
    mech={editMech}
    totalBars={gate?.totalBars ?? 300}
    {availableDifficulties}
    onSave={saveMechanic}
    onClose={closeModal}
  />
{/if}
