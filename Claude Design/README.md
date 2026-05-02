# Handoff: Mech Announcer

## Overview
Mech Announcer is a standalone Lost Ark raid overlay tool. It sits on top of the game and announces upcoming boss mechanics to the party via on-screen overlay, text-to-speech, and Discord webhook. It reads live boss HP bar data from the LOA Logs companion app (`snoww/loa-logs`) via its existing `bossStatus` broadcast.

## About the Design Files
`Mech Announcer.html` in this bundle is a **high-fidelity interactive prototype** built in HTML/React — not production code to copy directly. Your task is to **recreate this design in Svelte 5 + Tauri 2**, using loa-logs' existing file structure, Tailwind v4 class conventions, and component patterns. The HTML file is the single source of truth for all visual appearance, interactions, and logic.

## Fidelity
**High-fidelity.** Match pixel-for-pixel: exact colors, typography, spacing, animations, and interaction states. All design tokens are listed below and are sourced directly from `shotgun175/loa-logs` (a fork of `snoww/loa-logs`).

---

## Target Stack
- **Tauri 2** — two windows: editor/settings (normal) + overlay (always-on-top, transparent, click-through)
- **Svelte 5** with runes syntax (`$state`, `$derived`, `$effect`)
- **TypeScript**
- **Tailwind v4** — same config as loa-logs
- **`@tauri-apps/plugin-store`** — persistence
- **`tts` Rust crate** — TTS via Tauri command

### loa-logs integration points
| File | What to use |
|---|---|
| `src/routes/(live)/live/LiveBossInfo.svelte` | Subscribe to `bossStatus` via `broadcastLiveMessage` for live `currentBars`/`totalBars`/`name` |
| `src/lib/constants/encounters.ts` | `encounterMap`, `raidGates`, `bossHpMap`, `bossHpBarColors` |
| `src/app.css` | Tailwind theme, accent color system, font imports |

---

## Data Model

```ts
interface Mechanic {
  id: string;
  name: string;
  severity: "normal" | "major" | "wipe";
  hpBar: number | null;        // out of gate.totalBars
  timerSecs: number | null;    // seconds from pull
  phase: 1 | 2 | 3 | 4 | null;
  repeatSecs: number | null;
  triggerType: "hp" | "timer" | "hp+timer";
  ttsEnabled: boolean;
  ttsText: string;
  notes: string;
}

interface Gate {
  id: string;
  raid: string;
  gate: number;
  boss: string;
  bossType: "HUMAN" | "ANCIENT" | "DEMONIC" | string;
  weakness: string;
  tauntable: boolean;
  totalBars: number;
  mechanics: Mechanic[];
}
```

### Seed data (Serca G1)
300 bars total, 6 mechanics across 3 phases:
| HP Bar | Phase | Name | Severity | Repeat |
|---|---|---|---|---|
| 270 | P1 | Saws & Spikes | Major | 60s |
| 240 | P1 | Nail Just Guard | Major | — |
| 195 | P1 | Moral Walls | Normal | — |
| 175 | P2 | Bomberman | Major | 70s |
| 105 | P2 | Survival Run | Major | — |
| 90 | P3 | Flame Maiden | Wipe | 60s |

### Seed data (Serca G2)
300 bars, no phases, Wing Prediction at bar 285 repeating every 80s.

---

## Screens & Views

---

### 1. App Shell (always visible)

**Header bar** — 52px tall, `bg-neutral-900/70 backdrop-blur-lg`, `shadow-sm shadow-neutral-800`.
- Left: 26×26px logo mark (`linear-gradient(135deg, #38bdf8, #7c3aed)`, radius 5px, white "M" at 12px/800), then "Mech Announcer" at 14px/700, then `v1.0` monospace badge in `neutral-800`.
- Center: three tab buttons ("Mech Editor", "Overlay Preview", "Settings") — 13px text, 600 weight when active, active state has 2px sky-400 bottom border, inactive `neutral-400`.
- Right: green pulse dot (8×8, `#4ade80`, glow `0 0 8px #4ade80`) + "Lost Ark detected" at 11px.

---

### 2. Mech Editor

**Layout:** full-height flex row — 220px left sidebar + flex-1 main content.

#### Sidebar
Background `#0f0f0f`, right border `neutral-800`.

- Section header: "RAIDS & GATES" in 10px/700/uppercase/`neutral-400`.
- Raid group label: raid name in 10px/700/uppercase/`neutral-600`, `padding: 10px 14px 4px`.
- Gate rows: `padding: 8px 14px 8px 20px`, 12.5px text.
  - Selected: `bg sky-400/10`, `border-left: 2px solid #38bdf8`, color sky-400, 600 weight.
  - Hover (unselected): `bg neutral-800/50`.
  - **LIVE badge**: when this gate is the active encounter — 8px/800 text `#4ade80`, bg `rgba(74,222,128,0.15)`, border `rgba(74,222,128,0.4)`, radius 3px, padding `1px 5px`, `animation: mech-pulse 2s ease-in-out infinite`.
  - Mech count: 10px monospace right-aligned `neutral-600`.
- Bottom: "+ Add Raid" dashed button.

#### Boss Header
`padding: 14px 22px`, `bg neutral-900/70 backdrop-blur-lg`, bottom border `neutral-800`.
- Left: badge row (Gate N badge, bossType badge, weakness badge if any, "Not Tauntable" if applicable) then boss name at 17px/700.
- Right: "Total HP" label 10px/uppercase/`neutral-600`, then `{totalBars}` at 22px/700 monospace sky-400, "bars" label 10px/`neutral-600`.

#### HP Timeline
`padding: 10px 22px 14px`, bg `rgba(20,20,20,0.4)`, bottom border `neutral-800`. Total height 44px.

**The bar** — 8px tall rail, `bg #0c0c0c`, radius 3px, border `neutral-800`:
- Filled (left portion, width = `currentBar/totalBars * 100%`): `linear-gradient(90deg, #f87171 0%, #facc15 55%, #4ade80 100%)` — red on left (low HP side), green on right (full HP side). Transitions width 0.3s.
- Drained (right portion): hatched `repeating-linear-gradient(-45deg, rgba(255,255,255,0.02) 0 4px, rgba(255,255,255,0.05) 4px 8px)`, left `1px dashed rgba(255,255,255,0.18)`.

**Mechanic ticks** — for each mechanic with `hpBar`:
- Position: `left: hpBar/totalBars * 100%`, centered with `translateX(-50%)`.
- Width 2px, height 24px, severity color, radius 1px.
- Glows when NOT drained: `box-shadow: 0 0 5px {severityColor}`.
- Dims to `opacity: 0.28` when drained (boss HP is above this threshold still → that region was "never reached").
- HP number label below tick: 9px/700/monospace, severity color, dims when drained.

**Phase boundary lines** — for each phase > 1, find the first mechanic of that phase (highest hpBar in that phase). Draw a 1px vertical line at that position, 14px tall starting at `top: 15`, color = phase color, `opacity: 0.7`. Phase label "P2"/"P3" etc. in 8px/800/monospace below, centered. Both dim when drained.

**Drain-edge pointer** — 2px wide, 20px tall, sky-400, glow `0 0 8px #38bdf8`, at `left: currentBar/totalBars * 100%`.

**Axis labels** — bottom-left: `{totalBars}× MAX`, bottom-right: `DEAD 0×`, both 9px/600/monospace/`neutral-600`.

**Simulate HP slider** — below timeline, `margin-top: 8px`. Label "SIMULATE HP" (10px/uppercase/`neutral-600`), range input (accentColor sky-400), value display `{currentBar}× / {totalBars}×` in sky-400 monospace.

#### Mechanics Table
Column grid: `78px 32px 1fr 110px 86px 78px`.

**Column headers row** — `padding: 7px 14px`, `bg #0c0c0c`, 9.5px/700/uppercase/`neutral-600`, bottom border.
- Columns: "HP BAR", "PH", "MECHANIC", "SEVERITY", "REPEAT", and "+ ADD" button (sky-400, `bg sky-400/10`, border `sky-400/30`).

**Mechanic row** — `padding: 8px 14px`, bottom border `neutral-800`.
- Normal: transparent bg.
- Hover: `bg #202020`.
- **NEXT** (upcoming): `bg rgba(56,189,248,0.06)`, `border-left: 2px solid #38bdf8`, HP number and name in sky-400, "▶ NEXT" label in 9px/700/sky-400.
- **Past** (already depleted): `opacity: 0.4`.
- HP column: 14px/700/monospace. Timer mechs show ⏱ prefix in amber.
- Phase column: 19×19px rounded square, phase color bg/border, "P{n}" 9px/700/monospace.
- Name column: 13px/600, notes below in 11px/`neutral-400`, truncated.
- Severity badge: outlined badge, severity color.
- Repeat column: purple `↻{time}`, speaker icon 🔊 if TTS enabled.
- Actions: edit (✎) and delete (✕) icon buttons — delete is red on hover.

#### Add/Edit Modal
Full-screen backdrop `bg neutral-950/75 backdrop-blur-[4px]`.
Modal: 470px wide, `bg neutral-900`, border `neutral-700`, radius 8px, `box-shadow: 0 20px 60px rgba(0,0,0,0.7)`.
- Header: 14px/600 title + close button, bottom border.
- Fields: Mechanic Name (text input), Severity (select), Trigger (select), HP Bar + Phase (shown for hp/hp+timer), Repeat Interval (shown for hp+timer), Timer (shown for timer), TTS section (checkbox + text input), Notes (textarea).
- Footer: Cancel (neutral) + Save/Add (sky-400) buttons, right-aligned.

---

### 3. Overlay Preview (simulation tab)

**Controls bar** — `padding: 10px 22px`, `bg neutral-900/70 backdrop-blur`.
- "Overlay Style" label + segmented picker: ★ Combined | Compact List | HUD Strip | Card Stack | Minimal Pill.
- Right: "Simulate HP" label + range slider (160px) + `{simBar}/{totalBars}` readout + speed select (1×/3×/8×) + ▶/⏸/↺ play button.

**Simulated game background** — `radial-gradient(ellipse at 50% 70%, rgba(40,25,60,0.4) 0%, transparent 60%)` on `linear-gradient(180deg, #050506, #0a0c12, #050406)`.
- Fake boss HP bar: 340px centered at top, boss name in uppercase/35% white, 6px bar, 3 lines of info below.
- Fake skill bar: 8× 40×40px slots at bottom center.

**★ Combined overlay** — 400px fixed width, centered via `left: 50%, transform: translateX(-50%)`, positioned at `top: 60px`. Draggable (mousedown → mousemove → mouseup updates absolute x/y, overrides centered position).

#### Combined overlay — Boss HP bar
`bg rgba(23,23,23,0.85) backdrop-blur-[12px]`, border `rgba(64,64,64,0.5)`, radius 4px.
Inner bar: 26px tall, `bg rgba(0,0,0,0.5)`.
- Filled portion: `bossHpBarColors[currentBar % 7]` color, `opacity: 0.78`, width `currentBar/totalBars * 100%`, transition `width 0.3s, background 0.3s`.
- Center text: boss name + percentage, 11.5px/500, white, `text-shadow: 0 1px 2px rgba(0,0,0,0.9)`.
- Left: gate label `G{n} · {RAID}`, 9px/700/uppercase/sky-400.
- Right: `{currentBar}×`, 11px/700/monospace/white.
- Mech tick marks: for each mechanic with `hpBar <= currentBar`, draw 2px × 100%-height colored line at `left: hpBar/totalBars * 100%`, severity glow.

#### Combined overlay — Primary card
`bg rgba(10,10,10,0.9) backdrop-blur-[12px]`, `border: 1px solid {sevColor}66`, `border-left: 3px solid {sevColor}`, radius `0 5px 5px 0`, `padding: 12px 15px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sevColor}1a`.

**Before mech fires** (barsAway > 0):
- Top row: severity badge + phase label + `↻ {repeatInterval}` (purple, 10px/monospace).
- Mech name: 16.5px/700, white.
- Right: countdown number 23px/700/monospace/severityColor, "bars away" label 9px/`neutral-600`.
- Progress bar (2px, severity color): fills from 0→100% as `1 - barsAway/30`.

**After mech fires** (repeatSecs exists, barsAway ≤ 0):
- Repeat indicator becomes `↻ repeating · {interval}` in purple (urgent = within 10 bars → severity color + mech-pulse animation).
- Mech name dims to `neutral-400`.
- Sub-label: "fired @ {hpBar}× · next @ {nextRepeatBar}×" in 10px/monospace/`neutral-600`.
- Countdown shows "X until repeat" in purple (urgent → severity color).
- Progress bar: purple, fills as cycle progress. Urgent → severity color.

#### Combined overlay — Secondary rows
Each: `bg rgba(10,10,10,0.75) backdrop-blur-[8px]`, `border: 1px solid rgba(64,64,64,0.3)`, `border-left: 2px solid {sevColor}80`, radius `0 4px 4px 0`, `padding: 6px 14px`.
- Left: 4px dot (severity color 70%), mech name 11.5px/`neutral-400`, phase label if any, ↻ if repeating.
- Right: `{hpBar}×` 11px/600/monospace/`neutral-600`.

#### Announcement toast
Appears below overlay when mech fires. `bg {sev.dim}`, `border: 1px solid {sev.border}`, radius 4px, `padding: 5px 12px`, 11px/600/severityColor, centered. Shows "🔊 Announced: {mechName}". Fades after 3s.

---

### 4. Settings

Max-width 620px content area, `padding: 24px 32px`, scrollable.

Three sections: **Text-to-Speech**, **Discord Integration**, **Overlay**.

Each section has a title (14px/700), 1px separator, then fields. Each field has a label (12.5px/500) + optional sub-label (11px/`neutral-400`).

#### TTS section
- Lead time slider: 1–30 bars, suffix " bars".
- Volume: 0–100%, suffix "%".
- Pitch: 0.5–2×, step 0.1, suffix "×".
- "🔊 Test TTS" button: sky-400 style.

#### Discord section
- Webhook URL text input (full width, `bg #0a0a0a`).
- "Test Webhook" button: indigo style (`rgba(88,101,242,*)`), disabled if no URL. On click: POST test embed to webhook URL.
- Embed preview panel: `bg rgba(88,101,242,0.05)`, `border: 1px solid rgba(88,101,242,0.2)`, radius 4px. Shows example embed in monospace with indigo title and orange mech name.

#### Overlay section
- Opacity: 40–100% slider.
- "Always on top" checkbox.
- "Click-through mode" checkbox.

---

## Interactions & Behavior

### TTS firing
```
leadTimeBars = settings.lead (default 10)
fireAt = mechanic.hpBar + leadTimeBars
cycleKey = `${mechanic.id}-${Math.floor((mechanic.hpBar - currentBars) / (mechanic.repeatSecs || 999999))}`

When currentBars drops to <= fireAt AND currentBars > mechanic.hpBar AND cycleKey not in firedSet:
  firedSet.add(cycleKey)
  speak(mechanic.ttsText || mechanic.name, vol, pitch)
  if mechanic.repeatSecs: schedule re-check for next cycle
```

### Discord embed on fire
```json
{
  "embeds": [{
    "title": "{emoji} {mechName}",
    "description": "Phase {n} · HP Bar: {hpBar}/{totalBars} · Repeats: {interval}\n\n{notes}",
    "color": 0xfb923c,
    "footer": { "text": "Mech Announcer · {raid} G{gate}" }
  }]
}
```
Severity emoji: wipe=💀, major=⚠️, normal=ℹ️.

### Encounter auto-detection
```
bossStatus.name → raidGates[name] → "Serca G1" → find gate with raid="Serca" gate=1
→ setSelectedGateId(gate.id)
→ light up LIVE badge
→ reset firedSet
```

### Overlay drag
```
onMouseDown: record offsetX/offsetY from element corner
onMouseMove: setPos({ x: e.clientX - ox, y: e.clientY - oy })
onMouseUp: remove listeners
```

### Repeat cycle math
```
barsSinceFire = mechanic.hpBar - currentBars
cycle = Math.floor(barsSinceFire / mechanic.repeatSecs)
nextRepeatBar = mechanic.hpBar - (cycle + 1) * mechanic.repeatSecs
barsUntilRepeat = currentBars - nextRepeatBar
cycleProgress = 1 - barsUntilRepeat / mechanic.repeatSecs
urgent = barsUntilRepeat <= 10
```

### Animations
```css
@keyframes mech-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.4); }
}
```
Used on: severity dots when urgent, LIVE badge (2s), repeat indicator when urgent (1s).

---

## Tauri Setup

### Two windows (`tauri.conf.json`)
```json
{
  "windows": [
    { "label": "main", "title": "Mech Announcer", "width": 1100, "height": 720 },
    {
      "label": "overlay", "title": "", "transparent": true,
      "decorations": false, "alwaysOnTop": true, "skipTaskbar": true,
      "width": 420, "height": 400, "x": 100, "y": 100
    }
  ]
}
```

### Rust TTS command
```rust
#[tauri::command]
fn speak(text: String, volume: f32, pitch: f32) {
    let mut tts = Tts::default().unwrap();
    tts.set_volume(volume).unwrap();
    tts.set_pitch(pitch).unwrap();
    tts.speak(text, true).unwrap();
}
```

### IPC: send currentBars to overlay window
From the main window (receiving `bossStatus`), forward to the overlay window via Tauri event:
```ts
import { emit } from "@tauri-apps/api/event";
emit("boss-status", { currentBars, totalBars, bossName });
```
Overlay window listens with `listen("boss-status", ...)`.

---

## Design Tokens

### Colors
| Token | Value | Usage |
|---|---|---|
| `bg` | `#0a0a0a` | App background |
| `panel` | `#171717` | Panel backgrounds |
| `elevated` | `#262626` | Inputs, raised elements |
| `border` | `#262626` | Default borders |
| `borderLight` | `#404040` | Modal/elevated borders |
| `text` | `#fafafa` | Primary text |
| `textSec` | `#a3a3a3` | Secondary text |
| `textMut` | `#525252` | Muted/disabled text |
| `accent` | `#38bdf8` | Sky-400, primary accent |
| `accentHover` | `#0ea5e9` | Sky-500 |
| Severity normal | `#38bdf8` | dim `rgba(56,189,248,0.12)` |
| Severity major | `#fb923c` | dim `rgba(251,146,60,0.12)` |
| Severity wipe | `#f87171` | dim `rgba(248,113,113,0.15)` |
| Phase 1 | `#38bdf8` | |
| Phase 2 | `#fb923c` | |
| Phase 3 | `#f87171` | |
| Phase 4 | `#a78bfa` | |
| Repeat/↻ | `#a78bfa` | Purple |
| Live/active | `#4ade80` | Green |
| Discord | `rgba(88,101,242,*)` | Indigo |

### Boss HP bar colors (cycle by `currentBar % 7`)
`["#D16F23", "#9F3930", "#582469", "#2B3A63", "#246977", "#798816", "#E7B826"]`

### Typography
- UI font: `Inter Variable`, sans-serif
- Mono font: `Geist Mono Variable`, monospace (fallback: `ui-monospace`)
- Base size: 14px

### Scrollbars
```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #0a0a0a; }
::-webkit-scrollbar-thumb { background: #404040; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #525252; }
```

### Range inputs
```css
input[type="range"] { -webkit-appearance: none; height: 4px; background: #262626; border-radius: 2px; }
input[type="range"]::-webkit-slider-thumb { width: 14px; height: 14px; background: #38bdf8; border-radius: 50%; border: 2px solid #0a0a0a; box-shadow: 0 0 8px rgba(56,189,248,0.5); }
```

---

## Import / Export
- Export: Tauri file-save dialog → write `raids` array as pretty JSON
- Import: Tauri file-open dialog → parse JSON → merge or replace current raids

---

## Persistence Keys (`@tauri-apps/plugin-store`)
| Key | Value |
|---|---|
| `mech-announcer-raids` | `Gate[]` array |
| `mech-announcer-settings` | `{ lead, vol, pitch, hook, opacity }` |

---

## Files in This Bundle
| File | Description |
|---|---|
| `Mech Announcer.html` | Complete interactive prototype — source of truth for all visual and behavioral specs |
| `README.md` | This document |

Open `Mech Announcer.html` in a browser and interact with all three tabs before building. The prototype is fully functional: HP slider, TTS, phase lines, repeat countdown, draggable overlay, and Discord webhook all work in-browser.
