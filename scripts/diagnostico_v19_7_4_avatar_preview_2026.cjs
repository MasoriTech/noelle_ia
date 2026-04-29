"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.warn(`[AVISO] ${msg}`); }
function err(msg) { console.error(`[ERRO] ${msg}`); failed = true; }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(`Arquivo ausente: ${rel}`);
  const res = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { cwd: ROOT, encoding: "utf8" });
  if (res.status !== 0) {
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
    return err(`node --check falhou: ${rel}`);
  }
  ok(`node --check ${rel}`);
}

function main() {
  console.log("================================================================");
  console.log(" Diagnostico Noelle V19.7.4 - Avatar Preview build/string fix");
  console.log("================================================================");

  const required = [
    "src/renderer/avatar_lab_v19_6_app.js",
    "scripts/build_avatar_lab_v19_6_2026.cjs",
    "scripts/fix_v19_7_4_unterminated_strings_2026.cjs",
    "iniciar.bat",
    "package.json",
  ];

  for (const rel of required) {
    if (exists(rel)) ok(`Encontrado: ${rel}`);
    else err(`Ausente: ${rel}`);
  }

  nodeCheck("src/renderer/avatar_lab_v19_6_app.js");
  nodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
  nodeCheck("scripts/fix_v19_7_4_unterminated_strings_2026.cjs");

  if (exists("src/renderer/avatar_lab_v19_6_app.js")) {
    const app = read("src/renderer/avatar_lab_v19_6_app.js");
    if (/\bawait\s+loadMotionManifest\s*\(\s*\)\s*;/.test(app) && !/function\s+bootAvatarLabV196\s*\(/.test(app)) {
      err("Avatar Preview ainda parece ter top-level await antigo.");
    } else {
      ok("Avatar Preview sem top-level await antigo detectado.");
    }
    if (/line\s*\+\s*["']\r?\n/.test(app)) {
      err("Avatar Preview ainda tem quebra de linha real dentro de string comum perto de line +.");
    } else {
      ok("Nenhuma string quebrada conhecida em line + foi detectada.");
    }
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      const scripts = pkg.scripts || {};
      if (scripts["build:avatar-lab-v19.6"]) ok("Script npm build:avatar-lab-v19.6 encontrado.");
      else err("Script npm build:avatar-lab-v19.6 ausente.");
      if (scripts["diagnostico:v19.7.4"]) ok("Script npm diagnostico:v19.7.4 encontrado.");
      else warn("Script npm diagnostico:v19.7.4 ausente.");
    } catch (e) { err(`package.json invalido: ${e.message}`); }
  }

  if (exists("node_modules/esbuild")) ok("esbuild local encontrado.");
  else warn("node_modules/esbuild não encontrado. Rode npm install antes do build.");

  if (failed) {
    console.error("[ERRO] Diagnostico V19.7.4 encontrou problemas.");
    process.exit(1);
  }
  console.log("[OK] Diagnostico V19.7.4 aprovado.");
}

main();
