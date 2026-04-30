#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TAG = "v19_8_7_purge_legacy_avatar_2026";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", `${TAG}-${stamp}`);

function log(msg) { console.log(msg); }
function rel(p) { return path.relative(ROOT, p).replace(/\\/g, "/"); }
function exists(relPath) { return fs.existsSync(path.join(ROOT, relPath)); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }

function backupFile(absPath) {
  if (!fs.existsSync(absPath)) return;
  const dest = path.join(BACKUP_DIR, rel(absPath));
  ensureDir(path.dirname(dest));
  fs.copyFileSync(absPath, dest);
  log(`[OK] Backup: ${rel(absPath)} -> ${rel(dest)}`);
}

function backupAndDelete(absPath) {
  if (!fs.existsSync(absPath)) return false;
  const dest = path.join(BACKUP_DIR, rel(absPath));
  ensureDir(path.dirname(dest));
  if (fs.statSync(absPath).isDirectory()) {
    fs.cpSync(absPath, dest, { recursive: true });
    fs.rmSync(absPath, { recursive: true, force: true });
  } else {
    fs.copyFileSync(absPath, dest);
    fs.rmSync(absPath, { force: true });
  }
  log(`[OK] Removido do codigo ativo: ${rel(absPath)}  (backup em ${rel(dest)})`);
  return true;
}

function readText(relPath) {
  const abs = path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}
function writeText(relPath, text) {
  const abs = path.join(ROOT, relPath);
  ensureDir(path.dirname(abs));
  backupFile(abs);
  fs.writeFileSync(abs, text, "utf8");
  log(`[OK] Atualizado: ${relPath}`);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const r = rel(abs);
    if (/^(node_modules|\.git|backups|release|dist|out|build|\.venv|venv)(\/|$)/i.test(r)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function shouldPurgeFile(absPath) {
  const base = path.basename(absPath).toLowerCase();
  const r = rel(absPath).toLowerCase();
  if (!/\.(js|mjs|cjs|css|html|json)$/i.test(base)) return false;

  const exact = [
    "avatar_carousel_v19_7_6.bundle.js",
    "avatar_carousel_v19_7_5.bundle.js",
    "avatar_carousel_v19_7_4.bundle.js",
    "avatar_carousel_v19_7_3.bundle.js",
    "avatar_carousel_v19_7_2.bundle.js",
    "noelle_avatar_resize_guard_v19_8_3.js",
    "noelle_avatar_route_guard_v19_8_4.js",
    "noelle_avatar_overlay_killer_v19_8_5.js",
    "noelle_avatar_overlay_launcher_killer_v19_8_6.js"
  ];
  if (exact.includes(base)) return true;

  // Apaga somente arquivos de runtime/preview/carrossel legado, nao assets.
  if (/src\/renderer_dist\/avatar_carousel_v19_7_[0-9]+.*\.js$/.test(r)) return true;
  if (/src\/renderer\/(noelle_)?avatar_.*v19_7_[0-9]+.*\.(js|mjs|html)$/.test(r)) return true;
  if (/src\/renderer\/avatar_carousel.*v19_7_[0-9]+.*\.(js|mjs|html)$/.test(r)) return true;
  if (/src\/styles\/.*avatar.*v19_7_[0-9]+.*\.css$/.test(r)) return true;
  if (/src\/styles\/noelle_avatar_responsive_v19_8_3\.css$/.test(r)) return true;
  return false;
}

function purgeLegacyFiles() {
  const roots = ["src/renderer_dist", "src/renderer", "src/styles"].map((p) => path.join(ROOT, p));
  let count = 0;
  for (const root of roots) {
    for (const file of walk(root)) {
      if (shouldPurgeFile(file)) {
        if (backupAndDelete(file)) count++;
      }
    }
  }
  log(`[OK] Arquivos legados removidos do codigo ativo: ${count}`);
}

function cleanControlsHtml() {
  const relPath = "src/controls.html";
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) {
    log(`[AVISO] ${relPath} nao encontrado.`);
    return;
  }
  let text = fs.readFileSync(abs, "utf8");
  const before = text;

  // Remove tags de scripts/styles legadas que estavam criando a tela sobreposta.
  const legacyNamePattern = "(?:avatar_carousel_v19_7_[0-9]+|noelle_avatar_resize_guard_v19_8_3|noelle_avatar_route_guard_v19_8_4|noelle_avatar_overlay_killer_v19_8_5|noelle_avatar_overlay_launcher_killer_v19_8_6|avatar_v19_5_panel_bootstrap|noelle_v19_3_complete_ui_md|noelle_avatar_responsive_v19_8_3)";
  text = text.replace(new RegExp(`<script[^>]+src=[\\"'][^\\"']*${legacyNamePattern}[^\\"']*[\\"'][^>]*>\\s*</script>`, "gi"), "");
  text = text.replace(new RegExp(`<link[^>]+href=[\\"'][^\\"']*${legacyNamePattern}[^\\"']*[\\"'][^>]*>`, "gi"), "");

  // Remove blocos marcados de hotfixes V19.7/V19.8.3-V19.8.6.
  const markerPrefixes = [
    "NOELLE_V19_7",
    "NOELLE_V19_8_3",
    "NOELLE_V19_8_4",
    "NOELLE_V19_8_5",
    "NOELLE_V19_8_6"
  ];
  for (const marker of markerPrefixes) {
    text = text.replace(new RegExp(`<!--\\s*${marker}[^>]*BEGIN\\s*-->[\\s\\S]*?<!--\\s*${marker}[^>]*END\\s*-->`, "gi"), "");
  }

  // Remove chamadas diretas a bundles antigos, mesmo se estiverem dentro de JS inline.
  text = text.replace(/[^\n;]*avatar_carousel_v19_7_6\.bundle\.js[^\n;]*[;]?/gi, "");
  text = text.replace(/[^\n;]*avatar_carousel_v19_7_[0-9]+[^\n;]*[;]?/gi, "");
  text = text.replace(/[^\n;]*noelle_avatar_resize_guard_v19_8_3[^\n;]*[;]?/gi, "");
  text = text.replace(/[^\n;]*noelle_avatar_route_guard_v19_8_4[^\n;]*[;]?/gi, "");
  text = text.replace(/[^\n;]*noelle_avatar_overlay_(?:launcher_)?killer_v19_8_[56][^\n;]*[;]?/gi, "");

  if (text !== before) writeText(relPath, text);
  else log(`[OK] ${relPath} ja estava sem referencias ao carrossel legado.`);
}

function cleanPackageJson() {
  const relPath = "package.json";
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return log("[AVISO] package.json nao encontrado.");
  const raw = fs.readFileSync(abs, "utf8");
  let pkg;
  try { pkg = JSON.parse(raw); }
  catch (err) { return log(`[ERRO] package.json invalido: ${err.message}`); }
  pkg.version = "19.8.7-purge-legacy-avatar-2026";
  pkg.scripts = pkg.scripts && typeof pkg.scripts === "object" ? pkg.scripts : {};
  pkg.scripts["diagnostico:v19.8.7"] = "node scripts/diagnostico_v19_8_7_purge_legacy_avatar_2026.cjs";
  pkg.scripts["repair:v19.8.7"] = "node scripts/repair_v19_8_7_purge_legacy_avatar_2026.cjs";

  for (const key of Object.keys(pkg.scripts)) {
    const value = String(pkg.scripts[key] || "");
    if (/v19\.7\.6|avatar_carousel_v19_7_6|noelle_avatar_resize_guard_v19_8_3|overlay_killer_v19_8_[56]/i.test(key + " " + value)) {
      delete pkg.scripts[key];
      log(`[OK] Script antigo removido do package.json: ${key}`);
    }
  }
  writeText(relPath, JSON.stringify(pkg, null, 2) + "\n");
}

function updateMemoryNote() {
  const relPath = "MEMORIA_GPT_NOELLE.md";
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return;
  let text = fs.readFileSync(abs, "utf8");
  if (text.includes("V19.8.7 — Purge Avatar legado")) {
    log("[OK] MEMORIA_GPT_NOELLE.md ja contem nota V19.8.7.");
    return;
  }
  text += `\n\n## V19.8.7 — Purge Avatar legado\n- Removido do codigo ativo o carrossel/overlay antigo V19.7.6 que carregava \`avatar_carousel_v19_7_6.bundle.js\`.\n- A aba Avatar valida deve usar somente a implementacao V19.8.x atual, sem pílula flutuante \"Avatar Lab\" e sem runtime legado sobreposto.\n- Arquivos removidos sao copiados para \`backups/\` antes de sair do codigo ativo.\n`;
  writeText(relPath, text);
}

function main() {
  log("================================================================");
  log(" Noelle V19.8.7 - purge do Avatar legado V19.7.6");
  log("================================================================");
  ensureDir(BACKUP_DIR);
  purgeLegacyFiles();
  cleanControlsHtml();
  cleanPackageJson();
  updateMemoryNote();
  log("\n[OK] Purge V19.8.7 concluido.");
  log(`[OK] Backup: ${rel(BACKUP_DIR)}`);
  log("[INFO] Rode: node scripts\\diagnostico_v19_8_7_purge_legacy_avatar_2026.cjs");
}

try { main(); }
catch (err) {
  console.error("[ERRO] Falha no purge V19.8.7:", err);
  process.exit(1);
}
