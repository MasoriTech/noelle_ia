const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(label) {
  console.log("[OK] " + label);
}

function fail(label) {
  failed = true;
  console.log("[ERRO] " + label);
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function nodeCheck(file) {
  try {
    childProcess.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    ok("node --check " + file);
  } catch {
    fail("node --check " + file);
  }
}

console.log("Selftest Avatar V41.1");
console.log("=====================");

[
  "src/renderer/pages/avatar/avatar_page_owner_v41_1.js",
  "src/renderer/pages/avatar/avatar_page_v41_1.css",
  "src/renderer/pages/avatar/model_manifest_v41_1.js",
  "src/renderer/viewers/vrm_viewer_v41.html",
  "src/renderer/viewers/glb_viewer_v41.html",
  "src/renderer/viewers/scene_viewer_v41.html",
  "src/renderer/viewers/model_viewer_v41_app.mjs",
  "scripts/restore_fast_loadfile_v41_1.js",
  "scripts/find_avatar_assets_v41_1.js",
  "scripts/build_model_manifest_v41_1.js",
  "scripts/patch_controls_avatar_v41_1.js",
  "scripts/apply_avatar_v41_1.js",
  "scripts/checkup_avatar_v41_1.js",
  "scripts/rollback_avatar_v41_1.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/pages/avatar/model_manifest_v41_1.js",
  "src/renderer/pages/avatar/avatar_page_owner_v41_1.js",
  "src/renderer/viewers/model_viewer_v41_app.mjs",
  "scripts/restore_fast_loadfile_v41_1.js",
  "scripts/find_avatar_assets_v41_1.js",
  "scripts/build_model_manifest_v41_1.js",
  "scripts/patch_controls_avatar_v41_1.js",
  "scripts/apply_avatar_v41_1.js",
  "scripts/checkup_avatar_v41_1.js",
  "scripts/rollback_avatar_v41_1.js"
].forEach(nodeCheck);

const owner = read("src/renderer/pages/avatar/avatar_page_owner_v41_1.js");
const manifestJs = read("src/renderer/pages/avatar/model_manifest_v41_1.js");
const viewer = read("src/renderer/viewers/model_viewer_v41_app.mjs");

owner.includes("DEFAULT_LOADFILE = \"./avatar_loadfile_preview_v19_8_3.html\"") ? ok("Loadfile sem query") : fail("Loadfile não está simples");
owner.includes("__NOELLE_MODEL_MANIFEST_V41_1") ? ok("owner lê manifest JS") : fail("owner não lê manifest JS");
manifestJs.includes("window.__NOELLE_MODEL_MANIFEST_V41_1") ? ok("manifest JS global") : fail("manifest JS global ausente");
owner.includes("fetchManifestJson") ? ok("fallback JSON existe") : fail("fallback JSON ausente");
viewer.includes("GLTFLoader") ? ok("viewer usa GLTFLoader") : fail("viewer não usa GLTFLoader");

if (failed) process.exit(1);