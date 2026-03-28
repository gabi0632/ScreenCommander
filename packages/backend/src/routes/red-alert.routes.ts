import { Router } from 'express';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';
import {
  getRedAlertStatus,
  restartRedAlertService,
  sendTestAlert,
} from '../services/red-alert.service';

export const redAlertRouter = Router();

interface TzevaadomRawCity {
  id: number;
  he: string;
  en: string;
  area: number;
  countdown: number;
}

interface TzevaadomCitiesResponse {
  cities: Record<string, TzevaadomRawCity>;
}

interface MappedCity {
  id: number;
  name: string;
  nameEn: string;
  area: number;
  countdown: number;
}

let citiesCache: { data: MappedCity[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// GET /api/red-alert/cities
redAlertRouter.get('/cities', async (_req, res) => {
  if (citiesCache && Date.now() - citiesCache.fetchedAt < CACHE_TTL_MS) {
    return res.json(citiesCache.data);
  }

  try {
    const response = await fetch('https://www.tzevaadom.co.il/static/cities.json');
    const raw = await response.json() as TzevaadomCitiesResponse;
    const cities = Object.values(raw.cities)
      .map((c) => ({ id: c.id, name: c.he, nameEn: c.en, area: c.area, countdown: c.countdown }))
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
    citiesCache = { data: cities, fetchedAt: Date.now() };
    res.json(cities);
  } catch (err) {
    logger.error(`Failed to fetch cities: ${String(err)}`);
    res.status(502).json({ error: 'Failed to fetch cities from source' });
  }
});

// GET /api/red-alert/status
redAlertRouter.get('/status', (_req, res) => {
  const status = getRedAlertStatus();
  res.json(status);
});

// GET /api/red-alert/history
redAlertRouter.get('/history', async (_req, res, next) => {
  try {
    const messages = await prisma.textMessage.findMany({
      where: { source: 'red-alert' },
      include: { targets: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/red-alert/test
redAlertRouter.post('/test', async (req, res, next) => {
  try {
    const alertType = (req.body as { alertType?: string })?.alertType;
    await sendTestAlert(alertType);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/red-alert/restart
redAlertRouter.post('/restart', async (_req, res, next) => {
  try {
    await restartRedAlertService();
    const status = getRedAlertStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});
