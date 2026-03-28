import { createServer } from 'http';
import { app } from './app';
import { initializeWebSocket } from './ws/gateway';
import { startScheduler, stopScheduler } from './services/schedule.service';
import { startRedAlertService, stopRedAlertService } from './services/red-alert.service';
import { startMessageCleanup, stopMessageCleanup } from './services/messages.service';
import { killAllPlayers } from './utils/player-manager';
import { prisma } from './prisma';
import { logger } from './utils/logger';
import { env } from './utils/env';

const PORT = parseInt(env.PORT, 10);
const HOST = env.HOST;

const httpServer = createServer(app);

initializeWebSocket(httpServer);
startScheduler();
startMessageCleanup();
void startRedAlertService();

httpServer.listen(PORT, HOST, () => {
  logger.info(`ScreenCommander backend running on http://${HOST}:${PORT}`);
  logger.info(`WebSocket server ready on ws://${HOST}:${PORT}`);
});

function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Stop background services
  stopScheduler();
  stopMessageCleanup();
  stopRedAlertService();

  // Kill player processes
  killAllPlayers();

  // Close HTTP server (stops accepting new connections)
  httpServer.close(() => {
    logger.info('HTTP server closed');

    // Disconnect Prisma
    prisma.$disconnect().then(() => {
      logger.info('Database disconnected');
      process.exit(0);
    }).catch(() => {
      process.exit(1);
    });
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.warn('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
