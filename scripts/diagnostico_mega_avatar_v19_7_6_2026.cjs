#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();
function abs(p) { return path.join(root, p); }
function exists(p) { return fs.existsSync(abs(p)); }
function read(p) { return fs.readFileSync(abs(p), "utf8"); }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.warn("[AVISO] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }
function check(cond, msg) { if (cond) ok(msg); else fail(msg); }

function nodeCheck(file) {
  if (!exists(file)) return fail("Arquivo ausente para node --check: " + file);
  try {
    cp.execFileSync(process.execPath, ["--check", file], { cwd: root, stdio: "pipe" });
    ok("node --check " + file);
  } catch (err) {
    console.error(String(err.stdout || "") + String(err.stderr || ""));
    fail("node --check falhou: " + file);
  }
}

console.log("============================================================");
console.log(" Diagnóstico Noelle V19.7.6 Avatar Clean Carousel");
console.log("============================================================");

check(exists("package.json"), "package.json encontrado");
check(exists("main.js"), "main.js encontrado");
check(exists("preload.js"), "preload.js encontrado");
check(exists("iniciar.bat"), "iniciar.bat atualizado presente");
check(exists("src/avatar_carousel_v19_7_6.html"), "HTML limpo do carrossel presente");
check(exists("src/renderer/avatar_carousel_v19_7_6_app.js"), "Renderer do carrossel presente");
check(exists("src/renderer/noelle_avatar_clean_tab_v19_7_6.js"), "Bootstrap da aba limpa presente");
check(exists("scripts/build_avatar_carousel_v19_7_6_2026.cjs"), "Build script do carrossel presente");

if (exists("src/assets/avatar_manifest.json")) {
  try {
    const manifest = JSON.parse(read("src/assets/avatar_manifest.json"));
    const avatars = Array.isArray(manifest) ? manifest : Array.isArray(manifest.avatars) ? manifest.avatars : [];
    check(avatars.length > 0, "avatar_manifest.json possui " + avatars.length + " avatar(es)");
    for (const avatar of avatars) {
      const file = String(avatar.file || "").replace(/^\.\//, "");
      if (!file) fail("Avatar sem file no manifest");
      else if (!exists(path.join("src", file))) warn("Manifest aponta para arquivo não encontrado: src/" + file);
    }
  } catch (err) {
    fail("avatar_manifest.json inválido: " + err.message);
  }
} else {
  fail("src/assets/avatar_manifest.json ausente");
}

if (exists("src/avatar_carousel_v19_7_6.html")) {
  const html = read("src/avatar_carousel_v19_7_6.html");
  check(!/BroadcastChannel/i.test(html), "HTML limpo não mostra BroadcastChannel");
  check(!/Sincronizar Room/i.test(html), "HTML limpo não mostra Sincronizar Room");
  check(/setas ficam embaixo|prevAvatar|nextAvatar/i.test(html), "HTML contém setas embaixo do avatar");
}

if (exists("src/renderer/avatar_v19_5_panel_bootstrap.js")) {
  const old = read("src/renderer/avatar_v19_5_panel_bootstrap.js");
  check(!/Preview real do VRM V19\.5/i.test(old), "Painel técnico V19.5 não será recriado");
  check(/noelle_avatar_clean_tab_v19_7_6\.js/i.test(old), "Compatibilidade V19.5 redireciona para aba limpa");
}

if (exists("preload.js")) {
  const preload = read("preload.js");
  check(/NOELLE_V19_7_6_AVATAR_CLEAN_TAB/i.test(preload), "preload injeta Avatar limpo V19.7.6");
  check(!/avatar_v19_5_panel_bootstrap\.js/.test(preload), "preload não injeta mais painel técnico V19.5");
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    check(Boolean(pkg.scripts && pkg.scripts["build:avatar-carousel-v19.7.6"]), "package.json tem build:avatar-carousel-v19.7.6");
    check(Boolean(pkg.scripts && pkg.scripts["diagnostico:v19.7.6"]), "package.json tem diagnostico:v19.7.6");
  } catch (err) {
    fail("package.json inválido: " + err.message);
  }
}

nodeCheck("scripts/fix_mega_avatar_v19_7_6_2026.cjs");
nodeCheck("scripts/diagnostico_mega_avatar_v19_7_6_2026.cjs");
nodeCheck("scripts/build_avatar_carousel_v19_7_6_2026.cjs");
nodeCheck("src/renderer/noelle_avatar_clean_tab_v19_7_6.js");
nodeCheck("preload.js");

if (process.exitCode) {
  console.error("[ERRO] Diagnóstico V19.7.6 encontrou problemas.");
  process.exit(process.exitCode);
}
console.log("[OK] Diagnóstico V19.7.6 aprovado.");
