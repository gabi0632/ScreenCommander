import { Router } from 'express';
import { z } from 'zod';
import {
  updateDisplaySchema,
  assignContentSchema,
} from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as displaysService from '../services/displays.service';

// Override createDisplaySchema to make hardwareId optional (auto-generated)
const createDisplaySchema = z.object({
  hardwareId: z.string().min(1).optional(),
  name: z.string().min(1),
  monitorIndex: z.number().int().min(0),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  posX: z.number().int(),
  posY: z.number().int(),
  isPrimary: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  connectionType: z.enum(['HDMI', 'DisplayPort']).default('HDMI'),
  portLabel: z.string().default('HDMI-1'),
});

export const displaysRouter = Router();

// GET /api/displays
displaysRouter.get('/', async (_req, res, next) => {
  try {
    const displays = await displaysService.getAllDisplays();
    res.json(displays);
  } catch (err) {
    next(err);
  }
});

// GET /api/displays/:id
displaysRouter.get('/:id', async (req, res, next) => {
  try {
    const display = await displaysService.getDisplayById(req.params['id']!);
    if (!display) {
      res.status(404).json({ error: 'Display not found' });
      return;
    }
    res.json(display);
  } catch (err) {
    next(err);
  }
});

// POST /api/displays
displaysRouter.post('/', validate(createDisplaySchema), async (req, res, next) => {
  try {
    const display = await displaysService.createDisplay(req.body);
    res.status(201).json(display);
  } catch (err) {
    next(err);
  }
});

// PUT /api/displays/:id
displaysRouter.put('/:id', validate(updateDisplaySchema), async (req, res, next) => {
  try {
    const display = await displaysService.updateDisplay(req.params['id']!, req.body);
    res.json(display);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/displays/:id
displaysRouter.delete('/:id', async (req, res, next) => {
  try {
    await displaysService.deleteDisplay(req.params['id']!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/:id/content — assign content to display
displaysRouter.post('/:id/content', validate(assignContentSchema), async (req, res, next) => {
  try {
    const display = await displaysService.assignContent(req.params['id']!, req.body);
    res.json(display);
  } catch (err) {
    next(err);
  }
});

// GET /api/displays/:id/screenshot — get latest screenshot
displaysRouter.get('/:id/screenshot', (req, res) => {
  const screenshot = displaysService.getScreenshot(req.params['id']!);
  if (!screenshot) {
    res.status(404).json({ error: 'No screenshot available' });
    return;
  }
  // screenshot is base64 JPEG data URL
  const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Content-Length': buffer.length, 'Cache-Control': 'no-cache' });
  res.end(buffer);
});

// POST /api/displays/:id/identify — flash identify on display
displaysRouter.post('/:id/identify', async (req, res, next) => {
  try {
    await displaysService.identifyDisplay(req.params['id']!);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/reload-all — reload all players
displaysRouter.post('/reload-all', async (_req, res, next) => {
  try {
    await displaysService.reloadAll();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/displays/blackout-all — blackout all displays
displaysRouter.post('/blackout-all', async (_req, res, next) => {
  try {
    await displaysService.blackoutAll();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
