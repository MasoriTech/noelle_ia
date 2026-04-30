"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8")); } catch { return fallback; } }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
console.log("================================================================");
console.log(" Noelle V19.8.9a - Status rápido");
console.log("================================================================");
const pkg = readJson("package.json", {});
const manifest = readJson("src/assets/avatar_manifest.json", []);
console.log(`Versão package.json: ${pkg.version || "não encontrada"}`);
console.log(`preload.js: ${exists("preload.js") ? "ok" : "ausente"}`);
console.log(`controls.html: ${exists("src/controls.html") ? "ok" : "ausente"}`);
console.log(`UI polish JS V19.8.9a: ${exists("src/renderer/noelle_ui_polish_v19_8_9a.js") ? "ok" : "ausente"}`);
console.log(`UI polish CSS V19.8.9a: ${exists("src/styles/noelle_ui_polish_v19_8_9a.css") ? "ok" : "ausente"}`);
console.log(`avatar_manifest: ${Array.isArray(manifest) ? manifest.length + " entrada(s)" : "formato não-array"}`);
console.log("Regra: opção [1] do iniciar.bat deve apenas iniciar o programa.");
