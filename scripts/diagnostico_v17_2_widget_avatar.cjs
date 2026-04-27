"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }

function json(rel, fallback) {
  try { return JSON.parse(read(rel)); } catch { return fallback; }
}

console.log("============================================================");
console.log(" Diagnostico V17.2 - Widget / Avatar / Emotes");
console.log("============================================================");

if (exists("src/avatar_view.html")) ok("src/avatar_view.html existe.");
else err("src/avatar_view.html nao encontrado.");

if (exists("src/avatar.html")) ok("src/avatar.html existe como alias/compatibilidade.");
else warn("src/avatar.html nao existe; tudo bem se main.js aponta para avatar_view.html.");

const main = read("main.js");
if (main.includes('"avatar_view.html"')) ok("main.js aponta para avatar_view.html.");
else err("main.js nao aponta para avatar_view.html.");

if (main.includes("avatarPayloadFromCommand")) ok("main.js traduz motion/expression/item para comandos do avatar.");
else err("main.js ainda nao tem tradutor avatarPayloadFromCommand.");

if (main.includes('"avatar:command"')) ok("Canal avatar:command presente.");
else warn("Canal avatar:command nao encontrado.");
if (main.includes('"avatar-command"')) ok("Canal avatar-command compatibilidade presente.");
else warn("Canal avatar-command compatibilidade nao encontrado.");

const preload = read("preload.js");
if (preload.includes("contextBridge.exposeInMainWorld")) ok("preload usa contextBridge.");
else err("preload nao parece usar contextBridge.");
if (preload.includes("openAvatar") && preload.includes("avatarCommand")) ok("preload expoe openAvatar/avatarCommand.");
else err("preload nao expoe API do avatar.");

const avatarApp = read("src/renderer/avatar_window_app.js");
if (avatarApp.includes("@pixiv/three-vrm-animation")) ok("avatar_window_app importa @pixiv/three-vrm-animation.");
else warn("avatar_window_app nao importa @pixiv/three-vrm-animation.");
if (avatarApp.includes('case "playMotion"')) ok("avatar entende playMotion.");
else err("avatar nao tem case playMotion.");
if (avatarApp.includes('case "equipItem"')) ok("avatar entende equipItem.");
else err("avatar nao tem case equipItem.");
if (avatarApp.includes('case "showExpression"') || avatarApp.includes("showExpressionById")) ok("avatar entende expression manual.");
else warn("avatar ainda nao tem expression manual.");

if (exists("src/assets/Noelle.vrm")) ok("Noelle.vrm encontrado.");
else err("src/assets/Noelle.vrm faltando.");

const motions = json("src/assets/motion_manifest.json", []);
if (Array.isArray(motions) && motions.length) ok(`motion_manifest.json lista ${motions.length} motions.`);
else err("motion_manifest.json vazio ou invalido.");

const expressions = json("src/assets/expressions/manifest.json", []);
if (Array.isArray(expressions) && expressions.length) ok(`expressions/manifest.json lista ${expressions.length} expressions.`);
else err("expressions/manifest.json vazio ou invalido.");

const items = json("src/assets/item_manifest.json", []);
if (Array.isArray(items) && items.length) ok(`item_manifest.json lista ${items.length} items.`);
else err("item_manifest.json vazio ou invalido.");

const pkg = json("package.json", {});
if (pkg.dependencies?.["@pixiv/three-vrm-animation"]) ok("package.json declara @pixiv/three-vrm-animation.");
else err("package.json nao declara @pixiv/three-vrm-animation.");
if (pkg.dependencies?.three && pkg.dependencies.three !== "latest") ok("three esta fixado: " + pkg.dependencies.three);
else warn("three ainda esta latest/indefinido.");
if (pkg.dependencies?.["@pixiv/three-vrm"] && pkg.dependencies["@pixiv/three-vrm"] !== "latest") ok("@pixiv/three-vrm esta fixado: " + pkg.dependencies["@pixiv/three-vrm"]);
else warn("@pixiv/three-vrm ainda esta latest/indefinido.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Corrija os erros acima.");
else console.log("[RESULTADO] Diagnostico sem erro critico.");
