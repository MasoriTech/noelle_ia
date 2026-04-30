#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.22-main-perf-modular-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_22_main_perf_modular_" + STAMP);

const REQ_AGENT = 'const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs");';
const REQ_SAFE_JSON = 'const { writeJsonAtomic } = require("./src/main/performance/safe_json_v19_8_22.cjs");';
const STATE_CACHE_DECL = 'let __NOELLE_V19_8_22_STATE_CACHE = null;';

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

function patchMainJs() {
  const rel = "main.js";
  if (!exists(rel)) {
    fail("main.js não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (!code.includes("ollama_http_agent_v19_8_22.cjs")) {
    const marker = 'const { spawn } = require("child_process");';
    if (code.includes(marker)) {
      code = code.replace(marker, marker + " " + REQ_AGENT + " " + REQ_SAFE_JSON);
      ok("main.js: imports modulares de performance adicionados.");
    } else {
      fail("main.js: não encontrei o ponto seguro para adicionar imports.");
      return;
    }
  } else {
    ok("main.js: imports V19.8.22 já presentes.");
  }

  // Add HTTP keep-alive agent to the Ollama http.request options.
  if (!code.includes("agent: OLLAMA_HTTP_AGENT")) {
    const before = "method, headers:";
    if (code.includes(before)) {
      code = code.replace(before, "method, agent: OLLAMA_HTTP_AGENT, headers:");
      ok("main.js: keep-alive agent adicionado ao ollamaRequest.");
    } else {
      warn("main.js: não achei padrão exato de http.request; keep-alive não foi injetado.");
    }
  } else {
    ok("main.js: keep-alive agent já presente.");
  }

  // Replace fragile direct JSON write with atomic helper.
  const writeJsonOld = /function writeJson\(file, value\) \{ ensureDir\(path\.dirname\(file\)\); fs\.writeFileSync\(file, JSON\.stringify\(value, null, 2\), "utf8"\); \}/;
  if (writeJsonOld.test(code)) {
    code = code.replace(writeJsonOld, "function writeJson(file, value) { writeJsonAtomic(file, value); }");
    ok("main.js: writeJson trocado por escrita atômica.");
  } else if (code.includes("function writeJson(file, value) { writeJsonAtomic(file, value); }")) {
    ok("main.js: writeJson atômico já presente.");
  } else {
    warn("main.js: não achei writeJson no formato esperado; escrita atômica não foi aplicada.");
  }

  // Add small state cache declaration.
  if (!code.includes(STATE_CACHE_DECL)) {
    const after = "function writeJson(file, value) { writeJsonAtomic(file, value); }";
    if (code.includes(after)) {
      code = code.replace(after, after + " " + STATE_CACHE_DECL);
      ok("main.js: cache curto de estado declarado.");
    } else {
      warn("main.js: não consegui declarar cache de estado no ponto ideal.");
    }
  } else {
    ok("main.js: cache de estado já declarado.");
  }

  // Optimize loadState: avoid repeated disk reads during burst of IPC calls.
  const loadStart = "function loadState() { const saved = readJson(stateFile(), {}); return {";
  const loadReplacement = "function loadState() { const now = Date.now(); const file = stateFile(); let saved; if (__NOELLE_V19_8_22_STATE_CACHE && __NOELLE_V19_8_22_STATE_CACHE.file === file && now - __NOELLE_V19_8_22_STATE_CACHE.at < 1000) { saved = __NOELLE_V19_8_22_STATE_CACHE.value; } else { saved = readJson(file, {}); __NOELLE_V19_8_22_STATE_CACHE = { file, at: now, value: saved }; } return {";
  if (code.includes(loadStart)) {
    code = code.replace(loadStart, loadReplacement);
    ok("main.js: loadState com cache curto aplicado.");
  } else if (code.includes("__NOELLE_V19_8_22_STATE_CACHE") && code.includes("now - __NOELLE_V19_8_22_STATE_CACHE.at < 1000")) {
    ok("main.js: loadState cache já aplicado.");
  } else {
    warn("main.js: não achei loadState no formato esperado; cache de leitura não foi aplicado.");
  }

  // Optimize saveState: update cache after atomic write.
  const saveOld = "function saveState(patch) { const current = loadState(); const next = { ...current, ...patch }; writeJson(stateFile(), next); return next; }";
  const saveNew = "function saveState(patch) { const current = loadState(); const next = { ...current, ...patch }; const file = stateFile(); writeJson(file, next); __NOELLE_V19_8_22_STATE_CACHE = { file, at: Date.now(), value: next }; return next; }";
  if (code.includes(saveOld)) {
    code = code.replace(saveOld, saveNew);
    ok("main.js: saveState atualiza cache após gravação.");
  } else if (code.includes("__NOELLE_V19_8_22_STATE_CACHE = { file, at: Date.now(), value: next }")) {
    ok("main.js: saveState cache já aplicado.");
  } else {
    warn("main.js: não achei saveState no formato esperado; cache de gravação não foi aplicado.");
  }

  write(rel, code);
  ok("main.js atualizado.");
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
  pkg.scripts["repair:v19.8.22-main-perf"] = "node scripts/repair_v19_8_22_main_perf_modular_2026.cjs";
  pkg.scripts["diagnostico:v19.8.22-main-perf"] = "node scripts/diagnostico_v19_8_22_main_perf_modular_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.22 — Main performance modular")) {
    md += "\n\n## V19.8.22 — Main performance modular\n\n- Primeira fase de modularização segura do `main.js`.\n- Adiciona módulos `src/main/performance/ollama_http_agent_v19_8_22.cjs` e `safe_json_v19_8_22.cjs`.\n- `ollamaRequest` passa a usar HTTP keep-alive para reduzir overhead em chamadas locais ao Ollama.\n- `writeJson` passa a usar escrita atômica para reduzir risco de corromper estado.\n- `loadState`/`saveState` recebem cache curto de 1 segundo para reduzir leituras repetidas de disco.\n- Não mexe em UI, Avatar, Room, Chat ou renderer.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.22.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.22 - Main performance modular");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [
    "src/main/performance/ollama_http_agent_v19_8_22.cjs",
    "src/main/performance/safe_json_v19_8_22.cjs",
    "iniciar.bat"
  ].forEach((rel) => {
    if (exists(rel)) ok(rel + " existe");
    else fail(rel + " não encontrado. Copie o pack inteiro para a raiz.");
  });

  patchMainJs();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.22 terminou com problemas.");
  } else {
    ok("Reparo V19.8.22 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico e inicie pela opção [1].");
  }
}

main();
