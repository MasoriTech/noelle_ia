"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");

function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function readJson(file, fallback) { try { return exists(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; } }
function writeJson(file, value) { ensureDir(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8"); }
function labelFromName(name) { return path.basename(name, path.extname(name)).replace(/^\d+[_-]?/, "").replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }
function scan(dir, exts) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => exts.includes(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: path.basename(name, path.extname(name)).replace(/[^a-zA-Z0-9_-]+/g, "_"), label: labelFromName(name), file: name }));
}
function mergeByFile(existing, scanned) {
  const old = Array.isArray(existing) ? existing : Array.isArray(existing?.items) ? existing.items : Array.isArray(existing?.motions) ? existing.motions : Array.isArray(existing?.expressions) ? existing.expressions : [];
  const map = new Map();
  for (const item of old) {
    if (!item || typeof item !== "object") continue;
    const key = String(item.file || item.path || item.name || item.id || "");
    if (key) map.set(path.basename(key).toLowerCase(), item);
  }
  return scanned.map((item) => ({ ...(map.get(item.file.toLowerCase()) || {}), ...item }));
}
function main() {
  const expressionsDir = path.join(ASSETS, "expressions");
  const motionsDir = path.join(ASSETS, "motions");
  const itemsDir = path.join(ASSETS, "items");
  ensureDir(expressionsDir); ensureDir(motionsDir); ensureDir(itemsDir);
  const expressionsFile = path.join(expressionsDir, "manifest.json");
  const motionsFile = path.join(ASSETS, "motion_manifest.json");
  const itemsFile = path.join(ASSETS, "item_manifest.json");
  const expressions = mergeByFile(readJson(expressionsFile, []), scan(expressionsDir, [".png", ".webp", ".jpg", ".jpeg"]));
  const motions = mergeByFile(readJson(motionsFile, []), scan(motionsDir, [".vrma", ".vmd"]));
  const items = mergeByFile(readJson(itemsFile, []), scan(itemsDir, [".glb", ".gltf", ".vrm"]));
  writeJson(expressionsFile, expressions);
  writeJson(motionsFile, motions);
  writeJson(itemsFile, items);
  console.log(`[OK] expressions: ${expressions.length}`);
  console.log(`[OK] motions: ${motions.length}`);
  console.log(`[OK] items: ${items.length}`);
  if (!exists(path.join(ASSETS, "Noelle.vrm"))) console.log(`[AVISO] src/assets/Noelle.vrm não encontrado.`);
}
main();
