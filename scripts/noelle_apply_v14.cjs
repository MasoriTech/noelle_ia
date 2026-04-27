"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const packTemplates = path.join(root, "tools", "mega_pack_v14", "templates");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, "backups", `mega_pack_v14_${stamp}`);
const legacyRoot = path.join(backupRoot, "legacy_hotfixes");

function log(msg) {
  console.log(`[V14] ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  const target = path.join(root, rel);
  ensureDir(path.dirname(target));
  fs.writeFileSync(target, content, "utf8");
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

function backupPath(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const dest = path.join(backupRoot, rel);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) copyDir(src, dest);
  else copyFile(src, dest);
}

function applyTemplate(templateRel, targetRel = templateRel) {
  const template = path.join(packTemplates, templateRel);
  if (!fs.existsSync(template)) throw new Error(`Template ausente: ${templateRel}`);
  const target = path.join(root, targetRel);
  ensureDir(path.dirname(target));
  fs.copyFileSync(template, target);
  log(`Atualizado: ${targetRel}`);
}

function removeOrMoveLegacyHotfixes() {
  const candidates = [];
  const styleDir = path.join(root, "src", "styles");
  const rendererDir = path.join(root, "src", "renderer");
  const scriptsDir = path.join(root, "scripts");

  if (fs.existsSync(styleDir)) {
    for (const name of fs.readdirSync(styleDir)) {
      if (/^noelle_chat_.*\.(css)$/i.test(name)) candidates.push(path.join(styleDir, name));
    }
  }
  if (fs.existsSync(rendererDir)) {
    for (const name of fs.readdirSync(rendererDir)) {
      if (/^noelle_chat_.*\.(js|cjs)$/i.test(name)) candidates.push(path.join(rendererDir, name));
    }
  }
  if (fs.existsSync(scriptsDir)) {
    for (const name of fs.readdirSync(scriptsDir)) {
      if (/(chat|hotfix|v7|v8|v12|janela|correcao).*\.(cjs|js)$/i.test(name) && !/^noelle_(apply|doctor)_v14\.cjs$/i.test(name)) {
        candidates.push(path.join(scriptsDir, name));
      }
    }
  }

  if (!candidates.length) {
    log("Nenhuma sobra óbvia de hotfix antigo encontrada.");
    return;
  }

  ensureDir(legacyRoot);
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const rel = path.relative(root, file);
    const dest = path.join(legacyRoot, rel);
    ensureDir(path.dirname(dest));
    fs.renameSync(file, dest);
    log(`Movido para backup legado: ${rel}`);
  }
}

function ensureExpressionImagesNote() {
  const exprDir = path.join(root, "src", "assets", "expressions");
  ensureDir(exprDir);
  const existingPng = fs.existsSync(exprDir) && fs.readdirSync(exprDir).some((name) => /\.png$/i.test(name));
  if (!existingPng) {
    const note = [
      "Coloque aqui os PNGs das expressões da Noelle.",
      "Arquivos esperados pelo manifest padrão:",
      "- angry.png",
      "- sick.png",
      "- sad.png",
      "- happy.png",
      "",
      "O Mega Pack V14 não apaga nem substitui seus PNGs existentes.",
    ].join("\n");
    fs.writeFileSync(path.join(exprDir, "LEIA_ME_EXPRESSIONS.txt"), note, "utf8");
  }
}

function createReport() {
  const report = `# Relatório Mega Pack V14\n\nAplicado em: ${new Date().toLocaleString("pt-BR")}\n\n## O que foi atualizado\n\n- package.json com Electron 41.3.0 e electron-builder 26.8.1.\n- main.js com IPC estável, Ollama, estado, expressões e sandbox.\n- preload.js com noelleAPI e desktopWidget para compatibilidade.\n- src/controls.html com UI organizada e emotes por src/assets/expressions.\n- src/styles/noelle.css com layout fixo de sidebar/topbar/chat.\n- src/renderer/controls_window_app.js com Chat IA e grade de expressões.\n- requirements.txt da raiz e tools/noelle_stt/requirements.txt.\n- scripts de diagnóstico/build/verify.\n\n## Backup\n\nBackup criado em:\n\n${path.relative(root, backupRoot)}\n\n## Observações\n\n- Os PNGs de src/assets/expressions não foram apagados.\n- Sobras de hotfix antigas foram movidas para backup, não deletadas.\n- O Chat IA continua dependendo do Ollama em 127.0.0.1:11434.\n`;
  ensureDir(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs", "RELATORIO_MEGA_PACK_V14.md"), report, "utf8");
}

function main() {
  if (!exists("package.json") || !exists("main.js")) {
    console.error("ERRO: rode este script na raiz do projeto Noelle, onde ficam package.json e main.js.");
    process.exit(1);
  }
  if (!fs.existsSync(packTemplates)) {
    console.error("ERRO: pasta de templates não encontrada: " + packTemplates);
    process.exit(1);
  }

  ensureDir(backupRoot);
  [
    "package.json",
    "main.js",
    "preload.js",
    "src/controls.html",
    "src/styles/noelle.css",
    "src/renderer/controls_window_app.js",
    "src/assets/expressions/manifest.json",
    "requirements.txt",
    "tools/noelle_stt/requirements.txt",
    "scripts/build-renderers.mjs",
    "scripts/verify-renderer-bundles.js",
  ].forEach(backupPath);
  log(`Backup criado em: ${path.relative(root, backupRoot)}`);

  applyTemplate("package.json");
  applyTemplate("main.js");
  applyTemplate("preload.js");
  applyTemplate(path.join("src", "controls.html"));
  applyTemplate(path.join("src", "styles", "noelle.css"));
  applyTemplate(path.join("src", "renderer", "controls_window_app.js"));
  applyTemplate("requirements.txt");
  applyTemplate(path.join("tools", "noelle_stt", "requirements.txt"));

  ensureDir(path.join(root, "src", "assets", "expressions"));
  const manifestTarget = path.join(root, "src", "assets", "expressions", "manifest.json");
  const manifestCurrent = fs.existsSync(manifestTarget) ? read("src/assets/expressions/manifest.json") : "";
  if (!manifestCurrent.trim() || manifestCurrent.trim() === "[]") {
    applyTemplate(path.join("src", "assets", "expressions", "manifest.json"));
  } else {
    try {
      const parsed = JSON.parse(manifestCurrent);
      if (!Array.isArray(parsed) || !parsed.length) applyTemplate(path.join("src", "assets", "expressions", "manifest.json"));
      else log("Manifest de expressões preservado.");
    } catch {
      applyTemplate(path.join("src", "assets", "expressions", "manifest.json"));
    }
  }

  copyFile(path.join(root, "scripts", "build-renderers.mjs"), path.join(backupRoot, "_pack_copy_placeholder.txt"));
  // Reaplica scripts auxiliares do pack, caso o backup acima tenha pegado versões antigas.
  const scriptTemplates = [
    "scripts/build-renderers.mjs",
    "scripts/verify-renderer-bundles.js",
    "scripts/noelle_doctor_v14.cjs",
    "scripts/noelle_apply_v14.cjs",
  ];
  for (const rel of scriptTemplates) {
    const source = path.join(path.dirname(__dirname), rel);
    const fallback = path.join(root, rel);
    if (fs.existsSync(source)) copyFile(source, path.join(root, rel));
    else if (!fs.existsSync(fallback)) log(`Aviso: script auxiliar não encontrado: ${rel}`);
  }

  ensureExpressionImagesNote();
  removeOrMoveLegacyHotfixes();
  createReport();

  log("Mega Pack V14 aplicado com sucesso.");
  log("Agora rode: npm install");
  log("Depois rode: npm run doctor");
}

main();
