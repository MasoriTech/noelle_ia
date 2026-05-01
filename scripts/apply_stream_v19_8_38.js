const cp = require("child_process");
const path = require("path");
const ROOT = process.cwd();

function run(script) {
  cp.execFileSync("node", [path.join(ROOT, "scripts", script)], { cwd: ROOT, stdio: "inherit" });
}

console.log("=== CHECKUP ANTES ===");
try { run("checkup_stream_v19_8_38.js"); } catch {}

console.log("");
console.log("=== APLICANDO STREAM COMPLETE V19.8.38 ===");
run("patch_stream_vad_5s_v19_8_38.js");
run("patch_stream_main_stt_v19_8_38.js");
run("patch_stream_preload_stt_v19_8_38.js");
run("patch_stream_controls_v19_8_38.js");

console.log("");
console.log("=== CHECKUP DEPOIS ===");
run("checkup_stream_v19_8_38.js");

console.log("[stream-v19.8.38] aplicado");
