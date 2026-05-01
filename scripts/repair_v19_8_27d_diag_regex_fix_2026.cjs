#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.27d — Diagnostic regex fix
  Corrige falso positivo do diagnóstico V19.8.27c.
  node --check já passa; o problema era a regex ampla demais.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.27d-diagnostic-regex-fix-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_27d_diag_regex_fix_" + STAMP);

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

function patchDiagnosticC() {
  const rel = "scripts/diagnostico_v19_8_27c_update_asset_summary_hardfix_2026.cjs";
  if (!exists(rel)) {
    warn(rel + " não encontrado; pulando.");
    return;
  }

  backup(rel);
  let code = read(rel);

  const oldLine = 'const broken = /function\\s+updateAssetSummary[\\s\\S]{0,240}\\}\\)\\s*\\{/.test(app);';
  const newLine = 'const broken = app.includes("function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {");';

  if (code.includes(oldLine)) {
    code = code.replace(oldLine, newLine);
    ok("Diagnóstico V19.8.27c: regex ampla trocada por busca literal segura.");
  } else if (code.includes(newLine)) {
    ok("Diagnóstico V19.8.27c já está corrigido.");
  } else {
    warn("Linha exata da regex antiga não encontrada; tentando fallback.");
    code = code.replace(
      /const\s+broken\s*=\s*\/function\\s\+updateAssetSummary[\s\S]*?\.test\(app\);/,
      newLine
    );
  }

  write(rel, code);
}

function createDiagnosticD() {
  const rel = "scripts/diagnostico_v19_8_27d_diag_regex_fix_2026.cjs";
  const content = `#!/usr/bin/env node
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
    if (res.stdout) console.log(res.stdout);
  }
}

console.log("================================================================");
console.log(" Diagnóstico V19.8.27d - Diagnostic regex fix");
console.log("================================================================");

[
  "src/renderer/controls_window_app.js",
  "src/renderer/modules/noelle_renderer_core_v19_8_27.js",
  "scripts/repair_v19_8_27d_diag_regex_fix_2026.cjs",
  "scripts/diagnostico_v19_8_27d_diag_regex_fix_2026.cjs"
].forEach(nodeCheck);

if (exists("src/renderer/controls_window_app.js")) {
  const app = read("src/renderer/controls_window_app.js");

  const exactBroken = "function updateAssetSummary(counts = {}) { return window.NoelleRendererCoreV19827?.updateAssetSummary?.(counts); }) {";

  if (app.includes(exactBroken)) err("Padrão literal quebrado ainda existe em updateAssetSummary");
  else ok("Padrão literal quebrado ausente");

  if (/function\\s+updateAssetSummary\\s*\\(\\s*counts\\s*=\\s*\\{\\}\\s*\\)\\s*\\{\\s*return\\s+window\\.NoelleRendererCoreV19827\\?\\.updateAssetSummary\\?\\.\\(counts\\);\\s*\\}/.test(app)) {
    ok("updateAssetSummary está como stub correto");
  } else {
    err("updateAssetSummary não está como stub correto");
  }

  if (app.includes("NoelleRendererCoreV19827")) ok("controls_window_app usa módulo core");
  else err("controls_window_app não usa módulo core");

  if (app.includes("NOELLE_V19_8_27C_UPDATE_ASSET_SUMMARY_HARDFIX")) ok("marcador V19.8.27c presente");
  else warn("marcador V19.8.27c não encontrado");
}

if (exists("package.json")) {
  try {
    const pkg = JSON.parse(read("package.json"));
    if (pkg.version === "19.8.27d-diagnostic-regex-fix-2026") ok("package.json version V19.8.27d");
    else warn("package.json version diferente: " + (pkg.version || "(sem version)"));
  } catch (e) {
    err("package.json inválido: " + e.message);
  }
}

if (process.exitCode) err("Diagnóstico V19.8.27d encontrou problemas.");
else ok("Diagnóstico V19.8.27d aprovado.");
`;
  write(rel, content);
  ok(rel + " criado.");
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
  pkg.scripts["repair:v19.8.27d-diag-regex-fix"] = "node scripts/repair_v19_8_27d_diag_regex_fix_2026.cjs";
  pkg.scripts["diagnostico:v19.8.27d-diag-regex-fix"] = "node scripts/diagnostico_v19_8_27d_diag_regex_fix_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  if (!md.includes("V19.8.27d — Diagnostic regex fix")) {
    md += "\n\n## V19.8.27d — Diagnostic regex fix\n\n- Corrige falso positivo do diagnóstico V19.8.27c.\n- `node --check` já passava, mas a regex do diagnóstico era ampla demais e acusava `updateAssetSummary` quebrado mesmo com sintaxe válida.\n- O diagnóstico agora procura apenas o padrão literal quebrado `}) {` da linha antiga.\n- Não mexe em Avatar, Chat, Room, main, preload ou renderer_dist.\n";
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.27d.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.27d - Diagnostic regex fix");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchDiagnosticC();
  createDiagnosticD();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.27d terminou com problemas.");
  } else {
    ok("Reparo V19.8.27d concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.27d.");
  }
}

main();
