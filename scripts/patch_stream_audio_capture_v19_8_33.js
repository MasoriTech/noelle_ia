const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();
const file = path.join(ROOT, "src", "renderer", "modules", "noelle_stream_audio_capture_v19_8_30.js");

function log(msg) {
  console.log("[stream-v19.8.33-audio] " + msg);
}

if (!fs.existsSync(file)) {
  console.log("[WARN] audio capture não encontrado: " + path.relative(ROOT, file));
  process.exit(0);
}

const backup = file + ".bak_stream_v19_8_33";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(file, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let src = fs.readFileSync(file, "utf8");
const before = src;

src = src.replace(
  'detail: { version: "19.8.32-stream-segment-recorder-2026", reason }',
  'detail: { version: "19.8.32-stream-segment-recorder-2026", reason: message }'
);

src = src.replace(
  /detail:\s*\{\s*version:\s*"19\.8\.32-stream-segment-recorder-2026",\s*reason\s*\}/g,
  'detail: { version: "19.8.32-stream-segment-recorder-2026", reason: message }'
);

if (src !== before) {
  fs.writeFileSync(file, src, "utf8");
  log("bug do reason indefinido corrigido");
} else {
  log("nenhum patch de reason necessário");
}

try {
  childProcess.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
  log("node --check OK");
} catch (err) {
  console.log("[ERRO] node --check falhou em audio capture");
  process.exit(1);
}