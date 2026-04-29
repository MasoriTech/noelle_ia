"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "";
}

function ok(msg) {
  console.log("[OK] " + msg);
}

function warn(msg) {
  console.log("[AVISO] " + msg);
}

function err(msg) {
  console.error("[ERRO] " + msg);
  process.exitCode = 1;
}

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado.");

  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], {
    encoding: "utf8"
  });

  if (result.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (result.stderr) console.error(result.stderr);
    if (result.stdout) console.error(result.stdout);
  }
}

console.log("============================================================");
console.log(" Diagnóstico V19.0.1 - preload.js");
console.log("============================================================");

nodeCheck("preload.js");

const preload = read("preload.js");

if (preload.includes("NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN")) ok("Patch seguro V19.0.1 encontrado.");
else err("Patch seguro V19.0.1 não encontrado.");

if (preload.includes("var { contextBridge, ipcRenderer }")) {
  err("Ainda existe var { contextBridge, ipcRenderer } no preload.js.");
} else {
  ok("Não existe redeclaração var contextBridge/ipcRenderer.");
}

if (preload.includes('exposeInMainWorld("noelleRoomV19"')) {
  ok("API noelleRoomV19 exposta.");
} else {
  warn("Não encontrei exposeInMainWorld(\"noelleRoomV19\").");
}

const count = (preload.match(/NOELLE_ROOM_V19_PRELOAD_SAFE_BEGIN/g) || []).length;
if (count === 1) ok("Patch seguro não está duplicado.");
else err("Patch seguro duplicado ou ausente. Quantidade: " + count);

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] preload.js OK.");
