import { Router } from 'express';
import { createFavoriteSchema, updateFavoriteSchema } from '@screen-commander/shared';
import { validate } from '../middleware/validate';
import * as favoritesService from '../services/favorites.service';

export const favoritesRouter = Router();

// GET /api/favorites
favoritesRouter.get('/', async (_req, res, next) => {
  try {
    const favorites = await favoritesService.getAllFavorites();
    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

// GET /api/favorites/:id
favoritesRouter.get('/:id', async (req, res, next) => {
  try {
    const favorite = await favoritesService.getFavoriteById(req.params['id']!);
    if (!favorite) {
      res.status(404).json({ error: 'Favorite not found' });
      return;
    }
    res.json(favorite);
  } catch (err) {
    next(err);
  }
});

// POST /api/favorites
favoritesRouter.post('/', validate(createFavoriteSchema), async (req, res, next) => {
  try {
    const favorite = await favoritesService.createFavorite(req.body);
    res.status(201).json(favorite);
  } catch (err) {
    next(err);
  }
});

// PUT /api/favorites/:id
favoritesRouter.put('/:id', validate(updateFavoriteSchema), async (req, res, next) => {
  try {
    const favorite = await favoritesService.updateFavorite(req.params['id']!, req.body);
    res.json(favorite);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/favorites/:id
favoritesRouter.delete('/:id', async (req, res, next) => {
  try {
    await favoritesService.deleteFavorite(req.params['id']!);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
