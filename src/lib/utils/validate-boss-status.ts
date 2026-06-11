import type { BossStatusData } from "../mech-types";

// The PeerJS live share is the app's only external input boundary: payloads
// flow into the reducer, TTS, display interpolation, and the on-disk capture
// buffer. Validate shape and bounds here and drop anything malformed —
// a spoofed or buggy peer must not be able to throw inside the data callback
// or drive the app with absurd values.
const MAX_NAME_LEN = 200;
const MAX_ENCOURAGE_LEN = 500;
const MAX_BARS = 100_000;

export type BossStatusValidation = { ok: true; data: BossStatusData | null } | { ok: false; reason: string };

function finiteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

export function validateBossStatusData(data: unknown): BossStatusValidation {
	if (data === null || data === undefined) {
		return { ok: true, data: null }; // legitimate "no boss / clear" signal
	}
	if (typeof data !== "object" || Array.isArray(data)) {
		return { ok: false, reason: "data is not an object" };
	}
	const o = data as Record<string, unknown>;

	if (typeof o.name !== "string" || o.name.length === 0 || o.name.length > MAX_NAME_LEN) {
		return { ok: false, reason: "invalid name" };
	}
	if (typeof o.isDead !== "boolean") {
		return { ok: false, reason: "invalid isDead" };
	}
	for (const key of ["currentHp", "maxHp", "currentShield"] as const) {
		if (!finiteNumber(o[key])) {
			return { ok: false, reason: `invalid ${key}` };
		}
	}
	for (const key of ["totalBars", "currentBars"] as const) {
		const value = o[key];
		if (!finiteNumber(value) || value < 0 || value > MAX_BARS) {
			return { ok: false, reason: `invalid ${key}` };
		}
	}
	if (o.gateId !== undefined && o.gateId !== null && typeof o.gateId !== "string") {
		return { ok: false, reason: "invalid gateId" };
	}
	if (
		o.encourageMessage !== undefined &&
		o.encourageMessage !== null &&
		(typeof o.encourageMessage !== "string" || o.encourageMessage.length > MAX_ENCOURAGE_LEN)
	) {
		return { ok: false, reason: "invalid encourageMessage" };
	}
	if (o.activePhase !== undefined && o.activePhase !== null && !finiteNumber(o.activePhase)) {
		return { ok: false, reason: "invalid activePhase" };
	}

	// Rebuild a clean object so unknown keys never travel further.
	return {
		ok: true,
		data: {
			name: o.name,
			isDead: o.isDead,
			currentHp: o.currentHp as number,
			maxHp: o.maxHp as number,
			currentShield: o.currentShield as number,
			totalBars: o.totalBars as number,
			currentBars: o.currentBars as number,
			gateId: (o.gateId as string | null | undefined) ?? null,
			encourageMessage: (o.encourageMessage as string | null | undefined) ?? null,
			activePhase: (o.activePhase as number | null | undefined) ?? null
		}
	};
}
