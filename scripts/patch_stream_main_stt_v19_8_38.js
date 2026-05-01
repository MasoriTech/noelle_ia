const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const MAIN = path.join(ROOT, "main.js");
const BRIDGE = path.join(ROOT, "src", "main", "stream_stt_bridge_v19_8_38.cjs");

function log(msg) { console.log("[stream-v19.8.38-main] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exit(1); }
function nodeCheck(file) { cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" }); }

if (!fs.existsSync(MAIN)) fail("main.js não encontrado.");

const backup = MAIN + ".bak_stream_v19_8_38";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(MAIN, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let source = fs.readFileSync(MAIN, "utf8");
if (!source.includes("NOELLE_STREAM_STT_MAIN_V19_8_38_BEGIN")) {
  source += "\n\n" + fs.readFileSync(BRIDGE, "utf8") + "\n";
  fs.writeFileSync(MAIN, source, "utf8");
  log("bridge STT adicionada ao main.js");
} else {
  log("bridge STT já estava no main.js");
}

try {
  nodeCheck(MAIN);
  log("node --check main.js OK");
} catch {
  fs.copyFileSync(backup, MAIN);
  fail("node --check falhou em main.js; backup restaurado.");
}
