const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[layout-revert-v35.1] " + msg);
}

function patchHtml(file) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    log(file + " não encontrado");
    return;
  }

  let html = fs.readFileSync(full, "utf8");

  const before = html;

  html = html.replace(
    /<link[^>]*global_layout_v35\.css[^>]*>/g,
    "<!-- disabled global_layout_v35.css by layout_revert_v35_1 -->"
  );

  html = html.replace(
    /<script[^>]*global_layout_runtime_v35\.js[^>]*><\/script>/g,
    "<!-- disabled global_layout_runtime_v35.js by layout_revert_v35_1 -->"
  );

  const cleanupTag = '<script src="./renderer/services/layout/layout_revert_v35_1.js"></script>';

  if (file === "src/controls.html" && !html.includes("layout_revert_v35_1.js")) {
    html = html.replace("</body>", cleanupTag + "\n</body>");
    log("cleanup runtime injetado em controls.html");
  }

  if (html !== before) {
    fs.writeFileSync(full, html, "utf8");
    log(file + " corrigido");
  } else {
    fs.writeFileSync(full, html, "utf8");
    log(file + " sem mudanças necessárias");
  }
}

patchHtml("src/controls.html");
patchHtml("src/index.html");

log("global layout v35 removido do HTML");