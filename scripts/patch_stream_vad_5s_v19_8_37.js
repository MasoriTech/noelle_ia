const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const VAD_FILE = path.join(ROOT, "src", "renderer", "modules", "noelle_stream_vad_v19_8_31.js");
const TARGET_MS = 5000;

function log(msg) {
  console.log("[stream-v19.8.37-vad] " + msg);
}

function fail(msg) {
  console.error("[ERRO] " + msg);
  process.exit(1);
}

function nodeCheck(file) {
  cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
}

if (!fs.existsSync(VAD_FILE)) {
  fail("Arquivo VAD não encontrado: src/renderer/modules/noelle_stream_vad_v19_8_31.js");
}

const backup = VAD_FILE + ".bak_stream_v19_8_37";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(VAD_FILE, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let source = fs.readFileSync(VAD_FILE, "utf8");

if (!/silenceToFinishMs\s*:/.test(source)) {
  fail("Não encontrei silenceToFinishMs no VAD. Não vou aplicar patch às cegas.");
}

source = source.replace(/silenceToFinishMs\s*:\s*\d+/g, "silenceToFinishMs: " + TARGET_MS);

// Textos da UI/log para não continuar dizendo quase 1 segundo.
source = source.replace(/quase 1 segundo de silêncio/g, "5 segundos de silêncio");
source = source.replace(/quase 1 segundo de silencio/g, "5 segundos de silêncio");
source = source.replace(/depois de quase 1 segundo de silêncio/g, "depois de 5 segundos de silêncio");
source = source.replace(/depois de quase 1 segundo de silencio/g, "depois de 5 segundos de silêncio");

// Marcador não invasivo, sem mudar arquitetura.
if (!source.includes("STREAM_VAD_5S_V19_8_37")) {
  source = source.replace(
    /"use strict";/,
    `"use strict";\n// STREAM_VAD_5S_V19_8_37: silenceToFinishMs ajustado para 5000ms.`
  );
}

fs.writeFileSync(VAD_FILE, source, "utf8");

try {
  nodeCheck(VAD_FILE);
} catch (err) {
  fs.copyFileSync(backup, VAD_FILE);
  fail("node --check falhou; backup restaurado.");
}

const after = fs.readFileSync(VAD_FILE, "utf8");
if (!/silenceToFinishMs\s*:\s*5000/.test(after)) {
  fs.copyFileSync(backup, VAD_FILE);
  fail("Patch não confirmou silenceToFinishMs: 5000; backup restaurado.");
}

log("VAD ajustado para 5 segundos de silêncio.");
