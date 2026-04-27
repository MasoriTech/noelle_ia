import { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";

function cleanAssetPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
}

function filenameStem(value) {
  const clean = cleanAssetPath(value).split(/[?#]/)[0];
  const name = clean.split("/").pop() || clean;
  return name.replace(/\.[^.]+$/, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function motionAssetCandidates(file) {
  const clean = cleanAssetPath(file);
  const noAssets = clean.replace(/^assets\//i, "");
  const noMotions = noAssets.replace(/^motions\//i, "");

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
