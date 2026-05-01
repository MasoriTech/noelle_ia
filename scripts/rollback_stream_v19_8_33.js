const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function restore(rel) {
  const target = path.join(ROOT, rel);
  const backup = target + ".bak_stream_v19_8_33";
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, target);
    console.log("[OK] restaurado " + rel);
  } else {
    console.log("[INFO] backup ausente " + rel);
  }
}

[
  "src/controls.html",
  "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js",
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js"
].forEach(restore);