#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function check(ok, msg, type = "error") {
  if (ok) console.log(`[OK] ${msg}`);
  else {
    if (type === "warn") { warnings++; console.warn(`[AVISO] ${msg}`); }
    else { errors++; console.error(`[ERRO] ${msg}`); }
  }
}
function file(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(file(rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(file(rel), "utf8") : ""; }

console.log("================================================================");
console.log(" Noelle V19.7 - Diagnostico Avatar / Room / Widget / Preview");
console.log("================================================================");

check(exists("src/launcher_view.html"), "src/launcher_view.html existe");
check(exists("src/renderer/avatar_mode_router_v19_7.js"), "roteador de modos existe");
check(exists("src/room.html"), "Room / Quarto existe em src/room.html");
check(exists("src/avatar_view.html"), "Widget Mode existe em src/avatar_view.html");
check(exists("src/avatar_lab_v19_6.html"), "Preview / Teste existe em src/avatar_lab_v19_6.html", "warn");

const launcher = read("src/launcher_view.html");
check(launcher.includes("avatar_mode_router_v19_7.js"), "janela principal carrega avatar_mode_router_v19_7.js");

const router = read("src/renderer/avatar_mode_router_v19_7.js");
check(router.includes("Room / Quarto") && router.includes("Widget Mode") && router.includes("Preview / Teste"), "roteador declara os 3 modos");
check(router.includes("noelleRoom") && router.includes("openAvatar") && router.includes("avatar_lab_v19_6.html"), "roteador chama Room, Widget e Preview");

const preload = read("preload.js");
check(preload.includes("openAvatar") || preload.includes("avatar:open"), "preload expõe abertura do Widget Mode");
check(preload.includes("noelleRoom") || preload.includes("room:open"), "preload expõe abertura da Room");

const main = read("main.js");
check(main.includes("room:open") && main.includes("createRoomWindow"), "main.js possui IPC da Room / Quarto");
check(main.includes("avatar:open") && main.includes("createAvatarWindow"), "main.js possui IPC do Widget Mode");
check(main.includes("transparent: true") || main.includes('transparent:true'), "Widget Mode mantém janela transparente", "warn");

const lab = read("src/renderer/avatar_lab_v19_6_app.js");
check(!/^\s*await\s+/m.test(lab), "Avatar Lab/Preview não possui top-level await incompatível com iife", "warn");

const pkgText = read("package.json");
try {
  const pkg = JSON.parse(pkgText);
  check(!!pkg.scripts?.["diagnostico:avatar-modes"], "package.json tem script diagnostico:avatar-modes");
} catch {
  check(false, "package.json inválido");
}

console.log("----------------------------------------------------------------");
if (errors) {
  console.error(`[ERRO] Diagnostico terminou com ${errors} erro(s) e ${warnings} aviso(s).`);
  process.exit(1);
}
console.log(`[OK] Diagnostico aprovado com ${warnings} aviso(s).`);
