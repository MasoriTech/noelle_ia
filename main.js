const { app, BrowserWindow, ipcMain, screen, globalShortcut, nativeImage, Tray, Menu, shell, nativeTheme, dialog } = require("electron");
const { pathToFileURL } = require("url");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");
const { AVATAR_WINDOW_CONFIG, CONTROLS_WINDOW_CONFIG } = require("./src/renderer/config.cjs");

let log = console;
try {
  log = require("electron-log/main");
  if (typeof log.initialize === "function") log.initialize();
  if (log.errorHandler?.startCatching) {
    log.errorHandler.startCatching({ showDialog: false });
  }
} catch (err) {
  console.warn("electron-log indisponível:", err?.message || err);
}


let launcherWin = null;
let avatarWin = null;
let controlsWin = null;
let tray = null;
let clickThrough = false;
let isQuitting = false;
const dragStates = new Map();

const ROOT_DIR = path.join(__dirname, "src");
const STATE_DIR = app.getPath("userData");
const LAUNCHER_STATE_FILE = path.join(STATE_DIR, "launcher-window-state.json");
const AVATAR_STATE_FILE = path.join(STATE_DIR, "avatar-window-state.json");
const CONTROLS_STATE_FILE = path.join(STATE_DIR, "controls-window-state.json");

const RUNTIME_AVATAR_DIR = path.join(STATE_DIR, "runtime-avatar");
const DEFAULT_AVATAR_FILE = path.join(__dirname, "src", "assets", "Noelle.vrm");
const DEFAULT_AVATAR_ARISA_FILE = path.join(__dirname, "src", "assets", "avatars", "arisa.vrm");
const BACKUP_AVATAR_FILE = path.join(__dirname, "src", "assets", "fallback", "Noelle_backup.vrm");
const USER_AVATAR_FILE = path.join(RUNTIME_AVATAR_DIR, "current-avatar.vrm");
const AVATAR_LIBRARY_DIR = path.join(STATE_DIR, "avatar-library");
const AVATAR_LIBRARY_MANIFEST_FILE = path.join(AVATAR_LIBRARY_DIR, "avatars.json");
const DEFAULT_AVATAR_SIZE = { width: AVATAR_WINDOW_CONFIG.defaultWidth, height: AVATAR_WINDOW_CONFIG.defaultHeight };
const DEFAULT_CONTROLS_SIZE = { width: CONTROLS_WINDOW_CONFIG.defaultWidth, height: CONTROLS_WINDOW_CONFIG.defaultHeight };
const DEFAULT_LAUNCHER_SIZE = { width: 720, height: 560 };
const ICON_PNG = path.join(__dirname, "assets", "icons", "noelle_256.png");
const ICON_ICO = path.join(__dirname, "assets", "icons", "app.ico");
const WINDOW_LAYOUT_VERSION = 6;

const NOELLE_CORE_STATE_FILE = path.join(STATE_DIR, "noelle-core-state.json");
const NOELLE_CORE_MEMORY_FILE = path.join(STATE_DIR, "noelle-core-memories.json");
const NOELLE_CORE_LOG_FILE = path.join(STATE_DIR, "noelle-core.log");
const NOELLE_STT_DIR = path.join(STATE_DIR, "noelle-stt");
const NOELLE_STT_TMP_DIR = path.join(NOELLE_STT_DIR, "tmp");
const NOELLE_STT_SCRIPT = path.join(__dirname, "tools", "noelle_stt", "transcribe_audio.py");
const NOELLE_STT_MODEL_CACHE_DIR = path.join(NOELLE_STT_DIR, "models");
const NOELLE_STT_DEFAULTS = {
  model: "medium",
  computeType: "int8",
  language: "pt",
  timeoutMs: 15 * 60 * 1000,
  maxAudioBytes: 20 * 1024 * 1024,
  cpuThreads: 2,
  numWorkers: 1,
  minSilenceDurationMs: 500,
  cacheDir: NOELLE_STT_MODEL_CACHE_DIR
};

const NOELLE_CORE_DEFAULTS = {
  currentYear: 2026,
  country: "Brasil",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo",
  ollamaHost: "127.0.0.1",
  ollamaPort: 11434,
  singleModelOnly: true,
  autoRouter: false,
  useThinking: false,
  activeMode: "fast",
  activeProfile: "turbo",
  activePersona: "nobre",
  models: {
    fast: {
      id: "fast",
      label: "Qwen3 0.6B Fast",
      model: "qwen3:0.6b",
      note: "Principal para PC fraco. Thinking desligado."
    },
    gemma: {
      id: "gemma",
      label: "Gemma 4 E2B",
      model: "gemma4:e2b",
      note: "Opcional. Pode ser pesado dependendo do pacote instalado."
    },
    hermes: {
      id: "hermes",
      label: "Hermes 3B",
      model: "hermes3:3b",
      note: "Opcional e mais pesado."
    }
  },
  profiles: {
    turbo: {
      id: "turbo",
      label: "Turbo",
      keep_alive: "20m",
      timeoutMs: 90000,
      options: {
        num_ctx: 192,
        num_predict: 42,
        num_thread: 2,
        num_batch: 48,
        temperature: 0.36,
        top_p: 0.68,
        repeat_penalty: 1.09
      }
    },
    rapido: {
      id: "rapido",
      label: "Rápido",
      keep_alive: "15m",
      timeoutMs: 120000,
      options: {
        num_ctx: 384,
        num_predict: 80,
        num_thread: 2,
        num_batch: 96,
        temperature: 0.45,
        top_p: 0.78,
        repeat_penalty: 1.08
      }
    },
    minimo: {
      id: "minimo",
      label: "Mínimo",
      keep_alive: "10m",
      timeoutMs: 90000,
      options: {
        num_ctx: 256,
        num_predict: 55,
        num_thread: 2,
        num_batch: 64,
        temperature: 0.40,
        top_p: 0.72,
        repeat_penalty: 1.08
      }
    },
    economico: {
      id: "economico",
      label: "Econômico",
      keep_alive: 0,
      timeoutMs: 120000,
      options: {
        num_ctx: 256,
        num_predict: 60,
        num_thread: 2,
        num_batch: 64,
        temperature: 0.42,
        top_p: 0.74,
        repeat_penalty: 1.08
      }
    }
  },
  personaCommon: [
    "Você é Noelle, uma IA local integrada ao aplicativo Noelle Companion.",
    "Você está no Brasil, fala em português brasileiro por padrão e considera 2026 como contexto atual do projeto.",
    "Priorize respostas curtas, úteis e rápidas, porque o PC do usuário é fraco.",
    "Para perguntas simples, responda em 1 a 3 frases. Para código ou plano, seja organizada, mas sem excesso.",
    "Evite repetir sempre a mesma saudação; responda de forma natural ao contexto.",
    "Não use raciocínio longo, não mostre pensamento interno, não escreva tags <think> e não enrole.",
    "Voz e animações serão conectadas depois; por enquanto responda como chat de texto."
  ].join("\n"),
  personas: {
    nobre: {
      id: "nobre",
      label: "Nobre rica",
      prompt: [
        "Sua personalidade principal é de uma nobre rica, elegante e confiante.",
        "Fale como uma dama aristocrata moderna: refinada, educada, segura e levemente majestosa, sem exagerar.",
        "Evite parecer robô genérico; tenha presença de personagem, mas mantenha respostas úteis.",
        "Você pode chamar o usuário de forma elegante quando combinar, mas mantenha naturalidade."
      ].join("\n")
    },
    direta: {
      id: "direta",
      label: "Direta",
      prompt: [
        "Sua personalidade está em modo direto e prático.",
        "Responda com clareza, pouca enrolação e foco no que resolve o problema.",
        "Mantenha educação refinada, mas sem floreios."
      ].join("\n")
    },
    fofa: {
      id: "fofa",
      label: "Fofa",
      prompt: [
        "Sua personalidade está em modo gentil e carinhosa, sem exagero.",
        "Use uma energia acolhedora, leve e positiva.",
        "Continue útil e objetiva, sem virar resposta infantil."
      ].join("\n")
    },
    seria: {
      id: "seria",
      label: "Séria",
      prompt: [
        "Sua personalidade está em modo sério e focado.",
        "Use tom calmo, profissional e firme.",
        "Evite brincadeiras e vá direto ao diagnóstico ou solução."
      ].join("\n")
    },
    brincalhona: {
      id: "brincalhona",
      label: "Brincalhona",
      prompt: [
        "Sua personalidade está em modo brincalhona leve.",
        "Pode usar humor curto e elegante, sem atrapalhar a resposta.",
        "Continue útil, respeitosa e objetiva."
      ].join("\n")
    }
  }
};

let noelleCoreState = {
  activeMode: NOELLE_CORE_DEFAULTS.activeMode,
  activeProfile: NOELLE_CORE_DEFAULTS.activeProfile,
  activePersona: NOELLE_CORE_DEFAULTS.activePersona,
  sessions: {}
};

let noelleCoreRuntime = {
  lastStatusAt: null,
  lastChatAt: null,
  lastChatSeconds: null,
  lastError: null,
  lastSuccess: null
};

function appendNoelleCoreLog(message, extra = null) {
  try {
    fs.mkdirSync(path.dirname(NOELLE_CORE_LOG_FILE), { recursive: true });
    const line = JSON.stringify({
      at: new Date().toISOString(),
      message,
      extra
    }) + "\n";
    fs.appendFileSync(NOELLE_CORE_LOG_FILE, line, "utf-8");
  } catch {}
}

function noelleCoreLoadState() {
  const saved = safeReadJson(NOELLE_CORE_STATE_FILE, null);
  if (saved && typeof saved === "object") {
    noelleCoreState = {
      activeMode: NOELLE_CORE_DEFAULTS.models[saved.activeMode] ? saved.activeMode : NOELLE_CORE_DEFAULTS.activeMode,
      activeProfile: NOELLE_CORE_DEFAULTS.profiles[saved.activeProfile] ? saved.activeProfile : NOELLE_CORE_DEFAULTS.activeProfile,
      activePersona: NOELLE_CORE_DEFAULTS.personas[saved.activePersona] ? saved.activePersona : NOELLE_CORE_DEFAULTS.activePersona,
      sessions: saved.sessions && typeof saved.sessions === "object" ? saved.sessions : {}
    };
  }
  return noelleCoreState;
}

function noelleCoreSaveState() {
  safeWriteJson(NOELLE_CORE_STATE_FILE, noelleCoreState);
}

function makeNoelleCoreMemoryId() {
  return `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNoelleCoreMemories(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { id: makeNoelleCoreMemoryId(), text: text.slice(0, 500), at: new Date().toISOString(), source: "legacy" } : null;
      }
      if (!item || typeof item !== "object") return null;
      const text = String(item.text || item.memory || "").trim();
      if (!text) return null;
      return {
        id: String(item.id || makeNoelleCoreMemoryId()),
        text: text.slice(0, 500),
        at: item.at || item.createdAt || new Date().toISOString(),
        source: item.source || "manual"
      };
    })
    .filter(Boolean)
    .slice(-50);
}

function noelleCoreLoadMemories() {
  const raw = safeReadJson(NOELLE_CORE_MEMORY_FILE, []);
  const normalized = normalizeNoelleCoreMemories(raw);
  if (Array.isArray(raw) && JSON.stringify(raw) !== JSON.stringify(normalized)) {
    noelleCoreSaveMemories(normalized);
  }
  return normalized;
}

function noelleCoreSaveMemories(memories) {
  safeWriteJson(NOELLE_CORE_MEMORY_FILE, normalizeNoelleCoreMemories(memories));
}

function noelleCoreListMemories() {
  const memories = noelleCoreLoadMemories();
  return { ok: true, count: memories.length, memories };
}

function noelleCoreForgetMemory(target) {
  const memories = noelleCoreLoadMemories();
  if (!memories.length) return { ok: false, error: "Nenhuma memória salva." };

  const raw = String(target ?? "last").trim();
  let index = -1;
  if (!raw || raw.toLowerCase() === "last" || raw.toLowerCase() === "ultima" || raw.toLowerCase() === "última") {
    index = memories.length - 1;
  } else if (/^\d+$/.test(raw)) {
    index = Number(raw) - 1;
  } else {
    index = memories.findIndex((item) => item.id === raw);
  }

  if (index < 0 || index >= memories.length) {
    return { ok: false, error: "Memória não encontrada. Use o número mostrado em Ver memórias." };
  }

  const [removed] = memories.splice(index, 1);
  noelleCoreSaveMemories(memories);
  appendNoelleCoreLog("memory_deleted", { id: removed.id, index: index + 1 });
  return { ok: true, removed, count: memories.length };
}

function noelleCoreClearMemories() {
  noelleCoreSaveMemories([]);
  appendNoelleCoreLog("memories_cleared");
  return { ok: true, count: 0 };
}

function noelleCoreGetModelInfo(mode = null) {
  const key = mode && NOELLE_CORE_DEFAULTS.models[mode] ? mode : noelleCoreState.activeMode;
  return NOELLE_CORE_DEFAULTS.models[key] || NOELLE_CORE_DEFAULTS.models.fast;
}

function noelleCoreGetProfileInfo(profile = null) {
  const key = profile && NOELLE_CORE_DEFAULTS.profiles[profile] ? profile : noelleCoreState.activeProfile;
  return NOELLE_CORE_DEFAULTS.profiles[key] || NOELLE_CORE_DEFAULTS.profiles.rapido;
}

function noelleCoreGetPersonaInfo(persona = null) {
  const key = persona && NOELLE_CORE_DEFAULTS.personas[persona] ? persona : noelleCoreState.activePersona;
  return NOELLE_CORE_DEFAULTS.personas[key] || NOELLE_CORE_DEFAULTS.personas.nobre;
}

function noelleCoreBuildSystemPrompt(memoriesText = "") {
  const persona = noelleCoreGetPersonaInfo();
  return [
    NOELLE_CORE_DEFAULTS.personaCommon,
    "",
    "Persona ativa: " + persona.label,
    persona.prompt,
    memoriesText ? "\nMemórias úteis:\n" + memoriesText : ""
  ].filter(Boolean).join("\n");
}

function noelleCoreStatusBase() {
  const model = noelleCoreGetModelInfo();
  const profile = noelleCoreGetProfileInfo();
  const persona = noelleCoreGetPersonaInfo();
  return {
    ok: true,
    core: "NoelleCore",
    integrated: true,
    year: NOELLE_CORE_DEFAULTS.currentYear,
    country: NOELLE_CORE_DEFAULTS.country,
    locale: NOELLE_CORE_DEFAULTS.locale,
    timezone: NOELLE_CORE_DEFAULTS.timezone,
    activeMode: model.id,
    activeModel: model.model,
    activeModelLabel: model.label,
    activeProfile: profile.id,
    activeProfileLabel: profile.label,
    activePersona: persona.id,
    activePersonaLabel: persona.label,
    singleModelOnly: NOELLE_CORE_DEFAULTS.singleModelOnly,
    autoRouter: NOELLE_CORE_DEFAULTS.autoRouter,
    think: NOELLE_CORE_DEFAULTS.useThinking,
    ollamaUrl: `http://${NOELLE_CORE_DEFAULTS.ollamaHost}:${NOELLE_CORE_DEFAULTS.ollamaPort}`,
    profiles: NOELLE_CORE_DEFAULTS.profiles,
    models: NOELLE_CORE_DEFAULTS.models,
    personas: NOELLE_CORE_DEFAULTS.personas
  };
}

function noelleTrimError(value, max = 900) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function ollamaRequest(method, apiPath, payload = null, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const body = payload === null ? null : JSON.stringify(payload);
    const req = http.request({
      hostname: NOELLE_CORE_DEFAULTS.ollamaHost,
      port: NOELLE_CORE_DEFAULTS.ollamaPort,
      path: apiPath,
      method,
      headers: body ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body)
      } : {},
      timeout: Math.max(3000, Number(timeoutMs || 30000))
    }, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
        if (data.length > 2 * 1024 * 1024) data = data.slice(-1024 * 1024);
      });
      res.on("end", () => {
        let parsed = {};
        try { parsed = data ? JSON.parse(data) : {}; } catch (err) {
          resolve({
            ok: false,
            statusCode: res.statusCode,
            error: "Resposta inválida do Ollama: " + noelleTrimError(err?.message || err),
            raw: data.slice(0, 500)
          });
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, statusCode: res.statusCode, data: parsed });
        } else {
          const base = parsed?.error || parsed?.message || data || `HTTP ${res.statusCode}`;
          resolve({ ok: false, statusCode: res.statusCode, error: noelleTrimError(base), data: parsed });
        }
      });
    });

    req.on("timeout", () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", (err) => {
      const msg = noelleTrimError(err?.message || err);
      resolve({
        ok: false,
        error: msg === "timeout"
          ? "Ollama demorou demais para responder."
          : "Ollama não respondeu em 127.0.0.1:11434. Detalhe: " + msg
      });
    });
    if (body) req.write(body);
    req.end();
  });
}

async function noelleCoreGetOllamaStatus() {
  const [tags, ps] = await Promise.all([
    ollamaRequest("GET", "/api/tags", null, 5000),
    ollamaRequest("GET", "/api/ps", null, 5000)
  ]);

  const installed = tags.ok && Array.isArray(tags.data?.models)
    ? tags.data.models.map((m) => ({ name: m.name || m.model, size: m.size || null, modified_at: m.modified_at || null }))
    : [];

  const loaded = ps.ok && Array.isArray(ps.data?.models)
    ? ps.data.models.map((m) => ({ name: m.name || m.model, size: m.size || null, expires_at: m.expires_at || null }))
    : [];

  const active = noelleCoreGetModelInfo().model;
  const status = {
    ...noelleCoreStatusBase(),
    ollamaOnline: !!tags.ok,
    ollamaError: tags.ok ? null : tags.error,
    installedModels: installed,
    loadedModels: loaded,
    installedCount: installed.length,
    loadedCount: loaded.length,
    activeModelInstalled: installed.some((m) => m.name === active || String(m.name || "").startsWith(active + ":")),
    activeModelLoaded: loaded.some((m) => m.name === active || String(m.name || "").startsWith(active + ":")),
    lastStatusAt: new Date().toISOString(),
    lastChatAt: noelleCoreRuntime.lastChatAt,
    lastChatSeconds: noelleCoreRuntime.lastChatSeconds,
    lastError: noelleCoreRuntime.lastError,
    lastSuccess: noelleCoreRuntime.lastSuccess,
    logFile: NOELLE_CORE_LOG_FILE,
    memoryFile: NOELLE_CORE_MEMORY_FILE
  };
  noelleCoreRuntime.lastStatusAt = status.lastStatusAt;
  return status;
}

function noelleCoreSession(sessionId = "default") {
  const id = String(sessionId || "default").slice(0, 80);
  if (!noelleCoreState.sessions[id]) noelleCoreState.sessions[id] = { history: [] };
  if (!Array.isArray(noelleCoreState.sessions[id].history)) noelleCoreState.sessions[id].history = [];
  return noelleCoreState.sessions[id];
}

function noelleCoreBuildMessages(message, sessionId) {
  const session = noelleCoreSession(sessionId);
  const memories = noelleCoreLoadMemories()
    .slice(-2)
    .map((item) => "- " + String(item.text || item).slice(0, 100))
    .join("\n");
  const messages = [
    {
      role: "system",
      content: noelleCoreBuildSystemPrompt(memories)
    }
  ];

  for (const item of session.history.slice(-2)) {
    if (!item || !item.role || !item.content) continue;
    messages.push({ role: item.role, content: String(item.content).slice(0, 420) });
  }
  messages.push({ role: "user", content: String(message || "").slice(0, 1200) });
  return messages;
}

function noelleCoreCleanReply(text) {
  let out = String(text || "").trim();
  out = out.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  out = out.replace(/<think>[\s\S]*$/gi, "").trim();
  out = out.replace(/^Noelle:\s*/i, "").trim();
  return out || "Não consegui formar uma resposta agora.";
}

function noelleCoreTokensPerSecond(data) {
  const evalCount = Number(data?.eval_count || 0);
  const evalDuration = Number(data?.eval_duration || 0);
  if (!evalCount || !evalDuration) return null;
  return Number((evalCount / (evalDuration / 1e9)).toFixed(2));
}

function noelleCoreBuildMetrics(data, started) {
  return {
    seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
    total_duration: data?.total_duration || null,
    load_duration: data?.load_duration || null,
    prompt_eval_count: data?.prompt_eval_count || null,
    eval_count: data?.eval_count || null,
    eval_duration: data?.eval_duration || null,
    tokens_per_second: noelleCoreTokensPerSecond(data)
  };
}

function noelleCoreErrorHint(error, model) {
  const raw = String(error || "");
  const lower = raw.toLowerCase();
  if (lower.includes("server overloaded") || lower.includes("503")) {
    return "Ollama está sobrecarregado. Aguarde alguns segundos, use Pré-carregar e mantenha apenas 1 modelo aberto.";
  }
  if (lower.includes("not found") || lower.includes("pull model") || (lower.includes("model") && lower.includes("not"))) {
    return "Modelo " + model + " não encontrado. Baixe pelo terminal com: ollama pull " + model;
  }
  if (lower.includes("timeout") || lower.includes("demorou")) {
    return "O modelo demorou demais. Use perfil Mínimo/Turbo, feche outros programas ou clique em Pré-carregar antes de conversar.";
  }
  if (lower.includes("econnrefused") || lower.includes("não respondeu") || lower.includes("127.0.0.1:11434")) {
    return "Ollama parece fechado/offline. Abra o Ollama e teste Status novamente.";
  }
  if (lower.includes("context") || lower.includes("memory") || lower.includes("ram")) {
    return "Parece falta de memória/contexto. Use perfil Turbo/Mínimo e deixe só qwen3:0.6b ativo.";
  }
  return "Verifique se o Ollama está aberto e se o modelo foi baixado.";
}


async function noelleCoreChat(payload = {}) {
  const started = Date.now();
  noelleCoreLoadState();

  const message = String(payload.message || "").trim();
  if (!message) return { ok: false, error: "Mensagem vazia." };

  if (payload.mode && NOELLE_CORE_DEFAULTS.models[payload.mode]) noelleCoreState.activeMode = payload.mode;
  if (payload.profile && NOELLE_CORE_DEFAULTS.profiles[payload.profile]) noelleCoreState.activeProfile = payload.profile;
  if (payload.persona && NOELLE_CORE_DEFAULTS.personas[payload.persona]) noelleCoreState.activePersona = payload.persona;

  const modelInfo = noelleCoreGetModelInfo();
  const profileInfo = noelleCoreGetProfileInfo();
  const personaInfo = noelleCoreGetPersonaInfo();
  const sessionId = String(payload.session_id || payload.sessionId || "noelle_chat");
  const messages = noelleCoreBuildMessages(message, sessionId);

  const body = {
    model: modelInfo.model,
    messages,
    stream: false,
    think: false,
    keep_alive: profileInfo.keep_alive,
    options: { ...profileInfo.options }
  };

  appendNoelleCoreLog("chat_start", { model: modelInfo.model, mode: modelInfo.id, profile: profileInfo.id, persona: personaInfo.id, sessionId });
  const res = await ollamaRequest("POST", "/api/chat", body, profileInfo.timeoutMs);
  if (!res.ok) {
    const seconds = Number(((Date.now() - started) / 1000).toFixed(2));
    const hint = noelleCoreErrorHint(res.error, modelInfo.model);
    noelleCoreRuntime.lastChatAt = new Date().toISOString();
    noelleCoreRuntime.lastChatSeconds = seconds;
    noelleCoreRuntime.lastError = String(res.error || "erro desconhecido").slice(0, 500);
    appendNoelleCoreLog("chat_error", { error: res.error, hint, model: modelInfo.model, seconds });
    return {
      ok: false,
      error: res.error,
      hint,
      model: modelInfo.model,
      mode: modelInfo.id,
      profile: profileInfo.id,
      persona: personaInfo.id,
      personaLabel: personaInfo.label,
      seconds
    };
  }

  const reply = noelleCoreCleanReply(res.data?.message?.content || res.data?.response || "");
  const session = noelleCoreSession(sessionId);
  session.history.push({ role: "user", content: message, at: new Date().toISOString() });
  session.history.push({ role: "assistant", content: reply, at: new Date().toISOString() });
  session.history = session.history.slice(-6);
  noelleCoreSaveState();

  const metrics = noelleCoreBuildMetrics(res.data || {}, started);
  noelleCoreRuntime.lastChatAt = new Date().toISOString();
  noelleCoreRuntime.lastChatSeconds = metrics.seconds;
  noelleCoreRuntime.lastError = null;
  noelleCoreRuntime.lastSuccess = `Resposta OK em ${metrics.seconds}s com ${modelInfo.model}`;
  appendNoelleCoreLog("chat_success", { model: modelInfo.model, profile: profileInfo.id, persona: personaInfo.id, seconds: metrics.seconds, tokensPerSecond: metrics.tokens_per_second });

  return {
    ok: true,
    reply,
    model: modelInfo.model,
    mode: modelInfo.id,
    profile: profileInfo.id,
    profileLabel: profileInfo.label,
    persona: personaInfo.id,
    personaLabel: personaInfo.label,
    seconds: metrics.seconds,
    metrics
  };
}

async function noelleCoreSetModel(mode) {
  noelleCoreLoadState();
  if (!NOELLE_CORE_DEFAULTS.models[mode]) return { ok: false, error: "Modo/modelo inválido." };
  const previous = noelleCoreGetModelInfo().model;
  noelleCoreState.activeMode = mode;
  noelleCoreSaveState();
  const current = noelleCoreGetModelInfo().model;
  if (previous !== current) {
    void ollamaRequest("POST", "/api/generate", { model: previous, keep_alive: 0, prompt: "" }, 15000);
  }
  return { ok: true, previousModel: previous, activeMode: mode, activeModel: current };
}

async function noelleCoreSetProfile(profile) {
  noelleCoreLoadState();
  if (!NOELLE_CORE_DEFAULTS.profiles[profile]) return { ok: false, error: "Perfil inválido." };
  noelleCoreState.activeProfile = profile;
  noelleCoreSaveState();
  const info = noelleCoreGetProfileInfo(profile);
  return { ok: true, activeProfile: info.id, activeProfileLabel: info.label };
}

async function noelleCoreSetPersona(persona) {
  noelleCoreLoadState();
  if (!NOELLE_CORE_DEFAULTS.personas[persona]) return { ok: false, error: "Persona inválida." };
  noelleCoreState.activePersona = persona;
  noelleCoreSaveState();
  const info = noelleCoreGetPersonaInfo(persona);
  return { ok: true, activePersona: info.id, activePersonaLabel: info.label };
}

async function noelleCoreUnload() {
  noelleCoreLoadState();
  const modelInfo = noelleCoreGetModelInfo();
  const res = await ollamaRequest("POST", "/api/generate", { model: modelInfo.model, keep_alive: 0, prompt: "" }, 20000);
  return { ok: !!res.ok, model: modelInfo.model, error: res.ok ? null : res.error };
}

async function noelleCorePreload() {
  noelleCoreLoadState();
  const modelInfo = noelleCoreGetModelInfo();
  const profileInfo = noelleCoreGetProfileInfo();
  appendNoelleCoreLog("preload_start", { model: modelInfo.model, profile: profileInfo.id });
  const res = await ollamaRequest("POST", "/api/generate", { model: modelInfo.model, keep_alive: profileInfo.keep_alive, prompt: "" }, profileInfo.timeoutMs);
  appendNoelleCoreLog(res.ok ? "preload_success" : "preload_error", { model: modelInfo.model, error: res.ok ? null : res.error });
  return { ok: !!res.ok, model: modelInfo.model, profile: profileInfo.id, error: res.ok ? null : res.error, hint: res.ok ? null : noelleCoreErrorHint(res.error, modelInfo.model) };
}

async function noelleCoreBench() {
  const started = Date.now();
  noelleCoreLoadState();
  const modelInfo = noelleCoreGetModelInfo();
  const profileInfo = noelleCoreGetProfileInfo();
  const body = {
    model: modelInfo.model,
    stream: false,
    think: false,
    keep_alive: profileInfo.keep_alive,
    messages: [
      { role: "system", content: "Responda em português brasileiro, direto e curto. Não use thinking." },
      { role: "user", content: "Responda exatamente: ok" }
    ],
    options: {
      ...profileInfo.options,
      num_ctx: Math.min(Number(profileInfo.options?.num_ctx || 384), 256),
      num_predict: 12,
      temperature: 0.1
    }
  };
  appendNoelleCoreLog("bench_start", { model: modelInfo.model, profile: profileInfo.id });
  const res = await ollamaRequest("POST", "/api/chat", body, profileInfo.timeoutMs);
  if (!res.ok) {
    const seconds = Number(((Date.now() - started) / 1000).toFixed(2));
    appendNoelleCoreLog("bench_error", { model: modelInfo.model, error: res.error, seconds });
    return { ok: false, error: res.error, hint: noelleCoreErrorHint(res.error, modelInfo.model), model: modelInfo.model, profile: profileInfo.id, seconds };
  }
  const metrics = noelleCoreBuildMetrics(res.data || {}, started);
  const reply = noelleCoreCleanReply(res.data?.message?.content || res.data?.response || "");
  appendNoelleCoreLog("bench_success", { model: modelInfo.model, seconds: metrics.seconds, tokensPerSecond: metrics.tokens_per_second });
  return { ok: true, reply, model: modelInfo.model, mode: modelInfo.id, profile: profileInfo.id, seconds: metrics.seconds, metrics };
}

async function noelleCoreDiagnostic() {
  const status = await noelleCoreGetOllamaStatus();
  const recommendations = [];
  if (!status.ollamaOnline) {
    recommendations.push("Abra o Ollama antes de usar o chat IA.");
  } else if (!status.activeModelInstalled) {
    recommendations.push(`Baixe o modelo ativo: ${status.activeModel}. Use BAIXAR_MODELOS_IA.bat.`);
  } else if (!status.activeModelLoaded) {
    recommendations.push("Clique em Pré-carregar para reduzir a demora da primeira resposta.");
  }
  if (status.loadedCount > 1) recommendations.push("Há mais de um modelo carregado. Para PC fraco, descarregue e deixe só um modelo ativo.");
  if (status.activeProfile !== "rapido") recommendations.push("Para conversa mais rápida, use o perfil Rápido.");
  if (!recommendations.length) recommendations.push("Base do chat está OK. Próximo teste: mandar 5 mensagens seguidas.");
  return {
    ...status,
    recommendations,
    paths: {
      stateFile: NOELLE_CORE_STATE_FILE,
      memoryFile: NOELLE_CORE_MEMORY_FILE,
      logFile: NOELLE_CORE_LOG_FILE
    },
    safety: {
      singleModelOnly: NOELLE_CORE_DEFAULTS.singleModelOnly,
      autoRouter: NOELLE_CORE_DEFAULTS.autoRouter,
      thinking: NOELLE_CORE_DEFAULTS.useThinking
    }
  };
}

function noelleCoreReset(sessionId = "noelle_chat") {
  noelleCoreLoadState();
  const session = noelleCoreSession(sessionId);
  session.history = [];
  noelleCoreSaveState();
  return { ok: true, sessionId };
}

function noelleCoreRemember(text) {
  const clean = String(text || "").trim();
  if (!clean) return { ok: false, error: "Memória vazia." };
  const memories = noelleCoreLoadMemories();
  const exists = memories.some((item) => String(item.text || "").trim().toLowerCase() === clean.toLowerCase());
  if (exists) return { ok: true, duplicate: true, count: memories.length, message: "Essa memória já existe." };
  const memory = {
    id: makeNoelleCoreMemoryId(),
    text: clean.slice(0, 500),
    at: new Date().toISOString(),
    source: "manual"
  };
  memories.push(memory);
  noelleCoreSaveMemories(memories);
  appendNoelleCoreLog("memory_saved", { id: memory.id, count: memories.length });
  return { ok: true, memory, count: memories.length };
}


try {
  app.setAppUserModelId("noelle.companion.windows");
} catch (err) {
  log.warn("setAppUserModelId falhou:", err);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();

app.on("second-instance", () => {
  showAvatarWindow();
  showControlsWindow();
});

function getWindowIcon() {
  const candidates = [ICON_PNG, ICON_ICO];
  for (const candidate of candidates) {
    try {
      if (!fs.existsSync(candidate)) continue;
      const img = nativeImage.createFromPath(candidate);
      if (img && !img.isEmpty()) return img;
    } catch (err) {
      log.warn("Falha ao carregar ícone:", candidate, err);
    }
  }
  return undefined;
}

function safeReadJson(filePath, fallbackValue) {
  try {
    if (!fs.existsSync(filePath)) return fallbackValue;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (err) {
    log.warn("safeReadJson falhou:", filePath, err);
    return fallbackValue;
  }
}

function safeWriteJson(filePath, data) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    log.warn("safeWriteJson falhou:", filePath, err);
  }
}

function safeCopyFile(source, target) {
  try {
    if (!fs.existsSync(source)) return false;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    return true;
  } catch (err) {
    log.warn("safeCopyFile falhou:", source, "->", target, err);
    return false;
  }
}


function getAvatarKind(filePath) {
  const ext = path.extname(String(filePath || "")).toLowerCase();
  const name = String(filePath || "").toLowerCase();
  if (ext === ".vrm") return "vrm";
  if (ext === ".glb" || ext === ".gltf") return "gltf";
  return "unknown";
}

function makeAvatarId(baseName) {
  const safe = String(baseName || "avatar")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "avatar";
  return `${Date.now()}-${safe}`;
}

function makeSafeExportName(name, fallback = "avatar") {
  return String(name || fallback)
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || fallback;
}

function normalizeAvatarLibrary(raw) {
  const base = raw && typeof raw === "object" ? raw : {};
  const avatars = Array.isArray(base.avatars) ? base.avatars : [];
  const normalized = avatars
    .filter((entry) => entry && entry.id && entry.filePath)
    .map((entry) => ({
      id: String(entry.id),
      name: String(entry.name || entry.id),
      kind: entry.kind || getAvatarKind(entry.filePath),
      filePath: entry.filePath,
      builtIn: !!entry.builtIn,
      createdAt: entry.createdAt || new Date().toISOString(),
    }));
  return {
    activeId: base.activeId || "noelle-default",
    avatars: normalized,
  };
}

function loadAvatarLibrary() {
  ensureRuntimeAvatarCopy();
  const existing = safeReadJson(AVATAR_LIBRARY_MANIFEST_FILE, null);
  const lib = normalizeAvatarLibrary(existing);
  const bundledAvatars = [
    {
      id: "noelle-default",
      name: "Noelle",
      kind: "vrm",
      filePath: fs.existsSync(DEFAULT_AVATAR_FILE) ? DEFAULT_AVATAR_FILE : BACKUP_AVATAR_FILE,
      builtIn: true,
      createdAt: "built-in",
    },
    {
      id: "arisa-vrm",
      name: "Arisa",
      kind: "vrm",
      filePath: DEFAULT_AVATAR_ARISA_FILE,
      builtIn: true,
      createdAt: "built-in",
    }
  ];

  for (const bundled of bundledAvatars) {
    const existingIndex = lib.avatars.findIndex((entry) => entry.id === bundled.id);
    if (existingIndex >= 0) {
      lib.avatars[existingIndex] = { ...lib.avatars[existingIndex], ...bundled };
    } else {
      lib.avatars.push(bundled);
    }
  }

  lib.avatars.sort((a, b) => {
    const order = { "noelle-default": 0, "arisa-vrm": 1 };
    return (order[a.id] ?? 10) - (order[b.id] ?? 10);
  });
  lib.avatars = lib.avatars.filter((entry) => {
    if (entry.id === "noelle-default") return true;
    return entry.filePath && fs.existsSync(entry.filePath);
  });
  if (!lib.avatars.some((entry) => entry.id === lib.activeId)) {
    lib.activeId = "noelle-default";
  }
  saveAvatarLibrary(lib);
  return lib;
}

function saveAvatarLibrary(lib) {
  fs.mkdirSync(AVATAR_LIBRARY_DIR, { recursive: true });
  safeWriteJson(AVATAR_LIBRARY_MANIFEST_FILE, normalizeAvatarLibrary(lib));
}

function getActiveAvatarEntry() {
  const lib = loadAvatarLibrary();
  return lib.avatars.find((entry) => entry.id === lib.activeId) || lib.avatars[0] || null;
}

function listAvatarLibrary() {
  const lib = loadAvatarLibrary();
  return {
    ok: true,
    activeId: lib.activeId,
    avatars: lib.avatars.map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      builtIn: !!entry.builtIn,
      filePath: entry.filePath,
      exists: !!(entry.filePath && fs.existsSync(entry.filePath)),
    })),
  };
}


async function clearAvatarRuntimeStorage(reason = "avatar-change") {
  const script = `
    try {
      localStorage.removeItem("noelle_equipped_items");
      localStorage.removeItem("noelle_last_motion");
      localStorage.removeItem("noelle_active_avatar_id");
      localStorage.removeItem("noelle_imported_preset");
      localStorage.setItem("noelle_avatar_clean_reason", ${JSON.stringify("${reason}")});
    } catch (err) {
      console.warn("Falha ao limpar estado do avatar", err);
    }
  `;

  for (const win of [avatarWin, controlsWin, launcherWin]) {
    try {
      if (win && !win.isDestroyed() && !win.webContents.isDestroyed()) {
        await win.webContents.executeJavaScript(script, true);
      }
    } catch {}
  }
}


async function selectAvatarById(id) {
  const lib = loadAvatarLibrary();
  const found = lib.avatars.find((entry) => entry.id === id);
  if (!found) return { ok: false, error: "Avatar não encontrado." };
  lib.activeId = found.id;
  saveAvatarLibrary(lib);
  await clearAvatarRuntimeStorage("avatar-change");
  if (avatarWin && !avatarWin.isDestroyed()) avatarWin.webContents.reloadIgnoringCache();
  if (controlsWin && !controlsWin.isDestroyed()) controlsWin.webContents.reloadIgnoringCache();
  return { ok: true, activeId: found.id, avatar: found };
}

async function importAvatarToLibrary(source, { name, activate = true } = {}) {
  if (!source || !fs.existsSync(source)) return { ok: false, error: "Arquivo de avatar não encontrado." };
  const kind = getAvatarKind(source);
  if (!["vrm", "gltf"].includes(kind)) {
    return { ok: false, error: "Formato não suportado. Use .vrm, .glb ou .gltf." };
  }

  const lib = loadAvatarLibrary();
  const original = path.basename(source);
  const id = makeAvatarId(original);
  const dir = path.join(AVATAR_LIBRARY_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  let target = path.join(dir, original);
  fs.copyFileSync(source, target);

  const entry = {
    id,
    name: String(name || path.basename(original, path.extname(original)).replace(/\.model3$/i, "")),
    kind,
    filePath: target,
    builtIn: false,
    createdAt: new Date().toISOString(),
  };

  lib.avatars.push(entry);
  if (activate) lib.activeId = id;
  saveAvatarLibrary(lib);

  if (activate) await clearAvatarRuntimeStorage("avatar-import");
  if (avatarWin && !avatarWin.isDestroyed()) avatarWin.webContents.reloadIgnoringCache();
  if (controlsWin && !controlsWin.isDestroyed()) controlsWin.webContents.reloadIgnoringCache();
  return {
    ok: true,
    activeId: lib.activeId,
    avatar: entry,
    warning:
      kind === "gltf"
        ? "GLB/GLTF entra como modelo estático experimental. VRM continua sendo o formato recomendado para emotes e itens com bones.": null
  };
}


async function exportAvatarFromLibrary(id = null) {
  const lib = loadAvatarLibrary();
  const entry = id
    ? lib.avatars.find((item) => item.id === id)
    : lib.avatars.find((item) => item.id === lib.activeId);

  if (!entry) return { ok: false, error: "Avatar não encontrado para exportar." };
  if (!entry.filePath || !fs.existsSync(entry.filePath)) {
    return { ok: false, error: "Arquivo do avatar não existe no caminho salvo." };
  }

  const safeName = makeSafeExportName(entry.name || entry.id, "avatar");

  try {

    const ext = path.extname(entry.filePath) || (entry.kind === "vrm" ? ".vrm" : ".glb");
    const result = await dialog.showSaveDialog({
      title: "Exportar avatar",
      defaultPath: `${safeName}${ext}`,
      filters: [
        { name: entry.kind === "vrm" ? "VRM Avatar" : "Modelo 3D", extensions: [ext.replace(".", "")] },
        { name: "Todos os arquivos", extensions: ["*"] }
      ]
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };

    fs.copyFileSync(entry.filePath, result.filePath);
    return { ok: true, filePath: result.filePath, kind: entry.kind };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}


function deleteAvatarFromLibrary(id) {
  const lib = loadAvatarLibrary();
  const entry = lib.avatars.find((item) => item.id === id);
  if (!entry) return { ok: false, error: "Avatar não encontrado." };
  if (entry.builtIn) return { ok: false, error: "O avatar padrão não pode ser apagado." };

  lib.avatars = lib.avatars.filter((item) => item.id !== id);
  if (lib.activeId === id) lib.activeId = "noelle-default";
  saveAvatarLibrary(lib);

  try {
    const parent = path.dirname(entry.filePath);
    if (parent.startsWith(AVATAR_LIBRARY_DIR) && fs.existsSync(parent)) {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  } catch (err) {
    log.warn("Falha ao remover avatar importado:", err);
  }

  if (avatarWin && !avatarWin.isDestroyed()) avatarWin.webContents.reloadIgnoringCache();
  return { ok: true, activeId: lib.activeId };
}


function ensureRuntimeAvatarCopy() {
  try {
    fs.mkdirSync(RUNTIME_AVATAR_DIR, { recursive: true });
    if (!fs.existsSync(USER_AVATAR_FILE)) {
      if (!safeCopyFile(DEFAULT_AVATAR_FILE, USER_AVATAR_FILE)) {
        safeCopyFile(BACKUP_AVATAR_FILE, USER_AVATAR_FILE);
      }
    }
  } catch (err) {
    log.warn("ensureRuntimeAvatarCopy falhou:", err);
  }
}

function getAvatarDiagnostics() {
  const lib = loadAvatarLibrary();
  const active = getActiveAvatarEntry();
  return {
    defaultExists: fs.existsSync(DEFAULT_AVATAR_FILE),
    backupExists: fs.existsSync(BACKUP_AVATAR_FILE),
    arisaExists: fs.existsSync(DEFAULT_AVATAR_ARISA_FILE),
    runtimeExists: fs.existsSync(USER_AVATAR_FILE),
    runtimeAvatarFile: USER_AVATAR_FILE,
    avatarLibraryDir: AVATAR_LIBRARY_DIR,
    avatarCount: lib.avatars.length,
    activeAvatar: active ? { id: active.id, name: active.name, kind: active.kind, filePath: active.filePath } : null,
  };
}

function resolveAvatarFile() {
  const active = getActiveAvatarEntry();
  if (active?.filePath && fs.existsSync(active.filePath)) return active.filePath;
  ensureRuntimeAvatarCopy();
  if (fs.existsSync(USER_AVATAR_FILE)) return USER_AVATAR_FILE;
  if (fs.existsSync(DEFAULT_AVATAR_FILE)) return DEFAULT_AVATAR_FILE;
  if (fs.existsSync(BACKUP_AVATAR_FILE)) return BACKUP_AVATAR_FILE;
  return null;
}

function resolveAvatarRuntimeInfo() {
  const active = getActiveAvatarEntry();
  const file = active?.filePath && fs.existsSync(active.filePath) ? active.filePath : resolveAvatarFile();
  if (!file || !fs.existsSync(file)) return { ok: false, error: "Nenhum avatar disponível." };
  return {
    ok: true,
    url: pathToFileURL(file).href,
    filePath: file,
    avatarId: active?.id || "unknown",
    name: active?.name || path.basename(file, path.extname(file)),
    kind: active?.kind || getAvatarKind(file),
  };
}

function normalizeAssetRelPath(relPath) {
  return String(relPath || "").replace(/^\.?[\\/]/, "");
}

function resolveAssetFile(relPath) {
  const clean = normalizeAssetRelPath(relPath);
  return safeJoin(ROOT_DIR, clean);
}

function getStructureSnapshot() {
  return {
    rendererRoot: ROOT_DIR,
    avatarEntry: path.join(ROOT_DIR, "avatar_view.html"),
    controlsEntry: path.join(ROOT_DIR, "controls.html"),
    avatarRuntime: path.join(ROOT_DIR, "renderer", "avatar_window_app.js"),
    controlsRuntime: path.join(ROOT_DIR, "renderer", "controls_window_app.js"),
    runtimeAvatarFile: USER_AVATAR_FILE,
  };
}


function safeJoin(root, unsafePath) {
  const normalized = path.normalize(unsafePath).replace(/^(\.\.[\/\\])+/, "");
  const full = path.join(root, normalized);
  const resolvedRoot = path.resolve(root);
  const resolvedFull = path.resolve(full);
  if (!resolvedFull.startsWith(resolvedRoot)) return null;
  return resolvedFull;
}

function getWindowBounds(filePath, defaultSize, defaultPosFn) {
  const state = safeReadJson(filePath, {});
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;

  const maxWidth = Math.max(defaultSize.width, Math.floor(area.width * 0.70));
  const maxHeight = Math.max(defaultSize.height, Math.floor(area.height * 0.86));
  const isOldLayout = state.layoutVersion !== WINDOW_LAYOUT_VERSION;

  let width = !isOldLayout && Number.isFinite(state.width) ? state.width : defaultSize.width;
  let height = !isOldLayout && Number.isFinite(state.height) ? state.height : defaultSize.height;

  if (width > maxWidth || height > maxHeight || width < defaultSize.width * 0.72 || height < defaultSize.height * 0.72) {
    width = defaultSize.width;
    height = defaultSize.height;
  }

  width = Math.min(width, maxWidth);
  height = Math.min(height, maxHeight);

  let { x, y } = defaultPosFn(area, width, height);
  if (Number.isFinite(state.x)) x = state.x;
  if (Number.isFinite(state.y)) y = state.y;
  x = Math.max(area.x, Math.min(x, area.x + area.width - 120));
  y = Math.max(area.y, Math.min(y, area.y + area.height - 120));
  return { x, y, width, height };
}

function persistAvatarState() {
  if (!avatarWin || avatarWin.isDestroyed()) return;
  safeWriteJson(AVATAR_STATE_FILE, { layoutVersion: WINDOW_LAYOUT_VERSION, ...avatarWin.getBounds() });
}

function persistControlsState() {
  if (!controlsWin || controlsWin.isDestroyed()) return;
  safeWriteJson(CONTROLS_STATE_FILE, { layoutVersion: WINDOW_LAYOUT_VERSION, ...controlsWin.getBounds() });
}
function persistLauncherState() {
  if (!launcherWin || launcherWin.isDestroyed()) return;
  safeWriteJson(LAUNCHER_STATE_FILE, { layoutVersion: WINDOW_LAYOUT_VERSION, ...launcherWin.getBounds() });
}

async function showLauncherWindow() {
  if (!launcherWin || launcherWin.isDestroyed()) {
    await createLauncherWindow();
  }
  if (!launcherWin || launcherWin.isDestroyed()) return;
  if (!launcherWin.isVisible()) launcherWin.show();
  if (launcherWin.isMinimized()) launcherWin.restore();
  launcherWin.focus();
}

function broadcastWindowStates() {
  const payload = {
    avatarAlwaysOnTop: avatarWin ? avatarWin.isAlwaysOnTop() : true,
    avatarClickThrough: clickThrough
  };
  if (avatarWin && !avatarWin.isDestroyed()) avatarWin.webContents.send("window-state", payload);
  if (controlsWin && !controlsWin.isDestroyed()) controlsWin.webContents.send("window-state", payload);
}

function getDesktopEnvironment() {
  return {
    themeSource: nativeTheme.themeSource,
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    prefersReducedTransparency: nativeTheme.prefersReducedTransparency,
  };
}

nativeTheme.on("updated", () => {
  broadcastWindowStates();
});

function setClickThrough(value) {
  clickThrough = !!value;
  if (avatarWin && !avatarWin.isDestroyed()) {
    avatarWin.setIgnoreMouseEvents(clickThrough, { forward: true });
  }
  broadcastWindowStates();
}

async function ensureCompanionWindows() {
  if (avatarWin && !avatarWin.isDestroyed() && controlsWin && !controlsWin.isDestroyed()) return;
  await createCompanionWindows();
}

async function showAvatarWindow() {
  await ensureCompanionWindows();
  if (!avatarWin || avatarWin.isDestroyed()) return;
  if (!avatarWin.isVisible()) avatarWin.show();
  if (avatarWin.isMinimized()) avatarWin.restore();
  avatarWin.focus();
}

async function showControlsWindow() {
  await ensureCompanionWindows();
  if (!controlsWin || controlsWin.isDestroyed()) return;
  if (!controlsWin.isVisible()) controlsWin.show();
  if (controlsWin.isMinimized()) controlsWin.restore();
  controlsWin.focus();
}

function buildTray() {
  if (tray) return;
  const icon = getWindowIcon();
  if (!icon) return;

  tray = new Tray(icon);
  tray.setToolTip("Noelle Companion");

  const rebuildMenu = () => {
    const menu = Menu.buildFromTemplate([
      { label: "Mostrar menu", click: () => { void showLauncherWindow(); } },
      { label: "Mostrar avatar", click: () => { void showAvatarWindow(); } },
      { label: "Mostrar controles", click: () => { void showControlsWindow(); } },
      { label: clickThrough ? "Desligar clique atravessável" : "Ligar clique atravessável", click: () => setClickThrough(!clickThrough) },
      { type: "separator" },
      { label: "Sair", click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);
    tray.setContextMenu(menu);
  };

  rebuildMenu();
  tray.on("click", () => { void showControlsWindow(); });
  ipcMain.on("refresh-tray-menu", () => rebuildMenu());
}

ipcMain.handle("launcher-start", async () => {
  await showAvatarWindow();
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide();
  return { ok: true };
});

ipcMain.handle("launcher-open-config", async () => {
  await showControlsWindow();
  return { ok: true };
});

ipcMain.handle("launcher-open-about", async () => {
  const result = await dialog.showMessageBox({
    type: "info",
    title: "Sobre",
    message: "Noelle Companion",
    detail: "Launcher Windows clean com avatar separado.\nProjeto 2026.",
    buttons: ["OK"]
  });
  return { ok: true, response: result.response };
});


ipcMain.handle("launcher-import-avatar", async () => {
  const result = await dialog.showOpenDialog({
    title: "Adicionar avatar",
    filters: [
      { name: "Avatar VRM recomendado", extensions: ["vrm"] },
      { name: "Modelos 3D experimentais", extensions: ["glb", "gltf"] },
      { name: "Todos suportados", extensions: ["vrm", "glb", "gltf"] }
    ],
    properties: ["openFile"]
  });

  if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };

  try {
    return await importAvatarToLibrary(result.filePaths[0], { activate: true });
  } catch (err) {
    log.error("Falha ao importar avatar pelo launcher:", err);
    return { ok: false, error: String(err?.message || err) };
  }
});

async function createLauncherWindow() {
  if (launcherWin && !launcherWin.isDestroyed()) return launcherWin;

  const icon = getWindowIcon();
  const launcherBounds = getWindowBounds(
    LAUNCHER_STATE_FILE,
    DEFAULT_LAUNCHER_SIZE,
    (area, width, height) => ({
      x: area.x + Math.max(24, Math.floor((area.width - width) / 2)),
      y: area.y + Math.max(24, Math.floor((area.height - height) / 2)),
    })
  );

  launcherWin = new BrowserWindow({
    ...launcherBounds,
    show: false,
    minWidth: 540,
    minHeight: 500,
    frame: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    ...(process.platform !== "darwin" ? {
      titleBarOverlay: {
        color: "#11131a",
        symbolColor: "#f3f4f6",
        height: 46
      }
    } : {}),
    transparent: false,
    backgroundColor: "#0d1220",
    autoHideMenuBar: true,
    resizable: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  launcherWin.setMenuBarVisibility(false);
  launcherWin.on("move", persistLauncherState);
  launcherWin.on("resize", persistLauncherState);
  launcherWin.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    launcherWin.hide();
  });
  launcherWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  await launcherWin.loadFile(path.join(ROOT_DIR, "launcher_view.html"));
  launcherWin.once("ready-to-show", () => launcherWin && launcherWin.show());
  buildTray();
  return launcherWin;
}

async function createCompanionWindows() {
  const icon = getWindowIcon();

  const avatarBounds = getWindowBounds(
    AVATAR_STATE_FILE,
    DEFAULT_AVATAR_SIZE,
    (area, width, height) => ({
      x: area.x + area.width - width - AVATAR_WINDOW_CONFIG.rightMargin,
      y: area.y + Math.max(10, Math.floor((area.height - height) * AVATAR_WINDOW_CONFIG.topRatio))
    })
  );

  avatarWin = new BrowserWindow({
    ...avatarBounds,
    show: false,
    minWidth: AVATAR_WINDOW_CONFIG.minWidth,
    minHeight: AVATAR_WINDOW_CONFIG.minHeight,
    frame: false,
    transparent: true,
    resizable: true,
    hasShadow: false,
    alwaysOnTop: AVATAR_WINDOW_CONFIG.alwaysOnTopDefault,
    backgroundColor: "#00000000",
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  avatarWin.setMenuBarVisibility(false);
  avatarWin.on("move", persistAvatarState);
  avatarWin.on("resize", persistAvatarState);
  avatarWin.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    avatarWin.hide();
  });
  avatarWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  const controlsBounds = getWindowBounds(
    CONTROLS_STATE_FILE,
    DEFAULT_CONTROLS_SIZE,
    (area, width, height) => ({
      x: area.x + CONTROLS_WINDOW_CONFIG.leftMargin,
      y: area.y + Math.max(14, Math.floor((area.height - height) * CONTROLS_WINDOW_CONFIG.topRatio))
    })
  );

  controlsWin = new BrowserWindow({
    ...controlsBounds,
    show: false,
    minWidth: CONTROLS_WINDOW_CONFIG.minWidth,
    minHeight: CONTROLS_WINDOW_CONFIG.minHeight,
    frame: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    ...(process.platform !== "darwin" ? {
      titleBarOverlay: {
        color: "#11131a",
        symbolColor: "#f3f4f6",
        height: 46
      }
    } : {}),
    transparent: false,
    backgroundColor: "#11131a",
    autoHideMenuBar: true,
    resizable: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  controlsWin.on("move", persistControlsState);
  controlsWin.on("resize", persistControlsState);
  controlsWin.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    controlsWin.hide();
  });
  controlsWin.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  await avatarWin.loadFile(path.join(ROOT_DIR, "avatar_view.html"));
  await controlsWin.loadFile(path.join(ROOT_DIR, "controls.html"));
  buildTray();

  try {
    globalShortcut.register("CommandOrControl+Shift+X", () => {
      setClickThrough(!clickThrough);
      if (tray) tray.popUpContextMenu();
    });
  } catch (err) {
    log.warn("Falha ao registrar atalho global:", err);
  }

  broadcastWindowStates();
}


ipcMain.handle("save-text-file-native", async (_event, payload) => {
  try {
    const result = await dialog.showSaveDialog({
      title: "Salvar preset do avatar",
      defaultPath: payload?.defaultPath || "noelle_preset.json",
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    fs.writeFileSync(result.filePath, String(payload?.text || ""), "utf-8");
    return { canceled: false, filePath: result.filePath };
  } catch (err) {
    return { canceled: true, error: String(err) };
  }
});

ipcMain.handle("open-text-file-native", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Abrir preset do avatar",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }]
    });
    if (result.canceled || !result.filePaths?.[0]) return { canceled: true };

    const filePath = result.filePaths[0];
    const text = fs.readFileSync(filePath, "utf-8");
    return { canceled: false, filePath, text };
  } catch (err) {
    return { canceled: true, error: String(err) };
  }
});

ipcMain.handle("set-theme-source-native", async (_event, payload) => {
  try {
    const rawTheme = payload?.theme || "system";
    const theme = rawTheme === "light" ? "light" : rawTheme === "system" ? "system" : "dark";
    nativeTheme.themeSource = theme;
    broadcastWindowStates();
    return { ok: true, themeSource: nativeTheme.themeSource, requestedTheme: rawTheme, shouldUseDarkColors: nativeTheme.shouldUseDarkColors };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("get-desktop-environment", async () => {
  return getDesktopEnvironment();
});


ipcMain.handle("import-avatar-vrm-native", async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: "Importar avatar",
      properties: ["openFile"],
      filters: [
        { name: "Avatar VRM recomendado", extensions: ["vrm"] },
        { name: "Modelos 3D experimentais", extensions: ["glb", "gltf"] },
          { name: "Todos suportados", extensions: ["vrm", "glb", "gltf"] }
      ]
    });
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true };
    return await importAvatarToLibrary(result.filePaths[0], { activate: true });
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle("get-avatar-library", async () => {
  return listAvatarLibrary();
});

ipcMain.handle("select-avatar-library", async (_event, payload) => {
  return await selectAvatarById(payload?.id);
});

ipcMain.handle("delete-avatar-library", async (_event, payload) => {
  return deleteAvatarFromLibrary(payload?.id);
});

ipcMain.handle("export-avatar-library", async (_event, payload) => {
  return exportAvatarFromLibrary(payload?.id || null);
});

ipcMain.handle("get-avatar-diagnostics", async () => {
  ensureRuntimeAvatarCopy();
  return getAvatarDiagnostics();
});

ipcMain.handle("get-structure-snapshot", async () => {
  return getStructureSnapshot();
});

ipcMain.on("reload-avatar-window", () => {
  if (avatarWin && !avatarWin.isDestroyed()) {
    avatarWin.webContents.reloadIgnoringCache();
  }
});



ipcMain.on("get-avatar-runtime-url-sync", (event) => {
  event.returnValue = resolveAvatarRuntimeInfo();
});

ipcMain.handle("get-avatar-runtime-url", async () => {
  return resolveAvatarRuntimeInfo();
});

ipcMain.handle("asset-exists", async (_event, payload) => {
  try {
    const file = resolveAssetFile(payload?.relPath);
    return !!(file && fs.existsSync(file));
  } catch {
    return false;
  }
});

ipcMain.handle("read-json-asset", async (_event, payload) => {
  const file = resolveAssetFile(payload?.relPath);
  if (!file || !fs.existsSync(file)) {
    throw new Error("Asset JSON ausente: " + String(payload?.relPath || ""));
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
});

ipcMain.handle("get-asset-file-url", async (_event, payload) => {
  const file = resolveAssetFile(payload?.relPath);
  if (!file || !fs.existsSync(file)) {
    throw new Error("Asset ausente: " + String(payload?.relPath || ""));
  }
  return pathToFileURL(file).href;
});


function noelleSttSafeName(value, fallback = "medium") {
  const text = String(value || fallback).trim().toLowerCase();
  return /^[a-z0-9_.\-]+$/.test(text) ? text : fallback;
}

function noelleSttAudioExtension(mimeType = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("ogg")) return ".ogg";
  if (mime.includes("wav")) return ".wav";
  if (mime.includes("mp3") || mime.includes("mpeg")) return ".mp3";
  if (mime.includes("mp4") || mime.includes("m4a")) return ".m4a";
  return ".webm";
}

function noelleSttPythonCandidates() {
  if (process.platform === "win32") {
    return [
      { cmd: "py", args: ["-3", "-u"] },
      { cmd: "python", args: ["-u"] },
      { cmd: "python3", args: ["-u"] }
    ];
  }
  return [
    { cmd: "python3", args: ["-u"] },
    { cmd: "python", args: ["-u"] }
  ];
}

function noelleParseLastJson(stdout = "") {
  const raw = String(stdout || "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) {}
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line.startsWith("{") || !line.endsWith("}")) continue;
    try { return JSON.parse(line); } catch (_) {}
  }
  return null;
}

function noelleSttRunPython(args, timeoutMs = NOELLE_STT_DEFAULTS.timeoutMs) {
  const candidates = noelleSttPythonCandidates();
  let lastError = null;

  const tryCandidate = (index) => new Promise((resolve) => {
    if (index >= candidates.length) {
      resolve({ ok: false, error: lastError || "Python não encontrado." });
      return;
    }

    const candidate = candidates[index];
    let stdout = "";
    let stderr = "";
    let finished = false;
    let child = null;

    try {
      child = spawn(candidate.cmd, [...candidate.args, ...args], {
        cwd: __dirname,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
          HF_HOME: path.join(NOELLE_STT_DIR, "hf-home"),
          HF_HUB_DISABLE_TELEMETRY: "1",
          OMP_NUM_THREADS: String(NOELLE_STT_DEFAULTS.cpuThreads),
          MKL_NUM_THREADS: String(NOELLE_STT_DEFAULTS.cpuThreads)
        }
      });
    } catch (err) {
      lastError = noelleTrimError(err?.message || err || "falha ao iniciar Python");
      resolve(tryCandidate(index + 1));
      return;
    }

    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      try { child.kill("SIGKILL"); } catch (_) {}
      resolve({ ok: false, error: "Transcrição demorou demais. O modelo medium pode estar baixando ou pesado para o PC." });
    }, Math.max(30000, Number(timeoutMs || NOELLE_STT_DEFAULTS.timeoutMs)));

    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
    child.on("error", (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      lastError = noelleTrimError(err?.message || err || "erro no Python");
      resolve(tryCandidate(index + 1));
    });
    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const parsed = noelleParseLastJson(stdout);
      const err = noelleTrimError(stderr, 1200);
      if (parsed) {
        if (err && !parsed.stderr) parsed.stderr = err;
        resolve(parsed);
        return;
      }
      if (code !== 0) {
        lastError = err || noelleTrimError(stdout) || `Python saiu com código ${code}`;
        resolve({ ok: false, error: lastError });
        return;
      }
      resolve({ ok: false, error: "Saída inválida do transcritor.", raw: noelleTrimError(stdout), stderr: err });
    });
  });

  return tryCandidate(0);
}

function noelleSttCleanupTmp(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    ensureDir(NOELLE_STT_TMP_DIR);
    const now = Date.now();
    for (const name of fs.readdirSync(NOELLE_STT_TMP_DIR)) {
      const file = path.join(NOELLE_STT_TMP_DIR, name);
      const stat = fs.statSync(file);
      if (stat.isFile() && now - stat.mtimeMs > maxAgeMs) fs.unlinkSync(file);
    }
  } catch {}
}

function noelleNormalizeBase64Audio(value = "") {
  let text = String(value || "").trim();
  if (text.includes(",")) text = text.split(",").pop() || "";
  return text.replace(/\s+/g, "");
}

async function noelleCoreTranscribeAudio(payload = {}) {
  const started = Date.now();
  let audioPath = null;
  try {
    ensureDir(NOELLE_STT_TMP_DIR);
    ensureDir(NOELLE_STT_MODEL_CACHE_DIR);
    noelleSttCleanupTmp();

    const audioBase64 = noelleNormalizeBase64Audio(payload.audioBase64 || "");
    if (!audioBase64 || audioBase64.length < 512) {
      return { ok: false, error: "Áudio muito curto ou vazio." };
    }
    if (!fs.existsSync(NOELLE_STT_SCRIPT)) {
      return { ok: false, error: "Arquivo tools/noelle_stt/transcribe_audio.py não encontrado." };
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    if (!audioBuffer.length || audioBuffer.length < 1024) {
      return { ok: false, error: "Áudio gravado veio vazio. Tente falar por mais tempo." };
    }
    if (audioBuffer.length > NOELLE_STT_DEFAULTS.maxAudioBytes) {
      return { ok: false, error: "Áudio grande demais para transcrever nesta versão." };
    }

    const model = noelleSttSafeName(payload.model || NOELLE_STT_DEFAULTS.model, NOELLE_STT_DEFAULTS.model);
    const computeType = noelleSttSafeName(payload.computeType || payload.compute_type || NOELLE_STT_DEFAULTS.computeType, NOELLE_STT_DEFAULTS.computeType);
    const language = noelleSttSafeName(payload.language || NOELLE_STT_DEFAULTS.language, NOELLE_STT_DEFAULTS.language);
    const mimeType = String(payload.mimeType || "audio/webm");
    const ext = noelleSttAudioExtension(mimeType);
    const filename = `noelle_stt_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    audioPath = path.join(NOELLE_STT_TMP_DIR, filename);

    fs.writeFileSync(audioPath, audioBuffer);
    appendNoelleCoreLog("stt_start", { model, computeType, language, bytes: audioBuffer.length, mimeType });

    const result = await noelleSttRunPython([
      NOELLE_STT_SCRIPT,
      "--audio", audioPath,
      "--model", model,
      "--compute-type", computeType,
      "--language", language,
      "--download-root", NOELLE_STT_MODEL_CACHE_DIR,
      "--cpu-threads", String(NOELLE_STT_DEFAULTS.cpuThreads),
      "--num-workers", String(NOELLE_STT_DEFAULTS.numWorkers),
      "--vad-filter", "true",
      "--min-silence-duration-ms", String(NOELLE_STT_DEFAULTS.minSilenceDurationMs)
    ], NOELLE_STT_DEFAULTS.timeoutMs);

    try { fs.unlinkSync(audioPath); } catch (_) {}
    audioPath = null;

    if (!result || !result.ok) {
      const out = {
        ok: false,
        error: result?.error || "Falha ao transcrever áudio.",
        hint: result?.hint || "Instale as dependências em tools/noelle_stt/requirements.txt e teste novamente.",
        details: result?.details || null,
        model,
        computeType,
        language,
        seconds: Number(((Date.now() - started) / 1000).toFixed(2))
      };
      appendNoelleCoreLog("stt_error", out);
      return out;
    }

    const out = {
      ok: true,
      text: String(result.text || "").trim(),
      language: result.language || language,
      languageProbability: result.language_probability || null,
      model: result.model || model,
      computeType: result.compute_type || computeType,
      device: result.device || "cpu",
      duration: result.duration || null,
      seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
      sttSeconds: result.seconds || null,
      segmentsCount: result.segments_count || 0,
      fallbackUsed: !!result.fallback_used,
      fasterWhisperVersion: result.faster_whisper_version || null,
      ctranslate2Version: result.ctranslate2_version || null
    };
    appendNoelleCoreLog("stt_success", { ...out, text: out.text.slice(0, 120) });
    return out;
  } catch (err) {
    if (audioPath) { try { fs.unlinkSync(audioPath); } catch (_) {} }
    const out = { ok: false, error: String(err?.message || err || "erro desconhecido na transcrição") };
    appendNoelleCoreLog("stt_exception", out);
    return out;
  }
}

ipcMain.handle("noelle-core-transcribe-audio", async (_event, payload) => {
  try {
    return await noelleCoreTranscribeAudio(payload || {});
  } catch (err) {
    return { ok: false, error: String(err?.message || err || "erro na transcrição") };
  }
});

ipcMain.handle("noelle-core-status", async () => {
  try {
    noelleCoreLoadState();
    return await noelleCoreGetOllamaStatus();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-chat", async (_event, payload) => {
  try {
    return await noelleCoreChat(payload || {});
  } catch (err) {
    appendNoelleCoreLog("ipc_chat_exception", { error: String(err?.message || err) });
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-set-model", async (_event, payload) => {
  try {
    return await noelleCoreSetModel(payload?.mode || payload?.model || "fast");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-set-profile", async (_event, payload) => {
  try {
    return await noelleCoreSetProfile(payload?.profile || "rapido");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-set-persona", async (_event, payload) => {
  try {
    return await noelleCoreSetPersona(payload?.persona || "nobre");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-unload", async () => {
  try {
    return await noelleCoreUnload();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-preload", async () => {
  try {
    return await noelleCorePreload();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-reset", async (_event, payload) => {
  try {
    return noelleCoreReset(payload?.session_id || payload?.sessionId || "noelle_chat");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-remember", async (_event, payload) => {
  try {
    return noelleCoreRemember(payload?.text || payload?.memory || "");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-memories", async () => {
  try {
    return noelleCoreListMemories();
  } catch (err) {
    return { ok: false, error: String(err?.message || err), memories: [] };
  }
});

ipcMain.handle("noelle-core-forget-memory", async (_event, payload) => {
  try {
    return noelleCoreForgetMemory(payload?.target ?? payload?.index ?? payload?.id ?? "last");
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-clear-memories", async () => {
  try {
    return noelleCoreClearMemories();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-bench", async () => {
  try {
    return await noelleCoreBench();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});

ipcMain.handle("noelle-core-diagnostic", async () => {
  try {
    return await noelleCoreDiagnostic();
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
});


app.whenReady().then(async () => {
  try {
    noelleCoreLoadState();
    ensureRuntimeAvatarCopy();
    loadAvatarLibrary();
    await createLauncherWindow();
  } catch (err) {
    log.error("Falha ao criar janelas:", err);
    app.quit();
  }
});

app.on("before-quit", () => { isQuitting = true; });
app.on("will-quit", () => {
  try { globalShortcut.unregisterAll(); } catch {}
});
app.on("window-all-closed", () => {});

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender);
}

ipcMain.on("start-drag", (event, payload) => {
  const win = getSenderWindow(event);
  if (!win || win.isDestroyed()) return;
  const [wx, wy] = win.getPosition();
  dragStates.set(event.sender.id, { mouseX: payload.screenX, mouseY: payload.screenY, winX: wx, winY: wy, win });
});

ipcMain.on("drag-move", (event, payload) => {
  const drag = dragStates.get(event.sender.id);
  if (!drag || !drag.win || drag.win.isDestroyed()) return;
  if (drag.win === avatarWin && clickThrough) return;
  const dx = payload.screenX - drag.mouseX;
  const dy = payload.screenY - drag.mouseY;
  drag.win.setPosition(drag.winX + dx, drag.winY + dy);
});

ipcMain.on("end-drag", (event) => {
  dragStates.delete(event.sender.id);
});

ipcMain.on("hide-avatar", () => { if (avatarWin && !avatarWin.isDestroyed()) avatarWin.hide(); });
ipcMain.on("show-avatar", () => { void showAvatarWindow(); });
ipcMain.on("hide-controls", () => { if (controlsWin && !controlsWin.isDestroyed()) controlsWin.hide(); });
ipcMain.on("show-controls", () => { void showControlsWindow(); });
ipcMain.on("show-launcher", () => { void showLauncherWindow(); });
ipcMain.on("quit-app", () => { isQuitting = true; app.quit(); });

ipcMain.on("reset-avatar-window-position", () => {
  if (!avatarWin || avatarWin.isDestroyed()) return;
  const display = screen.getPrimaryDisplay();
  const area = display.workArea;
  const [width, height] = avatarWin.getSize();
  avatarWin.setPosition(area.x + area.width - width - AVATAR_WINDOW_CONFIG.rightMargin, area.y + Math.max(16, Math.floor((area.height - height) * AVATAR_WINDOW_CONFIG.topRatio)));
  persistAvatarState();
});

ipcMain.on("set-avatar-window-size", (_event, payload) => {
  if (!avatarWin || avatarWin.isDestroyed()) return;
  const preset = payload?.preset || "medium";
  const sizes = {
    small: { width: 360, height: 650 },
    medium: { width: 420, height: 730 },
    large: { width: 480, height: 800 }
  };
  const next = sizes[preset] || sizes.medium;
  const [x, y] = avatarWin.getPosition();
  avatarWin.setSize(next.width, next.height);
  avatarWin.setPosition(x, y);
  persistAvatarState();
});

ipcMain.on("toggle-avatar-always-on-top", () => {
  if (!avatarWin || avatarWin.isDestroyed()) return;
  avatarWin.setAlwaysOnTop(!avatarWin.isAlwaysOnTop());
  broadcastWindowStates();
  if (tray) tray.popUpContextMenu();
});

ipcMain.on("toggle-avatar-click-through", () => {
  setClickThrough(!clickThrough);
  if (tray) tray.popUpContextMenu();
});

ipcMain.on("avatar-command", (_event, payload) => {
  if (avatarWin && !avatarWin.isDestroyed()) {
    avatarWin.webContents.send("avatar-command", payload);
  }
});

ipcMain.handle("get-window-state", () => ({
  avatarAlwaysOnTop: avatarWin ? avatarWin.isAlwaysOnTop() : true,
  avatarClickThrough: clickThrough
}));
