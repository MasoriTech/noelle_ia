"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }
function parseJson(rel, fallback) { try { return JSON.parse(read(rel)); } catch { return fallback; } }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

console.log("============================================================");
console.log(" Diagnostico V17.4 - bandeja/widget/interacoes");
console.log("============================================================");

for (const icon of ["assets/icons/app.ico", "assets/icons/noelle_16.png", "assets/icons/noelle_32.png", "assets/icons/noelle_128.png", "assets/icons/noelle_256.png"]) {
  if (exists(icon)) ok("Icone encontrado: " + icon);
  else warn("Icone ausente: " + icon);
}

const main = read("main.js");
if (main.includes("Tray") && main.includes("Menu") && main.includes("nativeImage")) ok("main.js importa Tray/Menu/nativeImage.");
else err("main.js nao importa Tray/Menu/nativeImage.");
if (main.includes("function createTrayIcon")) ok("createTrayIcon existe.");
else err("createTrayIcon nao existe.");
if (main.includes("tray.on(\"click\"") || main.includes("tray.on('click'")) ok("Tray tem clique para mostrar/ocultar.");
else err("Tray nao tem clique configurado.");
if (main.includes("tray.on(\"double-click\"") || main.includes("tray.on('double-click'")) ok("Tray tem duplo clique para widget.");
else warn("Tray nao tem duplo clique configurado.");
if (main.includes("app.setAppUserModelId")) ok("AppUserModelId configurado.");
else warn("AppUserModelId nao configurado.");
if (main.includes("icon: getAppIconPath()")) ok("BrowserWindow usa icone do app.");
else err("BrowserWindow nao usa getAppIconPath.");
if (main.includes('"avatar_view.html"')) ok("main.js aponta para avatar_view.html.");
else err("main.js nao aponta para avatar_view.html.");
if (main.includes("normalizeAvatarCommandPayload")) ok("main.js traduz comandos da UI para avatar.");
else err("main.js nao traduz comandos da UI para avatar.");
if (main.includes("avatar:command") && main.includes("avatar-command")) ok("main.js usa canais avatar:command e avatar-command.");
else warn("Compatibilidade dupla de canal nao encontrada.");

const preload = read("preload.js");
if (preload.includes("contextBridge.exposeInMainWorld")) ok("preload usa contextBridge.");
else err("preload nao usa contextBridge.");
if (preload.includes("openAvatar") && preload.includes("avatarCommand")) ok("preload expoe openAvatar/avatarCommand.");
else err("preload nao expoe openAvatar/avatarCommand.");

const avatar = read("src/renderer/avatar_window_app.js");
if (avatar.includes('case "playMotion"')) ok("avatar entende playMotion.");
else err("avatar nao entende playMotion.");
if (avatar.includes('case "equipItem"')) ok("avatar entende equipItem.");
else err("avatar nao entende equipItem.");
if (avatar.includes("showExpressionById") && avatar.includes('case "showExpression"')) ok("avatar entende showExpression.");
else warn("avatar pode nao entender showExpression.");

const controls = read("src/renderer/controls_window_app.js");
if (controls.includes('sendAvatarCommand("motion"')) ok("UI chama motion.");
else err("UI nao chama motion.");
if (controls.includes('sendAvatarCommand("expression"')) ok("UI chama expression.");
else err("UI nao chama expression.");
if (controls.includes('sendAvatarCommand("item"')) ok("UI chama item.");
else err("UI nao chama item.");

if (exists("src/avatar_view.html")) ok("src/avatar_view.html existe.");
else err("src/avatar_view.html faltando.");
if (exists("src/assets/Noelle.vrm")) ok("Noelle.vrm existe.");
else err("Noelle.vrm faltando.");

const motions = parseJson("src/assets/motion_manifest.json", []);
if (Array.isArray(motions) && motions.length) ok(`motion_manifest lista ${motions.length} motions.`);
else err("motion_manifest vazio ou invalido.");

const expressions = parseJson("src/assets/expressions/manifest.json", []);
if (Array.isArray(expressions) && expressions.length) ok(`expressions manifest lista ${expressions.length} expressions.`);
else err("expressions manifest vazio ou invalido.");

const items = parseJson("src/assets/item_manifest.json", []);
if (Array.isArray(items) && items.length) ok(`item_manifest lista ${items.length} items.`);
else err("item_manifest vazio ou invalido.");

const pkg = parseJson("package.json", {});
if (pkg.build?.win?.icon === "assets/icons/app.ico") ok("package.json build.win.icon correto.");
else warn("package.json build.win.icon nao aponta para assets/icons/app.ico.");
if (pkg.version === "17.4.0") ok("package.json version 17.4.0.");
else warn("package.json version: " + (pkg.version || "indefinida"));

if (exists("MEMORIA_GPT_NOELLE.md") && read("MEMORIA_GPT_NOELLE.md").includes("Bandeja do sistema")) ok("Memoria GPT registra bandeja do sistema.");
else warn("Memoria GPT ainda nao registra a bandeja.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnostico sem erro critico.");
