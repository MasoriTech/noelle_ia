const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(msg) { console.log("[OK] " + msg); }
function fail(msg) { console.log("[ERRO] " + msg); failed = true; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function nodeCheck(rel) {
  try { childProcess.execFileSync("node", ["--check", rel], { cwd: ROOT, stdio: "pipe" }); ok("node --check " + rel); }
  catch { fail("node --check " + rel); }
}

console.log("Selftest Stream V19.8.33");
console.log("========================");

[
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "scripts/patch_stream_audio_capture_v19_8_33.js",
  "scripts/patch_stream_existing_v19_8_33.js",
  "scripts/apply_stream_v19_8_33.js",
  "scripts/checkup_stream_v19_8_33.js",
  "scripts/rollback_stream_v19_8_33.js"
].forEach((rel) => exists(rel) ? ok("existe " + rel) : fail("faltando " + rel));

[
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "scripts/patch_stream_audio_capture_v19_8_33.js",
  "scripts/patch_stream_existing_v19_8_33.js",
  "scripts/apply_stream_v19_8_33.js",
  "scripts/checkup_stream_v19_8_33.js",
  "scripts/rollback_stream_v19_8_33.js"
].forEach(nodeCheck);

const finalizer = read("src/renderer/modules/noelle_stream_finalize_v19_8_33.js");
finalizer.includes("noelle-stream-segment-ready-v19832") ? ok("ouve segmento pronto") : fail("não ouve segmento pronto");
finalizer.includes("transcribeLastSegment") ? ok("função transcribeLastSegment") : fail("sem transcribeLastSegment");
finalizer.includes("shouldRespond") ? ok("StreamGuard final") : fail("sem StreamGuard");
finalizer.includes("NÃO mexe em Avatar/Loadfile/viewers") ? ok("escopo protegido documentado") : fail("escopo protegido ausente");

if (failed) process.exit(1);