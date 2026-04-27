import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from "@pixiv/three-vrm-animation";

import {
  AVATAR_CONFIG,
  CAMERA_PRESETS,
  loadAvatarTuning,
  saveAvatarTuning,
  DEFAULT_AVATAR_TUNING,
  loadUiPrefs,
} from "./config.js";
import { createSceneRuntime } from "./scene.js";
import { clamp, applyRelaxedPose, applyAvatarAnchor, applyCameraPreset, applyScale, updateIdle } from "./avatar.js";
import { loadMotionManifest, createMotionMap, describeMotion } from "./motions.js";
import { loadItemManifest, createInventoryManager } from "./items.js";
import { readJsonAssetLocal, getAssetFileUrlLocal } from "./local_assets.js";

const stage = document.getElementById("stage");

const state = {
  currentVRM: null,
  scale: Number(readAvatarState("scale", localStorage.getItem("noelle_scale")) || loadAvatarTuning().defaultScale || AVATAR_CONFIG.defaultScale),
  preset: "full",
  lastMotionId: "VRMA_02",
  motionPlaying: false,
  motionPaused: false,
  baseRotationY: 0,
};

let mixer = null;
let currentAction = null;
const motionClipCache = new Map();
let expressionTimer = null;
let expressionHideTimer = null;
let lastExpressionIndex = -1;
let expressionDefs = [];
let controlsRef = null;
let motionMap = {};
let motionDefs = [];
let inventoryManager = null;
let itemsById = new Map();
let runtimeRef = null;



function getActiveAvatarInfo() {
  return window.__NOELLE_AVATAR_INFO__ || {};
}

function getActiveAvatarId() {
  const info = getActiveAvatarInfo();
  return String(info?.avatarId || info?.id || info?.name || "noelle-default")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-") || "noelle-default";
}

function getAvatarStateKey(name) {
  return `noelle_avatar_state_${getActiveAvatarId()}_${name}`;
}

function readAvatarState(name, fallback = null) {
  try {
    const specific = localStorage.getItem(getAvatarStateKey(name));
    if (specific !== null && specific !== undefined) return specific;
  } catch {}
  return fallback;
}

function writeAvatarState(name, value) {
  try {
    localStorage.setItem(getAvatarStateKey(name), String(value));
  } catch {}
}

function removeAvatarState(name) {
  try {
    localStorage.removeItem(getAvatarStateKey(name));
  } catch {}
}

function shouldStartCleanForAvatar() {
  const activeId = getActiveAvatarId();
  const previousId = localStorage.getItem("noelle_active_avatar_id");
  if (previousId !== activeId) {
    localStorage.setItem("noelle_active_avatar_id", activeId);
    // Estado agora é por avatar. Não apagar itens de todos os avatares.
    return true;
  }
  return false;
}

function getAvatarOrientationY(info) {
  const saved = Number(readAvatarState("rotationY", "NaN"));
  if (Number.isFinite(saved)) return saved;

  const haystack = [
    info?.avatarId,
    info?.id,
    info?.name,
    info?.filePath,
    info?.url
  ].map((value) => String(value || "").toLowerCase()).join(" ");

  // Padrão por avatar. Noelle não deve girar. Arisa costuma vir invertida.
  if (haystack.includes("arisa")) return Math.PI;
  return 0;
}

function byId(id) {
  return document.getElementById(id);
}

function setStatus(text, sticky = false) {
  const statusEl = byId("status");
  if (!statusEl) return;
  const stableText =
    !text ||
    String(text).toLowerCase().includes("carregando") ||
    String(text).toLowerCase().includes("resolvendo")
      ? `${getActiveAvatarInfo().name || "Avatar"} ativo`
      : String(text)
          .replace("Noelle carregada com sucesso", `${getActiveAvatarInfo().name || "Avatar"} ativo`)
          .replace("Noelle ativa", `${getActiveAvatarInfo().name || "Avatar"} ativo`);

  statusEl.textContent = stableText;
  statusEl.style.opacity = "1";

  clearTimeout(setStatus._timer);
  if (!sticky && !stableText.endsWith("ativo") && stableText !== "Erro") {
    setStatus._timer = setTimeout(() => {
      if (statusEl) {
        statusEl.textContent = `${getActiveAvatarInfo().name || "Avatar"} ativo`;
        statusEl.style.opacity = "1";
      }
    }, 1800);
  }
}

function showError(message) {
  const errorBox = byId("errorBox");
  if (errorBox) {
    errorBox.style.display = "block";
    errorBox.textContent = String(message);
  }
  console.error(message);
  setStatus("Erro", true);
}

function withTimeout(promise, timeoutMs, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout em ${label} (${timeoutMs}ms)`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function loadExpressionManifest() {
  try {
    const list = await readJsonAssetLocal("assets/expressions/manifest.json");
    if (!Array.isArray(list)) return [];
    const mapped = [];
    for (const item of list) {
      const assetUrl = await getAssetFileUrlLocal(`assets/expressions/${item.file}`);
      mapped.push({
        file: assetUrl,
        label: item.label || item.file
      });
    }
    return mapped;
  } catch (err) {
    console.warn("Falha ao carregar expressões:", err);
    return [];
  }
}

function hideExpression() {
  const overlay = byId("expressionOverlay");
  const badge = byId("expressionBadge");
  const image = byId("expressionImage");
  if (overlay) overlay.classList.remove("show");
  if (badge) badge.classList.remove("show");
  if (image) image.removeAttribute("src");
  clearTimeout(expressionHideTimer);
  expressionHideTimer = null;
}

function showRandomExpression() {
  const prefs = loadUiPrefs();
  if (!prefs.expressionOverlay) return;
  if (!expressionDefs.length) return;
  if (state.motionPlaying && !state.motionPaused) return;

  let nextIndex = Math.floor(Math.random() * expressionDefs.length);
  if (expressionDefs.length > 1 && nextIndex === lastExpressionIndex) {
    nextIndex = (nextIndex + 1) % expressionDefs.length;
  }
  lastExpressionIndex = nextIndex;

  const chosen = expressionDefs[nextIndex];
  const overlay = byId("expressionOverlay");
  const image = byId("expressionImage");
  const badge = byId("expressionBadge");
  if (!overlay || !image || !badge) return;

  image.src = chosen.file;
  badge.textContent = chosen.label;
  overlay.classList.add("show");
  badge.classList.add("show");

  clearTimeout(expressionHideTimer);
  expressionHideTimer = setTimeout(() => hideExpression(), 8500);
}

function showExpressionById(expressionId) {
  if (!expressionDefs.length) return;
  const key = String(expressionId || "").toLowerCase();
  const chosen = expressionDefs.find((item) => {
    const haystack = [item.id, item.label, item.file].map((value) => String(value || "").toLowerCase()).join(" ");
    return key && haystack.includes(key);
  }) || expressionDefs[0];
  const overlay = byId("expressionOverlay");
  const image = byId("expressionImage");
  const badge = byId("expressionBadge");
  if (!overlay || !image || !badge || !chosen) return;
  image.src = chosen.file;
  badge.textContent = chosen.label || chosen.id || "Expressão";
  overlay.classList.add("show");
  badge.classList.add("show");
  clearTimeout(expressionHideTimer);
  expressionHideTimer = setTimeout(() => hideExpression(), 8500);
  setStatus("Expressão: " + (chosen.label || chosen.id || "ativa"));
}
function startExpressionLoop() {
  clearInterval(expressionTimer);
  if (!expressionDefs.length) return;
  expressionTimer = setInterval(() => showRandomExpression(), 60000);
}

function saveUiState() {
  writeAvatarState("scale", state.scale);
  writeAvatarState("preset", state.preset);
  writeAvatarState("lastMotion", state.lastMotionId);
  writeAvatarState("rotationY", state.baseRotationY || 0);

  // Mantém compatibilidade com versões antigas.
  localStorage.setItem("noelle_scale", String(state.scale));
  localStorage.setItem("noelle_preset", state.preset);
  localStorage.setItem("noelle_last_motion", state.lastMotionId);
}

function loadUiState() {
  const tuning = loadAvatarTuning();
  const scale = Number(readAvatarState("scale", localStorage.getItem("noelle_scale")) || tuning.defaultScale);
  const preset = readAvatarState("preset", localStorage.getItem("noelle_preset"));
  const lastMotion = readAvatarState("lastMotion", localStorage.getItem("noelle_last_motion"));
  const rotationY = Number(readAvatarState("rotationY", "NaN"));

  if (!Number.isNaN(scale)) state.scale = clamp(scale, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
  if (preset && CAMERA_PRESETS[preset]) state.preset = preset;
  if (lastMotion) state.lastMotionId = lastMotion;
  if (Number.isFinite(rotationY)) state.baseRotationY = rotationY;
}

function refreshAvatarNamePill() {
  const info = getActiveAvatarInfo();
  const pill = document.querySelector("#topPills .pill:first-child");
  if (pill) {
    const label = info?.name || "Noelle";
    pill.innerHTML = `<span></span>${label}`;
  }
}

function refreshHintText() {
  const hint = byId("hint");
  if (!hint) return;
  const tuning = loadAvatarTuning();
  hint.innerHTML = `spawnY ${Number(tuning.spawnY).toFixed(2)}<br>scale ${Number(tuning.defaultScale).toFixed(2)}<br>frameY ${Number(tuning.frameOffsetY).toFixed(2)}`;
}

function applyUiPrefsToShell() {
  const prefs = loadUiPrefs();
  document.body.classList.toggle("theme-light", prefs.theme === "light");
  document.body.classList.toggle("theme-dark", prefs.theme === "dark");
  document.body.classList.toggle("theme-noelle-classic", prefs.theme === "noelle_classic");
  document.body.classList.toggle("theme-noelle", prefs.theme === "noelle" || prefs.theme === "system");
  document.body.classList.toggle("reduced-transparency", !!prefs.reducedTransparency);
  const overlay = byId("expressionOverlay");
  const badge = byId("expressionBadge");
  const showExpressions = !!prefs.expressionOverlay;
  if (overlay) overlay.style.display = showExpressions ? "flex" : "none";
  if (badge) badge.style.display = showExpressions ? "block" : "none";
}

function centerAvatarFraming() {
  if (!state.currentVRM || !controlsRef) return;
  const presetName = state.preset || "full";
  const tuning = loadAvatarTuning();
  applyAvatarAnchor(state.currentVRM);
  applyCameraPreset(controlsRef.object, controlsRef, state, presetName);
  const effectiveScale = Number(
    localStorage.getItem("noelle_scale") ||
      tuning.defaultScale ||
      CAMERA_PRESETS[presetName]?.scale ||
      AVATAR_CONFIG.defaultScale
  );
  state.scale = clamp(effectiveScale, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
  applyScale(state.currentVRM, state.scale);
  saveUiState();
  refreshHintText();
  setStatus(presetName === "full" ? "Corpo inteiro alinhado para mostrar os pés" : `Avatar centralizado (${presetName})`);
}

function stopCurrentMotion() {
  try {
    if (currentAction) {
      currentAction.stop();
      currentAction.enabled = false;
      currentAction = null;
    }
    if (mixer) mixer.stopAllAction();
  } catch (err) {
    console.warn("Falha ao parar motion:", err);
  }
  state.motionPlaying = false;
  state.motionPaused = false;
  if (state.currentVRM) {
    applyAvatarAnchor(state.currentVRM);
    applyRelaxedPose(state.currentVRM);
  }
  setStatus("Voltando ao idle");
}

function togglePauseMotion() {
  if (!currentAction) return;
  state.motionPaused = !state.motionPaused;
  try {
    currentAction.paused = state.motionPaused;
  } catch (err) {
    console.warn("Falha ao pausar motion:", err);
    return;
  }
  setStatus(state.motionPaused ? "Emote pausado" : "Emote retomado");
}

async function loadAvatarModel(loader, runtime) {
  const info = window.__NOELLE_AVATAR_INFO__ || {};
  const avatarUrl = info.url || window.__NOELLE_VRM_URL__ || "./assets/Noelle.vrm";
  const kind = info.kind || (String(avatarUrl).toLowerCase().match(/\.(glb|gltf)(\?|#|$)/) ? "gltf" : "vrm");
  const displayName = info.name || (kind === "vrm" ? "Noelle" : "Modelo");
  state.baseRotationY = getAvatarOrientationY(info);
  setStatus("Carregando avatar...", true);
  const gltf = await withTimeout(loader.loadAsync(avatarUrl), 120000, "carregamento do avatar");

  if (gltf.userData?.vrm) {
    state.currentVRM = gltf.userData.vrm;

    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.removeUnnecessaryJoints(gltf.scene);
    state.currentVRM.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });

    applyAvatarAnchor(state.currentVRM);
    state.currentVRM.scene.rotation.y = state.baseRotationY;

    if (state.currentVRM.lookAt) {
      const proxy = new VRMLookAtQuaternionProxy(state.currentVRM.lookAt);
      proxy.name = "lookAtQuaternionProxy";
      state.currentVRM.scene.add(proxy);
    }

    applyRelaxedPose(state.currentVRM);
    applyScale(state.currentVRM, state.scale);
    runtime.scene.add(state.currentVRM.scene);

    mixer = new THREE.AnimationMixer(state.currentVRM.scene);
    mixer.addEventListener("finished", () => {
      state.motionPlaying = false;
      state.motionPaused = false;
      if (currentAction) {
        currentAction.stop();
        currentAction = null;
      }
      setStatus("Emote concluído");
    });

    setStatus(`${displayName} ativa`, true);
    return;
  }

  // Suporte experimental para GLB/GLTF estático.
  // Ele substitui visualmente a Noelle, mas não tem bones VRM para emotes/itens de mão.
  const scene = gltf.scene || gltf.scenes?.[0];
  if (!scene) throw new Error("Modelo sem cena 3D.");

  scene.traverse((obj) => {
    obj.frustumCulled = false;
  });

  state.currentVRM = {
    scene,
    humanoid: null,
    lookAt: null,
    __staticModel: true,
    __kind: kind,
    __name: displayName,
  };

  applyAvatarAnchor(state.currentVRM);
  applyScale(state.currentVRM, state.scale);
  runtime.scene.add(scene);
  mixer = new THREE.AnimationMixer(scene);

  setStatus(`${displayName} ativo (GLB estático)`, true);
}

async function getMotionClip(loader, motionId) {
  if (motionClipCache.has(motionId)) return motionClipCache.get(motionId);
  const motionPath = motionMap[motionId];
  if (!motionPath) throw new Error("Motion não mapeada: " + motionId);

  setStatus("Carregando emote " + motionId + "...", true);
  const gltfVrma = await withTimeout(loader.loadAsync(motionPath), 20000, "carregamento da VRMA");
  const vrmAnimation = gltfVrma.userData.vrmAnimations?.[0];
  if (!vrmAnimation) throw new Error("Nenhuma VRMAnimation encontrada em " + motionId);

  const clip = createVRMAnimationClip(vrmAnimation, state.currentVRM);
  motionClipCache.set(motionId, clip);
  return clip;
}

async function playMotion(loader, motionId) {
  if (!state.currentVRM || !mixer) return;
  if (state.currentVRM.__staticModel) {
    setStatus("Este modelo GLB é estático. Use VRM para emotes.", true);
    return;
  }
  try {
    const clip = await getMotionClip(loader, motionId);
    if (!clip) throw new Error("Clip vazio para " + motionId);

    if (currentAction) {
      currentAction.stop();
      currentAction = null;
    }

    currentAction = mixer.clipAction(clip);
    if (!currentAction) throw new Error("Não foi possível criar action para " + motionId);

    currentAction.reset();
    currentAction.clampWhenFinished = true;
    currentAction.setLoop(THREE.LoopOnce, 1);
    currentAction.enabled = true;
    currentAction.paused = false;
    currentAction.play();

    hideExpression();
    state.motionPlaying = true;
    state.motionPaused = false;
    state.lastMotionId = motionId;
    localStorage.setItem("noelle_last_motion", motionId);
    setStatus("Tocando emote: " + describeMotion(motionId, motionDefs));
  } catch (err) {
    showError("Falha ao tocar motion " + motionId + ": " + err);
  }
}

async function handleAvatarCommand(loader, payload) {
  const type = payload?.type;
  switch (type) {
    case "playMotion":
      await playMotion(loader, payload.motionId);
      break;
    case "togglePauseMotion":
      togglePauseMotion();
      break;
    case "stopMotion":
      stopCurrentMotion();
      break;
    case "setPreset":
      if (payload.preset && CAMERA_PRESETS[payload.preset]) {
        state.preset = payload.preset;
        localStorage.setItem("noelle_preset", payload.preset);
        centerAvatarFraming();
      }
      break;
    case "updateAvatarTuning": {
      const tuning = saveAvatarTuning({
        ...loadAvatarTuning(),
        ...(payload.tuning || {}),
      });
      if (payload.syncScale) {
        state.scale = clamp(Number(tuning.defaultScale), AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
        localStorage.setItem("noelle_scale", String(state.scale));
      }
      centerAvatarFraming();
      setStatus("Ajustes do avatar aplicados");
      break;
    }
    case "updateUiPrefs":
      localStorage.setItem(
        "noelle_ui_prefs",
        JSON.stringify({
          ...loadUiPrefs(),
          ...(payload.uiPrefs || {}),
        })
      );
      applyUiPrefsToShell();
      if (runtimeRef?.applyRuntimeQuality) runtimeRef.applyRuntimeQuality();
      setStatus("Preferências aplicadas");
      break;
    case "resetAvatarTuning":
      saveAvatarTuning({ ...DEFAULT_AVATAR_TUNING });
      localStorage.setItem("noelle_scale", String(DEFAULT_AVATAR_TUNING.defaultScale));
      state.scale = clamp(Number(DEFAULT_AVATAR_TUNING.defaultScale), AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
      centerAvatarFraming();
      setStatus("Ajustes do avatar resetados");
      break;
    case "applyImportedPreset":
      if (payload.presetName && CAMERA_PRESETS[payload.presetName]) {
        state.preset = payload.presetName;
        localStorage.setItem("noelle_preset", payload.presetName);
      }
      if (Number.isFinite(payload.scale)) {
        state.scale = payload.scale;
        localStorage.setItem("noelle_scale", String(payload.scale));
      }
      if (payload.lastMotionId) {
        state.lastMotionId = payload.lastMotionId;
        localStorage.setItem("noelle_last_motion", payload.lastMotionId);
      }
      if (inventoryManager) {
        if (typeof inventoryManager.clearAll === "function") inventoryManager.clearAll();
        await inventoryManager.restore(itemsById);
      }
      centerAvatarFraming();
      setStatus("Preset importado e aplicado");
      break;
    case "centerAvatar":
      centerAvatarFraming();
      break;
    case "clearAvatarItems":
      if (inventoryManager?.clearAll) inventoryManager.clearAll();
      try { localStorage.removeItem("noelle_equipped_items"); removeAvatarState("equipped_items"); } catch {}
      setStatus("Itens removidos");
      break;
    case "rotateAvatar":
      if (Number.isFinite(payload.deltaY)) {
        state.baseRotationY = (state.baseRotationY || 0) + payload.deltaY;
      } else if (Number.isFinite(payload.rotationY)) {
        state.baseRotationY = payload.rotationY;
      }
      writeAvatarState("rotationY", state.baseRotationY || 0);
      if (state.currentVRM) state.currentVRM.scene.rotation.y = state.baseRotationY || 0;
      setStatus("Rotação salva");
      break;
    case "resetAvatarRotation":
      state.baseRotationY = 0;
      writeAvatarState("rotationY", 0);
      if (state.currentVRM) state.currentVRM.scene.rotation.y = 0;
      setStatus("Rotação resetada");
      break;
    case "equipItem":
      if (state.currentVRM?.__staticModel) {
        setStatus("Itens presos ao corpo precisam de avatar VRM.", true);
        break;
      }
      if (inventoryManager && payload.itemId) {
        const item = itemsById.get(payload.itemId);
        if (item) await inventoryManager.equip(item, payload.slot);
      }
      break;
    case "unequipItem":
      if (inventoryManager && payload.itemId) {
        inventoryManager.unequip(payload.itemId);
      }
      break;
    default:
      break;
  }
}

function syncLegacyInventoryFromAvatarState() {
  try {
    const saved = localStorage.getItem(getAvatarStateKey("equipped_items"));
    if (saved) localStorage.setItem("noelle_equipped_items", saved);
    else localStorage.removeItem("noelle_equipped_items");
  } catch {}
}

function syncAvatarInventoryFromLegacy() {
  try {
    const raw = localStorage.getItem("noelle_equipped_items") || "{}";
    localStorage.setItem(getAvatarStateKey("equipped_items"), raw);
  } catch {}
}

async function main() {
  const startedClean = shouldStartCleanForAvatar();
  loadUiState();
  if (startedClean) {
    state.lastMotionId = "VRMA_02";
  }
  setStatus("Iniciando avatar...", true);
  applyUiPrefsToShell();
  refreshAvatarNamePill();
  refreshHintText();

  setStatus("Criando cena 3D...", true);
  const runtime = createSceneRuntime(THREE, stage);
  runtimeRef = runtime;

  const controls = new OrbitControls(runtime.camera, runtime.renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.enableZoom = false;
  controlsRef = controls;

  setStatus("Preparando loaders...", true);
  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  const [loadedMotions, loadedItems, loadedExpressions] = await Promise.all([
    withTimeout(loadMotionManifest(), 30000, "motion manifest"),
    withTimeout(loadItemManifest(), 30000, "item manifest"),
    withTimeout(loadExpressionManifest(), 20000, "expression manifest"),
  ]);

  motionDefs = loadedMotions;
  motionMap = createMotionMap(motionDefs);
  expressionDefs = loadedExpressions;
  itemsById = new Map(loadedItems.map((item) => [item.id, item]));

  await loadAvatarModel(loader, runtime);

  syncLegacyInventoryFromAvatarState();

  inventoryManager = createInventoryManager({
    loader,
    vrmState: state,
    sceneAnchor: runtime.sceneAnchor,
    onInventoryChanged: () => syncAvatarInventoryFromLegacy(),
    setStatus,
  });

  await inventoryManager.restore(itemsById);

  applyCameraPreset(runtime.camera, controls, state, state.preset);
  centerAvatarFraming();
  refreshHintText();
  startExpressionLoop();

  window.addEventListener("resize", runtime.resize);
  window.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (e.deltaY < 0) state.scale = clamp(state.scale + 0.03, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
      else state.scale = clamp(state.scale - 0.03, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
      applyScale(state.currentVRM, state.scale);
      saveUiState();
      setStatus("Zoom: " + Math.round(state.scale * 100) + "%");
    },
    { passive: false }
  );

  let dragging = false;
  window.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = true;
    window.desktopWidget?.startDrag(e.screenX, e.screenY);
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    window.desktopWidget?.dragMove(e.screenX, e.screenY);
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    window.desktopWidget?.endDrag();
  });

  window.desktopWidget?.onAvatarCommand?.((payload) => {
    handleAvatarCommand(loader, payload).catch((err) => showError(err?.stack || err));
  });

  window.desktopWidget?.onWindowState?.((_payload) => {}); window.addEventListener("noelle:item-behavior:motion", (event) => { const motionId = event?.detail?.motionId; if (motionId) playMotion(loader, motionId).catch((err) => showError(err?.stack || err)); }); window.addEventListener("noelle:item-behavior:expression", (event) => { const expressionId = event?.detail?.expressionId; if (expressionId && typeof showExpressionById === "function") showExpressionById(expressionId); });

  window.addEventListener("storage", () => {
    applyUiPrefsToShell();
    refreshHintText();
    if (runtimeRef?.applyRuntimeQuality) runtimeRef.applyRuntimeQuality();
  });

  const clock = new THREE.Clock();
  let lastRenderAt = 0;

  function getFrameIntervalMs() {
    const prefs = loadUiPrefs();
    if (document.hidden && !state.motionPlaying) return 250;
    if (prefs.performanceMode === "performance") return 33;
    if (prefs.performanceMode === "quality") return 16;
    return 22;
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = clock.getDelta();
    const t = now * 0.001;

    if (mixer) mixer.update(delta);
    if (state.currentVRM) {
      state.currentVRM.update(delta);
      updateIdle(state.currentVRM, t, state.motionPlaying && !state.motionPaused);
      state.currentVRM.scene.rotation.y = state.baseRotationY || 0;
    }

    if (now - lastRenderAt < getFrameIntervalMs()) return;
    lastRenderAt = now;

    controls.update();
    runtime.renderer.render(runtime.scene, runtime.camera);
  }

  animate();
}

main().catch((err) => showError(err?.stack || err));
