const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
let failed = 0;

function ok(msg){ console.log("OK  ", msg); }
function fail(msg){ console.error("FAIL", msg); failed += 1; }
function exists(rel){ return fs.existsSync(path.join(root, rel)); }
function read(rel){ return fs.readFileSync(path.join(root, rel), "utf-8"); }

[
  "node_modules/three/build/three.module.js",
  "node_modules/three/examples/jsm/loaders/GLTFLoader.js",
  "node_modules/three/examples/jsm/controls/OrbitControls.js",
  "node_modules/@pixiv/three-vrm/lib/three-vrm.module.js",
  "node_modules/@pixiv/three-vrm-animation/lib/three-vrm-animation.module.js"
].forEach((rel) => exists(rel) ? ok(rel) : fail("node_modules ausente: " + rel));

try {
  const avatarRuntime = read("src/renderer/avatar_window_app.js");
  if (avatarRuntime.includes('from "three"')) ok('avatar runtime usa import "three"');
  else fail('avatar runtime não usa import "three"');

  if (avatarRuntime.includes("runtime_shims") || avatarRuntime.includes("src/vendor")) fail("avatar runtime ainda referencia arquitetura antiga");
  else ok("avatar runtime sem runtime_shims/vendor");
} catch (err) {
  fail("Falha lendo avatar runtime: " + err.message);
}

if (failed) process.exit(1);
console.log("Module report finalizado sem falhas.");
