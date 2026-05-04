export type Severity = "normal" | "major" | "wipe";
export type TriggerType = "hp" | "timer" | "hp+timer";
export type Phase = 1 | 2 | 3 | 4 | null;

export interface Mechanic {
  id: string;
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
}

export type TtsVoice = "Andrew" | "Jenny";
export type OverlayVariant = "combined" | "compact" | "hud" | "card" | "pill";

export interface MechSettings {
  lead: number;
  repeatLead: number;
  vol: number;
  pitch: number;
  voice: TtsVoice;
  confirmKey: string;
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
}
