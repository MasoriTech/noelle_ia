const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[global-layout-v35] " + msg);
}

function patchControls() {
  const controlsPath = path.join(ROOT, "src", "controls.html");

  if (!fs.existsSync(controlsPath)) {
    log("src/controls.html não encontrado");
    process.exitCode = 1;
    return;
  }

  let html = fs.readFileSync(controlsPath, "utf8");

  const cssTag = '<link rel="stylesheet" href="./renderer/services/layout/global_layout_v35.css">';
  const jsTag = '<script src="./renderer/services/layout/global_layout_runtime_v35.js"></script>';

  if (!html.includes("global_layout_v35.css")) {
    if (html.includes("</head>")) {
      html = html.replace("</head>", cssTag + "\n</head>");
    } else {
      html = cssTag + "\n" + html;
    }
    log("CSS global injetado");
  }

  if (!html.includes("global_layout_runtime_v35.js")) {
    html = html.replace("</body>", jsTag + "\n</body>");
    log("runtime global injetado");
  }

  fs.writeFileSync(controlsPath, html, "utf8");
  log("controls.html atualizado");
}

patchControls();
log("patch aplicado");