"use strict";

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");

const APP_YEAR = 2026;
const OLLAMA_HOST = "127.0.0.1";
const OLLAMA_PORT = 11434;
const USER_DATA_READY = () => app.getPath("userData");

const CORE_DEFAULTS = {
  model: "qwen3:0.6b",
  profile: "rapido",
  persona: "nobre",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo"
};

const MODEL_OPTIONS = {
  "qwen3:0.6b": {
    label: "Qwen3 0.6B Fast",
    note: "Modelo principal, rápido e leve."
  },
  "gemma3:1b": {
    label: "Gemma 3 1B",
    note: "Opcional, um pouco mais pesado."
  },
  "hermes3:3b": {
    label: "Hermes 3B",
    note: "Opcional e mais pesado."
  }
};

const PROFILE_OPTIONS = {
  turbo: {
    label: "Turbo",
    timeoutMs: 90000,
    keep_alive: "20m",
    options: { num_ctx: 768, num_predict: 160, temperature: 0.35, top_p: 0.7, repeat_penalty: 1.08 }
  },
  rapido: {
    label: "Rápido",
    timeoutMs: 120000,
    keep_alive: "20m",
    options: { num_ctx: 1024, num_predict: 256, temperature: 0.45, top_p: 0.78, repeat_penalty: 1.08 }
  },
  economico: {
    label: "Econômico",
    timeoutMs: 120000,
    keep_alive: 0,
    options: { num_ctx: 768, num_predict: 160, temperature: 0.40, top_p: 0.72, repeat_penalty: 1.08 }
  }
};

const PERSONA_OPTIONS = {
  nobre: {
    label: "Nobre rica",
    prompt: "Você é Noelle, uma IA local elegante, confiante, educada e levemente majestosa. Responda em português brasileiro, com clareza, sem enrolar e considerando 2026 como contexto atual do projeto."
  },
  direta: {
    label: "Direta",
    prompt: "Você é Noelle, uma IA local direta e prática. Responda em português brasileiro, curto, claro e focado na solução. Considere 2026 como contexto atual do projeto."
  },
  fofa: {
    label: "Fofa",
    prompt: "Você é Noelle, uma IA local gentil e acolhedora. Responda em português brasileiro com tom leve, útil e objetivo. Considere 2026 como contexto atual do projeto."
  },
  seria: {
    label: "Séria",
    prompt: "Você é Noelle, uma IA local séria, calma e focada. Responda em português brasileiro com precisão e sem brincadeiras. Considere 2026 como contexto atual do projeto."
  }
};

let mainWin = null;
let runtime = {
  lastStatus: "iniciando",
  lastError: null,
  lastChatSeconds: null,
  lastSuccessAt: null
};

function ensureDir(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function stateFile() {
  const dir = path.join(USER_DATA_READY(), "state");
  ensureDir(dir);
  return path.join(dir, "noelle-state.json");
}

function logFile() {
  const dir = path.join(USER_DATA_READY(), "logs");
  ensureDir(dir);
  return path.join(dir, "noelle-core.log");
}

function appendLog(message, extra = null) {
  try {
    const line = JSON.stringify({ at: new Date().toISOString(), message, extra }) + "\n";
    fs.appendFileSync(logFile(), line, "utf8");
  } catch (_) {}
}

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (_) {
    return fallback;
  }
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
}

function loadState() {
  const saved = readJson(stateFile(), {});
  return {
    model: MODEL_OPTIONS[saved.model] ? saved.model : CORE_DEFAULTS.model,
    profile: PROFILE_OPTIONS[saved.profile] ? saved.profile : CORE_DEFAULTS.profile,
    persona: PERSONA_OPTIONS[saved.persona] ? saved.persona : CORE_DEFAULTS.persona,
    messages: Array.isArray(saved.messages) ? saved.messages.slice(-40) : [],
    memories: Array.isArray(saved.memories) ? saved.memories.slice(-50) : [],
    theme: saved.theme || "noelle"
  };
}

function saveState(patch) {
  const current = loadState();
  const next = { ...current, ...patch };
  writeJson(stateFile(), next);
  return next;
}

function trimErr(value, max = 700) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function ollamaRequest(method, apiPath, payload = null, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const body = payload === null ? null : JSON.stringify(payload);
    const req = http.request(
      {
        hostname: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: apiPath,
        method,
        headers: body
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
          : {},
        timeout: Math.max(3000, Number(timeoutMs || 30000))
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
        resolve({ ok: false, error: "Ollama fechado/offline em 127.0.0.1:11434." });
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
    "Você roda dentro do Noelle Companion em Electron.",
    "Se houver erro de app, responda com diagnóstico curto e ação clara.",
    "Não invente status do sistema; quando não souber, diga para testar o diagnóstico.",
    memories
  ].filter(Boolean).join("\n");
}

function normalizeMessage(item) {
  const role = item?.role === "assistant" || item?.role === "user" || item?.role === "system" ? item.role : "user";
  const content = String(item?.content || "").trim().slice(0, 4000);
  return content ? { role, content } : null;
}

async function chatWithNoelle(payload) {
  const start = Date.now();
  const state = loadState();
  const model = MODEL_OPTIONS[payload?.model] ? payload.model : state.model;
  const profileKey = PROFILE_OPTIONS[payload?.profile] ? payload.profile : state.profile;
  const persona = PERSONA_OPTIONS[payload?.persona] ? payload.persona : state.persona;
  const profile = PROFILE_OPTIONS[profileKey] || PROFILE_OPTIONS.rapido;
  saveState({ model, profile: profileKey, persona });

  const userText = String(payload?.message || "").trim();
  if (!userText) return { ok: false, error: "Mensagem vazia." };

  const history = Array.isArray(payload?.history) ? payload.history.map(normalizeMessage).filter(Boolean).slice(-12) : [];
  const currentState = loadState();
  currentState.model = model;
  currentState.profile = profileKey;
  currentState.persona = persona;

  const messages = [
    { role: "system", content: buildSystemPrompt(currentState) },
    ...history,
    { role: "user", content: userText }
  ];

  runtime.lastStatus = "gerando";
  const result = await ollamaRequest("POST", "/api/chat", {
    model,
    messages,
    stream: false,
    keep_alive: profile.keep_alive,
    options: profile.options
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
    platform: process.platform,
    userData: USER_DATA_READY(),
    ollama: {
      ok: !!ping.ok,
      url: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,
      error: ping.ok ? null : ping.error,
      models: ping.ok && Array.isArray(ping.data?.models) ? ping.data.models.map((m) => m.name).slice(0, 80) : []
    },
    runtime,
    state,
    options: {
      models: MODEL_OPTIONS,
      profiles: PROFILE_OPTIONS,
      personas: Object.fromEntries(Object.entries(PERSONA_OPTIONS).map(([k, v]) => [k, { label: v.label }]))
    }
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
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWin.once("ready-to-show", () => mainWin.show());
  mainWin.loadFile(path.join(__dirname, "src", "controls.html"));
}

app.whenReady().then(() => {
  ensureDir(path.join(USER_DATA_READY(), "state"));
  ensureDir(path.join(USER_DATA_READY(), "logs"));
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.handle("noelle:status", async () => getStatus());
ipcMain.handle("noelle:chat", async (_event, payload) => chatWithNoelle(payload || {}));
ipcMain.handle("noelle:save-state", async (_event, patch) => ({ ok: true, state: saveState(patch || {}) }));
ipcMain.handle("noelle:load-state", async () => ({ ok: true, state: loadState() }));
ipcMain.handle("noelle:open-external", async (_event, url) => {
  const target = String(url || "");
  if (/^https?:\/\//i.test(target)) {
    await shell.openExternal(target);
    return { ok: true };
  }
  return { ok: false, error: "URL inválida." };
});
