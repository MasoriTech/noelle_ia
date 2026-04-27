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

function check(rel) {
  if (!exists(rel)) {
    console.log("[AVISO] " + rel + " não existe.");
    return false;
  }
  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (result.status === 0) {
    console.log("[OK] node --check " + rel);
    return true;
  }
  console.error("[ERRO] node --check falhou: " + rel);
  console.error(result.stderr || result.stdout);
  process.exitCode = 1;
  return false;
}

console.log("============================================================");
console.log(" Diagnóstico V17.4.1 - main.js");
console.log("============================================================");

check("main.js");
check("preload.js");
check("src/renderer/controls_window_app.js");
check("src/renderer/avatar_window_app.js");

const main = read("main.js");
if (main.includes("avatar_view.html")) console.log("[OK] main.js usa avatar_view.html.");
else {
  console.error("[ERRO] main.js não aponta para avatar_view.html.");
  process.exitCode = 1;
}

if (main.includes("createTrayIcon") || main.includes("new Tray")) console.log("[OK] main.js preserva bandeja/tray.");
else console.log("[AVISO] main.js não parece ter bandeja/tray.");

if (main.includes("playMotion") && main.includes("equipItem")) console.log("[OK] main.js traduz comandos de avatar.");
else console.log("[AVISO] main.js pode não traduzir motion/item.");

if (exists("src/assets/Noelle.vrm")) console.log("[OK] Noelle.vrm encontrado.");
else {
  console.error("[ERRO] src/assets/Noelle.vrm faltando.");
  process.exitCode = 1;
}

console.log("============================================================");
