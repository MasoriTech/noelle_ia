#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.27 — Controls core split
  Primeira quebra segura do src/renderer/controls_window_app.js.
  Move helpers simples para src/renderer/modules/noelle_renderer_core_v19_8_27.js
  e deixa stubs compatíveis no arquivo original.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.27-controls-core-split-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_27_controls_core_split_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_renderer_core_v19_8_27.js";

const STUBS = {
  nowTime: 'function nowTime() { return window.NoelleRendererCoreV19827 ? window.NoelleRendererCoreV19827.nowTime() : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); }',
  showToast: 'function showToast(text) { return window.NoelleRendererCoreV19827?.showToast?.(text); }',
  escapeText: 'function escapeText(value) { if (window.NoelleRendererCoreV19827?.escapeText) return window.NoelleRendererCoreV19827.escapeText(value); const div = document.createElement("div"); div.textContent = String(value ?? ""); return div.innerHTML; }',
  selectHasValue: 'function selectHasValue(select, value) { return window.NoelleRendererCoreV19827?.selectHasValue ? window.NoelleRendererCoreV19827.selectHasValue(select, value) : (!!select && Array.from(select.options || []).some((opt) => opt.value === value)); }',
  setGlobalStatus: 'function setGlobalStatus(text, type = "warn") { return window.NoelleRendererCoreV19827?.setGlobalStatus?.(text, type); }',
  setChatStatus: 'function setChatStatus(text, detail = "") { return window.NoelleRendererCoreV19827?.setChatStatus?.(text, detail); }',
  autosizeTextarea: 'function autosizeTextarea(textarea) { return window.NoelleRendererCoreV19827?.autosizeTextarea?.(textarea); }',
  scrollChatToBottom: 'function scrollChatToBottom() { return window.NoelleRendererCoreV19827?.scrollChatToBottom?.(); }',
  applyTheme: 'function applyTheme(theme) { return window.NoelleRendererCoreV19827?.applyTheme?.(appState, theme); }',
  updateAssetSummary: 'function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }'};

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
  const re = new RegExp("function\\s+" + functionName + "\\s*\\([^)]*\\)\\s*\\{", "m");
  const match = re.exec(code);
  if (!match) return null;

  const start = match.index;
  const braceIndex = code.indexOf("{", start);
  if (braceIndex < 0) return null;

  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = braceIndex; i < code.length; i++) {
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

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return { start, end: i + 1, text: code.slice(start, i + 1) };
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

  html = html.replace(/\s*<script[^>]+noelle_renderer_core_v19_8_27\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_renderer_core_v19_8_27.js" defer data-noelle-core-v19-8-27="true"></script>';

  if (/controls_window_app\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+controls_window_app\.js[^>]*>\s*<\/script>)/i, "\n" + tag + "$1");
    ok("controls.html: módulo core inserido antes de controls_window_app.js.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: controls_window_app.js não encontrado; módulo core inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: </body> não encontrado; módulo core anexado ao final.");
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

    if (range.text.includes("NoelleRendererCoreV19827")) {
      ok(name + " já usa módulo core.");
      continue;
    }

    code = code.slice(0, range.start) + stub + code.slice(range.end);
    changed += 1;
    ok("Extraído para módulo core: " + name);
  }

  if (!code.includes("NOELLE_V19_8_27_CONTROLS_CORE_SPLIT")) {
    code = code.replace('"use strict";', '"use strict"; /* NOELLE_V19_8_27_CONTROLS_CORE_SPLIT */');
  }

  write(rel, code);
  ok("controls_window_app.js atualizado. Funções extraídas: " + changed);
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) {
    warn("package.json não encontrado.");
    return;
  }

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
  pkg.scripts["repair:v19.8.27-controls-core-split"] = "node scripts/repair_v19_8_27_controls_core_split_2026.cjs";
  pkg.scripts["diagnostico:v19.8.27-controls-core-split"] = "node scripts/diagnostico_v19_8_27_controls_core_split_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.27 — Controls core split")) {
    md += "\n\n## V19.8.27 — Controls core split\n\n- Primeira quebra segura do `src/renderer/controls_window_app.js`.\n- Cria `src/renderer/modules/noelle_renderer_core_v19_8_27.js`.\n- Move helpers simples de UI/DOM/status/tema para o módulo core.\n- `controls_window_app.js` mantém stubs compatíveis chamando o módulo, reduzindo acoplamento sem reescrever a janela.\n- Não mexe no Avatar renderer, Chat, Room, preload, main ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.27.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.27 - Controls core split");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) {
    fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  } else {
    ok(MODULE_REL + " existe");
  }

  patchControlsHtml();
  patchControlsWindowApp();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.27 terminou com problemas.");
  } else {
    ok("Reparo V19.8.27 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.27 e teste a janela.");
  }
}

main();
