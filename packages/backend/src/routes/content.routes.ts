import { Router } from 'express';
import { createContentSchema } from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as contentService from '../services/content.service';

export const contentRouter = Router();

// GET /api/content
contentRouter.get('/', async (_req, res, next) => {
  try {
    const content = await contentService.getAllContent();
    res.json(content);
  } catch (err) {
    next(err);
  }
});

// GET /api/content/:id
contentRouter.get('/:id', async (req, res, next) => {
  try {
    const content = await contentService.getContentById(req.params['id']!);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    res.json(content);
  } catch (err) {
    next(err);
  }
});

// POST /api/content
contentRouter.post('/', validate(createContentSchema), async (req, res, next) => {
  try {
    const content = await contentService.createContent(req.body);
    res.status(201).json(content);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/content/:id
contentRouter.delete('/:id', async (req, res, next) => {
  try {
    await contentService.deleteContent(req.params['id']!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
