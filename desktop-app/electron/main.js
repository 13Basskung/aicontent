const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const { autoUpdater } = require('electron-updater');
const playwrightBridge = require('./playwright-bridge');
const { initPlaywrightBridge, closeAllInstances, getInstances } = playwrightBridge;
const instanceManager = require('./instance-manager');
const { initInstanceManager } = instanceManager;
const { initScheduler, startScheduler, stopScheduler, getTodaySchedule, fetchUserSchedule } = require('./scheduler');
const { initRecorder, startRecording, stopRecording, getRecordedSteps, clearSteps, addCustomStep } = require('./recorder');

// Initialize electron-store for persistent config
const store = new Store({
  defaults: {
    licenseKey: null,
    instances: {},
    googleLoginReminder: null, // timestamp of last reminder
    settings: {
      reminderDays: 3, // remind Google login every 3 days
      autoUpdate: true
    }
  }
});

let mainWindow = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// ============================================
// Window Creation
// ============================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    title: 'Content Auto Post - Desktop Agent',
    show: false // Show after ready-to-show
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Initialize Playwright Bridge
    initPlaywrightBridge(mainWindow);
    
    // Initialize Instance Manager (for multi-instance support)
    setTimeout(() => {
      initInstanceManager(mainWindow, getInstances());
    }, 1000);
    
    // Initialize Scheduler (Phase 8) - pass instanceManager and playwrightBridge for auto-run
    initScheduler(mainWindow, null, instanceManager, playwrightBridge);
    
    // Initialize Recorder (Phase 6)
    initRecorder(mainWindow);
    
    // Check for updates on startup (production only)
    if (!isDev && store.get('settings.autoUpdate')) {
      autoUpdater.checkForUpdatesAndNotify();
    }

    // Check Google login reminder
    checkGoogleLoginReminder();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============================================
// Google Login Reminder (every 3 days)
// ============================================

function checkGoogleLoginReminder() {
  const lastReminder = store.get('googleLoginReminder');
  const reminderDays = store.get('settings.reminderDays') || 3;
  const now = Date.now();
  const reminderInterval = reminderDays * 24 * 60 * 60 * 1000; // 3 days in ms

  if (!lastReminder || (now - lastReminder) > reminderInterval) {
    // Send reminder to renderer
    if (mainWindow) {
      mainWindow.webContents.send('google-login-reminder', {
        message: `แนะนำให้ Login Google ใหม่ในแต่ละ Chrome Instance เพื่อป้องกันปัญหา session หมดอายุ`,
        lastReminder: lastReminder ? new Date(lastReminder).toLocaleDateString('th-TH') : 'ไม่เคย'
      });
    }
    store.set('googleLoginReminder', now);
  }
}

// ============================================
// Auto-Updater Events
// ============================================

autoUpdater.on('checking-for-update', () => {
  console.log('🔍 Checking for updates...');
  sendToRenderer('update-status', { status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  console.log('📦 Update available:', info.version);
  sendToRenderer('update-status', { 
    status: 'available', 
    version: info.version,
    releaseNotes: info.releaseNotes 
  });
});

autoUpdater.on('update-not-available', () => {
  console.log('✅ App is up to date');
  sendToRenderer('update-status', { status: 'up-to-date' });
});

autoUpdater.on('download-progress', (progress) => {
  console.log(`⬇️ Download progress: ${Math.round(progress.percent)}%`);
  sendToRenderer('update-status', { 
    status: 'downloading', 
    percent: Math.round(progress.percent) 
  });
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Update downloaded:', info.version);
  sendToRenderer('update-status', { 
    status: 'downloaded', 
    version: info.version 
  });
  
  // Show dialog to restart
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'อัพเดทพร้อมติดตั้ง',
    message: `Version ${info.version} พร้อมติดตั้งแล้ว\nต้องการรีสตาร์ทเพื่ออัพเดทตอนนี้หรือไม่?`,
    buttons: ['รีสตาร์ทตอนนี้', 'ภายหลัง'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (error) => {
  console.error('❌ Auto-updater error:', error.message);
  sendToRenderer('update-status', { status: 'error', message: error.message });
});

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// ============================================
// IPC Handlers
// ============================================

// Store operations
ipcMain.handle('store:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store:delete', (event, key) => {
  store.delete(key);
  return true;
});

// Check for updates manually
ipcMain.handle('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  } else {
    sendToRenderer('update-status', { status: 'dev-mode' });
  }
});

// Install update
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
});

// Get app info
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    isDev,
    platform: process.platform
  };
});

// Open external URL in default browser
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

// Show antivirus warning
ipcMain.handle('show-antivirus-warning', () => {
  return dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: '⚠️ คำเตือน Antivirus',
    message: 'แนะนำให้ปิด Antivirus ก่อนใช้งาน\n\nบาง Antivirus อาจ block การทำงานของ Playwright\nซึ่งจะทำให้การ Automate ไม่สำเร็จ',
    buttons: ['เข้าใจแล้ว', 'อย่าแสดงอีก'],
    defaultId: 0
  }).then((result) => {
    if (result.response === 1) {
      store.set('hideAntivirusWarning', true);
    }
    return result.response;
  });
});

// ============================================
// Scheduler IPC Handlers (Phase 8)
// ============================================

ipcMain.handle('scheduler:start', async (event, { userId, instances }) => {
  startScheduler(userId, instances);
  return { success: true };
});

ipcMain.handle('scheduler:stop', async () => {
  stopScheduler();
  return { success: true };
});

ipcMain.handle('scheduler:get-today', async (event, userId) => {
  return await getTodaySchedule(userId);
});

ipcMain.handle('scheduler:get-all', async (event, userId) => {
  return await fetchUserSchedule(userId);
});

// ============================================
// Recorder IPC Handlers (Phase 6)
// ============================================

ipcMain.handle('recorder:start', async (event, { profilePath, startUrl }) => {
  return await startRecording(profilePath, startUrl);
});

ipcMain.handle('recorder:stop', async () => {
  return await stopRecording();
});

ipcMain.handle('recorder:get-steps', async () => {
  return getRecordedSteps();
});

ipcMain.handle('recorder:clear', async () => {
  clearSteps();
  return { success: true };
});

ipcMain.handle('recorder:add-step', async (event, { action, params }) => {
  return addCustomStep(action, params);
});

// ============================================
// App Lifecycle
// ============================================

app.whenReady().then(createWindow);

app.on('window-all-closed', async () => {
  // Close all Playwright instances before quitting
  await closeAllInstances();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

console.log('🚀 Content Auto Post Desktop Agent starting...');
console.log(`📦 Version: ${app.getVersion()}`);
console.log(`🔧 Mode: ${isDev ? 'Development' : 'Production'}`);
