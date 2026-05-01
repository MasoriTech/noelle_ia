const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

console.log("Avatar Fixed Sizes V36 Diagnostics");
console.log("=================================");

[
  "src/renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js",
  "src/renderer/pages/avatar/avatar_loadfile_fixed_sizes_v36.css",
  "src/renderer/pages/avatar/avatar_loadfile_fixed_sizes_v36.js",
  "src/avatar_loadfile_preview_v19_8_3.html"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_restore_loadfile_v19_8_3.js") ? "[OK] loadfile restore ativo" : "[MISSING] loadfile restore");
  console.log(html.includes("avatar_loadfile_fixed_sizes_v36.js") ? "[OK] size v36 ativo" : "[MISSING] size v36");
}