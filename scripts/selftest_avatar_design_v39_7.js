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

console.log("Selftest Avatar Design V39.7");
console.log("============================");

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_7.js",
  "src/renderer/pages/avatar/avatar_design_v39_7.css",
  "src/assets/avatars/avatar_manifest_v39_7.json",
  "scripts/apply_avatar_design_v39_7.js",
  "scripts/diagnose_avatar_design_v39_7.js",
  "scripts/rollback_avatar_design_v39_7.js",
  "scripts/patch_avatar_preview_query_v39_7.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_7.js",
  "scripts/apply_avatar_design_v39_7.js",
  "scripts/diagnose_avatar_design_v39_7.js",
  "scripts/rollback_avatar_design_v39_7.js",
  "scripts/patch_avatar_preview_query_v39_7.js"
].forEach(nodeCheck);

const owner = read("src/renderer/pages/avatar/avatar_design_owner_v39_7.js");
const css = read("src/renderer/pages/avatar/avatar_design_v39_7.css");
const manifest = JSON.parse(read("src/assets/avatars/avatar_manifest_v39_7.json"));

owner.includes("selectAvatar") ? ok("selectAvatar") : fail("selectAvatar ausente");
owner.includes("postToFrame") ? ok("postToFrame") : fail("postToFrame ausente");
owner.includes("avatar_manifest_v39_7.json") ? ok("manifest loader") : fail("manifest loader ausente");
owner.includes("avatarDesignFrameV397") ? ok("iframe id") : fail("iframe ausente");
css.includes(".av397-avatar-list") ? ok("CSS lista avatar") : fail("CSS lista avatar ausente");
Array.isArray(manifest.avatars) && manifest.avatars.length >= 2 ? ok("manifest com avatares") : fail("manifest sem avatares");

if (failed) process.exit(1);