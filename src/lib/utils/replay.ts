import { mechStore } from "../mech-store.svelte";
import type { CaptureRecord } from "./capture";

export type ReplayMode = "instant" | "realtime";
export type ReplayHandle = { stop: () => void };

// Pumps a fight's records back through the real live pipeline (mechStore.setBossStatus),
// so matching, sticky-gate, swap and overlay broadcasts behave exactly as they did live.
// - "instant": fire every record back to back. Good for matching / swap logic where ORDER
//   is what matters.
// - "realtime": preserve the original gaps (scaled by `speed`, capped at 10s per gap) so
//   the 8s/20s/60s silence tiers actually elapse. Use this to exercise wipe/teardown.
export function replayFight(records: CaptureRecord[], mode: ReplayMode, speed = 1): ReplayHandle {
  let cancelled = false;
  (async () => {
    let prevT: number | null = null;
    for (const r of records) {
      if (cancelled) return;
      if (mode === "realtime" && prevT != null) {
        const wait = Math.min((r.t - prevT) / Math.max(speed, 0.01), 10_000);
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      }
      if (cancelled) return;
      mechStore.setBossStatus(r.d);
      prevT = r.t;
    }
  })();
  return {
    stop: () => {
      cancelled = true;
    }
  };
}
