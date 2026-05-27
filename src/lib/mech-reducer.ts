import type { BossStatusData, Difficulty, Gate } from "./mech-types";
import { bestGateMatch, isFinalGateOfRaid } from "./utils/gate-match";
import { gateSwapsBoss, isBossSwapPhase } from "./data/raid-library";
import { filterByDifficulty } from "./utils/difficulty";

export type FightState = {
  liveGateId: string | null;
  liveBar: number | null;
  liveTotalBars: number | null;
  liveBossName: string | null;
  liveEncourageMessage: string | null;
  livePhase: number | null;
  // True once the live boss has reported a death (isDead) and hasn't since come back alive.
  // Consumed at encounter-end to fire the kill banner; a wipe never sets it (the boss stays alive).
  bossDied: boolean;
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
  | { type: "kill-banner"; variant: "boss-defeated" | "raid-cleared" }
  | { type: "log"; msg: string };

export type ReduceCtx = {
  raids: Gate[];
  difficultyMap: Record<string, string>;
  autoShowHide: boolean;
  pickEncourage: () => string;
};

const CLEARED = { liveBar: null, liveTotalBars: null, liveBossName: null } as const;

// On a cleared fight, which banner to show — "raid-cleared" on the raid's final gate, else
// "boss-defeated". Resolves from the live gate (which survives boss-swaps), so a swap gate like
// Armoche G1 (Echidna → Brelshaza) is credited to G1, not a separately-imported Brelshaza raid.
function killBannerEffect(gateId: string | null, ctx: ReduceCtx): Effect | null {
  if (!gateId) return null;
  const gate = ctx.raids.find((r) => r.id === gateId);
  if (!gate) return null;
  return { type: "kill-banner", variant: isFinalGateOfRaid(ctx.raids, gate) ? "raid-cleared" : "boss-defeated" };
}

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

// A revival is a large upward HP jump on the SAME pool (totalBars unchanged). A third of the
// pool cleanly separates a real revival from bar jitter, and the unchanged-totalBars guard
// keeps the tiny-pool stagger case (which switches pools) from counting as a revival.
function isRevival(prevBar: number | null, prevTotal: number | null, data: BossStatusData): boolean {
  return (
    prevBar != null &&
    prevTotal != null &&
    data.totalBars === prevTotal &&
    data.currentBars - prevBar > data.totalBars / 3
  );
}

function lowestPhase(gate: Gate | undefined): number | null {
  if (!gate) return null;
  const phases = gate.mechanics.map((m) => m.phase).filter((p): p is 1 | 2 | 3 | 4 => p != null);
  return phases.length ? Math.min(...phases) : null;
}

function nextPhaseAfter(gate: Gate | undefined, current: number | null): number | null {
  if (!gate || current == null) return current;
  const higher = gate.mechanics.map((m) => m.phase).filter((p): p is 1 | 2 | 3 | 4 => p != null && p > current);
  return higher.length ? Math.min(...higher) : current;
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
    // If the boss died but the feed never sent its closing null (e.g. LOA dropped right after the
    // kill), the safety-net teardown still banners — a wipe leaves bossDied false, so it won't.
    const banner = state.bossDied ? killBannerEffect(state.liveGateId, ctx) : null;
    return {
      state: { ...state, liveGateId: null, liveEncourageMessage: null, livePhase: null, bossDied: false },
      effects: [
        { type: "log", msg: `[fight] tier-2 timeout (60s) → encounter ended (gate cleared, overlay hidden)` },
        ...(banner ? [banner] : []),
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
        // The current boss died but its name doesn't resolve to the live gate — a swap boss whose
        // name isn't the gate's (Brelshaza in Armoche G1), or a clone/add. Keep the gate and mark
        // the kill pending: a resume (next boss alive) clears it, encounter-end banners on it.
        return {
          state: { ...state, bossDied: true },
          effects: [
            {
              type: "log",
              msg: `[gate] ignored isDead from unrelated boss "${data.name}" (live gate stays, kill pending)`
            },
            { type: "start-heartbeat" }
          ]
        };
      }
      const liveGate = ctx.raids.find((r) => r.id === state.liveGateId);
      if (liveGate && gateSwapsBoss(liveGate.raid, liveGate.gate)) {
        // Swap gate's own boss died - phase transition, not necessarily the end. Keep gate; mark
        // the kill so a true end (feed goes null) banners, while a resume (next boss) clears it.
        return {
          state: { ...state, ...CLEARED, bossDied: true },
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
    // Real encounter end / teardown. A clear if the boss just died (data.isDead) or had died before
    // the feed dropped (state.bossDied); a wipe sets neither, so it gets no banner.
    const cleared = !!data?.isDead || state.bossDied;
    const banner = cleared ? killBannerEffect(state.liveGateId, ctx) : null;
    return {
      state: {
        liveGateId: null,
        liveBar: null,
        liveTotalBars: null,
        liveBossName: null,
        liveEncourageMessage: null,
        livePhase: null,
        bossDied: false
      },
      effects: [
        {
          type: "log",
          msg: `[fight] end → boss "${data?.name ?? "null"}" ${cleared ? "killed" : "lost"} (gate cleared)`
        },
        { type: "stop-heartbeat" },
        ...(banner ? [banner] : []),
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
    liveBossName: data.name,
    bossDied: false // boss is alive in this path — clear any pending kill (swap/clone resumed)
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

  // Phase: seed to the gate's lowest tag on (re)bind, advance on a same-pool revival, else keep.
  if (next.liveGateId !== state.liveGateId) {
    next.livePhase = lowestPhase(liveGate);
  } else if (liveGate && isRevival(state.liveBar, state.liveTotalBars, data)) {
    const advanced = nextPhaseAfter(liveGate, state.livePhase);
    if (advanced !== state.livePhase) {
      next.livePhase = advanced;
      effects.push({
        type: "log",
        msg: `[fight] revival (HP +${data.currentBars - (state.liveBar ?? 0)}) → phase ${advanced}`
      });
    }
  }

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
    payload: {
      ...data,
      gateId: next.liveGateId ?? null,
      encourageMessage: next.liveEncourageMessage,
      activePhase: next.livePhase
    }
  });
  if (ctx.autoShowHide) effects.push({ type: "overlay-show" });
  effects.push({ type: "start-heartbeat" });

  return { state: next, effects };
}
