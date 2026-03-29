import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import { displaysRouter } from './routes/displays.routes';
import { contentRouter } from './routes/content.routes';
import { messagesRouter } from './routes/messages.routes';
import { scheduleRouter } from './routes/schedule.routes';
import { systemRouter } from './routes/system.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { settingsRouter } from './routes/settings.routes';
import { favoritesRouter } from './routes/favorites.routes';
import { tickerRouter } from './routes/ticker.routes';
import { uploadsRouter } from './routes/uploads.routes';
import { redAlertRouter } from './routes/red-alert.routes';
import { authRouter } from './routes/auth.routes';
import { activityLogRouter } from './routes/activity-log.routes';
import { errorHandler } from './middleware/error-handler';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/api/displays', displaysRouter);
app.use('/api/content', contentRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/system', systemRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/ticker', tickerRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/red-alert', redAlertRouter);
app.use('/api/auth', authRouter);
app.use('/api/activity-log', activityLogRouter);

// In production, serve the built control panel as static files
// This allows the kiosk to load everything from http://localhost:3000
if (process.env['NODE_ENV'] === 'production') {
  const controlPanelDist = resolve(__dirname, '..', '..', 'control-panel', 'dist');
  app.use(express.static(controlPanelDist));

  // SPA fallback — serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(resolve(controlPanelDist, 'index.html'));
  });
}

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);
