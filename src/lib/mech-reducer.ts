import type { BossStatusData, Difficulty, Gate } from "./mech-types";
import { bestGateMatch } from "./utils/gate-match";
import { gateSwapsBoss, isBossSwapPhase } from "./data/raid-library";
import { filterByDifficulty } from "./utils/difficulty";

export type FightState = {
  liveGateId: string | null;
  liveBar: number | null;
  liveTotalBars: number | null;
  liveBossName: string | null;
  liveEncourageMessage: string | null;
  livePhase: number | null;
};

export type BossEvent =
  | { type: "status"; data: BossStatusData | null }
  | { type: "tier1" }
  | { type: "quiet" }
  | { type: "tier2" };

export type Effect =
  | { type: "broadcast-status"; payload: BossStatusData | null }
  | { type: "encounter-end" }
  | { type: "fight-start" }
  | { type: "overlay-quiet" }
  | { type: "overlay-show" }
  | { type: "overlay-hide" }
  | { type: "start-heartbeat" }
  | { type: "stop-heartbeat" }
  | { type: "log"; msg: string };

export type ReduceCtx = {
  raids: Gate[];
  difficultyMap: Record<string, string>;
  autoShowHide: boolean;
  pickEncourage: () => string;
};

const CLEARED = { liveBar: null, liveTotalBars: null, liveBossName: null } as const;

// Mirrors mech-store recomputeEncourage: returns the next encouragement value given the gate,
// the live bar, and whether we are in a boss-swap phase (no mechs shown -> execute phase).
function nextEncourage(
  current: string | null,
  gate: Gate | undefined,
  currentBars: number | null,
  difficultyMap: Record<string, string>,
  inSwapPhase: boolean,
  pick: () => string
): string | null {
  if (gate == null || currentBars == null || currentBars <= 0) return null;
  const activeDifficulty = (difficultyMap[gate.raid] as Difficulty | undefined) ?? null;
  const mechs = filterByDifficulty(gate.mechanics, activeDifficulty);
  const hasMechs = mechs.some((m) => m.hpBar != null);
  const anyUpcoming = mechs.some((m) => m.hpBar != null && (m.hpBar ?? 0) <= currentBars);
  if (inSwapPhase || (hasMechs && !anyUpcoming)) return current ?? pick();
  return null;
}

/**
 * Pure decision logic for the live boss-status pipeline. Given the current per-fight state
 * and an event (a boss-status update, or one of the three silence-timer ticks), returns the
 * next state plus the side effects the store should dispatch. Ports mech-store setBossStatus
 * and its heartbeat callbacks verbatim. The only injected impurity is pickEncourage (random).
 *
 * `log` effects carry the same diagnostic strings the store used to dbg() inline, so the
 * in-app PeerJS debug strip keeps reading exactly as before.
 */
export function reduceBossStatus(
  state: FightState,
  event: BossEvent,
  ctx: ReduceCtx
): { state: FightState; effects: Effect[] } {
  const hide = (): Effect[] => (ctx.autoShowHide ? [{ type: "overlay-hide" }] : []);

  // --- Silence-timer events ---
  if (event.type === "tier1") {
    // Clear HP only; gate stays. Overlay shows the "phase transition" placeholder.
    return {
      state: { ...state, ...CLEARED },
      effects: [
        { type: "log", msg: `[fight] tier-1 timeout (8s) → clear HP display (gate stays, overlay stays visible)` },
        { type: "broadcast-status", payload: null }
      ]
    };
  }
  if (event.type === "quiet") {
    return {
      state,
      effects: [
        { type: "log", msg: `[fight] silence (20s) → hide placeholder (gate + mech state kept)` },
        { type: "overlay-quiet" },
        ...hide()
      ]
    };
  }
  if (event.type === "tier2") {
    return {
      state: { ...state, liveGateId: null, liveEncourageMessage: null, livePhase: null },
      effects: [
        { type: "log", msg: `[fight] tier-2 timeout (60s) → encounter ended (gate cleared, overlay hidden)` },
        { type: "encounter-end" },
        ...hide()
      ]
    };
  }

  const data = event.data;

  // --- Death / dropout path ---
  if (!data || data.isDead) {
    if (state.liveGateId && data?.isDead) {
      const matched = bestGateMatch(ctx.raids, data.name ?? "");
      if (!matched || matched.id !== state.liveGateId) {
        // Unrelated boss died - keep the live gate, just bump the heartbeat.
        return {
          state,
          effects: [
            { type: "log", msg: `[gate] ignored isDead from unrelated boss "${data.name}" (live gate stays)` },
            { type: "start-heartbeat" }
          ]
        };
      }
      const liveGate = ctx.raids.find((r) => r.id === state.liveGateId);
      if (liveGate && gateSwapsBoss(liveGate.raid, liveGate.gate)) {
        // Swap gate's own boss died - phase transition, not the end. Keep gate + fired keys.
        return {
          state: { ...state, ...CLEARED },
          effects: [
            {
              type: "log",
              msg: `[gate] boss "${data.name}" died — ${liveGate.raid} G${liveGate.gate} swaps bosses, keeping gate`
            },
            { type: "broadcast-status", payload: null },
            { type: "start-heartbeat" }
          ]
        };
      }
    }
    // Real encounter end / teardown.
    return {
      state: {
        liveGateId: null,
        liveBar: null,
        liveTotalBars: null,
        liveBossName: null,
        liveEncourageMessage: null,
        livePhase: null
      },
      effects: [
        { type: "log", msg: `[fight] end → boss "${data?.name ?? "null"}" cleared (gate cleared, overlay hidden)` },
        { type: "stop-heartbeat" },
        { type: "broadcast-status", payload: null },
        { type: "encounter-end" },
        ...hide()
      ]
    };
  }

  // --- Live status path ---
  const effects: Effect[] = [];
  const next: FightState = {
    ...state,
    liveBar: data.currentBars,
    liveTotalBars: data.totalBars,
    liveBossName: data.name
  };

  if (!next.liveGateId) {
    const matched = bestGateMatch(ctx.raids, data.name);
    if (matched) {
      next.liveGateId = matched.id;
      effects.push({
        type: "log",
        msg: `[gate] matched boss "${data.name}" → ${matched.raid} G${matched.gate} (${matched.id})`
      });
      effects.push({ type: "fight-start" });
    } else {
      effects.push({ type: "log", msg: `[gate] NO MATCH for boss "${data.name}" — overlay won't fire mechs` });
    }
  } else {
    const candidate = bestGateMatch(ctx.raids, data.name);
    if (candidate && candidate.id !== next.liveGateId) {
      effects.push({
        type: "log",
        msg: `[gate] boss "${data.name}" resolves to a different gate (${candidate.raid} G${candidate.gate}) → re-match`
      });
      next.liveGateId = candidate.id;
      next.liveEncourageMessage = null;
      effects.push({ type: "fight-start" });
    }
  }

  const liveGate = next.liveGateId ? ctx.raids.find((r) => r.id === next.liveGateId) : undefined;
  const swapPhase = liveGate ? isBossSwapPhase(liveGate, data.name) : false;
  const prevEnc = next.liveEncourageMessage;
  next.liveEncourageMessage = nextEncourage(
    prevEnc,
    liveGate,
    data.currentBars,
    ctx.difficultyMap,
    swapPhase,
    ctx.pickEncourage
  );
  if (prevEnc == null && next.liveEncourageMessage != null) {
    effects.push({ type: "log", msg: `[overlay] encouragement → "${next.liveEncourageMessage}"` });
  }

  effects.push({
    type: "broadcast-status",
    payload: { ...data, gateId: next.liveGateId ?? null, encourageMessage: next.liveEncourageMessage }
  });
  if (ctx.autoShowHide) effects.push({ type: "overlay-show" });
  effects.push({ type: "start-heartbeat" });

  return { state: next, effects };
}
