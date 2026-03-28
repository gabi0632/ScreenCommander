import { Router } from 'express';
import { createMessageSchema } from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as messagesService from '../services/messages.service';

export const messagesRouter = Router();

// GET /api/messages
messagesRouter.get('/', async (_req, res, next) => {
  try {
    const messages = await messagesService.getAllMessages();
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/active
messagesRouter.get('/active', async (_req, res, next) => {
  try {
    const messages = await messagesService.getActiveMessages();
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/:id
messagesRouter.get('/:id', async (req, res, next) => {
  try {
    const message = await messagesService.getMessageById(req.params['id']!);
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }
    res.json(message);
  } catch (err) {
    next(err);
  }
});

// POST /api/messages
messagesRouter.post('/', validate(createMessageSchema), async (req, res, next) => {
  try {
    const message = await messagesService.createMessage(req.body);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/:id/dismiss
messagesRouter.post('/:id/dismiss', async (req, res, next) => {
  try {
    const message = await messagesService.dismissMessage(req.params['id']!);
    res.json(message);
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/dismiss-all
messagesRouter.post('/dismiss-all', async (_req, res, next) => {
  try {
    await messagesService.dismissAllMessages();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/:id/resend
messagesRouter.post('/:id/resend', async (req, res, next) => {
  try {
    const message = await messagesService.resendMessage(req.params['id']!);
    res.json(message);
  } catch (err) {
    next(err);
  }
});
