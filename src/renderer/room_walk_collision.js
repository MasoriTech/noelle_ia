import * as THREE from "three";
import { ROOM_LIMITS, getWorldBox } from "./room_collision.js";

export function isWalkBlockingEntry(entry) {
  if (!entry?.object || !entry?.item) return false;
  const category = String(entry.item.category || "").toLowerCase();
  const canCollide = entry.item.placement?.canCollide !== false;
  return canCollide && (category === "furniture" || category === "scene_prop" || category === "floor_prop");
}

function circleIntersectsBoxXZ(center, radius, box) {
  const nearestX = Math.max(box.min.x, Math.min(center.x, box.max.x));
  const nearestZ = Math.max(box.min.z, Math.min(center.z, box.max.z));
  const dx = center.x - nearestX;
  const dz = center.z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function canPlayerStandAt(position, entries, radius = 0.28) {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return false;
  if (position.x < ROOM_LIMITS.minX + radius || position.x > ROOM_LIMITS.maxX - radius) return false;
  if (position.z < ROOM_LIMITS.minZ + radius || position.z > ROOM_LIMITS.maxZ - radius) return false;

  for (const entry of entries || []) {
    if (!isWalkBlockingEntry(entry)) continue;
    const box = getWorldBox(entry.object);
    if (!box) continue;
    if (box.min.y > 1.65 || box.max.y < 0.05) continue;
    if (circleIntersectsBoxXZ(position, radius, box)) return false;
  }
  return true;
}

export function moveWithSliding({ current, delta, entries, radius = 0.28 }) {
  const next = current.clone();

  const tryX = next.clone();
  tryX.x += delta.x;
  if (canPlayerStandAt(tryX, entries, radius)) next.x = tryX.x;

  const tryZ = next.clone();
  tryZ.z += delta.z;
  if (canPlayerStandAt(tryZ, entries, radius)) next.z = tryZ.z;

  next.y = Math.max(0, Math.min(ROOM_LIMITS.maxY, next.y + (delta.y || 0)));
  return next;
}

export function findSafeSpawn(entries, preferred = new THREE.Vector3(0, 0, 2.6), radius = 0.28) {
  const candidates = [
    preferred,
    new THREE.Vector3(0, 0, 3.2),
    new THREE.Vector3(-2.6, 0, 2.6),
    new THREE.Vector3(2.6, 0, 2.6),
    new THREE.Vector3(0, 0, -3.2),
    new THREE.Vector3(-3.2, 0, -2.2),
    new THREE.Vector3(3.2, 0, -2.2),
    new THREE.Vector3(0, 0, 0)
  ];
  for (const candidate of candidates) {
    if (canPlayerStandAt(candidate, entries, radius)) return candidate.clone();
  }
  return new THREE.Vector3(0, 0, 2.6);
}

export function getBlockingObjects(entries) {
  const objects = [];
  for (const entry of entries || []) {
    if (isWalkBlockingEntry(entry) && entry.object) objects.push(entry.object);
  }
  return objects;
}

export function resolveThirdPersonCamera({ THREERef = THREE, target, desired, entries, padding = 0.24 }) {
  const objects = getBlockingObjects(entries);
  if (!objects.length) return desired.clone();

  const dir = desired.clone().sub(target);
  const distance = dir.length();
  if (distance < 0.001) return desired.clone();
  dir.normalize();

  const raycaster = new THREERef.Raycaster(target, dir, 0.05, distance);
  const hits = raycaster.intersectObjects(objects, true)
    .filter((hit) => hit.distance > 0.05);

  if (!hits.length) return desired.clone();

  const safeDistance = Math.max(0.7, hits[0].distance - padding);
  return target.clone().add(dir.multiplyScalar(safeDistance));
}
