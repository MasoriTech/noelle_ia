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

console.log("Avatar Design V39.7 Controls + Avatar Switch Diagnostics");
console.log("=======================================================");

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_7.js",
  "src/renderer/pages/avatar/avatar_design_v39_7.css",
  "src/assets/avatars/avatar_manifest_v39_7.json",
  "src/avatar_loadfile_preview_v19_8_3.html",
  "src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs"
].forEach((file) => {
  console.log((exists(file) ? "[OK] " : "[MISSING] ") + file);
});

console.log("");
console.log("node --check:");
[
  "src/renderer/pages/avatar/avatar_design_owner_v39_7.js",
  "scripts/apply_avatar_design_v39_7.js",
  "scripts/diagnose_avatar_design_v39_7.js",
  "scripts/rollback_avatar_design_v39_7.js",
  "scripts/patch_avatar_preview_query_v39_7.js",
  "scripts/selftest_avatar_design_v39_7.js"
].forEach((file) => {
  console.log(nodeCheck(file) ? "[OK] " + file : "[ERRO] " + file);
});

const controls = read("src/controls.html");
const activeOwnerRe = /<script[^>]*avatar_design_owner_v39_7\.js[^>]*><\/script>/g;
const activeOwners = controls.match(activeOwnerRe) || [];

console.log("");
console.log("controls.html:");
console.log(activeOwners.length === 1 ? "[OK] 1 owner v39.7 ativo" : "[WARN] owners v39.7 ativos: " + activeOwners.length);

[
  "avatar_design_owner_v39_6.js",
  "avatar_design_owner_v39_5.js",
  "avatar_design_owner_v39_4.js",
  "avatar_design_owner_v39_3.js",
  "avatar_design_owner_v39_2.js",
  "avatar_design_owner_v39_1.js",
  "avatar_design_owner_v39.js",
  "avatar_render_owner_v38.js",
  "avatar_restore_loadfile_v19_8_3.js"
].forEach((name) => {
  const re = new RegExp(`<script[^>]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*><\\/script>`);
  console.log(re.test(controls) ? "[WARN] antigo ativo: " + name : "[OK] antigo não ativo: " + name);
});

const app = read("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs");
console.log("");
console.log("Preview query:");
console.log(app.includes("NOELLE_AVATAR_QUERY_V39_7") ? "[OK] preview aceita ?avatar=" : "[WARN] preview query não confirmado");