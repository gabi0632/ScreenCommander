import { Router } from 'express';
import { resolve } from 'path';
import * as systemService from '../services/system.service';
import { execPowerShell } from '../utils/powershell';
import { SCRIPTS_DIR } from '../utils/paths';

export const systemRouter = Router();

// GET /api/system/monitors
systemRouter.get('/monitors', async (_req, res, next) => {
  try {
    const monitors = await systemService.detectMonitors();
    res.json(monitors);
  } catch (err) {
    next(err);
  }
});

// POST /api/system/scan — trigger a fresh monitor scan
systemRouter.post('/scan', async (_req, res, next) => {
  try {
    const monitors = await systemService.detectMonitors();
    res.json({ monitors, scannedAt: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

// GET /api/system/audio-devices
systemRouter.get('/audio-devices', async (_req, res, next) => {
  try {
    const scriptPath = resolve(SCRIPTS_DIR, 'get-audio-devices.ps1');
    const output = await execPowerShell(scriptPath);
    const parsed = JSON.parse(output);
    const devices = Array.isArray(parsed) ? parsed : [parsed];
    // Normalize keys to lowercase for frontend compatibility
    const normalized = devices
      .filter((d: Record<string, unknown>) => d['Name'] || d['name'])
      .map((d: Record<string, unknown>) => ({
        name: (d['Name'] ?? d['name']) as string,
        deviceId: (d['DeviceId'] ?? d['deviceId'] ?? d['Name'] ?? d['name']) as string,
      }));
    // Disambiguate duplicate names by adding [2], [3], etc.
    const nameCount: Record<string, number> = {};
    const disambiguated = normalized.map((d) => {
      const count = (nameCount[d.name] ?? 0) + 1;
      nameCount[d.name] = count;
      if (count > 1) {
        return { name: `${d.name} [${count}]`, deviceId: `${d.name} [${count}]` };
      }
      return d;
    });

    // Enrich with screen/monitor names + custom labels
    try {
      const mapPath = resolve(SCRIPTS_DIR, 'get-display-audio-map.ps1');
      const mapOutput = await execPowerShell(mapPath);
      const mapParsed = JSON.parse(mapOutput);
      const mapEntries = Array.isArray(mapParsed) ? mapParsed : [mapParsed];

      // Load custom names from settings
      const settingsMod = await import('../services/settings.service');
      const settings = await settingsMod.getSettings();
      const customNames = settings.audioDeviceNames ?? {};

      interface MapEntry { deviceName: string; monitorName: string; audioDeviceLabel: string; primary: boolean }
      const enriched = disambiguated.map((d) => {
        const baseName = d.name.replace(/ \[\d+\]$/, '');
        const screen = mapEntries.find(
          (e: MapEntry) => e.audioDeviceLabel === baseName && !e.primary,
        );
        const screenName = screen
          ? `${screen.deviceName.replace('\\\\.\\', '')} · ${screen.monitorName || '?'}`
          : undefined;
        const customName = customNames[d.name] || undefined;
        return { ...d, screenName, customName };
      });
      res.json(enriched);
    } catch {
      res.json(disambiguated);
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/system/display-audio-map — maps each display to its HDMI/DP audio endpoint
systemRouter.get('/display-audio-map', async (_req, res, next) => {
  try {
    const scriptPath = resolve(SCRIPTS_DIR, 'get-display-audio-map.ps1');
    const output = await execPowerShell(scriptPath);
    const parsed = JSON.parse(output);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// GET /api/system/health
systemRouter.get('/health', (_req, res) => {
  const health = systemService.getHealth();
  res.json(health);
});

// GET/PUT /api/system/audio-device-names — custom display names for audio outputs
// Stored in AppSettings.data.audioDeviceNames as { [deviceName]: customLabel }
systemRouter.get('/audio-device-names', async (_req, res, next) => {
  try {
    const settings = await import('../services/settings.service');
    const s = await settings.getSettings();
    res.json(s.audioDeviceNames ?? {});
  } catch (err) { next(err); }
});

systemRouter.put('/audio-device-names', async (req, res, next) => {
  try {
    const names = req.body as Record<string, string>;
    const settings = await import('../services/settings.service');
    const current = await settings.getSettings();
    const updated = { ...current, audioDeviceNames: names };
    await settings.updateSettings(updated);
    res.json(names);
  } catch (err) { next(err); }
});

