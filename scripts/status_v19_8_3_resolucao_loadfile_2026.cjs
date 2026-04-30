#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
function exists(rel){ return fs.existsSync(path.join(ROOT, rel)); }
function read(rel){ return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function line(k,v){ console.log(String(k).padEnd(34) + ": " + v); }

console.log("================================================================");
console.log(" Noelle V19.8.3 - status");
console.log("================================================================");

try {
  const pkg = JSON.parse(read("package.json"));
  line("package.json version", pkg.version || "-");
} catch { line("package.json", "indisponível"); }

line("preload.js", exists("preload.js") ? "ok" : "ausente");
line("main.js", exists("main.js") ? "ok" : "ausente");
line("CSS resolução", exists("src/styles/noelle_avatar_responsive_v19_8_3.css") ? "ok" : "ausente");
line("runtime resolução", exists("src/renderer/noelle_avatar_resize_guard_v19_8_3.js") ? "ok" : "ausente");
line("preview loadFile HTML", exists("src/avatar_loadfile_preview_v19_8_3.html") ? "ok" : "ausente");

try {
  const manifest = JSON.parse(read("src/assets/avatar_manifest.json"));
  line("avatar_manifest", Array.isArray(manifest) ? `${manifest.length} avatar(es)` : "não é array");
} catch { line("avatar_manifest", "erro/ausente"); }

console.log("");
console.log("Teste manual recomendado:");
console.log("1. iniciar.bat -> [1] Iniciar programa agora");
console.log("2. Aba Avatar -> trocar resolução: Compacta/Normal/Grande/Foco avatar");
console.log("3. Botão Preview LoadFile ou Preview/Teste");
console.log("4. Reduzir a janela e confirmar que opções descem ou criam scroll sem cortar botões.");
