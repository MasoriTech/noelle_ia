#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.25 — Root BAT cleanup
  Move .bat legados da raiz para legacy_bats/.
  Mantém iniciar.bat na raiz.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.25-root-bat-cleanup-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_25_root_bat_cleanup_" + STAMP);
const LEGACY_DIR = path.join(ROOT, "legacy_bats");

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function fail(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok("Backup: " + rel);
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

function uniqueDest(dest) {
  if (!fs.existsSync(dest)) return dest;

  const dir = path.dirname(dest);
  const ext = path.extname(dest);
  const base = path.basename(dest, ext);
  let i = 2;

  while (true) {
    const candidate = path.join(dir, base + "_" + i + ext);
    if (!fs.existsSync(candidate)) return candidate;
    i += 1;
  }
}

function moveLegacyBats() {
  const items = fs.readdirSync(ROOT, { withFileTypes: true });
  const bats = items
    .filter((item) => item.isFile())
    .map((item) => item.name)
    .filter(isLegacyBat)
    .sort((a, b) => a.localeCompare(b));

  fs.mkdirSync(LEGACY_DIR, { recursive: true });

  if (!bats.length) {
    ok("Nenhum .bat legado encontrado na raiz.");
    return [];
  }

  const moved = [];

  for (const name of bats) {
    const src = path.join(ROOT, name);
    const dest = uniqueDest(path.join(LEGACY_DIR, name));

    fs.renameSync(src, dest);
    moved.push({
      from: name,
      to: path.relative(ROOT, dest).replace(/\\/g, "/")
    });

    ok("Movido: " + name + " -> " + path.relative(ROOT, dest).replace(/\\/g, "/"));
  }

  return moved;
}

function writeLegacyReadme(moved) {
  const rel = "legacy_bats/README_LEGACY_BATS.md";
  const lines = [
    "# BATs legados",
    "",
    "Esta pasta guarda arquivos `.bat` antigos que já foram aplicados.",
    "",
    "A raiz do projeto deve manter apenas:",
    "",
    "```txt",
    "iniciar.bat",
    "```",
    "",
    "## Movidos pelo V19.8.25",
    ""
  ];

  if (!moved.length) {
    lines.push("Nenhum arquivo novo foi movido nesta execução.");
  } else {
    for (const item of moved) {
      lines.push("- `" + item.from + "` -> `" + item.to + "`");
    }
  }

  lines.push("");
  lines.push("Backup da execução:");
  lines.push("");
  lines.push("`" + path.relative(ROOT, BACKUP_DIR).replace(/\\/g, "/") + "`");
  lines.push("");

  write(rel, lines.join("\n"));
  ok(rel + " atualizado.");
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) {
    warn("package.json não encontrado.");
    return;
  }

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    fail("package.json inválido: " + err.message);
    return;
  }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["repair:v19.8.25-root-bat-cleanup"] = "node scripts/repair_v19_8_25_root_bat_cleanup_2026.cjs";
  pkg.scripts["diagnostico:v19.8.25-root-bat-cleanup"] = "node scripts/diagnostico_v19_8_25_root_bat_cleanup_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory(moved) {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.25 — Root BAT cleanup")) {
    md += "\n\n## V19.8.25 — Root BAT cleanup\n\n- Move `.bat` legados da raiz para `legacy_bats/`.\n- Mantém apenas `iniciar.bat` como arquivo `.bat` principal da raiz.\n- Arquivos movidos nesta execução: " + moved.length + ".\n- Não mexe em UI, Avatar, Chat, Room, renderer, preload ou assets.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.25.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.25 - Root BAT cleanup");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists("iniciar.bat")) {
    fail("iniciar.bat não encontrado. Não vou organizar .bat sem o principal existir.");
    return;
  }

  backup("iniciar.bat");

  const moved = moveLegacyBats();
  writeLegacyReadme(moved);
  patchPackageJson();
  patchMemory(moved);

  if (process.exitCode) {
    fail("Reparo V19.8.25 terminou com problemas.");
  } else {
    ok("Reparo V19.8.25 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico e depois confira git status.");
  }
}

main();
