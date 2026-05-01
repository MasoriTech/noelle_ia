const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const VAD_FILE = path.join(ROOT, "src", "renderer", "modules", "noelle_stream_vad_v19_8_31.js");
const TARGET_MS = 5000;

function log(msg) { console.log("[stream-v19.8.38-vad] " + msg); }
function nodeCheck(file) { cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" }); }

if (!fs.existsSync(VAD_FILE)) {
  log("VAD não encontrado; pulando.");
  process.exit(0);
}

const backup = VAD_FILE + ".bak_stream_v19_8_38";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(VAD_FILE, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let source = fs.readFileSync(VAD_FILE, "utf8");
if (!/silenceToFinishMs\s*:/.test(source)) {
  log("silenceToFinishMs não encontrado; não apliquei patch cego.");
  process.exit(0);
}

source = source.replace(/silenceToFinishMs\s*:\s*\d+/g, "silenceToFinishMs: " + TARGET_MS);
source = source.replace(/quase 1 segundo de silêncio/g, "5 segundos de silêncio");
source = source.replace(/quase 1 segundo de silencio/g, "5 segundos de silêncio");
source = source.replace(/depois de quase 1 segundo de silêncio/g, "depois de 5 segundos de silêncio");
source = source.replace(/depois de quase 1 segundo de silencio/g, "depois de 5 segundos de silêncio");

if (!source.includes("STREAM_VAD_5S_V19_8_38")) {
  source = source.replace(/"use strict";/, `"use strict";\n// STREAM_VAD_5S_V19_8_38: silenceToFinishMs ajustado para 5000ms.`);
}

fs.writeFileSync(VAD_FILE, source, "utf8");

try {
  nodeCheck(VAD_FILE);
  log("VAD 5s OK");
} catch {
  fs.copyFileSync(backup, VAD_FILE);
  throw new Error("node --check falhou no VAD; backup restaurado");
}
