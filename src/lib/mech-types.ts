export type Difficulty = "Solo" | "Normal" | "Hard" | "Nightmare";
export type Severity = "normal" | "major" | "wipe";
export type TriggerType = "hp" | "timer" | "hp+timer";
export type Phase = 1 | 2 | 3 | 4 | null;

export interface Mechanic {
  id: string;
  key?: string;
  origin: "library" | "custom";
  userEdited: boolean;
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
  difficulties?: Difficulty[];
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
  deletedLibraryKeys?: string[];
}

export type TtsVoice = "Andrew" | "Jenny";
export type OverlayVariant = "standard" | "compact" | "hud" | "card" | "pill";

export interface MechSettings {
  lead: number;
  repeatLead: number;
  vol: number;
  ttsRate: number;
  voice: TtsVoice;
  announcementsEnabled: boolean;
  webhookEnabled: boolean;
  confirmHotkey: string;
  overlayVariant: OverlayVariant;
  hook: string;
  opacity: number;
  alwaysOnTop: boolean;
  clickThrough: boolean;
  autoShowHide: boolean;
  showPhaseLabels: boolean;
  showRepeatTicker: boolean;
}

export interface BossStatusData {
  name: string;
  isDead: boolean;
  currentHp: number;
  maxHp: number;
  currentShield: number;
  totalBars: number;
  currentBars: number;
  gateId?: string | null;
  encourageMessage?: string | null;
}
