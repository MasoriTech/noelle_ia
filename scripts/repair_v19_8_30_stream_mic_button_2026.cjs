#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.30 — Stream Mic Button
  Fase 2: microfone por botão + medidor real.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.30-stream-mic-button-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_30_stream_mic_button_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js";

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

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) {
    fail("src/controls.html não encontrado.");
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<script[^>]+noelle_stream_audio_capture_v19_8_30\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_stream_audio_capture_v19_8_30.js" defer data-noelle-stream-mic-v19-8-30="true"></script>';

  if (/noelle_stream_page_v19_8_29\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+noelle_stream_page_v19_8_29\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    ok("controls.html: módulo de microfone inserido após Stream page.");
  } else if (/controls_window_app\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+controls_window_app\.js[^>]*>\s*<\/script>)/i, "\n" + tag + "$1");
    warn("controls.html: Stream page não encontrada; módulo inserido antes de controls_window_app.js.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: scripts principais não encontrados; módulo inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: </body> não encontrado; módulo anexado ao final.");
  }

  write(rel, html);
}

function patchStreamPageMarker() {
  const rel = "src/renderer/pages/noelle_stream_page_v19_8_29.js";
  if (!exists(rel)) {
    warn("Stream page V19.8.29 não encontrada. Aplique a Fase 1 primeiro.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (!code.includes("NOELLE_V19_8_30_MIC_BUTTON_READY")) {
    code = code.replace(
      "Fase 1:",
      "Fase 1: /* NOELLE_V19_8_30_MIC_BUTTON_READY */"
    );
    if (!code.includes("NOELLE_V19_8_30_MIC_BUTTON_READY")) {
      code = "/* NOELLE_V19_8_30_MIC_BUTTON_READY */\n" + code;
    }
    ok("Stream page marcada como pronta para Mic Button V19.8.30.");
  } else {
    ok("Stream page já marcada com V19.8.30.");
  }

  write(rel, code);
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
  pkg.scripts["repair:v19.8.30-stream-mic"] = "node scripts/repair_v19_8_30_stream_mic_button_2026.cjs";
  pkg.scripts["diagnostico:v19.8.30-stream-mic"] = "node scripts/diagnostico_v19_8_30_stream_mic_button_2026.cjs";
  pkg.scripts["auto:v19.8.30-stream-mic"] = "node scripts/apply_v19_8_30_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.30 — Stream Mic Button

- Fase 2 da aba Stream.
- O microfone só liga quando o usuário aperta **Iniciar escuta**.
- O botão **Parar escuta** desliga todas as tracks do microfone.
- Se a janela ficar oculta ou fechar, o microfone é desligado.
- Mostra volume real no medidor da aba Stream.
- Não faz STT, não chama Ollama e não chama TTS nesta fase.
- A regra StreamGuard continua: Noelle/Yoru só responde pergunta direcionada a ela, em fases futuras.
`;

  if (!md.includes("V19.8.30 — Stream Mic Button")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.30.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.30 - Stream Mic Button");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) {
    fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  } else {
    ok(MODULE_REL + " existe");
  }

  patchControlsHtml();
  patchStreamPageMarker();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.30 terminou com problemas.");
  } else {
    ok("Reparo V19.8.30 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.30 e teste Iniciar/Parar escuta.");
  }
}

main();
