# Mech Announcer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new hamburger-menu pages — Mech Editor, Overlay Preview, and Mech Settings — to the existing Raid Mech Announcer Tauri app, matching the prototype in `Claude Design/Mech Announcer.html` pixel-for-pixel. Live boss HP data is sourced from a **running LOA Logs instance** via its PeerJS live-share broadcast — no packet capture required on our side.

**Architecture:** New routes live in `src/routes/(app)/mech-editor/`, `(app)/overlay-preview/`, and `(app)/mech-settings/`. Shared state (raids array + settings) lives in a single Svelte 5 rune-based store (`src/lib/mech-store.svelte.ts`) persisted to `localStorage`. All UI sub-components go in `src/lib/components/mech/`. Live data flows from LOA Logs → PeerJS → `mech-peer.svelte.ts` → `mechStore.liveBar` → Mech Editor + Overlay Preview. TTS uses the browser Web Speech API (`speechSynthesis`) which works natively in Tauri's WebView2.

**Live data flow:**
1. User runs LOA Logs with *Experimental Features* enabled and clicks the live-share button (screenshare icon in the live meter window)
2. LOA Logs creates a PeerJS host peer and copies `https://live.lostark.bible/{peerId}` to clipboard
3. User pastes that URL (or just the peer ID) into the Mech Announcer connect panel
4. Mech Announcer connects as a PeerJS **client** to that peer ID
5. LOA Logs' `LiveBossInfo.svelte` fires `broadcastLiveMessage({ type: "bossStatus", data: { name, currentBars, totalBars, isDead } })` on every boss HP tick
6. Mech Announcer receives these messages, updates `mechStore.liveBar`, auto-selects the matching gate via boss name lookup, and sets `mechStore.liveGateId`

**Tech Stack:** Svelte 5 runes, SvelteKit, TypeScript, Tailwind v4, Tauri v2. `peerjs` is already a project dependency (v1.5.4).

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `src/lib/mech-peer.svelte.ts` | PeerJS client — connect/disconnect, receive bossStatus, expose `liveBar` reactive state |
| `src/lib/components/mech/PeerConnect.svelte` | Connect panel UI — paste URL, connection status dot, disconnect button |
| `src/lib/mech-types.ts` | `Mechanic`, `Gate`, `MechSettings` interfaces + seed data |
| `src/lib/mech-constants.ts` | `SEVERITY`, `PHASE_COLORS`, `BOSS_HP_COLORS`, `formatTimer` |
| `src/lib/mech-store.svelte.ts` | Reactive `$state` store for raids + settings, localStorage persistence |
| `src/lib/components/mech/MechBadge.svelte` | Colored outlined badge (severity, phase, boss type) |
| `src/lib/components/mech/HPTimeline.svelte` | HP bar with mechanic ticks, phase lines, drain edge, simulate slider |
| `src/lib/components/mech/MechRow.svelte` | Single row in mechanics table (NEXT/PAST states, edit/delete) |
| `src/lib/components/mech/MechModal.svelte` | Add/Edit mechanic modal (full form) |
| `src/lib/components/mech/GateSidebar.svelte` | 220px left sidebar — raids tree, gate rows, LIVE badge, Add Raid button |
| `src/lib/components/mech/overlays/OLCombined.svelte` | ★ Combined overlay (boss HP bar + primary card + secondary rows) |
| `src/lib/components/mech/overlays/OLCompact.svelte` | Compact List overlay (3 upcoming mechs) |
| `src/lib/components/mech/overlays/OLHudStrip.svelte` | HUD Strip overlay (LOA boss-bar style) |
| `src/lib/components/mech/overlays/OLCardStack.svelte` | Card Stack overlay (primary card + slim rows) |
| `src/lib/components/mech/overlays/OLPill.svelte` | Minimal Pill overlay |
| `src/routes/(app)/mech-editor/+page.svelte` | Mech Editor full page (sidebar + boss header + timeline + table) |
| `src/routes/(app)/overlay-preview/+page.svelte` | Overlay Preview page (controls bar + simulated game bg + draggable overlay) |
| `src/routes/(app)/mech-settings/+page.svelte` | Mech Settings page (TTS, Discord, Overlay sections) |

### Modified files
| Path | What changes |
|---|---|
| `src/routes/(app)/Header.svelte` | Add 3 nav entries to hamburger drawer |
| `src/app.css` | Add `@keyframes mech-pulse` |
| `src/lib/mech-store.svelte.ts` | Add `liveBar`, `liveTotalBars`, `setBossStatus()` — called by peer module |
| `src/routes/(app)/mech-editor/+page.svelte` | Replace local `simBar` with `liveBar` when connected; show `PeerConnect` panel |
| `src/routes/(app)/overlay-preview/+page.svelte` | Replace `simBar` with `liveBar` when connected |

---

## Task 0: Live data — PeerJS connection to LOA Logs

**Files:**
- Create: `src/lib/mech-peer.svelte.ts`
- Create: `src/lib/components/mech/PeerConnect.svelte`

**How it works:** LOA Logs copies `https://live.lostark.bible/{peerId}` to clipboard when live sharing starts. We parse the peer ID from that URL, create a PeerJS client, and connect. We receive `{ type: "bossStatus", data: { name, currentBars, totalBars, isDead } }` on every boss HP tick and push it into the store.

- [ ] **Step 1: Create `src/lib/mech-peer.svelte.ts`**

```typescript
import { Peer, type DataConnection } from "peerjs";
import { mechStore } from "./mech-store.svelte";

export type PeerStatus = "disconnected" | "connecting" | "connected" | "error";

export const peerState = (() => {
  let status = $state<PeerStatus>("disconnected");
  let errorMsg = $state<string | null>(null);
  let peer: Peer | null = null;
  let conn: DataConnection | null = null;

  function parsePeerId(input: string): string {
    // Accept full URL: https://live.lostark.bible/{id}  OR  raw peer id
    const trimmed = input.trim();
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\//, "");
    } catch {
      return trimmed;
    }
  }

  async function connect(urlOrId: string): Promise<void> {
    const peerId = parsePeerId(urlOrId);
    if (!peerId) {
      errorMsg = "Invalid peer ID or URL";
      status = "error";
      return;
    }

    disconnect();
    status = "connecting";
    errorMsg = null;

    peer = new Peer();

    await new Promise<void>((resolve, reject) => {
      peer!.once("open", () => resolve());
      peer!.once("error", (e) => reject(e));
    }).catch((e) => {
      status = "error";
      errorMsg = String(e);
      peer?.destroy();
      peer = null;
      throw e;
    });

    conn = peer.connect(peerId, { reliable: true });

    conn.on("open", () => {
      status = "connected";
    });

    conn.on("data", (raw) => {
      const msg = raw as { type: string; data: BossStatusData | null };
      if (msg.type === "bossStatus") {
        mechStore.setBossStatus(msg.data);
      }
    });

    conn.on("close", () => {
      status = "disconnected";
      mechStore.setBossStatus(null);
    });

    conn.on("error", (e) => {
      status = "error";
      errorMsg = String(e);
      mechStore.setBossStatus(null);
    });

    peer.on("error", (e) => {
      status = "error";
      errorMsg = String(e);
      mechStore.setBossStatus(null);
    });
  }

  function disconnect() {
    conn?.close();
    peer?.destroy();
    conn = null;
    peer = null;
    status = "disconnected";
    errorMsg = null;
    mechStore.setBossStatus(null);
  }

  return {
    get status() { return status; },
    get errorMsg() { return errorMsg; },
    get isConnected() { return status === "connected"; },
    connect,
    disconnect,
  };
})();

export interface BossStatusData {
  name: string;
  isDead: boolean;
  currentHp: number;
  maxHp: number;
  currentShield: number;
  totalBars: number;
  currentBars: number;
}
```

- [ ] **Step 2: Add `setBossStatus` and live bar state to `src/lib/mech-store.svelte.ts`**

In the store's state block, add:

```typescript
  let liveBar = $state<number | null>(null);
  let liveTotalBars = $state<number | null>(null);
  let liveBossName = $state<string | null>(null);
```

Add to the returned object:

```typescript
    get liveBar() { return liveBar; },
    get liveTotalBars() { return liveTotalBars; },
    get liveBossName() { return liveBossName; },
    get isLive() { return liveBar !== null; },

    setBossStatus(data: { name: string; currentBars: number; totalBars: number; isDead: boolean } | null) {
      if (!data || data.isDead) {
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        liveGateId = null;
        return;
      }
      liveBar = data.currentBars;
      liveTotalBars = data.totalBars;
      liveBossName = data.name;
      // Auto-select gate by boss name match
      const matched = raids.find(r =>
        r.boss.toLowerCase().includes(data.name.toLowerCase()) ||
        data.name.toLowerCase().includes(r.boss.split(",")[0].toLowerCase())
      );
      if (matched) {
        selectedGateId = matched.id;
        liveGateId = matched.id;
      }
    },
```

- [ ] **Step 3: Create `src/lib/components/mech/PeerConnect.svelte`**

```svelte
<script lang="ts">
  import { peerState } from "$lib/mech-peer.svelte";
  import { mechStore } from "$lib/mech-store.svelte";

  let input = $state("");
  let pasting = $state(false);

  const statusColor = $derived(
    peerState.status === "connected" ? "#4ade80"
    : peerState.status === "connecting" ? "#fbbf24"
    : peerState.status === "error" ? "#f87171"
    : "#525252"
  );

  const statusLabel = $derived(
    peerState.status === "connected"
      ? `Live · ${mechStore.liveBossName ?? "connected"}`
      : peerState.status === "connecting" ? "Connecting…"
      : peerState.status === "error" ? (peerState.errorMsg ?? "Error")
      : "Not connected"
  );

  async function pasteFromClipboard() {
    try {
      pasting = true;
      const text = await navigator.clipboard.readText();
      input = text.trim();
    } catch {
      // clipboard access denied — user must paste manually
    } finally {
      pasting = false;
    }
  }

  function handleConnect() {
    if (input.trim()) peerState.connect(input.trim());
  }
</script>

<div style="border-top: 1px solid #262626; padding: 10px 14px; flex-shrink: 0;">
  <!-- Status row -->
  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
    <div style="width: 7px; height: 7px; border-radius: 50%; background: {statusColor}; box-shadow: 0 0 6px {statusColor}; {peerState.status === 'connected' ? 'animation: mech-pulse 2s ease-in-out infinite;' : ''}" />
    <span style="font-size: 10.5px; color: {peerState.status === 'error' ? '#f87171' : '#a3a3a3'}; font-weight: {peerState.status === 'connected' ? 600 : 400}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;">{statusLabel}</span>
    {#if peerState.isConnected}
      <button
        onclick={() => peerState.disconnect()}
        style="font-size: 10px; color: #525252; background: transparent; border: none; cursor: pointer; padding: 2px 4px; border-radius: 3px;"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.color = '#f87171'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.color = '#525252'}
      >✕ disconnect</button>
    {/if}
  </div>

  {#if !peerState.isConnected}
    <!-- Input + buttons -->
    <div style="display: flex; gap: 4px;">
      <input
        bind:value={input}
        placeholder="Paste LOA Logs share URL…"
        onkeydown={(e) => e.key === "Enter" && handleConnect()}
        style="flex: 1; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 5px 8px; color: #fafafa; font-size: 11px; outline: none; min-width: 0;"
      />
      <button
        onclick={pasteFromClipboard}
        title="Paste from clipboard"
        style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 5px 8px; color: #a3a3a3; cursor: pointer; font-size: 11px; white-space: nowrap;"
      >{pasting ? "…" : "📋"}</button>
      <button
        onclick={handleConnect}
        disabled={!input.trim() || peerState.status === "connecting"}
        style="background: {input.trim() ? 'rgba(56,189,248,0.1)' : '#1a1a1a'}; border: 1px solid {input.trim() ? 'rgba(56,189,248,0.3)' : '#262626'}; border-radius: 4px; padding: 5px 10px; color: {input.trim() ? '#38bdf8' : '#525252'}; cursor: {input.trim() ? 'pointer' : 'not-allowed'}; font-size: 11px; font-weight: 600; white-space: nowrap;"
      >{peerState.status === "connecting" ? "…" : "Connect"}</button>
    </div>
    <div style="font-size: 9.5px; color: #525252; margin-top: 5px; line-height: 1.4;">
      In LOA Logs: enable Experimental Features → click screenshare icon → paste the copied URL here
    </div>
  {/if}
</div>
```

- [ ] **Step 4: Add `PeerConnect` to `GateSidebar.svelte`**

In `src/lib/components/mech/GateSidebar.svelte`, add the import and render it at the bottom of the sidebar div, replacing the existing "+ Add Raid" button section:

```svelte
<script lang="ts">
  import PeerConnect from "./PeerConnect.svelte";
  // ... existing imports
</script>

<!-- at the bottom of the outer div, after the "+ Add Raid" button: -->
<PeerConnect />
```

- [ ] **Step 5: Use `liveBar` in Mech Editor when connected**

In `src/routes/(app)/mech-editor/+page.svelte`, replace the sim slider binding so live data takes priority:

```svelte
  // Replace:
  let simBar = $state(simBarMax);
  $effect(() => { simBar = gate?.totalBars ?? 300; });

  // With:
  let _manualBar = $state(simBarMax);
  $effect(() => { _manualBar = gate?.totalBars ?? 300; });

  const simBar = $derived(mechStore.liveBar ?? _manualBar);
  const isLive = $derived(mechStore.isLive);
```

And update the slider to be read-only when live:

```svelte
        <input
          type="range" min={0} max={gate.totalBars}
          value={simBar}
          oninput={(e) => { if (!isLive) _manualBar = Number((e.target as HTMLInputElement).value); }}
          style="flex: 1; accent-color: #38bdf8; height: 4px; {isLive ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
        />
        <span style="color: {isLive ? '#4ade80' : '#38bdf8'}; min-width: 70px; text-align: right;">
          {simBar}× / {gate.totalBars}× {#if isLive}<span style="font-size: 9px; color: #4ade80;">LIVE</span>{/if}
        </span>
```

- [ ] **Step 6: Use `liveBar` in Overlay Preview when connected**

In `src/routes/(app)/overlay-preview/+page.svelte`, replace the `simBar` state with a live-aware derived:

```svelte
  let _simBar = $state(gate?.totalBars ?? 300);
  const simBar = $derived(mechStore.liveBar ?? _simBar);
  const isLive = $derived(mechStore.isLive);
```

And gate the PLAY button / slider when live:

```svelte
      <!-- Disable slider and play controls when live data active -->
      <input type="range" ... oninput={(e) => { if (!isLive) { playing = false; _simBar = parseInt(...); } }} style="... {isLive ? 'opacity:0.4; cursor:not-allowed;' : ''}" />
      {#if isLive}
        <span style="font-size: 11px; color: #4ade80; font-weight: 700; font-family: ui-monospace, monospace;">● LIVE</span>
      {:else}
        <button onclick={togglePlay}>...</button>
      {/if}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/mech-peer.svelte.ts src/lib/components/mech/PeerConnect.svelte
git commit -m "feat: PeerJS live connection to LOA Logs — receive boss HP in real time"
```

---

## Task 1: Types, constants, and CSS animation

**Files:**
- Create: `src/lib/mech-types.ts`
- Create: `src/lib/mech-constants.ts`
- Modify: `src/app.css`

- [ ] **Step 1: Create `src/lib/mech-types.ts`**

```typescript
export type Severity = "normal" | "major" | "wipe";
export type TriggerType = "hp" | "timer" | "hp+timer";
export type Phase = 1 | 2 | 3 | 4 | null;

export interface Mechanic {
  id: string;
  name: string;
  severity: Severity;
  hpBar: number | null;
  timerSecs: number | null;
  phase: Phase;
  repeatSecs: number | null;
  triggerType: TriggerType;
  ttsEnabled: boolean;
  ttsText: string;
  notes: string;
}

export interface Gate {
  id: string;
  raid: string;
  gate: number;
  boss: string;
  bossType: string;
  weakness: string;
  tauntable: boolean;
  totalBars: number;
  mechanics: Mechanic[];
}

export interface MechSettings {
  lead: number;
  vol: number;
  pitch: number;
  hook: string;
  opacity: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
}
```

- [ ] **Step 2: Create `src/lib/mech-constants.ts`**

```typescript
import type { Gate } from "./mech-types";

export const SEVERITY = {
  normal: { label: "Normal", color: "#38bdf8", dim: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.4)" },
  major:  { label: "Major",  color: "#fb923c", dim: "rgba(251,146,60,0.12)",  border: "rgba(251,146,60,0.4)"  },
  wipe:   { label: "Wipe",   color: "#f87171", dim: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.5)" },
} as const;

export const PHASE_COLORS: Record<number, string> = {
  1: "#38bdf8",
  2: "#fb923c",
  3: "#f87171",
  4: "#a78bfa",
};

export const BOSS_HP_COLORS = [
  "#D16F23", "#9F3930", "#582469", "#2B3A63", "#246977", "#798816", "#E7B826",
];

export function formatTimer(secs: number | null): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  return `${m}:${String(secs % 60).padStart(2, "0")}`;
}

export const SAMPLE_RAIDS: Gate[] = [
  {
    id: "serca-g1", raid: "Serca", gate: 1, boss: "Witch of Agony, Serca",
    bossType: "HUMAN", weakness: "No Weakness", tauntable: false, totalBars: 300,
    mechanics: [
      { id: "sg1-m1", name: "Saws & Spikes", hpBar: 270, timerSecs: null, phase: 1, triggerType: "hp", repeatSecs: 60, severity: "major", ttsEnabled: true, ttsText: "Saws and Spikes", notes: "Spikes appear every ~1min. Smaller arena remains. From top: 2 spikes, back 1, left 2." },
      { id: "sg1-m2", name: "Nail Just Guard", hpBar: 240, timerSecs: null, phase: 1, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Nail Just Guard", notes: "Boss moves middle. Move with tiles. After 1st JG boss goes right." },
      { id: "sg1-m3", name: "Moral Walls", hpBar: 195, timerSecs: null, phase: 1, triggerType: "hp", repeatSecs: null, severity: "normal", ttsEnabled: false, ttsText: "", notes: "Dodge spikes 5 wall rows. Goes to Crossover." },
      { id: "sg1-m4", name: "Bomberman", hpBar: 175, timerSecs: null, phase: 2, triggerType: "hp", repeatSecs: 70, severity: "major", ttsEnabled: true, ttsText: "Bomberman", notes: "P2 starts. Every ~70s. Move/explode to x shape on edge." },
      { id: "sg1-m5", name: "Survival Run", hpBar: 105, timerSecs: null, phase: 2, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Survival Run", notes: "Award special 3 items by surviving 8 actions." },
      { id: "sg1-m6", name: "Flame Maiden", hpBar: 90, timerSecs: null, phase: 3, triggerType: "hp", repeatSecs: 60, severity: "wipe", ttsEnabled: true, ttsText: "Flame Maiden Counter", notes: "P3. Counter every ~1min. Smaller arena. WIPE if missed." },
    ],
  },
  {
    id: "serca-g2", raid: "Serca", gate: 2, boss: "Corvus Tul Rak",
    bossType: "ANCIENT", weakness: "Weak to Light", tauntable: false, totalBars: 300,
    mechanics: [
      { id: "sg2-m1", name: "Wing Prediction", hpBar: 285, timerSecs: null, phase: null, triggerType: "hp+timer", repeatSecs: 80, severity: "major", ttsEnabled: true, ttsText: "Wing Prediction", notes: "Prediction pattern into whirlpool. Repeats every 80s." },
      { id: "sg2-m2", name: "Veiled Stagger", hpBar: 240, timerSecs: null, phase: null, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Veiled Stagger", notes: "Find real boss, Just Guard, stagger and dodge." },
      { id: "sg2-m3", name: "Guard Drain", hpBar: 195, timerSecs: null, phase: null, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Guard Drain", notes: "Multiple Just Guards and Counter — each JG deals stagger." },
      { id: "sg2-m4", name: "Find Corvuth", hpBar: 120, timerSecs: null, phase: null, triggerType: "hp", repeatSecs: null, severity: "normal", ttsEnabled: false, ttsText: "", notes: "Check clones, deal damage, avoid puddles." },
      { id: "sg2-m5", name: "Stagger Helping Pattern", hpBar: null, timerSecs: 510, phase: null, triggerType: "timer", repeatSecs: null, severity: "normal", ttsEnabled: true, ttsText: "Stagger Helping Pattern", notes: "At 8:30 — always comes out at this time." },
      { id: "sg2-m6", name: "Pizza Prediction", hpBar: 60, timerSecs: null, phase: null, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Pizza Prediction", notes: "Prediction pattern into spinning pizza slices." },
    ],
  },
];
```

- [ ] **Step 3: Add `mech-pulse` keyframe to `src/app.css`**

Open `src/app.css` and append at the end of the file:

```css
@keyframes mech-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.4); }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/mech-types.ts src/lib/mech-constants.ts src/app.css
git commit -m "feat: mech announcer types, constants, and pulse animation"
```

---

## Task 2: Reactive store with localStorage persistence

**Files:**
- Create: `src/lib/mech-store.svelte.ts`

- [ ] **Step 1: Create `src/lib/mech-store.svelte.ts`**

```typescript
import { SAMPLE_RAIDS } from "./mech-constants";
import type { Gate, MechSettings } from "./mech-types";

const RAIDS_KEY = "mech-announcer-raids";
const SETTINGS_KEY = "mech-announcer-settings";

function loadRaids(): Gate[] {
  try {
    const raw = localStorage.getItem(RAIDS_KEY);
    return raw ? JSON.parse(raw) : SAMPLE_RAIDS;
  } catch {
    return SAMPLE_RAIDS;
  }
}

function loadSettings(): MechSettings {
  const defaults: MechSettings = { lead: 10, vol: 80, pitch: 1, hook: "", opacity: 90, alwaysOnTop: true, clickThrough: true };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

export const mechStore = (() => {
  let raids = $state<Gate[]>(loadRaids());
  let selectedGateId = $state<string>(loadRaids()[0]?.id ?? "");
  let liveGateId = $state<string | null>(null);
  let mechSettings = $state<MechSettings>(loadSettings());

  function saveRaids() {
    localStorage.setItem(RAIDS_KEY, JSON.stringify(raids));
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(mechSettings));
  }

  return {
    get raids() { return raids; },
    get selectedGateId() { return selectedGateId; },
    get liveGateId() { return liveGateId; },
    get mechSettings() { return mechSettings; },

    get selectedGate() {
      return raids.find(r => r.id === selectedGateId) ?? raids[0] ?? null;
    },

    selectGate(id: string) {
      selectedGateId = id;
    },

    setLiveGate(id: string | null) {
      liveGateId = id;
    },

    upsertMechanic(gateId: string, mech: Gate["mechanics"][number]) {
      raids = raids.map(r => {
        if (r.id !== gateId) return r;
        const exists = r.mechanics.some(m => m.id === mech.id);
        return { ...r, mechanics: exists ? r.mechanics.map(m => m.id === mech.id ? mech : m) : [...r.mechanics, mech] };
      });
      saveRaids();
    },

    deleteMechanic(gateId: string, mechId: string) {
      raids = raids.map(r =>
        r.id !== gateId ? r : { ...r, mechanics: r.mechanics.filter(m => m.id !== mechId) }
      );
      saveRaids();
    },

    addRaid(gate: Gate) {
      raids = [...raids, gate];
      saveRaids();
    },

    updateSetting<K extends keyof MechSettings>(key: K, value: MechSettings[K]) {
      mechSettings = { ...mechSettings, [key]: value };
      saveSettings();
    },
  };
})();
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/mech-store.svelte.ts
git commit -m "feat: mech announcer reactive store with localStorage"
```

---

## Task 3: MechBadge and HPTimeline components

**Files:**
- Create: `src/lib/components/mech/MechBadge.svelte`
- Create: `src/lib/components/mech/HPTimeline.svelte`

- [ ] **Step 1: Create `src/lib/components/mech/MechBadge.svelte`**

```svelte
<script lang="ts">
  interface Props {
    label: string;
    color: string;
    bg?: string;
    border?: string;
    small?: boolean;
  }
  let { label, color, bg = "transparent", border, small = false }: Props = $props();
  const bdr = border ?? color;
</script>

<span
  class="inline-flex items-center whitespace-nowrap font-semibold uppercase tracking-wide"
  style="
    padding: {small ? '1px 6px' : '2px 8px'};
    border-radius: 3px;
    background: {bg};
    border: 1px solid {bdr};
    color: {color};
    font-size: {small ? 9.5 : 10.5}px;
    line-height: 1.4;
    letter-spacing: 0.05em;
  "
>{label}</span>
```

- [ ] **Step 2: Create `src/lib/components/mech/HPTimeline.svelte`**

```svelte
<script lang="ts">
  import { PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import type { Mechanic } from "$lib/mech-types";

  interface Props {
    mechanics: Mechanic[];
    totalBars: number;
    currentBar: number;
  }
  let { mechanics, totalBars, currentBar }: Props = $props();

  const hpMechs = $derived(
    mechanics.filter(m => m.hpBar != null).sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0))
  );
  const drainPct = $derived((currentBar / totalBars) * 100);

  const phaseBoundaries = $derived(() => {
    const phases: Record<number, number> = {};
    [...mechanics]
      .filter(m => m.hpBar != null && m.phase != null)
      .sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0))
      .forEach(m => { if (m.phase != null && !phases[m.phase]) phases[m.phase] = m.hpBar!; });
    return Object.entries(phases)
      .filter(([p]) => parseInt(p) > 1)
      .map(([p, bar]) => ({ phase: parseInt(p), bar }));
  });
</script>

<div class="relative" style="height: 44px; padding: 10px 0 14px;">
  <!-- Rail -->
  <div class="absolute left-0 right-0" style="top: 18px; height: 8px; background: #0c0c0c; border-radius: 3px; overflow: hidden; border: 1px solid #262626;">
    <!-- Filled (right = full HP, left = empty) -->
    <div style="position: absolute; left: 0; top: 0; bottom: 0; width: {drainPct}%; background: linear-gradient(90deg, #f87171 0%, #facc15 55%, #4ade80 100%); transition: width 0.3s;" />
    <!-- Drained hatched region -->
    {#if drainPct < 100}
      <div style="position: absolute; right: 0; top: 0; bottom: 0; width: {100 - drainPct}%; background: repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0 4px, rgba(255,255,255,0.05) 4px 8px); border-left: 1px dashed rgba(255,255,255,0.18);" />
    {/if}
  </div>

  <!-- Mechanic tick marks -->
  {#each hpMechs as m (m.id)}
    {@const pct = ((m.hpBar ?? 0) / totalBars) * 100}
    {@const sev = SEVERITY[m.severity]}
    {@const drained = (m.hpBar ?? 0) > currentBar}
    <div style="position: absolute; left: {pct}%; top: 10px; transform: translateX(-50%); pointer-events: none;">
      <div style="width: 2px; height: 24px; background: {sev.color}; border-radius: 1px; opacity: {drained ? 0.28 : 1}; box-shadow: {!drained ? `0 0 5px ${sev.color}` : 'none'};" />
      <div style="font-size: 9px; font-family: ui-monospace, monospace; color: {drained ? '#525252' : sev.color}; opacity: {drained ? 0.55 : 1}; margin-top: 2px; transform: translateX(-50%); position: relative; left: 1px; font-weight: 700; white-space: nowrap;">{m.hpBar}</div>
    </div>
  {/each}

  <!-- Phase boundary lines -->
  {#each phaseBoundaries() as { phase, bar }}
    {@const pct = (bar / totalBars) * 100}
    {@const pc = PHASE_COLORS[phase]}
    {@const drained = bar > currentBar}
    <div style="position: absolute; left: {pct}%; top: 15px; pointer-events: none;">
      <div style="width: 1px; height: 14px; background: {pc}; opacity: {drained ? 0.25 : 0.7}; box-shadow: {drained ? 'none' : `0 0 4px ${pc}`};" />
      <div style="font-size: 8px; font-family: ui-monospace, monospace; color: {pc}; opacity: {drained ? 0.4 : 0.9}; font-weight: 800; transform: translateX(-50%); white-space: nowrap; margin-top: 1px;">P{phase}</div>
    </div>
  {/each}

  <!-- Drain edge pointer -->
  <div style="position: absolute; left: {drainPct}%; top: 8px; width: 2px; height: 20px; background: #38bdf8; box-shadow: 0 0 8px #38bdf8;" />

  <!-- Axis labels -->
  <span style="position: absolute; left: 2px; bottom: 0; font-size: 9px; color: #525252; font-family: ui-monospace, monospace; font-weight: 600;">{totalBars}× <span style="opacity: 0.5;">MAX</span></span>
  <span style="position: absolute; right: 2px; bottom: 0; font-size: 9px; color: #525252; font-family: ui-monospace, monospace; font-weight: 600;"><span style="opacity: 0.5;">DEAD</span> 0×</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/mech/
git commit -m "feat: MechBadge and HPTimeline components"
```

---

## Task 4: MechRow and MechModal components

**Files:**
- Create: `src/lib/components/mech/MechRow.svelte`
- Create: `src/lib/components/mech/MechModal.svelte`

- [ ] **Step 1: Create `src/lib/components/mech/MechRow.svelte`**

```svelte
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
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
  style="
    display: grid;
    grid-template-columns: 78px 32px 1fr 110px 86px 78px;
    padding: 8px 14px;
    border-bottom: 1px solid #262626;
    background: {isNext ? 'rgba(56,189,248,0.06)' : hovered ? '#202020' : 'transparent'};
    border-left: {isNext ? '2px solid #38bdf8' : '2px solid transparent'};
    opacity: {isPast ? 0.4 : 1};
    align-items: center;
    transition: background 0.15s;
  "
>
  <!-- HP / Timer -->
  <div style="font-family: ui-monospace, monospace; font-size: 14px; font-weight: 700; color: {isNext ? '#38bdf8' : '#fafafa'};">
    {#if mech.hpBar != null}
      {mech.hpBar}<span style="font-size: 9px; color: #525252; font-weight: 400; margin-left: 2px;">×</span>
    {:else}
      <span style="font-size: 12px; color: #fbbf24;">⏱ {formatTimer(mech.timerSecs)}</span>
    {/if}
  </div>

  <!-- Phase dot -->
  <div>
    {#if phaseColor}
      <div style="width: 19px; height: 19px; border-radius: 3px; background: {phaseColor}20; border: 1px solid {phaseColor}60; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: {phaseColor}; font-family: ui-monospace, monospace;">P{mech.phase}</div>
    {/if}
  </div>

  <!-- Name + notes -->
  <div style="padding-right: 12px; min-width: 0;">
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
      <span style="font-weight: 600; font-size: 13px; color: {isNext ? '#38bdf8' : '#fafafa'};">{mech.name}</span>
      {#if isNext}
        <span style="font-size: 9px; color: #38bdf8; font-weight: 700; letter-spacing: 0.06em;">▶ NEXT</span>
      {/if}
    </div>
    {#if mech.notes}
      <div style="font-size: 11px; color: #a3a3a3; line-height: 1.4; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">{mech.notes}</div>
    {/if}
  </div>

  <!-- Severity badge -->
  <div><MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small /></div>

  <!-- Repeat + TTS -->
  <div style="font-size: 11px; color: #a3a3a3; display: flex; gap: 6px; align-items: center; font-family: ui-monospace, monospace;">
    {#if mech.repeatSecs}
      <span style="color: #a78bfa;">↻{formatTimer(mech.repeatSecs)}</span>
    {/if}
    {#if mech.ttsEnabled}
      <span title="TTS enabled" style="color: #38bdf8;">🔊</span>
    {/if}
  </div>

  <!-- Actions -->
  <div style="display: flex; justify-content: flex-end;">
    <button
      onclick={() => onEdit(mech)}
      title="Edit"
      class="px-1.5 py-1 rounded text-xs text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
    >✎</button>
    <button
      onclick={() => onDelete(mech.id)}
      title="Delete"
      class="px-1.5 py-1 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
    >✕</button>
  </div>
</div>
```

- [ ] **Step 2: Create `src/lib/components/mech/MechModal.svelte`**

```svelte
<script lang="ts">
  import { formatTimer, SEVERITY } from "$lib/mech-constants";
  import type { Mechanic, Phase, Severity, TriggerType } from "$lib/mech-types";

  interface Props {
    mech: Mechanic | null;
    totalBars: number;
    onSave: (m: Mechanic) => void;
    onClose: () => void;
  }
  let { mech, totalBars, onSave, onClose }: Props = $props();

  const isEdit = $derived(mech != null && !!mech.id);

  let form = $state<{
    name: string; severity: Severity; triggerType: TriggerType;
    hpBar: string; phase: string; repeatSecs: string; timerSecs: string;
    ttsEnabled: boolean; ttsText: string; notes: string;
  }>(mech ? {
    name: mech.name, severity: mech.severity, triggerType: mech.triggerType,
    hpBar: mech.hpBar != null ? String(mech.hpBar) : "",
    phase: mech.phase != null ? String(mech.phase) : "",
    repeatSecs: mech.repeatSecs != null ? String(mech.repeatSecs) : "",
    timerSecs: mech.timerSecs != null ? String(mech.timerSecs) : "",
    ttsEnabled: mech.ttsEnabled, ttsText: mech.ttsText, notes: mech.notes,
  } : {
    name: "", severity: "major", triggerType: "hp",
    hpBar: "", phase: "", repeatSecs: "", timerSecs: "",
    ttsEnabled: true, ttsText: "", notes: "",
  });

  function save() {
    if (!form.name.trim()) return;
    onSave({
      ...mech,
      id: mech?.id || `m-${Date.now()}`,
      name: form.name.trim(),
      severity: form.severity,
      triggerType: form.triggerType,
      hpBar: form.hpBar !== "" ? parseInt(form.hpBar) : null,
      phase: form.phase !== "" ? (parseInt(form.phase) as Phase) : null,
      repeatSecs: form.repeatSecs !== "" ? parseInt(form.repeatSecs) : null,
      timerSecs: form.timerSecs !== "" ? parseInt(form.timerSecs) : null,
      ttsEnabled: form.ttsEnabled,
      ttsText: form.ttsText,
      notes: form.notes,
    });
  }

  const inp = "width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
  const sel = "width: 100%; background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 10px; color: #fafafa; font-size: 13px; outline: none; font-family: inherit;";
</script>

<!-- Backdrop -->
<div
  onclick={(e) => e.target === e.currentTarget && onClose()}
  class="fixed inset-0 z-50 flex items-center justify-center"
  style="background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
>
  <div style="background: #171717; border: 1px solid #404040; border-radius: 8px; width: 470px; max-height: 90vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.7);">
    <!-- Header -->
    <div style="padding: 14px 18px; border-bottom: 1px solid #262626; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; font-size: 14px;">{isEdit ? 'Edit Mechanic' : 'Add Mechanic'}</span>
      <button onclick={onClose} class="px-2 py-1 rounded text-sm text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors">✕</button>
    </div>

    <!-- Body -->
    <div style="padding: 18px;">
      <!-- Name -->
      <div style="margin-bottom: 14px;">
        <div class="modal-label">Mechanic Name</div>
        <input style={inp} bind:value={form.name} placeholder="e.g. Saws & Spikes" />
      </div>

      <!-- Severity + Trigger -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
        <div>
          <div class="modal-label">Severity</div>
          <select style={sel} bind:value={form.severity}>
            <option value="normal">Normal</option>
            <option value="major">Major</option>
            <option value="wipe">Wipe Mech</option>
          </select>
        </div>
        <div>
          <div class="modal-label">Trigger</div>
          <select style={sel} bind:value={form.triggerType}>
            <option value="hp">HP Bar</option>
            <option value="timer">Timer (from pull)</option>
            <option value="hp+timer">HP + Repeating</option>
          </select>
        </div>
      </div>

      <!-- HP bar + Phase (hp / hp+timer) -->
      {#if form.triggerType === "hp" || form.triggerType === "hp+timer"}
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div>
            <div class="modal-label">HP Bar Threshold</div>
            <input type="number" style={inp} bind:value={form.hpBar} placeholder="/{totalBars}" />
          </div>
          <div>
            <div class="modal-label">Phase</div>
            <select style={sel} bind:value={form.phase}>
              <option value="">No Phase</option>
              <option value="1">Phase 1</option>
              <option value="2">Phase 2</option>
              <option value="3">Phase 3</option>
              <option value="4">Phase 4</option>
            </select>
          </div>
        </div>
      {/if}

      <!-- Timer -->
      {#if form.triggerType === "timer"}
        <div style="margin-bottom: 14px;">
          <div class="modal-label">Timer (seconds from pull)</div>
          <input type="number" style={inp} bind:value={form.timerSecs} placeholder="e.g. 510 for 8:30" />
          {#if form.timerSecs}
            <div style="font-size: 10px; color: #525252; margin-top: 3px; font-family: ui-monospace, monospace;">= {formatTimer(parseInt(form.timerSecs))} from pull</div>
          {/if}
        </div>
      {/if}

      <!-- Repeat interval (hp+timer) -->
      {#if form.triggerType === "hp+timer"}
        <div style="margin-bottom: 14px;">
          <div class="modal-label">Repeat Interval (seconds)</div>
          <input type="number" style={inp} bind:value={form.repeatSecs} placeholder="e.g. 60" />
          {#if form.repeatSecs}
            <div style="font-size: 10px; color: #525252; margin-top: 3px; font-family: ui-monospace, monospace;">Repeats every {formatTimer(parseInt(form.repeatSecs))} after first trigger</div>
          {/if}
        </div>
      {/if}

      <!-- TTS section -->
      <div style="background: #0f0f0f; border: 1px solid #262626; border-radius: 5px; padding: 12px 14px; margin-bottom: 14px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa; margin-bottom: {form.ttsEnabled ? 10 : 0}px;">
          <input type="checkbox" bind:checked={form.ttsEnabled} style="accent-color: #38bdf8; width: 13px; height: 13px;" />
          Text-to-Speech announcement
        </label>
        {#if form.ttsEnabled}
          <div class="modal-label">TTS Text</div>
          <input style={inp} bind:value={form.ttsText} placeholder={form.name || "Announcement..."} />
        {/if}
      </div>

      <!-- Notes -->
      <div>
        <div class="modal-label">Notes</div>
        <textarea bind:value={form.notes} placeholder="Strategy notes..." style="{inp} min-height: 66px; resize: vertical; line-height: 1.5; font-size: 12px;"></textarea>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 12px 18px; border-top: 1px solid #262626; display: flex; justify-content: flex-end; gap: 8px;">
      <button onclick={onClose} style="background: #262626; border: 1px solid #262626; border-radius: 4px; padding: 7px 14px; color: #a3a3a3; cursor: pointer; font-size: 12.5px;">Cancel</button>
      <button onclick={save} disabled={!form.name.trim()}
        style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 7px 14px; color: #38bdf8; cursor: {form.name.trim() ? 'pointer' : 'not-allowed'}; font-size: 12.5px; font-weight: 600; opacity: {form.name.trim() ? 1 : 0.5};"
      >{isEdit ? 'Save' : 'Add'}</button>
    </div>
  </div>
</div>

<style>
  .modal-label {
    font-size: 10px;
    color: #a3a3a3;
    margin-bottom: 5px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/mech/MechRow.svelte src/lib/components/mech/MechModal.svelte
git commit -m "feat: MechRow and MechModal components"
```

---

## Task 5: GateSidebar component

**Files:**
- Create: `src/lib/components/mech/GateSidebar.svelte`

- [ ] **Step 1: Create `src/lib/components/mech/GateSidebar.svelte`**

```svelte
<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import type { Gate } from "$lib/mech-types";

  const raidNames = $derived(Array.from(new Set(mechStore.raids.map(r => r.raid))));
</script>

<div class="flex flex-col overflow-y-auto flex-shrink-0" style="width: 220px; background: #0f0f0f; border-right: 1px solid #262626;">
  <div style="padding: 10px 14px; border-bottom: 1px solid #262626; font-size: 10px; color: #a3a3a3; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">
    Raids & Gates
  </div>

  {#each raidNames as raidName (raidName)}
    <div>
      <div style="padding: 10px 14px 4px; font-size: 10px; color: #525252; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;">{raidName}</div>
      {#each mechStore.raids.filter(r => r.raid === raidName) as gate (gate.id)}
        {@const sel = gate.id === mechStore.selectedGateId}
        {@const isLive = gate.id === mechStore.liveGateId}
        <button
          onclick={() => mechStore.selectGate(gate.id)}
          style="
            width: 100%;
            text-align: left;
            padding: 8px 14px 8px 20px;
            cursor: pointer;
            background: {sel ? 'rgba(56,189,248,0.1)' : isLive ? 'rgba(74,222,128,0.05)' : 'transparent'};
            border-left: {sel ? '2px solid #38bdf8' : isLive ? '2px solid rgba(74,222,128,0.4)' : '2px solid transparent'};
            color: {sel ? '#38bdf8' : '#a3a3a3'};
            font-size: 12.5px;
            font-weight: {sel ? 600 : 400};
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: none; border-right: none; border-bottom: none;
            transition: background 0.15s, color 0.15s;
          "
          onmouseenter={(e) => { if (!sel) { (e.currentTarget as HTMLElement).style.background = '#202020'; (e.currentTarget as HTMLElement).style.color = '#fafafa'; } }}
          onmouseleave={(e) => { if (!sel) { (e.currentTarget as HTMLElement).style.background = isLive ? 'rgba(74,222,128,0.05)' : 'transparent'; (e.currentTarget as HTMLElement).style.color = '#a3a3a3'; } }}
        >
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>Gate {gate.gate}</span>
            {#if isLive}
              <span style="font-size: 8px; font-weight: 800; color: #4ade80; background: rgba(74,222,128,0.15); border: 1px solid rgba(74,222,128,0.4); border-radius: 3px; padding: 1px 5px; letter-spacing: 0.08em; animation: mech-pulse 2s ease-in-out infinite;">LIVE</span>
            {/if}
          </div>
          <span style="font-size: 10px; color: #525252; font-family: ui-monospace, monospace;">{gate.mechanics.length}</span>
        </button>
      {/each}
    </div>
  {/each}

  <div style="padding: 10px 14px; margin-top: auto; border-top: 1px solid #262626;">
    <button class="w-full text-neutral-600 hover:text-neutral-400 transition-colors" style="background: transparent; border: 1px dashed #262626; border-radius: 4px; padding: 7px; cursor: pointer; font-size: 11.5px;">
      + Add Raid
    </button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/mech/GateSidebar.svelte
git commit -m "feat: GateSidebar component with LIVE badge"
```

---

## Task 6: Five overlay variant components

**Files:**
- Create: `src/lib/components/mech/overlays/OLCombined.svelte`
- Create: `src/lib/components/mech/overlays/OLCompact.svelte`
- Create: `src/lib/components/mech/overlays/OLHudStrip.svelte`
- Create: `src/lib/components/mech/overlays/OLCardStack.svelte`
- Create: `src/lib/components/mech/overlays/OLPill.svelte`

- [ ] **Step 1: Create shared helper file `src/lib/components/mech/overlays/_shared.ts`**

```typescript
import { BOSS_HP_COLORS, SEVERITY } from "$lib/mech-constants";
import type { Mechanic } from "$lib/mech-types";

export function upcomingFrom(mechs: Mechanic[], currentBar: number): Mechanic[] {
  return [...mechs]
    .filter(m => m.hpBar != null && m.hpBar <= currentBar)
    .sort((a, b) => (b.hpBar ?? 0) - (a.hpBar ?? 0));
}

export function hpBarColor(currentBar: number, totalBars: number): string {
  const idx = Math.max(0, Math.ceil((currentBar / totalBars) * BOSS_HP_COLORS.length) - 1);
  return BOSS_HP_COLORS[idx % BOSS_HP_COLORS.length];
}

export interface OverlayProps {
  mechanics: Mechanic[];
  currentBar: number;
  totalBars: number;
  gateName: string;
  bossName?: string;
}
```

- [ ] **Step 2: Create `src/lib/components/mech/overlays/OLCombined.svelte`**

```svelte
<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars, gateName, bossName = "" }: OverlayProps = $props();

  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 4));
  const next = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const pct = $derived((currentBar / totalBars) * 100);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const progress = $derived(next ? Math.min(1, Math.max(0, 1 - barsAway / 30)) : 0);

  // Repeat cycle
  const repeatState = $derived(() => {
    if (!next?.repeatSecs || barsAway > 0) return null;
    const rb = next.repeatSecs;
    const barsSinceFire = (next.hpBar ?? 0) - currentBar;
    const cycle = Math.floor(barsSinceFire / rb);
    const nextRepeatBar = (next.hpBar ?? 0) - (cycle + 1) * rb;
    const repeatBarsLeft = currentBar - nextRepeatBar;
    const repeatProgress = 1 - repeatBarsLeft / rb;
    const urgent = repeatBarsLeft <= 10;
    return { nextRepeatBar, repeatBarsLeft, repeatProgress, urgent };
  });

  const rs = $derived(repeatState());
  const showRepeat = $derived(rs != null && rs.nextRepeatBar > 0);
  const displayBars = $derived(showRepeat ? rs!.repeatBarsLeft : barsAway);
  const displayLabel = $derived(showRepeat ? "until repeat" : barsAway === 0 ? "incoming" : "bars away");
  const barFill = $derived(showRepeat ? rs!.repeatProgress : progress);
</script>

<div style="display: flex; flex-direction: column; gap: 4px; width: 400px; font-family: Inter, sans-serif;">
  <!-- Boss HP bar -->
  <div style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.7);">
    <div style="position: relative; height: 26px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(0,0,0,0.5);">
      <div style="position: absolute; inset: 0; background: {barColor}; opacity: 0.78; width: {pct}%; transition: width 0.3s, background 0.3s;" />
      <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11.5px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">
        <span>{bossName}</span>
        <span style="font-family: ui-monospace, monospace; font-weight: 600;">{pct.toFixed(1)}%</span>
      </div>
      <div style="position: absolute; right: 9px; top: 50%; transform: translateY(-50%); font-size: 11px; font-family: ui-monospace, monospace; color: white; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">{currentBar}×</div>
      <div style="position: absolute; left: 9px; top: 50%; transform: translateY(-50%); font-size: 9px; color: #38bdf8; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; text-shadow: 0 1px 2px rgba(0,0,0,0.9);">{gateName}</div>
      {#each mechanics.filter(m => m.hpBar != null && m.hpBar <= currentBar) as m (m.id)}
        {@const ms = SEVERITY[m.severity]}
        <div style="position: absolute; left: {((m.hpBar ?? 0)/totalBars)*100}%; top: 0; width: 2px; height: 100%; background: {ms.color}; box-shadow: 0 0 6px {ms.color};" />
      {/each}
    </div>
  </div>

  <!-- Primary card -->
  {#if next && sev}
    <div style="background: rgba(10,10,10,0.9); backdrop-filter: blur(12px); border: 1px solid {sev.color}66; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 12px 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}1a;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 9px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if next.phase}
              <span style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; letter-spacing: 0.08em;">PHASE {next.phase}</span>
            {/if}
            {#if next.repeatSecs}
              <span style="font-size: 10px; color: {showRepeat ? (rs?.urgent ? sev.color : '#a78bfa') : '#a78bfa'}; font-family: ui-monospace, monospace; font-weight: {showRepeat ? 700 : 400}; {rs?.urgent ? 'animation: mech-pulse 1s infinite;' : ''}">
                ↻ {showRepeat ? `repeating · ${formatTimer(next.repeatSecs)}` : formatTimer(next.repeatSecs)}
              </span>
            {/if}
          </div>
          <div style="font-size: 16.5px; font-weight: 700; color: {showRepeat ? '#a3a3a3' : '#fafafa'}; line-height: 1.15; letter-spacing: -0.01em;">{next.name}</div>
          {#if showRepeat && rs}
            <div style="font-size: 10px; color: #525252; margin-top: 2px; font-family: ui-monospace, monospace;">fired @ {next.hpBar}× · next @ {Math.max(0, rs.nextRepeatBar)}×</div>
          {/if}
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div style="font-size: 23px; font-family: ui-monospace, monospace; font-weight: 700; color: {rs?.urgent ? sev.color : showRepeat ? '#a78bfa' : sev.color}; line-height: 1;">
            {displayBars <= 0 ? "NOW" : displayBars}
          </div>
          <div style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;">{displayLabel}</div>
        </div>
      </div>
      <!-- Progress bar -->
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div style="height: 100%; width: {Math.min(100, barFill * 100)}%; background: {showRepeat ? (rs?.urgent ? sev.color : '#a78bfa') : sev.color}; transition: width 0.3s;" />
      </div>
    </div>
  {/if}

  <!-- Secondary rows -->
  {#each rest as m (m.id)}
    {@const s = SEVERITY[m.severity]}
    <div style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <div style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7; flex-shrink: 0;" />
        <span style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span>
        {#if m.phase}
          <span style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; opacity: 0.8; font-family: ui-monospace, monospace;">P{m.phase}</span>
        {/if}
        {#if m.repeatSecs}
          <span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻</span>
        {/if}
      </div>
      <div style="display: flex; align-items: baseline; gap: 4px;">
        <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #525252; font-weight: 600;">{m.hpBar}</span>
        <span style="font-size: 9px; color: #525252;">×</span>
      </div>
    </div>
  {/each}
</div>
```

- [ ] **Step 3: Create `src/lib/components/mech/overlays/OLCompact.svelte`**

```svelte
<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars, gateName }: OverlayProps = $props();
  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 3));
  const barColor = $derived(hpBarColor(currentBar, totalBars));
</script>

{#if upcoming.length === 0}
  <div style="background: rgba(23,23,23,0.8); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; padding: 8px 14px; color: #a3a3a3; font-size: 12px;">Awaiting first mech...</div>
{:else}
  <div style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; min-width: 260px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
    <div style="height: 3px; background: rgba(0,0,0,0.5);"><div style="height: 100%; width: {(currentBar/totalBars)*100}%; background: {barColor}; opacity: 0.9;" /></div>
    <div style="padding: 6px 12px; background: rgba(10,10,10,0.5); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 10px; color: #38bdf8; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;">{gateName}</span>
      <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #fafafa; font-weight: 600;">{currentBar}<span style="color: #525252; font-weight: 400;">×</span></span>
    </div>
    {#each upcoming as m, i (m.id)}
      {@const sev = SEVERITY[m.severity]}
      <div style="padding: 7px 12px; border-bottom: {i < upcoming.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none'}; background: {i === 0 ? `${sev.color}0d` : 'transparent'}; display: flex; align-items: center; gap: 10px;">
        <div style="width: 5px; height: 5px; border-radius: 50%; background: {sev.color}; flex-shrink: 0; box-shadow: {i === 0 ? `0 0 6px ${sev.color}` : 'none'};" />
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 12.5px; font-weight: {i === 0 ? 700 : 500}; color: {i === 0 ? '#fafafa' : '#a3a3a3'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span>
            {#if m.phase}<span style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; font-weight: 700; font-family: ui-monospace, monospace;">P{m.phase}</span>{/if}
            {#if m.repeatSecs}<span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻{formatTimer(m.repeatSecs)}</span>{/if}
          </div>
          {#if i === 0}<div style="font-size: 10px; color: {sev.color}; font-family: ui-monospace, monospace;">{currentBar - (m.hpBar ?? 0)} bars away</div>{/if}
        </div>
        <div style="font-size: 12px; font-family: ui-monospace, monospace; color: {i === 0 ? sev.color : '#525252'}; font-weight: 700;">{m.hpBar}</div>
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 4: Create `src/lib/components/mech/overlays/OLHudStrip.svelte`**

```svelte
<script lang="ts">
  import { PHASE_COLORS, SEVERITY } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";

  let { mechanics, currentBar, totalBars, gateName }: OverlayProps = $props();
  const next = $derived(upcomingFrom(mechanics, currentBar)[0] ?? null);
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
</script>

<div style="background: rgba(23,23,23,0.75); backdrop-filter: blur(10px); border: 1px solid rgba(64,64,64,0.4); border-radius: 3px; min-width: 480px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.6);">
  <div style="position: relative; height: 22px; background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(0,0,0,0.4);">
    <div style="position: absolute; inset: 0; background: {barColor}; opacity: 0.75; width: {(currentBar/totalBars)*100}%; transition: width 0.3s;" />
    <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; font-weight: 500; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">
      {gateName} · <span style="font-family: ui-monospace, monospace; margin-left: 4px;">{currentBar}/{totalBars}</span>
    </div>
    {#if next && sev}
      <div style="position: absolute; left: {((next.hpBar ?? 0)/totalBars)*100}%; top: 0; width: 2px; height: 100%; background: {sev.color}; box-shadow: 0 0 6px {sev.color};" />
    {/if}
  </div>
  <div style="padding: 8px 14px; display: flex; align-items: center; gap: 14px;">
    {#if next && sev}
      <span style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">NEXT</span>
      <div style="width: 7px; height: 7px; border-radius: 50%; background: {sev.color}; box-shadow: 0 0 6px {sev.color};" />
      <span style="font-size: 14px; font-weight: 700; color: {sev.color};">{next.name}</span>
      {#if next.phase}
        <MechBadge label="P{next.phase}" color={PHASE_COLORS[next.phase]} bg="{PHASE_COLORS[next.phase]}18" border="{PHASE_COLORS[next.phase]}60" small />
      {/if}
      <span style="margin-left: auto; display: flex; align-items: baseline; gap: 4px;">
        <span style="font-size: 18px; font-family: ui-monospace, monospace; font-weight: 700; color: #fafafa;">{currentBar - (next.hpBar ?? 0)}</span>
        <span style="font-size: 10px; color: #525252;">bars</span>
      </span>
    {:else}
      <span style="font-size: 12px; color: #525252;">No upcoming mechanics</span>
    {/if}
  </div>
</div>
```

- [ ] **Step 5: Create `src/lib/components/mech/overlays/OLCardStack.svelte`**

```svelte
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
    <div style="background: rgba(10,10,10,0.92); backdrop-filter: blur(12px); border: 1px solid {sev.color}60; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 13px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}14;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if primary.phase}
              <span style="font-size: 10px; color: {PHASE_COLORS[primary.phase]}; font-weight: 700; letter-spacing: 0.08em;">PHASE {primary.phase}</span>
            {/if}
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #fafafa; line-height: 1.15;">{primary.name}</div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div style="font-size: 24px; font-family: ui-monospace, monospace; font-weight: 700; color: {sev.color}; line-height: 1;">{barsAway}</div>
          <div style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;">bars away</div>
        </div>
      </div>
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div style="height: 100%; width: {progress * 100}%; background: {sev.color}; transition: width 0.3s;" />
      </div>
      {#if primary.repeatSecs}
        <div style="margin-top: 7px; font-size: 10px; color: #a78bfa; font-family: ui-monospace, monospace;">↻ Repeats every {formatTimer(primary.repeatSecs)}</div>
      {/if}
    </div>
    {#each rest as m (m.id)}
      {@const s = SEVERITY[m.severity]}
      <div style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7;" />
          <span style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{m.name}</span>
          {#if m.phase}<span style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; opacity: 0.8; font-family: ui-monospace, monospace;">P{m.phase}</span>{/if}
        </div>
        <span style="font-size: 10.5px; font-family: ui-monospace, monospace; color: #525252;">{m.hpBar}</span>
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 6: Create `src/lib/components/mech/overlays/OLPill.svelte`**

```svelte
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
  <div style="
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
  ">
    <div style="width: 7px; height: 7px; border-radius: 50%; background: {sev.color}; box-shadow: 0 0 8px {sev.color}; {urgent ? 'animation: mech-pulse 1.2s infinite;' : ''}" />
    <span style="font-size: 13px; font-weight: 700; color: {sev.color}; white-space: nowrap;">{next.name}</span>
    <span style="font-size: 11px; color: #a3a3a3;">in</span>
    <span style="font-size: 13px; font-family: ui-monospace, monospace; font-weight: 700; color: #fafafa;">{barsAway}</span>
    <span style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em;">bars</span>
    {#if next.phase}
      <span style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; border-left: 1px solid #262626; padding-left: 10px; font-family: ui-monospace, monospace;">P{next.phase}</span>
    {/if}
  </div>
{/if}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/mech/overlays/
git commit -m "feat: five overlay variant components (Combined, Compact, HUD, Card, Pill)"
```

---

## Task 7: Mech Editor page

**Files:**
- Create: `src/routes/(app)/mech-editor/+page.svelte`

- [ ] **Step 1: Create `src/routes/(app)/mech-editor/+page.svelte`**

```svelte
<script lang="ts">
  import HPTimeline from "$lib/components/mech/HPTimeline.svelte";
  import GateSidebar from "$lib/components/mech/GateSidebar.svelte";
  import MechRow from "$lib/components/mech/MechRow.svelte";
  import MechModal from "$lib/components/mech/MechModal.svelte";
  import MechBadge from "$lib/components/mech/MechBadge.svelte";
  import { mechStore } from "$lib/mech-store.svelte";
  import type { Mechanic } from "$lib/mech-types";
  import Header from "../Header.svelte";

  let showModal = $state(false);
  let editMech = $state<Mechanic | null>(null);

  const gate = $derived(mechStore.selectedGate);
  const simBarMax = $derived(gate?.totalBars ?? 300);
  let simBar = $state(simBarMax);

  $effect(() => { simBar = gate?.totalBars ?? 300; });

  const sorted = $derived(
    gate ? [...gate.mechanics].sort((a, b) => ((b.hpBar ?? -1) - (a.hpBar ?? -1))) : []
  );
  const nextId = $derived(
    simBar != null ? sorted.find(m => m.hpBar != null && m.hpBar <= simBar)?.id ?? null : null
  );

  function openAdd() { editMech = null; showModal = true; }
  function openEdit(m: Mechanic) { editMech = m; showModal = true; }
  function closeModal() { showModal = false; editMech = null; }

  function saveMechanic(m: Mechanic) {
    if (gate) mechStore.upsertMechanic(gate.id, m);
    closeModal();
  }

  function deleteMechanic(id: string) {
    if (gate) mechStore.deleteMechanic(gate.id, id);
  }

  const bossTypeColor = $derived(() => {
    if (!gate) return "#fbbf24";
    return gate.bossType === "HUMAN" ? "#fbbf24" : gate.bossType === "ANCIENT" ? "#a78bfa" : "#f87171";
  });
</script>

<Header title="Mech Editor" />

<div class="flex overflow-hidden" style="height: calc(100vh - 64px);">
  <GateSidebar />

  {#if gate}
    <div class="flex flex-col overflow-hidden min-w-0 flex-1">
      <!-- Boss header -->
      <div style="padding: 14px 22px; border-bottom: 1px solid #262626; display: flex; align-items: center; gap: 14px; flex-shrink: 0; background: rgba(23,23,23,0.7); backdrop-filter: blur(8px);">
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px; flex-wrap: wrap;">
            <MechBadge label="Gate {gate.gate}" color="#38bdf8" bg="rgba(56,189,248,0.1)" border="rgba(56,189,248,0.3)" small />
            <MechBadge label={gate.bossType} color={bossTypeColor()} small />
            {#if gate.weakness !== "No Weakness"}
              <MechBadge label={gate.weakness} color="#4ade80" small />
            {/if}
            {#if !gate.tauntable}
              <MechBadge label="Not Tauntable" color="#525252" small />
            {/if}
          </div>
          <div style="font-size: 17px; font-weight: 700; color: #fafafa;">{gate.boss}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; color: #525252; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 600;">Total HP</div>
          <div style="font-size: 22px; font-weight: 700; font-family: ui-monospace, monospace; color: #38bdf8; line-height: 1.1;">{gate.totalBars}</div>
          <div style="font-size: 10px; color: #525252;">bars</div>
        </div>
      </div>

      <!-- HP Timeline + sim slider -->
      <div style="padding: 10px 22px 14px; background: rgba(20,20,20,0.4); border-bottom: 1px solid #262626; flex-shrink: 0;">
        <HPTimeline mechanics={gate.mechanics} totalBars={gate.totalBars} currentBar={simBar} />
        <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 10px; color: #525252; font-family: ui-monospace, monospace; font-weight: 600;">
          <span style="letter-spacing: 0.08em; text-transform: uppercase;">Simulate HP</span>
          <input type="range" min={0} max={gate.totalBars} bind:value={simBar} class="flex-1" style="accent-color: #38bdf8; height: 4px;" />
          <span style="color: #38bdf8; min-width: 70px; text-align: right;">{simBar}× / {gate.totalBars}×</span>
        </div>
      </div>

      <!-- Table header -->
      <div style="display: grid; grid-template-columns: 78px 32px 1fr 110px 86px 78px; padding: 7px 14px; background: #0c0c0c; border-bottom: 1px solid #262626; font-size: 9.5px; font-weight: 700; color: #525252; text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0;">
        <div>HP Bar</div><div>Ph</div><div>Mechanic</div><div>Severity</div><div>Repeat</div>
        <div style="text-align: right;">
          <button onclick={openAdd} style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 3px; padding: 3px 9px; color: #38bdf8; cursor: pointer; font-size: 9.5px; font-weight: 700; letter-spacing: 0.05em;">+ ADD</button>
        </div>
      </div>

      <!-- Mechanic rows -->
      <div class="flex-1 overflow-y-auto">
        {#if sorted.length === 0}
          <div style="padding: 48px; text-align: center; color: #525252; font-size: 13px;">
            No mechanics yet.<br />
            <button onclick={openAdd} style="margin-top: 12px; background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 8px 16px; color: #38bdf8; cursor: pointer; font-size: 12px;">+ Add First Mechanic</button>
          </div>
        {:else}
          {#each sorted as m (m.id)}
            <MechRow
              mech={m}
              isNext={m.id === nextId}
              isPast={m.hpBar != null && (m.hpBar ?? 0) > simBar}
              onEdit={openEdit}
              onDelete={deleteMechanic}
            />
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

{#if showModal}
  <MechModal mech={editMech} totalBars={gate?.totalBars ?? 300} onSave={saveMechanic} onClose={closeModal} />
{/if}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/\(app\)/mech-editor/
git commit -m "feat: Mech Editor page"
```

---

## Task 8: Overlay Preview page

**Files:**
- Create: `src/routes/(app)/overlay-preview/+page.svelte`

- [ ] **Step 1: Create `src/routes/(app)/overlay-preview/+page.svelte`**

```svelte
<script lang="ts">
  import OLCombined from "$lib/components/mech/overlays/OLCombined.svelte";
  import OLCompact from "$lib/components/mech/overlays/OLCompact.svelte";
  import OLHudStrip from "$lib/components/mech/overlays/OLHudStrip.svelte";
  import OLCardStack from "$lib/components/mech/overlays/OLCardStack.svelte";
  import OLPill from "$lib/components/mech/overlays/OLPill.svelte";
  import { BOSS_HP_COLORS, SEVERITY } from "$lib/mech-constants";
  import { mechStore } from "$lib/mech-store.svelte";
  import Header from "../Header.svelte";

  type VariantId = "combined" | "compact" | "hud" | "card" | "pill";

  const gate = $derived(mechStore.selectedGate);
  let variant = $state<VariantId>("combined");
  let simBar = $state(gate?.totalBars ?? 300);
  let playing = $state(false);
  let speed = $state(3);
  let lastAnnounced = $state<{ name: string; severity: string; ts: number } | null>(null);
  let firedSet = new Set<string>();
  let intervalId: ReturnType<typeof setInterval> | null = null;

  $effect(() => { if (gate) { simBar = gate.totalBars; firedSet = new Set(); } });

  // TTS lead-time firing
  $effect(() => {
    if (!gate) return;
    const lead = mechStore.mechSettings.lead;
    gate.mechanics.forEach(m => {
      if (m.hpBar == null) return;
      const fireAt = m.hpBar + lead;
      const cycleKey = `${m.id}-${Math.floor(simBar / (m.repeatSecs ?? 999999))}`;
      if (simBar <= fireAt && simBar > m.hpBar && !firedSet.has(cycleKey)) {
        firedSet.add(cycleKey);
        announceNow(m.name, m.severity, m.ttsEnabled, m.ttsText);
      }
    });
  });

  function announceNow(name: string, severity: string, ttsEnabled: boolean, ttsText: string) {
    const cfg = mechStore.mechSettings;
    if (ttsEnabled) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(ttsText || name);
        u.volume = (cfg.vol ?? 80) / 100;
        u.pitch = cfg.pitch ?? 1;
        speechSynthesis.speak(u);
      } catch (e) { console.warn("TTS error", e); }
    }
    if (cfg.hook) {
      const colorMap: Record<string, number> = { normal: 0x38bdf8, major: 0xfb923c, wipe: 0xf87171 };
      const emoji = severity === "wipe" ? "💀" : severity === "major" ? "⚠️" : "ℹ️";
      fetch(cfg.hook, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [{ title: `${emoji} ${name}`, color: colorMap[severity] ?? 0x38bdf8, footer: { text: `Mech Announcer · ${gate?.raid} G${gate?.gate}` } }] }),
      }).catch(e => console.warn("Webhook error", e));
    }
    lastAnnounced = { name, severity, ts: Date.now() };
    setTimeout(() => { lastAnnounced = null; }, 3000);
  }

  $effect(() => {
    if (playing) {
      intervalId = setInterval(() => {
        simBar = simBar <= 0 ? (playing = false, 0) : simBar - 1;
      }, 1000 / speed);
    } else {
      if (intervalId) clearInterval(intervalId);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  });

  function togglePlay() {
    if (simBar <= 0) { simBar = gate?.totalBars ?? 300; firedSet = new Set(); }
    playing = !playing;
  }

  const variants: { id: VariantId; label: string }[] = [
    { id: "combined", label: "★ Combined" },
    { id: "compact", label: "Compact List" },
    { id: "hud", label: "HUD Strip" },
    { id: "card", label: "Card Stack" },
    { id: "pill", label: "Minimal Pill" },
  ];

  const gateName = $derived(gate ? `G${gate.gate} · ${gate.raid.toUpperCase()}` : "");
  const bossName = $derived(gate ? gate.boss.split(",")[0] : "");
  const barColor = $derived(() => {
    if (!gate) return BOSS_HP_COLORS[0];
    const idx = Math.max(0, Math.ceil((simBar / gate.totalBars) * BOSS_HP_COLORS.length) - 1);
    return BOSS_HP_COLORS[idx % BOSS_HP_COLORS.length];
  });

  // Draggable overlay position
  let dragPos = $state<{ x: number; y: number } | null>(null);
  let overlayEl = $state<HTMLElement | null>(null);

  function startDrag(e: MouseEvent) {
    if (e.button !== 0 || !overlayEl) return;
    const rect = overlayEl.getBoundingClientRect();
    const ox = e.clientX - rect.left, oy = e.clientY - rect.top;
    const onMove = (me: MouseEvent) => { dragPos = { x: me.clientX - ox, y: me.clientY - oy }; };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const overlayStyle = $derived(
    dragPos
      ? `position: absolute; left: ${dragPos.x}px; top: ${dragPos.y}px; cursor: grab;`
      : variant === "hud"    ? "position: absolute; top: 40px; left: 50%; transform: translateX(-50%); cursor: grab;"
      : variant === "pill"   ? "position: absolute; bottom: 110px; left: 50%; transform: translateX(-50%); cursor: grab;"
      : variant === "card"   ? "position: absolute; top: 80px; right: 30px; cursor: grab;"
      : variant === "combined" ? "position: absolute; top: 60px; left: 50%; transform: translateX(-50%); cursor: grab;"
      : "position: absolute; top: 70px; right: 20px; cursor: grab;"
  );
</script>

<Header title="Overlay Preview" />

<div class="flex flex-col overflow-hidden" style="height: calc(100vh - 64px);">
  <!-- Controls bar -->
  <div style="padding: 10px 22px; border-bottom: 1px solid #262626; background: rgba(23,23,23,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; gap: 14px; flex-shrink: 0; flex-wrap: wrap;">
    <span style="font-size: 10px; color: #a3a3a3; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">Overlay Style</span>
    <div style="display: flex; gap: 2px; background: #0a0a0a; border-radius: 5px; padding: 2px; border: 1px solid #262626;">
      {#each variants as v (v.id)}
        <button
          onclick={() => { variant = v.id; dragPos = null; }}
          style="background: {variant === v.id ? '#262626' : 'transparent'}; border: none; border-radius: 3px; padding: 5px 12px; color: {variant === v.id ? '#fafafa' : '#a3a3a3'}; cursor: pointer; font-size: 11.5px; font-weight: {variant === v.id ? 600 : 400}; transition: all 0.15s;"
        >{v.label}</button>
      {/each}
    </div>
    <div style="margin-left: auto; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
      <span style="font-size: 10px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Simulate HP:</span>
      <input type="range" min={0} max={gate?.totalBars ?? 300} bind:value={simBar}
        oninput={() => playing = false}
        style="width: 160px; accent-color: #38bdf8;" />
      <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 44px; font-weight: 600;">{simBar}/{gate?.totalBars ?? 300}</span>
      <select bind:value={speed} style="background: #262626; border: 1px solid #262626; border-radius: 3px; padding: 4px 8px; color: #fafafa; font-size: 11px; outline: none;">
        <option value={1}>1× sim</option>
        <option value={3}>3× sim</option>
        <option value={8}>8× sim</option>
      </select>
      <button onclick={togglePlay} style="background: {playing ? 'rgba(251,146,60,0.1)' : 'rgba(56,189,248,0.1)'}; border: 1px solid {playing ? '#fb923c60' : 'rgba(56,189,248,0.3)'}; border-radius: 3px; padding: 5px 14px; color: {playing ? '#fb923c' : '#38bdf8'}; cursor: pointer; font-size: 11.5px; font-weight: 700;">
        {playing ? "⏸ PAUSE" : simBar <= 0 ? "↺ RESTART" : "▶ PLAY"}
      </button>
    </div>
  </div>

  <!-- Simulated game bg -->
  <div class="flex-1 relative overflow-hidden" style="background: radial-gradient(ellipse at 50% 70%, rgba(40,25,60,0.4) 0%, transparent 60%), linear-gradient(180deg, #050506 0%, #0a0c12 50%, #050406 100%);">
    <!-- Fake boss HP bar -->
    {#if gate}
      <div style="position: absolute; top: 14px; left: 50%; transform: translateX(-50%); width: 340px; text-align: center;">
        <div style="font-size: 10px; color: rgba(255,255,255,0.35); letter-spacing: 0.08em; margin-bottom: 4px;">{gate.boss.toUpperCase()}</div>
        <div style="height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; border: 1px solid rgba(255,255,255,0.06);">
          <div style="height: 100%; width: {(simBar/gate.totalBars)*100}%; background: {barColor()}; transition: all 0.3s;" />
        </div>
        <div style="font-size: 9px; color: rgba(255,255,255,0.25); margin-top: 3px; font-family: ui-monospace, monospace;">{simBar} / {gate.totalBars} BARS</div>
      </div>
    {/if}

    <!-- Fake skill bar -->
    <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); display: flex; gap: 5px;">
      {#each Array(8) as _, i (i)}
        <div style="width: 40px; height: 40px; border-radius: 3px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);" />
      {/each}
    </div>

    <!-- Draggable overlay -->
    {#if gate}
      <div bind:this={overlayEl} style={overlayStyle} onmousedown={startDrag}>
        {#if variant === "combined"}
          <OLCombined mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} bossName={bossName} />
        {:else if variant === "compact"}
          <OLCompact mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else if variant === "hud"}
          <OLHudStrip mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else if variant === "card"}
          <OLCardStack mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {:else}
          <OLPill mechanics={gate.mechanics} currentBar={simBar} totalBars={gate.totalBars} gateName={gateName} />
        {/if}

        {#if lastAnnounced}
          {@const sev = SEVERITY[lastAnnounced.severity as keyof typeof SEVERITY]}
          <div style="margin-top: 6px; background: {sev.dim}; border: 1px solid {sev.border}; border-radius: 4px; padding: 5px 12px; font-size: 11px; color: {sev.color}; font-weight: 600; text-align: center;">
            🔊 Announced: {lastAnnounced.name}
          </div>
        {/if}
      </div>
    {/if}

    <div style="position: absolute; bottom: 80px; left: 20px; font-size: 10px; color: rgba(255,255,255,0.18); letter-spacing: 0.05em;">SIMULATED IN-GAME VIEW · USE SLIDER OR ▶ TO TEST</div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/\(app\)/overlay-preview/
git commit -m "feat: Overlay Preview page with 5 variants, simulation, TTS, and drag"
```

---

## Task 9: Mech Settings page

**Files:**
- Create: `src/routes/(app)/mech-settings/+page.svelte`

- [ ] **Step 1: Create `src/routes/(app)/mech-settings/+page.svelte`**

```svelte
<script lang="ts">
  import { mechStore } from "$lib/mech-store.svelte";
  import Header from "../Header.svelte";

  const s = $derived(mechStore.mechSettings);

  function upd<K extends keyof typeof s>(key: K, value: (typeof s)[K]) {
    mechStore.updateSetting(key, value);
  }

  function testTTS() {
    const u = new SpeechSynthesisUtterance("Saws and Spikes incoming");
    u.volume = s.vol / 100;
    u.pitch = s.pitch;
    speechSynthesis.speak(u);
  }

  async function testWebhook() {
    if (!s.hook) return;
    try {
      const res = await fetch(s.hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embeds: [{ title: "🔴 Bomberman · Major", description: "HP Bar: 175/300 · Phase 2 · Repeats: 1:10\n\nP2 starts. Every ~70s. Move/explode to x shape on edge.", color: 0xfb923c, footer: { text: "Mech Announcer · Test" } }] }),
      });
      alert(res.ok ? "✅ Webhook delivered!" : `❌ Error: ${res.status}`);
    } catch (e) {
      alert(`❌ ${e}`);
    }
  }
</script>

<Header title="Mech Settings" />

<div class="overflow-y-auto" style="height: calc(100vh - 64px); padding: 24px 32px;">
  <div style="max-width: 620px;">

    <!-- TTS Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px;">Text-to-Speech</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 1px;">Announcement Lead Time</div>
        <div style="font-size: 11px; color: #a3a3a3; margin-bottom: 6px;">How many HP bars before threshold to begin announcing</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={1} max={30} value={s.lead} oninput={(e) => upd("lead", parseInt((e.target as HTMLInputElement).value))} class="flex-1" style="accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.lead} bars</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Volume</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={0} max={100} value={s.vol} oninput={(e) => upd("vol", parseInt((e.target as HTMLInputElement).value))} class="flex-1" style="accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.vol}%</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Pitch</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={0.5} max={2} step={0.1} value={s.pitch} oninput={(e) => upd("pitch", parseFloat((e.target as HTMLInputElement).value))} class="flex-1" style="accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.pitch}×</span>
        </div>
      </div>

      <button onclick={testTTS} style="background: rgba(56,189,248,0.1); border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; padding: 7px 14px; color: #38bdf8; cursor: pointer; font-size: 12px; font-weight: 600;">🔊 Test TTS</button>
    </div>

    <!-- Discord Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px;">Discord Integration</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 1px;">Webhook URL</div>
        <div style="font-size: 11px; color: #a3a3a3; margin-bottom: 6px;">Announcements are posted as embeds to this channel when a mech fires</div>
        <input
          type="url"
          value={s.hook}
          oninput={(e) => upd("hook", (e.target as HTMLInputElement).value)}
          placeholder="https://discord.com/api/webhooks/..."
          style="width: 100%; background: #0a0a0a; border: 1px solid #262626; border-radius: 4px; padding: 8px 12px; color: #fafafa; font-size: 12.5px; outline: none; font-family: inherit;"
        />
      </div>

      <button
        onclick={testWebhook}
        disabled={!s.hook}
        style="background: {s.hook ? 'rgba(88,101,242,0.14)' : '#262626'}; border: 1px solid {s.hook ? 'rgba(88,101,242,0.4)' : '#262626'}; border-radius: 4px; padding: 7px 14px; color: {s.hook ? '#818cf8' : '#525252'}; cursor: {s.hook ? 'pointer' : 'not-allowed'}; font-size: 12px; font-weight: 600; opacity: {s.hook ? 1 : 0.5}; margin-bottom: 12px;"
      >Test Webhook</button>

      <div style="padding: 10px 12px; background: rgba(88,101,242,0.05); border: 1px solid rgba(88,101,242,0.2); border-radius: 4px; font-size: 11px; color: #a3a3a3; line-height: 1.55;">
        <div style="color: #818cf8; font-weight: 600; margin-bottom: 4px;">Embed preview</div>
        <div style="font-family: ui-monospace, monospace; font-size: 10.5px; color: #525252;">
          <div style="color: #fb923c; font-weight: 700;">▶ Bomberman · Major</div>
          <div>HP Bar: 175/300 · Phase 2 · Repeats: 1:10</div>
          <div style="opacity: 0.8;">P2 starts. Every ~70s. Move/explode to x shape on edge.</div>
        </div>
      </div>
    </div>

    <!-- Overlay Section -->
    <div style="margin-bottom: 26px;">
      <div style="font-size: 13px; font-weight: 700; color: #fafafa; margin-bottom: 6px;">Overlay</div>
      <div style="height: 1px; background: #262626; margin-bottom: 16px;" />

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Opacity</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <input type="range" min={40} max={100} value={s.opacity} oninput={(e) => upd("opacity", parseInt((e.target as HTMLInputElement).value))} class="flex-1" style="accent-color: #38bdf8;" />
          <span style="font-size: 12px; font-family: ui-monospace, monospace; color: #38bdf8; min-width: 56px; text-align: right; font-weight: 600;">{s.opacity}%</span>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Always on top</div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa;">
          <input type="checkbox" checked={s.alwaysOnTop} onchange={(e) => upd("alwaysOnTop", (e.target as HTMLInputElement).checked)} style="accent-color: #38bdf8; width: 14px; height: 14px;" />
          Keep overlay above all other windows
        </label>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 12.5px; color: #fafafa; font-weight: 500; margin-bottom: 6px;">Click-through mode</div>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 12.5px; color: #fafafa;">
          <input type="checkbox" checked={s.clickThrough} onchange={(e) => upd("clickThrough", (e.target as HTMLInputElement).checked)} style="accent-color: #38bdf8; width: 14px; height: 14px;" />
          Mouse clicks pass through to game underneath
        </label>
      </div>
    </div>

  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/\(app\)/mech-settings/
git commit -m "feat: Mech Settings page (TTS, Discord webhook, Overlay)"
```

---

## Task 10: Wire hamburger menu

**Files:**
- Modify: `src/routes/(app)/Header.svelte`

- [ ] **Step 1: Add three routes to the hamburger nav drawer**

In `src/routes/(app)/Header.svelte`, find the block with the existing route links:

```svelte
        {@render route("Past Encounters", "/logs")}
        {@render route("Uploading", "/upload")}
        {@render route("Changelog", "/changelog")}
        {@render route("Settings", "/settings")}
```

Replace with:

```svelte
        {@render route("Past Encounters", "/logs")}
        {@render route("Uploading", "/upload")}
        {@render route("Changelog", "/changelog")}
        {@render route("Settings", "/settings")}
        <div class="mx-4 my-2 h-px bg-neutral-700"></div>
        {@render route("Mech Editor", "/mech-editor")}
        {@render route("Overlay Preview", "/overlay-preview")}
        {@render route("Mech Settings", "/mech-settings")}
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/\(app\)/Header.svelte
git commit -m "feat: add Mech Editor, Overlay Preview, Mech Settings to hamburger nav"
```

---

## Task 11: Smoke test all three routes

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Open `http://localhost:5173` in browser.

- [ ] **Step 2: Test Mech Editor**

1. Open hamburger → click "Mech Editor"
2. Verify sidebar shows Serca G1, G2, Thaemine G4
3. Click Gate 2 — boss header updates to Corvus Tul Rak
4. Drag simulate HP slider — NEXT row highlights, past rows dim
5. Click "+ ADD" — modal opens. Fill a name, click "Add" — row appears
6. Click ✎ on any row — modal opens with existing values
7. Click ✕ on a row — row deleted

- [ ] **Step 3: Test Overlay Preview**

1. Open hamburger → click "Overlay Preview"
2. Verify Combined variant shows boss HP bar + mech card
3. Click each variant button — overlay changes
4. Drag the overlay — it repositions
5. Hit ▶ PLAY — simBar decreases, mech card updates
6. Hit ⏸ PAUSE — stops
7. Drag slider to 0, hit ↺ RESTART — resets to max

- [ ] **Step 4: Test Mech Settings**

1. Open hamburger → click "Mech Settings"
2. Drag lead time slider — value updates live
3. Click "🔊 Test TTS" — browser speaks "Saws and Spikes incoming"
4. Verify Discord section renders with embed preview
5. Toggle "Always on top" and "Click-through" checkboxes — state persists on page refresh

- [ ] **Step 5: Verify localStorage persistence**

Open DevTools → Application → Local Storage. Check `mech-announcer-raids` and `mech-announcer-settings` keys exist after interacting with the pages. Refresh the page — added mechanics and settings should survive.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: mech announcer — editor, preview, settings complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| Live data from LOA Logs via PeerJS clipboard URL | Task 0 ✅ |
| Auto-select gate from live boss name | Task 0 (`setBossStatus` in store) ✅ |
| LIVE indicator in sidebar + editor slider | Task 0 (steps 4–6) ✅ |
| App shell header (logo, tabs, LOA detected) | The tabs are replaced by hamburger nav per user request ✅ |
| Mech Editor — sidebar, boss header, HP timeline, table, modal | Tasks 3–7 ✅ |
| Overlay Preview — 5 variants, simulation, draggable | Tasks 6, 8 ✅ |
| Overlay Preview drives from live boss HP when connected | Task 0 step 6 ✅ |
| Settings — TTS sliders, Discord webhook, Overlay toggles | Task 9 ✅ |
| Severity colors, phase colors, boss HP colors | Task 1 ✅ |
| `mech-pulse` animation | Task 1 ✅ |
| LIVE badge on gate sidebar | Task 5 ✅ |
| NEXT/PAST row states | Task 4 (MechRow), Task 7 (editor page) ✅ |
| Repeat cycle math in Combined overlay | Task 6 (OLCombined) ✅ |
| TTS firing with lead time | Task 8 (preview page) ✅ |
| Discord embed on mech fire | Task 8 (preview page) ✅ |
| localStorage persistence | Task 2 ✅ |
| Scrollbar + range input custom styles | Already in app.css ✅ |

**No gaps found.**
