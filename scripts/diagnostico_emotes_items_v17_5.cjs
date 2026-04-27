"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const ASSETS = path.join(SRC, "assets");

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }
function parseJson(rel, fallback) { try { return JSON.parse(read(rel)); } catch { return fallback; } }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function checkJs(rel) {
  if (!exists(rel)) return warn(rel + " não encontrado.");
  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (result.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    console.error(result.stderr || result.stdout);
  }
}

function normalizeMotionPath(file) {
  const clean = String(file || "").replace(/\\/g, "/").replace(/^assets\//, "").replace(/^motions\//, "");
  return path.join(ASSETS, "motions", clean);
}
function normalizeItemPath(file) {
  const clean = String(file || "").replace(/\\/g, "/").replace(/^assets\//, "").replace(/^items\//, "");
  return path.join(ASSETS, "items", clean);
}

console.log("============================================================");
console.log(" Diagnostico V17.5 - emotes/items path mapping");
console.log("============================================================");

checkJs("src/renderer/motions.js");
checkJs("src/renderer/items.js");
checkJs("main.js");

const motionsJs = read("src/renderer/motions.js");
if (motionsJs.includes("motionAssetCandidates") && motionsJs.includes("aliasKeys")) ok("motions.js aceita file com prefixo motions/ e aliases.");
else err("motions.js ainda não tem correção de mapping V17.5.");

const itemsJs = read("src/renderer/items.js");
if (itemsJs.includes("NOELLE_V17_5_ITEM_PATH_FIX") && itemsJs.includes("itemAssetCandidates")) ok("items.js aceita file com prefixo items/.");
else err("items.js ainda não tem correção de mapping V17.5.");

const motions = parseJson("src/assets/motion_manifest.json", []);
if (!Array.isArray(motions) || !motions.length) err("motion_manifest.json vazio/inválido.");
else {
  ok(`motion_manifest lista ${motions.length} motions.`);
  let missing = 0;
  for (const motion of motions) {
    const p = normalizeMotionPath(motion.file);
    if (!fs.existsSync(p)) {
      missing += 1;
      console.error("[ERRO] Motion não encontrada:", motion.id, "->", path.relative(ROOT, p));
    }
  }
  if (!missing) ok("Todos os .vrma do manifest foram encontrados sem duplicar motions/.");
}

const items = parseJson("src/assets/item_manifest.json", []);
if (!Array.isArray(items) || !items.length) err("item_manifest.json vazio/inválido.");
else {
  ok(`item_manifest lista ${items.length} items.`);
  let missing = 0;
  for (const item of items) {
    const p = normalizeItemPath(item.file);
    if (!fs.existsSync(p)) {
      missing += 1;
      console.error("[ERRO] Item não encontrado:", item.id, "->", path.relative(ROOT, p));
    }
  }
  if (!missing) ok("Todos os .glb do manifest foram encontrados sem duplicar items/.");
}

const expressions = parseJson("src/assets/expressions/manifest.json", []);
if (Array.isArray(expressions) && expressions.length) ok(`expressions manifest lista ${expressions.length} PNGs.`);
else warn("expressions manifest vazio/inválido.");

const main = read("main.js");
if (main.includes("resolveManifestAssetPath")) ok("main.js scanner de assets aceita prefixos de manifest.");
else warn("main.js não tem resolveManifestAssetPath; UI pode renderizar URL ruim em alguns cards.");

if (exists("scripts/bundle-renderers.mjs")) ok("bundle-renderers.mjs existe.");
else warn("bundle-renderers.mjs não encontrado.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
