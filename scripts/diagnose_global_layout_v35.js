const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try { return fs.readFileSync(path.join(ROOT, file), "utf8"); }
  catch { return ""; }
}

console.log("Global Layout V35 Diagnostics");
console.log("============================");

[
  "config/ui_layout.json",
  "src/renderer/services/layout/global_layout_v35.css",
  "src/renderer/services/layout/global_layout_runtime_v35.js",
  "src/controls.html"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = read("src/controls.html");
console.log("");
console.log("controls.html:");
console.log(controls.includes("global_layout_v35.css") ? "[OK] CSS global injetado" : "[MISSING] CSS global");
console.log(controls.includes("global_layout_runtime_v35.js") ? "[OK] runtime global injetado" : "[MISSING] runtime global");

const pageMatches = controls.match(/data-page=["'][^"']+["']/g) || [];
const pages = [...new Set(pageMatches.map((m) => m.replace(/data-page=|["']/g, "")))];

console.log("");
console.log("Páginas encontradas no HTML:", pages.length ? pages.join(", ") : "nenhuma detectada");

const risky = [
  "avatar_carousel_mount_v31.js",
  "avatar_page_v31.js",
  "avatar_loadfile_page_v32.js",
  "avatar_window_unified_v29.js",
  "noelle_avatar_tab_v19_8_2.js"
];

console.log("");
console.log("Scripts antigos de avatar:");
for (const name of risky) {
  console.log(controls.includes(name) ? "[WARN] ainda aparece: " + name : "[OK] não ativo: " + name);
}

console.log("");
console.log("Contrato recomendado:");
console.log("Avatar: fill / sem scroll externo");
console.log("Chat: fill / chatLog com scroll interno");
console.log("Stream: fill / streamLog com scroll interno");
console.log("Home/Config/etc: scroll interno");