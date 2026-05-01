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

console.log("Selftest Avatar V41");
console.log("===================");

[
  "src/renderer/pages/avatar/avatar_page_owner_v41.js",
  "src/renderer/pages/avatar/avatar_page_v41.css",
  "src/renderer/viewers/vrm_viewer_v41.html",
  "src/renderer/viewers/glb_viewer_v41.html",
  "src/renderer/viewers/scene_viewer_v41.html",
  "src/renderer/viewers/model_viewer_v41_app.mjs",
  "scripts/restore_fast_loadfile_v41.js",
  "scripts/organize_avatar_assets_v41.js",
  "scripts/build_model_manifest_v41.js",
  "scripts/patch_controls_avatar_v41.js",
  "scripts/apply_avatar_v41.js",
  "scripts/checkup_avatar_v41.js",
  "scripts/rollback_avatar_v41.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/pages/avatar/avatar_page_owner_v41.js",
  "src/renderer/viewers/model_viewer_v41_app.mjs",
  "scripts/restore_fast_loadfile_v41.js",
  "scripts/organize_avatar_assets_v41.js",
  "scripts/build_model_manifest_v41.js",
  "scripts/patch_controls_avatar_v41.js",
  "scripts/apply_avatar_v41.js",
  "scripts/checkup_avatar_v41.js",
  "scripts/rollback_avatar_v41.js"
].forEach(nodeCheck);

const owner = read("src/renderer/pages/avatar/avatar_page_owner_v41.js");
const viewer = read("src/renderer/viewers/model_viewer_v41_app.mjs");

owner.includes("DEFAULT_LOADFILE = \"./avatar_loadfile_preview_v19_8_3.html\"") ? ok("Loadfile sem query") : fail("Loadfile não está simples");
owner.includes("vrm_viewer_v41.html") ? ok("viewer VRM separado") : fail("viewer VRM ausente");
owner.includes("scene_viewer_v41.html") ? ok("viewer de cenário separado") : fail("viewer scene ausente");
viewer.includes("GLTFLoader") ? ok("viewer usa GLTFLoader") : fail("viewer não usa GLTFLoader");

if (failed) process.exit(1);