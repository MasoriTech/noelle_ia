const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();

function ok(label) {
  console.log("[OK] " + label);
}

function fail(label) {
  console.log("[ERRO] " + label);
  process.exitCode = 1;
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
  } catch (err) {
    fail("node --check " + file);
  }
}

console.log("Selftest Avatar Design V39.6");
console.log("============================");

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_6.js",
  "src/renderer/pages/avatar/avatar_design_v39_6.css",
  "scripts/apply_avatar_design_v39_6.js",
  "scripts/diagnose_avatar_design_v39_6.js",
  "scripts/rollback_avatar_design_v39_6.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/pages/avatar/avatar_design_owner_v39_6.js",
  "scripts/apply_avatar_design_v39_6.js",
  "scripts/diagnose_avatar_design_v39_6.js",
  "scripts/rollback_avatar_design_v39_6.js"
].forEach(nodeCheck);

const owner = read("src/renderer/pages/avatar/avatar_design_owner_v39_6.js");
const css = read("src/renderer/pages/avatar/avatar_design_v39_6.css");

owner.includes("attachShadow") ? ok("Shadow DOM") : fail("sem Shadow DOM");
owner.includes("avatarDesignFrameV396") ? ok("iframe id") : fail("sem iframe id");
owner.includes("healthCheck") ? ok("healthCheck") : fail("sem healthCheck");
css.includes(".av396-preview") ? ok("CSS preview") : fail("CSS preview ausente");
css.includes(".av396-side") ? ok("CSS side") : fail("CSS side ausente");
css.includes("grid-template-areas: \"preview side\"") ? ok("grid areas") : fail("grid areas ausente");