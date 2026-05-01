const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(label) {
  console.log("[OK] " + label);
}

function fail(label) {
  failed = true;
  console.log("[ERRO] " + label);
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function nodeCheck(file) {
  try {
    cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    ok("node --check " + file);
  } catch {
    fail("node --check " + file);
  }
}

console.log("Selftest Stream V19.8.35");
console.log("========================");

[
  "src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js",
  "scripts/apply_stream_v19_8_35.js",
  "scripts/checkup_stream_v19_8_35.js",
  "scripts/rollback_stream_v19_8_35.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js",
  "scripts/apply_stream_v19_8_35.js",
  "scripts/checkup_stream_v19_8_35.js",
  "scripts/rollback_stream_v19_8_35.js"
].forEach(nodeCheck);

const runtime = read("src/renderer/modules/noelle_stream_tts_runtime_v19_8_35.js");

runtime.includes("noelleAPI") && runtime.includes("speak") ? ok("usa noelleAPI.speak") : fail("não usa noelleAPI.speak");
runtime.includes("streamTTSPanelV19835") ? ok("painel TTS") : fail("painel TTS ausente");
runtime.includes("Auto voz") ? ok("auto voz") : fail("auto voz ausente");
runtime.includes("guardAllowsSpeech") ? ok("StreamGuard para voz") : fail("guardAllowsSpeech ausente");
runtime.includes("BAD_ANSWER_PATTERNS") ? ok("bloqueia placeholder") : fail("bloqueio placeholder ausente");

if (failed) process.exit(1);
