export type FontScale = "0" | "1" | "2" | "3";

export interface AppSettings {
  general: {
    accentColor: string;
    scale: FontScale;
    logScale: FontScale;
    betaChannel: boolean;
  };
  shortcuts: {
    hideOverlay: string;
  };
}
