"use strict";

/*
 Reconstrói manifests da Noelle preservando metadados existentes quando possível.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ASSETS = path.join(ROOT, "src", "assets");
const NOW = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP = path.join(ROOT, "backups", `manifests_${NOW}`);

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
  } catch (err) {
    console.warn(`[AVISO] JSON inválido em ${rel(file)}: ${err.message}`);
    return fallback;
  }
}

function backup(file) {
  if (!fs.existsSync(file)) return;
  const dest = path.join(BACKUP, rel(file));
  ensureDir(path.dirname(dest));
  if (!fs.existsSync(dest)) fs.copyFileSync(file, dest);
}

function writeJson(file, data) {
  backup(file);
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function titleFromName(name) {
  return String(name)
    .replace(/\.[^.]+$/, "")
    .replace(/^[0-9]+[_-]?/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim() || name;
}

function listFiles(dir, regex) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => regex.test(name))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function indexExisting(entries) {
  const map = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    const file = String(entry.file || entry.path || entry.src || "").replace(/\\/g, "/");
    const key = path.basename(file).toLowerCase();
    if (key) map.set(key, entry);
  }
  return map;
}

function buildManifest({ manifestFile, dirRel, regex, filePrefix = "", defaultKind = "" }) {
  const dir = path.join(ASSETS, dirRel);
  const existing = readJson(manifestFile, []);
  const byFile = indexExisting(existing);
  const files = listFiles(dir, regex);

  const entries = files.map((fileName) => {
    const prior = byFile.get(fileName.toLowerCase()) || {};
    const id = prior.id || path.basename(fileName, path.extname(fileName));
    const label = prior.label || prior.name || titleFromName(fileName);
    const file = filePrefix ? `${filePrefix}/${fileName}` : fileName;
    return {
      ...prior,
      id,
      label,
      file,
      kind: prior.kind || defaultKind || undefined
    };
  }).map((entry) => {
    if (entry.kind === undefined) delete entry.kind;
    return entry;
  });

  writeJson(manifestFile, entries);
  console.log(`[OK] ${rel(manifestFile)} (${entries.length})`);
  return entries.length;
}

function main() {
  ensureDir(ASSETS);

  const motionCount = buildManifest({
    manifestFile: path.join(ASSETS, "motion_manifest.json"),
    dirRel: "motions",
    regex: /\.vrma$/i,
    filePrefix: "motions",
    defaultKind: "motion"
  });

  const expressionCount = buildManifest({
    manifestFile: path.join(ASSETS, "expressions", "manifest.json"),
    dirRel: "expressions",
    regex: /\.png$/i,
    filePrefix: "",
    defaultKind: "expression"
  });

  const itemCount = buildManifest({
    manifestFile: path.join(ASSETS, "item_manifest.json"),
    dirRel: "items",
    regex: /\.(glb|gltf)$/i,
    filePrefix: "items",
    defaultKind: "item"
  });

  console.log(`[OK] Manifests atualizados: motions=${motionCount}, expressions=${expressionCount}, items=${itemCount}`);
}

main();
