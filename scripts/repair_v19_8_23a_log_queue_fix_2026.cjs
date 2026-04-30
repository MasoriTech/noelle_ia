#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.23a-log-queue-fix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_23a_log_queue_fix_" + STAMP);

const IMPORT_LINE = 'const { appendNoelleLog, flushNoelleLogsNow } = require("./src/main/performance/log_queue_v19_8_23.cjs");';
const NEW_APPEND_LOG = 'function appendLog(message, extra = null) { appendNoelleLog(logFile(), message, extra); }';

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
  let braceIndex = code.indexOf("{", start);
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
      if (depth === 0) {
        return { start, end: i + 1, text: code.slice(start, i + 1) };
      }
    }
  }

  return null;
}

function ensureImport(code) {
  if (code.includes("log_queue_v19_8_23.cjs")) return code;

  const markers = [
    'const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs");',
    'const { spawn } = require("child_process");',
    'const path = require("path");'
  ];

  for (const marker of markers) {
    if (code.includes(marker)) {
      ok("Import do log_queue adicionado perto de: " + marker.slice(0, 48));
      return code.replace(marker, marker + " " + IMPORT_LINE);
    }
  }

  warn("Não achei ponto ideal de import. Adicionando import no topo do main.js.");
  return IMPORT_LINE + "\n" + code;
}

function patchAppendLog(code) {
  if (code.includes(NEW_APPEND_LOG)) {
    ok("appendLog já está assíncrono.");
    return code;
  }

  const range = findFunctionRange(code, "appendLog");
  if (range) {
    if (range.text.includes("appendFileSync") || range.text.includes("appendFile") || range.text.includes("JSON.stringify")) {
      ok("appendLog antigo encontrado e substituído por fila assíncrona.");
      return code.slice(0, range.start) + NEW_APPEND_LOG + code.slice(range.end);
    }

    warn("appendLog existe, mas não parece ser o logger antigo. Não substituí.");
    return code;
  }

  // Fallback para código minificado/uma-linha fora de função.
  const directPattern = /function\s+appendLog\s*\([^)]*\)\s*\{[^{}]*appendFileSync\s*\([^{}]*\)[^{}]*\}/m;
  if (directPattern.test(code)) {
    ok("appendLog antigo encontrado por fallback regex.");
    return code.replace(directPattern, NEW_APPEND_LOG);
  }

  fail("Não consegui localizar function appendLog(...).");
  return code;
}

function patchBeforeQuitFlush(code) {
  if (code.includes("flushNoelleLogsNow();")) {
    ok("flushNoelleLogsNow já referenciado.");
    return code;
  }

  const patterns = [
    {
      old: 'app.on("before-quit", () => { isQuitting = true; });',
      neu: 'app.on("before-quit", () => { isQuitting = true; try { flushNoelleLogsNow(); } catch {} });'
    },
    {
      old: "app.on('before-quit', () => { isQuitting = true; });",
      neu: "app.on('before-quit', () => { isQuitting = true; try { flushNoelleLogsNow(); } catch {} });"
    }
  ];

  for (const p of patterns) {
    if (code.includes(p.old)) {
      ok("flush de log adicionado em before-quit.");
      return code.replace(p.old, p.neu);
    }
  }

  warn("Não achei before-quit no padrão esperado. Sem problema: logs ainda flusham por timer.");
  return code;
}

function patchMainJs() {
  const rel = "main.js";
  if (!exists(rel)) {
    fail("main.js não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = ensureImport(code);
  code = patchAppendLog(code);
  code = patchBeforeQuitFlush(code);

  write(rel, code);
  ok("main.js atualizado pelo fix V19.8.23a.");
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return;

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    warn("package.json inválido: " + err.message);
    return;
  }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["repair:v19.8.23a-log-queue-fix"] = "node scripts/repair_v19_8_23a_log_queue_fix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.23a-log-queue-fix"] = "node scripts/diagnostico_v19_8_23a_log_queue_fix_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.23a — Log queue fix")) {
    md += "\n\n## V19.8.23a — Log queue fix\n\n- Corrige o V19.8.23 quando o padrão exato de `appendLog` não é encontrado.\n- Usa scanner de função com balanceamento de chaves para substituir `appendLog` de forma mais robusta.\n- Mantém `log_queue_v19_8_23.cjs` como módulo extraído.\n- Não mexe em UI, Avatar, Chat, Room ou preload.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.23a - Log queue fix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists("src/main/performance/log_queue_v19_8_23.cjs")) {
    fail("src/main/performance/log_queue_v19_8_23.cjs não encontrado. Copie o pack inteiro para a raiz.");
  } else {
    ok("src/main/performance/log_queue_v19_8_23.cjs existe");
  }

  patchMainJs();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.23a terminou com problemas.");
  } else {
    ok("Reparo V19.8.23a concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.23a.");
  }
}

main();
