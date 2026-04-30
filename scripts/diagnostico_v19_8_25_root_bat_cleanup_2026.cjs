#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function err(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }

function nodeCheck(rel) {
  if (!exists(rel)) return err(rel + " não encontrado");
  const res = spawnSync(process.execPath, ["--check", full(rel)], { encoding: "utf8" });
  if (res.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    if (res.stderr) console.log(res.stderr);
  }
}

function isLegacyBat(fileName) {
  const lower = fileName.toLowerCase();

  if (!lower.endsWith(".bat")) return false;
  if (lower === "iniciar.bat") return false;

  return (
    lower.startsWith("aplicar_") ||
    lower.startsWith("rodar_diagnostico_") ||
    lower.startsWith("rodar_diagnóstico_") ||
    lower.startsWith("fix_") ||
    lower.startsWith("repair_") ||
    lower.startsWith("corrigir_") ||
    lower.startsWith("diagnostico_") ||
    lower.startsWith("diagnóstico_")
  );
}

function main() {
  log("================================================================");
  log(" Diagnóstico V19.8.25 - Root BAT cleanup");
  log("================================================================");

  nodeCheck("scripts/repair_v19_8_25_root_bat_cleanup_2026.cjs");
  nodeCheck("scripts/diagnostico_v19_8_25_root_bat_cleanup_2026.cjs");

  if (exists("iniciar.bat")) ok("iniciar.bat está na raiz");
  else err("iniciar.bat não está na raiz");

  const rootBats = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((item) => item.isFile() && item.name.toLowerCase().endsWith(".bat"))
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b));

  const legacyStillRoot = rootBats.filter(isLegacyBat);
  const unexpectedRootBats = rootBats.filter((name) => name.toLowerCase() !== "iniciar.bat" && !isLegacyBat(name));

  if (legacyStillRoot.length) {
    err("Ainda existem .bat legados na raiz: " + legacyStillRoot.join(", "));
  } else {
    ok("Nenhum .bat legado conhecido na raiz");
  }

  if (unexpectedRootBats.length) {
    warn("Existem outros .bat não classificados na raiz: " + unexpectedRootBats.join(", "));
  }

  if (exists("legacy_bats")) {
    ok("legacy_bats/ existe");
    if (exists("legacy_bats/README_LEGACY_BATS.md")) ok("legacy_bats/README_LEGACY_BATS.md existe");
    else warn("legacy_bats/README_LEGACY_BATS.md não encontrado");
  } else {
    warn("legacy_bats/ ainda não existe");
  }

  if (exists("package.json")) {
    try {
      const pkg = JSON.parse(read("package.json"));
      if (pkg.version === "19.8.25-root-bat-cleanup-2026") ok("package.json version V19.8.25");
      else warn("package.json version diferente: " + (pkg.version || "(sem version)"));

      if (pkg.scripts && pkg.scripts["repair:v19.8.25-root-bat-cleanup"]) ok("package.json contém repair V19.8.25");
      else warn("package.json sem repair V19.8.25");
    } catch (e) {
      err("package.json inválido: " + e.message);
    }
  }

  if (process.exitCode) err("Diagnóstico V19.8.25 encontrou problemas.");
  else ok("Diagnóstico V19.8.25 aprovado.");
}

main();
