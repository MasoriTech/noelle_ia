const fs=require("fs"), path=require("path"), cp=require("child_process");
const ROOT=process.cwd();
function run(s){ const f=path.join(ROOT,"scripts",s); if(!fs.existsSync(f)){console.log("script ausente: "+s);process.exitCode=1;return;} cp.execFileSync("node",[f],{cwd:ROOT,stdio:"inherit"}); }
console.log("=== CHECKUP ANTES ==="); run("checkup_loadfile_v40.js");
console.log("\n=== APLICANDO LOADFILE V40 ==="); run("organize_loadfile_assets_v40.js"); run("build_loadfile_manifests_v40.js"); run("patch_loadfile_html_bridge_v40.js"); run("patch_loadfile_app_query_v40.js");
console.log("\n=== CHECKUP DEPOIS ==="); run("checkup_loadfile_v40.js");