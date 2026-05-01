const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return "";
  }
}

function nodeCheck(file) {
  try {
    cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("Stream V19.8.36 Turn History Checkup");
console.log("====================================");

[
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js",
  "src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js",
  "src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js",
  "src/controls.html"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

console.log("");
console.log("node --check:");
[
  "src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js",
  "scripts/apply_stream_v19_8_36.js",
  "scripts/checkup_stream_v19_8_36.js",
  "scripts/rollback_stream_v19_8_36.js",
  "scripts/selftest_stream_v19_8_36.js"
].forEach((file) => {
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const controls = read("src/controls.html");
if (controls) {
  const count = (controls.match(/<script[^>]*noelle_stream_turn_history_runtime_v19_8_36\.js[^>]*><\/script>/g) || []).length;
  console.log("");
  console.log(count === 1 ? "[OK] history runtime ativo uma vez" : "[WARN] ocorrências history runtime: " + count);
}

const runtime = read("src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js");
if (runtime) {
  console.log(runtime.includes("localStorage") && runtime.includes("turnHistory")
    ? "[OK] armazenamento local de turnos"
    : "[WARN] armazenamento local não confirmado");
  console.log(runtime.includes("noelle:stream-ai-reply")
    ? "[OK] escuta evento de resposta IA"
    : "[WARN] evento resposta IA ausente");
  console.log(runtime.includes("Exportar") && runtime.includes("Copiar histórico")
    ? "[OK] botões copiar/exportar"
    : "[WARN] botões copiar/exportar ausentes");
}
