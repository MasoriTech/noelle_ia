#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.26 — finaliza performance do main.js
  Corrige pontos que ficaram incompletos:
  - writeJson usa writeJsonAtomic
  - ollamaRequest usa OLLAMA_HTTP_AGENT
  - loadState/saveState usam cache curto
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.26-main-perf-finish-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_26_main_perf_finish_" + STAMP);

const REQ_AGENT = 'const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs");';
const REQ_SAFE_JSON = 'const { writeJsonAtomic } = require("./src/main/performance/safe_json_v19_8_22.cjs");';
const CACHE_DECL = "let __NOELLE_V19_8_26_STATE_CACHE = null;";

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

function ensureImport(code, importLine) {
  if (code.includes(importLine)) return code;

  const markers = [
    'const { appendNoelleLog, flushNoelleLogsNow } = require("./src/main/performance/log_queue_v19_8_23.cjs");',
    'const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs");',
    'const { spawn } = require("child_process");',
    'const http = require("http");'
  ];

  for (const marker of markers) {
    if (code.includes(marker)) {
      return code.replace(marker, marker + " " + importLine);
    }
  }

  return importLine + " " + code;
}

function patchImports(code) {
  let out = code;
  if (!out.includes("ollama_http_agent_v19_8_22.cjs")) {
    out = ensureImport(out, REQ_AGENT);
    ok("Import OLLAMA_HTTP_AGENT adicionado.");
  } else {
    ok("Import OLLAMA_HTTP_AGENT já existe.");
  }

  if (!out.includes("safe_json_v19_8_22.cjs")) {
    out = ensureImport(out, REQ_SAFE_JSON);
    ok("Import writeJsonAtomic adicionado.");
  } else {
    ok("Import writeJsonAtomic já existe.");
  }

  return out;
}

function patchWriteJson(code) {
  const wanted = "function writeJson(file, value) { writeJsonAtomic(file, value); }";

  const range = findFunctionRange(code, "writeJson");
  if (!range) {
    warn("writeJson não encontrado.");
    return code;
  }

  if (range.text.includes("writeJsonAtomic(file, value)")) {
    ok("writeJson já usa writeJsonAtomic.");
    return code;
  }

  if (range.text.includes("writeFileSync")) {
    ok("writeJson antigo encontrado e substituído por escrita atômica.");
    return code.slice(0, range.start) + wanted + code.slice(range.end);
  }

  warn("writeJson existe, mas não parece usar writeFileSync. Não substituí.");
  return code;
}

function patchCacheDecl(code) {
  if (code.includes("__NOELLE_V19_8_26_STATE_CACHE")) {
    ok("Cache V19.8.26 já declarado.");
    return code;
  }

  const range = findFunctionRange(code, "writeJson");
  if (range) {
    ok("Declaração de cache V19.8.26 adicionada após writeJson.");
    return code.slice(0, range.end) + " " + CACHE_DECL + code.slice(range.end);
  }

  warn("Não achei writeJson para inserir cache; colocando perto de runtime.");
  const marker = "const runtime = {";
  if (code.includes(marker)) return code.replace(marker, CACHE_DECL + " " + marker);
  return CACHE_DECL + " " + code;
}

function patchLoadState(code) {
  const range = findFunctionRange(code, "loadState");
  if (!range) {
    warn("loadState não encontrado.");
    return code;
  }

  if (range.text.includes("__NOELLE_V19_8_26_STATE_CACHE")) {
    ok("loadState já usa cache V19.8.26.");
    return code;
  }

  const oldStart = "function loadState() { const saved = readJson(stateFile(), {}); return {";
  const newStart = "function loadState() { const now = Date.now(); const file = stateFile(); let saved; if (__NOELLE_V19_8_26_STATE_CACHE && __NOELLE_V19_8_26_STATE_CACHE.file === file && now - __NOELLE_V19_8_26_STATE_CACHE.at < 1000) { saved = __NOELLE_V19_8_26_STATE_CACHE.value; } else { saved = readJson(file, {}); __NOELLE_V19_8_26_STATE_CACHE = { file, at: now, value: saved }; } return {";

  if (range.text.includes(oldStart)) {
    ok("loadState substituído por versão com cache curto.");
    return code.slice(0, range.start) + range.text.replace(oldStart, newStart) + code.slice(range.end);
  }

  const compactRegex = /function\s+loadState\s*\(\)\s*\{\s*const\s+saved\s*=\s*readJson\(stateFile\(\),\s*\{\}\);\s*return\s*\{/;
  if (compactRegex.test(range.text)) {
    ok("loadState substituído por versão com cache curto por regex.");
    const replacement = "function loadState() { const now = Date.now(); const file = stateFile(); let saved; if (__NOELLE_V19_8_26_STATE_CACHE && __NOELLE_V19_8_26_STATE_CACHE.file === file && now - __NOELLE_V19_8_26_STATE_CACHE.at < 1000) { saved = __NOELLE_V19_8_26_STATE_CACHE.value; } else { saved = readJson(file, {}); __NOELLE_V19_8_26_STATE_CACHE = { file, at: now, value: saved }; } return {";
    return code.slice(0, range.start) + range.text.replace(compactRegex, replacement) + code.slice(range.end);
  }

  warn("loadState existe, mas formato inesperado. Cache não aplicado.");
  return code;
}

function patchSaveState(code) {
  const range = findFunctionRange(code, "saveState");
  if (!range) {
    warn("saveState não encontrado.");
    return code;
  }

  if (range.text.includes("__NOELLE_V19_8_26_STATE_CACHE = { file, at: Date.now(), value: next }")) {
    ok("saveState já atualiza cache V19.8.26.");
    return code;
  }

  const wanted = "function saveState(patch) { const current = loadState(); const next = { ...current, ...patch }; const file = stateFile(); writeJson(file, next); __NOELLE_V19_8_26_STATE_CACHE = { file, at: Date.now(), value: next }; return next; }";

  if (range.text.includes("writeJson(stateFile(), next)") || range.text.includes("const next =")) {
    ok("saveState substituído por versão que atualiza cache.");
    return code.slice(0, range.start) + wanted + code.slice(range.end);
  }

  warn("saveState existe, mas formato inesperado. Cache de gravação não aplicado.");
  return code;
}

function patchOllamaAgent(code) {
  if (code.includes("agent: OLLAMA_HTTP_AGENT")) {
    ok("ollamaRequest já usa OLLAMA_HTTP_AGENT.");
    return code;
  }

  const range = findFunctionRange(code, "ollamaRequest");
  if (!range) {
    warn("ollamaRequest não encontrado.");
    return code;
  }

  let text = range.text;

  const patterns = [
    {
      old: "{ hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: apiPath, method, headers:",
      neu: "{ hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: apiPath, method, agent: OLLAMA_HTTP_AGENT, headers:"
    },
    {
      old: "{hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: apiPath, method, headers:",
      neu: "{hostname: OLLAMA_HOST, port: OLLAMA_PORT, path: apiPath, method, agent: OLLAMA_HTTP_AGENT, headers:"
    }
  ];

  for (const p of patterns) {
    if (text.includes(p.old)) {
      ok("Ollama HTTP keep-alive agent aplicado.");
      text = text.replace(p.old, p.neu);
      return code.slice(0, range.start) + text + code.slice(range.end);
    }
  }

  const regex = /(\{\s*hostname:\s*OLLAMA_HOST,\s*port:\s*OLLAMA_PORT,\s*path:\s*apiPath,\s*method\s*,)\s*headers:/;
  if (regex.test(text)) {
    ok("Ollama HTTP keep-alive agent aplicado por regex.");
    text = text.replace(regex, "$1 agent: OLLAMA_HTTP_AGENT, headers:");
    return code.slice(0, range.start) + text + code.slice(range.end);
  }

  warn("Não achei objeto http.request no formato esperado. Agent não aplicado.");
  return code;
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
  pkg.scripts["repair:v19.8.26-main-perf-finish"] = "node scripts/repair_v19_8_26_main_perf_finish_2026.cjs";
  pkg.scripts["diagnostico:v19.8.26-main-perf-finish"] = "node scripts/diagnostico_v19_8_26_main_perf_finish_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.26 — Main performance finish")) {
    md += "\n\n## V19.8.26 — Main performance finish\n\n- Fecha pontos incompletos da performance do `main.js`.\n- `writeJson` passa a usar `writeJsonAtomic`.\n- `ollamaRequest` passa a usar `agent: OLLAMA_HTTP_AGENT`.\n- `loadState`/`saveState` recebem cache curto V19.8.26.\n- Não mexe em UI, Avatar, Chat, Room, renderer, preload ou assets.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.26.");
  }
}

function patchMainJs() {
  const rel = "main.js";
  if (!exists(rel)) {
    fail("main.js não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = patchImports(code);
  code = patchWriteJson(code);
  code = patchCacheDecl(code);
  code = patchLoadState(code);
  code = patchSaveState(code);
  code = patchOllamaAgent(code);

  write(rel, code);
  ok("main.js atualizado pelo V19.8.26.");
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.26 - Main performance finish");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [
    "src/main/performance/ollama_http_agent_v19_8_22.cjs",
    "src/main/performance/safe_json_v19_8_22.cjs"
  ].forEach((rel) => {
    if (exists(rel)) ok(rel + " existe");
    else fail(rel + " não encontrado. Copie o pack inteiro para a raiz.");
  });

  patchMainJs();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.26 terminou com problemas.");
  } else {
    ok("Reparo V19.8.26 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.26.");
  }
}

main();
