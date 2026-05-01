const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), "utf8");
  } catch {
    return "";
  }
}

function nodeCheck(file) {
  try {
    childProcess.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

console.log("Avatar V41.1 Checkup");
console.log("====================");

[
  "src/renderer/pages/avatar/avatar_page_owner_v41_1.js",
  "src/renderer/pages/avatar/avatar_page_v41_1.css",
  "src/renderer/pages/avatar/model_manifest_v41_1.js",
  "src/renderer/viewers/vrm_viewer_v41.html",
  "src/renderer/viewers/glb_viewer_v41.html",
  "src/renderer/viewers/scene_viewer_v41.html",
  "src/renderer/viewers/model_viewer_v41_app.mjs",
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs",
  "src/assets/model_manifest_v41_1.json"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

console.log("");
console.log("node --check:");
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
  "scripts/rollback_avatar_v41_1.js",
  "scripts/selftest_avatar_v41_1.js"
].forEach((file) => {
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const app = read("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs");
if (app) {
  console.log("");
  console.log(/NOELLE_AVATAR_QUERY_V39_[789]|LOADFILE_RUNTIME_BRIDGE_V40|__NOELLE_ACTIVE_AVATAR/.test(app)
    ? "[WARN] Loadfile app ainda contém bridge/query antiga"
    : "[OK] Loadfile app limpo de bridge/query antiga");
}

const controls = read("src/controls.html");
if (controls) {
  const ownerCount = (controls.match(/<script[^>]*avatar_page_owner_v41_1\.js[^>]*><\/script>/g) || []).length;
  const manifestCount = (controls.match(/<script[^>]*model_manifest_v41_1\.js[^>]*><\/script>/g) || []).length;

  console.log("");
  console.log(ownerCount === 1 ? "[OK] owner v41.1 ativo uma vez" : "[WARN] owner v41.1 ocorrências: " + ownerCount);
  console.log(manifestCount === 1 ? "[OK] manifest JS v41.1 ativo uma vez" : "[WARN] manifest JS v41.1 ocorrências: " + manifestCount);

  [
    "avatar_page_owner_v41.js",
    "loadfile_runtime_bridge_v40.js",
    "avatar_design_owner_v39_9.js",
    "avatar_design_owner_v39_8.js",
    "avatar_design_owner_v39_7.js",
    "avatar_design_owner_v39_6.js"
  ].forEach((name) => {
    const re = new RegExp(`<script[^>]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*><\\/script>`);
    console.log(re.test(controls) ? "[WARN] antigo ativo: " + name : "[OK] antigo não ativo: " + name);
  });
}

const manifestJs = read("src/renderer/pages/avatar/model_manifest_v41_1.js");
if (manifestJs) {
  console.log("");
  console.log(manifestJs.includes("window.__NOELLE_MODEL_MANIFEST_V41_1") ? "[OK] manifest JS global" : "[WARN] manifest JS global ausente");
}