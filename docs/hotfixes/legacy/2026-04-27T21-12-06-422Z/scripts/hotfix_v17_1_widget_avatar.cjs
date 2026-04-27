"use strict";

/*
  Noelle IA - Hotfix V17.1 Widget/Avatar
  Correções:
  1. main.js estava carregando src/avatar.html, mas o Git atual tem src/avatar_view.html.
  2. scripts/noelle_maintenance_v17.cjs usava shell:true com args em cp.spawn("ollama", ["serve"]),
     gerando DEP0190 no Node 24.
  3. Cria alias src/avatar.html somente como compatibilidade, sem apagar src/avatar_view.html.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const NOW = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP = path.join(ROOT, "backups", `v17_1_widget_avatar_${NOW}`);

function p(...parts) {
  return path.join(ROOT, ...parts);
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function log(msg) {
  console.log(msg);
}

function exists(file) {
  return fs.existsSync(file);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function backupFile(file) {
  if (!exists(file)) return;
  const dest = path.join(BACKUP, rel(file));
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, text) {
  backupFile(file);
  fs.writeFileSync(file, text, "utf8");
}

function patchMainJs() {
  const file = p("main.js");
  if (!exists(file)) throw new Error("main.js não encontrado.");

  let text = read(file);
  let changed = false;

  const oldExact = 'avatarWin.loadFile(path.join(SRC_DIR, "avatar.html"));';
  const newExact = 'const avatarHtmlPath = fs.existsSync(path.join(SRC_DIR, "avatar_view.html")) ? path.join(SRC_DIR, "avatar_view.html") : path.join(SRC_DIR, "avatar.html"); avatarWin.loadFile(avatarHtmlPath);';

  if (text.includes(oldExact)) {
    text = text.replace(oldExact, newExact);
    changed = true;
    log("[OK] main.js: avatar.html trocado por fallback avatar_view.html/avatar.html.");
  }

  // Caso algum patch antigo já tenha mudado o texto parcialmente.
  if (!changed && text.includes('"avatar.html"') && text.includes("createAvatarWindow")) {
    text = text.replace(/avatarWin\.loadFile\(path\.join\(SRC_DIR,\s*["']avatar\.html["']\)\);/, newExact);
    if (!text.includes('avatarWin.loadFile(path.join(SRC_DIR, "avatar.html"));')) {
      changed = true;
      log("[OK] main.js: fallback do avatar aplicado por regex.");
    }
  }

  if (!changed) {
    if (text.includes("avatar_view.html") || text.includes("avatarHtmlPath")) {
      log("[OK] main.js: já parece apontar para avatar_view.html.");
    } else {
      log("[AVISO] main.js: não encontrei o trecho avatar.html para trocar.");
    }
  } else {
    write(file, text);
  }
}

function patchMaintenanceScript() {
  const file = p("scripts", "noelle_maintenance_v17.cjs");
  if (!exists(file)) {
    log("[INFO] scripts/noelle_maintenance_v17.cjs não encontrado; pulando DEP0190.");
    return;
  }

  let text = read(file);
  let changed = false;

  const oldSnippet = 'cp.spawn("ollama", ["serve"], { cwd: ROOT, detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();';
  const newSnippet = 'cp.spawn("ollama", ["serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true }).unref();';

  if (text.includes(oldSnippet)) {
    text = text.replace(oldSnippet, newSnippet);
    changed = true;
    log("[OK] noelle_maintenance_v17.cjs: removido shell:true do spawn do Ollama.");
  }

  if (!changed) {
    const regex = /cp\.spawn\("ollama",\s*\["serve"\],\s*\{([^}]*?)shell:\s*process\.platform\s*===\s*"win32"([^}]*?)\}\)\.unref\(\);/;
    if (regex.test(text)) {
      text = text.replace(regex, 'cp.spawn("ollama", ["serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true }).unref();');
      changed = true;
      log("[OK] noelle_maintenance_v17.cjs: removido shell:true do spawn do Ollama por regex.");
    }
  }

  if (!changed) {
    log("[OK] noelle_maintenance_v17.cjs: não encontrei shell:true no spawn do Ollama, nada para mudar.");
  } else {
    write(file, text);
  }
}

function ensureAvatarAlias() {
  const view = p("src", "avatar_view.html");
  const alias = p("src", "avatar.html");

  if (!exists(view)) {
    log("[ERRO] src/avatar_view.html não existe. O widget não tem HTML real para carregar.");
    return false;
  }

  if (exists(alias)) {
    log("[OK] src/avatar.html já existe; alias não foi recriado.");
    return true;
  }

  const aliasHtml = `<!doctype html>
<meta charset="utf-8">
<title>Noelle Avatar Redirect</title>
<script>
  location.replace("avatar_view.html");
</script>
<p>Redirecionando para <a href="avatar_view.html">avatar_view.html</a>...</p>
`;
  ensureDir(path.dirname(alias));
  fs.writeFileSync(alias, aliasHtml, "utf8");
  log("[OK] Criado src/avatar.html como alias seguro para avatar_view.html.");
  return true;
}

function diag() {
  log("============================================================");
  log(" Noelle IA - Diagnóstico Widget/Avatar V17.1");
  log("============================================================");

  const checks = [
    ["main.js", p("main.js")],
    ["preload.js", p("preload.js")],
    ["src/avatar_view.html", p("src", "avatar_view.html")],
    ["src/avatar.html alias", p("src", "avatar.html")],
    ["src/renderer/avatar_window_app.js", p("src", "renderer", "avatar_window_app.js")],
    ["src/assets/Noelle.vrm", p("src", "assets", "Noelle.vrm")],
    ["src/assets/motion_manifest.json", p("src", "assets", "motion_manifest.json")],
    ["src/assets/item_manifest.json", p("src", "assets", "item_manifest.json")],
    ["src/assets/expressions/manifest.json", p("src", "assets", "expressions", "manifest.json")],
  ];

  for (const [label, file] of checks) {
    log(`${exists(file) ? "[OK]" : "[FALTA]"} ${label}`);
  }

  const main = exists(p("main.js")) ? read(p("main.js")) : "";
  if (main.includes("avatar_view.html") || main.includes("avatarHtmlPath")) {
    log("[OK] main.js carrega avatar_view.html ou usa fallback.");
  } else if (main.includes('"avatar.html"')) {
    log("[AVISO] main.js ainda aponta para avatar.html.");
  } else {
    log("[AVISO] não consegui identificar o arquivo do avatar em main.js.");
  }

  const scriptFile = p("scripts", "noelle_maintenance_v17.cjs");
  if (exists(scriptFile)) {
    const script = read(scriptFile);
    if (/shell:\s*process\.platform\s*===\s*["']win32["']/.test(script)) {
      log("[AVISO] Ainda há shell:true no spawn do Ollama; pode gerar DEP0190.");
    } else {
      log("[OK] Não encontrei shell:true problemático no spawn do Ollama.");
    }
  }

  count("src/assets/motions", /\.vrma$/i, "Motions .vrma");
  count("src/assets/expressions", /\.png$/i, "Expressions PNG");
  count("src/assets/items", /\.(glb|gltf)$/i, "Items GLB/GLTF");
}

function count(relDir, regex, label) {
  const dir = p(relDir);
  if (!exists(dir)) {
    log(`[FALTA] ${relDir}`);
    return;
  }
  const n = fs.readdirSync(dir).filter((name) => regex.test(name)).length;
  log(`[OK] ${label}: ${n}`);
}

function apply() {
  ensureDir(BACKUP);
  patchMainJs();
  patchMaintenanceScript();
  ensureAvatarAlias();
  diag();
  log("============================================================");
  log(`[OK] Hotfix V17.1 aplicado. Backup: ${rel(BACKUP)}`);
  log("Agora abra a janela Avatar/Widget de novo.");
}

const args = new Set(process.argv.slice(2));
try {
  if (args.has("--diag")) diag();
  else apply();
} catch (err) {
  console.error("[ERRO]", err.message || err);
  process.exitCode = 1;
}
