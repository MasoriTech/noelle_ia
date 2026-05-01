const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-fixed-size-v36] " + msg);
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado");
    process.exitCode = 1;
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  const restoreTag = '<script src="./renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js"></script>';
  const sizeTag = '<script src="./renderer/pages/avatar/avatar_loadfile_fixed_sizes_v36.js"></script>';

  if (!html.includes("avatar_restore_loadfile_v19_8_3.js")) {
    html = html.replace("</body>", restoreTag + "\n</body>");
    log("runtime loadfile restaurado injetado");
  }

  if (!html.includes("avatar_loadfile_fixed_sizes_v36.js")) {
    html = html.replace("</body>", sizeTag + "\n</body>");
    log("size v36 injetado");
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html atualizado");
}

patchControls();
log("patch aplicado");