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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use(errorHandler);
