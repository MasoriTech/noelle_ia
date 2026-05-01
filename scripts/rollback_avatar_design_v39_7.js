const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function restore(file, suffix) {
  const target = path.join(ROOT, file);
  const backup = target + suffix;

  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, target);
    console.log("[OK] restaurado " + file);
  } else {
    console.log("[INFO] backup ausente " + file + suffix);
  }
}

restore("src/controls.html", ".bak_v39_7");
restore("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs", ".bak_query_v39_7");