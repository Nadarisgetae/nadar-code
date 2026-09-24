import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

import {
  Agent, KeyManager, EventBus,
  loadConfig, loadKeys, resolveKeysPath, saveConfig, listFreeModels
} from '@nadar-code/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── State ───────────────────────────────────────────────────────────────────
let mainWindow = null;
let agent = null;
let eventBus = null;
let config = null;
let keyManager = null;
const defaultChatsDir = "C:\\chats";
let cwd = fs.existsSync(defaultChatsDir) ? defaultChatsDir : os.homedir();
let ptyProcess = null;

let currentChatId = Date.now().toString();

// ─── Persistence helpers ──────────────────────────────────────────────────────
function historyDir(projectCwd) {
  const safe = projectCwd.replace(/[^a-zA-Z0-9]/g, '_');
  return path.join(os.homedir(), '.nadar-code', 'history', safe);
}

function saveHistory(projectCwd, chatId, messages) {
  const dir = historyDir(projectCwd);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${chatId}.json`);
  fs.writeFileSync(p, JSON.stringify(messages, null, 2), 'utf-8');
}

function loadHistoryFromDisk(projectCwd, chatId) {
  try {
    const p = path.join(historyDir(projectCwd), `${chatId}.json`);
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return [];
}

function listChats(projectCwd) {
  const dir = historyDir(projectCwd);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const chats = files.map(file => {
    const p = path.join(dir, file);
    const msgs = JSON.parse(fs.readFileSync(p, 'utf-8'));
    const firstUserMsg = msgs.find(m => m.role === 'user');
    const title = firstUserMsg ? firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '') : 'New Chat';
    return { id: file.replace('.json', ''), title, timestamp: fs.statSync(p).mtimeMs };
  });
  return chats.sort((a, b) => b.timestamp - a.timestamp);
}

// ─── Core initialisation ──────────────────────────────────────────────────────
async function initializeCore(newCwd) {
  cwd = newCwd || cwd;
  config = loadConfig();
  const keysPath = resolveKeysPath(cwd);
  const rawKeys = loadKeys(keysPath);
  keyManager = new KeyManager(rawKeys);

  eventBus = new EventBus();
  eventBus.subscribe((event) => {
    if (mainWindow) mainWindow.webContents.send('core-event', event);
  });

  const approvalProvider = {
    async request(toolName, argsSummary) {
      return new Promise((resolve) => {
        ipcMain.once('approval-response', (_event, decision) => resolve(decision));
        if (mainWindow) mainWindow.webContents.send('approval-request', { toolName, argsSummary });
        else resolve('no');
      });
    }
  };

  agent = new Agent(keyManager, config, cwd, eventBus, approvalProvider);
  await agent.init();
  
  // Set to latest chat or create new
  const chats = listChats(cwd);
  if (chats.length > 0) {
    currentChatId = chats[0].id;
    const history = loadHistoryFromDisk(cwd, currentChatId);
    if (history.length > 0) agent.setHistory(history);
  } else {
    currentChatId = Date.now().toString();
  }
  
  console.log(`[main] Core initialised. CWD=${cwd} Chat=${currentChatId}`);
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: 'Nadar Code',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Dev: load Vite dev server; Prod / built preview: load built index.html
  const isDev = (!app.isPackaged && process.argv.includes('--dev')) || !!process.env.VITE_DEV_SERVER_URL;
  const distIndex = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex);
  } else {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  await initializeCore(cwd);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('send-message', async (_event, message) => {
  if (!agent) return;
  try {
    await agent.runTurn(message);
  } catch (err) {
    eventBus.emit({ type: 'system:error', message: err.message });
  } finally {
    eventBus.emit({ type: 'agent:done' });
    saveHistory(cwd, currentChatId, agent.getHistory());
  }
});

ipcMain.handle('get-config', async () => {
  return {
    mode: config?.mode ?? 'manual',
    model: config?.model ?? '',
    cwd,
    keyCount: keyManager ? keyManager.keyCount() : 0,
  };
});

ipcMain.handle('set-mode', async (_event, mode) => {
  if (!config) return;
  config.mode = mode;
  saveConfig(config);
  if (agent) agent.resetSystemPrompt();
  if (mainWindow) mainWindow.webContents.send('config-update', { mode });
});

ipcMain.handle('set-model', async (_event, model) => {
  if (!config) return;
  config.model = model;
  saveConfig(config);
  if (mainWindow) mainWindow.webContents.send('config-update', { model });
});

ipcMain.handle('fetch-models', async () => {
  try {
    const models = await listFreeModels();
    return models;
  } catch (e) {
    return [];
  }
});

ipcMain.handle('get-key-status', async () => {
  return keyManager ? keyManager.status() : 'No key manager loaded.';
});

ipcMain.handle('choose-project', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Choose Project Folder',
  });
  if (result.canceled || !result.filePaths.length) return null;

  const chosen = result.filePaths[0];
  await initializeCore(chosen);
  if (mainWindow) mainWindow.webContents.send('project-changed', { cwd: chosen });
  return chosen;
});

ipcMain.handle('load-history', async () => {
  return loadHistoryFromDisk(cwd, currentChatId);
});

ipcMain.handle('clear-history', async () => {
  if (agent) agent.clearHistory();
  const p = path.join(historyDir(cwd), `${currentChatId}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

ipcMain.handle('list-chats', async () => {
  return listChats(cwd);
});

ipcMain.handle('switch-chat', async (_event, chatId) => {
  currentChatId = chatId;
  const history = loadHistoryFromDisk(cwd, currentChatId);
  if (agent) agent.setHistory(history);
  return history;
});

ipcMain.handle('new-chat', async () => {
  currentChatId = Date.now().toString();
  if (agent) agent.clearHistory();
  return [];
});

// ─── IDE Handlers ─────────────────────────────────────────────────────────────
ipcMain.handle('list-dir', async (_event, dirPath) => {
  const target = dirPath || cwd;
  if (!fs.existsSync(target)) return [];
  const items = fs.readdirSync(target, { withFileTypes: true });
  return items.map(item => ({
    name: item.name,
    isDirectory: item.isDirectory(),
    path: path.join(target, item.name)
  })).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
});

ipcMain.handle('read-file', async (_event, filePath) => {
  if (!fs.existsSync(filePath)) throw new Error('File not found');
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('write-file', async (_event, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
});

// ─── Terminal Handlers ────────────────────────────────────────────────────────
ipcMain.handle('terminal.spawn', () => {
  if (ptyProcess) {
    ptyProcess.kill();
  }
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  ptyProcess = spawn(shell, [], {
    cwd: cwd,
    env: process.env
  });

  ptyProcess.stdout.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('terminal.data', data.toString());
  });
  ptyProcess.stderr.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('terminal.data', data.toString());
  });
  return true;
});

ipcMain.on('terminal.write', (_event, data) => {
  if (ptyProcess && ptyProcess.stdin) ptyProcess.stdin.write(data);
});

ipcMain.on('terminal.resize', (_event, cols, rows) => {
  // child_process doesn't support native resize, so we ignore
});
