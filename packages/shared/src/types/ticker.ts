export interface TickerMessage {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TickerConfig {
  id: string;
  isEnabled: boolean;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  speed: number;
  separator: string;
  fontFamily: string;
  showClock: boolean;
  clockPosition: 'left' | 'right';
  targetDisplayIds: string | string[];
  messages: TickerMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface TickerUpdatePayload {
  config: TickerConfig | null;
}
