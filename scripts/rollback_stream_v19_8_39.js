const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function restore(file) {
  const target = path.join(ROOT, file);
  const bak = target + ".bak_stream_v19_8_39";

  if (fs.existsSync(bak)) {
    fs.copyFileSync(bak, target);
    console.log("[OK] restaurado: " + file);
  } else {
    console.log("[INFO] sem backup: " + file);
  }
}

restore("main.js");
restore("preload.js");
restore("src/controls.html");
restore("src/renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js");
