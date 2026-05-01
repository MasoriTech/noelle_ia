const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

console.log("Avatar Simple Carousel V31.3 Diagnostics");
console.log("========================================");

[
  "src/renderer/pages/avatar/avatar_page_v31.js",
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js",
  "src/renderer/modules/avatar/avatar_assets_bridge_v31_2.js",
  "src/renderer_dist/avatar_carousel_v19_7_6.bundle.js"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

const controls = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_page_v31.js") ? "[OK] avatar_page_v31" : "[MISSING] avatar_page_v31");
  console.log(html.includes("avatar_carousel_mount_v31.js") ? "[OK] avatar_carousel_mount_v31" : "[MISSING] avatar_carousel_mount_v31");
  console.log(html.includes("avatar_assets_bridge_v31_2.js") ? "[OK] avatar_assets_bridge_v31_2" : "[MISSING] avatar_assets_bridge_v31_2");
  console.log(html.includes("avatar_window_unified_v29.js") ? "[WARN] v29 ainda aparece" : "[OK] v29 limpo");
}