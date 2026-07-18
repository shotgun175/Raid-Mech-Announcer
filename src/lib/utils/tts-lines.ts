import type { Gate } from "$lib/mech-types";
import { filterByDifficulty, resolveDifficulty } from "./difficulty";

/**
 * The exact set of spoken callout strings for the given raids at the current Timing settings,
 * for pre-generating (warming) the TTS cache. Mirrors the overlay's announce phrasing using the
 * user-configured lead / repeatLead (Settings > Announcements > Timing):
 *   - HP-triggered mechs:        "<text> in <lead> bars"
 *   - repeating/from-pull mechs: "<text> in <repeatLead> seconds"
 *
 * One line per trigger - no speculative variants. The repeat countdown always announces at
 * repeatLead, and the bar countdown announces at lead in the normal case; an off-nominal bar
 * count from a big HP jump is caught by the runtime cache on first occurrence.
 *
 * Skips TTS-disabled mechs and respects each raid's active difficulty. De-duplicated, since the
 * same callout text can appear across mechs/gates.
 */
export function enumerateTtsLines(
  raids: Gate[],
  difficultyMap: Record<string, string>,
  lead: number,
  repeatLead: number
): string[] {
  const bars = Math.max(1, Math.round(lead));
  const secs = Math.max(1, Math.round(repeatLead));
  const lines = new Set<string>();

  for (const gate of raids) {
    const diff = resolveDifficulty(difficultyMap, gate.raid, raids);
    for (const m of filterByDifficulty(gate.mechanics, diff)) {
      if (m.ttsEnabled === false) continue;
      const text = (m.ttsText || m.name).trim();
      if (!text) continue;
      if (m.hpBar != null) lines.add(`${text} in ${bars} bar${bars === 1 ? "" : "s"}`);
      if (m.repeatSecs != null || m.timerSecs != null) lines.add(`${text} in ${secs} second${secs === 1 ? "" : "s"}`);
    }
  }
  return [...lines];
}
