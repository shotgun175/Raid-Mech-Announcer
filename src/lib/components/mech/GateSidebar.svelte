<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import type { Difficulty, Gate } from "$lib/mech-types";
  import { libraryByRaid, LIBRARY } from "$lib/data/raid-library";
  import { DIFFICULTY_STYLE } from "$lib/utils/difficulty";
  import { createDialog, melt } from "@melt-ui/svelte";
  import ImportRaidsModal from "./ImportRaidsModal.svelte";

  let showImport = $state(false);
  let showResetPopover = $state(false);
  let confirmEverything = $state(false);
  let confirmEverythingTimer: ReturnType<typeof setTimeout> | null = null;
  let openDiffDropdown = $state<string | null>(null);

  function openResetPopover() {
    showResetPopover = true;
    confirmEverything = false;
  }

  function closeResetPopover() {
    showResetPopover = false;
    confirmEverything = false;
    if (confirmEverythingTimer) {
      clearTimeout(confirmEverythingTimer);
      confirmEverythingTimer = null;
    }
  }

  function handleResetGate() {
    const gate = mechStore.selectedGate;
    if (!gate) return;
    mechStore.resetGate(gate.id);
    closeResetPopover();
  }

  function handleResetRaid() {
    const gate = mechStore.selectedGate;
    if (!gate) return;
    mechStore.resetRaid(gate.raid);
    closeResetPopover();
  }

  function handleResetEverything() {
    if (!confirmEverything) {
      confirmEverything = true;
      confirmEverythingTimer = setTimeout(() => {
        confirmEverything = false;
        confirmEverythingTimer = null;
      }, 3000);
    } else {
      mechStore.resetRaids();
      closeResetPopover();
    }
  }

  function gateLabel(gate: number): string {
    if (gate < 10) return `Gate ${gate}`;
    return `Gate ${Math.floor(gate / 10)}-${gate % 10}`;
  }

  const raidNames = $derived(
    Array.from(new Set(mechStore.raids.map((r) => r.raid))).sort((a, b) => {
      const orderA = libraryByRaid[a]?.[0]?.releaseOrder ?? 0;
      const orderB = libraryByRaid[b]?.[0]?.releaseOrder ?? 0;
      return orderB - orderA; // newest first; custom raids (order 0) fall to bottom
    })
  );
  const raidsByName = $derived(
    raidNames.reduce(
      (acc, n) => {
        acc[n] = mechStore.raids.filter((r) => r.raid === n).sort((a, b) => a.gate - b.gate);
        return acc;
      },
      {} as Record<string, typeof mechStore.raids>
    )
  );

  const selectedGate = $derived(mechStore.selectedGate);

  const isGateResettable = $derived(
    selectedGate != null && LIBRARY.some((e) => e.raid === selectedGate.raid && e.gate === selectedGate.gate)
  );

  const isRaidResettable = $derived(
    selectedGate != null &&
      mechStore.raids
        .filter((r) => r.raid === selectedGate.raid)
        .some((r) => LIBRARY.some((e) => e.raid === r.raid && e.gate === r.gate))
  );

  const gateResetLabel = $derived(
    selectedGate
      ? `G${selectedGate.gate} · ${selectedGate.boss.split(",")[0]} — restore library mechanics`
      : "No gate selected"
  );

  const raidGates = $derived(selectedGate ? (raidsByName[selectedGate.raid] ?? []) : []);

  const raidResetLabel = $derived(
    selectedGate && raidGates.length > 0
      ? `All ${selectedGate.raid} gates (G${raidGates[0].gate}–G${raidGates[raidGates.length - 1].gate})`
      : "No raid selected"
  );

  const {
    elements: { trigger, portalled, overlay, content, title, close },
    states: { open }
  } = createDialog();

  let form = $state({
    raid: "",
    gate: 1,
    boss: "",
    bossType: "HUMAN",
    weakness: "No Weakness",
    tauntable: false,
    totalBars: 300
  });

  function availableDifficultiesFor(raidName: string): Difficulty[] {
    return libraryByRaid[raidName]?.[0]?.availableDifficulties ?? ["Normal", "Hard"];
  }

  const inp =
    "width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
  const selStyle =
    "width: 100%; background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
  const fieldLabel =
    "font-size: 12px; color: #a3a3a3; margin-bottom: 5px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;";

  function saveRaid() {
    if (!form.raid.trim() || !form.boss.trim()) return;
    mechStore.addGate({
      id: `${form.raid.toLowerCase().replace(/\s+/g, "-")}-g${form.gate}-${Date.now()}`,
      raid: form.raid.trim(),
      gate: form.gate,
      boss: form.boss.trim(),
      bossType: form.bossType,
      weakness: form.weakness.trim() || "No Weakness",
      tauntable: form.tauntable,
      totalBars: form.totalBars,
      mechanics: []
    });
    form = {
      raid: "",
      gate: 1,
      boss: "",
      bossType: "HUMAN",
      weakness: "No Weakness",
      tauntable: false,
      totalBars: 300
    };
    $open = false;
  }
</script>

<div
  style="width: 220px; background: #0f0f0f; border-right: 1px solid #262626; display: flex; flex-direction: column; flex-shrink: 0;"
>
  <!-- Header + buttons -->
  <div style="padding: 8px 10px; border-bottom: 1px solid #262626; flex-shrink: 0;">
    <div
      style="font-size: 12px; color: #a3a3a3; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px;"
    >
      Raids & Gates
    </div>
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <button
        use:melt={$trigger}
        style="width: 100%; background: color-mix(in oklch, var(--color-accent-500) 10%, transparent); border: 1px solid color-mix(in oklch, var(--color-accent-500) 30%, transparent); border-radius: 4px; padding: 4px 6px; color: var(--color-accent-500); cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;"
      >
        + Add Raid
      </button>
      <button
        onclick={() => (showImport = true)}
        style="width: 100%; background: rgba(74,222,128,0.08); border: 1px solid rgba(74,222,128,0.3); border-radius: 4px; padding: 4px 6px; color: #4ade80; cursor: pointer; font-size: 12px; font-weight: 600; font-family: inherit;"
      >
        ⬇ Import Raids
      </button>
    </div>
  </div>

  <!-- Raid groups -->
  <div style="flex: 1; overflow-y: auto;">
    {#each raidNames as raidName (raidName)}
      {@const diff = (mechStore.difficultyMap[raidName] as Difficulty) ?? null}
      {@const sty = diff ? DIFFICULTY_STYLE[diff] : null}
      <div>
        <div style="padding: 6px 10px 2px; display: flex; align-items: center; gap: 6px;">
          <div
            style="font-size: 12px; color: #d4d4d4; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
          >
            {raidName}
          </div>

          <!-- Difficulty dropdown -->
          <div style="position: relative; flex-shrink: 0;">
            <button
              onclick={(e) => {
                e.stopPropagation();
                openDiffDropdown = openDiffDropdown === raidName ? null : raidName;
              }}
              title="Select difficulty"
              style="
                background: {sty ? sty.bg : '#1a1a1a'};
                border: 1px {sty ? 'solid' : 'dashed'} {sty ? sty.border : '#33333366'};
                border-radius: 3px;
                padding: 1px 6px;
                color: {sty ? sty.color : '#525252'};
                font-size: 9px;
                font-weight: 700;
                letter-spacing: 0.04em;
                cursor: pointer;
                font-family: inherit;
                line-height: 1.6;
              ">{sty ? sty.label : "ALL"} ▾</button
            >

            {#if openDiffDropdown === raidName}
              <!-- Backdrop: catches outside clicks -->
              <div
                role="presentation"
                style="position: fixed; inset: 0; z-index: 19;"
                onclick={() => (openDiffDropdown = null)}
              ></div>

              <!-- Floating panel -->
              <div
                style="
                  position: absolute; right: 0; top: 100%; margin-top: 3px; z-index: 20;
                  background: #1a1a1a; border: 1px solid #333; border-radius: 4px;
                  min-width: 100px; overflow: hidden;
                  box-shadow: 0 4px 14px rgba(0,0,0,0.6);
                "
              >
                <!-- All (null) option -->
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    mechStore.setDifficulty(raidName, null);
                    openDiffDropdown = null;
                  }}
                  style="
                    display: flex; align-items: center; justify-content: space-between;
                    width: 100%; padding: 4px 10px; font-size: 10px; font-weight: 600;
                    color: #525252; background: {diff === null ? '#252525' : 'transparent'};
                    border: none; cursor: pointer; font-family: inherit; text-align: left;
                    letter-spacing: 0.03em;
                  "
                >
                  <span>All</span>
                  {#if diff === null}<span>✓</span>{/if}
                </button>

                <!-- Per-difficulty options -->
                {#each availableDifficultiesFor(raidName) as d (d)}
                  {@const ds = DIFFICULTY_STYLE[d]}
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      mechStore.setDifficulty(raidName, d);
                      openDiffDropdown = null;
                    }}
                    style="
                      display: flex; align-items: center; justify-content: space-between;
                      width: 100%; padding: 4px 10px; font-size: 10px; font-weight: 600;
                      color: {ds.color}; background: {diff === d ? ds.bg : 'transparent'};
                      border: none; cursor: pointer; font-family: inherit; text-align: left;
                      letter-spacing: 0.03em;
                    "
                  >
                    <span>{ds.label}</span>
                    {#if diff === d}<span>✓</span>{/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <button
            onclick={(e) => {
              e.stopPropagation();
              mechStore.removeRaid(raidName);
            }}
            title="Remove raid"
            style="background: transparent; border: none; cursor: pointer; color: #3a3a3a; font-size: 12px; padding: 0 1px; line-height: 1; transition: color 0.15s; flex-shrink: 0;"
            onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
            onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3a3a3a")}>✕</button
          >
        </div>
        {#each raidsByName[raidName] as gate (gate.id)}
          {@const sel = gate.id === mechStore.selectedGateId}
          {@const isLive = gate.id === mechStore.liveGateId}
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <div
            role="row"
            tabindex="0"
            onclick={() => mechStore.selectGate(gate.id)}
            onkeydown={(e) => e.key === "Enter" && mechStore.selectGate(gate.id)}
            style="
              width: 100%; text-align: left; padding: 8px 14px 8px 20px; cursor: pointer;
              background: {sel
              ? 'color-mix(in oklch, var(--color-accent-500) 10%, transparent)'
              : isLive
                ? 'rgba(74,222,128,0.05)'
                : 'transparent'};
              border-left: {sel
              ? '2px solid var(--color-accent-500)'
              : isLive
                ? '2px solid rgba(74,222,128,0.4)'
                : '2px solid transparent'};
              color: {sel ? 'var(--color-accent-500)' : '#a3a3a3'}; font-size: 12.5px; font-weight: {sel ? 600 : 400};
              display: flex; justify-content: space-between; align-items: center;
              transition: background 0.15s, color 0.15s; font-family: inherit;
            "
            onmouseenter={(e) => {
              if (!sel) {
                (e.currentTarget as HTMLElement).style.background = "#202020";
                (e.currentTarget as HTMLElement).style.color = "#fafafa";
              }
            }}
            onmouseleave={(e) => {
              if (!sel) {
                (e.currentTarget as HTMLElement).style.background = isLive ? "rgba(74,222,128,0.05)" : "transparent";
                (e.currentTarget as HTMLElement).style.color = "#a3a3a3";
              }
            }}
          >
            <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
              <span>{gateLabel(gate.gate)}</span>
              {#if isLive}
                <span
                  style="font-size: 12px; font-weight: 800; color: #4ade80; background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.4); border-radius: 3px; padding: 1px 5px; letter-spacing: 0.08em; animation: mech-pulse 2s ease-in-out infinite;"
                  >LIVE</span
                >
              {/if}
            </div>
            <span style="font-size: 12px; color: #8a8a8a; font-family: ui-monospace, monospace; flex-shrink: 0;"
              >{gate.mechanics.length}</span
            >
          </div>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Reset — popover anchor -->
  <div style="padding: 8px 10px; border-top: 1px solid #1a1a1a; flex-shrink: 0; position: relative;">
    {#if showResetPopover}
      <!-- Dim backdrop -->
      <div
        role="presentation"
        style="position: fixed; inset: 0; z-index: 29; background: rgba(0,0,0,0.4);"
        onclick={closeResetPopover}
      ></div>

      <!-- Popover panel -->
      <div
        style="position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 30;
               background: #1e1e1e; border: 1px solid #383838; border-radius: 10px;
               padding: 13px; box-shadow: 0 -12px 40px rgba(0,0,0,0.7);"
      >
        <!-- Caret -->
        <div
          style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg);
                    width: 10px; height: 10px; background: #1e1e1e;
                    border-right: 1px solid #383838; border-bottom: 1px solid #383838;"
        ></div>

        <div
          style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 10px;"
        >
          What do you want to reset?
        </div>

        <div style="display: flex; flex-direction: column; gap: 5px;">
          <!-- Gate option -->
          <button
            onclick={handleResetGate}
            disabled={!isGateResettable}
            style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                   border: 1px solid #272727; background: #141414;
                   cursor: {isGateResettable ? 'pointer' : 'not-allowed'};
                   font-family: inherit; text-align: left; opacity: {isGateResettable ? 1 : 0.4}; width: 100%;"
          >
            <div
              style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; background: rgba(14,165,233,0.1); border: 1px solid rgba(14,165,233,0.22);"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 17V9C5 6.24 7.24 4 10 4C12.76 4 15 6.24 15 9V17"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path d="M5 17H15" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" />
                <circle cx="10" cy="10" r="1.5" fill="#38bdf8" opacity="0.7" />
                <line
                  x1="5"
                  y1="11"
                  x2="3"
                  y2="11"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  opacity="0.4"
                />
                <line
                  x1="15"
                  y1="11"
                  x2="17"
                  y2="11"
                  stroke="#38bdf8"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  opacity="0.4"
                />
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: #38bdf8;">Gate</div>
              <div
                title={isGateResettable ? gateResetLabel : "Custom gate — no library version"}
                style="font-size: 10px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
              >
                {isGateResettable ? gateResetLabel : "Custom gate — no library version"}
              </div>
            </div>
          </button>

          <!-- Raid option -->
          <button
            onclick={handleResetRaid}
            disabled={!isRaidResettable}
            style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                   border: 1px solid #272727; background: #141414;
                   cursor: {isRaidResettable ? 'pointer' : 'not-allowed'};
                   font-family: inherit; text-align: left; opacity: {isRaidResettable ? 1 : 0.4}; width: 100%;"
          >
            <div
              style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.22);"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <line x1="4" y1="4" x2="16" y2="16" stroke="#fb923c" stroke-width="1.6" stroke-linecap="round" />
                <line
                  x1="3.5"
                  y1="7.5"
                  x2="7.5"
                  y2="3.5"
                  stroke="#fb923c"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  opacity="0.7"
                />
                <circle cx="15.5" cy="15.5" r="1.2" fill="#fb923c" opacity="0.6" />
                <line x1="16" y1="4" x2="4" y2="16" stroke="#fb923c" stroke-width="1.6" stroke-linecap="round" />
                <line
                  x1="16.5"
                  y1="7.5"
                  x2="12.5"
                  y2="3.5"
                  stroke="#fb923c"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  opacity="0.7"
                />
                <circle cx="4.5" cy="15.5" r="1.2" fill="#fb923c" opacity="0.6" />
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: #fb923c;">Raid</div>
              <div
                title={isRaidResettable ? raidResetLabel : "No library gates in this raid"}
                style="font-size: 10px; color: #525252; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
              >
                {isRaidResettable ? raidResetLabel : "No library gates in this raid"}
              </div>
            </div>
          </button>

          <!-- Divider -->
          <div style="height: 1px; background: #222; margin: 3px 0;"></div>

          <!-- Everything option -->
          <button
            onclick={handleResetEverything}
            style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                   border: 1px solid {confirmEverything ? 'rgba(248,113,113,0.4)' : '#272727'};
                   background: {confirmEverything ? 'rgba(248,113,113,0.08)' : '#141414'};
                   cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: all 0.15s;"
          >
            <div
              style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.22);"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <ellipse
                  cx="12"
                  cy="8"
                  rx="7"
                  ry="5.5"
                  fill="#f87171"
                  opacity="0.2"
                  stroke="#f87171"
                  stroke-width="1.3"
                />
                <ellipse cx="12" cy="7.5" rx="4.5" ry="3.5" fill="#f87171" opacity="0.25" />
                <path
                  d="M10 13.5C10 13.5 10.5 16 11 17H13C13.5 16 14 13.5 14 13.5"
                  stroke="#f87171"
                  stroke-width="1.3"
                  stroke-linecap="round"
                  fill="none"
                />
                <path
                  d="M8 17.5C8 17.5 9.5 19 12 19C14.5 19 16 17.5 16 17.5"
                  stroke="#f87171"
                  stroke-width="1.3"
                  stroke-linecap="round"
                  opacity="0.7"
                />
                <path
                  d="M6 18C6 18 8.5 20.5 12 20.5C15.5 20.5 18 18 18 18"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.3"
                />
                <line
                  x1="5.5"
                  y1="6"
                  x2="4"
                  y2="4.5"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="18.5"
                  y1="6"
                  x2="20"
                  y2="4.5"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="12"
                  y1="2.5"
                  x2="12"
                  y2="1"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.5"
                />
                <line
                  x1="6"
                  y1="9"
                  x2="4"
                  y2="9"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.4"
                />
                <line
                  x1="18"
                  y1="9"
                  x2="20"
                  y2="9"
                  stroke="#f87171"
                  stroke-width="1"
                  stroke-linecap="round"
                  opacity="0.4"
                />
              </svg>
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 13px; font-weight: 600; color: #f87171;">
                {confirmEverything ? "⚠ Confirm?" : "Everything"}
              </div>
              <div style="font-size: 10px; color: #525252; margin-top: 2px;">All raids — restore 3 newest defaults</div>
            </div>
          </button>
        </div>
      </div>
    {/if}

    <!-- Trigger button — unchanged appearance -->
    <button
      onclick={openResetPopover}
      style="width: 100%; background: transparent; border: 1px solid #1f1f1f; border-radius: 4px;
             padding: 4px 6px; color: #3a3a3a; cursor: pointer; font-size: 12px; font-weight: 600;
             font-family: inherit; transition: all 0.15s;"
      onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.color = "#a3a3a3")}
      onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.color = "#3a3a3a")}
    >
      ↺ Reset to Defaults
    </button>
  </div>
</div>

<svelte:window
  onkeydown={(e) => {
    if (e.key === "Escape" && showResetPopover) closeResetPopover();
  }}
/>

<!-- Add Raid modal -->
{#if $open}
  <div use:melt={$portalled}>
    <div
      use:melt={$overlay}
      style="position: fixed; inset: 0; z-index: 50; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
    ></div>
    <div
      use:melt={$content}
      style="position: fixed; left: 50%; top: 50%; z-index: 50; transform: translate(-50%,-50%); background: #171717; border: 1px solid #404040; border-radius: 8px; width: 420px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.7);"
    >
      <div
        style="padding: 14px 18px; border-bottom: 1px solid #262626; display: flex; justify-content: space-between; align-items: center;"
      >
        <span use:melt={$title} style="font-weight: 600; font-size: 14px; color: #fafafa;">Add Raid Gate</span>
        <button
          use:melt={$close}
          style="background: transparent; border: none; cursor: pointer; color: #a3a3a3; font-size: 16px; padding: 2px 6px;"
          >✕</button
        >
      </div>
      <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 80px; gap: 12px;">
          <div>
            <div style={fieldLabel}>Raid Name</div>
            <input style={inp} bind:value={form.raid} placeholder="e.g. Serca" />
          </div>
          <div>
            <div style={fieldLabel}>Gate</div>
            <input type="number" style={inp} bind:value={form.gate} min={1} max={8} />
          </div>
        </div>
        <div>
          <div style={fieldLabel}>Boss Name</div>
          <input style={inp} bind:value={form.boss} placeholder="e.g. Witch of Agony, Serca" />
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <div style={fieldLabel}>Boss Type</div>
            <select style={selStyle} bind:value={form.bossType}>
              <option value="HUMAN">Human</option>
              <option value="ANCIENT">Ancient</option>
              <option value="DEMONIC">Demonic</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <div style={fieldLabel}>Total HP Bars</div>
            <input type="number" style={inp} bind:value={form.totalBars} min={1} />
          </div>
        </div>
        <div>
          <div style={fieldLabel}>Weakness (optional)</div>
          <input style={inp} bind:value={form.weakness} placeholder="e.g. Weak to Light" />
        </div>
        <label
          style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa;"
        >
          <input
            type="checkbox"
            bind:checked={form.tauntable}
            style="accent-color: var(--color-accent-500); width: 13px; height: 13px;"
          />
          Tauntable
        </label>
      </div>
      <div
        style="padding: 12px 18px; border-top: 1px solid #262626; display: flex; justify-content: flex-end; gap: 8px;"
      >
        <button
          use:melt={$close}
          style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 14px; color: #a3a3a3; cursor: pointer; font-size: 12.5px; font-family: inherit;"
          >Cancel</button
        >
        <button
          onclick={saveRaid}
          disabled={!form.raid.trim() || !form.boss.trim()}
          style="background: {form.raid.trim() && form.boss.trim()
            ? 'color-mix(in oklch, var(--color-accent-500) 10%, transparent)'
            : '#1a1a1a'}; border: 1px solid {form.raid.trim() && form.boss.trim()
            ? 'color-mix(in oklch, var(--color-accent-500) 30%, transparent)'
            : '#262626'}; border-radius: 4px; padding: 7px 14px; color: {form.raid.trim() && form.boss.trim()
            ? 'var(--color-accent-500)'
            : '#8a8a8a'}; cursor: {form.raid.trim() && form.boss.trim()
            ? 'pointer'
            : 'not-allowed'}; font-size: 12.5px; font-weight: 600; font-family: inherit; opacity: {form.raid.trim() &&
          form.boss.trim()
            ? 1
            : 0.5};"
        >
          Add Raid
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showImport}
  <ImportRaidsModal onClose={() => (showImport = false)} />
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
