const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const cur = stack.pop();
    for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.toLowerCase().endsWith(".vrm")) {
        out.push(path.relative(ROOT, p).replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

console.log("Avatar Assets Bridge V31.2 Diagnostics");
console.log("======================================");

[
  "src/main/avatar_assets_bridge_v31_2.cjs",
  "src/renderer/modules/avatar/avatar_assets_bridge_v31_2.js",
  "src/renderer/widgets/avatar_carousel/avatar_carousel_mount_v31.js",
  "renderer_dist/avatar_carousel_v19_7_6.bundle.js",
  "src/renderer_dist/avatar_carousel_v19_7_6.bundle.js"
].forEach((file) => {
  console.log((fs.existsSync(path.join(ROOT, file)) ? "[OK] " : "[MISSING] ") + file);
});

const vrms = [
  ...walk(path.join(ROOT, "src", "assets", "avatars")),
  ...walk(path.join(ROOT, "src", "assets")),
  ...walk(path.join(ROOT, "assets", "avatars")),
  ...walk(path.join(ROOT, "assets"))
];

const unique = [...new Set(vrms)];

console.log("");
console.log("VRMs encontrados:", unique.length);
unique.slice(0, 30).forEach((v) => console.log(" - " + v));

const main = path.join(ROOT, "main.js");
if (fs.existsSync(main)) {
  const t = fs.readFileSync(main, "utf8");
  console.log("");
  console.log(t.includes("avatar_assets_bridge_v31_2.cjs") ? "[OK] main.js bridge registrado" : "[MISSING] main.js sem bridge");
}

const preload = path.join(ROOT, "preload.js");
if (fs.existsSync(preload)) {
  const t = fs.readFileSync(preload, "utf8");
  console.log(t.includes("yoruAvatarAssets") ? "[OK] preload yoruAvatarAssets exposto" : "[MISSING] preload sem yoruAvatarAssets");
}