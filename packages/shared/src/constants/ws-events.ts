export const WS_EVENTS = {
  // Backend → Player
  CONTENT_CHANGE: 'content:change',
  OVERLAY_SHOW: 'overlay:show',
  OVERLAY_DISMISS: 'overlay:dismiss',
  OVERLAY_DISMISS_ALL: 'overlay:dismiss-all',
  DISPLAY_IDENTIFY: 'display:identify',
  PLAYER_RESTART: 'player:restart',
  PLAYER_RELOAD: 'player:reload',

  // Player → Backend
  PLAYER_SCREENSHOT: 'player:screenshot',
  PLAYER_REGISTER: 'player:register',
  PLAYER_HEARTBEAT: 'player:heartbeat',
  PLAYER_ERROR: 'player:error',
  CONTENT_LOADED: 'content:loaded',
  OVERLAY_EXPIRED: 'overlay:expired',

  // Backend → Player (ticker)
  TICKER_UPDATE: 'ticker:update',
  TICKER_CLEAR: 'ticker:clear',

  // Backend → Control Panel (dashboard)
  DISPLAY_STATUS_CHANGED: 'display:status-changed',
  DISPLAY_HEARTBEAT: 'display:heartbeat',
  CONTENT_CHANGED: 'content:changed',
  MESSAGE_SENT: 'message:sent',
  MESSAGE_DISMISSED: 'message:dismissed',
  TICKER_CHANGED: 'ticker:changed',

  // Red Alert (Backend → Control Panel)
  RED_ALERT_TRIGGERED: 'red-alert:triggered',
} as const;
