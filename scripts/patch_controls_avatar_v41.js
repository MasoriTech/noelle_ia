const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const controlsPath = path.join(ROOT, "src", "controls.html");

function log(msg) {
  console.log("[controls-v41] " + msg);
}

function deactivateTag(html, fileName) {
  const escaped = fileName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  html = html.replace(new RegExp(`<script[^>]*${escaped}[^>]*><\\/script>`, "g"), `<!-- disabled ${fileName} by avatar_v41 -->`);
  html = html.replace(new RegExp(`<link[^>]*${escaped}[^>]*>`, "g"), `<!-- disabled ${fileName} by avatar_v41 -->`);
  return html;
}

if (!fs.existsSync(controlsPath)) {
  log("src/controls.html não encontrado");
  process.exit(1);
}

const backup = controlsPath + ".bak_v41";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(controlsPath, backup);
  log("backup criado: src/controls.html.bak_v41");
}

let html = fs.readFileSync(controlsPath, "utf8");

const blocked = [
  "loadfile_runtime_bridge_v40.js",
  "avatar_design_owner_v39_9.js",
  "avatar_design_owner_v39_8.js",
  "avatar_design_owner_v39_7.js",
  "avatar_design_owner_v39_6.js",
  "avatar_design_owner_v39_5.js",
  "avatar_design_owner_v39_4.js",
  "avatar_design_owner_v39_3.js",
  "avatar_design_owner_v39_2.js",
  "avatar_design_owner_v39_1.js",
  "avatar_design_owner_v39.js",
  "avatar_render_owner_v38.js",
  "avatar_restore_loadfile_v19_8_3.js",
  "avatar_outer_size_only_v36_1.js",
  "avatar_loadfile_fixed_sizes_v36.js",
  "avatar_loadfile_true_size_v34.js",
  "avatar_carousel_mount_v31.js",
  "avatar_page_v31.js",
  "noelle_avatar_tab_v19_8_2.js",
  "avatar_page_owner_v41.js"
];

for (const name of blocked) {
  html = deactivateTag(html, name);
}

const tag = '<script src="./renderer/pages/avatar/avatar_page_owner_v41.js"></script>';
if (html.includes("</body>")) {
  html = html.replace("</body>", tag + "\n</body>");
} else {
  html += "\n" + tag + "\n";
}

fs.writeFileSync(controlsPath, html, "utf8");
log("owner v41 injetado");