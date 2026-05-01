const cp = require("child_process");
const path = require("path");
const ROOT = process.cwd();

function run(script) {
  cp.execFileSync("node", [path.join(ROOT, "scripts", script)], { cwd: ROOT, stdio: "inherit" });
}

console.log("=== APLICANDO STT BACKEND SETUP V19.8.39 ===");
run("patch_stream_main_stt_v19_8_39.js");
run("patch_stream_preload_stt_v19_8_39.js");
run("patch_stream_pipeline_prefer_v39_v19_8_39.js");
run("patch_stream_controls_stt_status_v19_8_39.js");

console.log("");
console.log("=== CHECKUP STT ===");
run("checkup_stream_stt_backend_v19_8_39.js");

console.log("[stream-v19.8.39] aplicado");
