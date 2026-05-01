const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[avatar-layout-v33] " + msg);
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado.");
    process.exitCode = 1;
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  // Garante que o runtime funcional v19.8.3 ainda é o oficial.
  const loadfileTag = '<script src="./renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js"></script>';
  if (!html.includes("avatar_restore_loadfile_v19_8_3.js")) {
    html = html.replace("</body>", loadfileTag + "\n</body>");
    log("runtime loadfile v19.8.3 injetado");
  }

  const layoutTag = '<script src="./renderer/pages/avatar/avatar_loadfile_layout_v33.js"></script>';
  if (!html.includes("avatar_loadfile_layout_v33.js")) {
    html = html.replace("</body>", layoutTag + "\n</body>");
    log("layout v33 injetado");
  } else {
    log("layout v33 já estava injetado");
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html atualizado");
}

patchControls();
log("patch aplicado");