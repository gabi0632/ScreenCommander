import type { ConnectionType } from '../enums/connection-type';
import type { DisplayStatus } from '../enums/display-status';

export interface Display {
  id: string;
  hardwareId: string;
  name: string;
  monitorIndex: number;
  width: number;
  height: number;
  posX: number;
  posY: number;
  isPrimary: boolean;
  isEnabled: boolean;
  connectionType: ConnectionType;
  portLabel: string;
  audioDeviceId: string | null;
  status: DisplayStatus;
  currentContentId: string | null;
  currentContent?: {
    id: string;
    type: string;
    url: string;
    title: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface DetectedMonitor {
  deviceName: string;
  primary: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
}
