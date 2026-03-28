import path from 'path';
import { Service } from 'node-windows';

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const BACKEND_SCRIPT = path.resolve(PROJECT_ROOT, 'packages', 'backend', 'dist', 'index.js');

console.log('=== ScreenCommander Service Uninstaller ===');
console.log(`Project root:   ${PROJECT_ROOT}`);
console.log(`Backend script: ${BACKEND_SCRIPT}`);
console.log('');

const svc = new Service({
  name: 'ScreenCommander Backend',
  description: 'ScreenCommander multi-display streaming management backend service',
  script: BACKEND_SCRIPT,
});

svc.on('uninstall', () => {
  console.log('[OK] Service uninstalled successfully.');
  console.log('The ScreenCommander backend Windows service has been removed.');
  process.exit(0);
});

svc.on('alreadyuninstalled', () => {
  console.log('[INFO] Service is not currently installed. Nothing to uninstall.');
  process.exit(0);
});

svc.on('error', (err: Error) => {
  console.error('[ERROR] Service uninstallation failed:', err.message);
  process.exit(1);
});

console.log('Uninstalling service (requires Administrator privileges)...');
svc.uninstall();
