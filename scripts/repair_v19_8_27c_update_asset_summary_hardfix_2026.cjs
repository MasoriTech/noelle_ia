#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.27c — updateAssetSummary hardfix
  Corrige definitivamente o padrão:
  function updateAssetSummary(counts = {}) { ... }) {
*/

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const VERSION = "19.8.27c-update-asset-summary-hardfix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_27c_update_asset_summary_hardfix_" + STAMP);

const GOOD_STUB = 'function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }';
const MARKER = "NOELLE_V19_8_27C_DISABLED_OLD_UPDATEASSETSUMMARY";

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

function nodeCheck(rel) {
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) return { ok: true, out: "" };
  return { ok: false, out: (res.stderr || "") + (res.stdout || "") };
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
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
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

function removeDisabledOldBody(code) {
  const markerIndex = code.indexOf("/* " + MARKER + " */");
  if (markerIndex < 0) return { code, removed: false };

  const open = code.indexOf("{", markerIndex);
  if (open < 0) return { code, removed: false };

  const end = findBlockEnd(code, open);
  if (end < 0) return { code, removed: false };

  let removeStart = markerIndex;
  while (removeStart > 0 && code[removeStart - 1] !== "\n") removeStart--;

  return {
    code: code.slice(0, removeStart) + code.slice(end),
    removed: true
  };
}

function hardFixControls() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) {
    fail(rel + " não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  const beforeCheck = nodeCheck(rel);
  if (!beforeCheck.ok) {
    warn("controls_window_app.js está com erro antes do hardfix, tentando corrigir.");
  }

  const brokenRegex = /function\s+updateAssetSummary\s*\(\s*counts\s*=\s*\{\}\s*\)\s*\{\s*return\s+window\.NoelleRendererCoreV19827\?\.updateAssetSummary\?\.\(counts\);\s*\}\)\s*\{/g;

  let count = 0;
  code = code.replace(brokenRegex, () => {
    count += 1;
    return GOOD_STUB + "\n/* " + MARKER + " */ if (false) {";
  });

  if (count > 0) {
    ok("Padrão quebrado neutralizado: " + count + " ocorrência(s).");
  } else if (code.includes(GOOD_STUB)) {
    ok("Stub correto já existe; nenhum padrão quebrado exato encontrado.");
  } else {
    warn("Padrão quebrado exato não encontrado. Tentando fallback por linha.");
    const looseRegex = /function\s+updateAssetSummary[^\n]*\}\)\s*\{/g;
    code = code.replace(looseRegex, () => {
      count += 1;
      return GOOD_STUB + "\n/* " + MARKER + " */ if (false) {";
    });
    if (count > 0) ok("Fallback neutralizou updateAssetSummary quebrada.");
  }

  const removed = removeDisabledOldBody(code);
  code = removed.code;
  if (removed.removed) ok("Corpo antigo de updateAssetSummary removido após neutralização.");
  else if (code.includes(MARKER)) warn("Corpo antigo ficou desativado em if(false); sintaxe ainda será validada.");

  if (!code.includes("NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX")) {
    code = code.replace("/* NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX */", "/* NOELLE_V19_8_27B_CONTROLS_SYNTAX_FIX */ /* NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX */");
    if (!code.includes("NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX")) {
      code = '/* NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX */\n' + code;
    }
  }

  write(rel, code);

  const afterCheck = nodeCheck(rel);
  if (afterCheck.ok) {
    ok("node --check src/renderer/controls_window_app.js aprovado após hardfix.");
  } else {
    fail("node --check ainda falhou após hardfix:");
    console.log(afterCheck.out);
  }
}

function patchOldDiagnostics() {
  const rel = "scripts/diagnostico_v19_8_27b_controls_syntax_fix_2026.cjs";
  if (!exists(rel)) return;

  backup(rel);
  let code = read(rel);

  code = code.replace(
    "if (app.includes(\"updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {\")) {",
    "if (/updateAssetSummary\\s*\\([^)]*\\)\\s*\\{[^\\n]*\\}\\)\\s*\\{/.test(app)) {"
  );

  write(rel, code);
  ok("Diagnóstico V19.8.27b ajustado para padrão robusto.");
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
  pkg.scripts["repair:v19.8.27c-update-asset-summary-hardfix"] = "node scripts/repair_v19_8_27c_update_asset_summary_hardfix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.27c-update-asset-summary-hardfix"] = "node scripts/diagnostico_v19_8_27c_update_asset_summary_hardfix_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.27c — updateAssetSummary hardfix")) {
    md += "\n\n## V19.8.27c — updateAssetSummary hardfix\n\n- Corrige definitivamente o erro `function updateAssetSummary(counts = {}) ... }) {` em `controls_window_app.js`.\n- O V19.8.27b detectou o padrão, mas não removeu todos os resíduos do corpo antigo.\n- O hardfix neutraliza a linha quebrada, remove o corpo antigo quando possível e valida com `node --check`.\n- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.27c.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.27c - updateAssetSummary hardfix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  hardFixControls();
  patchOldDiagnostics();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.27c terminou com problemas.");
  } else {
    ok("Reparo V19.8.27c concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.27c.");
  }
}

main();
