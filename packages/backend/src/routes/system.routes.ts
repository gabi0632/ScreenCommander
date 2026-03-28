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
    res.json(devices.filter((d: Record<string, unknown>) => d['Name']));
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
