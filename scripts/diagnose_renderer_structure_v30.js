const fs = require("fs");
const path = require("path");

const required = [
  "src/renderer/pages/avatar/avatar_page_v30.js",
  "src/renderer/pages/stream/stream_page_v30.js",
  "src/renderer/widgets/vrm_canvas/avatar_carousel_bundle_v30.js",
  "src/renderer/services/ipc/ipc_bridge_v30.js",
  "src/renderer/services/config/config_loader_v30.js",
  "src/renderer/services/runtime/renderer_boot_v30.js",
];

console.log("Renderer Structure V30 Diagnostics");
console.log("===================================");

for (const file of required) {
  console.log(fs.existsSync(path.join(process.cwd(), file)) ? "[OK] " + file : "[MISSING] " + file);
}

const controls = path.join(process.cwd(), "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_page_v30.js") ? "[OK] avatar_page_v30 injected" : "[MISSING] avatar_page_v30 injection");
  console.log(html.includes("noelle_avatar_tab_v19_8_2.js") ? "[WARN] legacy avatar v19_8_2 still referenced" : "[OK] legacy avatar v19_8_2 not active");
}