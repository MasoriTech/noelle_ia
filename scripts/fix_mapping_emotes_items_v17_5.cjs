"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, "backups", "v17_5_mapping_assets_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19));

function abs(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) { return fs.readFileSync(abs(rel), "utf8"); }
function write(rel, text) { fs.mkdirSync(path.dirname(abs(rel)), { recursive: true }); fs.writeFileSync(abs(rel), text, "utf8"); }
function log(msg) { console.log(msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function fail(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function backup(rel) {
  if (!exists(rel)) return;
  const dst = path.join(BACKUP_ROOT, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(abs(rel), dst);
}

function backupAndWrite(rel, text) {
  backup(rel);
  write(rel, text);
  log("[OK] Atualizado: " + rel);
}

function findFunctionRange(text, name) {
  const patterns = [
    `export async function ${name}`,
    `export function ${name}`,
    `function ${name}`
  ];
  let start = -1;
  for (const p of patterns) {
    start = text.indexOf(p);
    if (start >= 0) break;
  }
  if (start < 0) return null;
  const brace = text.indexOf("{", start);
  if (brace < 0) return null;
  let depth = 0;
  for (let i = brace; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return [start, i + 1];
    }
  }
  return null;
}

function replaceFunction(text, name, replacement) {
  const range = findFunctionRange(text, name);
  if (!range) {
    warn("Função não encontrada: " + name);
    return text;
  }
  return text.slice(0, range[0]) + replacement + text.slice(range[1]);
}

function runCheck(rel) {
  if (!exists(rel)) return true;
  const result = cp.spawnSync(process.execPath, ["--check", abs(rel)], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(result.stdout || "");
    console.error(result.stderr || "");
    fail("node --check falhou: " + rel);
    return false;
  }
  log("[OK] node --check " + rel);
  return true;
}

function patchMotionsJs() {
  const rel = "src/renderer/motions.js";
  if (!exists(rel)) return fail("src/renderer/motions.js não encontrado.");

  const text = `import { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";

function cleanAssetPath(value) {
  return String(value || "").replace(/\\\\/g, "/").replace(/^\\.\\//, "").replace(/^\\/+/, "").trim();
}

function filenameStem(value) {
  const clean = cleanAssetPath(value).split(/[?#]/)[0];
  const name = clean.split("/").pop() || clean;
  return name.replace(/\\.[^.]+$/, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function motionAssetCandidates(file) {
  const clean = cleanAssetPath(file);
  const noAssets = clean.replace(/^assets\\//i, "");
  const noMotions = noAssets.replace(/^motions\\//i, "");

  return unique([
    clean.startsWith("assets/") ? clean : null,
    clean.startsWith("motions/") ? "assets/" + clean : null,
    "assets/motions/" + noMotions,
    "assets/" + noAssets
  ]);
}

async function resolveMotionAsset(file) {
  const candidates = motionAssetCandidates(file);
  for (const rel of candidates) {
    try {
      if (await assetExistsLocal(rel)) {
        return { rel, url: await getAssetFileUrlLocal(rel) };
      }
    } catch {}
  }
  return { rel: candidates[0] || String(file || ""), url: null };
}

function aliasKeys(motion) {
  const fileStem = filenameStem(motion.file || motion.assetRel || "");
  const id = String(motion.id || fileStem || "").trim();
  const label = String(motion.label || "").trim();
  return unique([
    id,
    id.toLowerCase(),
    fileStem,
    fileStem.toLowerCase(),
    label,
    label.toLowerCase(),
    cleanAssetPath(motion.file || ""),
    cleanAssetPath(motion.assetRel || "")
  ]);
}

export async function loadMotionManifest() {
  const raw = await readJsonAssetLocal("assets/motion_manifest.json");
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.motions) ? raw.motions : [];
  const validated = [];

  for (const entry of list) {
    const file = entry.file || entry.path || entry.name || "";
    const resolved = await resolveMotionAsset(file);
    if (!resolved.url) {
      console.warn("[Noelle] Motion ignorada porque o arquivo não foi encontrado:", entry.id || file, motionAssetCandidates(file));
      continue;
    }

    const id = String(entry.id || filenameStem(file)).trim();
    validated.push({
      ...entry,
      id,
      label: entry.label || id,
      file,
      assetRel: resolved.rel,
      assetUrl: resolved.url,
      aliases: aliasKeys({ ...entry, id, file, assetRel: resolved.rel })
    });
  }

  return validated;
}

export function createMotionMap(motions) {
  const map = {};
  for (const motion of Array.isArray(motions) ? motions : []) {
    const target = motion.assetUrl || motion.assetRel || motion.file;
    for (const key of aliasKeys(motion)) {
      if (key) map[key] = target;
    }
  }
  return map;
}

export function describeMotion(motionId, motions) {
  const key = String(motionId || "").toLowerCase();
  const motion = Array.isArray(motions)
    ? motions.find((item) => aliasKeys(item).some((alias) => String(alias || "").toLowerCase() === key))
    : null;
  return motion ? motion.label : motionId;
}
`;

  backupAndWrite(rel, text);
}

function patchItemsJs() {
  const rel = "src/renderer/items.js";
  if (!exists(rel)) return fail("src/renderer/items.js não encontrado.");
  let text = read(rel);

  const replacement = `// NOELLE_V17_5_ITEM_PATH_FIX
function cleanItemAssetPath(value) {
  return String(value || "").replace(/\\\\/g, "/").replace(/^\\.\\//, "").replace(/^\\/+/, "").trim();
}
function uniqueItemPaths(values) {
  return [...new Set(values.filter(Boolean))];
}
function itemAssetCandidates(file) {
  const clean = cleanItemAssetPath(file);
  const noAssets = clean.replace(/^assets\\//i, "");
  const noItems = noAssets.replace(/^items\\//i, "");
  return uniqueItemPaths([
    clean.startsWith("assets/") ? clean : null,
    clean.startsWith("items/") ? "assets/" + clean : null,
    "assets/items/" + noItems,
    "assets/" + noAssets
  ]);
}
function thumbnailAssetCandidates(file) {
  const clean = cleanItemAssetPath(file);
  const noAssets = clean.replace(/^assets\\//i, "");
  const noItems = noAssets.replace(/^items\\//i, "");
  return uniqueItemPaths([
    clean.startsWith("assets/") ? clean : null,
    clean.startsWith("items/") ? "assets/" + clean : null,
    clean.startsWith("thumbnails/") ? "assets/items/" + clean : null,
    "assets/items/" + noItems,
    "assets/" + noAssets
  ]);
}
async function resolveFirstLocalAsset(candidates) {
  for (const rel of candidates) {
    try {
      if (await assetExistsLocal(rel)) return { rel, url: await getAssetFileUrlLocal(rel) };
    } catch {}
  }
  return { rel: candidates[0] || "", url: null };
}
export async function loadItemManifest() {
  const raw = await readJsonAssetLocal("assets/item_manifest.json");
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const validated = [];

  for (const item of items) {
    const file = item.file || item.path || item.name || "";
    const resolvedFile = await resolveFirstLocalAsset(itemAssetCandidates(file));
    const thumbRel = item.thumbnail ? await resolveFirstLocalAsset(thumbnailAssetCandidates(item.thumbnail)) : { rel: null, url: null };

    if (!resolvedFile.url) {
      console.warn("[Noelle] Item ignorado porque o arquivo não foi encontrado:", item.id || file, itemAssetCandidates(file));
      continue;
    }

    validated.push({
      ...item,
      id: item.id || String(file).split("/").pop().replace(/\\.[^.]+$/, ""),
      supported_modes: item.supported_modes || [],
      __available: true,
      assetRel: resolvedFile.rel,
      assetUrl: resolvedFile.url,
      thumbnailUrl: thumbRel.url,
      thumbnail: thumbRel.url ? item.thumbnail : null
    });
  }

  return validated;
}`;

  text = replaceFunction(text, "loadItemManifest", replacement);
  backupAndWrite(rel, text);
}

function patchMainMakeAssetEntry() {
  const rel = "main.js";
  if (!exists(rel)) {
    warn("main.js não encontrado; pulando ajuste do scanner de assets.");
    return;
  }
  let text = read(rel);

  if (!text.includes("function makeAssetEntry")) {
    warn("makeAssetEntry não encontrado em main.js; pulando.");
    return;
  }

  const replacement = `function resolveManifestAssetPath(baseDir, file, kind) {
  const clean = String(file || "").replace(/\\\\/g, "/").replace(/^\\.\\//, "").replace(/^\\/+/, "").trim();
  if (!clean) return baseDir;
  if (path.isAbsolute(clean)) return clean;
  if (clean.startsWith("assets/")) return path.join(SRC_DIR, clean);
  if (clean.startsWith("motions/") || clean.startsWith("expressions/") || clean.startsWith("items/") || clean.startsWith("avatars/")) return path.join(ASSETS_DIR, clean);
  return path.join(baseDir, clean);
}
function makeAssetEntry(entry, baseDir, fallbackKind) {
  const file = String(entry.file || entry.path || entry.name || "").trim();
  const filePath = resolveManifestAssetPath(baseDir, file, fallbackKind);
  const idBase = String(entry.id || path.basename(filePath, path.extname(filePath)) || entry.label || fallbackKind);
  const id = idBase.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const label = String(entry.label || entry.title || entry.name || id).replace(/[_-]+/g, " ");
  const rel = path.relative(ROOT_DIR, filePath).replace(/\\\\/g, "/");
  return { id, label, file: file || path.basename(filePath), abs: filePath, rel, url: toFileUrl(filePath), exists: fileExists(filePath), kind: fallbackKind, meta: entry };
}`;

  text = replaceFunction(text, "makeAssetEntry", replacement);
  backupAndWrite(rel, text);
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let text = read(rel);
  if (!text.includes("Manifest file pode vir com prefixo motions/ ou items/")) {
    text += `

## Nota V17.5 — Manifest com prefixo de pasta

Os manifests podem listar arquivos assim:

\`\`\`json
{ "file": "motions/003_humidai.vrma" }
{ "file": "items/basketball.glb" }
\`\`\`

Os loaders NÃO podem montar caminho duplicado:

\`\`\`txt
assets/motions/motions/003_humidai.vrma
assets/items/items/basketball.glb
\`\`\`

O loader correto deve aceitar ambos:

\`\`\`txt
003_humidai.vrma
motions/003_humidai.vrma
assets/motions/003_humidai.vrma
\`\`\`

e resolver para:

\`\`\`txt
assets/motions/003_humidai.vrma
\`\`\`

O mesmo vale para items e thumbnails.
`;
    backupAndWrite(rel, text);
  }
}

function rebuildBundlesIfPossible() {
  if (!exists("scripts/bundle-renderers.mjs")) {
    warn("scripts/bundle-renderers.mjs não encontrado.");
    return;
  }
  if (!exists("node_modules/esbuild")) {
    warn("esbuild não encontrado em node_modules; pulando rebuild de renderer_dist.");
    return;
  }
  const result = cp.spawnSync(process.execPath, ["scripts/bundle-renderers.mjs"], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    warn("Rebuild de renderer_dist falhou:");
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return;
  }
  log("[OK] renderer_dist regenerado.");
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  patchMotionsJs();
  patchItemsJs();
  patchMainMakeAssetEntry();
  patchMemory();

  runCheck("src/renderer/motions.js");
  runCheck("src/renderer/items.js");
  if (exists("main.js")) runCheck("main.js");
  runCheck("scripts/diagnostico_emotes_items_v17_5.cjs");

  rebuildBundlesIfPossible();

  log("");
  log("[OK] V17.5 aplicada.");
  log("[INFO] Teste todos os emotes e items. O erro 'Motion não mapeada' deve sumir.");
}

if (process.argv.includes("--apply")) {
  apply();
} else {
  console.log("Uso: node scripts/fix_mapping_emotes_items_v17_5.cjs --apply");
}
