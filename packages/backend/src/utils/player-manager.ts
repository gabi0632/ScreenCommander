import { spawn, execSync, type ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';
import { logger } from './logger';

const playerProcesses = new Map<string, ChildProcess>();

function getProjectRoot(): string {
  return join(__dirname, '..', '..', '..', '..');
}

function findElectronExe(): string {
  const projectRoot = getProjectRoot();

  // Direct path (npm-style hoisting)
  const direct = join(projectRoot, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (existsSync(direct)) return direct;

  // pnpm store path
  const pnpmDir = join(projectRoot, 'node_modules', '.pnpm');
  if (existsSync(pnpmDir)) {
    const entries = readdirSync(pnpmDir);
    for (const entry of entries) {
      if (entry.startsWith('electron@')) {
        const candidate = join(pnpmDir, entry, 'node_modules', 'electron', 'dist', 'electron.exe');
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  // Fallback: use pnpm to find it
  return 'electron';
}

const isProduction = process.env['NODE_ENV'] === 'production';

export function spawnPlayer(displayId: string, monitorIndex: number): void {
  killPlayer(displayId);

  const projectRoot = getProjectRoot();
  const backendUrl = `http://127.0.0.1:${process.env['PORT'] ?? '3000'}`;

  logger.info(`Spawning player for display ${displayId} on monitor ${monitorIndex} (${isProduction ? 'prod' : 'dev'})`);

  let child: ChildProcess;

  if (isProduction) {
    // Production: launch electron directly with the built player
    const electronExe = findElectronExe();
    const playerMain = join(projectRoot, 'packages', 'player', 'dist', 'main', 'index.js');

    logger.info(`  Electron: ${electronExe}`);
    logger.info(`  Player: ${playerMain}`);

    child = spawn(electronExe, [
      playerMain,
      '--display-id', displayId,
      '--monitor-index', String(monitorIndex),
      '--backend-url', backendUrl,
    ], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
    });

    // Forward player logs to backend logger
    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().trim();
      if (lines) logger.info(`[player:${displayId.slice(-6)}] ${lines}`);
    });
    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().trim();
      if (lines && !lines.includes('DevTools') && !lines.includes('GPU')) {
        logger.warn(`[player:${displayId.slice(-6)}] ${lines}`);
      }
    });
  } else {
    // Dev: use pnpm to run electron-vite dev
    const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

    child = spawn(pnpmCmd, [
      '--filter', '@screen-commander/player', 'dev',
      '--', '--display-id', displayId,
      '--monitor-index', String(monitorIndex),
      '--backend-url', backendUrl,
    ], {
      cwd: projectRoot,
      stdio: 'ignore',
      detached: false,
      shell: true,
    });
  }

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
