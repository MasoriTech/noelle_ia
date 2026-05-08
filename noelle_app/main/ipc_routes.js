'use strict';

const { ipcMain, app } = require('electron');
const { IPC } = require('./ipc_channels');
const { PATHS, readJsonSafe, writeJsonSafe } = require('./app_paths');
const ollama = require('../core/ai/ollama_client');
const router = require('../core/ai/prompt_router');
const memory = require('../core/ai/memory_store');

function ok(data = {}) { return { ok: true, ...data }; }
function fail(err, extra = {}) {
  const message = err && err.message ? err.message : String(err || 'Erro desconhecido');
  return { ok: false, error: message, ...extra };
}

function registerIpcRoutes() {
  ipcMain.handle(IPC.APP_PING, async () => ok({ pong: true, at: new Date().toISOString() }));

  ipcMain.handle(IPC.APP_INFO, async () => ok({
    name: 'Noelle v20 Chat Texto',
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    appVersion: app.getVersion()
  }));

  ipcMain.handle(IPC.CONFIG_READ, async (_event, name) => {
    try {
      const file = name === 'models' ? PATHS.modelsConfig : PATHS.appConfig;
      return ok({ config: readJsonSafe(file, {}) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle(IPC.CONFIG_WRITE, async (_event, name, value) => {
    try {
      const file = name === 'models' ? PATHS.modelsConfig : PATHS.appConfig;
      writeJsonSafe(file, value || {});
      return ok({ saved: true });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle(IPC.AI_STATUS, async () => {
    try {
      const cfg = readJsonSafe(PATHS.modelsConfig, {});
      const status = await ollama.getStatus(cfg);
      return ok({ status });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle(IPC.AI_CHAT, async (_event, payload) => {
    try {
      const cfg = readJsonSafe(PATHS.modelsConfig, {});
      const text = String(payload && payload.text ? payload.text : '').trim();
      const requestedModel = String(payload && payload.model ? payload.model : '').trim();
      if (!text) return fail(new Error('Digite uma mensagem antes de enviar.'));

      const decision = router.intentFilter(text);
      if (decision.action === 'ignore') {
        return ok({ ignored: true, reply: decision.reason || 'Ignorado pelo filtro de intenção.' });
      }

      const model = requestedModel || cfg.default_model || 'qwen3:0.6b';
      const history = memory.getRecentMessages(8);
      const messages = router.buildMessages({ text, history });
      const started = Date.now();
      const result = await ollama.chat({ cfg, model, messages });
      const ms = Date.now() - started;

      memory.addTurn({ user: text, assistant: result.reply, model, ms });
      return ok({ reply: result.reply, model, ms, raw: result.raw });
    } catch (err) { return fail(err); }
  });
}

module.exports = { registerIpcRoutes };
