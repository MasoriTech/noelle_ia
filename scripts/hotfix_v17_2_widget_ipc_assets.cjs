"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, "backups", "v17_2_widget_ipc_" + stamp());

function stamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error("[ERRO] " + msg);
  process.exitCode = 1;
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function write(rel, text) {
  const abs = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, "utf8");
}

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function backupAndWrite(rel, text) {
  backup(rel);
  write(rel, text);
  log("[OK] Atualizado: " + rel);
}

function replaceOrWarn(label, text, search, replacement) {
  if (!text.includes(search)) {
    log("[AVISO] Trecho nao encontrado: " + label);
    return text;
  }
  return text.replace(search, replacement);
}

function patchMain() {
  const rel = "main.js";
  if (!exists(rel)) return fail("main.js nao encontrado.");
  let text = read(rel);

  text = text.replace(/avatarWin\.loadFile\(path\.join\(SRC_DIR,\s*"avatar\.html"\)\);/g,
    'avatarWin.loadFile(path.join(SRC_DIR, "avatar_view.html"));');

  const replacement =
`function avatarPayloadFromCommand(command, payload = {}) {
  const entry = payload && typeof payload === "object" ? payload : {};
  const raw = String(command || entry.command || entry.type || "").trim();
  const key = raw.toLowerCase();
  const pickId = (...names) => {
    for (const name of names) {
      const value = entry?.[name];
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return "";
  };
  const id = pickId("id", "motionId", "itemId", "expressionId", "value", "file", "label", "name");

  if (key === "motion" || key === "playmotion" || key === "emote") {
    return { type: "playMotion", motionId: id, source: entry };
  }
  if (key === "item" || key === "equipitem" || key === "equip") {
    return { type: "equipItem", itemId: pickId("itemId", "id", "value", "file", "label"), slot: entry.slot || entry.meta?.slot || "hand_r", source: entry };
  }
  if (key === "expression" || key === "setexpression" || key === "showexpression") {
    return { type: "showExpression", expressionId: pickId("expressionId", "id", "value", "file", "label"), source: entry };
  }
  if (key === "camera" || key === "setpreset") {
    return { type: "setPreset", preset: entry.value || entry.preset || entry.id || "bust", source: entry };
  }
  if (key === "center" || key === "centeravatar") return { type: "centerAvatar" };
  if (key === "pause" || key === "togglepausemotion") return { type: "togglePauseMotion" };
  if (key === "stop" || key === "stopmotion") return { type: "stopMotion" };
  if (key === "clearitems" || key === "clearavataritems") return { type: "clearAvatarItems" };
  if (key === "rotateleft") return { type: "rotateAvatar", deltaY: -0.15 };
  if (key === "rotateright") return { type: "rotateAvatar", deltaY: 0.15 };
  if (key === "resetrotation" || key === "resetavatarrotation") return { type: "resetAvatarRotation" };
  return entry.type ? entry : { type: raw || "noop", source: entry };
}
function emitAvatarPayload(win, payload) {
  win.webContents.send("avatar:command", payload);
  win.webContents.send("avatar-command", payload);
}
function sendAvatarCommand(command, payload = {}) {
  const win = createAvatarWindow({ show: true });
  const avatarPayload = avatarPayloadFromCommand(command, payload);
  const data = { command, payload, avatarPayload, at: Date.now() };
  runtime.lastAvatarCommand = data;
  const emit = () => emitAvatarPayload(win, avatarPayload);
  if (win.webContents.isLoading()) {
    win.webContents.once("did-finish-load", emit);
  } else {
    emit();
  }
  return { ok: true, sent: data };
}
function safeSpawn`;

  const pattern = /function sendAvatarCommand\(command, payload = \{\}\) \{[\s\S]*?\} function safeSpawn/;
  if (pattern.test(text)) {
    text = text.replace(pattern, replacement);
  } else if (!text.includes("function avatarPayloadFromCommand")) {
    log("[AVISO] Nao consegui substituir sendAvatarCommand automaticamente.");
  } else {
    log("[OK] sendAvatarCommand ja parecia corrigido.");
  }

  backupAndWrite(rel, text);
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) return fail("preload.js nao encontrado.");
  let text = read(rel);

  if (text.includes('ipcRenderer.on("avatar:command", listener); return () => ipcRenderer.removeListener("avatar:command", listener);')) {
    text = text.replace(
      'ipcRenderer.on("avatar:command", listener); return () => ipcRenderer.removeListener("avatar:command", listener);',
      'ipcRenderer.on("avatar:command", listener); ipcRenderer.on("avatar-command", listener); return () => { ipcRenderer.removeListener("avatar:command", listener); ipcRenderer.removeListener("avatar-command", listener); };'
    );
  }

  backupAndWrite(rel, text);
}

function patchAvatarWindowApp() {
  const rel = "src/renderer/avatar_window_app.js";
  if (!exists(rel)) return fail("src/renderer/avatar_window_app.js nao encontrado.");
  let text = read(rel);

  text = replaceOrWarn(
    "manifest expressions com id",
    text,
    'mapped.push({ file: assetUrl, label: item.label || item.file });',
    'mapped.push({ id: item.id || String(item.file || "").replace(/\\.[^.]+$/, ""), file: assetUrl, label: item.label || item.file });'
  );

  if (!text.includes("function showExpressionById")) {
    const fn =
`function showExpressionById(expressionId) {
  if (!expressionDefs.length) return;
  const key = String(expressionId || "").toLowerCase();
  const chosen = expressionDefs.find((item) => {
    const haystack = [item.id, item.label, item.file].map((value) => String(value || "").toLowerCase()).join(" ");
    return key && haystack.includes(key);
  }) || expressionDefs[0];
  const overlay = byId("expressionOverlay");
  const image = byId("expressionImage");
  const badge = byId("expressionBadge");
  if (!overlay || !image || !badge || !chosen) return;
  image.src = chosen.file;
  badge.textContent = chosen.label || chosen.id || "Expressão";
  overlay.classList.add("show");
  badge.classList.add("show");
  clearTimeout(expressionHideTimer);
  expressionHideTimer = setTimeout(() => hideExpression(), 8500);
  setStatus("Expressão: " + (chosen.label || chosen.id || "ativa"));
}
`;
    if (text.includes("function startExpressionLoop()")) {
      text = text.replace("function startExpressionLoop()", fn + "function startExpressionLoop()");
    } else {
      log("[AVISO] Nao encontrei startExpressionLoop para inserir showExpressionById.");
    }
  }

  if (!text.includes('case "showExpression":')) {
    text = replaceOrWarn(
      "case showExpression",
      text,
      'case "playMotion": await playMotion(loader, payload.motionId); break;',
      'case "playMotion": await playMotion(loader, payload.motionId); break; case "showExpression": case "setExpression": showExpressionById(payload.expressionId || payload.id || payload.label || payload.file); break;'
    );
  }

  backupAndWrite(rel, text);
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return fail("package.json nao encontrado.");
  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    return fail("package.json invalido: " + err.message);
  }

  pkg.version = "17.2.0";
  pkg.scripts = {
    start: pkg.scripts?.start || "electron .",
    diagnostico: "node scripts/diagnostico_v17_2_widget_avatar.cjs",
    doctor: "node scripts/diagnostico_v17_2_widget_avatar.cjs",
    check: "node scripts/diagnostico_v17_2_widget_avatar.cjs --ci",
    ...(pkg.scripts?.["dist:win"] ? { "dist:win": pkg.scripts["dist:win"] } : { "dist:win": "electron-builder --win nsis portable" })
  };

  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    three: "0.184.0",
    "@pixiv/three-vrm": "3.5.2",
    "@pixiv/three-vrm-animation": "3.5.2"
  };
  pkg.devDependencies = {
    ...(pkg.devDependencies || {}),
    electron: "41.3.0",
    "electron-builder": "26.8.1"
  };

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json atualizado para V17.2 e dependencias fixadas.");
}

function patchMaintenanceSpawnWarning() {
  const files = [
    "scripts/noelle_maintenance_v17.cjs",
    "scripts/bootstrap_v17.cjs",
    "scripts/bootstrap_v16_1.cjs"
  ];
  for (const rel of files) {
    if (!exists(rel)) continue;
    let text = read(rel);
    const before = text;
    text = text.replace(/,\s*shell:\s*process\.platform\s*===\s*"win32"/g, "");
    text = text.replace(/shell:\s*process\.platform\s*===\s*"win32"\s*,?/g, "");
    if (text !== before) {
      backupAndWrite(rel, text);
      log("[OK] Removido shell:true perigoso em " + rel);
    }
  }
}

function createAvatarHtmlAlias() {
  const rel = "src/avatar.html";
  if (exists(rel)) return;
  const alias = `<!doctype html>
<meta charset="utf-8">
<title>Noelle Avatar Alias</title>
<script>
  location.replace("avatar_view.html");
</script>
<p>Redirecionando para avatar_view.html...</p>
`;
  write(rel, alias);
  log("[OK] Criado alias seguro: src/avatar.html -> avatar_view.html");
}

function createOrUpdateGitignoreSmallFix() {
  const rel = ".gitignore";
  const lines = [
    "node_modules/",
    "release/",
    "dist/",
    "build/",
    "out/",
    "logs/",
    "backups/",
    ".venv/",
    "venv/",
    "__pycache__/",
    "*.pyc",
    "*.log",
    "*.zip",
    "*.rar",
    "*.7z",
    ".DS_Store",
    "Thumbs.db",
    ".noelle_*bootstrap*.json",
    ".noelle_*state*.json",
    "!src/assets/",
    "!src/assets/Noelle.vrm",
    "!src/assets/avatars/",
    "!src/assets/motions/",
    "!src/assets/expressions/",
    "!src/assets/items/",
    "!src/assets/motion_manifest.json",
    "!src/assets/item_manifest.json",
    "!src/assets/expressions/manifest.json"
  ].join("\n") + "\n";
  backupAndWrite(rel, lines);
}

function runNodeCheck(rel) {
  if (!exists(rel)) return true;
  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    fail("node --check falhou em " + rel);
    return false;
  }
  log("[OK] node --check " + rel);
  return true;
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup: " + BACKUP_ROOT);

  patchMain();
  patchPreload();
  patchAvatarWindowApp();
  patchPackageJson();
  patchMaintenanceSpawnWarning();
  createAvatarHtmlAlias();
  createOrUpdateGitignoreSmallFix();

  runNodeCheck("main.js");
  runNodeCheck("preload.js");
  runNodeCheck("src/renderer/avatar_window_app.js");
  runNodeCheck("src/renderer/controls_window_app.js");
  runNodeCheck("scripts/diagnostico_v17_2_widget_avatar.cjs");

  log("");
  log("[OK] Hotfix V17.2 aplicado.");
  log("[INFO] Feche e abra a Noelle. Teste: abrir widget, tocar motion, aplicar expression e equipar item.");
}

if (process.argv.includes("--apply")) {
  apply();
} else {
  log("Uso: node scripts/hotfix_v17_2_widget_ipc_assets.cjs --apply");
}
