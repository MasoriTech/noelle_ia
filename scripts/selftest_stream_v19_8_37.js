const fs = require("fs");
const path = require("path");
const cp = require("child_process");

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
    cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    ok("node --check " + file);
  } catch {
    fail("node --check " + file);
  }
}

console.log("Selftest Stream V19.8.37");
console.log("========================");

[
  "scripts/patch_stream_vad_5s_v19_8_37.js",
  "scripts/checkup_stream_v19_8_37.js",
  "scripts/apply_stream_v19_8_37.js",
  "scripts/rollback_stream_v19_8_37.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "scripts/patch_stream_vad_5s_v19_8_37.js",
  "scripts/checkup_stream_v19_8_37.js",
  "scripts/apply_stream_v19_8_37.js",
  "scripts/rollback_stream_v19_8_37.js"
].forEach(nodeCheck);

const patch = read("scripts/patch_stream_vad_5s_v19_8_37.js");

patch.includes("TARGET_MS = 5000") ? ok("target 5000ms") : fail("target 5000ms ausente");
patch.includes("silenceToFinishMs") ? ok("patch mira silenceToFinishMs") : fail("silenceToFinishMs ausente");
patch.includes("5 segundos de silêncio") ? ok("texto 5 segundos") : fail("texto 5 segundos ausente");
patch.includes("node --check") ? ok("node check após patch") : fail("node check ausente");
patch.includes("backup restaurado") ? ok("rollback automático se falhar") : fail("rollback automático ausente");

if (failed) process.exit(1);
