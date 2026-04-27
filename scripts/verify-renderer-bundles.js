"use strict";
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const required = [
  "src/renderer/controls_window_app.js",
  "src/renderer_dist/controls.bundle.js",
];
let ok = true;
for (const rel of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file) || fs.statSync(file).size < 20) {
    console.error("ERRO: bundle/arquivo ausente ou vazio:", rel);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log("Bundles validados.");
