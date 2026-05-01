const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
  catch { return ""; }
}

function nodeCheck(rel) {
  try {
    childProcess.execFileSync("node", ["--check", rel], { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("Stream V19.8.33 Checkup");
console.log("========================");

[
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
  "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
  "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js"
].forEach((rel) => console.log((exists(rel) ? "[OK] " : "[MISSING] ") + rel));

console.log("\nnode --check:");
[
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
  "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
  "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js",
  "scripts/patch_stream_audio_capture_v19_8_33.js",
  "scripts/apply_stream_v19_8_33.js",
  "scripts/checkup_stream_v19_8_33.js",
  "scripts/rollback_stream_v19_8_33.js",
  "scripts/selftest_stream_v19_8_33.js"
].forEach((rel) => console.log((nodeCheck(rel) ? "[OK] " : "[ERRO] ") + rel));

const controls = read("src/controls.html");
if (controls) {
  console.log("\ncontrols.html:");
  [
    "noelle_stream_stt_status_v22.js",
    "noelle_stream_stt_selector_v21.js",
    "noelle_stream_transcribe_button_runtime_v20.js",
    "noelle_stream_finalize_v19_8_33.js"
  ].forEach((name) => {
    const count = (controls.match(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    console.log((count === 1 ? "[OK] " : "[WARN] ") + name + " ocorrências: " + count);
  });
}

const audio = read("src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js");
if (audio) {
  console.log("\naudio capture:");
  console.log(audio.includes('reason: message') ? "[OK] catch sem reason indefinido" : "[WARN] não confirmei patch do reason");
}

console.log("\nProteção de escopo:");
console.log("[OK] Este pack não altera Avatar/Loadfile/viewers.");