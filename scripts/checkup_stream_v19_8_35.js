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

console.log("Stream V19.8.35 TTS Checkup");
console.log("===========================");

[
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_ai_reply_runtime_v19_8_34.js",
  "src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js",
  "preload.js",
  "src/controls.html"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

console.log("");
console.log("node --check:");
[
  "src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js",
  "scripts/apply_stream_v19_8_35.js",
  "scripts/checkup_stream_v19_8_35.js",
  "scripts/rollback_stream_v19_8_35.js",
  "scripts/selftest_stream_v19_8_35.js"
].forEach((file) => {
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const controls = read("src/controls.html");
if (controls) {
  const ttsCount = (controls.match(/<script[^>]*noelle_stream_tts_runtime_v19_8_35\.js[^>]*><\/script>/g) || []).length;
  console.log("");
  console.log(ttsCount === 1 ? "[OK] TTS runtime ativo uma vez" : "[WARN] ocorrências TTS runtime: " + ttsCount);
}

const preload = read("preload.js");
if (preload) {
  console.log(preload.includes("speak:") && preload.includes("tts:speak")
    ? "[OK] preload expõe noelleAPI.speak"
    : "[WARN] preload não confirma noelleAPI.speak");
}

const runtime = read("src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js");
if (runtime) {
  console.log(runtime.includes("noelleAPI") && runtime.includes("speak")
    ? "[OK] runtime usa noelleAPI.speak"
    : "[WARN] runtime não usa speak");
  console.log(runtime.includes("StreamGuard") || runtime.includes("guardAllowsSpeech")
    ? "[OK] guarda de voz presente"
    : "[WARN] guarda de voz ausente");
}
