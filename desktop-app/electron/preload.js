const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Store operations
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  },

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },

  // Google login reminder
  onGoogleLoginReminder: (callback) => {
    ipcRenderer.on('google-login-reminder', (event, data) => callback(data));
  },

  // Antivirus warning
  showAntivirusWarning: () => ipcRenderer.invoke('show-antivirus-warning'),

  // Open external URL in default browser
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Playwright operations
  playwright: {
    launchInstance: (config) => ipcRenderer.invoke('playwright:launch', config),
    closeInstance: (instanceId) => ipcRenderer.invoke('playwright:close', instanceId),
    runBlock: (instanceId, block, variables) => ipcRenderer.invoke('playwright:run-block', { instanceId, block, variables }),
    getInstances: () => ipcRenderer.invoke('playwright:get-instances'),
    onInstanceStatus: (callback) => {
      ipcRenderer.on('playwright:status', (event, data) => callback(data));
    }
  },

  // Multi-Instance operations
  instanceManager: {
    runAll: (block, variablesPerInstance) => ipcRenderer.invoke('instance:run-all', { block, variablesPerInstance }),
    getStats: () => ipcRenderer.invoke('instance:get-stats'),
    closeAll: () => ipcRenderer.invoke('instance:close-all'),
    batchCreate: (configs) => ipcRenderer.invoke('instance:batch-create', configs)
  },

  // Scheduler operations (Phase 8)
  scheduler: {
    start: (userId, instances) => ipcRenderer.invoke('scheduler:start', { userId, instances }),
    stop: () => ipcRenderer.invoke('scheduler:stop'),
    getToday: (userId) => ipcRenderer.invoke('scheduler:get-today', userId),
    getAll: (userId) => ipcRenderer.invoke('scheduler:get-all', userId),
    onTrigger: (callback) => {
      ipcRenderer.on('scheduler:trigger', (event, data) => callback(data));
    },
    onUpdate: (callback) => {
      ipcRenderer.on('scheduler:update', (event, data) => callback(data));
    }
  },

  // Recorder operations (Phase 6 - Admin only)
  recorder: {
    start: (profilePath, startUrl) => ipcRenderer.invoke('recorder:start', { profilePath, startUrl }),
    stop: () => ipcRenderer.invoke('recorder:stop'),
    getSteps: () => ipcRenderer.invoke('recorder:get-steps'),
    clear: () => ipcRenderer.invoke('recorder:clear'),
    addStep: (action, params) => ipcRenderer.invoke('recorder:add-step', { action, params }),
    onStarted: (callback) => {
      ipcRenderer.on('recorder:started', (event, data) => callback(data));
    },
    onStopped: (callback) => {
      ipcRenderer.on('recorder:stopped', (event, data) => callback(data));
    },
    onStep: (callback) => {
      ipcRenderer.on('recorder:step', (event, data) => callback(data));
    }
  }
});

console.log('✅ Preload script loaded - electronAPI exposed');
