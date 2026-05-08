try { require("./src/main/avatar_assets_bridge_v31_2.cjs").registerAvatarAssetsBridgeV312(); } catch (err) { console.warn("[avatar-assets-v31.2] bridge failed:", err && err.message ? err.message : err); }
"use strict";

const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process"); const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs"); const { appendNoelleLog, flushNoelleLogsNow } = require("./src/main/performance/log_queue_v19_8_23.cjs"); const { writeJsonAtomic } = require("./src/main/performance/safe_json_v19_8_22.cjs");

const APP_YEAR = 2026;
const OLLAMA_HOST = process.env.OLLAMA_HOST || "127.0.0.1";
const OLLAMA_PORT = Number(process.env.OLLAMA_PORT || 11434);
const ROOT_DIR = __dirname;
const SRC_DIR = path.join(ROOT_DIR, "src");
const ASSETS_DIR = path.join(SRC_DIR, "assets");
const APP_ICONS_DIR = path.join(ROOT_DIR, "assets", "icons");

const CORE_DEFAULTS = {
  model: "qwen3:0.6b",
  profile: "rapido",
  persona: "nobre",
  locale: "pt-BR",
  timezone: "America/Sao_Paulo"
};

const MODEL_OPTIONS = {
  "qwen3:0.6b": { label: "Qwen3 0.6B Fast", note: "Modelo principal, rápido e leve." },
  "gemma3:1b": { label: "Gemma 3 1B", note: "Opcional, um pouco mais pesado." },
  "hermes3:3b": { label: "Hermes 3B", note: "Opcional e mais pesado." }
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
    options: { num_ctx: 768, num_predict: 160, temperature: 0.4, top_p: 0.72, repeat_penalty: 1.08 }
  }
};

const PERSONA_OPTIONS = {
  nobre: {
    label: "Nobre rica",
    prompt: "Você é Noelle, uma IA local elegante, confiante, educada e levemente majestosa.\nResponda em português brasileiro, com clareza, sem enrolar e considerando 2026 como contexto atual do projeto."
  },
  direta: {
    label: "Direta",
    prompt: "Você é Noelle, uma IA local direta e prática. Responda em português brasileiro, curto, claro e focado na solução. Considere 2026 como contexto atual do projeto."
  },
  fofa: {
    label: "Fofa",
    prompt: "Você é Noelle, uma IA local gentil e acolhedora. Responda em português brasileiro com tom leve, útil e objetivo.\nConsidere 2026 como contexto atual do projeto."
  },
  seria: {
    label: "Séria",
    prompt: "Você é Noelle, uma IA local séria, calma e focada. Responda em português brasileiro com precisão e sem brincadeiras.\nConsidere 2026 como contexto atual do projeto."
  }
};

let mainWin = null; let roomWin = null;
let avatarWin = null;
let tray = null;
let isQuitting = false;

const runtime = {
  lastStatus: "iniciando",
  lastError: null,
  lastChatSeconds: null,
  lastSuccessAt: null,
  lastAvatarCommand: null
};

function ensureDir(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function toFileUrl(filePath) {
  return "file:///" + String(filePath).replace(/\\/g, "/").replace(/^\/+/, "");
}

function getUserDataSafe() {
  return app.isReady() ? app.getPath("userData") : path.join(ROOT_DIR, ".runtime");
}

function stateFile() {
  const dir = path.join(getUserDataSafe(), "state");
  ensureDir(dir);
  return path.join(dir, "noelle-state.json");
}

function logFile() {
  const dir = path.join(getUserDataSafe(), "logs");
  ensureDir(dir);
  return path.join(dir, "noelle-core.log");
}

function appendLog(message, extra = null) { appendNoelleLog(logFile(), message, extra); }

function readJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").trim();
    if (!text) return fallback;
    return JSON.parse(text);
  } catch (err) {
    appendLog("read_json_error", { file, error: err.message });
    return fallback;
  }
}

function writeJson(file, value) { writeJsonAtomic(file, value); } let __NOELLE_V19_8_26_STATE_CACHE = null;

function loadState() { const now = Date.now(); const file = stateFile(); let saved; if (__NOELLE_V19_8_26_STATE_CACHE && __NOELLE_V19_8_26_STATE_CACHE.file === file && now - __NOELLE_V19_8_26_STATE_CACHE.at < 1000) { saved = __NOELLE_V19_8_26_STATE_CACHE.value; } else { saved = readJson(file, {}); __NOELLE_V19_8_26_STATE_CACHE = { file, at: now, value: saved }; } return {
    model: MODEL_OPTIONS[saved.model] ? saved.model : CORE_DEFAULTS.model,
    profile: PROFILE_OPTIONS[saved.profile] ? saved.profile : CORE_DEFAULTS.profile,
    persona: PERSONA_OPTIONS[saved.persona] ? saved.persona : CORE_DEFAULTS.persona,
    messages: Array.isArray(saved.messages) ? saved.messages.slice(-40) : [],
    memories: Array.isArray(saved.memories) ? saved.memories.slice(-50) : [],
    theme: saved.theme || "noelle",
    avatar: saved.avatar || { file: "src/assets/Noelle.vrm", camera: "bust", alwaysOnTop: false }
  };
}

function saveState(patch) { const current = loadState(); const next = { ...current, ...patch }; const file = stateFile(); writeJson(file, next); __NOELLE_V19_8_26_STATE_CACHE = { file, at: Date.now(), value: next }; return next; }

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
        method, agent: OLLAMA_HTTP_AGENT, headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {},
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
          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true, statusCode: res.statusCode, data: parsed });
          else resolve({ ok: false, statusCode: res.statusCode, error: trimErr(parsed.error || parsed.message || data || `HTTP ${res.statusCode}`), data: parsed });
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

  const userText = String(payload?.message || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, 4000);
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
  const result = await ollamaRequest("POST", "/api/chat", { model, messages, stream: false, keep_alive: profile.keep_alive, options: profile.options }, profile.timeoutMs);
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
  updateTrayMenu();

  return { ok: true, message: text, seconds, model, profile: profileKey, persona };
}

function normalizeManifestArray(raw, defaultBase, extList) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.items)) return raw.items;
    if (Array.isArray(raw.expressions)) return raw.expressions;
    if (Array.isArray(raw.motions)) return raw.motions;
    return Object.entries(raw).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { file: value }) }));
  }
  try {
    if (!fs.existsSync(defaultBase)) return [];
    return fs.readdirSync(defaultBase)
      .filter((name) => extList.some((ext) => name.toLowerCase().endsWith(ext)))
      .map((name) => ({ id: path.basename(name, path.extname(name)), label: path.basename(name, path.extname(name)), file: name }));
  } catch {
    return [];
  }
}

function resolveManifestAssetPath(baseDir, file, kind) {
  const clean = String(file || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
  if (!clean) return baseDir;
  if (path.isAbsolute(clean)) return clean;
  if (clean.startsWith("assets/")) return path.join(SRC_DIR, clean);
  if (clean.startsWith("motions/") || clean.startsWith("expressions/") || clean.startsWith("items/") || clean.startsWith("avatars/")) return path.join(ASSETS_DIR, clean);
  return path.join(baseDir, clean);
}
function resolveManifestAssetPath(baseDir, file, kind) {
  const clean = String(file || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
  if (!clean) return baseDir;
  if (path.isAbsolute(clean)) return clean;
  if (clean.startsWith("assets/")) return path.join(SRC_DIR, clean);
  if (clean.startsWith("motions/") || clean.startsWith("expressions/") || clean.startsWith("items/") || clean.startsWith("avatars/")) return path.join(ASSETS_DIR, clean);
  return path.join(baseDir, clean);
}
function makeAssetEntry(entry, baseDir, fallbackKind) {
  const file = String(entry.file || entry.path || entry.name || "").trim();
  const filePath = resolveManifestAssetPath(baseDir, file, fallbackKind);
  const idBase = String(entry.id || path.basename(filePath, path.extname(filePath)) || entry.label || fallbackKind);
  const id = idBase.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const label = String(entry.label || entry.title || entry.name || id).replace(/[_-]+/g, " ");
  const rel = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  return { id, label, file: file || path.basename(filePath), abs: filePath, rel, url: toFileUrl(filePath), exists: fileExists(filePath), kind: fallbackKind, meta: entry };
}

function scanAssets() {
  const expressionsDir = path.join(ASSETS_DIR, "expressions");
  const motionsDir = path.join(ASSETS_DIR, "motions");
  const itemsDir = path.join(ASSETS_DIR, "items");
  const avatarsDir = path.join(ASSETS_DIR, "avatars");

  const expressionsRaw = readJson(path.join(expressionsDir, "manifest.json"), null);
  const motionsRaw = readJson(path.join(ASSETS_DIR, "motion_manifest.json"), null);
  const itemsRaw = readJson(path.join(ASSETS_DIR, "item_manifest.json"), null);

  const expressions = normalizeManifestArray(expressionsRaw, expressionsDir, [".png", ".webp", ".jpg", ".jpeg"]).map((entry) => makeAssetEntry(entry, expressionsDir, "expression"));
  const motions = normalizeManifestArray(motionsRaw, motionsDir, [".vrma", ".vmd"]).map((entry) => makeAssetEntry(entry, motionsDir, "motion"));
  const items = normalizeManifestArray(itemsRaw, itemsDir, [".glb", ".gltf", ".vrm"]).map((entry) => makeAssetEntry(entry, itemsDir, "item"));

  const avatars = [];
  const noelleVrm = path.join(ASSETS_DIR, "Noelle.vrm");
  if (fileExists(noelleVrm)) avatars.push(makeAssetEntry({ id: "noelle", label: "Noelle", file: noelleVrm }, ASSETS_DIR, "avatar"));
  try {
    if (fs.existsSync(avatarsDir)) {
      for (const name of fs.readdirSync(avatarsDir)) {
        if (name.toLowerCase().endsWith(".vrm")) avatars.push(makeAssetEntry({ id: path.basename(name, ".vrm"), label: path.basename(name, ".vrm"), file: name }, avatarsDir, "avatar"));
      }
    }
  } catch {}

  return {
    root: ROOT_DIR,
    assetsDir: ASSETS_DIR,
    required: {
      noelleVrm: { path: path.relative(ROOT_DIR, noelleVrm).replace(/\\/g, "/"), exists: fileExists(noelleVrm) },
      motionManifest: { path: "src/assets/motion_manifest.json", exists: fileExists(path.join(ASSETS_DIR, "motion_manifest.json")) },
      itemManifest: { path: "src/assets/item_manifest.json", exists: fileExists(path.join(ASSETS_DIR, "item_manifest.json")) },
      expressionManifest: { path: "src/assets/expressions/manifest.json", exists: fileExists(path.join(expressionsDir, "manifest.json")) }
    },
    expressions,
    motions,
    items,
    avatars,
    counts: { expressions: expressions.length, motions: motions.length, items: items.length, avatars: avatars.length }
  };
}

function getAppIconPath() {
  const candidates = [
    path.join(APP_ICONS_DIR, "app.ico"),
    path.join(APP_ICONS_DIR, "noelle_256.png"),
    path.join(APP_ICONS_DIR, "noelle_128.png"),
    path.join(APP_ICONS_DIR, "noelle_64.png"),
    path.join(APP_ICONS_DIR, "noelle_32.png")
  ];
  return candidates.find((file) => fileExists(file)) || null;
}

function getTrayImage() {
  const iconPath = getAppIconPath();
  if (!iconPath) return null;
  const image = nativeImage.createFromPath(iconPath);
  if (!image || image.isEmpty()) return null;
  return process.platform === "win32" ? image.resize({ width: 16, height: 16 }) : image;
}

function showMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) createMainWindow();
  if (mainWin) {
    mainWin.show();
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
}

function toggleMainWindow() {
  if (!mainWin || mainWin.isDestroyed()) {
    createMainWindow();
    return;
  }
  if (mainWin.isVisible()) mainWin.hide();
  else showMainWindow();
}

function updateTrayMenu() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([{ label: "Abrir Room", click: () => createRoomWindow({ show: true }) },
    { label: "Mostrar/Ocultar Noelle", click: () => toggleMainWindow() },
    { label: "Abrir widget/avatar", click: () => createAvatarWindow({ show: true }) },
    { label: "Centralizar avatar", click: () => sendAvatarCommand("center", {}) },
    { label: "Parar emote", click: () => sendAvatarCommand("stop", {}) },
    { type: "separator" },
    { label: "Status: " + (runtime.lastStatus || "iniciando"), enabled: false },
    { type: "separator" },
    { label: "Sair da Noelle", click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
}

function createTrayIcon() {
  if (tray) return tray;
  const image = getTrayImage();
  if (!image) {
    appendLog("tray_icon_missing", { expected: "assets/icons/app.ico" });
    return null;
  }
  tray = new Tray(image);
  tray.setToolTip("Noelle IA");
  tray.on("click", () => toggleMainWindow());
  tray.on("double-click", () => {
    showMainWindow();
    createAvatarWindow({ show: true });
  });
  updateTrayMenu();
  return tray;
}

function createMainWindow() {
  mainWin = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1120,
    minHeight: 720,
    title: "Noelle Companion",
    icon: getAppIconPath(),
    backgroundColor: "#090711",
    autoHideMenuBar: true,
    frame: true,
    titleBarStyle: "default",
    show: false,
    webPreferences: {
      preload: path.join(ROOT_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWin.once("ready-to-show", () => mainWin.show());
  mainWin.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWin.hide();
      updateTrayMenu();
    }
  });
  mainWin.on("closed", () => { mainWin = null; });
  mainWin.loadFile(path.join(SRC_DIR, "controls.html"));
}

// NOELLE_ROOM_V18_6_BEGIN
function roomCatalogPath() {
  return path.join(ASSETS_DIR, "room_manifest.json");
}
function roomLayoutDevPath() {
  return path.join(ASSETS_DIR, "room_layout.json");
}
function roomLayoutUserPath() {
  return path.join(getUserDataSafe(), "rooms", "room_layout.json");
}
function readRoomJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").trim();
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}
function finiteRoomNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function safeRoomVec3(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return [finiteRoomNumber(value[0], fallback[0]), finiteRoomNumber(value[1], fallback[1]), finiteRoomNumber(value[2], fallback[2])];
}
function sanitizeRoomLayout(layout) {
  return {
    version: 1,
    roomId: String(layout?.roomId || "default_room").replace(/[^a-zA-Z0-9_-]/g, "_"),
    grid: layout?.grid || { size: 0.25, enabled: true },
    player: {
      position: safeRoomVec3(layout?.player?.position, [0, 0, 2.6]),
      yaw: finiteRoomNumber(layout?.player?.yaw, 0),
      pitch: finiteRoomNumber(layout?.player?.pitch, 0)
    },
    items: Array.isArray(layout?.items) ? layout.items.map((item) => ({
      uid: String(item.uid || "").slice(0, 100),
      itemId: String(item.itemId || "").slice(0, 100),
      position: safeRoomVec3(item.position, [0, 0, 0]),
      rotationDeg: safeRoomVec3(item.rotationDeg, [0, 0, 0]),
      scale: safeRoomVec3(item.scale, [1, 1, 1]).map((v) => Math.max(0.001, v)),
      locked: !!item.locked
    })).filter((item) => item.uid && item.itemId) : []
  };
}
function loadRoomLayoutFile() {
  const user = roomLayoutUserPath();
  const dev = roomLayoutDevPath();
  return sanitizeRoomLayout(readRoomJson(user, readRoomJson(dev, { version: 1, roomId: "default_room", grid: { size: 0.25, enabled: true }, player: { position: [0, 0, 2.6], yaw: 0, pitch: 0 }, items: [] })));
}
function saveRoomLayoutFile(layout) {
  const safe = sanitizeRoomLayout(layout || {});
  const user = roomLayoutUserPath();
  ensureDir(path.dirname(user));
  const tmp = user + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), "utf8");
  fs.renameSync(tmp, user);
  if (!app.isPackaged) {
    try {
      const devTmp = roomLayoutDevPath() + ".tmp";
      fs.writeFileSync(devTmp, JSON.stringify(safe, null, 2), "utf8");
      fs.renameSync(devTmp, roomLayoutDevPath());
    } catch {}
  }
  return safe;
}
function createRoomWindow({ show = true } = {}) {
  if (roomWin && !roomWin.isDestroyed()) {
    if (show) roomWin.show();
    roomWin.focus();
    return roomWin;
  }
  roomWin = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 980,
    minHeight: 650,
    title: "Noelle Room",
    icon: typeof getAppIconPath === "function" ? getAppIconPath() : undefined,
    backgroundColor: "#080711",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(ROOT_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  roomWin.once("ready-to-show", () => { if (show) roomWin.show(); });
  roomWin.on("closed", () => { roomWin = null; });
  roomWin.loadFile(path.join(SRC_DIR, "room.html"));
  return roomWin;
}
// NOELLE_ROOM_V18_6_END


function createAvatarWindow({ show = true } = {}) {
  if (avatarWin && !avatarWin.isDestroyed()) {
    if (show) avatarWin.show();
    avatarWin.focus();
    return avatarWin;
  }

  const saved = loadState();
  avatarWin = new BrowserWindow({
    width: 720,
    height: 900,
    minWidth: 420,
    minHeight: 640,
    title: "Noelle Avatar Widget",
    icon: getAppIconPath(),
    backgroundColor: "#00000000",
    transparent: true,
    frame: false,
    resizable: true,
    alwaysOnTop: !!saved.avatar?.alwaysOnTop,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(ROOT_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  avatarWin.once("ready-to-show", () => { if (show) avatarWin.show(); });
  avatarWin.on("closed", () => { avatarWin = null; updateTrayMenu(); });
  avatarWin.loadFile(path.join(SRC_DIR, "avatar_view.html"));
  updateTrayMenu();
  return avatarWin;
}

function normalizeAvatarCommandPayload(command, payload = {}) {
  const entry = payload && typeof payload === "object" ? payload : {};
  const raw = String(command || entry.command || entry.type || "").trim();
  const key = raw.toLowerCase();
  const pickId = (...names) => {
    for (const name of names) {
      const value = entry?.[name];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    if (entry?.file) return String(entry.file).replace(/\\/g, "/").split("/").pop().replace(/\.[^.]+$/, "");
    return "";
  };
  const id = pickId("id", "motionId", "itemId", "expressionId", "value", "name", "label", "file");

  if (key === "motion" || key === "emote" || key === "playmotion") return { type: "playMotion", motionId: id, source: entry };
  if (key === "expression" || key === "setexpression" || key === "showexpression") return { type: "showExpression", expressionId: id, source: entry };
  if (key === "item" || key === "equip" || key === "equipitem") return { type: "equipItem", itemId: id, slot: entry.slot || entry.meta?.slot || "right_hand", source: entry };
  if (key === "camera" || key === "preset" || key === "setpreset") return { type: "setPreset", preset: entry.value || entry.preset || entry.id || "full", source: entry };
  if (key === "center" || key === "centeravatar") return { type: "centerAvatar" };
  if (key === "pause" || key === "togglepausemotion") return { type: "togglePauseMotion" };
  if (key === "stop" || key === "stopmotion") return { type: "stopMotion" };
  if (key === "clearitems" || key === "clearavataritems") return { type: "clearAvatarItems" };
  if (key === "rotateleft") return { type: "rotateAvatar", deltaY: -0.15 };
  if (key === "rotateright") return { type: "rotateAvatar", deltaY: 0.15 };
  if (key === "resetrotation" || key === "resetavatarrotation") return { type: "resetAvatarRotation" };
  return entry.type ? entry : { type: raw || "noop", source: entry };
}

function emitAvatarCommandPayload(win, payload) {
  try { win.webContents.send("avatar:command", payload); } catch {}
  try { win.webContents.send("avatar-command", payload); } catch {}
}

function sendAvatarCommand(command, payload = {}) {
  const win = createAvatarWindow({ show: true });
  const avatarPayload = normalizeAvatarCommandPayload(command, payload);
  const data = { command, payload, avatarPayload, at: Date.now() };
  runtime.lastAvatarCommand = data;
  updateTrayMenu();

  const emit = () => setTimeout(() => emitAvatarCommandPayload(win, avatarPayload), 250);
  if (win.webContents.isLoading()) win.webContents.once("did-finish-load", emit);
  else emit();

  return { ok: true, sent: data };
}

function safeSpawn(command, args, options = {}) {
  if (!command || typeof command !== "string") return Promise.resolve({ ok: false, error: "Comando inválido." });
  const safeArgs = Array.isArray(args) ? args.filter((arg) => typeof arg === "string") : [];
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(command, safeArgs, { windowsHide: true, ...options });
    } catch (err) {
      resolve({ ok: false, error: trimErr(err.message || err) });
      return;
    }

    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => { stdout += data.toString(); if (stdout.length > 2000) stdout = stdout.slice(-2000); });
    child.stderr?.on("data", (data) => { stderr += data.toString(); if (stderr.length > 2000) stderr = stderr.slice(-2000); });
    child.on("error", (err) => resolve({ ok: false, error: trimErr(err.message || err), stdout, stderr }));
    child.on("close", (code) => resolve({
      ok: code === 0,
      code,
      stdout: trimErr(stdout, 2000),
      stderr: trimErr(stderr, 2000),
      error: code === 0 ? null : trimErr(stderr || stdout || `Processo saiu com código ${code}`)
    }));
  });
}

function pythonCandidates() {
  const venv = process.platform === "win32" ? path.join(ROOT_DIR, ".venv", "Scripts", "python.exe") : path.join(ROOT_DIR, ".venv", "bin", "python");
  const list = [];
  if (fileExists(venv)) list.push({ cmd: venv, argsPrefix: [] });
  if (process.platform === "win32") list.push({ cmd: "py", argsPrefix: ["-3"] });
  list.push({ cmd: "python", argsPrefix: [] });
  list.push({ cmd: "python3", argsPrefix: [] });
  return list;
}

async function speakText(text) {
  const clean = String(text || "").trim().slice(0, 1000);
  if (!clean) return { ok: false, error: "Texto vazio." };

  const ttsScript = path.join(ROOT_DIR, "tools", "noelle_tts", "speak_piper.py");
  if (fileExists(ttsScript)) {
    for (const py of pythonCandidates()) {
      const result = await safeSpawn(py.cmd, [...py.argsPrefix, ttsScript, "--text", clean], { cwd: ROOT_DIR });
      if (result.ok) return { ok: true, engine: "python-tts", detail: result.stdout };
    }
  }

  if (process.platform === "win32") {
    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.Volume = 100; $s.Speak(${JSON.stringify(clean)});`;
    const result = await safeSpawn("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], { cwd: ROOT_DIR });
    if (result.ok) return { ok: true, engine: "windows-sapi" };
    return { ok: false, error: result.error || "Falha no TTS Windows." };
  }

  return { ok: false, error: "TTS não configurado neste sistema." };
}

async function getStatus() {
  const state = loadState();
  const ping = await ollamaRequest("GET", "/api/tags", null, 3500);
  const assets = scanAssets();

  return {
    ok: true,
    year: APP_YEAR,
    app: "Noelle Companion",
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    userData: getUserDataSafe(),
    ollama: {
      ok: !!ping.ok,
      url: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,
      error: ping.ok ? null : ping.error,
      models: ping.ok && Array.isArray(ping.data?.models) ? ping.data.models.map((m) => m.name).slice(0, 80) : []
    },
    runtime,
    state,
    assets: { counts: assets.counts, required: assets.required },
    options: {
      models: MODEL_OPTIONS,
      profiles: PROFILE_OPTIONS,
      personas: Object.fromEntries(Object.entries(PERSONA_OPTIONS).map(([k, v]) => [k, { label: v.label }]))
    }
  };
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    try { app.setAppUserModelId("com.masoritech.noelle"); } catch {}
  }

  ensureDir(path.join(getUserDataSafe(), "state"));
  ensureDir(path.join(getUserDataSafe(), "logs"));

  createTrayIcon();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else showMainWindow();
  });
});

app.on("before-quit", () => { isQuitting = true; try { flushNoelleLogsNow(); } catch {} });
app.on("window-all-closed", (event) => {
  if (!isQuitting) event.preventDefault();
});

ipcMain.handle("noelle:status", async () => getStatus());
ipcMain.handle("noelle:chat", async (_event, payload) => chatWithNoelle(payload || {}));
ipcMain.handle("noelle:save-state", async (_event, patch) => ({ ok: true, state: saveState(patch || {}) }));
ipcMain.handle("noelle:load-state", async () => ({ ok: true, state: loadState() }));
ipcMain.handle("noelle:assets", async () => ({ ok: true, assets: scanAssets() }));
ipcMain.handle("noelle:open-external", async (_event, url) => {
  const target = String(url || "");
  if (/^https?:\/\//i.test(target)) {
    await shell.openExternal(target);
    return { ok: true };
  }
  return { ok: false, error: "URL inválida." };
});

ipcMain.handle("avatar:open", async () => { createAvatarWindow({ show: true }); return { ok: true }; });
ipcMain.handle("avatar:close", async () => { if (avatarWin && !avatarWin.isDestroyed()) avatarWin.hide(); updateTrayMenu(); return { ok: true }; });
ipcMain.handle("avatar:command", async (_event, command, payload) => sendAvatarCommand(command, payload || {}));
ipcMain.handle("avatar:always-on-top", async (_event, enabled) => {
  const win = createAvatarWindow({ show: true });
  win.setAlwaysOnTop(!!enabled, "floating");
  const state = loadState();
  saveState({ avatar: { ...(state.avatar || {}), alwaysOnTop: !!enabled } });
  return { ok: true, enabled: !!enabled };
});
ipcMain.handle("avatar:save-position", async () => {
  if (!avatarWin || avatarWin.isDestroyed()) return { ok: false, error: "Janela do avatar não está aberta." };
  const bounds = avatarWin.getBounds();
  const state = loadState();
  saveState({ avatar: { ...(state.avatar || {}), bounds } });
  return { ok: true, bounds };
});

ipcMain.handle("tts:speak", async (_event, text) => speakText(text));

// Compatibilidade para nomes antigos usados no projeto.
ipcMain.handle("desktop-widget-open-avatar", async () => { createAvatarWindow({ show: true }); return { ok: true }; });
ipcMain.handle("desktop-widget-command", async (_event, command, payload) => sendAvatarCommand(command, payload || {}));
ipcMain.handle("noelle-core-chat", async (_event, payload) => chatWithNoelle(payload || {}));
ipcMain.handle("noelle-core-status", async () => getStatus());





// NOELLE_ROOM_IPC_V18_6_BEGIN
ipcMain.handle("room:open", async () => { createRoomWindow({ show: true }); return { ok: true }; });
ipcMain.handle("room:close", async () => { if (roomWin && !roomWin.isDestroyed()) roomWin.hide(); return { ok: true }; });
ipcMain.handle("room:catalog", async () => {
  const raw = readRoomJson(roomCatalogPath(), null);
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return { ok: true, items: list };
});
ipcMain.handle("room:load-layout", async () => ({ ok: true, layout: loadRoomLayoutFile() }));
ipcMain.handle("room:save-layout", async (_event, layout) => ({ ok: true, layout: saveRoomLayoutFile(layout || {}) }));
// NOELLE_ROOM_IPC_V18_6_END

// NOELLE_ROOM_V19_BEGIN
function noelleV19RoomLayoutFile() {
  const dir = path.join(getUserDataSafe(), "rooms");
  ensureDir(dir);
  return path.join(dir, "room_v19_layout.json");
}
function noelleV19ReadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const text = fs.readFileSync(file, "utf8").trim();
    return text ? JSON.parse(text) : fallback;
  } catch {
    return fallback;
  }
}
function noelleV19SanitizeLayout(layout) {
  return {
    version: Number(layout?.version || 19),
    player: {
      position: Array.isArray(layout?.player?.position) ? layout.player.position.slice(0, 3).map(Number) : [0, 0, 2.6],
      yaw: Number(layout?.player?.yaw || 0),
      pitch: Number(layout?.player?.pitch || 0)
    },
    items: Array.isArray(layout?.items) ? layout.items.slice(0, 500).map((item) => ({
      uid: String(item.uid || "").slice(0, 120),
      itemId: String(item.itemId || "").slice(0, 120),
      file: String(item.file || "").slice(0, 240),
      position: Array.isArray(item.position) ? item.position.slice(0, 3).map(Number) : [0, 0, 0],
      rotationDeg: Array.isArray(item.rotationDeg) ? item.rotationDeg.slice(0, 3).map(Number) : [0, 0, 0],
      scale: Array.isArray(item.scale) ? item.scale.slice(0, 3).map((v) => Math.max(0.001, Number(v) || 1)) : [1, 1, 1]
    })).filter((item) => item.uid && item.itemId) : []
  };
}
function noelleV19Catalog() {
  const items = [];
  const itemManifest = noelleV19ReadJson(path.join(ASSETS_DIR, "item_manifest.json"), []);
  const itemList = Array.isArray(itemManifest) ? itemManifest : Array.isArray(itemManifest.items) ? itemManifest.items : [];
  for (const item of itemList) items.push({ ...item, base: "items", category: item.category || "furniture" });
  return items;
}
function createRoomWindow({ show = true } = {}) {
  if (roomWin && !roomWin.isDestroyed()) {
    if (show) roomWin.show();
    roomWin.focus();
    return roomWin;
  }
  roomWin = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 680,
    title: "Noelle Room V19",
    icon: typeof getAppIconPath === "function" ? getAppIconPath() : undefined,
    backgroundColor: "#070711",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(ROOT_DIR, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  roomWin.once("ready-to-show", () => { if (show) roomWin.show(); });
  roomWin.on("closed", () => { roomWin = null; });
  roomWin.loadFile(path.join(SRC_DIR, "room.html"));
  return roomWin;
}
try { ipcMain.removeHandler("room:open"); } catch {}
try { ipcMain.removeHandler("room:catalog"); } catch {}
try { ipcMain.removeHandler("room:load-layout"); } catch {}
try { ipcMain.removeHandler("room:save-layout"); } catch {}
ipcMain.handle("room:open", async () => { createRoomWindow({ show: true }); return { ok: true }; });
ipcMain.handle("room:catalog", async () => ({ ok: true, items: noelleV19Catalog() }));
ipcMain.handle("room:load-layout", async () => ({ ok: true, layout: noelleV19SanitizeLayout(noelleV19ReadJson(noelleV19RoomLayoutFile(), null)) }));
ipcMain.handle("room:save-layout", async (_event, layout) => {
  const safe = noelleV19SanitizeLayout(layout || {});
  const file = noelleV19RoomLayoutFile();
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(safe, null, 2), "utf8");
  fs.renameSync(tmp, file);
  return { ok: true, layout: safe };
});
// NOELLE_ROOM_V19_END




// NOELLE_V19_8_3_LOADFILE_BEGIN
// Preview/Teste aberto por BrowserWindow.loadFile(), evitando fetch frágil para HTML local.
function noelleV1983SafeAvatarRel(input) {
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object") raw = input.rel || input.path || input.file || input.avatar || "";
  raw = String(raw || "").replace(/\\/g, "/").trim();
  raw = raw.replace(/^file:\/\/\/?/i, "");
  raw = raw.replace(/^.*?\/src\//i, "");
  raw = raw.replace(/^src\//i, "");
  raw = raw.replace(/^\/+/, "");
  if (!raw) raw = "assets/Noelle.vrm";
  if (raw.includes("..")) throw new Error("Caminho de avatar inseguro: " + raw);
  if (!/\.(vrm|glb)$/i.test(raw)) throw new Error("Avatar precisa ser .vrm ou .glb: " + raw);
  return raw;
}

function noelleV1983PreviewHtmlPath() {
  const rootDir = typeof ROOT_DIR !== "undefined" ? ROOT_DIR : __dirname;
  const srcDir = typeof SRC_DIR !== "undefined" ? SRC_DIR : path.join(rootDir, "src");
  return path.join(srcDir, "avatar_loadfile_preview_v19_8_3.html");
}

async function noelleV1983OpenAvatarPreviewLoadFile(input) {
  const rootDir = typeof ROOT_DIR !== "undefined" ? ROOT_DIR : __dirname;
  const rel = noelleV1983SafeAvatarRel(input);
  const html = noelleV1983PreviewHtmlPath();
  if (!fs.existsSync(html)) throw new Error("Preview HTML não encontrado: " + html);

  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 520,
    minHeight: 420,
    show: false,
    title: "Noelle Preview / Teste",
    backgroundColor: "#0b0612",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(rootDir, "preload.js")
    }
  });

  win.once("ready-to-show", () => win.show());
  await win.loadFile(html, { query: { avatar: rel, source: "loadFile" } });
  return { ok: true, avatar: rel };
}

try {
  ipcMain.handle("noelle:open-avatar-preview-loadfile", async (_event, avatar) => {
    try {
      return await noelleV1983OpenAvatarPreviewLoadFile(avatar);
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });
} catch (err) {
  // Se o handler já existir, não derruba o app.
  console.warn("[Noelle V19.8.3] handler preview loadFile não registrado:", err && err.message || err);
}

try {
  ipcMain.handle("noelle:open-avatar-window-loadfile", async (_event, avatar) => {
    try {
      return await noelleV1983OpenAvatarPreviewLoadFile(avatar);
    } catch (err) {
      return { ok: false, error: String(err && err.message || err) };
    }
  });
} catch (err) {
  console.warn("[Noelle V19.8.3] handler avatar loadFile não registrado:", err && err.message || err);
}
// NOELLE_V19_8_3_LOADFILE_END

// NOELLE_V19_8_24_IMPORT_AVATAR_MAIN_BEGIN
;(() => {
  try {
    const electron = require("electron");
    const ipcMain = electron.ipcMain;
    const dialog = electron.dialog;
    const app = electron.app;
    const fs = require("fs");
    const path = require("path");

    if (!ipcMain || !dialog || global.__NOELLE_V19_8_24_IMPORT_AVATAR__) return;
    global.__NOELLE_V19_8_24_IMPORT_AVATAR__ = true;

    function projectRoot() {
      const candidates = [process.cwd(), app && app.getAppPath ? app.getAppPath() : "", __dirname].filter(Boolean);
      for (const candidate of candidates) {
        try {
          if (fs.existsSync(path.join(candidate, "package.json")) && fs.existsSync(path.join(candidate, "src"))) return candidate;
        } catch (_) {}
      }
      return process.cwd();
    }

    function safeName(name) {
      return String(name || "avatar")
        .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 90) || "avatar";
    }

    function readJson(file, fallback) {
      try {
        if (!fs.existsSync(file)) return fallback;
        return JSON.parse(fs.readFileSync(file, "utf8"));
      } catch (_) {
        return fallback;
      }
    }

    function writeManifest(root, relPath, name, ext) {
      const manifestPath = path.join(root, "src", "assets", "avatar_manifest.json");
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      const current = readJson(manifestPath, []);
      const entry = { name: name, path: relPath, file: relPath, type: ext.replace(/^\\./, "").toUpperCase() };
      let next = current;

      if (Array.isArray(current)) {
        const useString = current.some((item) => typeof item === "string");
        const already = current.some((item) => {
          if (typeof item === "string") return item.replace(/\\\\/g, "/") === relPath;
          const p = String(item.path || item.file || item.url || "").replace(/\\\\/g, "/");
          return p === relPath;
        });
        if (!already) next = current.concat([useString ? relPath : entry]);
      } else if (current && typeof current === "object" && Array.isArray(current.avatars)) {
        const already = current.avatars.some((item) => {
          if (typeof item === "string") return item.replace(/\\\\/g, "/") === relPath;
          const p = String(item.path || item.file || item.url || "").replace(/\\\\/g, "/");
          return p === relPath;
        });
        if (!already) next = Object.assign({}, current, { avatars: current.avatars.concat([entry]) });
      } else {
        next = [entry];
      }

      fs.writeFileSync(manifestPath, JSON.stringify(next, null, 2) + "\\n", "utf8");
      return Array.isArray(next) ? next.length : (Array.isArray(next.avatars) ? next.avatars.length : 1);
    }

    async function importAvatarHandler() {
      try {
        const chosen = await dialog.showOpenDialog({
          title: "Adicionar avatar VRM/GLB",
          properties: ["openFile"],
          filters: [{ name: "Avatares VRM/GLB", extensions: ["vrm", "glb"] }]
        });

        if (chosen.canceled || !chosen.filePaths || !chosen.filePaths[0]) return { ok: true, canceled: true };

        const source = chosen.filePaths[0];
        const ext = path.extname(source).toLowerCase();
        if (ext !== ".vrm" && ext !== ".glb") return { ok: false, error: "Escolha um arquivo .vrm ou .glb." };

        const root = projectRoot();
        const avatarDir = path.join(root, "src", "assets", "avatars");
        fs.mkdirSync(avatarDir, { recursive: true });

        const base = safeName(path.basename(source, ext));
        let fileName = base + ext;
        let dest = path.join(avatarDir, fileName);
        let n = 2;
        while (fs.existsSync(dest)) {
          fileName = base + "_" + n + ext;
          dest = path.join(avatarDir, fileName);
          n += 1;
        }

        fs.copyFileSync(source, dest);
        const relFromSrc = path.relative(path.join(root, "src"), dest).replace(/\\\\/g, "/");
        const publicRel = "assets/" + relFromSrc.replace(/^assets\//, "");
        const count = writeManifest(root, publicRel, base, ext);

        return { ok: true, canceled: false, name: base, path: publicRel, destination: dest, manifestCount: count };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err) };
      }
    }

    function safeHandle(channel) {
      try { ipcMain.handle(channel, importAvatarHandler); }
      catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[Noelle V19.8.24] IPC importAvatar:", msg);
      }
    }

    safeHandle("noelle:import-avatar");
    safeHandle("noelle:v19_8_24:import-avatar");
    safeHandle("noelle:v19_8_21:import-avatar");
    safeHandle("noelle:v19_8_20:import-avatar");
  } catch (err) {
    console.warn("[Noelle V19.8.24] Import avatar IPC indisponível:", err && err.message ? err.message : err);
  }
})();
// NOELLE_V19_8_24_IMPORT_AVATAR_MAIN_END


// NOELLE_STREAM_STT_MAIN_V19_8_38_BEGIN
;(() => {
  try {
    const { ipcMain, app } = require("electron");
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const { spawn } = require("child_process");

    if (!ipcMain || global.__NOELLE_STREAM_STT_MAIN_V19_8_38__) return;
    global.__NOELLE_STREAM_STT_MAIN_V19_8_38__ = true;

    const ROOT = process.cwd();
    const CONFIG_FILE = path.join(ROOT, "config", "stream_stt_v19_8_38.json");

    function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
    function readJson(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; } }
    function fileExists(file) { try { return fs.existsSync(file); } catch { return false; } }
    function safeExt(mimeType) { const t = String(mimeType || "").toLowerCase(); if (t.includes("ogg")) return ".ogg"; if (t.includes("wav")) return ".wav"; if (t.includes("mp3")) return ".mp3"; return ".webm"; }
    function defaultTempDir() { try { return path.join(app.getPath("temp"), "noelle-stream-stt"); } catch { return path.join(os.tmpdir(), "noelle-stream-stt"); } }

    function bufferFromAudio(audioBuffer) {
      if (Buffer.isBuffer(audioBuffer)) return audioBuffer;
      if (audioBuffer instanceof ArrayBuffer) return Buffer.from(audioBuffer);
      if (ArrayBuffer.isView(audioBuffer)) return Buffer.from(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength);
      if (audioBuffer && audioBuffer.type === "Buffer" && Array.isArray(audioBuffer.data)) return Buffer.from(audioBuffer.data);
      throw new Error("Formato de áudio inválido no IPC.");
    }

    function candidateCommands() {
      const cfg = readJson(CONFIG_FILE, {});
      const list = [];

      if (process.env.NOELLE_STT_CMD) {
        list.push({
          name: "env:NOELLE_STT_CMD",
          command: process.env.NOELLE_STT_CMD,
          args: process.env.NOELLE_STT_ARGS ? process.env.NOELLE_STT_ARGS.split(" ") : ["{input}"]
        });
      }

      if (cfg.command) {
        list.push({
          name: cfg.name || "config",
          command: cfg.command,
          args: Array.isArray(cfg.args) ? cfg.args : ["{input}"],
          cwd: cfg.cwd || ROOT
        });
      }

      const bundled = [
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "whisper-cli.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "main.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "whisper-cli"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "faster-whisper", command: path.join(ROOT, "tools", "faster-whisper", "faster-whisper.exe"), args: ["{input}", "--language", "pt", "--output_dir", "{outputDir}"] }
      ];

      for (const item of bundled) if (fileExists(item.command)) list.push(item);
      return list;
    }

    function replaceArgs(args, paths) {
      return args.map((arg) => String(arg)
        .replaceAll("{input}", paths.input)
        .replaceAll("{output}", paths.output)
        .replaceAll("{outputBase}", paths.outputBase)
        .replaceAll("{outputDir}", paths.outputDir)
      );
    }

    function runCommand(spec, paths, timeoutMs = 120000) {
      return new Promise((resolve) => {
        const args = replaceArgs(spec.args || ["{input}"], paths);
        const child = spawn(spec.command, args, { cwd: spec.cwd || ROOT, windowsHide: true, shell: false });
        let stdout = "";
        let stderr = "";
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          try { child.kill("SIGKILL"); } catch {}
          resolve({ ok: false, error: "STT demorou demais.", stdout, stderr, command: spec.name || spec.command });
        }, timeoutMs);

        child.stdout.on("data", (data) => { stdout += String(data); if (stdout.length > 200000) stdout = stdout.slice(-100000); });
        child.stderr.on("data", (data) => { stderr += String(data); if (stderr.length > 200000) stderr = stderr.slice(-100000); });
        child.on("error", (err) => { if (done) return; done = true; clearTimeout(timer); resolve({ ok: false, error: err?.message || String(err), stdout, stderr, command: spec.name || spec.command }); });
        child.on("close", (code) => { if (done) return; done = true; clearTimeout(timer); resolve({ ok: code === 0, code, stdout, stderr, command: spec.name || spec.command }); });
      });
    }

    function readTranscript(paths, stdout) {
      const candidates = [paths.output, paths.outputBase + ".txt"];

      try {
        const files = fs.existsSync(paths.outputDir) ? fs.readdirSync(paths.outputDir) : [];
        for (const file of files) if (/\.txt$/i.test(file)) candidates.push(path.join(paths.outputDir, file));
      } catch {}

      for (const file of candidates) {
        try {
          if (fs.existsSync(file)) {
            const text = fs.readFileSync(file, "utf8").trim();
            if (text) return text;
          }
        } catch {}
      }

      return String(stdout || "").trim();
    }

    async function transcribeHandler(_event, audioBuffer, meta = {}) {
      try {
        const buffer = bufferFromAudio(audioBuffer);
        if (!buffer.length) return { ok: false, error: "Áudio vazio." };

        const tmpDir = defaultTempDir();
        ensureDir(tmpDir);

        const id = "stream_" + Date.now() + "_" + Math.random().toString(16).slice(2);
        const input = path.join(tmpDir, id + safeExt(meta.mimeType));
        const outputBase = path.join(tmpDir, id + "_out");
        const output = outputBase + ".txt";
        fs.writeFileSync(input, buffer);

        const commands = candidateCommands();
        if (!commands.length) {
          return {
            ok: false,
            error: "STT backend não configurado. Configure NOELLE_STT_CMD ou config/stream_stt_v19_8_38.json.",
            input,
            expectedConfig: CONFIG_FILE
          };
        }

        const paths = { input, output, outputBase, outputDir: tmpDir };
        const errors = [];

        for (const spec of commands) {
          const result = await runCommand(spec, paths, Number(meta.timeoutMs || 120000));
          if (!result.ok) {
            errors.push((result.command || spec.command) + ": " + (result.error || result.stderr || ("exit " + result.code)));
            continue;
          }

          const transcript = readTranscript(paths, result.stdout);
          if (transcript) return { ok: true, text: transcript, transcript, backend: result.command || spec.name || spec.command, input, mimeType: meta.mimeType || "" };
          errors.push((result.command || spec.command) + ": sem texto");
        }

        return { ok: false, error: "Nenhum backend STT retornou texto.", details: errors.slice(-5), input };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    }

    function sttStatus() {
      const commands = candidateCommands();
      return {
        ok: true,
        configured: commands.length > 0,
        configFile: CONFIG_FILE,
        commands: commands.map((item) => ({ name: item.name || item.command, command: item.command }))
      };
    }

    try { ipcMain.handle("noelle:stream-transcribe-audio-v19_8_38", transcribeHandler); } catch (err) {
      const msg = err?.message || String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.38] handler transcribe:", msg);
    }

    try { ipcMain.handle("noelle:stream-stt-status-v19_8_38", async () => sttStatus()); } catch (err) {
      const msg = err?.message || String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.38] handler status:", msg);
    }
  } catch (err) {
    console.warn("[stream-stt-v19.8.38] main bridge indisponível:", err?.message || err);
  }
})();
// NOELLE_STREAM_STT_MAIN_V19_8_38_END



// NOELLE_STREAM_STT_MAIN_V19_8_39_BEGIN
;(() => {
  try {
    const { ipcMain, app } = require("electron");
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const { spawn, spawnSync } = require("child_process");

    if (!ipcMain || global.__NOELLE_STREAM_STT_MAIN_V19_8_39__) return;
    global.__NOELLE_STREAM_STT_MAIN_V19_8_39__ = true;

    const ROOT = process.cwd();
    const CONFIG_FILE_39 = path.join(ROOT, "config", "stream_stt_v19_8_39.json");
    const CONFIG_FILE_38 = path.join(ROOT, "config", "stream_stt_v19_8_38.json");

    function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
    function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
    function readJson(file, fallback) { try { return exists(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; } }
    function safeExt(mimeType) { const t = String(mimeType || "").toLowerCase(); if (t.includes("ogg")) return ".ogg"; if (t.includes("wav")) return ".wav"; if (t.includes("mp3")) return ".mp3"; return ".webm"; }
    function tempDir() { try { return path.join(app.getPath("temp"), "noelle-stream-stt"); } catch { return path.join(os.tmpdir(), "noelle-stream-stt"); } }

    function bufferFromAudio(audioBuffer) {
      if (Buffer.isBuffer(audioBuffer)) return audioBuffer;
      if (audioBuffer instanceof ArrayBuffer) return Buffer.from(audioBuffer);
      if (ArrayBuffer.isView(audioBuffer)) return Buffer.from(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength);
      if (audioBuffer && audioBuffer.type === "Buffer" && Array.isArray(audioBuffer.data)) return Buffer.from(audioBuffer.data);
      throw new Error("Formato de áudio inválido no IPC.");
    }

    function commandExistsInPath(command) {
      if (!command || command.includes("\\") || command.includes("/")) return exists(command);
      const tool = process.platform === "win32" ? "where" : "which";
      const result = spawnSync(tool, [command], { encoding: "utf8", windowsHide: true });
      return result.status === 0 && String(result.stdout || "").trim().length > 0;
    }

    function normalizeCommandSpec(spec, sourceName) {
      if (!spec || !spec.command) return null;
      const command = String(spec.command || "").trim();
      if (!command) return null;

      const args = Array.isArray(spec.args) ? spec.args : ["{input}"];
      return {
        name: spec.name || sourceName || command,
        command,
        args,
        cwd: spec.cwd || ROOT,
        source: sourceName || "config"
      };
    }

    function candidateCommands() {
      const list = [];

      if (process.env.NOELLE_STT_CMD) {
        list.push({
          name: "env:NOELLE_STT_CMD",
          command: process.env.NOELLE_STT_CMD,
          args: process.env.NOELLE_STT_ARGS ? process.env.NOELLE_STT_ARGS.split(" ") : ["{input}"],
          cwd: ROOT,
          source: "env"
        });
      }

      const cfg39 = readJson(CONFIG_FILE_39, {});
      const cfg38 = readJson(CONFIG_FILE_38, {});
      const from39 = normalizeCommandSpec(cfg39, "config_v19_8_39");
      const from38 = normalizeCommandSpec(cfg38, "config_v19_8_38");

      if (from39) list.push(from39);
      if (from38) list.push(from38);

      const bundled = [
        { name: "whisper.cpp whisper-cli.exe", command: path.join(ROOT, "tools", "whisper", "whisper-cli.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp main.exe", command: path.join(ROOT, "tools", "whisper", "main.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp whisper-cli", command: path.join(ROOT, "tools", "whisper", "whisper-cli"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "noelle python wrapper", command: process.platform === "win32" ? "py" : "python3", args: [path.join(ROOT, "tools", "stt", "noelle_stream_stt_python_wrapper_v19_8_39.py"), "{input}", "{output}"] }
      ];

      for (const item of bundled) {
        if (commandExistsInPath(item.command)) list.push({ ...item, source: "auto" });
      }

      const seen = new Set();
      return list.filter((item) => {
        const key = item.command + "::" + JSON.stringify(item.args || []);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    function replaceArgs(args, paths) {
      return args.map((arg) => String(arg)
        .replaceAll("{input}", paths.input)
        .replaceAll("{output}", paths.output)
        .replaceAll("{outputBase}", paths.outputBase)
        .replaceAll("{outputDir}", paths.outputDir)
      );
    }

    function runCommand(spec, paths, timeoutMs = 120000) {
      return new Promise((resolve) => {
        const args = replaceArgs(spec.args || ["{input}"], paths);
        const child = spawn(spec.command, args, {
          cwd: spec.cwd || ROOT,
          windowsHide: true,
          shell: false
        });

        let stdout = "";
        let stderr = "";
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          try { child.kill("SIGKILL"); } catch {}
          resolve({ ok: false, error: "STT demorou demais.", stdout, stderr, command: spec.name || spec.command });
        }, timeoutMs);

        child.stdout.on("data", (data) => { stdout += String(data); if (stdout.length > 200000) stdout = stdout.slice(-100000); });
        child.stderr.on("data", (data) => { stderr += String(data); if (stderr.length > 200000) stderr = stderr.slice(-100000); });

        child.on("error", (err) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: false, error: err && err.message ? err.message : String(err), stdout, stderr, command: spec.name || spec.command });
        });

        child.on("close", (code) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: code === 0, code, stdout, stderr, command: spec.name || spec.command });
        });
      });
    }

    function readTranscript(paths, stdout) {
      const candidates = [paths.output, paths.outputBase + ".txt"];
      try {
        const files = fs.existsSync(paths.outputDir) ? fs.readdirSync(paths.outputDir) : [];
        for (const file of files) if (/\.txt$/i.test(file)) candidates.push(path.join(paths.outputDir, file));
      } catch {}

      for (const file of candidates) {
        try {
          if (fs.existsSync(file)) {
            const text = fs.readFileSync(file, "utf8").trim();
            if (text) return text;
          }
        } catch {}
      }

      return String(stdout || "").trim();
    }

    function statusPayload(extra = {}) {
      const commands = candidateCommands();
      return {
        ok: true,
        configured: commands.length > 0,
        configFile: CONFIG_FILE_39,
        legacyConfigFile: CONFIG_FILE_38,
        commands: commands.map((item) => ({
          name: item.name || item.command,
          command: item.command,
          args: item.args,
          source: item.source || "unknown",
          exists: commandExistsInPath(item.command)
        })),
        message: commands.length
          ? "STT configurado."
          : "STT backend não configurado. Rode CONFIGURAR_STT.bat ou edite config/stream_stt_v19_8_39.json.",
        ...extra
      };
    }

    async function transcribeHandler(_event, audioBuffer, meta = {}) {
      try {
        const buffer = bufferFromAudio(audioBuffer);
        if (!buffer.length) return { ok: false, error: "Áudio vazio.", status: statusPayload() };

        const dir = tempDir();
        ensureDir(dir);

        const id = "stream_" + Date.now() + "_" + Math.random().toString(16).slice(2);
        const input = path.join(dir, id + safeExt(meta.mimeType));
        const outputBase = path.join(dir, id + "_out");
        const output = outputBase + ".txt";
        fs.writeFileSync(input, buffer);

        const commands = candidateCommands();

        if (!commands.length) {
          return {
            ok: false,
            error: "STT backend não configurado.",
            help: "Rode CONFIGURAR_STT.bat ou configure config/stream_stt_v19_8_39.json.",
            input,
            savedAudio: input,
            status: statusPayload({ lastAudio: input })
          };
        }

        const paths = { input, output, outputBase, outputDir: dir };
        const errors = [];

        for (const spec of commands) {
          const result = await runCommand(spec, paths, Number(meta.timeoutMs || 120000));

          if (!result.ok) {
            errors.push((result.command || spec.command) + ": " + (result.error || result.stderr || ("exit " + result.code)));
            continue;
          }

          const transcript = readTranscript(paths, result.stdout);
          if (transcript) {
            return {
              ok: true,
              text: transcript,
              transcript,
              backend: result.command || spec.name || spec.command,
              input,
              savedAudio: input,
              mimeType: meta.mimeType || ""
            };
          }

          errors.push((result.command || spec.command) + ": sem texto");
        }

        return {
          ok: false,
          error: "Nenhum backend STT retornou texto.",
          details: errors.slice(-5),
          input,
          savedAudio: input,
          status: statusPayload({ lastAudio: input })
        };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err), status: statusPayload() };
      }
    }

    try { ipcMain.handle("noelle:stream-transcribe-audio-v19_8_39", transcribeHandler); } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.39] handler transcribe:", msg);
    }

    try { ipcMain.handle("noelle:stream-stt-status-v19_8_39", async () => statusPayload()); } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.39] handler status:", msg);
    }
  } catch (err) {
    console.warn("[stream-stt-v19.8.39] main bridge indisponível:", err && err.message ? err.message : err);
  }
})();
// NOELLE_STREAM_STT_MAIN_V19_8_39_END



// YORU_KOBOLD_REPLACE_2026_BEGIN
(() => {
  let __yoruKoboldChat = null;
  function getYoruKoboldChat() {
    if (!__yoruKoboldChat) {
      const { YoruKoboldEmbeddedClient } = require("./src/main/yoru_kobold_embedded_client.cjs");
      __yoruKoboldChat = new YoruKoboldEmbeddedClient({ root: path.join(__dirname, "yoru_chat"), timeoutMs: 180000 });
    }
    return __yoruKoboldChat;
  }
  function normalizeYoruResult(res, secondsFallback = null) {
    const text = String(res?.message || res?.text || res?.reply || "").trim();
    return {
      ok: !!res?.ok,
      message: text,
      text,
      reply: text,
      seconds: res?.elapsed_sec || res?.elapsedSec || secondsFallback,
      model: res?.model || "koboldcpp/yoru",
      profile: res?.profile || "auto",
      persona: "yoru",
      route: res?.route || null,
      state: res?.state || "idle",
      backend: "koboldcpp_via_yoru",
      replaced: "ollama",
      source: "yoru_kobold_embedded",
      raw: res
    };
  }
  async function yoruKoboldChatHandler(_event, payload = {}) {
    const start = Date.now();
    try {
      const userText = String(payload?.message || payload?.text || payload?.prompt || "").trim();
      if (!userText) return { ok: false, error: "Mensagem vazia.", backend: "koboldcpp_via_yoru", replaced: "ollama" };
      runtime.lastStatus = "gerando_kobold";
      updateTrayMenu?.();
      const res = await getYoruKoboldChat().chat({ ...payload, message: userText, speak: false });
      const out = normalizeYoruResult(res, ((Date.now() - start) / 1000).toFixed(2));
      runtime.lastChatSeconds = out.seconds;
      runtime.lastStatus = out.ok ? "pronto_kobold" : "erro_kobold";
      runtime.lastError = out.ok ? null : (out.raw?.error || "Erro Yoru/Kobold");
      runtime.lastSuccessAt = out.ok ? new Date().toISOString() : runtime.lastSuccessAt;
      updateTrayMenu?.();
      return out.ok ? out : { ...out, error: out.raw?.error || "Falha no Yoru/Kobold" };
    } catch (err) {
      const msg = String(err?.message || err);
      runtime.lastStatus = "erro_kobold";
      runtime.lastError = msg;
      updateTrayMenu?.();
      return { ok: false, error: msg, backend: "koboldcpp_via_yoru", replaced: "ollama" };
    }
  }
  async function yoruKoboldStatusHandler() {
    let yoru = null;
    try { yoru = await getYoruKoboldChat().status(); } catch (err) { yoru = { ok: false, error: String(err?.message || err) }; }
    let state = {};
    let assets = null;
    try { state = typeof loadState === "function" ? loadState() : {}; } catch (_) {}
    try { assets = typeof scanAssets === "function" ? scanAssets() : null; } catch (_) {}
    return {
      ok: true,
      year: typeof APP_YEAR !== "undefined" ? APP_YEAR : 2026,
      app: "Noelle Companion",
      backend: "koboldcpp_via_yoru",
      chat: { backend: "koboldcpp_via_yoru", transport: "stdio_jsonl", yoru },
      kobold: yoru,
      ollama: { ok: false, disabled: true, replacedBy: "koboldcpp_via_yoru" },
      runtime,
      state,
      assets: assets ? { counts: assets.counts, required: assets.required } : null,
      options: {
        models: { "koboldcpp/yoru": { label: "Yoru + KoboldCpp", note: "Chat principal substituindo Ollama." } },
        profiles: { auto: { label: "Auto" }, fast: { label: "FAST" }, think: { label: "THINK" } },
        personas: { yoru: { label: "Yoru" } }
      }
    };
  }
  function installYoruKoboldReplacement() {
    try { ipcMain.removeHandler("noelle:chat"); } catch (_) {}
    ipcMain.handle("noelle:chat", yoruKoboldChatHandler);
    try { ipcMain.removeHandler("noelle:status"); } catch (_) {}
    ipcMain.handle("noelle:status", yoruKoboldStatusHandler);
    try { ipcMain.removeHandler("noelle:kobold-status"); } catch (_) {}
    ipcMain.handle("noelle:kobold-status", async () => getYoruKoboldChat().status());
    appendLog?.("yoru_kobold_replace_enabled", { channel: "noelle:chat", backend: "koboldcpp_via_yoru" });
    console.log("[NoelleKoboldReplace] noelle:chat agora usa Yoru + KoboldCpp. Ollama não é mais usado no chat.");
  }
  try { installYoruKoboldReplacement(); } catch (err) { console.warn("[NoelleKoboldReplace] instalação inicial falhou:", err?.message || err); }
  try { app.whenReady().then(() => setTimeout(installYoruKoboldReplacement, 300)); } catch (_) {}
  setTimeout(() => { try { installYoruKoboldReplacement(); } catch (_) {} }, 1500);
  try { app.on("before-quit", () => { try { if (__yoruKoboldChat) __yoruKoboldChat.stop(); } catch (_) {} }); } catch (_) {}
})();
// YORU_KOBOLD_REPLACE_2026_END
