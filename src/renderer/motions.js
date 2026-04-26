import { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";

export async function loadMotionManifest() {
  const motions = await readJsonAssetLocal("assets/motion_manifest.json");
  const validated = await Promise.all(
    motions.map(async (motion) => {
      const rel = `assets/motions/${motion.file}`;
      const ok = await assetExistsLocal(rel);
      const assetUrl = ok ? await getAssetFileUrlLocal(rel) : null;
      return { motion: { ...motion, assetUrl }, ok };
    })
  );
  return validated.filter((x) => x.ok).map((x) => x.motion);
}

export function createMotionMap(motions) {
  const map = {};
  for (const motion of motions) {
    map[motion.id] = motion.assetUrl || motion.file;
  }
  return map;
}

export function describeMotion(motionId, motions) {
  const motion = Array.isArray(motions) ? motions.find((item) => item.id === motionId) : null;
  return motion ? motion.label : motionId;
}
