import { BrowserWindow, screen, Menu, globalShortcut } from 'electron';
import { join } from 'path';

let kioskWindow: BrowserWindow | null = null;
let locked = true;
let unlockCallback: (() => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let bounds = { x: 0, y: 0, width: 1920, height: 1080 };

const WM_SYSCOMMAND = 0x0112;
const SC_MINIMIZE = 0xF020;

function triggerUnlock(): void {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => { debounceTimer = null; }, 500);
  console.log('[kiosk] Unlock shortcut triggered');
  if (unlockCallback) unlockCallback();
}

export function createKioskWindow(url?: string): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  bounds = { ...primaryDisplay.bounds };

  // "Fake fullscreen" — frameless window at exact monitor bounds.
  // Windows auto-minimizes true fullscreen windows on focus loss,
  // but treats this as a regular always-on-top window that stays visible.
  kioskWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    fullscreen: false,
    kiosk: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#060b14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  });

  // Highest z-order level on Windows
  kioskWindow.setAlwaysOnTop(true, 'screen-saver');

  // === Hook WM_SYSCOMMAND to catch minimize at OS level ===
  if (process.platform === 'win32') {
    kioskWindow.hookWindowMessage(WM_SYSCOMMAND, (wParam: Buffer) => {
      const command = wParam.readInt32LE(0) & 0xFFF0;
      if (command === SC_MINIMIZE && locked) {
        setImmediate(() => {
          if (kioskWindow && !kioskWindow.isDestroyed()) {
            kioskWindow.restore();
            kioskWindow.setBounds(bounds);
            kioskWindow.setAlwaysOnTop(true, 'screen-saver');
            kioskWindow.moveTop();
          }
        });
      }
    });
  }

  // === Fallback: restore on minimize event ===
  kioskWindow.on('minimize', () => {
    if (locked && kioskWindow && !kioskWindow.isDestroyed()) {
      kioskWindow.restore();
      kioskWindow.setBounds(bounds);
      kioskWindow.setAlwaysOnTop(true, 'screen-saver');
      kioskWindow.moveTop();
    }
  });

  // === On blur: immediately reclaim focus when locked ===
  kioskWindow.on('blur', () => {
    if (locked && kioskWindow && !kioskWindow.isDestroyed()) {
      // Small delay so Windows finishes the Alt+Tab animation, then grab back
      setTimeout(() => {
        if (locked && kioskWindow && !kioskWindow.isDestroyed()) {
          kioskWindow.setAlwaysOnTop(true, 'screen-saver');
          kioskWindow.moveTop();
          kioskWindow.focus();
        }
      }, 50);
    }
  });

  // === METHOD 1: Menu accelerator (most reliable in Electron) ===
  const menu = Menu.buildFromTemplate([{
    label: 'Kiosk',
    submenu: [{
      label: 'Unlock',
      accelerator: 'CommandOrControl+Shift+K',
      visible: false,
      click: () => {
        console.log('[kiosk] Ctrl+Shift+K via Menu accelerator');
        triggerUnlock();
      },
    }],
  }]);
  Menu.setApplicationMenu(menu);

  // === METHOD 2: globalShortcut (OS-level) ===
  globalShortcut.unregister('CommandOrControl+Shift+K');
  const registered = globalShortcut.register('CommandOrControl+Shift+K', () => {
    console.log('[kiosk] Ctrl+Shift+K via globalShortcut');
    triggerUnlock();
  });
  console.log('[kiosk] globalShortcut registered:', registered);

  // Try to consume Alt+Tab at OS level (may not work on all Windows versions)
  globalShortcut.register('Alt+Tab', () => { /* consumed — do nothing */ });
  globalShortcut.register('Alt+Shift+Tab', () => { /* consumed */ });
  globalShortcut.register('Super+Tab', () => { /* consumed */ });
  globalShortcut.register('Super+D', () => { /* block show desktop */ });

  // === METHOD 3: before-input-event (Chromium-level) ===
  kioskWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.control && input.shift &&
        (input.code === 'KeyK' || input.key === 'K' || input.key === 'k')) {
      console.log('[kiosk] Ctrl+Shift+K via before-input-event');
      triggerUnlock();
      return;
    }

    if (!locked) return;
    if (input.alt && input.key === 'F4') { event.preventDefault(); return; }
    if (input.alt && input.key === 'Tab') { event.preventDefault(); return; }
    if (input.control && input.key.toLowerCase() === 'w') { event.preventDefault(); return; }
    if (input.control && input.key.toLowerCase() === 'q') { event.preventDefault(); return; }
    if (input.key === 'F11') { event.preventDefault(); return; }
    // Block Win key combinations
    if (input.meta) { event.preventDefault(); return; }
  });

  // === METHOD 4: Inject JS keydown listener after page loads ===
  kioskWindow.webContents.on('did-finish-load', () => {
    if (kioskWindow && !kioskWindow.isDestroyed()) {
      kioskWindow.webContents.executeJavaScript(`
        if (!window.__KIOSK_KD__) {
          window.__KIOSK_KD__ = true;
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && (e.key === 'K' || e.key === 'k' || e.code === 'KeyK')) {
              e.preventDefault();
              window.__KIOSK_UNLOCK_REQUESTED__ = true;
            }
          }, true);
        }
      `).catch(() => {});
    }
  });

  kioskWindow.once('ready-to-show', () => {
    kioskWindow?.show();
    kioskWindow?.setBounds(bounds);
    kioskWindow?.setAlwaysOnTop(true, 'screen-saver');
  });

  kioskWindow.on('closed', () => {
    globalShortcut.unregisterAll();
    kioskWindow = null;
  });

  // Load the control panel URL directly (no splash screen)
  if (url) {
    kioskWindow.loadURL(url);
  } else if (process.env['ELECTRON_RENDERER_URL']) {
    kioskWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    kioskWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return kioskWindow;
}

export function onUnlockRequested(callback: () => void): void {
  unlockCallback = callback;
}

export function getKioskWindow(): BrowserWindow | null {
  return kioskWindow;
}

export function isKioskLocked(): boolean {
  return locked;
}

export function setKioskLocked(value: boolean): void {
  locked = value;
  if (!kioskWindow || kioskWindow.isDestroyed()) return;

  if (value) {
    // Re-enter locked mode
    kioskWindow.setMinimizable(false);
    kioskWindow.setSkipTaskbar(true);
    kioskWindow.restore();
    kioskWindow.setBounds(bounds);
    kioskWindow.setAlwaysOnTop(true, 'screen-saver');
    kioskWindow.moveTop();
    kioskWindow.focus();
    console.log('[kiosk] Locked — kiosk mode active');
  } else {
    // Unlock — allow desktop access
    kioskWindow.setAlwaysOnTop(false);
    kioskWindow.setSkipTaskbar(false);
    kioskWindow.setMinimizable(true);
    kioskWindow.minimize();
    console.log('[kiosk] Unlocked — desktop accessible');
  }
}
