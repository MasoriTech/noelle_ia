#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function err(msg) { log("[ERRO] " + msg); process.exitCode = 1; }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado");
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (res.stderr) console.log(res.stderr);
  }
}

console.log("================================================================");
console.log(" Diagnóstico V19.8.24 - preload");
console.log("================================================================");

nodeCheck("preload.js");

if (exists("preload.js")) {
  const preload = read("preload.js");

  if (preload.includes("NOELLE_V19_8_24_IMPORT_AVATAR_PRELOAD_BEGIN")) ok("preload contém bloco importAvatar V19.8.24");
  else err("preload não contém bloco importAvatar V19.8.24");

  if (!preload.includes("NOELLE_V19_8_20_IMPORT_PRELOAD_BEGIN") && !preload.includes("NOELLE_V19_8_21_IMPORT_PRELOAD_BEGIN")) ok("preload sem blocos antigos V20/V21 de importAvatar");
  else err("preload ainda contém blocos antigos V20/V21 de importAvatar");

  ["noelleAvatarImport", "noelleAvatarImportV19824", "noelleAvatarImportV19821", "noelleAvatarImportV19820"].forEach((name) => {
    if (preload.includes(name)) ok("preload expõe " + name);
    else err("preload não expõe " + name);
  });

  if (preload.includes("noelle:v19_8_24:import-avatar")) ok("preload aponta para canal V19.8.24");
  else err("preload não aponta para canal V19.8.24");
}

if (process.exitCode) err("Diagnóstico preload V19.8.24 encontrou problemas.");
else ok("Diagnóstico preload V19.8.24 aprovado.");
