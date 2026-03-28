import path from 'path';
import type { DetectedMonitor } from '@screen-commander/shared';
import { execPowerShell } from '../utils/powershell';
import { logger } from '../utils/logger';

const SCRIPT_PATH = path.resolve(__dirname, '../../../../scripts/detect-monitors.ps1');

export async function detectMonitors(): Promise<DetectedMonitor[]> {
  try {
    const output = await execPowerShell(SCRIPT_PATH);
    const parsed: unknown = JSON.parse(output);

    // PowerShell outputs a single object (not array) if there's only one monitor
    const monitors = Array.isArray(parsed) ? parsed : [parsed];

    return monitors.map((m: Record<string, unknown>) => ({
      deviceName: String(m['DeviceName'] ?? ''),
      primary: Boolean(m['Primary']),
      width: Number(m['Width']),
      height: Number(m['Height']),
      x: Number(m['X']),
      y: Number(m['Y']),
    }));
  } catch (err) {
    logger.error('Monitor detection failed', err);
    throw new Error('Failed to detect monitors');
  }
}

export function getHealth(): Record<string, unknown> {
  return {
    status: 'ok',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    nodeVersion: process.version,
    platform: process.platform,
    timestamp: new Date().toISOString(),
  };
}
