const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { try { return fs.readFileSync(path.join(ROOT, file), "utf8"); } catch { return ""; } }
function nodeCheck(file) { try { cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" }); return true; } catch { return false; } }

console.log("Stream V19.8.38 Complete Missing Checkup");
console.log("========================================");

[
  "main.js",
  "preload.js",
  "src/controls.html",
  "src/renderer/pages/noelle_stream_page_v19_8_29.js",
  "src/renderer/modules/noelle_stream_vad_v19_8_31.js",
  "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js",
  "src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js",
  "src/main/stream_stt_bridge_v19_8_38.cjs",
  "src/preload_stream_stt_bridge_v19_8_38.cjs",
  "config/stream_stt_v19_8_38.json"
].forEach((file) => console.log((exists(file) ? "[OK] " : "[MISSING] ") + file));

console.log("");
console.log("node --check:");
[
  "main.js",
  "preload.js",
  "src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js",
  "src/main/stream_stt_bridge_v19_8_38.cjs",
  "src/preload_stream_stt_bridge_v19_8_38.cjs",
  "scripts/patch_stream_vad_5s_v19_8_38.js",
  "scripts/patch_stream_main_stt_v19_8_38.js",
  "scripts/patch_stream_preload_stt_v19_8_38.js",
  "scripts/patch_stream_controls_v19_8_38.js",
  "scripts/apply_stream_v19_8_38.js",
  "scripts/checkup_stream_v19_8_38.js",
  "scripts/rollback_stream_v19_8_38.js",
  "scripts/selftest_stream_v19_8_38.js"
].forEach((file) => {
  if (!exists(file)) {
    console.log("[MISSING] " + file);
    return;
  }
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const main = read("main.js");
const preload = read("preload.js");
const controls = read("src/controls.html");
const vad = read("src/renderer/modules/noelle_stream_vad_v19_8_31.js");

console.log("");
console.log(main.includes("NOELLE_STREAM_STT_MAIN_V19_8_38_BEGIN") ? "[OK] main bridge STT instalado" : "[WARN] main bridge STT não instalado");
console.log(preload.includes("NOELLE_STREAM_STT_PRELOAD_V19_8_38_BEGIN") ? "[OK] preload bridge STT instalado" : "[WARN] preload bridge STT não instalado");
console.log(controls.includes("noelle_stream_pipeline_complete_v19_8_38.js") ? "[OK] runtime pipeline instalado no controls.html" : "[WARN] runtime pipeline ausente do controls.html");
console.log(/silenceToFinishMs\s*:\s*5000/.test(vad) ? "[OK] VAD = 5000ms" : "[WARN] VAD ainda não está em 5000ms");
console.log(process.env.NOELLE_STT_CMD ? "[OK] NOELLE_STT_CMD configurado no ambiente" : "[INFO] NOELLE_STT_CMD não configurado no ambiente atual");
