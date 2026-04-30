#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
function readJson(rel){ try { return JSON.parse(fs.readFileSync(path.join(ROOT,rel),"utf8")); } catch { return null; } }
console.log("================================================================");
console.log(" Noelle V19.8.7 - status purge Avatar legado");
console.log("================================================================");
const pkg = readJson("package.json");
console.log("Versao:", pkg?.version || "desconhecida");
const manifest = readJson("src/assets/avatar_manifest.json");
console.log("Avatares no manifest:", Array.isArray(manifest) ? manifest.length : "manifest invalido");
const legacy = [
  "src/renderer_dist/avatar_carousel_v19_7_6.bundle.js",
  "src/renderer/noelle_avatar_resize_guard_v19_8_3.js",
  "src/renderer/noelle_avatar_route_guard_v19_8_4.js",
  "src/renderer/noelle_avatar_overlay_killer_v19_8_5.js",
  "src/renderer/noelle_avatar_overlay_launcher_killer_v19_8_6.js"
];
for (const f of legacy) console.log(`${f}:`, fs.existsSync(path.join(ROOT,f)) ? "AINDA EXISTE" : "removido");
console.log("\nDica: rode npm run diagnostico:v19.8.7 ou opcao [2] do iniciar.bat.");
