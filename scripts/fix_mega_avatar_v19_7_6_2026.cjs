#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();
const APPLY = process.argv.includes("--apply") || process.argv.includes("--iniciar");
const PATCH = "V19.7.6 Avatar Clean Carousel Mega Fix 2026";

const requiredFiles = [
  "src/avatar_carousel_v19_7_6.html",
  "src/renderer/avatar_carousel_v19_7_6_app.js",
  "src/renderer/noelle_avatar_clean_tab_v19_7_6.js",
  "scripts/build_avatar_carousel_v19_7_6_2026.cjs",
  "scripts/diagnostico_mega_avatar_v19_7_6_2026.cjs"
];

function rel(p) { return path.relative(root, p).replace(/\\/g, "/"); }
function abs(p) { return path.join(root, p); }
function exists(p) { try { return fs.existsSync(abs(p)); } catch { return false; } }
function read(p) { return fs.readFileSync(abs(p), "utf8"); }
function write(p, data) { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); fs.writeFileSync(abs(p), data, "utf8"); }
function log(msg) { console.log(msg); }
function warn(msg) { console.warn("[AVISO] " + msg); }
function ok(msg) { console.log("[OK] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exit(1); }

if (!exists("package.json") || !exists("main.js")) {
  fail("Rode este script na raiz do projeto noelle_ia.");
}

for (const f of requiredFiles) {
  if (!exists(f)) fail("Arquivo do pack ausente. Copie o pack inteiro para a raiz antes de aplicar: " + f);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = abs(path.join("backups", "v19_7_6_avatar_clean_mega_2026_" + stamp));
const backupTargets = [
  "package.json",
  "preload.js",
  "main.js",
  "iniciar.bat",
  "src/launcher_view.html",
  "src/controls.html",
  "src/renderer/avatar_v19_5_panel_bootstrap.js",
  "src/renderer/avatar_lab_v19_6_app.js",
  "src/renderer/room_sync_bridge_v19_6.js",
  "src/assets/avatar_manifest.json",
  "MEMORIA_GPT_NOELLE.md"
];

function backupOnce() {
  fs.mkdirSync(backupRoot, { recursive: true });
  for (const target of backupTargets) {
    const src = abs(target);
    if (!fs.existsSync(src)) continue;
    const dst = path.join(backupRoot, target);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
  ok("Backup criado: " + rel(backupRoot));
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    let st = null;
    try { st = fs.statSync(file); } catch { continue; }
    if (st.isDirectory()) {
      if (/node_modules|release|dist|renderer_dist|backups|\.git/i.test(name)) continue;
      walk(file, out);
    } else {
      out.push(file);
    }
  }
  return out;
}

function prettyName(file) {
  return path.basename(file).replace(/\.(vrm|glb)$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (m) => m.toUpperCase());
}

function buildAvatarManifest() {
  const assetsDir = abs("src/assets");
  const files = walk(assetsDir);
  const avatars = [];
  const seen = new Set();
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (ext !== ".vrm" && ext !== ".glb") continue;
    const normalized = rel(file);
    const lower = normalized.toLowerCase();
    if (/\/motions?\//i.test(lower) || /\/items?\//i.test(lower) || /\/expressions?\//i.test(lower)) continue;
    if (ext === ".glb" && !/\/(avatars?|vrm|models?|characters?|personagens?)\//i.test(lower)) continue;
    const fileForHtml = normalized.replace(/^src\//, "");
    if (seen.has(fileForHtml)) continue;
    seen.add(fileForHtml);
    avatars.push({
      id: path.basename(file).replace(/\.(vrm|glb)$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      name: prettyName(file),
      file: fileForHtml,
      type: ext.slice(1)
    });
  }
  avatars.sort((a, b) => {
    const an = /noelle/i.test(a.name) ? 0 : /yoru/i.test(a.name) ? 1 : 2;
    const bn = /noelle/i.test(b.name) ? 0 : /yoru/i.test(b.name) ? 1 : 2;
    return an - bn || a.name.localeCompare(b.name, "pt-BR");
  });
  if (!avatars.length && exists("src/assets/Noelle.vrm")) {
    avatars.push({ id: "noelle", name: "Noelle", file: "assets/Noelle.vrm", type: "vrm" });
  }
  write("src/assets/avatar_manifest.json", JSON.stringify({ generatedAt: new Date().toISOString(), version: "19.7.6", avatars }, null, 2));
  ok("avatar_manifest.json gerado/verificado. Avatares encontrados: " + avatars.length);
  return avatars;
}

function patchPackageJson() {
  const pkgPath = abs("package.json");
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")); } catch (err) { fail("package.json inválido: " + err.message); }
  pkg.version = "19.7.6-avatar-clean-carousel-2026";
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["apply:v19.7.6"] = "node scripts/fix_mega_avatar_v19_7_6_2026.cjs --apply";
  pkg.scripts["diagnostico:v19.7.6"] = "node scripts/diagnostico_mega_avatar_v19_7_6_2026.cjs";
  pkg.scripts["build:avatar-carousel-v19.7.6"] = "node scripts/build_avatar_carousel_v19_7_6_2026.cjs";
  pkg.scripts["avatar:mega-fix"] = "npm run apply:v19.7.6 && npm run build:avatar-carousel-v19.7.6 && npm run diagnostico:v19.7.6";
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
  ok("package.json atualizado com scripts V19.7.6.");
}

function patchPreload() {
  if (!exists("preload.js")) return warn("preload.js não encontrado.");
  let text = read("preload.js");
  const cleanBlock = `// NOELLE_V19_7_6_AVATAR_CLEAN_TAB_BEGIN
(() => {
  try {
    if (globalThis.__NOELLE_V19_7_6_AVATAR_CLEAN_PRELOAD__) return;
    globalThis.__NOELLE_V19_7_6_AVATAR_CLEAN_PRELOAD__ = true;
    const inject = () => {
      try {
        const old = document.getElementById("noelle-v19-5-avatar-panel-script");
        if (old) old.remove();
        if (document.getElementById("noelle-v19-7-6-avatar-clean-tab-script")) return;
        const script = document.createElement("script");
        script.id = "noelle-v19-7-6-avatar-clean-tab-script";
        script.src = "./renderer/noelle_avatar_clean_tab_v19_7_6.js";
        script.defer = true;
        (document.head || document.documentElement).appendChild(script);
      } catch (err) {
        try { console.warn("[Noelle] Falha ao injetar Avatar limpo V19.7.6", err); } catch {}
      }
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject, { once: true });
    else inject();
  } catch (err) {
    try { console.warn("[Noelle] preload Avatar limpo V19.7.6 indisponível", err); } catch {}
  }
})();
// NOELLE_V19_7_6_AVATAR_CLEAN_TAB_END`;

  const v195 = /\/\/ NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_BEGIN[\s\S]*?\/\/ NOELLE_V19_5_AVATAR_REAL_VRM_PRELOAD_END/g;
  if (v195.test(text)) text = text.replace(v195, cleanBlock);
  else if (!text.includes("NOELLE_V19_7_6_AVATAR_CLEAN_TAB_BEGIN")) text += "\n" + cleanBlock + "\n";

  const existingClean = /\/\/ NOELLE_V19_7_6_AVATAR_CLEAN_TAB_BEGIN[\s\S]*?\/\/ NOELLE_V19_7_6_AVATAR_CLEAN_TAB_END/g;
  const matches = text.match(existingClean) || [];
  if (matches.length > 1) {
    text = text.replace(existingClean, "");
    text += "\n" + cleanBlock + "\n";
  }
  write("preload.js", text);
  ok("preload.js atualizado para injetar somente a aba Avatar limpa.");
}

function patchLauncherHtml() {
  const candidates = ["src/launcher_view.html", "src/controls.html"];
  const tag = `<script id="noelle-v19-7-6-avatar-clean-tab-direct" src="./renderer/noelle_avatar_clean_tab_v19_7_6.js" defer></script>`;
  for (const file of candidates) {
    if (!exists(file)) continue;
    let text = read(file);
    if (text.includes("noelle-v19-7-6-avatar-clean-tab-direct") || text.includes("noelle_avatar_clean_tab_v19_7_6.js")) {
      ok(file + " já possui injeção limpa ou preload fará a injeção.");
      continue;
    }
    if (/<\/body>/i.test(text)) text = text.replace(/<\/body>/i, tag + "\n</body>");
    else text += "\n" + tag + "\n";
    write(file, text);
    ok(file + " recebeu fallback de injeção da aba Avatar limpa.");
  }
}

function patchOldAvatarPanelStub() {
  const stub = `(() => {
  "use strict";
  if (window.__NOELLE_V19_5_AVATAR_PANEL_STUBBED_BY_V1976__) return;
  window.__NOELLE_V19_5_AVATAR_PANEL_STUBBED_BY_V1976__ = true;
  const inject = () => {
    try {
      if (document.getElementById("noelle-v19-7-6-avatar-clean-tab-script")) return;
      const script = document.createElement("script");
      script.id = "noelle-v19-7-6-avatar-clean-tab-script";
      script.src = "./renderer/noelle_avatar_clean_tab_v19_7_6.js";
      script.defer = true;
      (document.head || document.documentElement).appendChild(script);
    } catch (err) {
      try { console.warn("[Noelle] Stub V19.5 -> V19.7.6 falhou", err); } catch {}
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject, { once: true });
  else inject();
})();
`;
  write("src/renderer/avatar_v19_5_panel_bootstrap.js", stub);
  ok("avatar_v19_5_panel_bootstrap.js convertido em stub seguro para a aba limpa.");
}

function patchAvatarLabTopLevelAwait() {
  const file = "src/renderer/avatar_lab_v19_6_app.js";
  if (!exists(file)) return;
  let text = read(file);
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/line \+ "\n"/g, "line + \\\"\\\\n\\\"");
  text = text.replace(/line \+ "\s*\n\s*"/g, "line + \\\"\\\\n\\\"");
  if (/^\s*await\s+loadMotionManifest\(\);\s*\n\s*await\s+loadAvatar\(/m.test(text) && !/bootAvatarLabV196\s*\(/.test(text)) {
    text = text.replace(
      /^\s*await\s+loadMotionManifest\(\);\s*\n\s*await\s+loadAvatar\(([^\n;]+)\);?/m,
      `async function bootAvatarLabV196() {\n  await loadMotionManifest();\n  await loadAvatar($1);\n}\n\nvoid bootAvatarLabV196().catch((err) => {\n  console.error("[Noelle Avatar Preview] Falha no boot", err);\n  try { log("Falha no boot: " + (err?.message || err)); } catch {}\n});`
    );
    ok("Top-level await antigo corrigido no Avatar Lab V19.6.");
  }
  write(file, text);
}

function patchMainWindowSize() {
  if (!exists("main.js")) return;
  let text = read("main.js");
  const before = text;
  text = text.replace(/width:\s*1180/g, "width: 1460");
  text = text.replace(/height:\s*760/g, "height: 900");
  text = text.replace(/minWidth:\s*900/g, "minWidth: 1120");
  text = text.replace(/minHeight:\s*620/g, "minHeight: 720");
  if (text !== before) {
    write("main.js", text);
    ok("main.js ajustado para janela maior quando os padrões antigos existiam.");
  } else {
    ok("main.js preservado; não encontrei padrões antigos de tamanho para trocar.");
  }
}

function patchMemory() {
  const file = "MEMORIA_GPT_NOELLE.md";
  if (!exists(file)) return;
  let text = read(file);
  if (!text.includes("V19.7.6 Avatar Clean Carousel")) {
    text += `\n\n---\n\n## V19.7.6 Avatar Clean Carousel\n\nRegra aplicada: a aba Avatar deve ser um seletor visual limpo de personagens VRM/GLB, com avatar grande, setas embaixo e opções à direita. Não mostrar BroadcastChannel, localStorage, Sincronizar Room ou painel técnico V19.5 na interface principal. Room / Quarto, Widget Mode e Preview / Teste ficam separados. Todo pack futuro deve incluir iniciar.bat atualizado.\n`;
    write(file, text);
    ok("MEMORIA_GPT_NOELLE.md atualizado com regra V19.7.6.");
  } else ok("MEMORIA_GPT_NOELLE.md já contém regra V19.7.6.");
}

function runNodeCheck(file) {
  try {
    cp.execFileSync(process.execPath, ["--check", file], { cwd: root, stdio: "pipe" });
    ok("node --check " + file);
    return true;
  } catch (err) {
    console.error(String(err.stdout || "") + String(err.stderr || ""));
    fail("node --check falhou: " + file);
  }
}

function main() {
  log("============================================================");
  log(" Noelle " + PATCH);
  log("============================================================");
  if (!APPLY) {
    warn("Modo simulação. Use --apply para aplicar.");
    return;
  }
  backupOnce();
  buildAvatarManifest();
  patchPackageJson();
  patchPreload();
  patchLauncherHtml();
  patchOldAvatarPanelStub();
  patchAvatarLabTopLevelAwait();
  patchMainWindowSize();
  patchMemory();

  runNodeCheck("scripts/fix_mega_avatar_v19_7_6_2026.cjs");
  runNodeCheck("scripts/diagnostico_mega_avatar_v19_7_6_2026.cjs");
  runNodeCheck("scripts/build_avatar_carousel_v19_7_6_2026.cjs");
  runNodeCheck("src/renderer/noelle_avatar_clean_tab_v19_7_6.js");
  if (exists("preload.js")) runNodeCheck("preload.js");

  ok("Mega correção V19.7.6 aplicada.");
  log("Próximo passo: npm run build:avatar-carousel-v19.7.6 && npm run diagnostico:v19.7.6");
}

main();
