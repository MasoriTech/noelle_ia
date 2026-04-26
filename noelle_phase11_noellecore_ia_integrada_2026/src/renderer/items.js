import * as THREE from "three";
import { SLOT_LABELS } from "./config.js";
import { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";

const BONE_MAP = {
  right_hand: "rightHand",
  left_hand: "leftHand",
  back_mount: "chest",
  two_hands: "chest",
  head: "head",
  waist: "hips"
};

const HAND_SLOTS = ["right_hand", "left_hand"];
const TWO_HAND_ITEM_IDS = new Set(["basketball", "acoustic_guitar_black"]);
const ALLOWED_SLOTS = ["right_hand", "left_hand", "back_mount", "two_hands", "scene_front", "head", "waist"];

const ITEM_PRESETS = {
  basketball: {
    right_hand: { position: [0.045, -0.028, 0.03], rotation: [0.2, 0.0, 0.2], scale: [1, 1, 1] },
    left_hand: { position: [-0.045, -0.028, 0.03], rotation: [0.2, 0.0, -0.2], scale: [1, 1, 1] },
    two_hands: { position: [0.0, -0.10, -0.22], rotation: [0.15, 0.0, 0.0], scale: [1, 1, 1] }
  },
  iphone_14_pro: {
    left_hand: { position: [-0.01, 0.005, 0.04], rotation: [1.57, 0.0, 1.57], scale: [1, 1, 1] },
    right_hand: { position: [0.01, 0.005, 0.04], rotation: [1.57, 0.0, -1.57], scale: [1, 1, 1] }
  },
  tablet: {
    left_hand: { position: [-0.02, 0.0, 0.06], rotation: [1.57, 0.0, 1.57], scale: [1, 1, 1] },
    right_hand: { position: [0.02, 0.0, 0.06], rotation: [1.57, 0.0, -1.57], scale: [1, 1, 1] }
  },
  agua: {
    right_hand: { position: [0.02, -0.01, 0.02], rotation: [0.0, 0.0, -0.2], scale: [1, 1, 1] },
    left_hand: { position: [-0.02, -0.01, 0.02], rotation: [0.0, 0.0, 0.2], scale: [1, 1, 1] }
  },
  cafe: {
    right_hand: { position: [0.02, -0.01, 0.02], rotation: [0.0, 0.0, -0.15], scale: [1, 1, 1] },
    left_hand: { position: [-0.02, -0.01, 0.02], rotation: [0.0, 0.0, 0.15], scale: [1, 1, 1] }
  },
  microfone: {
    right_hand: { position: [0.018, 0.03, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] },
    left_hand: { position: [-0.018, 0.03, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] }
  },
  acoustic_guitar_black: {
    right_hand: { position: [0.06, -0.16, -0.02], rotation: [0.1, 0.15, 0.95], scale: [1, 1, 1] },
    back_mount: { position: [-0.18, -0.08, -0.20], rotation: [0.0, 0.45, 1.1], scale: [1, 1, 1] },
    two_hands: { position: [0.08, -0.24, -0.24], rotation: [0.20, 0.05, 0.72], scale: [0.92, 0.92, 0.92] }
  },
  kendo_shinai_blade: {
    back_mount: { position: [-0.12, -0.10, -0.22], rotation: [0.0, 0.4, 1.35], scale: [1, 1, 1] },
    right_hand: { position: [0.02, -0.05, 0.10], rotation: [0.0, 0.0, 1.57], scale: [1, 1, 1] },
    left_hand: { position: [-0.02, -0.05, 0.10], rotation: [0.0, 0.0, -1.57], scale: [1, 1, 1] }
  },
  d20: {
    right_hand: { position: [0.018, -0.012, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] },
    left_hand: { position: [-0.018, -0.012, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] }
  },
  dice: {
    right_hand: { position: [0.018, -0.012, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] },
    left_hand: { position: [-0.018, -0.012, 0.02], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] }
  },
  office_desk: {
    scene_front: { position: [0.0, -0.02, -0.10], rotation: [0.0, 0.0, 0.0], scale: [1, 1, 1] }
  },
  grand_piano: {
    scene_front: { position: [0.0, -0.02, -0.2], rotation: [0.0, 0.7, 0.0], scale: [1, 1, 1] }
  }
};

function cloneItemRoot(root) {
  return root.clone(true);
}

function deepClone(value) {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value));
  }
}

function setBoneEuler(vrm, boneName, x = 0, y = 0, z = 0) {
  try {
    const bone = vrm?.humanoid?.getNormalizedBoneNode?.(boneName);
    if (bone) bone.rotation.set(x, y, z);
  } catch {}
}

function applyTwoHandPose(vrm, itemId) {
  if (!vrm) return;

  if (itemId === "acoustic_guitar_black") {
    setBoneEuler(vrm, "leftUpperArm", 0.25, 0.05, -0.70);
    setBoneEuler(vrm, "rightUpperArm", 0.20, -0.04, 0.70);
    setBoneEuler(vrm, "leftLowerArm", -0.65, 0.10, -0.10);
    setBoneEuler(vrm, "rightLowerArm", -0.58, -0.10, 0.16);
    setBoneEuler(vrm, "leftHand", 0.0, 0.0, 0.12);
    setBoneEuler(vrm, "rightHand", 0.0, 0.0, -0.12);
    return;
  }

  if (itemId === "basketball") {
    setBoneEuler(vrm, "leftUpperArm", 0.35, 0.05, -0.52);
    setBoneEuler(vrm, "rightUpperArm", 0.35, -0.05, 0.52);
    setBoneEuler(vrm, "leftLowerArm", -0.72, 0.0, -0.16);
    setBoneEuler(vrm, "rightLowerArm", -0.72, 0.0, 0.16);
    setBoneEuler(vrm, "leftHand", 0.0, 0.0, 0.08);
    setBoneEuler(vrm, "rightHand", 0.0, 0.0, -0.08);
  }
}

function applyTransform(node, preset) {
  if (!preset) return;
  const p = preset.position || [0, 0, 0];
  const r = preset.rotation || [0, 0, 0];
  node.position.set(...p);
  node.rotation.set(...r);
}

function getTargetSize(item, slot) {
  if (slot === "two_hands") {
    if (item?.id === "basketball") return 0.24;
    if (item?.id === "acoustic_guitar_black") return 0.82;
  }

  if (Number.isFinite(item?.target_size) && item.target_size > 0) return item.target_size;
  if (slot === "scene_front") return 1.4;
  if (slot === "back_mount") return 0.86;
  return 0.18;
}

function fitNodeToTargetSize(node, item, slot, preset) {
  try {
    node.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDim) || maxDim <= 0.0001) return;

    const targetSize = getTargetSize(item, slot);
    const baseScale = targetSize / maxDim;
    const mult = preset?.scale || [1, 1, 1];
    node.scale.set(baseScale * mult[0], baseScale * mult[1], baseScale * mult[2]);
  } catch (err) {
    console.warn("Falha ao ajustar tamanho do item", item?.id, err);
  }
}

export async function loadItemManifest() {
  const items = await readJsonAssetLocal("assets/item_manifest.json");

  const validated = await Promise.all(items.map(async (item) => {
    const fileRel = `assets/items/${item.file}`;
    const thumbRel = item.thumbnail ? `assets/items/${item.thumbnail}` : null;

    const fileOk = await assetExistsLocal(fileRel);
    const thumbOk = thumbRel ? await assetExistsLocal(thumbRel) : false;

    return {
      ...item,
      supported_modes: item.supported_modes || [],
      __available: fileOk,
      assetUrl: fileOk ? await getAssetFileUrlLocal(fileRel) : null,
      thumbnailUrl: thumbOk ? await getAssetFileUrlLocal(thumbRel) : null,
      thumbnail: thumbOk ? item.thumbnail : null,
    };
  }));

  return validated.filter((item) => item.__available);
}

export function normalizeSlotName(slot) {
  if (!slot) return "right_hand";
  return ALLOWED_SLOTS.includes(slot) ? slot : "right_hand";
}

export function slotLabel(slot) {
  return SLOT_LABELS[slot] || slot;
}

function shouldOfferTwoHands(item) {
  const modes = item.supported_modes || [];
  return (
    TWO_HAND_ITEM_IDS.has(item.id) ||
    modes.includes("two_hand_guitar") ||
    modes.includes("two_hand_ball") ||
    modes.includes("two_hands") ||
    item.default_interaction === "two_hand_guitar" ||
    item.default_interaction === "two_hand_ball"
  );
}

export function createInventoryManager({ loader, vrmState, sceneAnchor, onInventoryChanged, setStatus }) {
  const itemCache = new Map();
  const failedItems = new Set();
  const equipped = {
    right_hand: null,
    left_hand: null,
    two_hands: null,
    back_mount: null,
    scene_front: null,
    head: null,
    waist: null
  };

  function saveEquippedState() {
    const state = {};
    for (const [slot, entry] of Object.entries(equipped)) {
      state[slot] = entry ? { id: entry.item.id, label: entry.item.label || entry.item.id, slot } : null;
    }
    localStorage.setItem("noelle_equipped_items", JSON.stringify(state));
  }

  function getPreset(item, slot) {
    const itemPreset = ITEM_PRESETS[item.id] || {};
    const preset = deepClone(itemPreset[slot] || {});
    if (!preset.scale) preset.scale = [1, 1, 1];
    return preset;
  }

  async function getLoadedItem(item) {
    if (failedItems.has(item.id)) throw new Error("Item indisponível: " + item.id);
    if (itemCache.has(item.id)) return itemCache.get(item.id);
    try {
      const gltf = await loader.loadAsync(item.assetUrl || `./assets/items/${item.file}`);
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) throw new Error("Item sem cena: " + item.id);
      itemCache.set(item.id, root);
      return root;
    } catch (err) {
      failedItems.add(item.id);
      throw new Error(`Falha ao carregar item ${item.label}: ${err}`);
    }
  }

  function detachEntry(entry) {
    if (!entry) return;
    try {
      entry.node.removeFromParent();
    } catch {}
  }

  function detachSlot(slot) {
    const entry = equipped[slot];
    if (entry) detachEntry(entry);
    equipped[slot] = null;
  }

  function detachItem(itemId) {
    for (const [slot, entry] of Object.entries(equipped)) {
      if (entry?.item?.id === itemId) detachSlot(slot);
    }
  }

  function isEquipped(itemId) {
    return Object.values(equipped).some((entry) => entry?.item?.id === itemId);
  }

  function getEquippedSlot(itemId) {
    for (const [slot, entry] of Object.entries(equipped)) {
      if (entry?.item?.id === itemId) return slot;
    }
    return null;
  }

  function clearConflictsForSlot(slot) {
    if (slot === "two_hands") {
      HAND_SLOTS.forEach(detachSlot);
      detachSlot("two_hands");
      return;
    }

    if (HAND_SLOTS.includes(slot)) {
      detachSlot("two_hands");
    }

    detachSlot(slot);
  }

  function attachToSlot(item, node, slot) {
    const preset = getPreset(item, slot);
    fitNodeToTargetSize(node, item, slot, preset);
    applyTransform(node, preset);

    if (slot === "scene_front") {
      if (sceneAnchor?.clear) sceneAnchor.clear();
      sceneAnchor?.add?.(node);
      equipped.scene_front = { item, node, slot };
      return;
    }

    const boneName = BONE_MAP[slot] || "rightHand";
    const bone = vrmState.currentVRM?.humanoid?.getNormalizedBoneNode?.(boneName);
    if (!bone) throw new Error("Bone não encontrado para slot " + slot);
    bone.add(node);
    equipped[slot] = { item, node, slot };

    if (slot === "two_hands") {
      applyTwoHandPose(vrmState.currentVRM, item.id);
    }
  }

  function unequip(itemId) {
    detachItem(itemId);
    saveEquippedState();
    onInventoryChanged?.();
    setStatus?.("Item desequipado");
  }

  async function equip(item, slot) {
    slot = normalizeSlotName(slot);

    clearConflictsForSlot(slot);
    detachItem(item.id);

    const root = await getLoadedItem(item);
    const node = cloneItemRoot(root);
    node.traverse((o) => { o.frustumCulled = false; });
    attachToSlot(item, node, slot);
    saveEquippedState();
    onInventoryChanged?.();
    setStatus?.(`${item.label} equipado em ${slotLabel(slot)}`);
  }

  async function restore(itemsById) {
    try {
      const raw = localStorage.getItem("noelle_equipped_items");
      if (!raw) return;
      const state = JSON.parse(raw);
      for (const [slot, entry] of Object.entries(state)) {
        if (!entry?.id) continue;
        const item = itemsById.get(entry.id);
        if (!item) continue;
        try {
          await equip(item, normalizeSlotName(slot));
        } catch (err) {
          console.warn("Falha ao restaurar item:", item.id, err);
        }
      }
    } catch (err) {
      console.warn("Falha ao restaurar estado de itens:", err);
    }
  }

  function clearAll() {
    for (const slot of Object.keys(equipped)) detachSlot(slot);
    saveEquippedState();
    onInventoryChanged?.();
  }

  return { equipped, equip, unequip, clearAll, isEquipped, getEquippedSlot, restore, slotLabel };
}

export function buildContextActions(item, manager) {
  const equippedSlot = manager.getEquippedSlot(item.id);
  const actions = [];

  if (equippedSlot) {
    actions.push({ label: `Desequipar (${manager.slotLabel(equippedSlot)})`, actionType: "unequip", itemId: item.id });
  } else {
    actions.push({ label: "Equipar", slot: normalizeSlotName(item.slot) });
  }

  const sceneItem = item.slot === "scene_front" || item.category === "scene" || (item.supported_modes || []).includes("scene_front");
  if (sceneItem) {
    actions.push({ label: "Posicionar na cena", slot: "scene_front" });
  } else {
    if (shouldOfferTwoHands(item)) {
      actions.push({ label: "Usar em duas mãos", slot: "two_hands" });
    }
    actions.push({ label: "Equipar na mão direita", slot: "right_hand" });
    actions.push({ label: "Equipar na mão esquerda", slot: "left_hand" });
    actions.push({ label: "Equipar nas costas", slot: "back_mount" });
  }

  return actions;
}
