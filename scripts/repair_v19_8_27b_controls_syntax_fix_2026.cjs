#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.27b — Controls syntax fix
  Corrige quebra causada pelo V19.8.27 em updateAssetSummary(counts = {}).
  Causa: o scanner antigo confundiu o "{}" do parâmetro padrão com o corpo da função.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.27b-controls-syntax-fix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_27b_controls_syntax_fix_" + STAMP);

const GOOD_STUB = 'function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }';

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

function findBlockEnd(code, openBraceIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openBraceIndex; i < code.length; i++) {
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
      if (depth === 0) return i + 1;
    }
  }

  return -1;
}

function findFunctionBodyOpen(code, functionName) {
  const re = new RegExp("function\\s+" + functionName + "\\s*\\(", "m");
  const m = re.exec(code);
  if (!m) return -1;

  let i = m.index;
  let paren = 0;
  let inString = null;
  let escaped = false;

  for (; i < code.length; i++) {
    const ch = code[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
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
        const rest = code.slice(i + 1);
        const bodyMatch = /^\s*\{/.exec(rest);
        if (!bodyMatch) return -1;
        return i + 1 + bodyMatch[0].lastIndexOf("{");
      }
    }
  }

  return -1;
}

function replaceFunctionByName(code, functionName, replacement) {
  const startMatch = new RegExp("function\\s+" + functionName + "\\s*\\(", "m").exec(code);
  if (!startMatch) return { code, changed: false, reason: "function not found" };

  const open = findFunctionBodyOpen(code, functionName);
  if (open < 0) return { code, changed: false, reason: "body open not found" };

  const end = findBlockEnd(code, open);
  if (end < 0) return { code, changed: false, reason: "body end not found" };

  return {
    code: code.slice(0, startMatch.index) + replacement + code.slice(end),
    changed: true,
    reason: "function replaced"
  };
}

function fixBrokenUpdateAssetSummary(code) {
  const start = code.indexOf("function updateAssetSummary");
  if (start < 0) {
    warn("updateAssetSummary não encontrada.");
    return code;
  }

  if (code.includes(GOOD_STUB) && !code.includes("updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {")) {
    ok("updateAssetSummary já está corrigida.");
    return code;
  }

  const brokenNeedle = "function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {";
  const brokenStart = code.indexOf(brokenNeedle);

  if (brokenStart >= 0) {
    const leftoverOpen = code.indexOf("}) {", brokenStart);
    const open = leftoverOpen >= 0 ? leftoverOpen + 3 : -1;
    const end = open >= 0 ? findBlockEnd(code, open) : -1;

    if (end > 0) {
      ok("updateAssetSummary quebrada encontrada e corrigida.");
      return code.slice(0, brokenStart) + GOOD_STUB + code.slice(end);
    }

    warn("Padrão quebrado encontrado, mas não consegui fechar bloco; usando fallback.");
  }

  const replaced = replaceFunctionByName(code, "updateAssetSummary", GOOD_STUB);
  if (replaced.changed) {
    ok("updateAssetSummary substituída por stub correto.");
    return replaced.code;
  }

  fail("Não consegui corrigir updateAssetSummary: " + replaced.reason);
  return code;
}

function patchOldRepairScanner() {
  const rel = "scripts/repair_v19_8_27_controls_core_split_2026.cjs";
  if (!exists(rel)) {
    warn("Repair V19.8.27 antigo não encontrado; pulando correção do scanner antigo.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (code.includes("findFunctionBodyOpen(code, functionName)")) {
    ok("Repair V19.8.27 já parece corrigido.");
    return;
  }

  // Neutraliza o risco principal para reexecuções: não tentar extrair updateAssetSummary de novo.
  code = code.replace(
    /updateAssetSummary:\s*'function updateAssetSummary\(counts = \{\}\)[\s\S]*?'\s*(,?)/,
    "updateAssetSummary: 'function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }'$1"
  );

  write(rel, code);
  ok("Repair V19.8.27 antigo ajustado para evitar novo dano em updateAssetSummary.");
}

function patchControlsWindowApp() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) {
    fail(rel + " não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = fixBrokenUpdateAssetSummary(code);

  if (!code.includes("NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX")) {
    code = code.replace("/* NOELLE_V19_8_27_CONTROLS_CORE_SPLIT */", "/* NOELLE_V19_8_27_CONTROLS_CORE_SPLIT */ /* NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX */");
    if (!code.includes("NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX")) {
      code = '/* NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX */\n' + code;
    }
  }

  write(rel, code);
  ok("controls_window_app.js corrigido.");
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
  pkg.scripts["repair:v19.8.27b-controls-syntax-fix"] = "node scripts/repair_v19_8_27b_controls_syntax_fix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.27b-controls-syntax-fix"] = "node scripts/diagnostico_v19_8_27b_controls_syntax_fix_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.27b — Controls syntax fix")) {
    md += "\n\n## V19.8.27b — Controls syntax fix\n\n- Corrige erro de sintaxe em `src/renderer/controls_window_app.js` causado pela extração de `updateAssetSummary(counts = {})` no V19.8.27.\n- A causa foi o scanner antigo confundir o `{}` do parâmetro padrão com o corpo da função.\n- `updateAssetSummary` agora fica como stub correto chamando `NoelleRendererCoreV19827.updateAssetSummary`.\n- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.27b.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.27b - Controls syntax fix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchControlsWindowApp();
  patchOldRepairScanner();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.27b terminou com problemas.");
  } else {
    ok("Reparo V19.8.27b concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.27b.");
  }
}

main();
