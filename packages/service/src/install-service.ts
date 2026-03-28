import path from 'path';
import minimist from 'minimist';
import { Service } from 'node-windows';

interface CliArgs {
  port?: string;
  host?: string;
  'db-path'?: string;
  user?: string;
  password?: string;
}

const args = minimist<CliArgs>(process.argv.slice(2));

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const BACKEND_SCRIPT = path.resolve(PROJECT_ROOT, 'packages', 'backend', 'dist', 'index.js');

const port = args['port'] ?? '3000';
const host = args['host'] ?? '0.0.0.0';
const dbPath = args['db-path']
  ? path.resolve(args['db-path'])
  : path.resolve(PROJECT_ROOT, 'packages', 'backend', 'prisma', 'dev.db');
const databaseUrl = `file:${dbPath}`;

console.log('=== ScreenCommander Service Installer ===');
console.log(`Project root:   ${PROJECT_ROOT}`);
console.log(`Backend script: ${BACKEND_SCRIPT}`);
console.log(`Database URL:   ${databaseUrl}`);
console.log(`Port:           ${port}`);
console.log(`Host:           ${host}`);
console.log('');

const user = args['user'];
const password = args['password'];

if (user) {
  console.log(`User:           ${user}`);
}

const svc = new Service({
  name: 'ScreenCommander Backend',
  description: 'ScreenCommander multi-display streaming management backend service',
  script: BACKEND_SCRIPT,
  nodeOptions: ['--max-old-space-size=512'],
  env: [
    { name: 'DATABASE_URL', value: databaseUrl },
    { name: 'PORT', value: port },
    { name: 'HOST', value: host },
    { name: 'NODE_ENV', value: 'production' },
  ],
  maxRestarts: 10,
  wait: 2000,
  grow: 0.5,
  ...(user ? { logOnAs: { account: user, password: password ?? '' } } : {}),
});

svc.on('install', () => {
  console.log('[OK] Service installed successfully.');
  console.log('Starting service...');
  svc.start();
});

svc.on('alreadyinstalled', () => {
  console.log('[INFO] Service is already installed.');
  console.log('If you need to update the configuration, uninstall first and then reinstall.');
  process.exit(0);
});

svc.on('start', () => {
  console.log('[OK] Service started successfully.');
  console.log('The ScreenCommander backend is now running as a Windows service.');
  process.exit(0);
});

svc.on('error', (err: Error) => {
  console.error('[ERROR] Service installation failed:', err.message);
  process.exit(1);
});

console.log('Installing service (requires Administrator privileges)...');
svc.install();
