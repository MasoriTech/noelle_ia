"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(
  ROOT,
  "backups",
  "v19_7_3_fix_build_regex_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)
);

const BUILD_CONTENT = String.raw`"use strict";
const fs = require("fs");
const path = require("path");

let esbuild;
try {
  esbuild = require("esbuild");
} catch (err) {
  console.error("[ERRO] esbuild nao encontrado. Rode: npm install");
  process.exit(1);
}

const ROOT = process.cwd();
const srcFile = path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js");
const outFile = path.join(ROOT, "src", "renderer_dist", "avatar_lab_v19_6.bundle.js");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function log(msg) {
  console.log(msg);
}

function hasTopLevelAwaitBug(code) {
  const reMotion = new RegExp("(^|\\n)\\s*await\\s+loadMotionManifest\\s*\\(");
  const reAvatar = new RegExp("(^|\\n)\\s*await\\s+loadAvatar\\s*\\(");
  return reMotion.test(code) || reAvatar.test(code);
}

async function main() {
  if (!fs.existsSync(srcFile)) {
    throw new Error("Arquivo nao encontrado: " + srcFile);
  }

  const code = fs.readFileSync(srcFile, "utf8");
  if (hasTopLevelAwaitBug(code)) {
    throw new Error("Top-level await detectado em avatar_lab_v19_6_app.js. Rode o patch V19.7.3 antes do build iife.");
  }

  ensureDir(path.dirname(outFile));
  await esbuild.build({
    entryPoints: [srcFile],
    bundle: true,
    outfile: outFile,
    platform: "browser",
    format: "iife",
    target: ["chrome120"],
    sourcemap: false,
    legalComments: "none",
    logLevel: "info"
  });

  const size = fs.statSync(outFile).size;
  log("[OK] Bundle Avatar Preview gerado: " + path.relative(ROOT, outFile) + " (" + size + " bytes)");
}

main().catch((err) => {
  console.error("[ERRO] Build Avatar Preview falhou:", err && err.message ? err.message : err);
  process.exit(1);
});
`;

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}
function exists(file) { return fs.existsSync(file); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, content, "utf8");
  console.log("[OK] Atualizado: " + rel(file));
}
function backup(file) {
  if (!exists(file)) return;
  const dest = path.join(BACKUP_ROOT, path.relative(ROOT, file));
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
}
function writeWithBackup(file, content) {
  backup(file);
  write(file, content);
}
function run(cmd, args) {
  const r = cp.spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: false });
  return r.status === 0;
}

function patchBuildScript() {
  writeWithBackup(path.join(ROOT, "scripts", "build_avatar_lab_v19_6_2026.cjs"), BUILD_CONTENT);
}

function patchApplyV1972() {
  const target = path.join(ROOT, "scripts", "apply_v19_7_2_avatar_focus_carousel_2026.cjs");
  if (!exists(target)) return;
  const source = read(target);
  const pattern = /const buildScript = `[\s\S]*?`;\s*\n\s*const diagnosticScript =/m;
  if (!pattern.test(source)) {
    console.log("[AVISO] Nao achei buildScript interno do apply V19.7.2 para atualizar.");
    return;
  }
  const replacement = "const buildScript = " + JSON.stringify(BUILD_CONTENT) + ";\n\nconst diagnosticScript =";
  writeWithBackup(target, source.replace(pattern, replacement));
}

function patchOldApplyV196() {
  const target = path.join(ROOT, "scripts", "apply_v19_6_avatar_lab_isolated_2026.cjs");
  if (!exists(target)) return;
  let source = read(target);
  if (/fix_v19_7_3_build_regex_2026\.cjs/.test(source)) return;
  source += "\n\n// V19.7.3: remendo defensivo para manter build iife valido.\n";
  source += "try { require('child_process').spawnSync(process.execPath, ['scripts/fix_v19_7_3_build_regex_2026.cjs', '--ensure'], { cwd: process.cwd(), stdio: 'inherit' }); } catch {}\n";
  writeWithBackup(target, source);
}

function patchPackageJson() {
  const file = path.join(ROOT, "package.json");
  if (!exists(file)) return;
  let pkg;
  try { pkg = JSON.parse(read(file)); }
  catch (err) { console.log("[AVISO] package.json invalido: " + err.message); return; }
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["build:avatar-lab-v19.6"] = "node scripts/build_avatar_lab_v19_6_2026.cjs";
  pkg.scripts["diagnostico:v19.7.3-build-regex"] = "node scripts/diagnostico_v19_7_3_build_regex_2026.cjs";
  writeWithBackup(file, JSON.stringify(pkg, null, 2) + "\n");
}

function patchMemory() {
  const file = path.join(ROOT, "MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) return;
  let text = read(file);
  if (/V19\.7\.3 Build Regex/i.test(text)) return;
  text += "\n\n## V19.7.3 Build Regex / Avatar Focus\n";
  text += "- Corrige SyntaxError de regex quebrada em scripts/build_avatar_lab_v19_6_2026.cjs.\n";
  text += "- O iniciar.bat deve rodar fix/diagnostico antes de iniciar.\n";
  writeWithBackup(file, text);
}

function checkFile(file) {
  if (!exists(path.join(ROOT, file))) {
    console.log("[AVISO] Nao encontrado: " + file);
    return false;
  }
  console.log("[CHECK] node --check " + file);
  return run(process.execPath, ["--check", file]);
}

function main() {
  console.log("============================================================");
  console.log(" Noelle/Yoru V19.7.3 - fix SyntaxError regex do build");
  console.log("============================================================");

  if (!exists(path.join(ROOT, "package.json"))) {
    console.log("[ERRO] Rode na raiz do projeto noelle_ia.");
    process.exit(1);
  }

  ensureDir(BACKUP_ROOT);
  patchBuildScript();
  patchApplyV1972();
  patchOldApplyV196();
  patchPackageJson();
  patchMemory();

  const okBuild = checkFile("scripts/build_avatar_lab_v19_6_2026.cjs");
  const okDiag = checkFile("scripts/diagnostico_v19_7_3_build_regex_2026.cjs");
  if (exists(path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js"))) {
    checkFile("src/renderer/avatar_lab_v19_6_app.js");
  }

  if (!okBuild || !okDiag) {
    console.log("[ERRO] Algum node --check falhou.");
    process.exit(1);
  }

  console.log("[OK] Fix V19.7.3 aplicado. Backup em: " + rel(BACKUP_ROOT));
}

main();
