"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failures = 0;

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function ok(label, condition, hint) {
  if (condition) console.log("[OK] " + label);
  else { failures++; console.log("[ERRO] " + label + (hint ? " - " + hint : "")); }
}
function warn(label, condition, hint) {
  if (condition) console.log("[OK] " + label);
  else console.log("[AVISO] " + label + (hint ? " - " + hint : ""));
}
function nodeCheck(rel) {
  if (!exists(rel)) { ok("node --check " + rel, false, "arquivo ausente"); return; }
  const r = cp.spawnSync(process.execPath, ["--check", rel], { cwd: ROOT, encoding: "utf8" });
  if (r.status === 0) console.log("[OK] node --check " + rel);
  else { failures++; console.log("[ERRO] node --check " + rel); console.log((r.stderr || r.stdout || "").trim()); }
}

console.log("============================================================");
console.log(" Diagnostico V19.7.3 - Build Regex / Avatar Focus");
console.log("============================================================");

ok("package.json existe", exists("package.json"));
ok("iniciar.bat existe", exists("iniciar.bat"));
ok("build script existe", exists("scripts/build_avatar_lab_v19_6_2026.cjs"));
ok("fix script existe", exists("scripts/fix_v19_7_3_build_regex_2026.cjs"));
warn("avatar manifest existe", exists("src/assets/avatar_manifest.json"), "rode o pack de carrossel se ainda nao existir");

if (exists("src/assets/avatar_manifest.json")) {
  try {
    const data = JSON.parse(read("src/assets/avatar_manifest.json"));
    const count = Array.isArray(data.avatars) ? data.avatars.length : Array.isArray(data) ? data.length : 0;
    warn("avatares encontrados no manifest: " + count, count > 0, "adicione .vrm em src/assets/avatars ou src/assets/vrm");
  } catch (err) {
    ok("avatar_manifest.json valido", false, err.message);
  }
}

if (exists("scripts/build_avatar_lab_v19_6_2026.cjs")) {
  const code = read("scripts/build_avatar_lab_v19_6_2026.cjs");
  ok("build nao contem regex literal quebrada", !/return\s+\/\(\^\|\r?\n/.test(code), "script ainda tem /(^| com quebra de linha");
  ok("build usa RegExp seguro", /new RegExp\("\(\^\|\\\\n\)/.test(code), "esperado new RegExp com \\n escapado");
  ok("build continua iife", /format:\s*["']iife["']/.test(code));
}

if (exists("src/renderer/avatar_lab_v19_6_app.js")) {
  const app = read("src/renderer/avatar_lab_v19_6_app.js");
  ok("avatar app sem top-level await antigo", !/(^|\n)\s*await\s+load(MotionManifest|Avatar)\s*\(/.test(app), "await solto ainda existe");
}

nodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
nodeCheck("scripts/fix_v19_7_3_build_regex_2026.cjs");
nodeCheck("scripts/diagnostico_v19_7_3_build_regex_2026.cjs");
if (exists("src/renderer/avatar_lab_v19_6_app.js")) nodeCheck("src/renderer/avatar_lab_v19_6_app.js");

if (failures) {
  console.log("[ERRO] Diagnostico falhou com " + failures + " problema(s).");
  process.exit(1);
}
console.log("[OK] Diagnostico V19.7.3 aprovado.");
