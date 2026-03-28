import { spawn, type ChildProcess } from 'child_process';
import { join } from 'path';
import { logger } from './logger';

const playerProcesses = new Map<string, ChildProcess>();

function getProjectRoot(): string {
  // Navigate from packages/backend/src/utils/ to project root
  return join(__dirname, '..', '..', '..', '..');
}

export function spawnPlayer(displayId: string, monitorIndex: number): void {
  // Kill existing process for this display if any
  killPlayer(displayId);

  const projectRoot = getProjectRoot();
  const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

  logger.info(`Spawning player for display ${displayId} on monitor ${monitorIndex}`);

  const child = spawn(pnpmCmd, [
    '--filter', '@screen-commander/player', 'dev',
    '--', '--display-id', displayId,
    '--monitor-index', String(monitorIndex),
    '--backend-url', `http://127.0.0.1:${process.env['PORT'] ?? '3000'}`,
  ], {
    cwd: projectRoot,
    stdio: 'ignore',
    detached: false,
    shell: true,
  });

  child.on('error', (err) => {
    logger.error(`Player process error for ${displayId}: ${err.message}`);
    playerProcesses.delete(displayId);
  });

  child.on('exit', (code) => {
    logger.info(`Player process for ${displayId} exited with code ${code}`);
    playerProcesses.delete(displayId);
  });

  playerProcesses.set(displayId, child);
}

export function killPlayer(displayId: string): void {
  const child = playerProcesses.get(displayId);
  if (child) {
    logger.info(`Killing player for display ${displayId} (pid: ${child.pid})`);
    try {
      // On Windows, need to kill the entire process tree
      if (process.platform === 'win32' && child.pid) {
        spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], { shell: true, stdio: 'ignore' });
      } else {
        child.kill('SIGTERM');
      }
    } catch {
      // Process may already be dead
    }
    playerProcesses.delete(displayId);
  }

  // Also send shutdown via WebSocket in case the process was started externally
  try {
    const { getIO } = require('../ws/gateway');
    const io = getIO();
    io.to(`display:${displayId}`).emit('player:restart');
  } catch {
    // Gateway may not be initialized yet
  }
}

export function killAllPlayers(): void {
  for (const displayId of playerProcesses.keys()) {
    killPlayer(displayId);
  }
}

export function getRunningPlayers(): string[] {
  return Array.from(playerProcesses.keys());
}
