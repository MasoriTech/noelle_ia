import * as THREE from "three";

export const ROOM_LIMITS = {
  minX: -4.8,
  maxX: 4.8,
  minZ: -4.8,
  maxZ: 4.8,
  minY: 0,
  maxY: 4
};

export function clampToRoom(position, limits = ROOM_LIMITS) {
  position.x = Math.min(limits.maxX, Math.max(limits.minX, position.x));
  position.y = Math.min(limits.maxY, Math.max(limits.minY, position.y));
  position.z = Math.min(limits.maxZ, Math.max(limits.minZ, position.z));
  return position;
}

export function getWorldBox(object) {
  if (!object) return null;
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  return box.isEmpty() ? null : box;
}

export function validateRoomObject(entry, allEntries, options = {}) {
  const errors = [];
  const warnings = [];
  if (!entry?.object) return { ok: false, errors: ["Objeto inválido"], warnings };

  if (entry.object.userData?.noelleMissingAsset) warnings.push("Asset original não carregou; usando placeholder.");

  const pos = entry.object.position;
  if (pos.y < -0.001) errors.push("Item abaixo do chão.");
  if (pos.x < ROOM_LIMITS.minX || pos.x > ROOM_LIMITS.maxX || pos.z < ROOM_LIMITS.minZ || pos.z > ROOM_LIMITS.maxZ) {
    warnings.push("Item fora dos limites visuais da Room.");
  }

  if (options.collisionEnabled !== false && entry.item?.placement?.canCollide !== false && entry.item?.category !== "decoration") {
    const box = getWorldBox(entry.object);
    if (box) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const minUsefulSize = Math.max(size.x, size.y, size.z) > 0.03;
      if (minUsefulSize) {
        for (const other of allEntries) {
          if (!other || other.uid === entry.uid || other.item?.placement?.canCollide === false) continue;
          const otherBox = getWorldBox(other.object);
          if (otherBox && box.intersectsBox(otherBox)) {
            warnings.push(`Colisão possível com ${other.item?.label || other.item?.id || other.uid}.`);
            break;
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function createBoxHelper(THREERef, scene) {
  const helper = new THREERef.BoxHelper(new THREERef.Object3D(), 0xff477e);
  helper.visible = false;
  scene.add(helper);
  return {
    object: helper,
    attach(target) {
      if (!target) {
        helper.visible = false;
        return;
      }
      helper.visible = true;
      helper.setFromObject(target);
    },
    update(target) {
      if (target && helper.visible) helper.setFromObject(target);
    },
    dispose() {
      helper.geometry?.dispose?.();
      helper.material?.dispose?.();
      helper.removeFromParent();
    }
  };
}
