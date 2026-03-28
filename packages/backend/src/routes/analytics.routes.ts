import { Router } from 'express';
import * as analyticsService from '../services/analytics.service';

export const analyticsRouter = Router();

// GET /api/analytics/summary
analyticsRouter.get('/summary', async (_req, res, next) => {
  try {
    const summary = await analyticsService.getSummary();
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/uptime
analyticsRouter.get('/uptime', async (_req, res, next) => {
  try {
    const stats = await analyticsService.getUptimeStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/content-usage
analyticsRouter.get('/content-usage', async (_req, res, next) => {
  try {
    const stats = await analyticsService.getContentUsageStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/activity
analyticsRouter.get('/activity', async (_req, res, next) => {
  try {
    const timeline = await analyticsService.getActivityTimeline();
    res.json(timeline);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/history
analyticsRouter.get('/history', async (req, res, next) => {
  try {
    const displayId = typeof req.query['displayId'] === 'string' ? req.query['displayId'] : undefined;
    const limit = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 50;
    const history = await analyticsService.getPlayHistory(displayId, limit);
    res.json(history);
  } catch (err) {
    next(err);
  }
});
