import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { WS_EVENTS } from '@screen-commander/shared';
import { handlePlayerRegister, handlePlayerHeartbeat, handlePlayerError, handleContentLoaded, handleOverlayExpired } from './events';
import { storeScreenshot } from '../services/displays.service';
import { prisma } from '../prisma';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on(WS_EVENTS.PLAYER_REGISTER, (data: unknown) => {
      handlePlayerRegister(socket, data);
    });

    socket.on(WS_EVENTS.PLAYER_HEARTBEAT, (data: unknown) => {
      handlePlayerHeartbeat(socket, data);
    });

    socket.on(WS_EVENTS.PLAYER_ERROR, (data: unknown) => {
      handlePlayerError(socket, data);
    });

    socket.on(WS_EVENTS.CONTENT_LOADED, (data: unknown) => {
      handleContentLoaded(socket, data);
    });

    socket.on(WS_EVENTS.OVERLAY_EXPIRED, (data: unknown) => {
      handleOverlayExpired(socket, data);
    });

    socket.on(WS_EVENTS.PLAYER_SCREENSHOT, (data: unknown) => {
      const displayId = socket.data['displayId'] as string | undefined;
      if (displayId && typeof data === 'string') {
        storeScreenshot(displayId, data);
      }
    });

    socket.on('dashboard:join', () => {
      socket.join('dashboard');
      logger.info(`Dashboard client joined: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      const displayId = socket.data['displayId'] as string | undefined;
      if (displayId) {
        prisma.display.update({
          where: { id: displayId },
          data: { status: 'OFFLINE' },
        }).then(() => {
          io?.to('dashboard').emit(WS_EVENTS.DISPLAY_STATUS_CHANGED, {
            displayId,
            status: 'OFFLINE',
          });
        }).catch(() => {
          // Display may have been deleted
        });
      }
      logger.info(`Client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket gateway initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
  }
  return io;
}
