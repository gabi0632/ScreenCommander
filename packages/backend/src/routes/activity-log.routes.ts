import { Router } from 'express';
import type { ActivityEventType } from '@screen-commander/shared';
import * as activityLogService from '../services/activity-log.service';

export const activityLogRouter = Router();

// GET /api/activity-log
activityLogRouter.get('/', async (req, res, next) => {
  try {
    const page = typeof req.query['page'] === 'string'
      ? Math.max(1, parseInt(req.query['page'], 10))
      : 1;
    const pageSize = typeof req.query['pageSize'] === 'string'
      ? Math.min(200, Math.max(1, parseInt(req.query['pageSize'], 10)))
      : 50;
    const eventType = typeof req.query['type'] === 'string'
      ? (req.query['type'] as ActivityEventType)
      : undefined;
    const displayId = typeof req.query['displayId'] === 'string'
      ? req.query['displayId']
      : undefined;

    const result = await activityLogService.getActivityLog(page, pageSize, eventType, displayId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
