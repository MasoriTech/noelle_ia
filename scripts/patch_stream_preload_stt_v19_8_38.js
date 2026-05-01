const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const PRELOAD = path.join(ROOT, "preload.js");
const BRIDGE = path.join(ROOT, "src", "preload_stream_stt_bridge_v19_8_38.cjs");

function log(msg) { console.log("[stream-v19.8.38-preload] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exit(1); }
function nodeCheck(file) { cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" }); }

if (!fs.existsSync(PRELOAD)) fail("preload.js não encontrado.");

const backup = PRELOAD + ".bak_stream_v19_8_38";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(PRELOAD, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let source = fs.readFileSync(PRELOAD, "utf8");
if (!source.includes("NOELLE_STREAM_STT_PRELOAD_V19_8_38_BEGIN")) {
  source += "\n\n" + fs.readFileSync(BRIDGE, "utf8") + "\n";
  fs.writeFileSync(PRELOAD, source, "utf8");
  log("bridge STT adicionada ao preload.js");
} else {
  log("bridge STT já estava no preload.js");
}

try {
  nodeCheck(PRELOAD);
  log("node --check preload.js OK");
} catch {
  fs.copyFileSync(backup, PRELOAD);
  fail("node --check falhou em preload.js; backup restaurado.");
}
