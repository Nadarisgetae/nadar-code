const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nadar', {
  // Messaging
  sendMessage: (msg) => ipcRenderer.invoke('send-message', msg),

  // Events from core engine
  onCoreEvent: (callback) => ipcRenderer.on('core-event', (event, ...args) => callback(...args)),
  onConfigUpdate: (callback) => ipcRenderer.on('config-update', (event, ...args) => callback(...args)),

  // Approval modal
  onApprovalRequest: (callback) => ipcRenderer.on('approval-request', (event, ...args) => callback(...args)),
  sendApprovalResponse: (decision) => ipcRenderer.send('approval-response', decision),

  // Config & settings
  getConfig: () => ipcRenderer.invoke('get-config'),
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  setModel: (model) => ipcRenderer.invoke('set-model', model),
  fetchModels: () => ipcRenderer.invoke('fetch-models'),
  getKeyStatus: () => ipcRenderer.invoke('get-key-status'),

  // Project management
  chooseProject: () => ipcRenderer.invoke('choose-project'),
  onProjectChanged: (callback) => ipcRenderer.on('project-changed', (event, ...args) => callback(...args)),

  // Conversation persistence
  loadHistory: () => ipcRenderer.invoke('load-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // IDE Features
  listDir: (dirPath) => ipcRenderer.invoke('list-dir', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

  // Terminal Features
  spawnTerminal: () => ipcRenderer.invoke('terminal.spawn'),
  writeTerminal: (data) => ipcRenderer.send('terminal.write', data),
  resizeTerminal: (cols, rows) => ipcRenderer.send('terminal.resize', cols, rows),
  onTerminalData: (callback) => {
    ipcRenderer.on('terminal.data', (_event, data) => callback(data));
  },
});
