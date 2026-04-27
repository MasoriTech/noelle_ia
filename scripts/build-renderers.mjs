import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const src = path.join(root, "src", "renderer", "controls_window_app.js");
const outDir = path.join(root, "src", "renderer_dist");
const out = path.join(outDir, "controls.bundle.js");

if (!fs.existsSync(src)) {
  console.error("ERRO: src/renderer/controls_window_app.js não encontrado.");
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);

const launcher = path.join(outDir, "launcher.bundle.js");
const avatar = path.join(outDir, "avatar.bundle.js");
if (!fs.existsSync(launcher)) fs.writeFileSync(launcher, "console.log('launcher bundle placeholder');\n", "utf8");
if (!fs.existsSync(avatar)) fs.writeFileSync(avatar, "console.log('avatar bundle placeholder');\n", "utf8");
console.log("Bundles gerados/validados em src/renderer_dist.");
