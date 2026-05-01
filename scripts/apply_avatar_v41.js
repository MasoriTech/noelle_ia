const childProcess = require("child_process");
const path = require("path");
const ROOT = process.cwd();

function run(script) {
  childProcess.execFileSync("node", [path.join(ROOT, "scripts", script)], { cwd: ROOT, stdio: "inherit" });
}

console.log("=== CHECKUP ANTES ===");
try { run("checkup_avatar_v41.js"); } catch {}

console.log("");
console.log("=== APLICANDO V41 ===");
run("restore_fast_loadfile_v41.js");
run("organize_avatar_assets_v41.js");
run("build_model_manifest_v41.js");
run("patch_controls_avatar_v41.js");

console.log("");
console.log("=== CHECKUP DEPOIS ===");
run("checkup_avatar_v41.js");

console.log("[avatar-v41] aplicado");