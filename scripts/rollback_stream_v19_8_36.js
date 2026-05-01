const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function restore(file) {
  const target = path.join(ROOT, file);
  const bak = target + ".bak_stream_v19_8_36";

  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, target);
    console.log("[OK] restaurado: " + file);
  } else {
    console.log("[INFO] sem backup: " + file);
  }
}

restore("src/controls.html");
