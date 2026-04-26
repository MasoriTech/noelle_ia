import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { createVRMAnimationClip, VRMAnimationLoaderPlugin, VRMLookAtQuaternionProxy } from "@pixiv/three-vrm-animation";

import { AVATAR_CONFIG, CAMERA_PRESETS } from "./config.js";
import { createSceneRuntime } from "./scene.js";
import { clamp, applyRelaxedPose, applyCameraPreset, applyScale, updateIdle } from "./avatar.js";
import { loadMotionManifest, createMotionMap, describeMotion } from "./motions.js";
import { loadItemManifest, createInventoryManager, buildContextActions } from "./items.js";
import {
  buildEmoteWheel, buildCameraMenu, buildMotionList, buildInventoryGrid, openItemMenu,
  closeItemMenu, togglePanel, setStatus, showError, updatePresetLabel, updateMotionLabel,
  setPinActive, setClickThroughActive, setPauseActive, updateEquippedSummary
} from "./ui.js";

const stage = document.getElementById("stage");

const state = {
  currentVRM: null,
  scale: AVATAR_CONFIG.defaultScale,
  preset: "half",
  lastMotionId: "VRMA_02",
  lastMotionLabel: "Greeting",
  motionPlaying: false,
  motionPaused: false,
};

let mixer = null;
let currentAction = null;
const motionClipCache = new Map();

const EXPRESSION_INTERVAL_MS = 60_000;
const EXPRESSION_VISIBLE_MS = 8_500;
let expressionTimer = null;
let expressionHideTimer = null;
let lastExpressionIndex = -1;
let expressionDefs = [];

function byId(id) {
  return document.getElementById(id);
}

function bindClick(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener("click", handler);
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
    const res = await fetch("./assets/expressions/manifest.json", { cache: "no-store" });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list.map((item) => ({
      file: `./assets/expressions/${item.file}`,
      label: item.label || item.file
    })) : [];
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
  expressionHideTimer = setTimeout(() => hideExpression(), EXPRESSION_VISIBLE_MS);
}

function startExpressionLoop() {
  clearInterval(expressionTimer);
  if (!expressionDefs.length) return;
  expressionTimer = setInterval(() => showRandomExpression(), EXPRESSION_INTERVAL_MS);
}

window.addEventListener("error", (e) => showError("Erro JS: " + (e.message || e.error || "desconhecido")));
window.addEventListener("unhandledrejection", (e) => showError("Promise rejeitada: " + (e.reason?.message || e.reason || "desconhecida")));

function saveUiState() {
  localStorage.setItem("noelle_scale", String(state.scale));
  localStorage.setItem("noelle_preset", state.preset);
  localStorage.setItem("noelle_last_motion", state.lastMotionId);
}

function loadUiState() {
  const scale = Number(localStorage.getItem("noelle_scale"));
  const preset = localStorage.getItem("noelle_preset");
  const lastMotion = localStorage.getItem("noelle_last_motion");
  if (!Number.isNaN(scale)) state.scale = clamp(scale, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
  if (preset && CAMERA_PRESETS[preset]) state.preset = preset;
  if (lastMotion) state.lastMotionId = lastMotion;
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
  setPauseActive(false);
  if (state.currentVRM) applyRelaxedPose(state.currentVRM);
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
  setPauseActive(state.motionPaused);
  setStatus(state.motionPaused ? "Emote pausado" : "Emote retomado");
}

async function loadVRM(loader, runtime) {
  setStatus("Carregando Noelle.vrm...", true);
  const gltf = await withTimeout(loader.loadAsync("./assets/Noelle.vrm"), 30000, "carregamento do VRM");
  state.currentVRM = gltf.userData.vrm;

  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  state.currentVRM.scene.traverse((obj) => { obj.frustumCulled = false; });

  state.currentVRM.scene.rotation.y = 0;
  state.currentVRM.scene.position.set(0, AVATAR_CONFIG.baseY, 0);

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
    setPauseActive(false);
    if (currentAction) {
      currentAction.stop();
      currentAction = null;
    }
    setStatus("Emote concluído");
  });

  setStatus("Noelle carregada");
}

async function getMotionClip(loader, motionId, motionMap) {
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

async function playMotion(loader, motionId, motionMap, motionDefs) {
  if (!state.currentVRM || !mixer) return;
  try {
    const clip = await getMotionClip(loader, motionId, motionMap);
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
    setPauseActive(false);
    state.lastMotionId = motionId;
    state.lastMotionLabel = describeMotion(motionId, motionDefs);
    updateMotionLabel(state.lastMotionLabel);
    togglePanel("wheelRoot", false);
    saveUiState();
    setStatus("Tocando emote: " + state.lastMotionLabel);
  } catch (err) {
    showError("Falha ao tocar motion " + motionId + ": " + err);
  }
}

async function main() {
  loadUiState();
  setStatus("Iniciando...", true);

  const startupWatchdog = setTimeout(() => {
    showError("A inicialização demorou demais. Verifique manifests, VRM e motions.");
  }, 35000);

  const runtime = createSceneRuntime(THREE, stage);
  const controls = new OrbitControls(runtime.camera, runtime.renderer.domElement);
  controls.enablePan = false;
  controls.enableRotate = false;
  controls.enableDamping = true;
  controls.enableZoom = false;

  const loader = new GLTFLoader();
  loader.crossOrigin = "anonymous";
  loader.register((parser) => new VRMLoaderPlugin(parser));
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

  const manifestResults = await Promise.allSettled([
    withTimeout(loadMotionManifest(), 15000, "motion manifest"),
    withTimeout(loadItemManifest(), 15000, "item manifest"),
    withTimeout(loadExpressionManifest(), 10000, "expression manifest"),
  ]);

  const motionDefs = manifestResults[0].status === "fulfilled" ? manifestResults[0].value : [];
  const inventoryItems = manifestResults[1].status === "fulfilled" ? manifestResults[1].value : [];
  expressionDefs = manifestResults[2].status === "fulfilled" ? manifestResults[2].value : [];

  if (manifestResults[0].status === "rejected") console.warn(manifestResults[0].reason);
  if (manifestResults[1].status === "rejected") console.warn(manifestResults[1].reason);
  if (manifestResults[2].status === "rejected") console.warn(manifestResults[2].reason);

  const motionMap = createMotionMap(motionDefs);
  const itemsById = new Map(inventoryItems.map((item) => [item.id, item]));

  await loadVRM(loader, runtime);

  const inventoryManager = createInventoryManager({
    loader,
    vrmState: state,
    sceneAnchor: runtime.sceneAnchor,
    onInventoryChanged: () => {
      buildInventoryGrid(inventoryItems, inventoryManager, onOpenItemMenu);
      updateEquippedSummary(inventoryManager);
    },
    setStatus
  });

  buildCameraMenu(CAMERA_PRESETS, (preset) => {
    applyCameraPreset(runtime.camera, controls, state, preset);
    applyScale(state.currentVRM, state.scale);
    updatePresetLabel(CAMERA_PRESETS[preset]?.label || "Meio corpo");
    saveUiState();
    setStatus("Câmera: " + (CAMERA_PRESETS[preset]?.label || preset));
  });

  buildEmoteWheel((motionId) => playMotion(loader, motionId, motionMap, motionDefs));
  buildMotionList(motionDefs, (motionId) => playMotion(loader, motionId, motionMap, motionDefs));
  buildInventoryGrid(inventoryItems, inventoryManager, onOpenItemMenu);
  updateEquippedSummary(inventoryManager);

  try {
    await inventoryManager.restore(itemsById);
  } catch (err) {
    console.warn("Falha ao restaurar inventário:", err);
  }
  buildInventoryGrid(inventoryItems, inventoryManager, onOpenItemMenu);
  updateEquippedSummary(inventoryManager);

  function onOpenItemMenu(item, cardEl) {
    const actions = buildContextActions(item, inventoryManager);
    openItemMenu(cardEl, item, actions, async (entry) => {
      if (entry.action) {
        await entry.action();
        return;
      }
      if (entry.slot) {
        await inventoryManager.equip(item, entry.slot);
      }
    });
  }

  document.addEventListener("mousedown", (event) => {
    const target = event.target;
    const insideMenu = target && typeof target.closest === "function"
      ? target.closest("#itemMenu, .inventory-card")
      : null;
    if (!insideMenu) closeItemMenu();
  });

  const windowState = await window.desktopWidget?.getWindowState?.();
  setPinActive(windowState?.alwaysOnTop);
  setClickThroughActive(windowState?.clickThrough);

  window.desktopWidget?.onAlwaysOnTopState?.((value) => {
    setPinActive(value);
    setStatus(value ? "Sempre no topo: ligado" : "Sempre no topo: desligado");
    window.desktopWidget?.refreshTrayMenu?.();
  });

  window.desktopWidget?.onClickThroughState?.((value) => {
    setClickThroughActive(value);
    setStatus(value ? "Clique atravessável: ligado" : "Clique atravessável: desligado");
    window.desktopWidget?.refreshTrayMenu?.();
  });

  bindClick("settingsBtn", () => {
    togglePanel("settingsPanel");
    togglePanel("libraryPanel", false);
    togglePanel("wheelRoot", false);
  });

  bindClick("inventoryBtn", () => {
    togglePanel("libraryPanel");
    togglePanel("settingsPanel", false);
    togglePanel("wheelRoot", false);
  });

  bindClick("emoteBtn", () => {
    hideExpression();
    togglePanel("wheelRoot");
    togglePanel("settingsPanel", false);
    togglePanel("libraryPanel", false);
  });

  bindClick("replayBtn", () => {
    hideExpression();
    playMotion(loader, state.lastMotionId, motionMap, motionDefs);
  });
  bindClick("pauseBtn", () => togglePauseMotion());
  bindClick("stopBtn", () => {
    hideExpression();
    stopCurrentMotion();
  });
  bindClick("clickThroughBtn", () => window.desktopWidget?.toggleClickThrough());
  bindClick("pinBtn", () => window.desktopWidget?.toggleAlwaysOnTop());
  bindClick("resetBtn", () => window.desktopWidget?.resetWindowPosition());
  bindClick("closeBtn", () => window.desktopWidget?.closeWidget());
  bindClick("quitBtn", () => window.desktopWidget?.quitApp());

  bindClick("zoomResetBtn", () => {
    state.scale = AVATAR_CONFIG.defaultScale;
    applyScale(state.currentVRM, state.scale);
    saveUiState();
    setStatus("Zoom resetado");
    const zoomBtn = byId("zoomResetBtn");
    if (zoomBtn) zoomBtn.textContent = Math.round(state.scale * 100) + "%";
  });

  applyCameraPreset(runtime.camera, controls, state, state.preset);
  updatePresetLabel(CAMERA_PRESETS[state.preset]?.label || "Meio corpo");
  state.lastMotionLabel = describeMotion(state.lastMotionId, motionDefs);
  updateMotionLabel(state.lastMotionLabel);
  {
    const zoomBtn = byId("zoomResetBtn");
    if (zoomBtn) zoomBtn.textContent = Math.round(state.scale * 100) + "%";
  }

  startExpressionLoop();
  clearTimeout(startupWatchdog);

  window.addEventListener("resize", runtime.resize);
  window.addEventListener("wheel", (e) => {
    e.preventDefault();
    if (e.deltaY < 0) state.scale = clamp(state.scale + 0.05, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
    else state.scale = clamp(state.scale - 0.05, AVATAR_CONFIG.minScale, AVATAR_CONFIG.maxScale);
    applyScale(state.currentVRM, state.scale);
    saveUiState();
    const zoomBtn = byId("zoomResetBtn");
    if (zoomBtn) zoomBtn.textContent = Math.round(state.scale * 100) + "%";
    setStatus("Zoom: " + Math.round(state.scale * 100) + "%");
  }, { passive: false });

  let dragging = false;
  window.addEventListener("mousedown", (e) => {
    const target = e.target;
    const interactive = target && typeof target.closest === "function"
      ? target.closest(".chrome-btn, .menu-item, .wheel-item, #wheelCenter, .inventory-card, .list-item, #itemMenu, .item-menu-btn, .tab-btn")
      : null;
    if (interactive) return;
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

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const t = performance.now() * 0.001;

    if (mixer) mixer.update(delta);
    if (state.currentVRM) {
      state.currentVRM.update(delta);
      updateIdle(state.currentVRM, t, state.motionPlaying && !state.motionPaused);
    }

    controls.update();
    runtime.renderer.render(runtime.scene, runtime.camera);
  }

  animate();
}

main().catch((err) => showError(err?.stack || err));
