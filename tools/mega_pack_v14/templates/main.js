"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const APP_YEAR = 2026;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1";
const OLLAMA_PORT = Number(process.env.OLLAMA_PORT || 11434);
const DEFAULT_MODEL = process.env.NOELLE_MODEL || "qwen3:0.6b";

const CORE_DEFAULTS = {
  model: DEFAULT_MODEL,
  profile: "rapido",
  persona: "nobre",
  theme: "noelle",
  selectedExpression: null,
};

const MODEL_OPTIONS = {
  "qwen3:0.6b": { label: "Qwen3 0.6B Fast", note: "Modelo principal, rápido e leve." },
  "gemma3:1b": { label: "Gemma 3 1B", note: "Opcional, leve." },
  "hermes3:3b": { label: "Hermes 3B", note: "Opcional, mais pesado." },
};

const PROFILE_OPTIONS = {
  turbo: {
    label: "Turbo",
    timeoutMs: 90_000,
    keep_alive: "20m",
    options: { num_ctx: 768, num_predict: 180, temperature: 0.35, top_p: 0.7, repeat_penalty: 1.08 },
  },
  rapido: {
    label: "Rápido",
    timeoutMs: 120_000,
    keep_alive: "20m",
    options: { num_ctx: 1024, num_predict: 280, temperature: 0.45, top_p: 0.78, repeat_penalty: 1.08 },
  },
  economico: {
    label: "Econômico",
    timeoutMs: 120_000,
    keep_alive: 0,
    options: { num_ctx: 768, num_predict: 160, temperature: 0.4, top_p: 0.72, repeat_penalty: 1.08 },
  },
};

const PERSONA_OPTIONS = {
  nobre: {
    label: "Nobre rica",
    prompt:
      "Você é Noelle, uma IA local elegante, confiante, educada e levemente majestosa. Responda em português brasileiro, com clareza, sem enrolar e considerando 2026 como contexto atual do projeto.",
  },
  direta: {
    label: "Direta",
    prompt:
      "Você é Noelle, uma IA local direta e prática. Responda em português brasileiro, curto, claro e focado na solução. Considere 2026 como contexto atual do projeto.",
  },
  fofa: {
    label: "Fofa",
    prompt:
      "Você é Noelle, uma IA local gentil e acolhedora. Responda em português brasileiro com tom leve, útil e objetivo. Considere 2026 como contexto atual do projeto.",
  },
  seria: {
    label: "Séria",
    prompt:
      "Você é Noelle, uma IA local séria, calma e focada. Responda em português brasileiro com precisão e sem brincadeiras. Considere 2026 como contexto atual do projeto.",
  },
};

let mainWin = null;
const runtime = {
  lastStatus: "iniciando",
  lastError: null,
  lastChatSeconds: null,
  lastSuccessAt: null,
};

function rootPath(...parts) {
  return path.join(__dirname, ...parts);
}

function ensureDir(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function stateFile() {
  const dir = path.join(app.getPath("userData"), "state");
  ensureDir(dir);
  return path.join(dir, "noelle-state.json");
}

function logFile() {
  const dir = path.join(app.getPath("userData"), "logs");
  ensureDir(dir);
  return path.join(dir, "noelle-core.log");
}

function appendLog(message, extra = null) {
  try {
    fs.appendFileSync(logFile(), JSON.stringify({ at: new Date().toISOString(), message, extra }) + "\n", "utf8");
  } catch {
    // log nunca pode quebrar a UI
  }
}

function trimErr(value, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function sanitizeState(saved) {
  const state = saved && typeof saved === "object" ? saved : {};
  return {
    model: MODEL_OPTIONS[state.model] ? state.model : CORE_DEFAULTS.model,
    profile: PROFILE_OPTIONS[state.profile] ? state.profile : CORE_DEFAULTS.profile,
    persona: PERSONA_OPTIONS[state.persona] ? state.persona : CORE_DEFAULTS.persona,
    theme: ["noelle", "pbv", "dark", "light"].includes(state.theme) ? state.theme : CORE_DEFAULTS.theme,
    selectedExpression: typeof state.selectedExpression === "string" ? state.selectedExpression : null,
    messages: Array.isArray(state.messages) ? state.messages.slice(-50) : [],
    memories: Array.isArray(state.memories) ? state.memories.slice(-60) : [],
  };
}

function loadState() {
  return sanitizeState(readJson(stateFile(), {}));
}

function saveState(patch) {
  const current = loadState();
  const next = sanitizeState({ ...current, ...(patch || {}) });
  writeJson(stateFile(), next);
  return next;
}

function expressionDir() {
  return rootPath("src", "assets", "expressions");
}

function getDefaultExpressions() {
  return [
    { id: "happy", file: "happy.png", label: "Feliz" },
    { id: "angry", file: "angry.png", label: "Brava" },
    { id: "sad", file: "sad.png", label: "Triste" },
    { id: "sick", file: "sick.png", label: "Passando mal" },
  ];
}

function normalizeExpression(item, index) {
  const file = String(item?.file || "").replace(/[\\/]/g, "").trim();
  if (!file) return null;
  const id = String(item?.id || path.basename(file, path.extname(file)) || `expr_${index}`).replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  const label = String(item?.label || id).trim();
  const absolute = path.join(expressionDir(), file);
  return {
    id,
    file,
    label,
    exists: fs.existsSync(absolute),
    src: `assets/expressions/${encodeURIComponent(file)}`,
  };
}

function listExpressions() {
  const manifestFile = path.join(expressionDir(), "manifest.json");
  const manifest = readJson(manifestFile, getDefaultExpressions());
  const list = Array.isArray(manifest) ? manifest : getDefaultExpressions();
  return list.map(normalizeExpression).filter(Boolean);
}

function ensureExpressionManifest() {
  const dir = expressionDir();
  ensureDir(dir);
  const manifestFile = path.join(dir, "manifest.json");
  const current = readJson(manifestFile, null);
  if (!Array.isArray(current) || current.length === 0) {
    writeJson(manifestFile, getDefaultExpressions());
  }
}

function ollamaRequest(method, apiPath, payload = null, timeoutMs = 30_000) {
  return new Promise((resolve) => {
    const body = payload === null ? null : JSON.stringify(payload);
    const req = http.request(
      {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: apiPath,
        method,
        headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {},
        timeout: Math.max(3_000, Number(timeoutMs || 30_000)),
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
          if (data.length > 2 * 1024 * 1024) data = data.slice(-1024 * 1024);
        });
        res.on("end", () => {
          let parsed = {};
          try {
            parsed = data ? JSON.parse(data) : {};
          } catch (err) {
            resolve({ ok: false, statusCode: res.statusCode, error: "Resposta inválida do Ollama: " + trimErr(err.message), raw: data.slice(0, 500) });
            return;
          }
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ ok: true, statusCode: res.statusCode, data: parsed });
          } else {
            resolve({ ok: false, statusCode: res.statusCode, error: trimErr(parsed.error || parsed.message || data || `HTTP ${res.statusCode}`), data: parsed });
          }
        });
      }
    );

    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => {
      const msg = trimErr(err?.message || err);
      if (/ECONNREFUSED|connect/i.test(msg)) {
        resolve({ ok: false, error: `Ollama fechado/offline em ${OLLAMA_HOST}:${OLLAMA_PORT}.` });
        return;
      }
      resolve({ ok: false, error: msg === "timeout" ? "Ollama demorou demais para responder." : msg });
    });
    if (body) req.write(body);
    req.end();
  });
}

function buildSystemPrompt(state) {
  const persona = PERSONA_OPTIONS[state.persona] || PERSONA_OPTIONS.nobre;
  const memories = Array.isArray(state.memories) && state.memories.length
    ? "\nMemórias úteis:\n" + state.memories.slice(-10).map((m, i) => `${i + 1}. ${String(m.text || m).slice(0, 300)}`).join("\n")
    : "";
  return [
    persona.prompt,
    "Você roda localmente no Noelle Companion em Electron.",
    "Quando o usuário falar de bug do app, responda com diagnóstico curto e ação clara.",
    "Não invente status do sistema; quando não souber, peça para rodar o diagnóstico.",
    memories,
  ].filter(Boolean).join("\n");
}

function normalizeMessage(item) {
  const role = item?.role === "assistant" || item?.role === "user" || item?.role === "system" ? item.role : "user";
  const content = String(item?.content || "").trim().slice(0, 4_000);
  return content ? { role, content } : null;
}

async function chatWithNoelle(payload) {
  const start = Date.now();
  const saved = loadState();
  const model = MODEL_OPTIONS[payload?.model] ? payload.model : saved.model;
  const profileKey = PROFILE_OPTIONS[payload?.profile] ? payload.profile : saved.profile;
  const persona = PERSONA_OPTIONS[payload?.persona] ? payload.persona : saved.persona;
  const profile = PROFILE_OPTIONS[profileKey] || PROFILE_OPTIONS.rapido;
  const userText = String(payload?.message || "").trim();
  if (!userText) return { ok: false, error: "Mensagem vazia." };

  const history = Array.isArray(payload?.history) ? payload.history.map(normalizeMessage).filter(Boolean).slice(-14) : [];
  const currentState = saveState({ model, profile: profileKey, persona });
  const messages = [
    { role: "system", content: buildSystemPrompt(currentState) },
    ...history,
    { role: "user", content: userText },
  ];

  runtime.lastStatus = "gerando";
  runtime.lastError = null;
  const result = await ollamaRequest("POST", "/api/chat", {
    model,
    messages,
    stream: false,
    keep_alive: profile.keep_alive,
    options: profile.options,
  }, profile.timeoutMs);

  const seconds = ((Date.now() - start) / 1000).toFixed(2);
  runtime.lastChatSeconds = seconds;
  if (!result.ok) {
    runtime.lastStatus = "erro";
    runtime.lastError = result.error;
    appendLog("chat_error", { error: result.error, model, profile: profileKey });
    return { ok: false, error: result.error, seconds, ollamaUrl: `http://${OLLAMA_HOST}:${OLLAMA_PORT}` };
  }

  const text = String(result.data?.message?.content || result.data?.response || "").trim();
  if (!text) {
    runtime.lastStatus = "erro";
    runtime.lastError = "Resposta vazia do Ollama.";
    return { ok: false, error: runtime.lastError, seconds };
  }

  runtime.lastStatus = "pronto";
  runtime.lastError = null;
  runtime.lastSuccessAt = new Date().toISOString();
  appendLog("chat_ok", { seconds, model, profile: profileKey });
  return { ok: true, message: text, seconds, model, profile: profileKey, persona };
}

async function getStatus() {
  const state = loadState();
  const ping = await ollamaRequest("GET", "/api/tags", null, 3500);
  return {
    ok: true,
    year: APP_YEAR,
    app: "Noelle Companion",
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
    platform: process.platform,
    userData: app.getPath("userData"),
    projectRoot: __dirname,
    ollama: {
      ok: !!ping.ok,
      url: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,
      error: ping.ok ? null : ping.error,
      models: ping.ok && Array.isArray(ping.data?.models) ? ping.data.models.map((m) => m.name).slice(0, 100) : [],
    },
    runtime,
    state,
    expressions: listExpressions(),
    options: {
      models: MODEL_OPTIONS,
      profiles: PROFILE_OPTIONS,
      personas: Object.fromEntries(Object.entries(PERSONA_OPTIONS).map(([k, v]) => [k, { label: v.label }])),
    },
  };
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
    title: "Noelle Companion",
    backgroundColor: "#090711",
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: "default",
    show: false,
    webPreferences: {
      preload: rootPath("preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWin.once("ready-to-show", () => mainWin.show());
  mainWin.loadFile(rootPath("src", "controls.html"));
}

function registerIpc() {
  ipcMain.handle("noelle:status", async () => getStatus());
  ipcMain.handle("noelle:chat", async (_event, payload) => chatWithNoelle(payload || {}));
  ipcMain.handle("noelle:save-state", async (_event, patch) => ({ ok: true, state: saveState(patch || {}) }));
  ipcMain.handle("noelle:load-state", async () => ({ ok: true, state: loadState() }));
  ipcMain.handle("noelle:list-expressions", async () => ({ ok: true, expressions: listExpressions() }));
  ipcMain.handle("noelle:apply-expression", async (_event, id) => {
    const expressionId = String(id || "").trim();
    const found = listExpressions().find((item) => item.id === expressionId || item.file === expressionId);
    if (!found) return { ok: false, error: "Expressão não encontrada." };
    const state = saveState({ selectedExpression: found.id });
    appendLog("expression_selected", found);
    return { ok: true, expression: found, state };
  });
  ipcMain.handle("noelle:open-external", async (_event, url) => {
    const target = String(url || "");
    if (/^https?:\/\//i.test(target)) {
      await shell.openExternal(target);
      return { ok: true };
    }
    return { ok: false, error: "URL inválida." };
  });
}

app.whenReady().then(() => {
  ensureDir(path.join(app.getPath("userData"), "state"));
  ensureDir(path.join(app.getPath("userData"), "logs"));
  ensureExpressionManifest();
  registerIpc();
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
