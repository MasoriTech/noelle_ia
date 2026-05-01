#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.28 — Status/Assets split
  Quebra pequena do controls_window_app.js:
  - refreshStatus vai para módulo status/assets
  - loadAssets vai para módulo status/assets
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.28-status-assets-split-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_28_status_assets_split_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_status_assets_v19_8_28.js";

const STUBS = {
  refreshStatus: 'async function refreshStatus({ quiet = false } = {}) { return window.NoelleStatusAssetsV19828?.refreshStatus?.({ appState, setGlobalStatus, setChatStatus, updateAssetSummary, showToast }, { quiet }) ?? null; }',
  loadAssets: 'async function loadAssets() { return window.NoelleStatusAssetsV19828?.loadAssets?.({ appState, renderAssets, updateAssetSummary, showToast }) ?? null; }'
};

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function fail(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok("Backup: " + rel);
}

function findFunctionRange(code, functionName) {
  const re = new RegExp("(async\\s+)?function\\s+" + functionName + "\\s*\\(", "m");
  const match = re.exec(code);
  if (!match) return null;

  const start = match.index;
  let i = code.indexOf("(", start);
  if (i < 0) return null;

  let paren = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "(") paren++;
    if (ch === ")") {
      paren--;
      if (paren === 0) {
        i++;
        break;
      }
    }
  }

  while (i < code.length && /\s/.test(code[i])) i++;
  if (code[i] !== "{") return null;

  const open = i;
  let depth = 0;
  inString = null;
  escaped = false;
  inLineComment = false;
  inBlockComment = false;

  for (let j = open; j < code.length; j++) {
    const ch = code[j];
    const next = code[j + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        j++;
      }
      continue;
    }

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      j++;
      continue;
    }

    if (ch === "/" && next === "*") {
      inBlockComment = true;
      j++;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return { start, end: j + 1, text: code.slice(start, j + 1) };
    }
  }

  return null;
}

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) {
    fail("src/controls.html não encontrado.");
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<script[^>]+noelle_status_assets_v19_8_28\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_status_assets_v19_8_28.js" defer data-noelle-status-assets-v19-8-28="true"></script>';

  if (/controls_window_app\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+controls_window_app\.js[^>]*>\s*<\/script>)/i, "\n" + tag + "$1");
    ok("controls.html: módulo status/assets inserido antes de controls_window_app.js.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: controls_window_app.js não encontrado; módulo inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: </body> não encontrado; módulo anexado ao final.");
  }

  write(rel, html);
}

function patchControlsWindowApp() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) {
    fail("src/renderer/controls_window_app.js não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);
  let changed = 0;

  for (const [name, stub] of Object.entries(STUBS)) {
    const range = findFunctionRange(code, name);
    if (!range) {
      warn("Função não encontrada para extrair: " + name);
      continue;
    }

    if (range.text.includes("NoelleStatusAssetsV19828")) {
      ok(name + " já usa módulo status/assets.");
      continue;
    }

    code = code.slice(0, range.start) + stub + code.slice(range.end);
    changed += 1;
    ok("Extraído para módulo status/assets: " + name);
  }

  if (!code.includes("NOELLE_V19_8_28_STATUS_ASSETS_SPLIT")) {
    code = code.replace('"use strict";', '"use strict"; /* NOELLE_V19_8_28_STATUS_ASSETS_SPLIT */');
    if (!code.includes("NOELLE_V19_8_28_STATUS_ASSETS_SPLIT")) {
      code = '/* NOELLE_V19_8_28_STATUS_ASSETS_SPLIT */\n' + code;
    }
  }

  write(rel, code);
  ok("controls_window_app.js atualizado. Funções extraídas: " + changed);
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return;

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    fail("package.json inválido: " + err.message);
    return;
  }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["repair:v19.8.28-status-assets-split"] = "node scripts/repair_v19_8_28_status_assets_split_2026.cjs";
  pkg.scripts["diagnostico:v19.8.28-status-assets-split"] = "node scripts/diagnostico_v19_8_28_status_assets_split_2026.cjs";
  pkg.scripts["auto:v19.8.28-status-assets-split"] = "node scripts/apply_v19_8_28_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.28 — Status/Assets split")) {
    md += "\n\n## V19.8.28 — Status/Assets split\n\n- Segunda quebra segura do `src/renderer/controls_window_app.js`.\n- Cria `src/renderer/modules/noelle_status_assets_v19_8_28.js`.\n- Move `refreshStatus` e `loadAssets` para o módulo status/assets.\n- Mantém renderização de cards/assets no arquivo original por enquanto.\n- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.28.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.28 - Status/Assets split");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  else ok(MODULE_REL + " existe");

  patchControlsHtml();
  patchControlsWindowApp();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.28 terminou com problemas.");
  } else {
    ok("Reparo V19.8.28 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.28 e teste a janela.");
  }
}

main();
