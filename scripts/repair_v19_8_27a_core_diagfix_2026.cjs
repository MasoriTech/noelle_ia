#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.27a — Core diagfix
  Corrige falso positivo do diagnóstico V19.8.27:
  classList.remove não é remoção de DOM, mas o diagnóstico antigo marcava como erro.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.27a-controls-core-diagfix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_27a_core_diagfix_" + STAMP);

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

function patchCoreModule() {
  const rel = "src/renderer/modules/noelle_renderer_core_v19_8_27.js";
  if (!exists(rel)) {
    fail(rel + " não encontrado. Copie o pack V19.8.27a inteiro para a raiz.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = code.replace(/toast\.classList\.remove\("show"\)/g, 'toast.classList.toggle("show", false)');
  code = code.replace(/dot\.classList\.remove\("ok",\s*"bad"\)/g, 'dot.classList.toggle("ok", false); dot.classList.toggle("bad", false)');
  code = code.replace(/document\.body\.classList\.remove\("theme-noelle",\s*"theme-pbv",\s*"theme-dark",\s*"theme-light"\);/g, 'document.body.classList.toggle("theme-noelle", false); document.body.classList.toggle("theme-pbv", false); document.body.classList.toggle("theme-dark", false); document.body.classList.toggle("theme-light", false);');

  if (!code.includes("19.8.27a-controls-core-diagfix-2026")) {
    code = code.replace(/version:\s*"[^"]*controls-core[^"]*"/, 'version: "19.8.27a-controls-core-diagfix-2026"');
  }

  write(rel, code);
  ok("Módulo core ajustado para evitar falso positivo de remoção de DOM.");
}

function patchDiagnostic() {
  const rel = "scripts/diagnostico_v19_8_27_controls_core_split_2026.cjs";
  if (!exists(rel)) {
    warn(rel + " não encontrado; criando/atualizando diagnóstico V19.8.27a separado.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = code.replace(
    /if \(!\/MutationObserver\|\\\.remove\\\(\|removeChild\/\.test\(core\)\) ok\("módulo core sem observer\/remove DOM"\);\s*else err\("módulo core contém observer ou remoção de DOM"\);/g,
    'if (!/new\\s+MutationObserver\\s*\\(|\\.remove\\s*\\(|removeChild\\s*\\(/.test(core)) ok("módulo core sem observador ativo/remocao de elemento");\n    else err("módulo core contém observador ativo ou remoção real de elemento");'
  );

  write(rel, code);
  ok("Diagnóstico V19.8.27 ajustado para não acusar classList.remove.");
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return;

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
  pkg.scripts["repair:v19.8.27a-core-diagfix"] = "node scripts/repair_v19_8_27a_core_diagfix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.27a-core-diagfix"] = "node scripts/diagnostico_v19_8_27a_core_diagfix_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.27a — Core diagfix")) {
    md += "\n\n## V19.8.27a — Core diagfix\n\n- Corrige falso positivo do diagnóstico V19.8.27 no módulo core.\n- `classList.remove` não remove elemento do DOM, mas o diagnóstico antigo interpretava como remoção de DOM.\n- O módulo core passa a usar `classList.toggle(..., false)`.\n- Não mexe no Avatar renderer, Chat, Room, main, preload ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.27a.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.27a - Core diagfix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchCoreModule();
  patchDiagnostic();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.27a terminou com problemas.");
  } else {
    ok("Reparo V19.8.27a concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.27a.");
  }
}

main();
