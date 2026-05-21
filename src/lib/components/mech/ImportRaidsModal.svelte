<script lang="ts">
  import {
    buildLibraryGate,
    isImported,
    libraryByRaid,
    sortedRaidNames,
    type LibraryGate
  } from "$lib/data/raid-library";
  import { gateLabel } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";

  interface Props {
    onClose: () => void;
  }
  const { onClose }: Props = $props();

  let search = $state("");
  let expanded = $state<Record<string, boolean>>(Object.fromEntries(sortedRaidNames.map((r) => [r, false])));
  let hoveredRaid = $state<string | null>(null);

  const filteredRaids = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedRaidNames;
    return sortedRaidNames.filter((raidName) => {
      if (raidName.toLowerCase().includes(q)) return true;
      return libraryByRaid[raidName].some(
        (g) => g.boss.toLowerCase().includes(q) || g.mechanics.some((m) => m.name.toLowerCase().includes(q))
      );
    });
  });

  function importGate(entry: LibraryGate) {
    mechStore.addGate(buildLibraryGate(entry));
  }

  function importRaid(raidName: string) {
    for (const entry of libraryByRaid[raidName]) {
      if (!isImported(mechStore.raids, entry.encounterKey)) {
        mechStore.addGate(buildLibraryGate(entry));
      }
    }
  }

  const severityColor: Record<string, string> = {
    normal: "#a3a3a3",
    major: "#fb923c",
    wipe: "#f87171"
  };

  const btn =
    "border: none; border-radius: 4px; padding: 4px 12px; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit; transition: opacity 0.15s;";
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape") onClose();
  }}
/>

<!-- Backdrop -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  style="position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px);"
  tabindex="-1"
>
  <div
    style="background: #111111; border: 1px solid #333333; border-radius: 10px; width: 520px; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(0,0,0,0.8);"
  >
    <!-- Header -->
    <div style="padding: 14px 18px; border-bottom: 1px solid #262626; flex-shrink: 0;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
        <div>
          <div style="font-size: 14px; font-weight: 700; color: #fafafa;">Import Raids</div>
          <div style="font-size: 12px; color: #8a8a8a; margin-top: 2px;">
            Add pre-built mechanic templates · already-imported gates are hidden
          </div>
        </div>
        <button
          onclick={onClose}
          style="background: transparent; border: none; cursor: pointer; color: #737373; font-size: 18px; padding: 2px 6px; line-height: 1;"
          >✕</button
        >
      </div>
      <!-- Search -->
      <input
        bind:value={search}
        placeholder="Search raids, bosses, or mechanics…"
        style="width: 100%; background: #0f0f0f; border: 1px solid #333333; border-radius: 6px; padding: 7px 12px; color: #fafafa; font-size: 12px; outline: none; font-family: inherit; box-sizing: border-box;"
        onfocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#38bdf8")}
        onblur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "#333333")}
      />
    </div>

    <!-- Body -->
    <div style="overflow-y: auto; flex: 1; padding: 10px 0;">
      {#each filteredRaids as raidName (raidName)}
        {@const gates = libraryByRaid[raidName]}
        {@const importedCount = gates.filter((g) => isImported(mechStore.raids, g.encounterKey)).length}
        {@const allImported = importedCount === gates.length}
        {#if !allImported}
          <div style="margin-bottom: 2px;">
            <!-- Raid header -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              onmouseenter={() => (hoveredRaid = raidName)}
              onmouseleave={() => (hoveredRaid = null)}
              style="display: flex; align-items: center; padding: 4px 14px; margin: 0 4px; border-radius: 5px; transition: background 0.12s, border-color 0.12s; background: {hoveredRaid ===
              raidName
                ? 'color-mix(in oklch, var(--color-accent-500) 8%, transparent)'
                : 'transparent'}; border: 1px solid {hoveredRaid === raidName
                ? 'color-mix(in oklch, var(--color-accent-500) 25%, transparent)'
                : 'transparent'};"
            >
              <button
                onclick={() => {
                  expanded[raidName] = !expanded[raidName];
                }}
                style="flex: 1; text-align: left; background: transparent; border: none; cursor: pointer; padding: 4px 0; display: flex; align-items: center; gap: 8px; font-family: inherit; min-width: 0;"
              >
                <span
                  style="font-size: 12px; color: #8a8a8a; transition: transform 0.15s; display: inline-block; transform: rotate({expanded[
                    raidName
                  ]
                    ? 90
                    : 0}deg); flex-shrink: 0;">▶</span
                >
                <span
                  style="font-size: 12px; font-weight: 700; color: #a3a3a3; text-transform: uppercase; letter-spacing: 0.06em;"
                  >{raidName}</span
                >
                <span style="font-size: 12px; color: #404040; flex-shrink: 0;"
                  >{importedCount}/{gates.length} added</span
                >
              </button>
              <!-- Raid-level actions -->
              <div style="display: flex; gap: 5px; flex-shrink: 0; margin-left: 8px;">
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    importRaid(raidName);
                  }}
                  style="{btn} background: rgba(56,189,248,0.1); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); padding: 3px 10px;"
                  >+ All</button
                >
              </div>
            </div>

            <!-- Gates -->
            {#if expanded[raidName]}
              {#each gates as entry (entry.encounterKey)}
                {#if !isImported(mechStore.raids, entry.encounterKey)}
                  <div
                    style="margin: 2px 10px 2px 32px; background: #0f0f0f; border: 1px solid #1f1f1f; border-radius: 6px; padding: 10px 14px;"
                  >
                    <div
                      style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px;"
                    >
                      <div>
                        <span style="font-size: 12.5px; font-weight: 600; color: #e5e5e5;">{gateLabel(entry.gate)}</span
                        >
                        <span style="font-size: 12px; color: #8a8a8a; margin-left: 8px;">{entry.boss}</span>
                      </div>
                      <button
                        onclick={() => importGate(entry)}
                        style="{btn} background: rgba(56,189,248,0.1); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);"
                        >+ Import</button
                      >
                    </div>
                    <!-- Mechanic chips -->
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      {#each entry.mechanics as m}
                        <span
                          style="font-size: 12px; color: {severityColor[m.severity]}; background: {m.severity === 'wipe'
                            ? 'rgba(248,113,113,0.08)'
                            : m.severity === 'major'
                              ? 'rgba(251,146,60,0.08)'
                              : 'rgba(163,163,163,0.06)'}; border: 1px solid {m.severity === 'wipe'
                            ? 'rgba(248,113,113,0.2)'
                            : m.severity === 'major'
                              ? 'rgba(251,146,60,0.2)'
                              : 'rgba(163,163,163,0.12)'}; border-radius: 3px; padding: 1px 6px; white-space: nowrap;"
                        >
                          {m.name}{m.hpBar != null ? ` · ${m.hpBar}×` : m.repeatSecs ? ` · ↻${m.repeatSecs}s` : ""}
                        </span>
                      {/each}
                    </div>
                  </div>
                {/if}
              {/each}
            {/if}
          </div>
        {/if}
      {:else}
        <div style="padding: 32px; text-align: center; color: #8a8a8a; font-size: 12px;">No raids match "{search}"</div>
      {/each}
    </div>

    <!-- Footer -->
    <div
      style="padding: 12px 18px; border-top: 1px solid #1f1f1f; flex-shrink: 0; display: flex; justify-content: flex-end;"
    >
      <button
        onclick={onClose}
        style="{btn} background: #262626; color: #a3a3a3; border: 1px solid #333333; padding: 7px 18px; font-size: 12.5px;"
        >Done</button
      >
    </div>
  </div>
</div>
