const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
let failed = 0;

function ok(msg) { console.log("OK  ", msg); }
function fail(msg) { console.error("FAIL", msg); failed += 1; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf-8"); }

[
  "main.js",
  "preload.js",
  "src/launcher_view.html",
  "src/avatar_view.html",
  "src/controls.html",
  "src/launcher_bootstrap.js",
  "src/renderer/avatar_window_app.js",
  "src/renderer/controls_window_app.js",
  "scripts/bundle-renderers.mjs",
  "scripts/verify-renderer-bundles.js",
  "scripts/smoke-test.js",
  "scripts/module-report.js",
  "assets/icons/app.ico",
  "assets/icons/noelle_256.png",
  "src/assets/Noelle.vrm"
].forEach((rel) => exists(rel) ? ok(rel) : fail("Arquivo ausente: " + rel));

["src/avatar_bootstrap.js", "src/controls_bootstrap.js", "src/renderer/runtime_shims", "src/vendor"].forEach((rel) => {
  if (exists(rel)) fail("Rebarba antiga ainda existe: " + rel);
  else ok("sem rebarba antiga: " + rel);
});

try {
  const launcherHtml = read("src/launcher_view.html");
  const avatarHtml = read("src/avatar_view.html");
  const controlsHtml = read("src/controls.html");

  if (launcherHtml.includes("./renderer_dist/launcher.bundle.js")) ok("launcher usa bundle");
  else fail("launcher não usa bundle");

  if (avatarHtml.includes("./renderer_dist/avatar.bundle.js")) ok("avatar usa bundle");
  else fail("avatar não usa bundle");

  if (controlsHtml.includes("./renderer_dist/controls.bundle.js")) ok("controles usam bundle");
  else fail("controles não usam bundle");

  if (avatarHtml.includes("avatar_bootstrap.js") || avatarHtml.includes("importmap")) fail("avatar HTML ainda tem bootstrap/importmap antigo");
  else ok("avatar HTML sem bootstrap/importmap antigo");
} catch (err) {
  fail("Erro lendo HTML: " + err.message);
}

try {
  const avatarRuntime = read("src/renderer/avatar_window_app.js");
  if (avatarRuntime.includes('from "three"')) ok("avatar importa three direto");
  else fail("avatar não importa three direto");

  if (avatarRuntime.includes("runtime_shims")) fail("avatar runtime ainda referencia runtime_shims");
  else ok("avatar runtime sem runtime_shims");
} catch (err) {
  fail("Erro lendo avatar runtime: " + err.message);
}

if (failed) {
  console.error("\nDoctor encontrou " + failed + " problema(s).");
  process.exit(1);
}
console.log("\nDoctor finalizado sem falhas.");
