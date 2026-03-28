export interface AppSettings {
  general: {
    systemName: string;
    language: string;
    theme: string;
  };
  network: {
    port: number;
    backendUrl: string;
  };
  players: {
    autoStart: boolean;
    kioskMode: boolean;
    hideCursor: boolean;
    renderQuality: 'low' | 'medium' | 'high';
  };
  messages: {
    defaultDuration: number;
    defaultAnimation: string;
    defaultPosition: string;
    defaultFontSize: number;
  };
  redAlert: {
    enabled: boolean;
    watchedCities: string[];
    targetDisplayIds: string[] | 'all';
    displayDuration: number;
    fontSize: number;
    fontColor: string;
    backgroundColor: string;
    position: string;
    animation: string;
    messageTemplate: string;
  };
  kiosk: {
    adminPasswordHash: string;
    autoRelockTimeoutSeconds: number;
    unlockKeyCombination: string;
  };
}
