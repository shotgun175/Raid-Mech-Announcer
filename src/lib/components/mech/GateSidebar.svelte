<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import type { Difficulty, Gate } from "$lib/mech-types";
  import { libraryByRaid, LIBRARY } from "$lib/data/raid-library";
  import { DIFFICULTY_STYLE } from "$lib/utils/difficulty";
  import { formatGate, gateLabel } from "$lib/mech-constants";
  import { createDialog, melt } from "@melt-ui/svelte";
  import ImportRaidsModal from "./ImportRaidsModal.svelte";

  let showImport = $state(false);
  let showResetPopover = $state(false);
  let confirmEverything = $state(false);
  let confirmEverythingTimer: ReturnType<typeof setTimeout> | null = null;
  let openDiffDropdown = $state<string | null>(null);
  let openDiffDirection = $state<"down" | "up">("down");
  // When Reset Gate/Raid is clicked and customs exist, swap the popover content
  // for a "Wipe all / Keep customs" sub-state instead of resetting immediately.
  let promptResetTarget = $state<{
    kind: "gate" | "raid";
    id: string;
    raidName?: string;
    customsCount: number;
  } | null>(null);

  // Estimated panel height: up to 5 rows (All + Solo/Normal/Hard/Nightmare) × ~22px + borders.
  const DIFF_PANEL_EST_HEIGHT = 130;

  function chooseDiffDirection(trigger: HTMLElement): "down" | "up" {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < DIFF_PANEL_EST_HEIGHT && spaceAbove > spaceBelow) return "up";
    return "down";
  }

  function openResetPopover() {
    showResetPopover = true;
    confirmEverything = false;
  }

  function closeResetPopover() {
    showResetPopover = false;
    confirmEverything = false;
    promptResetTarget = null;
    if (confirmEverythingTimer) {
      clearTimeout(confirmEverythingTimer);
      confirmEverythingTimer = null;
    }
  }

  function handleResetGate() {
    const gate = mechStore.selectedGate;
    if (!gate) return;
    const customsCount = gate.mechanics.filter((m) => m.origin === "custom").length;
    if (customsCount > 0) {
      promptResetTarget = { kind: "gate", id: gate.id, customsCount };
      return;
    }
    mechStore.resetGate(gate.id);
    closeResetPopover();
  }

  function handleResetRaid() {
    const gate = mechStore.selectedGate;
    if (!gate) return;
    const customsCount = mechStore.raids
      .filter((r) => r.raid === gate.raid)
      .reduce((sum, r) => sum + r.mechanics.filter((m) => m.origin === "custom").length, 0);
    if (customsCount > 0) {
      promptResetTarget = { kind: "raid", id: gate.id, raidName: gate.raid, customsCount };
      return;
    }
    mechStore.resetRaid(gate.raid);
    closeResetPopover();
  }

  function confirmResetWipeAll() {
    const t = promptResetTarget;
    if (!t) return;
    if (t.kind === "gate") mechStore.resetGate(t.id);
    else if (t.kind === "raid" && t.raidName) mechStore.resetRaid(t.raidName);
    closeResetPopover();
  }

  function confirmResetKeepCustoms() {
    const t = promptResetTarget;
    if (!t) return;
    if (t.kind === "gate") mechStore.resetGatePreservingCustoms(t.id);
    else if (t.kind === "raid" && t.raidName) mechStore.resetRaidPreservingCustoms(t.raidName);
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
      ? `G${formatGate(selectedGate.gate)} · ${selectedGate.boss.split(",")[0]} - restore library mechanics`
      : "No gate selected"
  );

  const raidGates = $derived(selectedGate ? (raidsByName[selectedGate.raid] ?? []) : []);

  const raidResetLabel = $derived(
    selectedGate && raidGates.length > 0
      ? `All ${selectedGate.raid} gates (G${formatGate(raidGates[0].gate)}-G${formatGate(raidGates[raidGates.length - 1].gate)})`
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
  // Separate text state for the Gate input so users can type "1", "1.2", or
  // "1-2" instead of remembering the encoded form. The form.gate integer below
  // is what's actually saved; gateInput is the display value.
  let gateInput = $state("1");

  // Parse user-typed gate notation into the encoded integer used by the rest of
  // the app (formatGate's inverse). Accepts "N", "N.M", or "N-M" where M is 1-9.
  // Returns null for inputs that can't be interpreted (caller keeps last value).
  function parseGateInput(s: string): number | null {
    const t = s.trim();
    if (t === "") return null;
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      return n > 0 ? n : null;
    }
    const m = t.match(/^(\d+)[.\-](\d)$/);
    if (m) {
      const major = parseInt(m[1], 10);
      const minor = parseInt(m[2], 10);
      if (major > 0) return major * 10 + minor;
    }
    return null;
  }

  // Stair-step: as the user types a raid name that matches an existing raid,
  // default the gate to (highest existing gate + 1). Manual edits to the gate
  // input after that are preserved — this effect only re-fires when raid changes.
  let prevRaidForStair = "";
  $effect(() => {
    const trimmed = form.raid.trim();
    if (trimmed === prevRaidForStair) return;
    prevRaidForStair = trimmed;
    if (!trimmed) return;
    const existing = raidsByName[trimmed];
    const nextGate = existing && existing.length > 0 ? Math.max(...existing.map((g) => g.gate)) + 1 : 1;
    form.gate = nextGate;
    gateInput = formatGate(nextGate);
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
    gateInput = "1";
    prevRaidForStair = "";
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
                if (openDiffDropdown === raidName) {
                  openDiffDropdown = null;
                } else {
                  openDiffDirection = chooseDiffDirection(e.currentTarget as HTMLElement);
                  openDiffDropdown = raidName;
                }
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
                  position: absolute; right: 0; z-index: 20;
                  {openDiffDirection === 'up' ? 'bottom: 100%; margin-bottom: 3px;' : 'top: 100%; margin-top: 3px;'}
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
          {@const isLive = gate.id === mechStore.liveGateId && mechStore.isLive}
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
              {#if mechStore.changedGateIds.has(gate.id)}
                <span
                  title="Library updates applied - open to view"
                  style="width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent-500); flex-shrink: 0;"
                ></span>
              {/if}
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

        {#if promptResetTarget == null}
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
                <div style="font-size: 10px; color: #a3a3a3; margin-top: 2px;">
                  {isGateResettable ? gateResetLabel : "Custom gate - no library version"}
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
                <div style="font-size: 10px; color: #a3a3a3; margin-top: 2px;">
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
                {#if confirmEverything}
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
                {:else}
                  <span style="font-size: 18px; line-height: 1; color: #f87171;">☢</span>
                {/if}
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #f87171;">
                  {confirmEverything ? "⚠ Confirm?" : "Everything"}
                </div>
                <div style="font-size: 10px; color: #a3a3a3; margin-top: 2px;">
                  All raids - restore 3 newest defaults
                </div>
              </div>
            </button>
          </div>
        {:else}
          <!-- Customs-aware sub-state: pick wipe-all vs preserve-customs -->
          <div
            style="display: flex; align-items: center; gap: 9px; padding: 9px 11px; margin-bottom: 10px;
                   background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.3); border-radius: 6px;"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style="flex-shrink: 0;">
              <path
                d="M10 2 L18 16 L2 16 Z"
                stroke="#fbbf24"
                stroke-width="1.6"
                stroke-linejoin="round"
                fill="rgba(251,191,36,0.15)"
              />
              <line x1="10" y1="8" x2="10" y2="11.5" stroke="#fbbf24" stroke-width="1.8" stroke-linecap="round" />
              <circle cx="10" cy="14" r="0.9" fill="#fbbf24" />
            </svg>
            <div style="font-size: 12.5px; font-weight: 600; color: #fbbf24; line-height: 1.35;">
              {promptResetTarget.customsCount} custom mech{promptResetTarget.customsCount === 1 ? "" : "s"} at risk
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px;">
            <!-- Keep customs option (safer default, listed first) -->
            <button
              onclick={confirmResetKeepCustoms}
              style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                     border: 1px solid #272727; background: #141414;
                     cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: all 0.15s;"
            >
              <div
                style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                          flex-shrink: 0; background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.22);"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 3 L4 5 L4 11 C4 14 6 16 10 17 C14 16 16 14 16 11 L16 5 Z"
                    stroke="#4ade80"
                    stroke-width="1.5"
                    fill="rgba(74,222,128,0.1)"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M7 10 L9.5 12.5 L13 8"
                    stroke="#4ade80"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #4ade80;">Keep custom mechs</div>
                <div style="font-size: 10px; color: #a3a3a3; margin-top: 2px;">
                  Rebuild library mechs, your customs survive
                </div>
              </div>
            </button>

            <!-- Wipe all option -->
            <button
              onclick={confirmResetWipeAll}
              style="display: flex; align-items: center; gap: 11px; padding: 9px 10px; border-radius: 7px;
                     border: 1px solid #272727; background: #141414;
                     cursor: pointer; font-family: inherit; text-align: left; width: 100%; transition: all 0.15s;"
            >
              <div
                style="width: 34px; height: 34px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
                          flex-shrink: 0; background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.22);"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 6 L16 6" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" />
                  <path
                    d="M8 6 L8 4 L12 4 L12 6"
                    stroke="#f87171"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    fill="none"
                  />
                  <path
                    d="M5.5 6 L6 16 L14 16 L14.5 6"
                    stroke="#f87171"
                    stroke-width="1.5"
                    fill="rgba(248,113,113,0.1)"
                    stroke-linejoin="round"
                  />
                  <line
                    x1="9"
                    y1="9"
                    x2="9"
                    y2="13"
                    stroke="#f87171"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.6"
                  />
                  <line
                    x1="11"
                    y1="9"
                    x2="11"
                    y2="13"
                    stroke="#f87171"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.6"
                  />
                </svg>
              </div>
              <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 600; color: #f87171;">Wipe all</div>
                <div style="font-size: 10px; color: #a3a3a3; margin-top: 2px;">
                  Rebuild from library, custom mechs gone
                </div>
              </div>
            </button>
          </div>
        {/if}
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
            <div style={fieldLabel}>Raid Name<span style="color: #f87171; margin-left: 4px;">*</span></div>
            <input style={inp} bind:value={form.raid} placeholder="e.g. Serca" />
          </div>
          <div>
            <div style={fieldLabel}>Gate</div>
            <input
              type="text"
              style={inp}
              bind:value={gateInput}
              oninput={(e) => {
                const parsed = parseGateInput((e.target as HTMLInputElement).value);
                if (parsed != null) form.gate = parsed;
              }}
              placeholder="1 or 1.2"
              title="Single gates: 1, 2, 3. Split gates: type 1.2 or 1-2 for G1.2."
            />
          </div>
        </div>
        <div style="font-size: 11px; color: #737373; margin-top: -8px;">
          Type a number for single gates. For split gates, type <code>1.2</code> or
          <code>1-2</code> to mean G1.2.
          {#if form.gate >= 10}
            <span style="color: var(--color-accent-500); margin-left: 6px;">→ G{formatGate(form.gate)}</span>
          {/if}
        </div>
        <div>
          <div style={fieldLabel}>Boss Name<span style="color: #f87171; margin-left: 4px;">*</span></div>
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
