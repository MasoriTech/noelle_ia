#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function err(msg) { log("[ERRO] " + msg); process.exitCode = 1; }
function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }

console.log("================================================================");
console.log(" Diagnóstico V19.8.24 - avatar");
console.log("================================================================");

const manifestRel = "src/assets/avatar_manifest.json";
if (!exists(manifestRel)) {
  warn("avatar_manifest.json não encontrado");
} else {
  try {
    const data = JSON.parse(read(manifestRel));
    let entries = [];
    if (Array.isArray(data)) entries = data;
    else if (data && Array.isArray(data.avatars)) entries = data.avatars;

    if (entries.length) ok("avatar_manifest contém " + entries.length + " entrada(s)");
    else warn("avatar_manifest existe, mas sem entradas detectáveis");

    const paths = entries.map((item) => {
      if (typeof item === "string") return item;
      return item.path || item.file || item.url || "";
    }).filter(Boolean);

    const valid = paths.filter((p) => /\.(vrm|glb)$/i.test(p));
    if (valid.length) ok("avatar_manifest contém VRM/GLB: " + valid.length);
    else warn("avatar_manifest sem VRM/GLB detectável");
  } catch (e) {
    err("avatar_manifest inválido: " + e.message);
  }
}

[
  "src/renderer/avatar_carousel_preview_v19_8_2_app.mjs",
  "src/renderer_dist/avatar_carousel_preview_v19_8_2.bundle.js"
].forEach((rel) => {
  if (exists(rel)) ok(rel + " existe");
  else warn(rel + " não encontrado");
});

if (exists("src/controls.html")) {
  const html = read("src/controls.html");
  if (html.includes("noelle_add_avatar_button_v19_8_21.js")) ok("controls.html contém botão Adicionar avatar V19.8.21");
  else warn("controls.html sem runtime do botão Adicionar avatar V19.8.21");
}

if (process.exitCode) err("Diagnóstico avatar V19.8.24 encontrou problemas.");
else ok("Diagnóstico avatar V19.8.24 aprovado.");
