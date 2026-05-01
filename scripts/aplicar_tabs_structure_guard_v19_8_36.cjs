/* eslint-disable no-console */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "v19.8.36";
const SRC_MODULE = path.join(__dirname, "..", "src", "renderer", "modules", "noelle_tabs_structure_guard_v19_8_36.js");
const DST_MODULE = path.join(ROOT, "src", "renderer", "modules", "noelle_tabs_structure_guard_v19_8_36.js");
const SCRIPT_TAG = '<script src="./renderer/modules/noelle_tabs_structure_guard_v19_8_36.js" defer></script>';
const SCRIPT_TAG_ALT = '<script src="renderer/modules/noelle_tabs_structure_guard_v19_8_36.js" defer></script>';

function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function backup(file) {
  if (!exists(file)) return null;
  const backupDir = path.join(ROOT, "backups", `tabs_structure_guard_${VERSION}_${Date.now()}`);
  mkdirp(backupDir);
  const rel = path.relative(ROOT, file).replace(/[\\/:]/g, "__");
  const out = path.join(backupDir, rel);
  fs.copyFileSync(file, out);
  return out;
}
function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, txt) { fs.writeFileSync(file, txt, "utf8"); }

function patchHtml(file) {
  let txt = read(file);
  if (txt.includes("noelle_tabs_structure_guard_v19_8_36.js")) return false;
  backup(file);
  const relDepth = path.relative(path.dirname(file), path.join(ROOT, "src")).split(path.sep).filter(Boolean).length;
  const tag = relDepth === 0 ? SCRIPT_TAG : SCRIPT_TAG_ALT;
  if (/<\/body>/i.test(txt)) txt = txt.replace(/<\/body>/i, `  ${tag}\n</body>`);
  else txt += `\n${tag}\n`;
  write(file, txt);
  return true;
}

function findHtmlFiles(dir) {
  const out = [];
  if (!exists(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (["node_modules", "release", ".git", "backups"].includes(name)) continue;
      out.push(...findHtmlFiles(p));
    } else if (/\.html?$/i.test(name)) {
      out.push(p);
    }
  }
  return out;
}

function looksLikeMainHtml(file) {
  const txt = read(file);
  return /data-target|data-page|nav-item|sidebar|Chat IA|Principal|Stream/i.test(txt);
}

function main() {
  if (!exists(path.join(ROOT, "package.json")) || !exists(path.join(ROOT, "src"))) {
    console.error("[ERRO] Rode este script na raiz do projeto noelle_ia, onde ficam package.json e src.");
    process.exit(1);
  }
  mkdirp(path.dirname(DST_MODULE));
  fs.copyFileSync(SRC_MODULE, DST_MODULE);
  console.log("[OK] Modulo instalado:", path.relative(ROOT, DST_MODULE));

  const htmlFiles = findHtmlFiles(path.join(ROOT, "src")).filter(looksLikeMainHtml);
  let patched = 0;
  for (const f of htmlFiles) {
    if (patchHtml(f)) {
      patched += 1;
      console.log("[OK] HTML reforcado:", path.relative(ROOT, f));
    }
  }
  if (!patched) console.log("[INFO] Nenhum HTML novo precisava de injecao, ou o guard ja estava injetado.");

  try {
    require("child_process").execFileSync(process.execPath, ["--check", DST_MODULE], { stdio: "inherit" });
    console.log("[OK] node --check do guard passou.");
  } catch (err) {
    console.error("[ERRO] node --check falhou no guard.");
    process.exit(1);
  }

  console.log("\n[OK] Patch de estrutura das abas aplicado.");
  console.log("Abra o app e teste: Principal -> Chat IA -> Stream -> Principal.");
}
main();
