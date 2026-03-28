import { createServer } from 'http';
import { app } from './app';
import { initializeWebSocket } from './ws/gateway';
import { startScheduler } from './services/schedule.service';
import { startRedAlertService } from './services/red-alert.service';
import { startMessageCleanup } from './services/messages.service';
import { logger } from './utils/logger';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10); // v4
const HOST = process.env['HOST'] ?? '0.0.0.0';

const httpServer = createServer(app);

initializeWebSocket(httpServer);
startScheduler();
startMessageCleanup();
void startRedAlertService();

httpServer.listen(PORT, HOST, () => {
  logger.info(`ScreenCommander backend running on http://${HOST}:${PORT}`);
  logger.info(`WebSocket server ready on ws://${HOST}:${PORT}`);
});
