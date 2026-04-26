const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const problems = [];
const notes = [];
function check(cond, msg) { if (cond) notes.push("OK   " + msg); else problems.push(msg); }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf-8"); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }

try {
  const pkg = JSON.parse(read("package.json"));
  check(!!pkg.scripts["build-renderers"], "package.json tem build-renderers");
  check(!!pkg.scripts["verify-renderer-bundles"], "package.json tem verify-renderer-bundles");
  check(!!pkg.scripts["postinstall"], "package.json tem postinstall");
  check(!pkg.scripts["prepare-runtime-shims"], "package.json sem prepare-runtime-shims");
  check(!pkg.scripts["copy:vendor"], "package.json sem copy:vendor no fluxo");
} catch (err) { problems.push("package.json inválido: " + err.message); }

try {
  check(read("src/launcher_view.html").includes("./renderer_dist/launcher.bundle.js"), "launcher usa bundle");
  check(read("src/avatar_view.html").includes("./renderer_dist/avatar.bundle.js"), "avatar usa bundle");
  check(read("src/controls.html").includes("./renderer_dist/controls.bundle.js"), "controls usa bundle");
} catch (err) { problems.push("HTML inválido: " + err.message); }

try {
  const avatarRuntime = read("src/renderer/avatar_window_app.js");
  check(avatarRuntime.includes('from "three"'), 'avatar runtime importa "three" direto');
  check(!avatarRuntime.includes("runtime_shims"), "avatar runtime sem runtime_shims");
} catch (err) { problems.push("avatar_window_app.js inválido: " + err.message); }

check(!exists("src/renderer/runtime_shims"), "sem pasta runtime_shims");
check(!exists("src/vendor"), "sem pasta vendor");
check(!exists("src/avatar_bootstrap.js"), "sem avatar_bootstrap antigo");
check(!exists("src/controls_bootstrap.js"), "sem controls_bootstrap antigo");

console.log(notes.join("\n"));
if (problems.length) {
  console.error("\nSmoke test encontrou problema(s):");
  for (const p of problems) console.error("- " + p);
  process.exit(1);
}
console.log("\nSmoke test finalizado sem falhas.");
