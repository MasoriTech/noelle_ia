/*
  Noelle Chat IA Decente 2026
  Janela dedicada para conversar com Ollama sem tocar no main.js do app principal.
*/
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT = __dirname;
const STATE_DIR = path.join(app.getPath('userData'), 'noelle-chat-discord');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const LOG_FILE = path.join(STATE_DIR, 'chat.log');

let mainWindow = null;

const DEFAULT_STATE = {
  config: {
    ollamaHost: '127.0.0.1',
    ollamaPort: 11434,
    model: 'qwen3:0.6b',
    profile: 'turbo',
    persona: 'nobre',
    sessionId: 'noelle_chat_main',
    keepAlive: '20m',
  },
  memories: [],
  sessions: {
    noelle_chat_main: { history: [] },
  },
};

const PROFILES = {
  turbo: {
    id: 'turbo',
    label: 'Turbo / PC fraco',
    timeoutMs: 90_000,
    keep_alive: '20m',
    options: {
      num_ctx: 768,
      num_predict: 180,
      num_thread: 2,
      num_batch: 64,
      temperature: 0.42,
      top_p: 0.76,
      repeat_penalty: 1.08,
    },
  },
  rapido: {
    id: 'rapido',
    label: 'Rápido',
    timeoutMs: 120_000,
    keep_alive: '20m',
    options: {
      num_ctx: 1024,
      num_predict: 256,
      num_thread: 2,
      num_batch: 96,
      temperature: 0.48,
      top_p: 0.80,
      repeat_penalty: 1.08,
    },
  },
  minimo: {
    id: 'minimo',
    label: 'Mínimo / emergência',
    timeoutMs: 90_000,
    keep_alive: '10m',
    options: {
      num_ctx: 512,
      num_predict: 120,
      num_thread: 2,
      num_batch: 48,
      temperature: 0.36,
      top_p: 0.70,
      repeat_penalty: 1.09,
    },
  },
};

const PERSONAS = {
  nobre: {
    id: 'nobre',
    label: 'Noelle nobre',
    prompt: [
      'Você é Noelle, uma IA local integrada ao Noelle Companion.',
      'Fale em português brasileiro por padrão.',
      'Contexto do projeto: ano atual 2026, Brasil, PC possivelmente fraco.',
      'Sua personalidade é elegante, nobre, confiante e útil, sem exagerar.',
      'Responda de forma curta quando a pergunta for simples.',
      'Para código, explique direto e entregue passos práticos.',
      'Não mostre raciocínio interno e não escreva tags <think>.',
    ].join('\n'),
  },
  direta: {
    id: 'direta',
    label: 'Direta',
    prompt: [
      'Você é Noelle, uma IA local do Noelle Companion.',
      'Fale em português brasileiro.',
      'Seja clara, prática e objetiva.',
      'Priorize diagnóstico e solução sem enrolação.',
      'Não mostre raciocínio interno.',
    ].join('\n'),
  },
  dev: {
    id: 'dev',
    label: 'Dev / bugs',
    prompt: [
      'Você é Noelle em modo desenvolvedora.',
      'Ajude a localizar bugs, organizar código e propor correções robustas.',
      'Fale em português brasileiro.',
      'Dê respostas práticas com arquivos, caminhos e passos.',
      'Não mostre raciocínio interno.',
    ].join('\n'),
  },
};

function ensureDir() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
}

function logLine(message, extra = null) {
  try {
    ensureDir();
    fs.appendFileSync(LOG_FILE, JSON.stringify({ at: new Date().toISOString(), message, extra }) + '\n', 'utf8');
  } catch (_) {}
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function readState() {
  ensureDir();
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const merged = cloneDefaultState();
    merged.config = { ...merged.config, ...(parsed.config || {}) };
    merged.memories = Array.isArray(parsed.memories) ? parsed.memories.slice(-20) : [];
    merged.sessions = parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : merged.sessions;
    if (!merged.sessions[merged.config.sessionId]) merged.sessions[merged.config.sessionId] = { history: [] };
    return merged;
  } catch (_) {
    const fresh = cloneDefaultState();
    writeState(fresh);
    return fresh;
  }
}

function writeState(state) {
  ensureDir();
  const safe = state || cloneDefaultState();
  fs.writeFileSync(STATE_FILE, JSON.stringify(safe, null, 2), 'utf8');
}

function getProfile(id) {
  return PROFILES[id] || PROFILES.turbo;
}

function getPersona(id) {
  return PERSONAS[id] || PERSONAS.nobre;
}

function trimError(value, max = 900) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function cleanReply(text) {
  let out = String(text || '').trim();
  out = out.replace(/[\s\S]*?<\/think>/gi, '').trim();
  out = out.replace(/<think>[\s\S]*$/gi, '').trim();
  out = out.replace(/^Noelle:\s*/i, '').trim();
  return out || 'Não consegui formar uma resposta agora.';
}

function ollamaRequest(method, apiPath, payload = null, timeoutMs = 30_000, configOverride = null) {
  const state = readState();
  const cfg = { ...state.config, ...(configOverride || {}) };
  return new Promise((resolve) => {
    const body = payload === null ? null : JSON.stringify(payload);
    const req = http.request({
      hostname: cfg.ollamaHost || '127.0.0.1',
      port: Number(cfg.ollamaPort || 11434),
      path: apiPath,
      method,
      headers: body ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      } : {},
      timeout: Math.max(3000, Number(timeoutMs || 30_000)),
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
        if (data.length > 2 * 1024 * 1024) data = data.slice(-1024 * 1024);
      });
      res.on('end', () => {
        let parsed = {};
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch (err) {
          resolve({ ok: false, statusCode: res.statusCode, error: 'Resposta inválida do Ollama: ' + trimError(err.message), raw: data.slice(0, 500) });
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, statusCode: res.statusCode, data: parsed });
        } else {
          resolve({ ok: false, statusCode: res.statusCode, data: parsed, error: trimError(parsed.error || parsed.message || data || `HTTP ${res.statusCode}`) });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', (err) => {
      const raw = trimError(err.message || err);
      resolve({ ok: false, error: raw === 'timeout' ? 'Ollama demorou demais para responder.' : `Ollama não respondeu em ${cfg.ollamaHost || '127.0.0.1'}:${cfg.ollamaPort || 11434}. Detalhe: ${raw}` });
    });
    if (body) req.write(body);
    req.end();
  });
}

function errorHint(error, model) {
  const raw = String(error || '').toLowerCase();
  if (raw.includes('econnrefused') || raw.includes('não respondeu')) return 'Abra o Ollama antes de usar o chat.';
  if (raw.includes('not found') || raw.includes('pull model')) return `Modelo ${model} não encontrado. Rode: ollama pull ${model}`;
  if (raw.includes('timeout') || raw.includes('demorou')) return 'Use o perfil Mínimo, clique em Pré-carregar e feche programas pesados.';
  if (raw.includes('context') || raw.includes('memory') || raw.includes('ram')) return 'Reduza o histórico, use perfil Mínimo e mantenha só um modelo aberto.';
  return 'Verifique se o Ollama está aberto e se o modelo foi baixado.';
}

function buildMessages(message, state) {
  const cfg = state.config;
  const session = state.sessions[cfg.sessionId] || { history: [] };
  const persona = getPersona(cfg.persona);
  const memories = (state.memories || []).slice(-5).map((m) => '- ' + String(m.text || m).slice(0, 160)).join('\n');
  const system = [persona.prompt, memories ? `\nMemórias úteis:\n${memories}` : ''].filter(Boolean).join('\n');
  const messages = [{ role: 'system', content: system }];
  for (const item of (session.history || []).slice(-8)) {
    if (!item || !item.role || !item.content) continue;
    messages.push({ role: item.role, content: String(item.content).slice(0, 1200) });
  }
  messages.push({ role: 'user', content: String(message).slice(0, 3000) });
  return messages;
}

function tokensPerSecond(data) {
  const count = Number(data?.eval_count || 0);
  const duration = Number(data?.eval_duration || 0);
  if (!count || !duration) return null;
  return Number((count / (duration / 1e9)).toFixed(2));
}

ipcMain.handle('noelle-chat:get-state', async () => {
  const state = readState();
  const session = state.sessions[state.config.sessionId] || { history: [] };
  return {
    ok: true,
    config: state.config,
    profiles: PROFILES,
    personas: PERSONAS,
    history: Array.isArray(session.history) ? session.history : [],
    stateFile: STATE_FILE,
    logFile: LOG_FILE,
  };
});

ipcMain.handle('noelle-chat:set-config', async (_event, patch = {}) => {
  const state = readState();
  const next = { ...state.config };
  if (typeof patch.model === 'string' && patch.model.trim()) next.model = patch.model.trim();
  if (PROFILES[patch.profile]) next.profile = patch.profile;
  if (PERSONAS[patch.persona]) next.persona = patch.persona;
  if (typeof patch.sessionId === 'string' && patch.sessionId.trim()) next.sessionId = patch.sessionId.trim().slice(0, 80);
  state.config = next;
  if (!state.sessions[next.sessionId]) state.sessions[next.sessionId] = { history: [] };
  writeState(state);
  return { ok: true, config: next };
});

ipcMain.handle('noelle-chat:status', async () => {
  const state = readState();
  const cfg = state.config;
  const [tags, ps] = await Promise.all([
    ollamaRequest('GET', '/api/tags', null, 5000, cfg),
    ollamaRequest('GET', '/api/ps', null, 5000, cfg),
  ]);
  const installed = tags.ok && Array.isArray(tags.data?.models) ? tags.data.models.map((m) => m.name || m.model).filter(Boolean) : [];
  const loaded = ps.ok && Array.isArray(ps.data?.models) ? ps.data.models.map((m) => m.name || m.model).filter(Boolean) : [];
  const model = cfg.model || DEFAULT_STATE.config.model;
  return {
    ok: tags.ok,
    ollamaOnline: tags.ok,
    error: tags.ok ? null : tags.error,
    hint: tags.ok ? null : errorHint(tags.error, model),
    model,
    installed,
    loaded,
    activeModelInstalled: installed.some((name) => name === model || String(name).startsWith(model + ':')),
    activeModelLoaded: loaded.some((name) => name === model || String(name).startsWith(model + ':')),
    profile: cfg.profile,
    persona: cfg.persona,
  };
});

ipcMain.handle('noelle-chat:chat', async (_event, payload = {}) => {
  const started = Date.now();
  const message = String(payload.message || '').trim();
  if (!message) return { ok: false, error: 'Mensagem vazia.' };
  const state = readState();
  state.config = { ...state.config, ...(payload.config || {}) };
  const cfg = state.config;
  const profile = getProfile(cfg.profile);
  const body = {
    model: cfg.model || DEFAULT_STATE.config.model,
    messages: buildMessages(message, state),
    stream: false,
    think: false,
    keep_alive: profile.keep_alive,
    options: { ...profile.options },
  };
  logLine('chat_start', { model: body.model, profile: profile.id, persona: cfg.persona });
  const res = await ollamaRequest('POST', '/api/chat', body, profile.timeoutMs, cfg);
  const seconds = Number(((Date.now() - started) / 1000).toFixed(2));
  if (!res.ok) {
    const hint = errorHint(res.error, body.model);
    logLine('chat_error', { error: res.error, hint, seconds });
    return { ok: false, error: res.error, hint, model: body.model, seconds };
  }
  const reply = cleanReply(res.data?.message?.content || res.data?.response || '');
  const session = state.sessions[cfg.sessionId] || { history: [] };
  session.history = Array.isArray(session.history) ? session.history : [];
  session.history.push({ role: 'user', content: message, at: new Date().toISOString() });
  session.history.push({ role: 'assistant', content: reply, at: new Date().toISOString() });
  session.history = session.history.slice(-30);
  state.sessions[cfg.sessionId] = session;
  writeState(state);
  const metrics = {
    seconds,
    tokensPerSecond: tokensPerSecond(res.data),
    evalCount: res.data?.eval_count || null,
  };
  logLine('chat_success', { model: body.model, seconds, tokensPerSecond: metrics.tokensPerSecond });
  return { ok: true, reply, model: body.model, profile: profile.id, persona: cfg.persona, metrics, history: session.history };
});

ipcMain.handle('noelle-chat:preload', async () => {
  const state = readState();
  const cfg = state.config;
  const profile = getProfile(cfg.profile);
  const res = await ollamaRequest('POST', '/api/generate', { model: cfg.model, prompt: '', stream: false, keep_alive: profile.keep_alive }, profile.timeoutMs, cfg);
  return { ok: res.ok, model: cfg.model, error: res.ok ? null : res.error, hint: res.ok ? null : errorHint(res.error, cfg.model) };
});

ipcMain.handle('noelle-chat:unload', async () => {
  const state = readState();
  const cfg = state.config;
  const res = await ollamaRequest('POST', '/api/generate', { model: cfg.model, prompt: '', stream: false, keep_alive: 0 }, 20_000, cfg);
  return { ok: res.ok, model: cfg.model, error: res.ok ? null : res.error };
});

ipcMain.handle('noelle-chat:reset', async () => {
  const state = readState();
  const sessionId = state.config.sessionId || DEFAULT_STATE.config.sessionId;
  state.sessions[sessionId] = { history: [] };
  writeState(state);
  return { ok: true, history: [] };
});

ipcMain.handle('noelle-chat:remember', async (_event, text) => {
  const value = String(text || '').trim();
  if (!value) return { ok: false, error: 'Memória vazia.' };
  const state = readState();
  state.memories = Array.isArray(state.memories) ? state.memories : [];
  state.memories.push({ text: value.slice(0, 500), at: new Date().toISOString() });
  state.memories = state.memories.slice(-20);
  writeState(state);
  return { ok: true, memories: state.memories };
});

ipcMain.handle('noelle-chat:open-paths', async () => {
  shell.showItemInFolder(STATE_FILE);
  return { ok: true, stateFile: STATE_FILE, logFile: LOG_FILE };
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 680,
    minWidth: 820,
    minHeight: 560,
    backgroundColor: '#0b0d14',
    title: 'Noelle Chat IA',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(ROOT, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(ROOT, 'chat.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
