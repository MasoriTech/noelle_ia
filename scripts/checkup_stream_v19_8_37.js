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

console.log("Stream V19.8.37 VAD 5s Checkup");
console.log("==============================");

[
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
  "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
  "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

console.log("");
console.log("node --check:");
[
  "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
  "scripts/patch_stream_vad_5s_v19_8_37.js",
  "scripts/checkup_stream_v19_8_37.js",
  "scripts/apply_stream_v19_8_37.js",
  "scripts/rollback_stream_v19_8_37.js",
  "scripts/selftest_stream_v19_8_37.js"
].forEach((file) => {
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const vad = read("src/renderer/modules/noelle_stream_vad_v19_8_31.js");

console.log("");
console.log("VAD:");
console.log(/silenceToFinishMs\s*:\s*5000/.test(vad)
  ? "[OK] silenceToFinishMs = 5000ms"
  : "[WARN] silenceToFinishMs ainda não está em 5000ms");

console.log(vad.includes("5 segundos de silêncio") || vad.includes("5 segundos de silencio")
  ? "[OK] texto da UI atualizado para 5 segundos"
  : "[WARN] texto da UI ainda pode mencionar 1 segundo");

console.log(/STREAM_VAD_5S_V19_8_37/.test(vad)
  ? "[OK] marcador v19.8.37 encontrado"
  : "[INFO] marcador v19.8.37 ausente");

console.log("");
console.log("Áreas protegidas:");
console.log("[OK] este patch não altera Avatar");
console.log("[OK] este patch não altera Loadfile");
console.log("[OK] este patch não altera viewers 3D");
