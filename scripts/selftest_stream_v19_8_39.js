const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(label) { console.log("[OK] " + label); }
function fail(label) { failed = true; console.log("[ERRO] " + label); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return fs.readFileSync(path.join(ROOT, file), "utf8"); }
function nodeCheck(file) {
  try {
    cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    ok("node --check " + file);
  } catch {
    fail("node --check " + file);
  }
}

console.log("Selftest Stream V19.8.39");
console.log("========================");

[
  "src/main/stream_stt_bridge_v19_8_39.cjs",
  "src/preload_stream_stt_bridge_v19_8_39.cjs",
  "src/renderer/modules/noelle_stream_stt_backend_status_v19_8_39.js",
  "tools/stt/noelle_stream_stt_python_wrapper_v19_8_39.py",
  "scripts/configure_stream_stt_v19_8_39.js",
  "scripts/checkup_stream_stt_backend_v19_8_39.js",
  "scripts/patch_stream_main_stt_v19_8_39.js",
  "scripts/patch_stream_preload_stt_v19_8_39.js",
  "scripts/patch_stream_pipeline_prefer_v39_v19_8_39.js",
  "scripts/patch_stream_controls_stt_status_v19_8_39.js",
  "scripts/apply_stream_v19_8_39.js",
  "scripts/rollback_stream_v19_8_39.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/main/stream_stt_bridge_v19_8_39.cjs",
  "src/preload_stream_stt_bridge_v19_8_39.cjs",
  "src/renderer/modules/noelle_stream_stt_backend_status_v19_8_39.js",
  "scripts/configure_stream_stt_v19_8_39.js",
  "scripts/checkup_stream_stt_backend_v19_8_39.js",
  "scripts/patch_stream_main_stt_v19_8_39.js",
  "scripts/patch_stream_preload_stt_v19_8_39.js",
  "scripts/patch_stream_pipeline_prefer_v39_v19_8_39.js",
  "scripts/patch_stream_controls_stt_status_v19_8_39.js",
  "scripts/apply_stream_v19_8_39.js",
  "scripts/rollback_stream_v19_8_39.js"
].forEach(nodeCheck);

const main = read("src/main/stream_stt_bridge_v19_8_39.cjs");
const preload = read("src/preload_stream_stt_bridge_v19_8_39.cjs");
const statusRuntime = read("src/renderer/modules/noelle_stream_stt_backend_status_v19_8_39.js");

main.includes("noelle:stream-transcribe-audio-v19_8_39") ? ok("main handler v39") : fail("main handler v39 ausente");
main.includes("CONFIG_FILE_39") ? ok("config v39") : fail("config v39 ausente");
main.includes("savedAudio") ? ok("salva audio quando sem backend") : fail("savedAudio ausente");
preload.includes("noelleStreamBridgeV19839") ? ok("preload bridge v39") : fail("preload bridge v39 ausente");
statusRuntime.includes("streamSTTBackendPanelV19839") ? ok("painel status") : fail("painel status ausente");
statusRuntime.includes("sttStatus") ? ok("sttStatus") : fail("sttStatus ausente");

if (failed) process.exit(1);
