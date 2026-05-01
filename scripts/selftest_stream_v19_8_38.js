const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(label) { console.log("[OK] " + label); }
function fail(label) { failed = true; console.log("[ERRO] " + label); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return fs.readFileSync(path.join(ROOT, file), "utf8"); }
function nodeCheck(file) { try { cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" }); ok("node --check " + file); } catch { fail("node --check " + file); } }

console.log("Selftest Stream V19.8.38");
console.log("========================");

[
  "src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js",
  "src/main/stream_stt_bridge_v19_8_38.cjs",
  "src/preload_stream_stt_bridge_v19_8_38.cjs",
  "scripts/patch_stream_vad_5s_v19_8_38.js",
  "scripts/patch_stream_main_stt_v19_8_38.js",
  "scripts/patch_stream_preload_stt_v19_8_38.js",
  "scripts/patch_stream_controls_v19_8_38.js",
  "scripts/apply_stream_v19_8_38.js",
  "scripts/checkup_stream_v19_8_38.js",
  "scripts/rollback_stream_v19_8_38.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js",
  "src/main/stream_stt_bridge_v19_8_38.cjs",
  "src/preload_stream_stt_bridge_v19_8_38.cjs",
  "scripts/patch_stream_vad_5s_v19_8_38.js",
  "scripts/patch_stream_main_stt_v19_8_38.js",
  "scripts/patch_stream_preload_stt_v19_8_38.js",
  "scripts/patch_stream_controls_v19_8_38.js",
  "scripts/apply_stream_v19_8_38.js",
  "scripts/checkup_stream_v19_8_38.js",
  "scripts/rollback_stream_v19_8_38.js"
].forEach(nodeCheck);

const runtime = read("src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js");
const main = read("src/main/stream_stt_bridge_v19_8_38.cjs");
const preload = read("src/preload_stream_stt_bridge_v19_8_38.cjs");

runtime.includes("transcribeLastSegment") ? ok("runtime transcreve último trecho") : fail("runtime sem transcribeLastSegment");
runtime.includes("answerTranscript") ? ok("runtime envia para IA") : fail("runtime sem answerTranscript");
runtime.includes("speakAnswer") ? ok("runtime fala resposta") : fail("runtime sem speakAnswer");
runtime.includes("getGuardDecision") ? ok("runtime usa StreamGuard") : fail("runtime sem StreamGuard");
runtime.includes("autoPipeline") ? ok("auto pipeline") : fail("auto pipeline ausente");
main.includes("noelle:stream-transcribe-audio-v19_8_38") ? ok("main handler STT") : fail("main handler STT ausente");
main.includes("NOELLE_STT_CMD") ? ok("main suporta NOELLE_STT_CMD") : fail("main sem NOELLE_STT_CMD");
preload.includes("noelleStreamBridgeV19838") ? ok("preload expõe bridge") : fail("preload sem bridge");
preload.includes("transcribeAudio") ? ok("preload transcribeAudio") : fail("preload sem transcribeAudio");

if (failed) process.exit(1);
