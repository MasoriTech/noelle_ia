const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return "";
  }
}

console.log("Avatar Megapack Design V39.2 Diagnostics");
console.log("========================================");

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_2.js",
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs",
  "config/avatar_design_v39_2.json"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = read("src/controls.html");
const ownerActive = /<script[^>]*avatar_design_owner_v39_2\.js[^>]*><\/script>/.test(controls);
const ownerOccurrences = (controls.match(/avatar_design_owner_v39_2\.js/g) || []).length;

console.log("");
console.log("controls.html:");
console.log(ownerActive ? "[OK] owner v39.2 ativo" : "[MISSING] owner v39.2 ativo");
console.log(ownerOccurrences === 1 ? "[OK] uma ocorrência do owner v39.2" : "[WARN] ocorrências do owner v39.2: " + ownerOccurrences);

const oldScripts = [
  "avatar_design_owner_v39_1.js",
  "avatar_design_owner_v39.js",
  "avatar_render_owner_v38.js",
  "avatar_restore_loadfile_v19_8_3.js",
  "avatar_outer_size_only_v36_1.js",
  "avatar_loadfile_fixed_sizes_v36.js",
  "avatar_loadfile_true_size_v34.js",
  "avatar_carousel_mount_v31.js",
  "avatar_page_v31.js",
  "noelle_avatar_tab_v19_8_2.js"
];

for (const name of oldScripts) {
  const regex = new RegExp(`<script[^>]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*><\\/script>`);
  console.log(regex.test(controls) ? "[WARN] script antigo ativo: " + name : "[OK] script antigo não ativo: " + name);
}

console.log("");
console.log("Backups:");
console.log(exists("src/controls.html.bak_v39_2") ? "[OK] controls backup v39.2" : "[INFO] sem backup v39.2");
console.log(exists("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs.bak_v39_2") ? "[OK] preview app backup v39.2" : "[INFO] preview app backup v39.2 não necessário");

console.log("");
console.log("V39.2 inclui:");
console.log("- owner único");
console.log("- fallback do iframe");
console.log("- debounce no MutationObserver");
console.log("- painel direito");
console.log("- bind seguro de botões");
console.log("- diagnóstico de scripts ativos");