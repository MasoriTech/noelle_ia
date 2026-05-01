#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.30a — Stream Mic diagnostic fix
  Corrige falso positivo do diagnóstico V19.8.30:
  o módulo tinha as palavras STT/Ollama/TTS apenas em comentários.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.30a-stream-mic-diagfix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_30a_stream_mic_diagfix_" + STAMP);

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

function patchMicModuleComments() {
  const rel = "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js";
  if (!exists(rel)) {
    warn(rel + " não encontrado; pulando limpeza de comentários.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = code.replace(/- NÃO chama STT;\n\s*- NÃO chama Ollama;\n\s*- NÃO chama TTS\./g, "- não chama serviços externos nesta fase.");
  code = code.replace(/Nenhuma transcrição será feita nesta fase\./g, "Nenhum processamento de fala será feito nesta fase.");
  code = code.replace(/Fase 2: somente medidor de volume\./g, "Fase 2: somente medidor de volume.");

  write(rel, code);
  ok("Comentários/strings do módulo mic limpos para evitar falso positivo.");
}

function patchDiagnostic() {
  const rel = "scripts/diagnostico_v19_8_30_stream_mic_button_2026.cjs";
  if (!exists(rel)) {
    fail(rel + " não encontrado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  const oldBlock = `    if (!/MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\\.chat|noelleAPI\\.speak|piper/i.test(js)) {
      ok("Fase 2 sem STT/Ollama/TTS");
    } else {
      err("Fase 2 contém STT/Ollama/TTS indevido");
    }`;

  const newBlock = `    const jsRuntimeOnly = js
      .replace(/\\/\\*[\\s\\S]*?\\*\\//g, "")
      .replace(/\\/\\/.*$/gm, "")
      .replace(/(["'\`])(?:\\\\.|(?!\\1)[\\s\\S])*\\1/g, "");
    if (!/MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\\\\.chat|noelleAPI\\\\.speak|piper/i.test(jsRuntimeOnly)) {
      ok("Fase 2 sem STT/Ollama/TTS em código executável");
    } else {
      err("Fase 2 contém STT/Ollama/TTS indevido em código executável");
    }`;

  if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
    ok("Diagnóstico V19.8.30 atualizado para ignorar comentários/strings.");
  } else if (code.includes("jsRuntimeOnly")) {
    ok("Diagnóstico V19.8.30 já estava corrigido.");
  } else {
    warn("Bloco exato do diagnóstico não encontrado; criando diagnóstico V19.8.30a separado.");
  }

  write(rel, code);
}

function createDiag30a() {
  const rel = "scripts/diagnostico_v19_8_30a_stream_mic_diagfix_2026.cjs";
  const content = String.raw`#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function err(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado");
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (res.stderr) console.log(res.stderr);
    if (res.stdout) console.log(res.stdout);
  }
}

function stripCommentsAndStrings(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/(["'\`])(?:\\.|(?!\1)[\s\S])*\1/g, "");
}

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.30a - Stream Mic diagfix");
  log("================================================================");

  [
    "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
    "src/renderer/pages/noelle_stream_page_v19_8_29.js",
    "scripts/repair_v19_8_30a_stream_mic_diagfix_2026.cjs",
    "scripts/diagnostico_v19_8_30a_stream_mic_diagfix_2026.cjs"
  ].forEach(nodeCheck);

  if (exists("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js")) {
    const js = read("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js");
    const runtime = stripCommentsAndStrings(js);

    if (js.includes("window.NoelleStreamAudioCaptureV19830")) ok("módulo expõe window.NoelleStreamAudioCaptureV19830");
    else err("módulo não expõe window.NoelleStreamAudioCaptureV19830");

    if (js.includes("navigator.mediaDevices.getUserMedia")) ok("módulo usa getUserMedia por botão");
    else err("módulo não usa getUserMedia");

    if (js.includes('target.id === "streamStartBtn"') && js.includes('target.id === "streamStopBtn"')) ok("microfone controlado por botões Stream");
    else err("botões Start/Stop não detectados");

    if (js.includes("track.stop()")) ok("módulo desliga tracks do microfone");
    else err("módulo não parece desligar tracks");

    if (!/MediaRecorder|whisper|faster-whisper|ollama|noelleAPI\.chat|noelleAPI\.speak|piper/i.test(runtime)) {
      ok("Fase 2 sem STT/Ollama/TTS em código executável");
    } else {
      err("Fase 2 contém STT/Ollama/TTS indevido em código executável");
    }

    if (!/new\s+MutationObserver\s*\(|\.remove\s*\(|removeChild\s*\(/.test(runtime)) ok("módulo sem observer/remove DOM");
    else err("módulo contém observer ou remoção real de DOM");
  }

  if (exists("src/controls.html")) {
    const html = read("src/controls.html");
    if (html.includes("noelle_stream_audio_capture_v19_8_30.js")) ok("controls.html carrega módulo mic V19.8.30");
    else err("controls.html não carrega módulo mic V19.8.30");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.30a-stream-mic-diagfix-2026") ok("package.json version V19.8.30a");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.30a encontrou problemas.");
  else ok("Diagnóstico V19.8.30a aprovado.");
}

main();
`;
  write(rel, content);
  ok(rel + " criado.");
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
  pkg.scripts["repair:v19.8.30a-stream-mic-diagfix"] = "node scripts/repair_v19_8_30a_stream_mic_diagfix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.30a-stream-mic-diagfix"] = "node scripts/diagnostico_v19_8_30a_stream_mic_diagfix_2026.cjs";
  pkg.scripts["auto:v19.8.30a-stream-mic-diagfix"] = "node scripts/apply_v19_8_30a_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.30a — Stream Mic diagfix

- Corrige falso positivo do diagnóstico V19.8.30.
- O módulo de microfone continha as palavras STT/Ollama/TTS apenas em comentários, mas o diagnóstico interpretava como código real.
- O diagnóstico V19.8.30a remove comentários e strings antes de procurar chamadas indevidas.
- A fase continua sendo apenas microfone por botão + medidor de volume real.
`;

  if (!md.includes("V19.8.30a — Stream Mic diagfix")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.30a.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.30a - Stream Mic diagfix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchMicModuleComments();
  patchDiagnostic();
  createDiag30a();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.30a terminou com problemas.");
  } else {
    ok("Reparo V19.8.30a concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.30a.");
  }
}

main();
