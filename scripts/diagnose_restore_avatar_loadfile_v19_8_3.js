const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

console.log("Restore Avatar Loadfile v19.8.3 Diagnostics");
console.log("===========================================");

[
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs",
  "src/renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_restore_loadfile_v19_8_3.js") ? "[OK] restore loadfile injetado" : "[MISSING] restore loadfile");
  console.log(html.includes("avatar_carousel_mount_v31.js") ? "[WARN] carousel v31 ainda aparece" : "[OK] carousel v31 não ativo");
  console.log(html.includes("avatar_loadfile_page_v32.js") ? "[WARN] v32 ainda aparece" : "[OK] v32 não ativo");
  console.log(html.includes("noelle_avatar_tab_v19_8_2.js") ? "[WARN] legacy v19_8_2 ainda aparece" : "[OK] legacy v19_8_2 não ativo");
}