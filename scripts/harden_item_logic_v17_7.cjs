"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const BACKUP_ROOT = path.join(ROOT, "backups", "v17_7_items_robustos_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19));

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

function parseJson(rel, fallback) {
  try { return JSON.parse(read(rel)); } catch { return fallback; }
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

const PATCHES = {
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
    behavior: { onEquip: { expression: "happy" } }
  },
  iphone_14_pro: {
    defaultSlot: "left_hand",
    supportedSlots: ["left_hand", "right_hand", "front_table"],
    recommendedMotion: "005_smartphone",
    behavior: { onEquip: { playMotion: "005_smartphone", delayMs: 120 } }
  },
  microfone: {
    defaultSlot: "mouth_near",
    supportedSlots: ["mouth_near", "right_hand", "left_hand"],
    behavior: { onEquip: { expression: "happy" } }
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
  },
  dado_de_20_lados: { defaultSlot: "front_table", supportedSlots: ["front_table", "right_hand", "left_hand", "front_floor"] },
  dado_obj: { defaultSlot: "front_table", supportedSlots: ["front_table", "right_hand", "left_hand", "front_floor"] },
  tablet: { defaultSlot: "left_hand", supportedSlots: ["left_hand", "right_hand", "front_table"] },
  basketball: { defaultSlot: "two_hands", supportedSlots: ["right_hand", "left_hand", "two_hands", "front_floor"], behavior: { onEquip: { expression: "happy" } } },
  acoustic_guitar_black: { defaultSlot: "chest", supportedSlots: ["chest", "two_hands", "back_mount"], behavior: { onEquip: { expression: "happy" } } },
  kendo_shinai_blade: { defaultSlot: "back_mount", supportedSlots: ["back_mount", "right_hand", "left_hand"] }
};

function patchManifest() {
  const rel = "src/assets/item_manifest.json";
  if (!exists(rel)) return fail("item_manifest.json não encontrado.");
  const data = parseJson(rel, []);
  if (!Array.isArray(data)) return fail("item_manifest.json não é lista.");

  const patched = data.map((item) => {
    const patch = PATCHES[item.id];
    if (!patch) return item;
    return {
      ...item,
      ...patch,
      transform: { ...(item.transform || item.transforms || {}), ...(patch.transform || {}) },
      supportedSlots: [...new Set([...(item.supportedSlots || []), ...(item.supported_slots || []), ...(item.supported_modes || []), ...(patch.supportedSlots || [])])]
    };
  });

  backupAndWrite(rel, JSON.stringify(patched, null, 2) + "\n");
}

function patchAvatarWindowAppEvents() {
  const rel = "src/renderer/avatar_window_app.js";
  if (!exists(rel)) {
    warn("avatar_window_app.js não encontrado; pulando eventos de behavior.");
    return;
  }
  let text = read(rel);
  if (text.includes("noelle:item-behavior:motion")) {
    log("[OK] Eventos de behavior já existem.");
    return;
  }

  const marker = 'window.desktopWidget?.onWindowState?.((_payload) => {});';
  const insert = `${marker} window.addEventListener("noelle:item-behavior:motion", (event) => { const motionId = event?.detail?.motionId; if (motionId) playMotion(loader, motionId).catch((err) => showError(err?.stack || err)); }); window.addEventListener("noelle:item-behavior:expression", (event) => { const expressionId = event?.detail?.expressionId; if (expressionId && typeof showExpressionById === "function") showExpressionById(expressionId); });`;
  if (text.includes(marker)) {
    text = text.replace(marker, insert);
    backupAndWrite(rel, text);
  } else {
    warn("Marcador de eventos no avatar_window_app.js não encontrado.");
  }
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let text = read(rel);
  if (text.includes("V17.7 — items robustos")) return;
  text += `

## V17.7 — items robustos

A lógica de items deve usar:
- SkeletonUtils.clone para GLB com SkinnedMesh/bones;
- wrapper Group para cada item;
- normalização de pivot;
- alinhamento de base no chão para scene props;
- targetSize por slot;
- item_slots.js para slots;
- item_behaviors.js para ações especiais;
- items.js como motor genérico.

Objetos de cenário como mesa e piano usam:
- slot front_floor;
- Y = 0;
- Z negativo;
- ground: true;
- bottom aligned pela bounding box.

Água usa:
- right_hand;
- behavior: playMotion 006_drinkwater.

iPhone usa:
- left_hand;
- behavior: playMotion 005_smartphone.
`;
  backupAndWrite(rel, text);
}

function rebuildBundlesIfPossible() {
  if (!exists("scripts/bundle-renderers.mjs")) {
    warn("scripts/bundle-renderers.mjs não encontrado.");
    return;
  }
  if (!exists("node_modules/esbuild")) {
    warn("esbuild não encontrado em node_modules; pulando renderer_dist.");
    return;
  }
  const result = cp.spawnSync(process.execPath, ["scripts/bundle-renderers.mjs"], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    warn("Rebuild renderer_dist falhou:");
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return;
  }
  log("[OK] renderer_dist regenerado.");
}

function apply() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  log("[INFO] Backup em: " + BACKUP_ROOT);

  backupAndWrite("src/renderer/item_slots.js", "// Noelle V17.7 - slots robustos para items.\n// Posi\u00e7\u00e3o usa unidades three.js. Rota\u00e7\u00e3o preferida: rotationDeg no manifest.\n\nexport const SCENE_FLOOR_Y = 0;\nexport const AVATAR_FRONT_Z = -1.18;\n\nexport const ITEM_SLOT_ALIASES = {\n  hand_right: \"right_hand\",\n  rightHand: \"right_hand\",\n  right_hand_bone: \"right_hand\",\n  hand_left: \"left_hand\",\n  leftHand: \"left_hand\",\n  left_hand_bone: \"left_hand\",\n  back: \"back_mount\",\n  back_sheath: \"back_mount\",\n  back_mount: \"back_mount\",\n  two_hand: \"two_hands\",\n  two_handed: \"two_hands\",\n  two_hand_ball: \"two_hands\",\n  two_hand_guitar: \"two_hands\",\n  mouth: \"mouth_near\",\n  microphone: \"mouth_near\",\n  mic: \"mouth_near\",\n  table: \"front_table\",\n  table_top: \"front_table\",\n  floor: \"front_floor\",\n  ground: \"front_floor\",\n  scene: \"front_floor\",\n  scene_front: \"front_floor\"\n};\n\nexport const ITEM_SLOTS = {\n  right_hand: {\n    label: \"M\u00e3o direita\",\n    kind: \"bone\",\n    bone: \"rightHand\",\n    position: [0.02, -0.015, 0.03],\n    rotationDeg: [0, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.18\n  },\n  left_hand: {\n    label: \"M\u00e3o esquerda\",\n    kind: \"bone\",\n    bone: \"leftHand\",\n    position: [-0.02, -0.015, 0.03],\n    rotationDeg: [0, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.18\n  },\n  mouth_near: {\n    label: \"Perto da boca\",\n    kind: \"bone\",\n    bone: \"head\",\n    position: [0.04, -0.08, 0.15],\n    rotationDeg: [75, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.16\n  },\n  chest: {\n    label: \"Frente do corpo\",\n    kind: \"bone\",\n    bone: \"chest\",\n    position: [0, -0.20, -0.20],\n    rotationDeg: [10, 0, 40],\n    scale: [1, 1, 1],\n    targetSize: 0.82\n  },\n  back_mount: {\n    label: \"Costas\",\n    kind: \"bone\",\n    bone: \"chest\",\n    position: [-0.12, -0.10, -0.22],\n    rotationDeg: [0, 35, 78],\n    scale: [1, 1, 1],\n    targetSize: 0.86\n  },\n  two_hands: {\n    label: \"Duas m\u00e3os\",\n    kind: \"bone\",\n    bone: \"chest\",\n    position: [0, -0.16, -0.24],\n    rotationDeg: [10, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.24\n  },\n  head: {\n    label: \"Cabe\u00e7a\",\n    kind: \"bone\",\n    bone: \"head\",\n    position: [0, 0.12, 0],\n    rotationDeg: [0, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.22\n  },\n  waist: {\n    label: \"Cintura\",\n    kind: \"bone\",\n    bone: \"hips\",\n    position: [0.10, -0.04, -0.08],\n    rotationDeg: [0, 0, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.22\n  },\n  front_floor: {\n    label: \"Ch\u00e3o na frente\",\n    kind: \"scene\",\n    bone: null,\n    position: [0, SCENE_FLOOR_Y, AVATAR_FRONT_Z],\n    rotationDeg: [0, 180, 0],\n    scale: [1, 1, 1],\n    targetSize: 1.2,\n    ground: true\n  },\n  front_table: {\n    label: \"Em cima da mesa\",\n    kind: \"scene\",\n    bone: null,\n    position: [0, 0.74, -1.05],\n    rotationDeg: [0, 180, 0],\n    scale: [1, 1, 1],\n    targetSize: 0.24,\n    ground: true\n  },\n  scene_left: {\n    label: \"Cen\u00e1rio \u00e0 esquerda\",\n    kind: \"scene\",\n    bone: null,\n    position: [-0.65, SCENE_FLOOR_Y, -1.35],\n    rotationDeg: [0, 160, 0],\n    scale: [1, 1, 1],\n    targetSize: 1.2,\n    ground: true\n  },\n  scene_right: {\n    label: \"Cen\u00e1rio \u00e0 direita\",\n    kind: \"scene\",\n    bone: null,\n    position: [0.65, SCENE_FLOOR_Y, -1.35],\n    rotationDeg: [0, 200, 0],\n    scale: [1, 1, 1],\n    targetSize: 1.2,\n    ground: true\n  }\n};\n\nexport function normalizeItemSlot(slot, fallback = \"right_hand\") {\n  const raw = String(slot || fallback || \"right_hand\").trim();\n  const mapped = ITEM_SLOT_ALIASES[raw] || raw;\n  if (ITEM_SLOTS[mapped]) return mapped;\n  if (fallback && ITEM_SLOTS[fallback]) return fallback;\n  return \"right_hand\";\n}\n\nexport function isSceneSlot(slot) {\n  return ITEM_SLOTS[normalizeItemSlot(slot)]?.kind === \"scene\";\n}\n\nexport function isBoneSlot(slot) {\n  return ITEM_SLOTS[normalizeItemSlot(slot)]?.kind === \"bone\";\n}\n\nexport function getSlotDefinition(slot) {\n  const id = normalizeItemSlot(slot);\n  return { id, ...ITEM_SLOTS[id] };\n}\n\nexport function slotLabel(slot) {\n  return getSlotDefinition(slot).label || slot;\n}\n\nfunction finiteNumber(value, fallback) {\n  const n = Number(value);\n  return Number.isFinite(n) ? n : fallback;\n}\n\nfunction arr3(value, fallback) {\n  if (!Array.isArray(value)) return [...fallback];\n  return [\n    finiteNumber(value[0], fallback[0]),\n    finiteNumber(value[1], fallback[1]),\n    finiteNumber(value[2], fallback[2])\n  ];\n}\n\nexport function degToRad(value) {\n  return finiteNumber(value, 0) * Math.PI / 180;\n}\n\nexport function rotationToRadians(config = {}) {\n  if (Array.isArray(config.rotationRad)) return arr3(config.rotationRad, [0, 0, 0]);\n  if (Array.isArray(config.rotationDeg)) return arr3(config.rotationDeg, [0, 0, 0]).map(degToRad);\n  if (Array.isArray(config.rotation)) {\n    const values = arr3(config.rotation, [0, 0, 0]);\n    const looksLikeDegrees = values.some((v) => Math.abs(v) > Math.PI * 2 + 0.001);\n    return looksLikeDegrees || config.rotationUnit === \"deg\" ? values.map(degToRad) : values;\n  }\n  return [0, 0, 0];\n}\n\nexport function clampScale(value) {\n  const n = finiteNumber(value, 1);\n  return Math.min(100, Math.max(0.001, n));\n}\n\nexport function safeScale(value, fallback = [1, 1, 1]) {\n  return arr3(value, fallback).map(clampScale);\n}\n\nexport function getItemSlotTransform(item = {}, slot = null) {\n  const selectedSlot = normalizeItemSlot(slot || item.defaultSlot || item.slot || item.default_interaction || \"right_hand\");\n  const base = getSlotDefinition(selectedSlot);\n  const transforms = item.transform || item.transforms || {};\n  const override = transforms[selectedSlot] || transforms[ITEM_SLOT_ALIASES[selectedSlot]] || {};\n\n  const bone = override.bone !== undefined ? override.bone : base.bone;\n  const kind = override.kind || base.kind;\n  const rotation = rotationToRadians({\n    rotation: override.rotation ?? base.rotation,\n    rotationDeg: override.rotationDeg ?? base.rotationDeg,\n    rotationRad: override.rotationRad ?? base.rotationRad,\n    rotationUnit: override.rotationUnit\n  });\n\n  return {\n    slot: selectedSlot,\n    label: base.label,\n    kind: bone === null || kind === \"scene\" ? \"scene\" : \"bone\",\n    bone: bone === undefined ? base.bone : bone,\n    position: arr3(override.position, base.position || [0, 0, 0]),\n    rotation,\n    scale: safeScale(override.scale, base.scale || [1, 1, 1]),\n    targetSize: finiteNumber(override.targetSize ?? override.target_size ?? item.targetSize ?? item.target_size ?? base.targetSize, base.targetSize || 0.18),\n    ground: Boolean(override.ground ?? base.ground ?? kind === \"scene\")\n  };\n}\n\nexport function slotCandidateOrder(item = {}) {\n  const raw = [\n    item.defaultSlot,\n    item.slot,\n    item.default_interaction,\n    ...(Array.isArray(item.supportedSlots) ? item.supportedSlots : []),\n    ...(Array.isArray(item.supported_slots) ? item.supported_slots : []),\n    ...(Array.isArray(item.supported_modes) ? item.supported_modes : [])\n  ];\n\n  const list = raw.map((slot) => normalizeItemSlot(slot, \"\")).filter(Boolean);\n\n  if (item.category === \"scene\" || item.category === \"scene_prop\") list.push(\"front_floor\", \"scene_left\", \"scene_right\");\n  else list.push(\"right_hand\", \"left_hand\", \"front_table\");\n\n  return [...new Set(list.map((slot) => normalizeItemSlot(slot)))];\n}\n\nexport function validateItemTransform(item = {}) {\n  const errors = [];\n  const slots = slotCandidateOrder(item);\n  for (const slot of slots) {\n    const transform = getItemSlotTransform(item, slot);\n    if (!Array.isArray(transform.position) || transform.position.length !== 3) errors.push(`${item.id}:${slot}: position inv\u00e1lida`);\n    if (!Array.isArray(transform.rotation) || transform.rotation.length !== 3) errors.push(`${item.id}:${slot}: rotation inv\u00e1lida`);\n    if (!Array.isArray(transform.scale) || transform.scale.length !== 3) errors.push(`${item.id}:${slot}: scale inv\u00e1lida`);\n    if (transform.kind === \"scene\" && transform.position[1] < -0.001) errors.push(`${item.id}:${slot}: scene abaixo do ch\u00e3o`);\n  }\n  return errors;\n}\n");
  backupAndWrite("src/renderer/item_behaviors.js", "// Noelle V17.7 - behaviors robustos para items.\n// A maioria dos items usa apenas slot/transform. Behavior s\u00f3 para itens com a\u00e7\u00e3o especial.\n\nconst FALLBACK_BEHAVIORS = {\n  agua: { onEquip: { playMotion: \"006_drinkwater\", expression: \"happy\", delayMs: 180 } },\n  cafe: { onEquip: { expression: \"happy\" } },\n  iphone_14_pro: { onEquip: { playMotion: \"005_smartphone\", delayMs: 120 } },\n  microfone: { onEquip: { expression: \"happy\" } },\n  acoustic_guitar_black: { onEquip: { expression: \"happy\" } },\n  basketball: { onEquip: { expression: \"happy\" } }\n};\n\nfunction itemBehavior(item = {}) {\n  return item.behavior || FALLBACK_BEHAVIORS[item.id] || {};\n}\n\nfunction wait(ms) {\n  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms || 0))));\n}\n\nexport function getItemBehavior(item = {}) {\n  return itemBehavior(item);\n}\n\nexport function getRecommendedMotionForItem(item = {}) {\n  const behavior = itemBehavior(item);\n  return behavior?.onEquip?.playMotion || item.recommendedMotion || null;\n}\n\nexport async function runItemBehavior(item, slot, api = {}) {\n  const behavior = itemBehavior(item);\n  const onEquip = behavior?.onEquip || {};\n  const results = [];\n\n  if (onEquip.expression && typeof api.showExpression === \"function\") {\n    try {\n      await api.showExpression(onEquip.expression);\n      results.push({ ok: true, type: \"expression\", value: onEquip.expression });\n    } catch (err) {\n      results.push({ ok: false, type: \"expression\", error: String(err?.message || err) });\n    }\n  }\n\n  if (onEquip.delayMs) await wait(onEquip.delayMs);\n\n  if (onEquip.playMotion && typeof api.playMotion === \"function\") {\n    try {\n      await api.playMotion(onEquip.playMotion);\n      results.push({ ok: true, type: \"motion\", value: onEquip.playMotion });\n    } catch (err) {\n      results.push({ ok: false, type: \"motion\", error: String(err?.message || err) });\n    }\n  }\n\n  if (typeof api.setStatus === \"function\") {\n    const readable = item.label || item.id || \"Item\";\n    if (onEquip.playMotion) api.setStatus(`${readable} equipado \u00b7 motion ${onEquip.playMotion}`);\n    else api.setStatus(`${readable} equipado em ${slot}`);\n  }\n\n  return { ok: results.every((r) => r.ok !== false), results };\n}\n");
  backupAndWrite("src/renderer/items.js", "import * as THREE from \"three\";\nimport { clone as cloneSkeleton } from \"three/examples/jsm/utils/SkeletonUtils.js\";\nimport { SLOT_LABELS } from \"./config.js\";\nimport { assetExistsLocal, readJsonAssetLocal, getAssetFileUrlLocal } from \"./local_assets.js\";\nimport { normalizeItemSlot, slotLabel as slotLabelFromSlots, getItemSlotTransform, isSceneSlot, slotCandidateOrder, validateItemTransform } from \"./item_slots.js\";\nimport { runItemBehavior } from \"./item_behaviors.js\";\n\nconst HAND_SLOTS = [\"right_hand\", \"left_hand\"];\nconst TWO_HAND_ITEM_IDS = new Set([\"basketball\", \"acoustic_guitar_black\"]);\n\nconst ITEM_DEFAULTS = {\n  basketball: {\n    defaultSlot: \"two_hands\",\n    supportedSlots: [\"right_hand\", \"left_hand\", \"two_hands\", \"front_floor\"],\n    behavior: { onEquip: { expression: \"happy\" } },\n    transform: { front_floor: { bone: null, position: [0.42, 0, -0.88], rotationDeg: [0, 0, 0], targetSize: 0.24 } }\n  },\n  agua: {\n    category: \"hand_prop\",\n    defaultSlot: \"right_hand\",\n    supportedSlots: [\"right_hand\", \"left_hand\", \"mouth_near\", \"front_table\"],\n    recommendedMotion: \"006_drinkwater\",\n    behavior: { onEquip: { playMotion: \"006_drinkwater\", expression: \"happy\", delayMs: 180 } },\n    transform: {\n      right_hand: { bone: \"rightHand\", position: [0.018, -0.025, 0.035], rotationDeg: [80, 5, 12], targetSize: 0.16 },\n      left_hand: { bone: \"leftHand\", position: [-0.018, -0.025, 0.035], rotationDeg: [80, -5, -12], targetSize: 0.16 },\n      mouth_near: { bone: \"head\", position: [0.05, -0.075, 0.16], rotationDeg: [80, 0, 8], targetSize: 0.16 },\n      front_table: { bone: null, position: [0.18, 0.76, -1.04], rotationDeg: [0, 180, 0], targetSize: 0.18, ground: true }\n    }\n  },\n  cafe: {\n    category: \"hand_prop\",\n    defaultSlot: \"right_hand\",\n    supportedSlots: [\"right_hand\", \"left_hand\", \"front_table\"],\n    behavior: { onEquip: { expression: \"happy\" } },\n    transform: {\n      right_hand: { bone: \"rightHand\", position: [0.02, -0.018, 0.025], rotationDeg: [0, 0, -10], targetSize: 0.12 },\n      left_hand: { bone: \"leftHand\", position: [-0.02, -0.018, 0.025], rotationDeg: [0, 0, 10], targetSize: 0.12 },\n      front_table: { bone: null, position: [0.24, 0.74, -1.04], rotationDeg: [0, 180, 0], targetSize: 0.14, ground: true }\n    }\n  },\n  iphone_14_pro: {\n    defaultSlot: \"left_hand\",\n    supportedSlots: [\"left_hand\", \"right_hand\", \"front_table\"],\n    recommendedMotion: \"005_smartphone\",\n    behavior: { onEquip: { playMotion: \"005_smartphone\", delayMs: 120 } },\n    transform: {\n      left_hand: { bone: \"leftHand\", position: [-0.01, 0.005, 0.04], rotationDeg: [90, 0, 90], targetSize: 0.15 },\n      right_hand: { bone: \"rightHand\", position: [0.01, 0.005, 0.04], rotationDeg: [90, 0, -90], targetSize: 0.15 },\n      front_table: { bone: null, position: [-0.20, 0.76, -1.02], rotationDeg: [0, 180, 0], targetSize: 0.16, ground: true }\n    }\n  },\n  tablet: {\n    defaultSlot: \"left_hand\",\n    supportedSlots: [\"left_hand\", \"right_hand\", \"front_table\"],\n    transform: { front_table: { bone: null, position: [-0.28, 0.76, -1.03], rotationDeg: [0, 180, 0], targetSize: 0.26, ground: true } }\n  },\n  microfone: {\n    defaultSlot: \"mouth_near\",\n    supportedSlots: [\"mouth_near\", \"right_hand\", \"left_hand\"],\n    behavior: { onEquip: { expression: \"happy\" } },\n    transform: {\n      mouth_near: { bone: \"head\", position: [0.04, -0.08, 0.14], rotationDeg: [72, 0, 0], targetSize: 0.18 },\n      right_hand: { bone: \"rightHand\", position: [0.018, 0.03, 0.02], rotationDeg: [0, 0, 0], targetSize: 0.18 },\n      left_hand: { bone: \"leftHand\", position: [-0.018, 0.03, 0.02], rotationDeg: [0, 0, 0], targetSize: 0.18 }\n    }\n  },\n  acoustic_guitar_black: {\n    defaultSlot: \"chest\",\n    supportedSlots: [\"chest\", \"two_hands\", \"back_mount\"],\n    behavior: { onEquip: { expression: \"happy\" } },\n    transform: {\n      chest: { bone: \"chest\", position: [0.08, -0.24, -0.24], rotationDeg: [12, 3, 41], targetSize: 0.82 },\n      two_hands: { bone: \"chest\", position: [0.08, -0.24, -0.24], rotationDeg: [12, 3, 41], targetSize: 0.82 },\n      back_mount: { bone: \"chest\", position: [-0.18, -0.08, -0.20], rotationDeg: [0, 26, 63], targetSize: 0.86 }\n    }\n  },\n  kendo_shinai_blade: {\n    defaultSlot: \"back_mount\",\n    supportedSlots: [\"back_mount\", \"right_hand\", \"left_hand\"],\n    transform: {\n      back_mount: { bone: \"chest\", position: [-0.12, -0.10, -0.22], rotationDeg: [0, 23, 77], targetSize: 0.86 },\n      right_hand: { bone: \"rightHand\", position: [0.02, -0.05, 0.10], rotationDeg: [0, 0, 90], targetSize: 0.64 },\n      left_hand: { bone: \"leftHand\", position: [-0.02, -0.05, 0.10], rotationDeg: [0, 0, -90], targetSize: 0.64 }\n    }\n  },\n  dado_de_20_lados: {\n    defaultSlot: \"front_table\",\n    supportedSlots: [\"front_table\", \"right_hand\", \"left_hand\", \"front_floor\"],\n    transform: { front_table: { bone: null, position: [0.10, 0.78, -1.05], rotationDeg: [0, 25, 0], targetSize: 0.08, ground: true } }\n  },\n  dado_obj: {\n    defaultSlot: \"front_table\",\n    supportedSlots: [\"front_table\", \"right_hand\", \"left_hand\", \"front_floor\"],\n    transform: { front_table: { bone: null, position: [-0.10, 0.78, -1.05], rotationDeg: [0, -20, 0], targetSize: 0.08, ground: true } }\n  },\n  office_desk: {\n    category: \"scene_prop\",\n    defaultSlot: \"front_floor\",\n    supportedSlots: [\"front_floor\"],\n    behavior: { type: \"scene\" },\n    transform: { front_floor: { bone: null, position: [0, 0, -1.15], rotationDeg: [0, 180, 0], targetSize: 1.35, ground: true } }\n  },\n  grand_piano: {\n    category: \"scene_prop\",\n    defaultSlot: \"front_floor\",\n    supportedSlots: [\"front_floor\", \"scene_left\", \"scene_right\"],\n    behavior: { type: \"scene\" },\n    transform: {\n      front_floor: { bone: null, position: [0.35, 0, -1.45], rotationDeg: [0, 180, 0], targetSize: 1.35, ground: true },\n      scene_left: { bone: null, position: [-0.55, 0, -1.45], rotationDeg: [0, 160, 0], targetSize: 1.35, ground: true },\n      scene_right: { bone: null, position: [0.55, 0, -1.45], rotationDeg: [0, 200, 0], targetSize: 1.35, ground: true }\n    }\n  }\n};\n\nfunction cloneItemRoot(root) {\n  try {\n    return cloneSkeleton(root);\n  } catch (err) {\n    console.warn(\"[Noelle] SkeletonUtils.clone falhou, usando clone(true):\", err);\n    return root.clone(true);\n  }\n}\n\nfunction cleanAssetPath(value) {\n  return String(value || \"\").replace(/\\\\/g, \"/\").replace(/^\\.\\//, \"\").replace(/^\\/+/, \"\").trim();\n}\n\nfunction filenameStem(value) {\n  const clean = cleanAssetPath(value).split(/[?#]/)[0];\n  const name = clean.split(\"/\").pop() || clean;\n  return name.replace(/\\.[^.]+$/, \"\");\n}\n\nfunction unique(values) {\n  return [...new Set(values.filter(Boolean))];\n}\n\nfunction itemAssetCandidates(file) {\n  const clean = cleanAssetPath(file);\n  const noAssets = clean.replace(/^assets\\//i, \"\");\n  const noItems = noAssets.replace(/^items\\//i, \"\");\n  return unique([\n    clean.startsWith(\"assets/\") ? clean : null,\n    clean.startsWith(\"items/\") ? \"assets/\" + clean : null,\n    \"assets/items/\" + noItems,\n    \"assets/\" + noAssets\n  ]);\n}\n\nfunction thumbnailAssetCandidates(file) {\n  const clean = cleanAssetPath(file);\n  const noAssets = clean.replace(/^assets\\//i, \"\");\n  const noItems = noAssets.replace(/^items\\//i, \"\");\n  return unique([\n    clean.startsWith(\"assets/\") ? clean : null,\n    clean.startsWith(\"items/\") ? \"assets/\" + clean : null,\n    clean.startsWith(\"thumbnails/\") ? \"assets/items/\" + clean : null,\n    \"assets/items/\" + noItems,\n    \"assets/\" + noAssets\n  ]);\n}\n\nasync function resolveFirstLocalAsset(candidates) {\n  for (const rel of candidates) {\n    try {\n      if (await assetExistsLocal(rel)) return { rel, url: await getAssetFileUrlLocal(rel) };\n    } catch {}\n  }\n  return { rel: candidates[0] || \"\", url: null };\n}\n\nfunction mergeItemDefaults(item) {\n  const defaults = ITEM_DEFAULTS[item.id] || {};\n  return {\n    ...defaults,\n    ...item,\n    supportedSlots: [...new Set([...(defaults.supportedSlots || []), ...(item.supportedSlots || item.supported_slots || item.supported_modes || [])])],\n    transform: { ...(defaults.transform || {}), ...(item.transform || item.transforms || {}) },\n    behavior: item.behavior || defaults.behavior\n  };\n}\n\nexport async function loadItemManifest() {\n  const raw = await readJsonAssetLocal(\"assets/item_manifest.json\");\n  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];\n  const validated = [];\n\n  for (const baseItem of items) {\n    const item = mergeItemDefaults(baseItem);\n    const file = item.file || item.path || item.name || \"\";\n    const resolvedFile = await resolveFirstLocalAsset(itemAssetCandidates(file));\n    const thumbRel = item.thumbnail ? await resolveFirstLocalAsset(thumbnailAssetCandidates(item.thumbnail)) : { rel: null, url: null };\n\n    if (!resolvedFile.url) {\n      console.warn(\"[Noelle] Item ignorado porque o arquivo n\u00e3o foi encontrado:\", item.id || file, itemAssetCandidates(file));\n      continue;\n    }\n\n    const id = item.id || filenameStem(file);\n    const normalized = {\n      ...item,\n      id,\n      label: item.label || id,\n      supported_modes: item.supported_modes || item.supportedSlots || [],\n      supportedSlots: slotCandidateOrder(item),\n      defaultSlot: normalizeSlotName(item.defaultSlot || item.slot || item.default_interaction || \"right_hand\"),\n      __available: true,\n      assetRel: resolvedFile.rel,\n      assetUrl: resolvedFile.url,\n      thumbnailUrl: thumbRel.url,\n      thumbnail: thumbRel.url ? item.thumbnail : null\n    };\n\n    const errors = validateItemTransform(normalized);\n    if (errors.length) console.warn(\"[Noelle] Transform de item com avisos:\", normalized.id, errors);\n    validated.push(normalized);\n  }\n\n  return validated;\n}\n\nexport function normalizeSlotName(slot) {\n  return normalizeItemSlot(slot, \"right_hand\");\n}\n\nexport function slotLabel(slot) {\n  return slotLabelFromSlots(slot) || SLOT_LABELS?.[slot] || slot;\n}\n\nfunction setBoneEuler(vrm, boneName, x = 0, y = 0, z = 0) {\n  try {\n    const bone = vrm?.humanoid?.getNormalizedBoneNode?.(boneName);\n    if (bone) bone.rotation.set(x, y, z);\n  } catch {}\n}\n\nfunction applyTwoHandPose(vrm, itemId) {\n  if (!vrm) return;\n  if (itemId === \"acoustic_guitar_black\") {\n    setBoneEuler(vrm, \"leftUpperArm\", 0.25, 0.05, -0.70);\n    setBoneEuler(vrm, \"rightUpperArm\", 0.20, -0.04, 0.70);\n    setBoneEuler(vrm, \"leftLowerArm\", -0.65, 0.10, -0.10);\n    setBoneEuler(vrm, \"rightLowerArm\", -0.58, -0.10, 0.16);\n    return;\n  }\n  if (itemId === \"basketball\") {\n    setBoneEuler(vrm, \"leftUpperArm\", 0.35, 0.05, -0.52);\n    setBoneEuler(vrm, \"rightUpperArm\", 0.35, -0.05, 0.52);\n    setBoneEuler(vrm, \"leftLowerArm\", -0.72, 0, -0.16);\n    setBoneEuler(vrm, \"rightLowerArm\", -0.72, 0, 0.16);\n  }\n}\n\nfunction getBoundingBoxSafe(node) {\n  try {\n    node.updateMatrixWorld(true);\n    const box = new THREE.Box3().setFromObject(node);\n    if (!box.isEmpty()) return box;\n  } catch {}\n  return null;\n}\n\nfunction createNormalizedItemNode(source, item, slot, transform) {\n  const wrapper = new THREE.Group();\n  wrapper.name = `item:${item.id}:${slot}`;\n\n  const model = cloneItemRoot(source);\n  model.name = `item-model:${item.id}`;\n  model.traverse((obj) => { obj.frustumCulled = false; });\n\n  wrapper.add(model);\n\n  const box = getBoundingBoxSafe(model);\n  if (box) {\n    const center = new THREE.Vector3();\n    const size = new THREE.Vector3();\n    box.getCenter(center);\n    box.getSize(size);\n\n    if (transform.kind === \"scene\" || transform.ground) {\n      model.position.set(-center.x, -box.min.y, -center.z);\n    } else {\n      model.position.set(-center.x, -center.y, -center.z);\n    }\n\n    const maxDim = Math.max(size.x, size.y, size.z);\n    if (Number.isFinite(maxDim) && maxDim > 0.0001) {\n      const baseScale = Math.max(0.0001, Number(transform.targetSize || 0.18)) / maxDim;\n      wrapper.scale.set(\n        baseScale * transform.scale[0],\n        baseScale * transform.scale[1],\n        baseScale * transform.scale[2]\n      );\n    }\n  } else {\n    wrapper.scale.set(...transform.scale);\n  }\n\n  wrapper.position.set(...transform.position);\n  wrapper.rotation.set(...transform.rotation);\n  wrapper.userData.noelleItem = { itemId: item.id, slot, kind: transform.kind };\n  return wrapper;\n}\n\nfunction createBehaviorApi(setStatus) {\n  return {\n    setStatus,\n    playMotion: async (motionId) => {\n      window.dispatchEvent(new CustomEvent(\"noelle:item-behavior:motion\", { detail: { motionId } }));\n    },\n    showExpression: async (expressionId) => {\n      window.dispatchEvent(new CustomEvent(\"noelle:item-behavior:expression\", { detail: { expressionId } }));\n    }\n  };\n}\n\nexport function createInventoryManager({ loader, vrmState, sceneAnchor, onInventoryChanged, setStatus }) {\n  const itemCache = new Map();\n  const failedItems = new Set();\n  const equipped = {};\n\n  function saveEquippedState() {\n    const state = {};\n    for (const [key, entry] of Object.entries(equipped)) {\n      if (entry) state[key] = { id: entry.item.id, label: entry.item.label || entry.item.id, slot: entry.slot };\n    }\n    localStorage.setItem(\"noelle_equipped_items\", JSON.stringify(state));\n  }\n\n  async function getLoadedItem(item) {\n    if (failedItems.has(item.id)) throw new Error(\"Item indispon\u00edvel: \" + item.id);\n    if (itemCache.has(item.id)) return itemCache.get(item.id);\n    try {\n      const gltf = await loader.loadAsync(item.assetUrl || `./assets/items/${item.file}`);\n      const root = gltf.scene || gltf.scenes?.[0];\n      if (!root) throw new Error(\"Item sem cena: \" + item.id);\n      itemCache.set(item.id, root);\n      return root;\n    } catch (err) {\n      failedItems.add(item.id);\n      throw new Error(`Falha ao carregar item ${item.label || item.id}: ${err}`);\n    }\n  }\n\n  function equippedKey(item, slot) {\n    const normalized = normalizeSlotName(slot);\n    if (isSceneSlot(normalized)) return `${normalized}:${item.id}`;\n    return normalized;\n  }\n\n  function detachEntry(entry) {\n    if (!entry) return;\n    try { entry.node.removeFromParent(); } catch {}\n  }\n\n  function detachKey(key) {\n    const entry = equipped[key];\n    if (entry) detachEntry(entry);\n    delete equipped[key];\n  }\n\n  function detachItem(itemId) {\n    for (const [key, entry] of Object.entries(equipped)) {\n      if (entry?.item?.id === itemId) detachKey(key);\n    }\n  }\n\n  function isEquipped(itemId) {\n    return Object.values(equipped).some((entry) => entry?.item?.id === itemId);\n  }\n\n  function getEquippedSlot(itemId) {\n    for (const entry of Object.values(equipped)) {\n      if (entry?.item?.id === itemId) return entry.slot;\n    }\n    return null;\n  }\n\n  function clearConflictsForSlot(item, slot) {\n    const normalized = normalizeSlotName(slot);\n    if (isSceneSlot(normalized)) {\n      detachItem(item.id);\n      return;\n    }\n    if (normalized === \"two_hands\") {\n      for (const key of [...HAND_SLOTS, \"two_hands\"]) detachKey(key);\n      return;\n    }\n    if (HAND_SLOTS.includes(normalized)) detachKey(\"two_hands\");\n    detachKey(normalized);\n  }\n\n  function attachNode(item, node, slot, transform) {\n    const key = equippedKey(item, slot);\n    if (transform.kind === \"scene\" || transform.bone === null || isSceneSlot(slot)) {\n      sceneAnchor?.add?.(node);\n      equipped[key] = { item, node, slot, key };\n      return;\n    }\n\n    const bone = vrmState.currentVRM?.humanoid?.getNormalizedBoneNode?.(transform.bone || \"rightHand\");\n    if (!bone) throw new Error(`Bone n\u00e3o encontrado para slot ${slot}: ${transform.bone}`);\n    bone.add(node);\n    equipped[key] = { item, node, slot, key };\n\n    if (slot === \"two_hands\" || item.default_interaction === \"two_hand_guitar\" || item.default_interaction === \"two_hand_ball\") {\n      applyTwoHandPose(vrmState.currentVRM, item.id);\n    }\n  }\n\n  function unequip(itemId) {\n    detachItem(itemId);\n    saveEquippedState();\n    onInventoryChanged?.();\n    setStatus?.(\"Item desequipado\");\n  }\n\n  async function equip(item, slot = null) {\n    const targetSlot = normalizeSlotName(slot || item.defaultSlot || item.slot || item.default_interaction || \"right_hand\");\n    clearConflictsForSlot(item, targetSlot);\n    detachItem(item.id);\n\n    const source = await getLoadedItem(item);\n    const transform = getItemSlotTransform(item, targetSlot);\n    const node = createNormalizedItemNode(source, item, targetSlot, transform);\n\n    attachNode(item, node, targetSlot, transform);\n    saveEquippedState();\n    onInventoryChanged?.();\n\n    await runItemBehavior(item, targetSlot, createBehaviorApi(setStatus));\n    setStatus?.(`${item.label || item.id} equipado em ${slotLabel(targetSlot)}`);\n  }\n\n  async function restore(itemsById) {\n    try {\n      const raw = localStorage.getItem(\"noelle_equipped_items\");\n      if (!raw) return;\n      const state = JSON.parse(raw);\n      for (const entry of Object.values(state)) {\n        if (!entry?.id) continue;\n        const item = itemsById.get(entry.id);\n        if (!item) continue;\n        try { await equip(item, entry.slot || item.defaultSlot); }\n        catch (err) { console.warn(\"Falha ao restaurar item:\", item.id, err); }\n      }\n    } catch (err) {\n      console.warn(\"Falha ao restaurar estado de itens:\", err);\n    }\n  }\n\n  function clearAll() {\n    for (const key of Object.keys(equipped)) detachKey(key);\n    saveEquippedState();\n    onInventoryChanged?.();\n  }\n\n  return { equipped, equip, unequip, clearAll, isEquipped, getEquippedSlot, restore, slotLabel };\n}\n\nfunction shouldOfferTwoHands(item) {\n  const modes = item.supported_modes || item.supportedSlots || [];\n  return TWO_HAND_ITEM_IDS.has(item.id) || modes.includes(\"two_hands\") || modes.includes(\"two_hand_guitar\") || modes.includes(\"two_hand_ball\") || item.default_interaction === \"two_hand_guitar\" || item.default_interaction === \"two_hand_ball\";\n}\n\nexport function buildContextActions(item, manager) {\n  const equippedSlot = manager.getEquippedSlot(item.id);\n  const actions = [];\n\n  if (equippedSlot) {\n    actions.push({ label: `Desequipar (${manager.slotLabel(equippedSlot)})`, actionType: \"unequip\", itemId: item.id });\n    return actions;\n  }\n\n  const slots = slotCandidateOrder(item);\n  for (const slot of slots) {\n    if (slot === \"two_hands\" && !shouldOfferTwoHands(item)) continue;\n    actions.push({ label: `Equipar em ${slotLabel(slot)}`, slot });\n  }\n\n  return actions;\n}\n");

  patchManifest();
  patchAvatarWindowAppEvents();
  patchMemory();

  runCheck("src/renderer/item_slots.js");
  runCheck("src/renderer/item_behaviors.js");
  runCheck("src/renderer/items.js");
  if (exists("src/renderer/avatar_window_app.js")) runCheck("src/renderer/avatar_window_app.js");
  runCheck("scripts/diagnostico_items_robustos_v17_7.cjs");

  rebuildBundlesIfPossible();

  log("");
  log("[OK] V17.7 aplicada.");
  log("[INFO] Teste água+drinkwater, iPhone+smartphone, mesa/piano no chão e items de mão.");
}

if (process.argv.includes("--apply")) apply();
else console.log("Uso: node scripts/harden_item_logic_v17_7.cjs --apply");
