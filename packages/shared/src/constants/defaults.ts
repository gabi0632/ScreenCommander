export const DEFAULTS = {
  BACKEND_PORT: 3000,
  BACKEND_URL: 'http://localhost:3000',
  WS_URL: 'ws://localhost:3000',
  HEARTBEAT_INTERVAL_MS: 10_000,
  MESSAGE_DURATION_SECONDS: 30,
  MESSAGE_FONT_SIZE: 24,
  TRANSITION_DURATION_MS: 500,
  RECONNECT_MAX_DELAY_MS: 30_000,
  MAX_MESSAGE_LENGTH: 500,
  MAX_ACTIVE_OVERLAYS: 5,
  MAX_DISPLAYS: 20,
  TICKER_FONT_SIZE: 28,
  TICKER_SPEED: 5,
  TICKER_SEPARATOR: ' ■ ',
  TICKER_BG_COLOR: '#cc0000',
  TICKER_TEXT_COLOR: '#ffffff',
} as const;

export const DEFAULT_SETTINGS = {
  general: {
    systemName: 'ScreenCommander',
    language: 'he',
    theme: 'dark',
  },
  network: {
    port: 3000,
    backendUrl: 'http://localhost:3000',
  },
  players: {
    autoStart: true,
    kioskMode: true,
    hideCursor: true,
    renderQuality: 'high' as const,
  },
  messages: {
    defaultDuration: 30,
    defaultAnimation: 'fade-in',
    defaultPosition: 'bottom',
    defaultFontSize: 24,
  },
  redAlert: {
    enabled: false,
    watchedCities: ['צפת'],
    targetDisplayIds: 'all' as const,
    displayDuration: 120,
    fontSize: 48,
    fontColor: '#FFFFFF',
    backgroundColor: '#CC0000',
    position: 'top',
    animation: 'fade-in',
    messageTemplate: '🚨 {type}: {cities}',
  },
};
