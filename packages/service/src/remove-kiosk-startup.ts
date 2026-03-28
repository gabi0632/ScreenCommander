import * as path from 'path';
import * as fs from 'fs';

const STARTUP_DIR = process.env['APPDATA']
  ? `${process.env['APPDATA']}\\Microsoft\\Windows\\Start Menu\\Programs\\Startup`
  : 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup';
const VBS_FILENAME = 'ScreenCommander-Kiosk.vbs';
const VBS_PATH = path.join(STARTUP_DIR, VBS_FILENAME);

function main(): void {
  if (fs.existsSync(VBS_PATH)) {
    fs.unlinkSync(VBS_PATH);
    console.log(`[kiosk-startup] Removed startup script: ${VBS_PATH}`);
  } else {
    console.log('[kiosk-startup] Startup script not found (already removed).');
  }
}

main();
