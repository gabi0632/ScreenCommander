import { Router } from 'express';
import { createScheduleSchema, updateScheduleSchema } from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as scheduleService from '../services/schedule.service';

export const scheduleRouter = Router();

// GET /api/schedule
scheduleRouter.get('/', async (_req, res, next) => {
  try {
    const entries = await scheduleService.getAllScheduleEntries();
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

// GET /api/schedule/:id
scheduleRouter.get('/:id', async (req, res, next) => {
  try {
    const entry = await scheduleService.getScheduleEntryById(req.params['id']!);
    if (!entry) {
      res.status(404).json({ error: 'Schedule entry not found' });
      return;
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// POST /api/schedule
scheduleRouter.post('/', validate(createScheduleSchema), async (req, res, next) => {
  try {
    const entry = await scheduleService.createScheduleEntry(req.body);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// PUT /api/schedule/:id
scheduleRouter.put('/:id', validate(updateScheduleSchema), async (req, res, next) => {
  try {
    const entry = await scheduleService.updateScheduleEntry(req.params['id']!, req.body);
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/schedule/:id
scheduleRouter.delete('/:id', async (req, res, next) => {
  try {
    await scheduleService.deleteScheduleEntry(req.params['id']!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
