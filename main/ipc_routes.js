const { ipcMain } = require('electron');
const { IPC } = require('./ipc_channels');
const { chatWithOllama } = require('../core/ai/ollama_client');
const { runVoicePipeline } = require('../core/voice/voice_pipeline');
const { readConfig, writeConfig } = require('../core/config_store');

function registerIpcRoutes() {
  ipcMain.handle(IPC.APP_STATUS, async () => ({ ok: true, app: 'Noelle v20', state: 'ready' }));

  ipcMain.handle(IPC.CONFIG_READ, async (_event, name) => readConfig(name));
  ipcMain.handle(IPC.CONFIG_WRITE, async (_event, payload) => writeConfig(payload.name, payload.data));

  ipcMain.handle(IPC.AI_STATUS, async () => ({ ok: true, backend: 'ollama', status: 'not_checked' }));
  ipcMain.handle(IPC.AI_CHAT, async (_event, payload) => chatWithOllama(payload));

  ipcMain.handle(IPC.VOICE_START, async (_event, payload) => runVoicePipeline(payload));
  ipcMain.handle(IPC.VOICE_STOP, async () => ({ ok: true, stopped: true }));

  ipcMain.handle(IPC.AVATAR_SET_STATE, async (_event, state) => ({ ok: true, state }));
  ipcMain.handle(IPC.STREAM_STATUS, async () => ({ ok: true, stream: 'idle' }));
}

module.exports = { registerIpcRoutes };
