#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.23-log-queue-perf-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_23_log_queue_perf_" + STAMP);

const REQ_LOG_QUEUE = 'const { appendNoelleLog, flushNoelleLogsNow } = require("./src/main/performance/log_queue_v19_8_23.cjs");';

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

  if (!code.includes("log_queue_v19_8_23.cjs")) {
    const markers = [
      'const { OLLAMA_HTTP_AGENT } = require("./src/main/performance/ollama_http_agent_v19_8_22.cjs");',
      'const { spawn } = require("child_process");'
    ];

    let inserted = false;
    for (const marker of markers) {
      if (code.includes(marker)) {
        code = code.replace(marker, marker + " " + REQ_LOG_QUEUE);
        inserted = true;
        break;
      }
    }

    if (inserted) ok("main.js: import do log_queue V19.8.23 adicionado.");
    else {
      fail("main.js: não encontrei ponto seguro para importar log_queue.");
      return;
    }
  } else {
    ok("main.js: import log_queue V19.8.23 já presente.");
  }

  const appendRegex = /function appendLog\(message, extra = null\) \{ try \{ fs\.appendFileSync\(logFile\(\), JSON\.stringify\(\{ at: new Date\(\)\.toISOString\(\), message, extra \}\) \+ "\\n", "utf8"\); \} catch \{\} \}/;

  if (appendRegex.test(code)) {
    code = code.replace(appendRegex, 'function appendLog(message, extra = null) { appendNoelleLog(logFile(), message, extra); }');
    ok("main.js: appendLog síncrono trocado por fila assíncrona.");
  } else if (code.includes("function appendLog(message, extra = null) { appendNoelleLog(logFile(), message, extra); }")) {
    ok("main.js: appendLog assíncrono já aplicado.");
  } else {
    warn("main.js: não achei appendLog no formato esperado; fila de log não foi aplicada.");
  }

  if (!code.includes("flushNoelleLogsNow();")) {
    const quitMarkers = [
      "app.on(\"before-quit\", () => { isQuitting = true; });",
      "app.on('before-quit', () => { isQuitting = true; });"
    ];

    let addedFlush = false;
    for (const marker of quitMarkers) {
      if (code.includes(marker)) {
        code = code.replace(marker, marker.replace("isQuitting = true;", "isQuitting = true; try { flushNoelleLogsNow(); } catch {}"));
        addedFlush = true;
        break;
      }
    }

    if (addedFlush) ok("main.js: flush de logs adicionado no before-quit.");
    else warn("main.js: não achei app.on before-quit para adicionar flush.");
  } else {
    ok("main.js: flush de logs já presente.");
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
  pkg.scripts["repair:v19.8.23-log-queue"] = "node scripts/repair_v19_8_23_log_queue_perf_2026.cjs";
  pkg.scripts["diagnostico:v19.8.23-log-queue"] = "node scripts/diagnostico_v19_8_23_log_queue_perf_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.23 — Log queue performance")) {
    md += "\n\n## V19.8.23 — Log queue performance\n\n- Segunda fase de performance/manutenção do `main.js`.\n- Extrai fila de logs para `src/main/performance/log_queue_v19_8_23.cjs`.\n- `appendLog` deixa de usar `fs.appendFileSync` direto no main process.\n- Logs passam a ser agrupados e escritos assíncronamente.\n- Adiciona rotação simples quando o log passa de 2 MB.\n- Adiciona flush seguro em `before-quit` quando o padrão existe.\n- Não mexe em Avatar, Chat, Room, UI ou preload.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.23.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.23 - Log queue performance");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [
    "src/main/performance/log_queue_v19_8_23.cjs",
    "iniciar.bat"
  ].forEach((rel) => {
    if (exists(rel)) ok(rel + " existe");
    else fail(rel + " não encontrado. Copie o pack inteiro para a raiz.");
  });

  patchMainJs();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.23 terminou com problemas.");
  } else {
    ok("Reparo V19.8.23 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico e inicie pela opção [1].");
  }
}

main();
