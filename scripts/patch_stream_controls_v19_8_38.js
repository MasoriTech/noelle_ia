const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) { console.log("[stream-v19.8.38-controls] " + msg); }

function backup(file) {
  if (!fs.existsSync(file)) return;
  const bak = file + ".bak_stream_v19_8_38";
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
    log("backup criado: " + path.relative(ROOT, bak));
  }
}

function disableTag(html, fileName) {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"), `<!-- disabled ${fileName} by stream_v19_8_38 -->`);
}

const controls = path.join(ROOT, "src", "controls.html");
if (!fs.existsSync(controls)) {
  console.log("[ERRO] src/controls.html não encontrado");
  process.exit(1);
}

backup(controls);

let html = fs.readFileSync(controls, "utf8");
html = disableTag(html, "noelle_stream_pipeline_complete_v19_8_38.js");

const tag = '<script src="./renderer/modules/noelle_stream_pipeline_complete_v19_8_38.js"></script>';
if (html.includes("</body>")) html = html.replace("</body>", tag + "\n</body>");
else html += "\n" + tag + "\n";

fs.writeFileSync(controls, html, "utf8");
log("pipeline complete v19.8.38 injetado em controls.html");
