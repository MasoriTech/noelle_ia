"use strict";

const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { spawn } = require("child_process");

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

function appendLog(message, extra = null) {
  try {
    fs.appendFileSync(logFile(), JSON.stringify({ at: new Date().toISOString(), message, extra }) + "\n", "utf8");
  } catch {}
}

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
    theme: saved.theme || "noelle",
    avatar: saved.avatar || { file: "src/assets/Noelle.vrm", camera: "bust", alwaysOnTop: false }
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
        headers: body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {},
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
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 620,
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

// NOELLE_ROOM_V18_2_BEGIN
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
function inferRoomManifestFromItems() {
  const itemManifest = readRoomJson(path.join(ASSETS_DIR, "item_manifest.json"), []);
  const list = Array.isArray(itemManifest) ? itemManifest : Array.isArray(itemManifest.items) ? itemManifest.items : [];
  const roomIds = /desk|piano|chair|cadeira|mesa|table|bed|sofa|monitor|lamp|shelf|estante|room|floor/i;
  return list.filter((item) => {
    const hay = [item.id, item.label, item.file, item.category, item.kind].join(" ");
    return item.kind === "room_item" || item.category === "scene_prop" || item.category === "furniture" || roomIds.test(hay);
  }).map((item) => ({
    id: item.id,
    label: item.label || item.id,
    file: item.file,
    kind: "room_item",
    category: item.category || "furniture",
    placement: { surface: "floor", snap: true, rotateStepDeg: 15, canCollide: true, targetSize: item.id === "grand_piano" ? 1.35 : 1.0 }
  }));
}
function scanRoomCatalog() {
  const raw = readRoomJson(roomCatalogPath(), null);
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : inferRoomManifestFromItems();
  return list.filter(Boolean);
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
  return sanitizeRoomLayout(readRoomJson(user, readRoomJson(dev, { version: 1, roomId: "default_room", grid: { size: 0.25, enabled: true }, items: [] })));
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
    width: 1280,
    height: 820,
    minWidth: 960,
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
// NOELLE_ROOM_V18_2_END
function createAvatarWindow({ show = true } = {}) {
  if (avatarWin && !avatarWin.isDestroyed()) {
    if (show) avatarWin.show();
    avatarWin.focus();
    return avatarWin;
  }

  const saved = loadState();
  avatarWin = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 280,
    minHeight: 360,
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

app.on("before-quit", () => { isQuitting = true; });
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

// NOELLE_ROOM_IPC_V18_2_BEGIN
ipcMain.handle("room:open", async () => { createRoomWindow({ show: true }); return { ok: true }; });
ipcMain.handle("room:close", async () => { if (roomWin && !roomWin.isDestroyed()) roomWin.hide(); return { ok: true }; });
ipcMain.handle("room:catalog", async () => ({ ok: true, items: scanRoomCatalog() }));
ipcMain.handle("room:load-layout", async () => ({ ok: true, layout: loadRoomLayoutFile() }));
ipcMain.handle("room:save-layout", async (_event, layout) => ({ ok: true, layout: saveRoomLayoutFile(layout || {}) }));
// NOELLE_ROOM_IPC_V18_2_END
