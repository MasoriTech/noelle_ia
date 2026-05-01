const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[rollback-avatar-v39.2] " + msg);
}

const controls = path.join(ROOT, "src", "controls.html");
const backup = controls + ".bak_v39_2";

if (!fs.existsSync(backup)) {
  console.log("[ERRO] Backup não encontrado: src/controls.html.bak_v39_2");
  process.exit(1);
}

fs.copyFileSync(backup, controls);
log("controls.html restaurado do backup v39.2");