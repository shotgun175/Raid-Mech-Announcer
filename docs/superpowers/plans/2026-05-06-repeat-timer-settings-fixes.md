# Repeat Timer, Active Mech Row, and Settings Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken bar-based repeat logic with a real-time seconds countdown; add Option A active mech row to the Standard overlay; fix all settings that were saved but never applied; fix fight lifecycle bugs.

**Architecture:** A `setInterval` timer in the overlay page owns the repeat countdown — it starts when a hp+timer mechanic first triggers, keeps ticking through phase gaps, and fires TTS at `repeatLead` seconds. It passes `activeMech` + `repeatCountdown` down to OLCombined (renamed Standard) as props. The settings window emits `mech:fight-start` on new gate match and `mech:confirm` when the confirm shortcut fires; the overlay listens for both. All four un-applied settings (opacity, autoShowHide, showPhaseLabels, showRepeatTicker) are wired up.

**Tech Stack:** Svelte 5 runes, TypeScript, Tauri v2 Rust. No test framework — verification is `npm run check` + manual smoke test.

---

## File Map

| File | Change |
|------|--------|
| `src/lib/mech-types.ts` | Add `ttsRate: number` to `MechSettings`; add `activeMech`/`repeatCountdown` to `OverlayProps` |
| `src/lib/mech-store.svelte.ts` | Add `ttsRate` default; fix `isDead` path; add `broadcastFightStart`; gate `broadcastOverlayControl` on `autoShowHide` |
| `src/lib/utils/tts.ts` | Add `rate` parameter |
| `src-tauri/src/tts_cmd.rs` | Add `rate: f64`; pass `--rate` to edge-tts; use rate for SAPI |
| `src-tauri/capabilities/desktop.json` | Add `core:window:allow-set-opacity` |
| `src/routes/(app)/mech-settings/+page.svelte` | Add Speech Rate slider; emit `mech:confirm` from confirm shortcut handler |
| `src/routes/(mech)/mech-overlay/+page.svelte` | Add timer state/logic; active mech detection; listeners for `mech:fight-start`, `mech:confirm`; opacity effect; remove bar-based repeat block |
| `src/lib/components/mech/overlays/_shared.ts` | Add `activeMech` and `repeatCountdown` to `OverlayProps` |
| `src/lib/components/mech/overlays/OLCombined.svelte` | Rename to Standard in label; add active row; strip bars-based `repeatState`; gate `showPhaseLabels` + `showRepeatTicker` |
| `src/lib/components/mech/OverlayPreviewPanel.svelte` | Add simulated repeat timer; pass activeMech + repeatCountdown to OLCombined; remove bar-based repeat block |
| All files referencing `"combined"` or `"Combined"` variant name | Rename to `"standard"` / `"Standard"` |

---

## Task 1: Add `ttsRate` to settings — TS side only

**Files:**
- Modify: `src/lib/mech-types.ts`
- Modify: `src/lib/mech-store.svelte.ts`
- Modify: `src/lib/utils/tts.ts`
- Modify: `src/routes/(app)/mech-settings/+page.svelte`

- [ ] **Step 1: Add `ttsRate` to MechSettings interface**

In `src/lib/mech-types.ts`, add after `pitch: number;`:

```typescript
  ttsRate: number;
```

- [ ] **Step 2: Add `ttsRate` default in store**

In `src/lib/mech-store.svelte.ts`, in the `defaults` object inside `loadSettings()`, add after `pitch: 1,`:

```typescript
    ttsRate: 1.0,
```

- [ ] **Step 3: Add `rate` parameter to `speakTts`**

Replace the entire `src/lib/utils/tts.ts` with:

```typescript
import { invoke } from "@tauri-apps/api/core";

/**
 * Speak text using Python edge-tts (neural) with SAPI fallback.
 * rate: 0.5 = half speed, 1.0 = normal, 2.0 = double speed.
 */
export async function speakTts(
  text: string,
  voice: string,
  volume: number,
  pitch: number,
  rate: number = 1.0
): Promise<void> {
  try {
    await invoke("speak_tts", {
      text,
      voice,
      volume: Math.round(Math.max(0, Math.min(100, volume))),
      pitch: Math.max(0.5, Math.min(2.0, pitch)),
      rate: Math.max(0.25, Math.min(4.0, rate))
    });
  } catch {
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.volume = volume / 100;
      u.pitch = pitch;
      u.rate = rate;
      const voices = speechSynthesis.getVoices();
      const lc = voice.toLowerCase();
      const matched =
        voices.find((v) => v.name.toLowerCase().includes(lc) && v.name.toLowerCase().includes("natural")) ??
        voices.find((v) => v.name.toLowerCase().includes(lc)) ??
        null;
      if (matched) u.voice = matched;
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn("TTS fallback error:", e);
    }
  }
}
```

- [ ] **Step 4: Update all `speakTts` call sites to pass `cfg.ttsRate`**

In `src/routes/(mech)/mech-overlay/+page.svelte`, find:
```typescript
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.pitch ?? 1);
```
Replace with:
```typescript
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.pitch ?? 1, cfg.ttsRate ?? 1.0);
```

In `src/lib/components/mech/OverlayPreviewPanel.svelte`, find:
```typescript
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.pitch ?? 1);
```
Replace with:
```typescript
      speakTts(ttsText || name, cfg.voice ?? "Andrew", cfg.vol ?? 80, cfg.pitch ?? 1, cfg.ttsRate ?? 1.0);
```

In `src/routes/(app)/mech-settings/+page.svelte`, find:
```typescript
    speakTts("Saws and Spikes incoming", s.voice, s.vol, s.pitch);
```
Replace with:
```typescript
    speakTts("Saws and Spikes incoming", s.voice, s.vol, s.pitch, s.ttsRate ?? 1.0);
```

- [ ] **Step 5: Add Speech Rate slider to Settings UI**

In `src/routes/(app)/mech-settings/+page.svelte`, find the pitch slider section. After it (look for the closing `</div>` of that section), add:

```svelte
        <!-- Speech Rate -->
        <div class="flex flex-col gap-1">
          <div class="text-sm font-semibold">Speech Rate</div>
          <div class="text-xs text-neutral-400">
            How fast the TTS voice speaks. 1.0× is normal speed.
          </div>
          <div class="flex items-center gap-3 pt-1">
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={s.ttsRate ?? 1.0}
              oninput={(e) => upd("ttsRate", parseFloat((e.target as HTMLInputElement).value))}
              class="h-[3px] flex-1 appearance-none rounded bg-neutral-700 accent-accent-500"
            />
            <div
              class="w-20 shrink-0 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-center font-mono text-sm text-accent-400"
            >
              {(s.ttsRate ?? 1.0).toFixed(1)}×
            </div>
          </div>
        </div>
```

- [ ] **Step 6: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 7: Commit**

```bash
git add src/lib/mech-types.ts src/lib/mech-store.svelte.ts src/lib/utils/tts.ts "src/routes/(app)/mech-settings/+page.svelte" "src/routes/(mech)/mech-overlay/+page.svelte" src/lib/components/mech/OverlayPreviewPanel.svelte
git commit -m "feat: add ttsRate setting — speech rate slider wired to all speakTts calls"
```

---

## Task 2: Wire `ttsRate` into the Rust TTS command

**Files:**
- Modify: `src-tauri/src/tts_cmd.rs`

- [ ] **Step 1: Add `rate` parameter and apply it**

Replace the entire `src-tauri/src/tts_cmd.rs` with:

```rust
use rodio::{Decoder, OutputStream, Sink};
use std::io::Cursor;
use tauri::command;

const ANDREW: &str = "en-US-AndrewNeural";
const JENNY:  &str = "en-US-JennyNeural";

fn voice_id(name: &str) -> &'static str {
    if name.to_lowercase().contains("jenny") { JENNY } else { ANDREW }
}

/// Speak text using Python edge-tts (neural voices) with SAPI fallback.
/// rate: 1.0 = normal, 1.5 = 50% faster, 0.5 = half speed.
#[command]
pub fn speak_tts(text: String, voice: String, volume: u8, pitch: f64, rate: f64) {
    let vid = voice_id(&voice).to_string();
    std::thread::spawn(move || {
        if try_python_edge_tts(&text, &vid, volume, rate) {
            return;
        }
        try_sapi(&text, &voice, volume, rate);
    });
}

/// Try Python edge-tts via subprocess.
fn try_python_edge_tts(text: &str, voice_id: &str, volume: u8, rate: f64) -> bool {
    let temp = std::env::temp_dir().join("mech_tts.mp3");
    let temp_str = temp.to_string_lossy().to_string();

    // edge-tts rate format: "+50%" for 1.5x, "-25%" for 0.75x
    let rate_pct = (rate - 1.0) * 100.0;
    let rate_str = format!("{:+.0}%", rate_pct);

    #[cfg(target_os = "windows")]
    let gen_ok = {
        use std::os::windows::process::CommandExt;
        std::process::Command::new("python")
            .args([
                "-m", "edge_tts",
                "--voice", voice_id,
                "--text", text,
                "--rate", &rate_str,
                "--write-media", &temp_str,
            ])
            .creation_flags(0x08000000)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    };

    #[cfg(not(target_os = "windows"))]
    let gen_ok = std::process::Command::new("python")
        .args(["-m", "edge_tts", "--voice", voice_id, "--text", text, "--rate", &rate_str, "--write-media", &temp_str])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !gen_ok || !temp.exists() {
        return false;
    }

    let vol = (volume as f32 / 100.0).clamp(0.0, 1.0);

    if let Ok(file) = std::fs::read(&temp) {
        if let Ok((_stream, handle)) = OutputStream::try_default() {
            if let Ok(sink) = Sink::try_new(&handle) {
                sink.set_volume(vol);
                if let Ok(decoder) = Decoder::new(Cursor::new(file)) {
                    sink.append(decoder);
                    sink.sleep_until_end();
                    return true;
                }
            }
        }
    }

    false
}

/// Last-resort: Windows SAPI via PowerShell.
fn try_sapi(text: &str, voice: &str, volume: u8, rate: f64) {
    let safe = text.replace('\'', "''");
    let safe_voice = voice.replace('\'', "''").replace('{', "{{").replace('}', "}}");
    // SAPI Rate: -10 (slowest) to +10 (fastest). Map 0.25-4.0 to -10..+10.
    let sapi_rate = ((rate - 1.0) * 8.0).round().clamp(-10.0, 10.0) as i32;
    let script = format!(
        r#"try {{
    Add-Type -AssemblyName System.Speech -ErrorAction Stop
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $v = $s.GetInstalledVoices() | Where-Object {{ $_.VoiceInfo.Name -like '*{safe_voice}*' }} | Select-Object -First 1
    if ($v) {{ $s.SelectVoice($v.VoiceInfo.Name) }}
    $s.Volume = {volume}; $s.Rate = {sapi_rate}; $s.Speak('{safe}')
}} catch {{}}"#
    );

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let _ = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .creation_flags(0x08000000)
            .spawn();
    }
}

/// List voice sources available on this system.
#[command]
pub fn list_tts_voices() -> Vec<String> {
    let mut out = vec![];

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let py_check = std::process::Command::new("python")
            .args(["-m", "edge_tts", "--list-voices"])
            .creation_flags(0x08000000)
            .output();
        match py_check {
            Ok(o) if o.status.success() => {
                let count = String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .filter(|l| l.contains("en-US"))
                    .count();
                out.push(format!("✓ Python edge-tts — {} en-US voices available", count));
                out.push("  en-US-AndrewNeural (Male) ← selected when Andrew".into());
                out.push("  en-US-JennyNeural  (Female) ← selected when Jenny".into());
            }
            _ => {
                out.push("✗ Python edge-tts — not installed (run: pip install edge-tts)".into());
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    out.push("✗ Python edge-tts — Windows only in this build".into());

    out.push("---".into());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let script = r#"Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).GetInstalledVoices() | ForEach-Object { "  " + $_.VoiceInfo.Name + " (local SAPI)" }"#;
        if let Ok(o) = std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", script])
            .creation_flags(0x08000000)
            .output()
        {
            for line in String::from_utf8_lossy(&o.stdout).lines() {
                let l = line.trim_end().to_string();
                if !l.is_empty() {
                    out.push(l);
                }
            }
        }
    }

    out
}
```

- [ ] **Step 2: Verify Rust compiles**

```bash
cd src-tauri && cargo check 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tts_cmd.rs
git commit -m "feat: add rate param to speak_tts — wires --rate to edge-tts and SAPI"
```

---

## Task 3: Fix settings that were saved but never applied

**Files:**
- Modify: `src-tauri/capabilities/desktop.json`
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`
- Modify: `src/lib/components/mech/overlays/OLCombined.svelte`
- Modify: `src/lib/mech-store.svelte.ts`

- [ ] **Step 1: Add opacity permission to capabilities**

In `src-tauri/capabilities/desktop.json`, add to the `permissions` array:

```json
    "core:window:allow-set-opacity",
```

- [ ] **Step 2: Apply `opacity` reactively in overlay**

In `src/routes/(mech)/mech-overlay/+page.svelte`, after the existing `$effect` for `setAlwaysOnTop`, add:

```svelte
  $effect(() => {
    getCurrentWebviewWindow()
      .setOpacity(mechStore.mechSettings.opacity / 100)
      .catch(() => {});
  });
```

- [ ] **Step 3: Gate `autoShowHide` in the store's overlay control broadcasts**

In `src/lib/mech-store.svelte.ts`, find (inside `setBossStatus`, the fight-start show call):
```typescript
      broadcastBossStatus({ ...data, gateId: liveGateId ?? null });
      if (mechSettings.autoShowHide) broadcastOverlayControl(true);
```

If it currently reads `broadcastOverlayControl(true)` without the guard, replace with:
```typescript
      broadcastBossStatus({ ...data, gateId: liveGateId ?? null });
      if (mechSettings.autoShowHide) broadcastOverlayControl(true);
```

Find the tier-1 heartbeat hide call inside `startHeartbeat`:
```typescript
        () => {
          liveBar = null;
          liveTotalBars = null;
          liveBossName = null;
          broadcastBossStatus(null);
          broadcastOverlayControl(false);
        },
```
Replace with:
```typescript
        () => {
          liveBar = null;
          liveTotalBars = null;
          liveBossName = null;
          broadcastBossStatus(null);
          if (mechSettings.autoShowHide) broadcastOverlayControl(false);
        },
```

- [ ] **Step 4: Gate `showPhaseLabels` in OLCombined**

In `src/lib/components/mech/overlays/OLCombined.svelte`, add mechStore import at the top of the `<script>` block (after existing imports):

```typescript
  import { mechStore } from '$lib/mech-store.svelte';
```

Find (primary card phase label):
```svelte
            {#if next.phase}
```
Replace with:
```svelte
            {#if next.phase && mechStore.mechSettings.showPhaseLabels}
```

Find (secondary row phase label):
```svelte
        {#if m.phase}
```
Replace with:
```svelte
        {#if m.phase && mechStore.mechSettings.showPhaseLabels}
```

- [ ] **Step 5: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 6: Commit**

```bash
git add src-tauri/capabilities/desktop.json src/lib/mech-store.svelte.ts src/lib/components/mech/overlays/OLCombined.svelte "src/routes/(mech)/mech-overlay/+page.svelte"
git commit -m "fix: wire opacity, autoShowHide, showPhaseLabels — all now apply immediately without restart"
```

---

## Task 4: Fix fight lifecycle — isDead tier-1 and `mech:fight-start` event

**Files:**
- Modify: `src/lib/mech-store.svelte.ts`
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`

- [ ] **Step 1: Add `broadcastFightStart` to store**

In `src/lib/mech-store.svelte.ts`, add after `broadcastRaids`:

```typescript
async function broadcastFightStart() {
  try {
    await emit("mech:fight-start", null);
  } catch {}
}
```

- [ ] **Step 2: Fix `isDead` hard-reset — keep liveGateId, start 60s timer**

Find the `isDead` block in `setBossStatus`:
```typescript
      if (!data || data.isDead) {
        stopHeartbeat();
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        liveGateId = null;
        broadcastBossStatus(null);
        broadcastOverlayControl(false);
        return;
      }
```
Replace with:
```typescript
      if (!data || data.isDead) {
        liveBar = null;
        liveTotalBars = null;
        liveBossName = null;
        broadcastBossStatus(null);
        if (mechSettings.autoShowHide) broadcastOverlayControl(false);
        // Keep liveGateId — phase transitions send isDead=true but the fight continues.
        // The 60s tier-2 timer clears liveGateId if no HP data resumes.
        if (gateResetTimer) clearTimeout(gateResetTimer);
        gateResetTimer = setTimeout(() => { liveGateId = null; }, GATE_RESET_MS);
        return;
      }
```

- [ ] **Step 3: Emit fight-start when gate first matched**

Find:
```typescript
      if (!liveGateId) {
        const matched = bestGateMatch(raids, data.name);
        if (matched) liveGateId = matched.id;
      }
```
Replace with:
```typescript
      if (!liveGateId) {
        const matched = bestGateMatch(raids, data.name);
        if (matched) {
          liveGateId = matched.id;
          broadcastFightStart();
        }
      }
```

- [ ] **Step 4: Replace gateId-change reset with fight-start listener in overlay**

In `src/routes/(mech)/mech-overlay/+page.svelte`, remove:
```svelte
  $effect(() => {
    gateId;
    lastFiredKey = new Set();
  });
```

In `onMount`, add alongside existing listeners:
```typescript
    const unFightStart = await listen("mech:fight-start", () => {
      lastFiredKey = new Set();
    });
```

Add `unFightStart` to `unlisteners.push(...)`.

- [ ] **Step 5: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 6: Commit**

```bash
git add src/lib/mech-store.svelte.ts "src/routes/(mech)/mech-overlay/+page.svelte"
git commit -m "fix: isDead treated as tier-1 (keeps liveGateId 60s); mech:fight-start resets announcement keys"
```

---

## Task 5: Remove broken bar-based repeat TTS

**Files:**
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`
- Modify: `src/lib/components/mech/OverlayPreviewPanel.svelte`

- [ ] **Step 1: Remove from overlay**

In `src/routes/(mech)/mech-overlay/+page.svelte`, in the announcement `$effect`, remove the entire block:

```typescript
      // Repeat cycle: fires once per cycle as bar enters the repeatLead window
      if (m.repeatSecs && bar < m.hpBar) {
        const H = m.hpBar;
        const R = m.repeatSecs;
        const n = Math.ceil((H - bar) / R);
        const triggerBar = H - n * R;
        const repeatKey = `${m.id}-repeat-${n}`;
        if (
          triggerBar >= 0 &&
          bar > triggerBar &&
          bar <= triggerBar + cfg.repeatLead &&
          !lastFiredKey.has(repeatKey)
        ) {
          lastFiredKey.add(repeatKey);
          const secsLeft = cfg.repeatLead;
          announce(
            m.name, m.severity, m.ttsEnabled,
            `${m.ttsText || m.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
          );
        }
      }
```

- [ ] **Step 2: Remove from OverlayPreviewPanel**

In `src/lib/components/mech/OverlayPreviewPanel.svelte`, remove the same pattern:

```typescript
      // Repeat cycle: fires once per cycle as _simBar enters the repeatLead window
      if (m.repeatSecs && _simBar < m.hpBar) {
        const H = m.hpBar;
        const R = m.repeatSecs;
        const n = Math.ceil((H - _simBar) / R);
        const triggerBar = H - n * R;
        const repeatKey = `${m.id}-repeat-${n}`;
        if (
          triggerBar >= 0 &&
          _simBar > triggerBar &&
          _simBar <= triggerBar + cfg.repeatLead &&
          !firedSet.has(repeatKey)
        ) {
          firedSet.add(repeatKey);
          const secsLeft = cfg.repeatLead;
          fireAnnouncement(
            m.name, m.severity, m.ttsEnabled,
            `${m.ttsText || m.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
          );
        }
      }
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 4: Commit**

```bash
git add "src/routes/(mech)/mech-overlay/+page.svelte" src/lib/components/mech/OverlayPreviewPanel.svelte
git commit -m "fix: remove incorrect bar-based repeat TTS — replaced by real-time timer in next task"
```

---

## Task 6: Add real-time repeat timer to overlay page

**Files:**
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`
- Modify: `src/routes/(app)/mech-settings/+page.svelte`

- [ ] **Step 1: Add timer state and helper functions**

In `src/routes/(mech)/mech-overlay/+page.svelte`, add the `Mechanic` type import. Find:
```typescript
  import type { BossStatusData, Gate, MechSettings } from "$lib/mech-types";
```
Replace with:
```typescript
  import type { BossStatusData, Gate, Mechanic, MechSettings } from "$lib/mech-types";
```

After `let lastFiredKey = new Set<string>();`, add:

```typescript
  let activeMech = $state<Mechanic | null>(null);
  let repeatCountdown = $state<number | null>(null);
  let repeatTimerId: ReturnType<typeof setInterval> | null = null;
  let repeatAnnouncedThisCycle = false;

  function startRepeatTimer(mech: Mechanic) {
    if (repeatTimerId) { clearInterval(repeatTimerId); repeatTimerId = null; }
    activeMech = mech;
    repeatCountdown = mech.repeatSecs!;
    repeatAnnouncedThisCycle = false;
    repeatTimerId = setInterval(() => {
      if (repeatCountdown === null || activeMech === null) return;
      repeatCountdown--;
      if (repeatCountdown <= 0) {
        repeatCountdown = activeMech.repeatSecs!;
        repeatAnnouncedThisCycle = false;
      }
      const cfg = mechStore.mechSettings;
      if (!repeatAnnouncedThisCycle && repeatCountdown > 0 && repeatCountdown <= cfg.repeatLead) {
        repeatAnnouncedThisCycle = true;
        const secsLeft = repeatCountdown;
        announce(
          activeMech.name, activeMech.severity, activeMech.ttsEnabled,
          `${activeMech.ttsText || activeMech.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
        );
      }
    }, 1000);
  }

  function clearRepeatTimer() {
    if (repeatTimerId) { clearInterval(repeatTimerId); repeatTimerId = null; }
    activeMech = null;
    repeatCountdown = null;
    repeatAnnouncedThisCycle = false;
  }
```

- [ ] **Step 2: Detect active hp+timer mechanic in the HP event `$effect`**

In the announcement `$effect`, after the `gate.mechanics.forEach(...)` closing brace, add:

```typescript
    // Detect the most recently triggered hp+timer mechanic; reset timer when it changes
    const newActive =
      [...gate.mechanics]
        .filter((m) => m.repeatSecs != null && m.hpBar != null && bar < (m.hpBar ?? 0))
        .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
        .at(-1) ?? null;
    if (newActive?.id !== activeMech?.id) {
      if (newActive) startRepeatTimer(newActive);
      else clearRepeatTimer();
    }
```

- [ ] **Step 3: Wire fight-start to clear timer; add confirm listener**

Update the `mech:fight-start` listener (added in Task 4):
```typescript
    const unFightStart = await listen("mech:fight-start", () => {
      lastFiredKey = new Set();
      clearRepeatTimer();
    });
```

Add a `mech:confirm` listener:
```typescript
    const unConfirm = await listen("mech:confirm", () => {
      if (activeMech) {
        repeatCountdown = activeMech.repeatSecs!;
        repeatAnnouncedThisCycle = false;
      }
    });
```

Add `unConfirm` to `unlisteners.push(...)`.

In `onDestroy`, add `clearRepeatTimer();`.

- [ ] **Step 4: Emit `mech:confirm` from confirm shortcut in settings**

In `src/routes/(app)/mech-settings/+page.svelte`, inside `registerConfirmShortcut`, find:
```typescript
        if (next) mechStore.confirmMech(next.id);
```
Replace with:
```typescript
        if (next) mechStore.confirmMech(next.id);
        emit("mech:confirm", null).catch(() => {});
```

- [ ] **Step 5: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 6: Commit**

```bash
git add "src/routes/(mech)/mech-overlay/+page.svelte" "src/routes/(app)/mech-settings/+page.svelte"
git commit -m "feat: real-time repeat countdown in overlay — TTS at repeatLead secs, confirm shortcut resyncs clock"
```

---

## Task 7: Add active mech row (Option A) to OLCombined; strip old repeat math

**Files:**
- Modify: `src/lib/components/mech/overlays/_shared.ts`
- Modify: `src/lib/components/mech/overlays/OLCombined.svelte`
- Modify: `src/routes/(mech)/mech-overlay/+page.svelte`

- [ ] **Step 1: Add props to `OverlayProps`**

In `src/lib/components/mech/overlays/_shared.ts`, replace the `OverlayProps` interface with:

```typescript
export interface OverlayProps {
  mechanics: Mechanic[];
  currentBar: number;
  totalBars: number;
  gateName: string;
  bossName?: string;
  activeMech?: Mechanic | null;
  repeatCountdown?: number | null;
}
```

Add the `Mechanic` import at the top:
```typescript
import type { Mechanic } from "$lib/mech-types";
```

- [ ] **Step 2: Rewrite the OLCombined `<script>` block**

Replace the entire `<script lang="ts">` block in `src/lib/components/mech/overlays/OLCombined.svelte` with:

```svelte
<script lang="ts">
  import { PHASE_COLORS, SEVERITY, formatTimer } from "$lib/mech-constants";
  import MechBadge from "../MechBadge.svelte";
  import { upcomingFrom, hpBarColor, type OverlayProps } from "./_shared";
  import { mechStore } from "$lib/mech-store.svelte";

  let {
    mechanics,
    currentBar,
    totalBars,
    bossName = "",
    activeMech = null,
    repeatCountdown = null
  }: OverlayProps = $props();

  const upcoming = $derived(upcomingFrom(mechanics, currentBar).slice(0, 4));
  const next = $derived(upcoming[0] ?? null);
  const rest = $derived(upcoming.slice(1));
  const sev = $derived(next ? SEVERITY[next.severity] : null);
  const barColor = $derived(hpBarColor(currentBar, totalBars));
  const pct = $derived((currentBar / totalBars) * 100);
  const barsAway = $derived(next ? currentBar - (next.hpBar ?? 0) : 0);
  const progress = $derived(next ? Math.min(1, Math.max(0, 1 - barsAway / 30)) : 0);

  const showActiveMech = $derived(
    activeMech != null && repeatCountdown != null && mechStore.mechSettings.showRepeatTicker
  );
  const repeatUrgent = $derived(
    repeatCountdown != null &&
    repeatCountdown > 0 &&
    repeatCountdown <= (mechStore.mechSettings.repeatLead ?? 5)
  );
</script>
```

- [ ] **Step 3: Replace the OLCombined template and style**

Replace everything after `</script>` in `OLCombined.svelte` with:

```svelte
<div style="display: flex; flex-direction: column; gap: 4px; width: 400px; font-family: Inter, sans-serif;">
  <!-- Boss HP bar -->
  <div
    style="background: rgba(23,23,23,0.85); backdrop-filter: blur(12px); border: 1px solid rgba(64,64,64,0.5); border-radius: 4px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.7);"
  >
    <div
      style="position: relative; height: 30px; background: rgba(0,0,0,0.5); border-bottom: 1px solid rgba(0,0,0,0.5);"
    >
      <div
        style="position: absolute; inset: 0; background: {barColor}; opacity: 0.78; width: {pct}%; transition: width 0.3s, background 0.3s;"
      ></div>
      <div
        style="position: absolute; inset: 0; display: flex; align-items: center; padding: 0 9px; gap: 8px; text-shadow: 0 1px 2px rgba(0,0,0,0.9);"
      >
        <span
          style="flex: 1; min-width: 0; font-size: 13px; color: white; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{bossName}</span
        >
        <span
          style="font-size: 12px; font-family: ui-monospace, monospace; color: white; font-weight: 600; white-space: nowrap; flex-shrink: 0; opacity: 0.85;"
          >{pct.toFixed(1)}%&nbsp;·&nbsp;{currentBar}×</span
        >
      </div>
      {#each mechanics.filter((m) => m.hpBar != null && m.hpBar <= currentBar) as m (m.id)}
        {@const ms = SEVERITY[m.severity]}
        <div
          style="position: absolute; left: {((m.hpBar ?? 0) / totalBars) * 100}%; top: 0; width: 2px; height: 100%; background: {ms.color}; box-shadow: 0 0 6px {ms.color};"
        ></div>
      {/each}
    </div>
  </div>

  <!-- Active repeating mechanic row (Option A) -->
  {#if showActiveMech && activeMech}
    <div
      style="background: rgba(10,10,10,0.9); border: 1px solid rgba(167,139,250,{repeatUrgent ? '0.5' : '0.22'}); border-left: 3px solid #a78bfa; border-radius: 0 4px 4px 0; padding: 7px 14px; display: flex; align-items: center; gap: 8px;"
    >
      <span
        style="font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: #a78bfa; text-transform: uppercase; background: rgba(167,139,250,0.12); border: 1px solid rgba(167,139,250,0.28); border-radius: 3px; padding: 1px 5px; flex-shrink: 0;"
        >active</span
      >
      <div
        style="width: 5px; height: 5px; border-radius: 50%; background: #a78bfa; flex-shrink: 0; {repeatUrgent
          ? 'animation: mech-pulse 0.7s infinite;'
          : 'opacity: 0.5;'}"
      ></div>
      <span
        style="font-size: 12.5px; font-weight: 600; color: #c4b5fd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >{activeMech.name}</span
      >
      <span style="font-size: 11px; color: #525252; font-family: ui-monospace, monospace; flex-shrink: 0;">↻</span>
      <span
        style="font-size: 15px; font-family: ui-monospace, monospace; font-weight: 700; color: {repeatUrgent
          ? '#f87171'
          : '#a78bfa'}; flex-shrink: 0;"
        >{formatTimer(repeatCountdown)}</span
      >
    </div>
  {/if}

  <!-- Primary card: next upcoming mechanic -->
  {#if next && sev}
    <div
      style="background: rgba(10,10,10,0.9); backdrop-filter: blur(12px); border: 1px solid {sev.color}66; border-left: 3px solid {sev.color}; border-radius: 0 5px 5px 0; padding: 12px 15px; box-shadow: 0 8px 32px rgba(0,0,0,0.7), 0 0 24px {sev.color}1a;"
    >
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 9px;">
        <div style="min-width: 0; flex: 1;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap;">
            <MechBadge label={sev.label} color={sev.color} bg={sev.dim} border={sev.border} small />
            {#if next.phase && mechStore.mechSettings.showPhaseLabels}
              <span
                style="font-size: 10px; color: {PHASE_COLORS[next.phase]}; font-weight: 700; letter-spacing: 0.08em;"
                >PHASE {next.phase}</span
              >
            {/if}
            {#if next.repeatSecs}
              <span style="font-size: 10px; color: #a78bfa; font-family: ui-monospace, monospace;">
                ↻ {formatTimer(next.repeatSecs)}
              </span>
            {/if}
          </div>
          <div style="display: flex; align-items: baseline; gap: 7px; line-height: 1.15;">
            <span style="font-size: 16.5px; font-weight: 700; color: #fafafa; letter-spacing: -0.01em;"
              >{next.name}</span
            >
            {#if next.hpBar != null}
              <span style="font-size: 14px; color: #6b6b6b; font-family: ui-monospace, monospace; font-weight: 500;"
                >· {next.hpBar}×</span
              >
            {/if}
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; margin-left: 12px;">
          <div
            style="font-size: 23px; font-family: ui-monospace, monospace; font-weight: 700; color: {sev.color}; line-height: 1;"
          >
            {barsAway <= 0 ? "NOW" : barsAway}
          </div>
          <div
            style="font-size: 9px; color: #525252; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px;"
          >
            {barsAway === 0 ? "incoming" : "bars away"}
          </div>
        </div>
      </div>
      <div style="height: 2px; background: rgba(255,255,255,0.06); border-radius: 1px; overflow: hidden;">
        <div
          style="height: 100%; width: {Math.min(100, progress * 100)}%; background: {sev.color}; transition: width 0.3s;"
        ></div>
      </div>
    </div>
  {/if}

  <!-- Secondary rows -->
  {#each rest as m (m.id)}
    {@const s = SEVERITY[m.severity]}
    <div
      style="background: rgba(10,10,10,0.75); backdrop-filter: blur(8px); border: 1px solid rgba(64,64,64,0.3); border-left: 2px solid {s.color}80; border-radius: 0 4px 4px 0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center;"
    >
      <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
        <div
          style="width: 4px; height: 4px; border-radius: 50%; background: {s.color}; opacity: 0.7; flex-shrink: 0;"
        ></div>
        <span
          style="font-size: 11.5px; color: #a3a3a3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
          >{m.name}</span
        >
        {#if m.phase && mechStore.mechSettings.showPhaseLabels}
          <span
            style="font-size: 9px; color: {PHASE_COLORS[m.phase]}; opacity: 0.8; font-family: ui-monospace, monospace;"
            >P{m.phase}</span
          >
        {/if}
        {#if m.repeatSecs}
          <span style="font-size: 9px; color: #a78bfa; font-family: ui-monospace, monospace;">↻</span>
        {/if}
      </div>
      <div style="display: flex; align-items: baseline; gap: 4px; flex-shrink: 0;">
        <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #525252; font-weight: 600;"
          >{m.hpBar}</span
        >
        <span style="font-size: 9px; color: #525252;">×</span>
      </div>
    </div>
  {/each}
</div>

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
```

- [ ] **Step 4: Pass new props from overlay page to OLCombined**

In `src/routes/(mech)/mech-overlay/+page.svelte`, find the OLCombined component usage (currently `variant === "combined"` — will be updated in Task 9 rename, but update here for the props):

```svelte
      <OLCombined
        mechanics={gate.mechanics}
        currentBar={displayBar}
        {totalBars}
        {gateName}
        bossName={displayBossName}
        {activeMech}
        {repeatCountdown}
      />
```

- [ ] **Step 5: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/mech/overlays/_shared.ts src/lib/components/mech/overlays/OLCombined.svelte "src/routes/(mech)/mech-overlay/+page.svelte"
git commit -m "feat: Option A active mech row in Standard overlay — live ↻ countdown, urgent pulse at repeatLead"
```

---

## Task 8: Add simulated repeat timer to OverlayPreviewPanel

**Files:**
- Modify: `src/lib/components/mech/OverlayPreviewPanel.svelte`

- [ ] **Step 1: Add timer state, helpers, and detection**

In `src/lib/components/mech/OverlayPreviewPanel.svelte`, add after `let firedSet = new Set<string>();`:

```typescript
  let activeMechSim = $state<import('$lib/mech-types').Mechanic | null>(null);
  let repeatCountdownSim = $state<number | null>(null);
  let repeatTimerSim: ReturnType<typeof setInterval> | null = null;
  let repeatAnnouncedSim = false;

  function startSimTimer(mech: import('$lib/mech-types').Mechanic) {
    if (repeatTimerSim) { clearInterval(repeatTimerSim); repeatTimerSim = null; }
    activeMechSim = mech;
    repeatCountdownSim = mech.repeatSecs!;
    repeatAnnouncedSim = false;
    repeatTimerSim = setInterval(() => {
      if (repeatCountdownSim === null || activeMechSim === null) return;
      repeatCountdownSim--;
      if (repeatCountdownSim <= 0) {
        repeatCountdownSim = activeMechSim.repeatSecs!;
        repeatAnnouncedSim = false;
      }
      const cfg = mechStore.mechSettings;
      if (!repeatAnnouncedSim && repeatCountdownSim > 0 && repeatCountdownSim <= cfg.repeatLead) {
        repeatAnnouncedSim = true;
        const secsLeft = repeatCountdownSim;
        fireAnnouncement(
          activeMechSim.name, activeMechSim.severity, activeMechSim.ttsEnabled,
          `${activeMechSim.ttsText || activeMechSim.name} in ${secsLeft} second${secsLeft === 1 ? '' : 's'}`
        );
      }
    }, 1000);
  }

  function clearSimTimer() {
    if (repeatTimerSim) { clearInterval(repeatTimerSim); repeatTimerSim = null; }
    activeMechSim = null;
    repeatCountdownSim = null;
    repeatAnnouncedSim = false;
  }
```

In the existing announcement `$effect`, after the `gate.mechanics.forEach(...)` closing brace, add:

```typescript
    const newActive =
      [...gate.mechanics]
        .filter((m) => m.repeatSecs != null && m.hpBar != null && _simBar < (m.hpBar ?? 0))
        .sort((a, b) => (a.hpBar ?? 0) - (b.hpBar ?? 0))
        .at(-1) ?? null;
    if (newActive?.id !== activeMechSim?.id) {
      if (newActive) startSimTimer(newActive);
      else clearSimTimer();
    }
```

In the gate-reset `$effect`, add `clearSimTimer()`:
```typescript
  $effect(() => {
    if (gate) {
      _simBar = gate.totalBars;
      firedSet = new Set();
      clearSimTimer();
    }
  });
```

Add an `onDestroy` import and call if not already present:
```typescript
  import { onDestroy } from 'svelte';
  onDestroy(() => { clearSimTimer(); });
```

- [ ] **Step 2: Pass timer props to OLCombined in preview**

Find the OLCombined usage in the variant conditional and add props:

```svelte
          <OLCombined
            mechanics={gate.mechanics}
            currentBar={simBar}
            totalBars={gate.totalBars}
            {gateName}
            {bossName}
            activeMech={activeMechSim}
            repeatCountdown={repeatCountdownSim}
          />
```

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/mech/OverlayPreviewPanel.svelte
git commit -m "feat: simulated repeat timer in Overlay Preview — matches live overlay behaviour"
```

---

## Task 9: Rename "Combined" → "Standard" everywhere

**Files:** Any file referencing `"combined"` as a variant ID or `"Combined"` as a label.

- [ ] **Step 1: Find all occurrences**

```bash
grep -rn "combined\|Combined" src/ --include="*.ts" --include="*.svelte"
```

- [ ] **Step 2: Apply replacements**

Key locations:
- `src/lib/mech-store.svelte.ts` — default `overlayVariant: "combined"` → `"standard"`
- `src/lib/components/mech/OverlayPreviewPanel.svelte` — `{ id: "combined", label: "★ Combined" }` → `{ id: "standard", label: "★ Standard" }` and `{#if variant === "combined"}` → `"standard"`
- `src/routes/(mech)/mech-overlay/+page.svelte` — `{#if variant === "combined"}` → `"standard"` (already updated in Task 7 Step 4, verify it's consistent)
- Any TypeScript type unions: `"combined" | ...` → `"standard" | ...`

- [ ] **Step 3: Run check**

```bash
npm run check
```

Expected: `0 ERRORS 0 WARNINGS`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: rename overlay variant Combined → Standard"
```

---

## Task 10: Manual smoke test

- [ ] **TTS Rate:** Settings → Voice → drag Speech Rate to 2.0× → click Test Voice → voice speaks faster
- [ ] **opacity:** Settings → Overlay → drag Opacity to 50% → overlay visibly dims without restart
- [ ] **autoShowHide off:** Toggle off → fight in game → overlay stays hidden at fight start
- [ ] **showPhaseLabels off:** Toggle off on a gate with phased mechanics → Overlay Preview → phase labels gone immediately
- [ ] **showRepeatTicker off:** Toggle off → Overlay Preview past a hp+timer trigger → active row does not appear
- [ ] **isDead mid-gate:** Echidna G2 stagger phase → overlay does NOT reset to waiting state; gate stays matched
- [ ] **No double announcement:** Overlay Preview → mechanic lead window → TTS fires exactly once
- [ ] **Repeat timer:** Overlay Preview past hp+timer trigger → active row appears with live countdown → TTS fires at repeatLead seconds → timer resets to repeatSecs at 0
- [ ] **Confirm re-sync:** While timer running → press confirm shortcut → countdown resets to full repeatSecs
- [ ] **Standard rename:** Settings → Overlay Preview variant selector shows "★ Standard" not "★ Combined"
