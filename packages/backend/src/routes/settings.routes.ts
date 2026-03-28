import { Router } from 'express';
import { appSettingsSchema, importSettingsSchema } from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as settingsService from '../services/settings.service';

export const settingsRouter = Router();

// GET /api/settings
settingsRouter.get('/', async (_req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
settingsRouter.put('/', validate(appSettingsSchema), async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/export
settingsRouter.post('/export', async (_req, res, next) => {
  try {
    const exported = await settingsService.exportSettings();
    res.json(exported);
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/import
settingsRouter.post('/import', validate(importSettingsSchema), async (req, res, next) => {
  try {
    const settings = await settingsService.importSettings(req.body);
    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// POST /api/settings/reset
settingsRouter.post('/reset', async (_req, res, next) => {
  try {
    const settings = await settingsService.resetSettings();
    res.json(settings);
  } catch (err) {
    next(err);
  }
});
