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
  {
    id: "thaem-g4", raid: "Thaemine", gate: 4, boss: "Darkness Legion Commander Thaemine",
    bossType: "DEMONIC", weakness: "No Weakness", tauntable: false, totalBars: 350,
    mechanics: [
      { id: "t4-m1", name: "Stagger Check", hpBar: 320, timerSecs: null, phase: 1, triggerType: "hp", repeatSecs: null, severity: "major", ttsEnabled: true, ttsText: "Stagger Check incoming", notes: "Full party stagger. Use stagger skills." },
      { id: "t4-m2", name: "Expert Destroyer", hpBar: 280, timerSecs: null, phase: 1, triggerType: "hp", repeatSecs: null, severity: "wipe", ttsEnabled: true, ttsText: "Expert Destroyer", notes: "Wipe mech. Gather stacks, resolve position." },
      { id: "t4-m3", name: "Phase 2 Transition", hpBar: 220, timerSecs: null, phase: 2, triggerType: "hp", repeatSecs: null, severity: "normal", ttsEnabled: true, ttsText: "Phase 2 starting", notes: "Boss dives. Quick reposition." },
    ],
  },
];
