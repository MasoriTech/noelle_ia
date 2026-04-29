"use strict";

const fs = require("fs");
const path = require("path");
const root = process.cwd();
function exists(p) { try { return fs.existsSync(path.join(root, p)); } catch { return false; } }
function readJson(p, fallback) { try { return JSON.parse(fs.readFileSync(path.join(root, p), "utf8")); } catch { return fallback; } }
const pkg = readJson("package.json", {});
const manifest = readJson("src/assets/avatar_manifest.json", []);
console.log("================================================================");
console.log(" Noelle V19.8.2 - status Avatar Real");
console.log("================================================================");
console.log(`Versao package.json: ${pkg.version || "desconhecida"}`);
console.log(`preload.js: ${exists("preload.js") ? "OK" : "ausente"}`);
console.log(`Aba Avatar runtime: ${exists("src/renderer/noelle_avatar_tab_v19_8_2.js") ? "OK" : "ausente"}`);
console.log(`Preview HTML: ${exists("src/avatar_carousel_preview_v19_8_2.html") ? "OK" : "ausente"}`);
console.log(`Preview bundle: ${exists("src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js") ? "OK" : "ausente"}`);
console.log(`Manifest avatares: ${Array.isArray(manifest) ? manifest.length : "invalido"}`);
console.log("Scripts:");
console.log(` - diagnostico:v19.8.2 = ${pkg.scripts?.["diagnostico:v19.8.2"] || "ausente"}`);
console.log(` - build:avatar-preview-v19.8.2 = ${pkg.scripts?.["build:avatar-preview-v19.8.2"] || "ausente"}`);
