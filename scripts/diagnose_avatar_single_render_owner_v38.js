const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

console.log("Avatar Single Render Owner V38 Diagnostics");
console.log("=========================================");

[
  "src/renderer/pages/avatar/avatar_render_owner_v38.js",
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = path.join(ROOT, "src", "controls.html");

if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");

  const ownerCount = (html.match(/avatar_render_owner_v38\.js/g) || []).length;

  const oldScripts = [
    "avatar_restore_loadfile_v19_8_3.js",
    "avatar_outer_size_only_v36_1.js",
    "avatar_loadfile_fixed_sizes_v36.js",
    "avatar_loadfile_true_size_v34.js",
    "avatar_carousel_mount_v31.js",
    "avatar_page_v31.js",
    "noelle_avatar_tab_v19_8_2.js"
  ];

  console.log("");
  console.log("controls.html:");
  console.log(ownerCount === 1 ? "[OK] exatamente 1 owner v38" : "[WARN] owner v38 ocorrências: " + ownerCount);

  for (const name of oldScripts) {
    const active = html.includes(`<script`) && html.includes(name) && !html.includes(`disabled ${name}`);
    console.log(active ? "[WARN] script antigo ativo: " + name : "[OK] script antigo desativado: " + name);
  }
}