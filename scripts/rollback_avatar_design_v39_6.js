const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const controls = path.join(ROOT, "src", "controls.html");
const backup = controls + ".bak_v39_6";

if (!fs.existsSync(backup)) {
  console.log("[ERRO] Backup não encontrado: src/controls.html.bak_v39_6");
  process.exit(1);
}

fs.copyFileSync(backup, controls);
console.log("[rollback-v39.6] controls.html restaurado");