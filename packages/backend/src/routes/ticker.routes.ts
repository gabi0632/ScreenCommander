import { Router } from 'express';
import {
  updateTickerConfigSchema,
  createTickerMessageSchema,
  updateTickerMessageSchema,
  reorderTickerMessagesSchema,
} from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as tickerService from '../services/ticker.service';

export const tickerRouter = Router();

// GET /api/ticker
tickerRouter.get('/', async (_req, res, next) => {
  try {
    const config = await tickerService.getTickerConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ticker
tickerRouter.put('/', validate(updateTickerConfigSchema), async (req, res, next) => {
  try {
    const config = await tickerService.updateTickerConfig(req.body);
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// POST /api/ticker/messages
tickerRouter.post('/messages', validate(createTickerMessageSchema), async (req, res, next) => {
  try {
    const config = await tickerService.addTickerMessage(req.body);
    res.status(201).json(config);
  } catch (err) {
    next(err);
  }
});

// PUT /api/ticker/messages/:id
tickerRouter.put('/messages/:id', validate(updateTickerMessageSchema), async (req, res, next) => {
  try {
    const config = await tickerService.updateTickerMessage(req.params['id']!, req.body);
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/ticker/messages/:id
tickerRouter.delete('/messages/:id', async (req, res, next) => {
  try {
    const config = await tickerService.deleteTickerMessage(req.params['id']!);
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// POST /api/ticker/messages/reorder
tickerRouter.post('/messages/reorder', validate(reorderTickerMessagesSchema), async (req, res, next) => {
  try {
    const config = await tickerService.reorderTickerMessages(req.body.ids);
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// GET /api/ticker/display/:displayId
tickerRouter.get('/display/:displayId', async (req, res, next) => {
  try {
    const payload = await tickerService.getTickerPayloadForDisplay(req.params['displayId']!);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});
