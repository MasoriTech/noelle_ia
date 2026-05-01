const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const required = [
  "config/avatar_state.json",
  "config/avatar_manifest.json",
  "config/avatar_legacy_blocklist.json",
  "src/renderer/pages/avatar/avatar_page_v31.js",
  "src/renderer/modules/avatar/avatar_legacy_blocker_v31.js",
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js",
  "src/renderer/services/config/avatar_config_service_v31.js",
  "src/avatar_carousel_v19_7_6.html"
];

console.log("Avatar Runtime V31 Diagnostics");
console.log("==============================");

for (const file of required) {
  const ok = fs.existsSync(path.join(ROOT, file));
  console.log((ok ? "[OK] " : "[MISSING] ") + file);
}

const controls = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_page_v31.js") ? "[OK] avatar_page_v31 injected" : "[MISSING] avatar_page_v31");
  console.log(html.includes("noelle_avatar_tab_v19_8_2.js") ? "[WARN] legacy noelle_avatar_tab_v19_8_2 still referenced" : "[OK] legacy tab not referenced");
  console.log(html.includes("avatar_window_unified_v29.js") ? "[WARN] v29 still referenced" : "[OK] old v29 not referenced");
}