import { createServer } from 'http';
import { app } from './app';
import { initializeWebSocket } from './ws/gateway';
import { startScheduler, stopScheduler } from './services/schedule.service';
import { startRedAlertService, stopRedAlertService } from './services/red-alert.service';
import { startMessageCleanup, stopMessageCleanup } from './services/messages.service';
import { killAllPlayers, spawnPlayer } from './utils/player-manager';
import { prisma } from './prisma';
import { logger } from './utils/logger';
import { env } from './utils/env';
import { getSettings } from './services/settings.service';

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

  // Auto-spawn players for configured displays after server is ready
  void autoSpawnPlayers();
});

async function autoSpawnPlayers(): Promise<void> {
  try {
    const settings = await getSettings();
    if (!settings.players.autoStart) {
      logger.info('Player auto-start is disabled in settings');
      return;
    }

    // Mark all displays as OFFLINE — players will set ONLINE via heartbeat
    await prisma.display.updateMany({
      data: { status: 'OFFLINE' },
    });

    // Find all enabled, non-primary displays
    const displays = await prisma.display.findMany({
      where: { isEnabled: true, isPrimary: false },
      orderBy: { monitorIndex: 'asc' },
    });

    if (displays.length === 0) {
      logger.info('No displays configured for auto-spawn');
      return;
    }

    logger.info(`Auto-spawning players for ${displays.length} display(s)...`);

    // Stagger spawns by 2 seconds to avoid overwhelming the system
    for (let i = 0; i < displays.length; i++) {
      const display = displays[i]!;
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      logger.info(`  Spawning player: ${display.name} (monitor ${display.monitorIndex})`);
      spawnPlayer(display.id, display.monitorIndex);
    }

    logger.info('All players spawned');
  } catch (err) {
    logger.error(`Failed to auto-spawn players: ${err instanceof Error ? err.message : String(err)}`);
  }
}

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
