import { build } from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const outdir = path.join(root, "src", "renderer_dist");
fs.mkdirSync(outdir, { recursive: true });

const common = {
  bundle: true,
  minify: false,
  sourcemap: false,
  target: "es2020",
  format: "esm",
  platform: "browser",
  logLevel: "info",
};

await build({
  ...common,
  entryPoints: [path.join(root, "src", "launcher_bootstrap.js")],
  outfile: path.join(outdir, "launcher.bundle.js"),
});

await build({
  ...common,
  entryPoints: [path.join(root, "src", "renderer", "controls_window_app.js")],
  outfile: path.join(outdir, "controls.bundle.js"),
});

await build({
  ...common,
  entryPoints: [path.join(root, "src", "renderer", "avatar_window_app.js")],
  outfile: path.join(outdir, "avatar.bundle.js"),
});

console.log("Bundles gerados em src/renderer_dist");
