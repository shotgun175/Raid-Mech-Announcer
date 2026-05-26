import { captureAppend } from "$lib/api";
import type { BossStatusData } from "$lib/mech-types";

// Buffers raw boss-status inputs and flushes them to the Rust capture file on a timer,
// so we make at most one invoke per FLUSH_MS instead of one per HP tick. Each line is a
// JSON record: { t: epoch_ms, d: BossStatusData | null }. Fire-and-forget — capture must
// never block or break the live feed, so all errors are swallowed.
const FLUSH_MS = 2_000;

let buffer: string[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.join("\n");
  buffer = [];
  captureAppend(batch).catch(() => {});
}

/** Record one raw boss-status input (the exact value passed to setBossStatus). */
export function recordBossStatus(data: BossStatusData | null) {
  buffer.push(JSON.stringify({ t: Date.now(), d: data }));
  if (!timer) timer = setInterval(flush, FLUSH_MS);
}
