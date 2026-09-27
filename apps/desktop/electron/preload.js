const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nadar', {
  // Messaging
  sendMessage: (msg) => ipcRenderer.invoke('send-message', msg),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),

  // Events from core engine — all return a cleanup fn to remove the listener
  onCoreEvent: (callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on('core-event', listener);
    return () => ipcRenderer.removeListener('core-event', listener);
  },
  onConfigUpdate: (callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on('config-update', listener);
    return () => ipcRenderer.removeListener('config-update', listener);
  },

  // Approval modal
  onApprovalRequest: (callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on('approval-request', listener);
    return () => ipcRenderer.removeListener('approval-request', listener);
  },
  sendApprovalResponse: (decision) => ipcRenderer.send('approval-response', decision),

  // Config & settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  setModel: (model) => ipcRenderer.invoke('set-model', model),
  fetchModels: () => ipcRenderer.invoke('fetch-models'),
  getKeyStatus: () => ipcRenderer.invoke('get-key-status'),
  getKeyStatusData: () => ipcRenderer.invoke('get-key-status-data'),
  refreshKeysCheck: () => ipcRenderer.invoke('refresh-keys-check'),
  getPluginCommands: () => ipcRenderer.invoke('get-plugin-commands'),
  getLoadedPlugins: () => ipcRenderer.invoke('get-loaded-plugins'),
  reloadPlugins: () => ipcRenderer.invoke('reload-plugins'),

  // Project management
  chooseProject: () => ipcRenderer.invoke('choose-project'),
  onProjectChanged: (callback) => {
    const listener = (_event, ...args) => callback(...args);
    ipcRenderer.on('project-changed', listener);
    return () => ipcRenderer.removeListener('project-changed', listener);
  },

  // Conversation persistence
  loadHistory: () => ipcRenderer.invoke('load-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  listChats: () => ipcRenderer.invoke('list-chats'),
  switchChat: (chatId) => ipcRenderer.invoke('switch-chat', chatId),
  newChat: () => ipcRenderer.invoke('new-chat'),

  // IDE Features
  listDir: (dirPath) => ipcRenderer.invoke('list-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // Terminal Features
  spawnTerminal: () => ipcRenderer.invoke('terminal.spawn'),
  writeTerminal: (data) => ipcRenderer.send('terminal.write', data),
  resizeTerminal: (cols, rows) => ipcRenderer.send('terminal.resize', cols, rows),
  onTerminalData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('terminal.data', listener);
    return () => ipcRenderer.removeListener('terminal.data', listener);
  },
});

