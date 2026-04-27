import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { SLOT_LABELS } from "./config.js";
import { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";
import { normalizeItemSlot, slotLabel as slotLabelFromSlots, getItemSlotTransform, isSceneSlot, slotCandidateOrder, validateItemTransform } from "./item_slots.js";
import { runItemBehavior } from "./item_behaviors.js";

const HAND_SLOTS = ["right_hand", "left_hand"];
const TWO_HAND_ITEM_IDS = new Set(["basketball", "acoustic_guitar_black"]);

const ITEM_DEFAULTS = {
  basketball: {
    defaultSlot: "two_hands",
    supportedSlots: ["right_hand", "left_hand", "two_hands", "front_floor"],
    behavior: { onEquip: { expression: "happy" } },
    transform: { front_floor: { bone: null, position: [0.42, 0, -0.88], rotationDeg: [0, 0, 0], targetSize: 0.24 } }
  },
  agua: {
    category: "hand_prop",
    defaultSlot: "right_hand",
    supportedSlots: ["right_hand", "left_hand", "mouth_near", "front_table"],
    recommendedMotion: "006_drinkwater",
    behavior: { onEquip: { playMotion: "006_drinkwater", expression: "happy", delayMs: 180 } },
    transform: {
      right_hand: { bone: "rightHand", position: [0.018, -0.025, 0.035], rotationDeg: [80, 5, 12], targetSize: 0.16 },
      left_hand: { bone: "leftHand", position: [-0.018, -0.025, 0.035], rotationDeg: [80, -5, -12], targetSize: 0.16 },
      mouth_near: { bone: "head", position: [0.05, -0.075, 0.16], rotationDeg: [80, 0, 8], targetSize: 0.16 },
      front_table: { bone: null, position: [0.18, 0.76, -1.04], rotationDeg: [0, 180, 0], targetSize: 0.18, ground: true }
    }
  },
  cafe: {
    category: "hand_prop",
    defaultSlot: "right_hand",
    supportedSlots: ["right_hand", "left_hand", "front_table"],
    behavior: { onEquip: { expression: "happy" } },
    transform: {
      right_hand: { bone: "rightHand", position: [0.02, -0.018, 0.025], rotationDeg: [0, 0, -10], targetSize: 0.12 },
      left_hand: { bone: "leftHand", position: [-0.02, -0.018, 0.025], rotationDeg: [0, 0, 10], targetSize: 0.12 },
      front_table: { bone: null, position: [0.24, 0.74, -1.04], rotationDeg: [0, 180, 0], targetSize: 0.14, ground: true }
    }
  },
  iphone_14_pro: {
    defaultSlot: "left_hand",
    supportedSlots: ["left_hand", "right_hand", "front_table"],
    recommendedMotion: "005_smartphone",
    behavior: { onEquip: { playMotion: "005_smartphone", delayMs: 120 } },
    transform: {
      left_hand: { bone: "leftHand", position: [-0.01, 0.005, 0.04], rotationDeg: [90, 0, 90], targetSize: 0.15 },
      right_hand: { bone: "rightHand", position: [0.01, 0.005, 0.04], rotationDeg: [90, 0, -90], targetSize: 0.15 },
      front_table: { bone: null, position: [-0.20, 0.76, -1.02], rotationDeg: [0, 180, 0], targetSize: 0.16, ground: true }
    }
  },
  tablet: {
    defaultSlot: "left_hand",
    supportedSlots: ["left_hand", "right_hand", "front_table"],
    transform: { front_table: { bone: null, position: [-0.28, 0.76, -1.03], rotationDeg: [0, 180, 0], targetSize: 0.26, ground: true } }
  },
  microfone: {
    defaultSlot: "mouth_near",
    supportedSlots: ["mouth_near", "right_hand", "left_hand"],
    behavior: { onEquip: { expression: "happy" } },
    transform: {
      mouth_near: { bone: "head", position: [0.04, -0.08, 0.14], rotationDeg: [72, 0, 0], targetSize: 0.18 },
      right_hand: { bone: "rightHand", position: [0.018, 0.03, 0.02], rotationDeg: [0, 0, 0], targetSize: 0.18 },
      left_hand: { bone: "leftHand", position: [-0.018, 0.03, 0.02], rotationDeg: [0, 0, 0], targetSize: 0.18 }
    }
  },
  acoustic_guitar_black: {
    defaultSlot: "chest",
    supportedSlots: ["chest", "two_hands", "back_mount"],
    behavior: { onEquip: { expression: "happy" } },
    transform: {
      chest: { bone: "chest", position: [0.08, -0.24, -0.24], rotationDeg: [12, 3, 41], targetSize: 0.82 },
      two_hands: { bone: "chest", position: [0.08, -0.24, -0.24], rotationDeg: [12, 3, 41], targetSize: 0.82 },
      back_mount: { bone: "chest", position: [-0.18, -0.08, -0.20], rotationDeg: [0, 26, 63], targetSize: 0.86 }
    }
  },
  kendo_shinai_blade: {
    defaultSlot: "back_mount",
    supportedSlots: ["back_mount", "right_hand", "left_hand"],
    transform: {
      back_mount: { bone: "chest", position: [-0.12, -0.10, -0.22], rotationDeg: [0, 23, 77], targetSize: 0.86 },
      right_hand: { bone: "rightHand", position: [0.02, -0.05, 0.10], rotationDeg: [0, 0, 90], targetSize: 0.64 },
      left_hand: { bone: "leftHand", position: [-0.02, -0.05, 0.10], rotationDeg: [0, 0, -90], targetSize: 0.64 }
    }
  },
  dado_de_20_lados: {
    defaultSlot: "front_table",
    supportedSlots: ["front_table", "right_hand", "left_hand", "front_floor"],
    transform: { front_table: { bone: null, position: [0.10, 0.78, -1.05], rotationDeg: [0, 25, 0], targetSize: 0.08, ground: true } }
  },
  dado_obj: {
    defaultSlot: "front_table",
    supportedSlots: ["front_table", "right_hand", "left_hand", "front_floor"],
    transform: { front_table: { bone: null, position: [-0.10, 0.78, -1.05], rotationDeg: [0, -20, 0], targetSize: 0.08, ground: true } }
  },
  office_desk: {
    category: "scene_prop",
    defaultSlot: "front_floor",
    supportedSlots: ["front_floor"],
    behavior: { type: "scene" },
    transform: { front_floor: { bone: null, position: [0, 0, -1.15], rotationDeg: [0, 180, 0], targetSize: 1.35, ground: true } }
  },
  grand_piano: {
    category: "scene_prop",
    defaultSlot: "front_floor",
    supportedSlots: ["front_floor", "scene_left", "scene_right"],
    behavior: { type: "scene" },
    transform: {
      front_floor: { bone: null, position: [0.35, 0, -1.45], rotationDeg: [0, 180, 0], targetSize: 1.35, ground: true },
      scene_left: { bone: null, position: [-0.55, 0, -1.45], rotationDeg: [0, 160, 0], targetSize: 1.35, ground: true },
      scene_right: { bone: null, position: [0.55, 0, -1.45], rotationDeg: [0, 200, 0], targetSize: 1.35, ground: true }
    }
  }
};

function cloneItemRoot(root) {
  try {
    return cloneSkeleton(root);
  } catch (err) {
    console.warn("[Noelle] SkeletonUtils.clone falhou, usando clone(true):", err);
    return root.clone(true);
  }
}

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

function itemAssetCandidates(file) {
  const clean = cleanAssetPath(file);
  const noAssets = clean.replace(/^assets\//i, "");
  const noItems = noAssets.replace(/^items\//i, "");
  return unique([
    clean.startsWith("assets/") ? clean : null,
    clean.startsWith("items/") ? "assets/" + clean : null,
    "assets/items/" + noItems,
    "assets/" + noAssets
  ]);
}

function thumbnailAssetCandidates(file) {
  const clean = cleanAssetPath(file);
  const noAssets = clean.replace(/^assets\//i, "");
  const noItems = noAssets.replace(/^items\//i, "");
  return unique([
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

function mergeItemDefaults(item) {
  const defaults = ITEM_DEFAULTS[item.id] || {};
  return {
    ...defaults,
    ...item,
    supportedSlots: [...new Set([...(defaults.supportedSlots || []), ...(item.supportedSlots || item.supported_slots || item.supported_modes || [])])],
    transform: { ...(defaults.transform || {}), ...(item.transform || item.transforms || {}) },
    behavior: item.behavior || defaults.behavior
  };
}

export async function loadItemManifest() {
  const raw = await readJsonAssetLocal("assets/item_manifest.json");
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  const validated = [];

  for (const baseItem of items) {
    const item = mergeItemDefaults(baseItem);
    const file = item.file || item.path || item.name || "";
    const resolvedFile = await resolveFirstLocalAsset(itemAssetCandidates(file));
    const thumbRel = item.thumbnail ? await resolveFirstLocalAsset(thumbnailAssetCandidates(item.thumbnail)) : { rel: null, url: null };

    if (!resolvedFile.url) {
      console.warn("[Noelle] Item ignorado porque o arquivo não foi encontrado:", item.id || file, itemAssetCandidates(file));
      continue;
    }

    const id = item.id || filenameStem(file);
    const normalized = {
      ...item,
      id,
      label: item.label || id,
      supported_modes: item.supported_modes || item.supportedSlots || [],
      supportedSlots: slotCandidateOrder(item),
      defaultSlot: normalizeSlotName(item.defaultSlot || item.slot || item.default_interaction || "right_hand"),
      __available: true,
      assetRel: resolvedFile.rel,
      assetUrl: resolvedFile.url,
      thumbnailUrl: thumbRel.url,
      thumbnail: thumbRel.url ? item.thumbnail : null
    };

    const errors = validateItemTransform(normalized);
    if (errors.length) console.warn("[Noelle] Transform de item com avisos:", normalized.id, errors);
    validated.push(normalized);
  }

  return validated;
}

export function normalizeSlotName(slot) {
  return normalizeItemSlot(slot, "right_hand");
}

export function slotLabel(slot) {
  return slotLabelFromSlots(slot) || SLOT_LABELS?.[slot] || slot;
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
    return;
  }
  if (itemId === "basketball") {
    setBoneEuler(vrm, "leftUpperArm", 0.35, 0.05, -0.52);
    setBoneEuler(vrm, "rightUpperArm", 0.35, -0.05, 0.52);
    setBoneEuler(vrm, "leftLowerArm", -0.72, 0, -0.16);
    setBoneEuler(vrm, "rightLowerArm", -0.72, 0, 0.16);
  }
}

function getBoundingBoxSafe(node) {
  try {
    node.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(node);
    if (!box.isEmpty()) return box;
  } catch {}
  return null;
}

function createNormalizedItemNode(source, item, slot, transform) {
  const wrapper = new THREE.Group();
  wrapper.name = `item:${item.id}:${slot}`;

  const model = cloneItemRoot(source);
  model.name = `item-model:${item.id}`;
  model.traverse((obj) => { obj.frustumCulled = false; });

  wrapper.add(model);

  const box = getBoundingBoxSafe(model);
  if (box) {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    if (transform.kind === "scene" || transform.ground) {
      model.position.set(-center.x, -box.min.y, -center.z);
    } else {
      model.position.set(-center.x, -center.y, -center.z);
    }

    const maxDim = Math.max(size.x, size.y, size.z);
    if (Number.isFinite(maxDim) && maxDim > 0.0001) {
      const baseScale = Math.max(0.0001, Number(transform.targetSize || 0.18)) / maxDim;
      wrapper.scale.set(
        baseScale * transform.scale[0],
        baseScale * transform.scale[1],
        baseScale * transform.scale[2]
      );
    }
  } else {
    wrapper.scale.set(...transform.scale);
  }

  wrapper.position.set(...transform.position);
  wrapper.rotation.set(...transform.rotation);
  wrapper.userData.noelleItem = { itemId: item.id, slot, kind: transform.kind };
  return wrapper;
}

function createBehaviorApi(setStatus) {
  return {
    setStatus,
    playMotion: async (motionId) => {
      window.dispatchEvent(new CustomEvent("noelle:item-behavior:motion", { detail: { motionId } }));
    },
    showExpression: async (expressionId) => {
      window.dispatchEvent(new CustomEvent("noelle:item-behavior:expression", { detail: { expressionId } }));
    }
  };
}

export function createInventoryManager({ loader, vrmState, sceneAnchor, onInventoryChanged, setStatus }) {
  const itemCache = new Map();
  const failedItems = new Set();
  const equipped = {};

  function saveEquippedState() {
    const state = {};
    for (const [key, entry] of Object.entries(equipped)) {
      if (entry) state[key] = { id: entry.item.id, label: entry.item.label || entry.item.id, slot: entry.slot };
    }
    localStorage.setItem("noelle_equipped_items", JSON.stringify(state));
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
      throw new Error(`Falha ao carregar item ${item.label || item.id}: ${err}`);
    }
  }

  function equippedKey(item, slot) {
    const normalized = normalizeSlotName(slot);
    if (isSceneSlot(normalized)) return `${normalized}:${item.id}`;
    return normalized;
  }

  function detachEntry(entry) {
    if (!entry) return;
    try { entry.node.removeFromParent(); } catch {}
  }

  function detachKey(key) {
    const entry = equipped[key];
    if (entry) detachEntry(entry);
    delete equipped[key];
  }

  function detachItem(itemId) {
    for (const [key, entry] of Object.entries(equipped)) {
      if (entry?.item?.id === itemId) detachKey(key);
    }
  }

  function isEquipped(itemId) {
    return Object.values(equipped).some((entry) => entry?.item?.id === itemId);
  }

  function getEquippedSlot(itemId) {
    for (const entry of Object.values(equipped)) {
      if (entry?.item?.id === itemId) return entry.slot;
    }
    return null;
  }

  function clearConflictsForSlot(item, slot) {
    const normalized = normalizeSlotName(slot);
    if (isSceneSlot(normalized)) {
      detachItem(item.id);
      return;
    }
    if (normalized === "two_hands") {
      for (const key of [...HAND_SLOTS, "two_hands"]) detachKey(key);
      return;
    }
    if (HAND_SLOTS.includes(normalized)) detachKey("two_hands");
    detachKey(normalized);
  }

  function attachNode(item, node, slot, transform) {
    const key = equippedKey(item, slot);
    if (transform.kind === "scene" || transform.bone === null || isSceneSlot(slot)) {
      sceneAnchor?.add?.(node);
      equipped[key] = { item, node, slot, key };
      return;
    }

    const bone = vrmState.currentVRM?.humanoid?.getNormalizedBoneNode?.(transform.bone || "rightHand");
    if (!bone) throw new Error(`Bone não encontrado para slot ${slot}: ${transform.bone}`);
    bone.add(node);
    equipped[key] = { item, node, slot, key };

    if (slot === "two_hands" || item.default_interaction === "two_hand_guitar" || item.default_interaction === "two_hand_ball") {
      applyTwoHandPose(vrmState.currentVRM, item.id);
    }
  }

  function unequip(itemId) {
    detachItem(itemId);
    saveEquippedState();
    onInventoryChanged?.();
    setStatus?.("Item desequipado");
  }

  async function equip(item, slot = null) {
    const targetSlot = normalizeSlotName(slot || item.defaultSlot || item.slot || item.default_interaction || "right_hand");
    clearConflictsForSlot(item, targetSlot);
    detachItem(item.id);

    const source = await getLoadedItem(item);
    const transform = getItemSlotTransform(item, targetSlot);
    const node = createNormalizedItemNode(source, item, targetSlot, transform);

    attachNode(item, node, targetSlot, transform);
    saveEquippedState();
    onInventoryChanged?.();

    await runItemBehavior(item, targetSlot, createBehaviorApi(setStatus));
    setStatus?.(`${item.label || item.id} equipado em ${slotLabel(targetSlot)}`);
  }

  async function restore(itemsById) {
    try {
      const raw = localStorage.getItem("noelle_equipped_items");
      if (!raw) return;
      const state = JSON.parse(raw);
      for (const entry of Object.values(state)) {
        if (!entry?.id) continue;
        const item = itemsById.get(entry.id);
        if (!item) continue;
        try { await equip(item, entry.slot || item.defaultSlot); }
        catch (err) { console.warn("Falha ao restaurar item:", item.id, err); }
      }
    } catch (err) {
      console.warn("Falha ao restaurar estado de itens:", err);
    }
  }

  function clearAll() {
    for (const key of Object.keys(equipped)) detachKey(key);
    saveEquippedState();
    onInventoryChanged?.();
  }

  return { equipped, equip, unequip, clearAll, isEquipped, getEquippedSlot, restore, slotLabel };
}

function shouldOfferTwoHands(item) {
  const modes = item.supported_modes || item.supportedSlots || [];
  return TWO_HAND_ITEM_IDS.has(item.id) || modes.includes("two_hands") || modes.includes("two_hand_guitar") || modes.includes("two_hand_ball") || item.default_interaction === "two_hand_guitar" || item.default_interaction === "two_hand_ball";
}

export function buildContextActions(item, manager) {
  const equippedSlot = manager.getEquippedSlot(item.id);
  const actions = [];

  if (equippedSlot) {
    actions.push({ label: `Desequipar (${manager.slotLabel(equippedSlot)})`, actionType: "unequip", itemId: item.id });
    return actions;
  }

  const slots = slotCandidateOrder(item);
  for (const slot of slots) {
    if (slot === "two_hands" && !shouldOfferTwoHands(item)) continue;
    actions.push({ label: `Equipar em ${slotLabel(slot)}`, slot });
  }

  return actions;
}
