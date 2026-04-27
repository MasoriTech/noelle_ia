"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, "backups", "v17_4_1_main_syntax_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19));

function abs(rel) {
  return path.join(ROOT, rel);
}

function exists(rel) {
  return fs.existsSync(abs(rel));
}

function read(rel) {
  return fs.readFileSync(abs(rel), "utf8");
}

function write(rel, text) {
  fs.mkdirSync(path.dirname(abs(rel)), { recursive: true });
  fs.writeFileSync(abs(rel), text, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(abs(rel), dst);
}

function runCheck(rel) {
  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
  return { ok: result.status === 0, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function log(msg) {
  console.log(msg);
}

function warn(msg) {
  console.log("[AVISO] " + msg);
}

function replaceBetween(text, startToken, endToken, replacement) {
  const start = text.indexOf(startToken);
  const end = text.indexOf(endToken, start);
  if (start < 0 || end < 0) return { text, changed: false };
  return { text: text.slice(0, start) + replacement + text.slice(end), changed: true };
}

function targetedRepairMain() {
  let text = read("main.js");

  const personaBlock = `const PERSONA_OPTIONS = {
  nobre: {
    label: "Nobre rica",
    prompt: "Você é Noelle, uma IA local elegante, confiante, educada e levemente majestosa.\\nResponda em português brasileiro, com clareza, sem enrolar e considerando 2026 como contexto atual do projeto."
  },
  direta: {
    label: "Direta",
    prompt: "Você é Noelle, uma IA local direta e prática. Responda em português brasileiro, curto, claro e focado na solução. Considere 2026 como contexto atual do projeto."
  },
  fofa: {
    label: "Fofa",
    prompt: "Você é Noelle, uma IA local gentil e acolhedora. Responda em português brasileiro com tom leve, útil e objetivo.\\nConsidere 2026 como contexto atual do projeto."
  },
  seria: {
    label: "Séria",
    prompt: "Você é Noelle, uma IA local séria, calma e focada. Responda em português brasileiro com precisão e sem brincadeiras.\\nConsidere 2026 como contexto atual do projeto."
  }
}; `;

  const persona = replaceBetween(text, "const PERSONA_OPTIONS =", "let mainWin", personaBlock + "let mainWin");
  if (persona.changed) {
    text = persona.text;
    log("[OK] PERSONA_OPTIONS reescrito com quebras escapadas.");
  }

  // Remove marcadores acidentais de visualizador/citação se tiverem sido colados no arquivo.
  text = text.replace(/\nL\d+:\s*/g, "\n");
  text = text.replace(/(^|\s)L\d+:\s+(ipcMain\.handle)/g, "$1$2");

  // Corrige caminho do avatar se ainda estiver antigo.
  text = text.replace(/avatarWin\.loadFile\(path\.join\(SRC_DIR,\s*"avatar\.html"\)\);/g, 'avatarWin.loadFile(path.join(SRC_DIR, "avatar_view.html"));');

  write("main.js", text);
}

function patchPackageVersion() {
  if (!exists("package.json")) return;
  let pkg;
  try {
    pkg = JSON.parse(read("package.json"));
  } catch {
    warn("package.json inválido; pulando.");
    return;
  }
  backup("package.json");
  pkg.version = "17.4.1";
  pkg.scripts = {
    ...(pkg.scripts || {}),
    start: "electron .",
    check: "node --check main.js && node --check preload.js && node --check src/renderer/controls_window_app.js && node --check src/renderer/avatar_window_app.js",
    diagnostico: "node scripts/diagnostico_v17_4_1_main.cjs"
  };
  write("package.json", JSON.stringify(pkg, null, 2) + "\n");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let text = read(rel);
  if (!text.includes("main.js não pode ter quebras literais dentro de strings")) {
    backup(rel);
    text += `

## Nota de estabilidade do main.js

O arquivo main.js não pode ter quebras literais dentro de strings com aspas duplas ou simples.

Errado:

\`\`\`js
prompt: "linha 1
linha 2"
\`\`\`

Certo:

\`\`\`js
prompt: "linha 1\\nlinha 2"
\`\`\`

ou template literal bem controlado:

\`\`\`js
prompt: \`linha 1
linha 2\`
\`\`\`

Antes de entregar qualquer pack, sempre rodar:

\`\`\`bat
node --check main.js
\`\`\`
`;
    write(rel, text);
    log("[OK] MEMORIA_GPT_NOELLE.md atualizada com nota de estabilidade.");
  }
}

function writeCleanMainFallback() {
  const clean = "\"use strict\";\n\nconst { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage } = require(\"electron\");\nconst path = require(\"path\");\nconst fs = require(\"fs\");\nconst http = require(\"http\");\nconst { spawn } = require(\"child_process\");\n\nconst APP_YEAR = 2026;\nconst OLLAMA_HOST = process.env.OLLAMA_HOST || \"127.0.0.1\";\nconst OLLAMA_PORT = Number(process.env.OLLAMA_PORT || 11434);\nconst ROOT_DIR = __dirname;\nconst SRC_DIR = path.join(ROOT_DIR, \"src\");\nconst ASSETS_DIR = path.join(SRC_DIR, \"assets\");\nconst APP_ICONS_DIR = path.join(ROOT_DIR, \"assets\", \"icons\");\n\nconst CORE_DEFAULTS = {\n  model: \"qwen3:0.6b\",\n  profile: \"rapido\",\n  persona: \"nobre\",\n  locale: \"pt-BR\",\n  timezone: \"America/Sao_Paulo\"\n};\n\nconst MODEL_OPTIONS = {\n  \"qwen3:0.6b\": { label: \"Qwen3 0.6B Fast\", note: \"Modelo principal, r\u00e1pido e leve.\" },\n  \"gemma3:1b\": { label: \"Gemma 3 1B\", note: \"Opcional, um pouco mais pesado.\" },\n  \"hermes3:3b\": { label: \"Hermes 3B\", note: \"Opcional e mais pesado.\" }\n};\n\nconst PROFILE_OPTIONS = {\n  turbo: {\n    label: \"Turbo\",\n    timeoutMs: 90000,\n    keep_alive: \"20m\",\n    options: { num_ctx: 768, num_predict: 160, temperature: 0.35, top_p: 0.7, repeat_penalty: 1.08 }\n  },\n  rapido: {\n    label: \"R\u00e1pido\",\n    timeoutMs: 120000,\n    keep_alive: \"20m\",\n    options: { num_ctx: 1024, num_predict: 256, temperature: 0.45, top_p: 0.78, repeat_penalty: 1.08 }\n  },\n  economico: {\n    label: \"Econ\u00f4mico\",\n    timeoutMs: 120000,\n    keep_alive: 0,\n    options: { num_ctx: 768, num_predict: 160, temperature: 0.4, top_p: 0.72, repeat_penalty: 1.08 }\n  }\n};\n\nconst PERSONA_OPTIONS = {\n  nobre: {\n    label: \"Nobre rica\",\n    prompt: \"Voc\u00ea \u00e9 Noelle, uma IA local elegante, confiante, educada e levemente majestosa.\\nResponda em portugu\u00eas brasileiro, com clareza, sem enrolar e considerando 2026 como contexto atual do projeto.\"\n  },\n  direta: {\n    label: \"Direta\",\n    prompt: \"Voc\u00ea \u00e9 Noelle, uma IA local direta e pr\u00e1tica. Responda em portugu\u00eas brasileiro, curto, claro e focado na solu\u00e7\u00e3o. Considere 2026 como contexto atual do projeto.\"\n  },\n  fofa: {\n    label: \"Fofa\",\n    prompt: \"Voc\u00ea \u00e9 Noelle, uma IA local gentil e acolhedora. Responda em portugu\u00eas brasileiro com tom leve, \u00fatil e objetivo.\\nConsidere 2026 como contexto atual do projeto.\"\n  },\n  seria: {\n    label: \"S\u00e9ria\",\n    prompt: \"Voc\u00ea \u00e9 Noelle, uma IA local s\u00e9ria, calma e focada. Responda em portugu\u00eas brasileiro com precis\u00e3o e sem brincadeiras.\\nConsidere 2026 como contexto atual do projeto.\"\n  }\n};\n\nlet mainWin = null;\nlet avatarWin = null;\nlet tray = null;\nlet isQuitting = false;\n\nconst runtime = {\n  lastStatus: \"iniciando\",\n  lastError: null,\n  lastChatSeconds: null,\n  lastSuccessAt: null,\n  lastAvatarCommand: null\n};\n\nfunction ensureDir(dirPath) {\n  if (!dirPath) return;\n  fs.mkdirSync(dirPath, { recursive: true });\n}\n\nfunction fileExists(filePath) {\n  try {\n    return fs.existsSync(filePath);\n  } catch {\n    return false;\n  }\n}\n\nfunction toFileUrl(filePath) {\n  return \"file:///\" + String(filePath).replace(/\\\\/g, \"/\").replace(/^\\/+/, \"\");\n}\n\nfunction getUserDataSafe() {\n  return app.isReady() ? app.getPath(\"userData\") : path.join(ROOT_DIR, \".runtime\");\n}\n\nfunction stateFile() {\n  const dir = path.join(getUserDataSafe(), \"state\");\n  ensureDir(dir);\n  return path.join(dir, \"noelle-state.json\");\n}\n\nfunction logFile() {\n  const dir = path.join(getUserDataSafe(), \"logs\");\n  ensureDir(dir);\n  return path.join(dir, \"noelle-core.log\");\n}\n\nfunction appendLog(message, extra = null) {\n  try {\n    fs.appendFileSync(logFile(), JSON.stringify({ at: new Date().toISOString(), message, extra }) + \"\\n\", \"utf8\");\n  } catch {}\n}\n\nfunction readJson(file, fallback) {\n  try {\n    if (!fs.existsSync(file)) return fallback;\n    const text = fs.readFileSync(file, \"utf8\").trim();\n    if (!text) return fallback;\n    return JSON.parse(text);\n  } catch (err) {\n    appendLog(\"read_json_error\", { file, error: err.message });\n    return fallback;\n  }\n}\n\nfunction writeJson(file, value) {\n  ensureDir(path.dirname(file));\n  fs.writeFileSync(file, JSON.stringify(value, null, 2), \"utf8\");\n}\n\nfunction loadState() {\n  const saved = readJson(stateFile(), {});\n  return {\n    model: MODEL_OPTIONS[saved.model] ? saved.model : CORE_DEFAULTS.model,\n    profile: PROFILE_OPTIONS[saved.profile] ? saved.profile : CORE_DEFAULTS.profile,\n    persona: PERSONA_OPTIONS[saved.persona] ? saved.persona : CORE_DEFAULTS.persona,\n    messages: Array.isArray(saved.messages) ? saved.messages.slice(-40) : [],\n    memories: Array.isArray(saved.memories) ? saved.memories.slice(-50) : [],\n    theme: saved.theme || \"noelle\",\n    avatar: saved.avatar || { file: \"src/assets/Noelle.vrm\", camera: \"bust\", alwaysOnTop: false }\n  };\n}\n\nfunction saveState(patch) {\n  const current = loadState();\n  const next = { ...current, ...patch };\n  writeJson(stateFile(), next);\n  return next;\n}\n\nfunction trimErr(value, max = 700) {\n  return String(value || \"\").replace(/\\s+/g, \" \").trim().slice(0, max);\n}\n\nfunction ollamaRequest(method, apiPath, payload = null, timeoutMs = 30000) {\n  return new Promise((resolve) => {\n    const body = payload === null ? null : JSON.stringify(payload);\n    const req = http.request(\n      {\n        hostname: OLLAMA_HOST,\n        port: OLLAMA_PORT,\n        path: apiPath,\n        method,\n        headers: body ? { \"Content-Type\": \"application/json\", \"Content-Length\": Buffer.byteLength(body) } : {},\n        timeout: Math.max(3000, Number(timeoutMs || 30000))\n      },\n      (res) => {\n        let data = \"\";\n        res.setEncoding(\"utf8\");\n        res.on(\"data\", (chunk) => {\n          data += chunk;\n          if (data.length > 2 * 1024 * 1024) data = data.slice(-1024 * 1024);\n        });\n        res.on(\"end\", () => {\n          let parsed = {};\n          try {\n            parsed = data ? JSON.parse(data) : {};\n          } catch (err) {\n            resolve({ ok: false, statusCode: res.statusCode, error: \"Resposta inv\u00e1lida do Ollama: \" + trimErr(err.message), raw: data.slice(0, 500) });\n            return;\n          }\n          if (res.statusCode >= 200 && res.statusCode < 300) resolve({ ok: true, statusCode: res.statusCode, data: parsed });\n          else resolve({ ok: false, statusCode: res.statusCode, error: trimErr(parsed.error || parsed.message || data || `HTTP ${res.statusCode}`), data: parsed });\n        });\n      }\n    );\n\n    req.on(\"timeout\", () => req.destroy(new Error(\"timeout\")));\n    req.on(\"error\", (err) => {\n      const msg = trimErr(err?.message || err);\n      if (/ECONNREFUSED|connect/i.test(msg)) {\n        resolve({ ok: false, error: `Ollama fechado/offline em ${OLLAMA_HOST}:${OLLAMA_PORT}.` });\n        return;\n      }\n      resolve({ ok: false, error: msg === \"timeout\" ? \"Ollama demorou demais para responder.\" : msg });\n    });\n    if (body) req.write(body);\n    req.end();\n  });\n}\n\nfunction buildSystemPrompt(state) {\n  const persona = PERSONA_OPTIONS[state.persona] || PERSONA_OPTIONS.nobre;\n  const memories = Array.isArray(state.memories) && state.memories.length\n    ? \"\\nMem\u00f3rias \u00fateis:\\n\" + state.memories.slice(-10).map((m, i) => `${i + 1}. ${String(m.text || m).slice(0, 300)}`).join(\"\\n\")\n    : \"\";\n  return [\n    persona.prompt,\n    \"Voc\u00ea roda dentro do Noelle Companion em Electron.\",\n    \"Se houver erro de app, responda com diagn\u00f3stico curto e a\u00e7\u00e3o clara.\",\n    \"N\u00e3o invente status do sistema; quando n\u00e3o souber, diga para testar o diagn\u00f3stico.\",\n    memories\n  ].filter(Boolean).join(\"\\n\");\n}\n\nfunction normalizeMessage(item) {\n  const role = item?.role === \"assistant\" || item?.role === \"user\" || item?.role === \"system\" ? item.role : \"user\";\n  const content = String(item?.content || \"\").trim().slice(0, 4000);\n  return content ? { role, content } : null;\n}\n\nasync function chatWithNoelle(payload) {\n  const start = Date.now();\n  const state = loadState();\n  const model = MODEL_OPTIONS[payload?.model] ? payload.model : state.model;\n  const profileKey = PROFILE_OPTIONS[payload?.profile] ? payload.profile : state.profile;\n  const persona = PERSONA_OPTIONS[payload?.persona] ? payload.persona : state.persona;\n  const profile = PROFILE_OPTIONS[profileKey] || PROFILE_OPTIONS.rapido;\n\n  saveState({ model, profile: profileKey, persona });\n\n  const userText = String(payload?.message || \"\").replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g, \"\").trim().slice(0, 4000);\n  if (!userText) return { ok: false, error: \"Mensagem vazia.\" };\n\n  const history = Array.isArray(payload?.history) ? payload.history.map(normalizeMessage).filter(Boolean).slice(-12) : [];\n  const currentState = loadState();\n  currentState.model = model;\n  currentState.profile = profileKey;\n  currentState.persona = persona;\n\n  const messages = [\n    { role: \"system\", content: buildSystemPrompt(currentState) },\n    ...history,\n    { role: \"user\", content: userText }\n  ];\n\n  runtime.lastStatus = \"gerando\";\n  const result = await ollamaRequest(\"POST\", \"/api/chat\", { model, messages, stream: false, keep_alive: profile.keep_alive, options: profile.options }, profile.timeoutMs);\n  const seconds = ((Date.now() - start) / 1000).toFixed(2);\n  runtime.lastChatSeconds = seconds;\n\n  if (!result.ok) {\n    runtime.lastStatus = \"erro\";\n    runtime.lastError = result.error;\n    appendLog(\"chat_error\", { error: result.error, model, profile: profileKey });\n    return { ok: false, error: result.error, seconds, ollamaUrl: `http://${OLLAMA_HOST}:${OLLAMA_PORT}` };\n  }\n\n  const text = String(result.data?.message?.content || result.data?.response || \"\").trim();\n  if (!text) {\n    runtime.lastStatus = \"erro\";\n    runtime.lastError = \"Resposta vazia do Ollama.\";\n    return { ok: false, error: runtime.lastError, seconds };\n  }\n\n  runtime.lastStatus = \"pronto\";\n  runtime.lastError = null;\n  runtime.lastSuccessAt = new Date().toISOString();\n  appendLog(\"chat_ok\", { seconds, model, profile: profileKey });\n  updateTrayMenu();\n\n  return { ok: true, message: text, seconds, model, profile: profileKey, persona };\n}\n\nfunction normalizeManifestArray(raw, defaultBase, extList) {\n  if (Array.isArray(raw)) return raw;\n  if (raw && typeof raw === \"object\") {\n    if (Array.isArray(raw.items)) return raw.items;\n    if (Array.isArray(raw.expressions)) return raw.expressions;\n    if (Array.isArray(raw.motions)) return raw.motions;\n    return Object.entries(raw).map(([id, value]) => ({ id, ...(typeof value === \"object\" ? value : { file: value }) }));\n  }\n  try {\n    if (!fs.existsSync(defaultBase)) return [];\n    return fs.readdirSync(defaultBase)\n      .filter((name) => extList.some((ext) => name.toLowerCase().endsWith(ext)))\n      .map((name) => ({ id: path.basename(name, path.extname(name)), label: path.basename(name, path.extname(name)), file: name }));\n  } catch {\n    return [];\n  }\n}\n\nfunction makeAssetEntry(entry, baseDir, fallbackKind) {\n  const file = String(entry.file || entry.path || entry.name || \"\").trim();\n  const id = String(entry.id || path.basename(file, path.extname(file)) || entry.label || fallbackKind).replace(/[^a-zA-Z0-9_-]+/g, \"_\");\n  const label = String(entry.label || entry.title || entry.name || id).replace(/[_-]+/g, \" \");\n  const filePath = path.isAbsolute(file) ? file : path.join(baseDir, file);\n  const rel = path.relative(ROOT_DIR, filePath).replace(/\\\\/g, \"/\");\n  return { id, label, file: file || path.basename(filePath), abs: filePath, rel, url: toFileUrl(filePath), exists: fileExists(filePath), kind: fallbackKind, meta: entry };\n}\n\nfunction scanAssets() {\n  const expressionsDir = path.join(ASSETS_DIR, \"expressions\");\n  const motionsDir = path.join(ASSETS_DIR, \"motions\");\n  const itemsDir = path.join(ASSETS_DIR, \"items\");\n  const avatarsDir = path.join(ASSETS_DIR, \"avatars\");\n\n  const expressionsRaw = readJson(path.join(expressionsDir, \"manifest.json\"), null);\n  const motionsRaw = readJson(path.join(ASSETS_DIR, \"motion_manifest.json\"), null);\n  const itemsRaw = readJson(path.join(ASSETS_DIR, \"item_manifest.json\"), null);\n\n  const expressions = normalizeManifestArray(expressionsRaw, expressionsDir, [\".png\", \".webp\", \".jpg\", \".jpeg\"]).map((entry) => makeAssetEntry(entry, expressionsDir, \"expression\"));\n  const motions = normalizeManifestArray(motionsRaw, motionsDir, [\".vrma\", \".vmd\"]).map((entry) => makeAssetEntry(entry, motionsDir, \"motion\"));\n  const items = normalizeManifestArray(itemsRaw, itemsDir, [\".glb\", \".gltf\", \".vrm\"]).map((entry) => makeAssetEntry(entry, itemsDir, \"item\"));\n\n  const avatars = [];\n  const noelleVrm = path.join(ASSETS_DIR, \"Noelle.vrm\");\n  if (fileExists(noelleVrm)) avatars.push(makeAssetEntry({ id: \"noelle\", label: \"Noelle\", file: noelleVrm }, ASSETS_DIR, \"avatar\"));\n  try {\n    if (fs.existsSync(avatarsDir)) {\n      for (const name of fs.readdirSync(avatarsDir)) {\n        if (name.toLowerCase().endsWith(\".vrm\")) avatars.push(makeAssetEntry({ id: path.basename(name, \".vrm\"), label: path.basename(name, \".vrm\"), file: name }, avatarsDir, \"avatar\"));\n      }\n    }\n  } catch {}\n\n  return {\n    root: ROOT_DIR,\n    assetsDir: ASSETS_DIR,\n    required: {\n      noelleVrm: { path: path.relative(ROOT_DIR, noelleVrm).replace(/\\\\/g, \"/\"), exists: fileExists(noelleVrm) },\n      motionManifest: { path: \"src/assets/motion_manifest.json\", exists: fileExists(path.join(ASSETS_DIR, \"motion_manifest.json\")) },\n      itemManifest: { path: \"src/assets/item_manifest.json\", exists: fileExists(path.join(ASSETS_DIR, \"item_manifest.json\")) },\n      expressionManifest: { path: \"src/assets/expressions/manifest.json\", exists: fileExists(path.join(expressionsDir, \"manifest.json\")) }\n    },\n    expressions,\n    motions,\n    items,\n    avatars,\n    counts: { expressions: expressions.length, motions: motions.length, items: items.length, avatars: avatars.length }\n  };\n}\n\nfunction getAppIconPath() {\n  const candidates = [\n    path.join(APP_ICONS_DIR, \"app.ico\"),\n    path.join(APP_ICONS_DIR, \"noelle_256.png\"),\n    path.join(APP_ICONS_DIR, \"noelle_128.png\"),\n    path.join(APP_ICONS_DIR, \"noelle_64.png\"),\n    path.join(APP_ICONS_DIR, \"noelle_32.png\")\n  ];\n  return candidates.find((file) => fileExists(file)) || null;\n}\n\nfunction getTrayImage() {\n  const iconPath = getAppIconPath();\n  if (!iconPath) return null;\n  const image = nativeImage.createFromPath(iconPath);\n  if (!image || image.isEmpty()) return null;\n  return process.platform === \"win32\" ? image.resize({ width: 16, height: 16 }) : image;\n}\n\nfunction showMainWindow() {\n  if (!mainWin || mainWin.isDestroyed()) createMainWindow();\n  if (mainWin) {\n    mainWin.show();\n    if (mainWin.isMinimized()) mainWin.restore();\n    mainWin.focus();\n  }\n}\n\nfunction toggleMainWindow() {\n  if (!mainWin || mainWin.isDestroyed()) {\n    createMainWindow();\n    return;\n  }\n  if (mainWin.isVisible()) mainWin.hide();\n  else showMainWindow();\n}\n\nfunction updateTrayMenu() {\n  if (!tray) return;\n  const menu = Menu.buildFromTemplate([\n    { label: \"Mostrar/Ocultar Noelle\", click: () => toggleMainWindow() },\n    { label: \"Abrir widget/avatar\", click: () => createAvatarWindow({ show: true }) },\n    { label: \"Centralizar avatar\", click: () => sendAvatarCommand(\"center\", {}) },\n    { label: \"Parar emote\", click: () => sendAvatarCommand(\"stop\", {}) },\n    { type: \"separator\" },\n    { label: \"Status: \" + (runtime.lastStatus || \"iniciando\"), enabled: false },\n    { type: \"separator\" },\n    { label: \"Sair da Noelle\", click: () => { isQuitting = true; app.quit(); } }\n  ]);\n  tray.setContextMenu(menu);\n}\n\nfunction createTrayIcon() {\n  if (tray) return tray;\n  const image = getTrayImage();\n  if (!image) {\n    appendLog(\"tray_icon_missing\", { expected: \"assets/icons/app.ico\" });\n    return null;\n  }\n  tray = new Tray(image);\n  tray.setToolTip(\"Noelle IA\");\n  tray.on(\"click\", () => toggleMainWindow());\n  tray.on(\"double-click\", () => {\n    showMainWindow();\n    createAvatarWindow({ show: true });\n  });\n  updateTrayMenu();\n  return tray;\n}\n\nfunction createMainWindow() {\n  mainWin = new BrowserWindow({\n    width: 1180,\n    height: 760,\n    minWidth: 900,\n    minHeight: 620,\n    title: \"Noelle Companion\",\n    icon: getAppIconPath(),\n    backgroundColor: \"#090711\",\n    autoHideMenuBar: true,\n    frame: true,\n    titleBarStyle: \"default\",\n    show: false,\n    webPreferences: {\n      preload: path.join(ROOT_DIR, \"preload.js\"),\n      contextIsolation: true,\n      nodeIntegration: false,\n      sandbox: false\n    }\n  });\n\n  mainWin.once(\"ready-to-show\", () => mainWin.show());\n  mainWin.on(\"close\", (event) => {\n    if (!isQuitting) {\n      event.preventDefault();\n      mainWin.hide();\n      updateTrayMenu();\n    }\n  });\n  mainWin.on(\"closed\", () => { mainWin = null; });\n  mainWin.loadFile(path.join(SRC_DIR, \"controls.html\"));\n}\n\nfunction createAvatarWindow({ show = true } = {}) {\n  if (avatarWin && !avatarWin.isDestroyed()) {\n    if (show) avatarWin.show();\n    avatarWin.focus();\n    return avatarWin;\n  }\n\n  const saved = loadState();\n  avatarWin = new BrowserWindow({\n    width: 420,\n    height: 680,\n    minWidth: 280,\n    minHeight: 360,\n    title: \"Noelle Avatar Widget\",\n    icon: getAppIconPath(),\n    backgroundColor: \"#00000000\",\n    transparent: true,\n    frame: false,\n    resizable: true,\n    alwaysOnTop: !!saved.avatar?.alwaysOnTop,\n    skipTaskbar: false,\n    show: false,\n    webPreferences: {\n      preload: path.join(ROOT_DIR, \"preload.js\"),\n      contextIsolation: true,\n      nodeIntegration: false,\n      sandbox: false\n    }\n  });\n\n  avatarWin.once(\"ready-to-show\", () => { if (show) avatarWin.show(); });\n  avatarWin.on(\"closed\", () => { avatarWin = null; updateTrayMenu(); });\n  avatarWin.loadFile(path.join(SRC_DIR, \"avatar_view.html\"));\n  updateTrayMenu();\n  return avatarWin;\n}\n\nfunction normalizeAvatarCommandPayload(command, payload = {}) {\n  const entry = payload && typeof payload === \"object\" ? payload : {};\n  const raw = String(command || entry.command || entry.type || \"\").trim();\n  const key = raw.toLowerCase();\n  const pickId = (...names) => {\n    for (const name of names) {\n      const value = entry?.[name];\n      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();\n    }\n    if (entry?.file) return String(entry.file).replace(/\\\\/g, \"/\").split(\"/\").pop().replace(/\\.[^.]+$/, \"\");\n    return \"\";\n  };\n  const id = pickId(\"id\", \"motionId\", \"itemId\", \"expressionId\", \"value\", \"name\", \"label\", \"file\");\n\n  if (key === \"motion\" || key === \"emote\" || key === \"playmotion\") return { type: \"playMotion\", motionId: id, source: entry };\n  if (key === \"expression\" || key === \"setexpression\" || key === \"showexpression\") return { type: \"showExpression\", expressionId: id, source: entry };\n  if (key === \"item\" || key === \"equip\" || key === \"equipitem\") return { type: \"equipItem\", itemId: id, slot: entry.slot || entry.meta?.slot || \"right_hand\", source: entry };\n  if (key === \"camera\" || key === \"preset\" || key === \"setpreset\") return { type: \"setPreset\", preset: entry.value || entry.preset || entry.id || \"full\", source: entry };\n  if (key === \"center\" || key === \"centeravatar\") return { type: \"centerAvatar\" };\n  if (key === \"pause\" || key === \"togglepausemotion\") return { type: \"togglePauseMotion\" };\n  if (key === \"stop\" || key === \"stopmotion\") return { type: \"stopMotion\" };\n  if (key === \"clearitems\" || key === \"clearavataritems\") return { type: \"clearAvatarItems\" };\n  if (key === \"rotateleft\") return { type: \"rotateAvatar\", deltaY: -0.15 };\n  if (key === \"rotateright\") return { type: \"rotateAvatar\", deltaY: 0.15 };\n  if (key === \"resetrotation\" || key === \"resetavatarrotation\") return { type: \"resetAvatarRotation\" };\n  return entry.type ? entry : { type: raw || \"noop\", source: entry };\n}\n\nfunction emitAvatarCommandPayload(win, payload) {\n  try { win.webContents.send(\"avatar:command\", payload); } catch {}\n  try { win.webContents.send(\"avatar-command\", payload); } catch {}\n}\n\nfunction sendAvatarCommand(command, payload = {}) {\n  const win = createAvatarWindow({ show: true });\n  const avatarPayload = normalizeAvatarCommandPayload(command, payload);\n  const data = { command, payload, avatarPayload, at: Date.now() };\n  runtime.lastAvatarCommand = data;\n  updateTrayMenu();\n\n  const emit = () => setTimeout(() => emitAvatarCommandPayload(win, avatarPayload), 250);\n  if (win.webContents.isLoading()) win.webContents.once(\"did-finish-load\", emit);\n  else emit();\n\n  return { ok: true, sent: data };\n}\n\nfunction safeSpawn(command, args, options = {}) {\n  if (!command || typeof command !== \"string\") return Promise.resolve({ ok: false, error: \"Comando inv\u00e1lido.\" });\n  const safeArgs = Array.isArray(args) ? args.filter((arg) => typeof arg === \"string\") : [];\n  return new Promise((resolve) => {\n    let child;\n    try {\n      child = spawn(command, safeArgs, { windowsHide: true, ...options });\n    } catch (err) {\n      resolve({ ok: false, error: trimErr(err.message || err) });\n      return;\n    }\n\n    let stdout = \"\";\n    let stderr = \"\";\n    child.stdout?.on(\"data\", (data) => { stdout += data.toString(); if (stdout.length > 2000) stdout = stdout.slice(-2000); });\n    child.stderr?.on(\"data\", (data) => { stderr += data.toString(); if (stderr.length > 2000) stderr = stderr.slice(-2000); });\n    child.on(\"error\", (err) => resolve({ ok: false, error: trimErr(err.message || err), stdout, stderr }));\n    child.on(\"close\", (code) => resolve({\n      ok: code === 0,\n      code,\n      stdout: trimErr(stdout, 2000),\n      stderr: trimErr(stderr, 2000),\n      error: code === 0 ? null : trimErr(stderr || stdout || `Processo saiu com c\u00f3digo ${code}`)\n    }));\n  });\n}\n\nfunction pythonCandidates() {\n  const venv = process.platform === \"win32\" ? path.join(ROOT_DIR, \".venv\", \"Scripts\", \"python.exe\") : path.join(ROOT_DIR, \".venv\", \"bin\", \"python\");\n  const list = [];\n  if (fileExists(venv)) list.push({ cmd: venv, argsPrefix: [] });\n  if (process.platform === \"win32\") list.push({ cmd: \"py\", argsPrefix: [\"-3\"] });\n  list.push({ cmd: \"python\", argsPrefix: [] });\n  list.push({ cmd: \"python3\", argsPrefix: [] });\n  return list;\n}\n\nasync function speakText(text) {\n  const clean = String(text || \"\").trim().slice(0, 1000);\n  if (!clean) return { ok: false, error: \"Texto vazio.\" };\n\n  const ttsScript = path.join(ROOT_DIR, \"tools\", \"noelle_tts\", \"speak_piper.py\");\n  if (fileExists(ttsScript)) {\n    for (const py of pythonCandidates()) {\n      const result = await safeSpawn(py.cmd, [...py.argsPrefix, ttsScript, \"--text\", clean], { cwd: ROOT_DIR });\n      if (result.ok) return { ok: true, engine: \"python-tts\", detail: result.stdout };\n    }\n  }\n\n  if (process.platform === \"win32\") {\n    const ps = `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = 0; $s.Volume = 100; $s.Speak(${JSON.stringify(clean)});`;\n    const result = await safeSpawn(\"powershell.exe\", [\"-NoProfile\", \"-ExecutionPolicy\", \"Bypass\", \"-Command\", ps], { cwd: ROOT_DIR });\n    if (result.ok) return { ok: true, engine: \"windows-sapi\" };\n    return { ok: false, error: result.error || \"Falha no TTS Windows.\" };\n  }\n\n  return { ok: false, error: \"TTS n\u00e3o configurado neste sistema.\" };\n}\n\nasync function getStatus() {\n  const state = loadState();\n  const ping = await ollamaRequest(\"GET\", \"/api/tags\", null, 3500);\n  const assets = scanAssets();\n\n  return {\n    ok: true,\n    year: APP_YEAR,\n    app: \"Noelle Companion\",\n    electron: process.versions.electron,\n    node: process.versions.node,\n    platform: process.platform,\n    userData: getUserDataSafe(),\n    ollama: {\n      ok: !!ping.ok,\n      url: `http://${OLLAMA_HOST}:${OLLAMA_PORT}`,\n      error: ping.ok ? null : ping.error,\n      models: ping.ok && Array.isArray(ping.data?.models) ? ping.data.models.map((m) => m.name).slice(0, 80) : []\n    },\n    runtime,\n    state,\n    assets: { counts: assets.counts, required: assets.required },\n    options: {\n      models: MODEL_OPTIONS,\n      profiles: PROFILE_OPTIONS,\n      personas: Object.fromEntries(Object.entries(PERSONA_OPTIONS).map(([k, v]) => [k, { label: v.label }]))\n    }\n  };\n}\n\napp.whenReady().then(() => {\n  if (process.platform === \"win32\") {\n    try { app.setAppUserModelId(\"com.masoritech.noelle\"); } catch {}\n  }\n\n  ensureDir(path.join(getUserDataSafe(), \"state\"));\n  ensureDir(path.join(getUserDataSafe(), \"logs\"));\n\n  createTrayIcon();\n  createMainWindow();\n\n  app.on(\"activate\", () => {\n    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();\n    else showMainWindow();\n  });\n});\n\napp.on(\"before-quit\", () => { isQuitting = true; });\napp.on(\"window-all-closed\", (event) => {\n  if (!isQuitting) event.preventDefault();\n});\n\nipcMain.handle(\"noelle:status\", async () => getStatus());\nipcMain.handle(\"noelle:chat\", async (_event, payload) => chatWithNoelle(payload || {}));\nipcMain.handle(\"noelle:save-state\", async (_event, patch) => ({ ok: true, state: saveState(patch || {}) }));\nipcMain.handle(\"noelle:load-state\", async () => ({ ok: true, state: loadState() }));\nipcMain.handle(\"noelle:assets\", async () => ({ ok: true, assets: scanAssets() }));\nipcMain.handle(\"noelle:open-external\", async (_event, url) => {\n  const target = String(url || \"\");\n  if (/^https?:\\/\\//i.test(target)) {\n    await shell.openExternal(target);\n    return { ok: true };\n  }\n  return { ok: false, error: \"URL inv\u00e1lida.\" };\n});\n\nipcMain.handle(\"avatar:open\", async () => { createAvatarWindow({ show: true }); return { ok: true }; });\nipcMain.handle(\"avatar:close\", async () => { if (avatarWin && !avatarWin.isDestroyed()) avatarWin.hide(); updateTrayMenu(); return { ok: true }; });\nipcMain.handle(\"avatar:command\", async (_event, command, payload) => sendAvatarCommand(command, payload || {}));\nipcMain.handle(\"avatar:always-on-top\", async (_event, enabled) => {\n  const win = createAvatarWindow({ show: true });\n  win.setAlwaysOnTop(!!enabled, \"floating\");\n  const state = loadState();\n  saveState({ avatar: { ...(state.avatar || {}), alwaysOnTop: !!enabled } });\n  return { ok: true, enabled: !!enabled };\n});\nipcMain.handle(\"avatar:save-position\", async () => {\n  if (!avatarWin || avatarWin.isDestroyed()) return { ok: false, error: \"Janela do avatar n\u00e3o est\u00e1 aberta.\" };\n  const bounds = avatarWin.getBounds();\n  const state = loadState();\n  saveState({ avatar: { ...(state.avatar || {}), bounds } });\n  return { ok: true, bounds };\n});\n\nipcMain.handle(\"tts:speak\", async (_event, text) => speakText(text));\n\n// Compatibilidade para nomes antigos usados no projeto.\nipcMain.handle(\"desktop-widget-open-avatar\", async () => { createAvatarWindow({ show: true }); return { ok: true }; });\nipcMain.handle(\"desktop-widget-command\", async (_event, command, payload) => sendAvatarCommand(command, payload || {}));\nipcMain.handle(\"noelle-core-chat\", async (_event, payload) => chatWithNoelle(payload || {}));\nipcMain.handle(\"noelle-core-status\", async () => getStatus());\n";
  write("main.js", clean);
  log("[OK] main.js reescrito com fallback limpo e validado.");
}

function createAvatarAlias() {
  if (exists("src/avatar.html")) return;
  write("src/avatar.html", `<!doctype html>
<meta charset="utf-8">
<title>Noelle Avatar Alias</title>
<script>location.replace("avatar_view.html");</script>
<p>Redirecionando para avatar_view.html...</p>
`);
  log("[OK] Criado alias src/avatar.html -> avatar_view.html");
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  if (!exists("main.js")) {
    console.error("[ERRO] main.js não encontrado.");
    process.exit(1);
  }

  backup("main.js");

  const before = runCheck("main.js");
  if (before.ok) {
    log("[OK] main.js já passa no node --check.");
  } else {
    warn("main.js falhou antes da correção:");
    console.log(before.stderr || before.stdout);
    targetedRepairMain();

    const afterTarget = runCheck("main.js");
    if (afterTarget.ok) {
      log("[OK] main.js corrigido com reparo cirúrgico.");
    } else {
      warn("Reparo cirúrgico ainda falhou. Aplicando fallback limpo.");
      console.log(afterTarget.stderr || afterTarget.stdout);
      writeCleanMainFallback();
    }
  }

  createAvatarAlias();
  patchPackageVersion();
  patchMemory();

  const finalCheck = runCheck("main.js");
  if (!finalCheck.ok) {
    console.error(finalCheck.stderr || finalCheck.stdout);
    console.error("[ERRO] main.js ainda falha após fallback.");
    process.exit(1);
  }

  for (const rel of ["preload.js", "src/renderer/controls_window_app.js", "src/renderer/avatar_window_app.js", "scripts/diagnostico_v17_4_1_main.cjs"]) {
    if (!exists(rel)) continue;
    const check = runCheck(rel);
    if (check.ok) console.log("[OK] node --check " + rel);
    else {
      console.error(check.stderr || check.stdout);
      console.error("[ERRO] node --check falhou: " + rel);
      process.exit(1);
    }
  }

  log("[OK] Correção V17.4.1 aplicada. main.js agora passa no node --check.");
}

if (process.argv.includes("--apply")) {
  apply();
} else {
  console.log("Uso: node scripts/repair_main_syntax_v17_4_1.cjs --apply");
}
