// Noelle V17.7 - slots robustos para items.
// Posição usa unidades three.js. Rotação preferida: rotationDeg no manifest.

export const SCENE_FLOOR_Y = 0;
export const AVATAR_FRONT_Z = -1.18;

export const ITEM_SLOT_ALIASES = {
  hand_right: "right_hand",
  rightHand: "right_hand",
  right_hand_bone: "right_hand",
  hand_left: "left_hand",
  leftHand: "left_hand",
  left_hand_bone: "left_hand",
  back: "back_mount",
  back_sheath: "back_mount",
  back_mount: "back_mount",
  two_hand: "two_hands",
  two_handed: "two_hands",
  two_hand_ball: "two_hands",
  two_hand_guitar: "two_hands",
  mouth: "mouth_near",
  microphone: "mouth_near",
  mic: "mouth_near",
  table: "front_table",
  table_top: "front_table",
  floor: "front_floor",
  ground: "front_floor",
  scene: "front_floor",
  scene_front: "front_floor"
};

export const ITEM_SLOTS = {
  right_hand: {
    label: "Mão direita",
    kind: "bone",
    bone: "rightHand",
    position: [0.02, -0.015, 0.03],
    rotationDeg: [0, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.18
  },
  left_hand: {
    label: "Mão esquerda",
    kind: "bone",
    bone: "leftHand",
    position: [-0.02, -0.015, 0.03],
    rotationDeg: [0, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.18
  },
  mouth_near: {
    label: "Perto da boca",
    kind: "bone",
    bone: "head",
    position: [0.04, -0.08, 0.15],
    rotationDeg: [75, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.16
  },
  chest: {
    label: "Frente do corpo",
    kind: "bone",
    bone: "chest",
    position: [0, -0.20, -0.20],
    rotationDeg: [10, 0, 40],
    scale: [1, 1, 1],
    targetSize: 0.82
  },
  back_mount: {
    label: "Costas",
    kind: "bone",
    bone: "chest",
    position: [-0.12, -0.10, -0.22],
    rotationDeg: [0, 35, 78],
    scale: [1, 1, 1],
    targetSize: 0.86
  },
  two_hands: {
    label: "Duas mãos",
    kind: "bone",
    bone: "chest",
    position: [0, -0.16, -0.24],
    rotationDeg: [10, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.24
  },
  head: {
    label: "Cabeça",
    kind: "bone",
    bone: "head",
    position: [0, 0.12, 0],
    rotationDeg: [0, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.22
  },
  waist: {
    label: "Cintura",
    kind: "bone",
    bone: "hips",
    position: [0.10, -0.04, -0.08],
    rotationDeg: [0, 0, 0],
    scale: [1, 1, 1],
    targetSize: 0.22
  },
  front_floor: {
    label: "Chão na frente",
    kind: "scene",
    bone: null,
    position: [0, SCENE_FLOOR_Y, AVATAR_FRONT_Z],
    rotationDeg: [0, 180, 0],
    scale: [1, 1, 1],
    targetSize: 1.2,
    ground: true
  },
  front_table: {
    label: "Em cima da mesa",
    kind: "scene",
    bone: null,
    position: [0, 0.74, -1.05],
    rotationDeg: [0, 180, 0],
    scale: [1, 1, 1],
    targetSize: 0.24,
    ground: true
  },
  scene_left: {
    label: "Cenário à esquerda",
    kind: "scene",
    bone: null,
    position: [-0.65, SCENE_FLOOR_Y, -1.35],
    rotationDeg: [0, 160, 0],
    scale: [1, 1, 1],
    targetSize: 1.2,
    ground: true
  },
  scene_right: {
    label: "Cenário à direita",
    kind: "scene",
    bone: null,
    position: [0.65, SCENE_FLOOR_Y, -1.35],
    rotationDeg: [0, 200, 0],
    scale: [1, 1, 1],
    targetSize: 1.2,
    ground: true
  }
};

export function normalizeItemSlot(slot, fallback = "right_hand") {
  const raw = String(slot || fallback || "right_hand").trim();
  const mapped = ITEM_SLOT_ALIASES[raw] || raw;
  if (ITEM_SLOTS[mapped]) return mapped;
  if (fallback && ITEM_SLOTS[fallback]) return fallback;
  return "right_hand";
}

export function isSceneSlot(slot) {
  return ITEM_SLOTS[normalizeItemSlot(slot)]?.kind === "scene";
}

export function isBoneSlot(slot) {
  return ITEM_SLOTS[normalizeItemSlot(slot)]?.kind === "bone";
}

export function getSlotDefinition(slot) {
  const id = normalizeItemSlot(slot);
  return { id, ...ITEM_SLOTS[id] };
}

export function slotLabel(slot) {
  return getSlotDefinition(slot).label || slot;
}

function finiteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function arr3(value, fallback) {
  if (!Array.isArray(value)) return [...fallback];
  return [
    finiteNumber(value[0], fallback[0]),
    finiteNumber(value[1], fallback[1]),
    finiteNumber(value[2], fallback[2])
  ];
}

export function degToRad(value) {
  return finiteNumber(value, 0) * Math.PI / 180;
}

export function rotationToRadians(config = {}) {
  if (Array.isArray(config.rotationRad)) return arr3(config.rotationRad, [0, 0, 0]);
  if (Array.isArray(config.rotationDeg)) return arr3(config.rotationDeg, [0, 0, 0]).map(degToRad);
  if (Array.isArray(config.rotation)) {
    const values = arr3(config.rotation, [0, 0, 0]);
    const looksLikeDegrees = values.some((v) => Math.abs(v) > Math.PI * 2 + 0.001);
    return looksLikeDegrees || config.rotationUnit === "deg" ? values.map(degToRad) : values;
  }
  return [0, 0, 0];
}

export function clampScale(value) {
  const n = finiteNumber(value, 1);
  return Math.min(100, Math.max(0.001, n));
}

export function safeScale(value, fallback = [1, 1, 1]) {
  return arr3(value, fallback).map(clampScale);
}

export function getItemSlotTransform(item = {}, slot = null) {
  const selectedSlot = normalizeItemSlot(slot || item.defaultSlot || item.slot || item.default_interaction || "right_hand");
  const base = getSlotDefinition(selectedSlot);
  const transforms = item.transform || item.transforms || {};
  const override = transforms[selectedSlot] || transforms[ITEM_SLOT_ALIASES[selectedSlot]] || {};

  const bone = override.bone !== undefined ? override.bone : base.bone;
  const kind = override.kind || base.kind;
  const rotation = rotationToRadians({
    rotation: override.rotation ?? base.rotation,
    rotationDeg: override.rotationDeg ?? base.rotationDeg,
    rotationRad: override.rotationRad ?? base.rotationRad,
    rotationUnit: override.rotationUnit
  });

  return {
    slot: selectedSlot,
    label: base.label,
    kind: bone === null || kind === "scene" ? "scene" : "bone",
    bone: bone === undefined ? base.bone : bone,
    position: arr3(override.position, base.position || [0, 0, 0]),
    rotation,
    scale: safeScale(override.scale, base.scale || [1, 1, 1]),
    targetSize: finiteNumber(override.targetSize ?? override.target_size ?? item.targetSize ?? item.target_size ?? base.targetSize, base.targetSize || 0.18),
    ground: Boolean(override.ground ?? base.ground ?? kind === "scene")
  };
}

export function slotCandidateOrder(item = {}) {
  const raw = [
    item.defaultSlot,
    item.slot,
    item.default_interaction,
    ...(Array.isArray(item.supportedSlots) ? item.supportedSlots : []),
    ...(Array.isArray(item.supported_slots) ? item.supported_slots : []),
    ...(Array.isArray(item.supported_modes) ? item.supported_modes : [])
  ];

  const list = raw.map((slot) => normalizeItemSlot(slot, "")).filter(Boolean);

  if (item.category === "scene" || item.category === "scene_prop") list.push("front_floor", "scene_left", "scene_right");
  else list.push("right_hand", "left_hand", "front_table");

  return [...new Set(list.map((slot) => normalizeItemSlot(slot)))];
}

export function validateItemTransform(item = {}) {
  const errors = [];
  const slots = slotCandidateOrder(item);
  for (const slot of slots) {
    const transform = getItemSlotTransform(item, slot);
    if (!Array.isArray(transform.position) || transform.position.length !== 3) errors.push(`${item.id}:${slot}: position inválida`);
    if (!Array.isArray(transform.rotation) || transform.rotation.length !== 3) errors.push(`${item.id}:${slot}: rotation inválida`);
    if (!Array.isArray(transform.scale) || transform.scale.length !== 3) errors.push(`${item.id}:${slot}: scale inválida`);
    if (transform.kind === "scene" && transform.position[1] < -0.001) errors.push(`${item.id}:${slot}: scene abaixo do chão`);
  }
  return errors;
}
