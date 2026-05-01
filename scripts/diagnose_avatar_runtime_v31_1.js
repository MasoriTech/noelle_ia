const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

function findVrms(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return [];
  const out = [];
  const stack = [full];
  while (stack.length) {
    const current = stack.pop();
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const p = path.join(current, item.name);
      if (item.isDirectory()) stack.push(p);
      else if (item.name.toLowerCase().endsWith(".vrm")) {
        out.push(path.relative(ROOT, p).replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

console.log("Avatar Runtime V31.1 Diagnostics");
console.log("================================");

[
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js",
  "src/renderer/pages/avatar/avatar_page_v31.js",
  "src/renderer_dist/avatar_carousel_v19_7_6.bundle.js",
  "src/avatar_carousel_v19_7_6.html",
].forEach((file) => console.log((exists(file) ? "[OK] " : "[MISSING] ") + file));

const vrms = [
  ...findVrms("src/assets"),
  ...findVrms("src/assets/avatars"),
];

console.log("");
console.log("VRMs encontrados:", vrms.length);
vrms.slice(0, 20).forEach((v) => console.log(" - " + v));

const controls = path.join(ROOT, "src", "controls.html");
if (fs.existsSync(controls)) {
  const html = fs.readFileSync(controls, "utf8");
  console.log("");
  console.log("controls.html:");
  console.log(html.includes("avatar_page_v31.js") ? "[OK] avatar_page_v31 presente" : "[MISSING] avatar_page_v31");
  console.log(html.includes("avatar_window_unified_v29.js") ? "[WARN] v29 ainda referenciado" : "[OK] v29 limpo");
  console.log(html.includes("restore_avatar_carousel_runtime_v28.js") ? "[WARN] v28 ainda referenciado" : "[OK] v28 limpo");
  console.log(html.includes("noelle_avatar_tab_v19_8_2.js") ? "[WARN] legacy v19_8_2 ainda referenciado" : "[OK] legacy v19_8_2 limpo");
}