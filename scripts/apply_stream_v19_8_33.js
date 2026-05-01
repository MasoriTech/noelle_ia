const childProcess = require("child_process");
const path = require("path");
const ROOT = process.cwd();

function run(script) {
  childProcess.execFileSync("node", [path.join(ROOT, "scripts", script)], { cwd: ROOT, stdio: "inherit" });
}

console.log("=== CHECKUP ANTES ===");
try { run("checkup_stream_v19_8_33.js"); } catch {}

console.log("\n=== APLICANDO STREAM V19.8.33 ===");
run("patch_stream_audio_capture_v19_8_33.js");
run("patch_stream_existing_v19_8_33.js");

console.log("\n=== CHECKUP DEPOIS ===");
run("checkup_stream_v19_8_33.js");

console.log("[stream-v19.8.33] aplicado");