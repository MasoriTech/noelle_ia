import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from "@pixiv/three-vrm-animation";

const els = {
  canvas: document.getElementById("avatarCanvas"),
  statusPill: document.getElementById("statusPill"),
  syncPill: document.getElementById("syncPill"),
  overlay: document.getElementById("overlayPills"),
  debug: document.getElementById("debugBox"),
  avatarSelect: document.getElementById("avatarSelect"),
  localFile: document.getElementById("localFile"),
  motionSelect: document.getElementById("motionSelect"),
  zoomRange: document.getElementById("zoomRange"),
  btnLoad: document.getElementById("btnLoad"),
  btnResetCamera: document.getElementById("btnResetCamera"),
  btnIdle: document.getElementById("btnIdle"),
  btnBlink: document.getElementById("btnBlink"),
  btnHappy: document.getElementById("btnHappy"),
  btnNeutral: document.getElementById("btnNeutral"),
  btnPlayMotion: document.getElementById("btnPlayMotion"),
  btnStopMotion: document.getElementById("btnStopMotion"),
  btnSyncRoom: document.getElementById("btnSyncRoom"),
  btnCopyReport: document.getElementById("btnCopyReport")
};

const state = {
  currentRoot: null,
  currentVRM: null,
  currentUrl: "",
  mixer: null,
  idleTime: 0,
  selectedMotion: "",
  lastSync: null,
  objectUrls: []
};

let channel = null;

function log(message) {
  const line = `[${new Date().toLocaleTimeString()}] ${message}`;
  els.debug.textContent = `${line}\n${els.debug.textContent || ""}`.slice(0, 6000);
  console.log("[Avatar Lab V19.6]", message);
}

function setStatus(text, type = "warn") {
  els.statusPill.textContent = text;
  els.statusPill.className = `pill ${type}`;
  log(text);
}

function setOverlay(items) {
  els.overlay.innerHTML = "";
  for (const item of items) {
    const span = document.createElement("span");
    span.className = `pill ${item.type || ""}`;
    span.textContent = item.text;
    els.overlay.appendChild(span);
  }
}

function getChannel() {
  if (channel) return channel;
  try {
    channel = new BroadcastChannel("noelle-avatar-room-sync");
  } catch {
    channel = null;
  }
  return channel;
}

function postSync(type, payload = {}) {
  const message = {
    source: "avatar-lab-v19-6",
    type,
    payload,
    at: new Date().toISOString()
  };

  state.lastSync = message;

  try { getChannel()?.postMessage(message); } catch {}
  try { localStorage.setItem("noelle.avatar.sync.state", JSON.stringify(message, null, 2)); } catch {}
  try { window.dispatchEvent(new CustomEvent("noelle:avatar-sync", { detail: message })); } catch {}

  els.syncPill.textContent = `Room sync: ${type}`;
  els.syncPill.className = "pill ok";
  log(`Sync enviado: ${type}`);
}

function absUrl(url) {
  if (url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("file:")) return url;
  return new URL(url, document.baseURI).href;
}

function createVRMLoader() {
  const loader = new GLTFLoader();
  loader.setCrossOrigin?.("anonymous");
  loader.register((parser) => new VRMLoaderPlugin(parser));
  return loader;
}

function createVRMALoader() {
  const loader = new GLTFLoader();
  loader.setCrossOrigin?.("anonymous");
  loader.register((parser) => new VRMAnimationLoaderPlugin(parser));
  return loader;
}

function disposeObject(object) {
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials.filter(Boolean)) {
      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value?.isTexture) value.dispose?.();
      }
      material.dispose?.();
    }
  });
}

function normalizeModel(root, targetHeight = 1.62) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;

  const scale = targetHeight / Math.max(0.01, size.y);
  root.scale.setScalar(Math.max(0.001, Math.min(20, scale)));
}

const renderer = new THREE.WebGLRenderer({
  canvas: els.canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10101c);

const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
camera.position.set(0, 1.25, 4.2);

const controls = new OrbitControls(camera, els.canvas);
controls.target.set(0, 1.0, 0);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xffffff, 0x242435, 1.25));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(2, 4, 3);
key.castShadow = true;
scene.add(key);

const grid = new THREE.GridHelper(4, 20, 0xff477e, 0x39394a);
scene.add(grid);

const clock = new THREE.Clock();

function resize() {
  const rect = els.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(els.canvas);
resize();

function resetCamera() {
  camera.position.set(0, 1.25, Number(els.zoomRange.value || 4.2));
  controls.target.set(0, 1.0, 0);
  controls.update();
}

function clearAvatar() {
  if (state.currentRoot) {
    scene.remove(state.currentRoot);
    disposeObject(state.currentRoot);
  }
  state.currentRoot = null;
  state.currentVRM = null;
  state.mixer = null;
}

async function loadAvatar(url, label = url) {
  const finalUrl = absUrl(url);
  setStatus(`Carregando ${label}...`, "warn");

  clearAvatar();

  const loader = createVRMLoader();
  const gltf = await loader.loadAsync(finalUrl);

  const vrm = gltf?.userData?.vrm || null;
  const vrmScene = vrm?.scene || gltf.scene || gltf.scenes?.[0];

  if (!vrmScene) throw new Error("Arquivo carregou sem vrm.scene/scene");

  if (vrm) {
    try { VRMUtils.removeUnnecessaryVertices?.(vrmScene); } catch {}
    try { VRMUtils.removeUnnecessaryJoints?.(vrmScene); } catch {}
    try { VRMUtils.rotateVRM0?.(vrm); } catch {}
  }

  vrmScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = false;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials.filter(Boolean)) {
      material.needsUpdate = true;
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = "AvatarLabV196Root";
  wrapper.add(vrmScene);
  normalizeModel(wrapper, 1.62);
  scene.add(wrapper);

  state.currentRoot = wrapper;
  state.currentVRM = vrm;
  state.currentUrl = label;
  state.mixer = new THREE.AnimationMixer(wrapper);
  state.idleTime = 0;

  setOverlay([
    { text: vrm ? "VRM ativo" : "GLB fallback", type: vrm ? "ok" : "warn" },
    { text: label.split("/").pop(), type: "ok" }
  ]);
  setStatus(vrm ? `VRM ativo: ${label}` : `Modelo ativo: ${label}`, vrm ? "ok" : "warn");
  postSync("avatar:loaded", { url: label, hasVRM: !!vrm });
}

function setExpression(name, value = 1) {
  const manager = state.currentVRM?.expressionManager;
  if (!manager) {
    setStatus("expressionManager não disponível neste VRM", "warn");
    return;
  }

  const names = ["happy", "relaxed", "angry", "sad", "aa", "ih", "ou", "ee", "oh", "blink", "blinkLeft", "blinkRight", "neutral"];
  for (const n of names) {
    try { manager.setValue(n, 0); } catch {}
  }

  if (name !== "neutral") {
    try { manager.setValue(name, value); } catch {}
  }
  try { manager.update?.(); } catch {}

  setStatus(`Expression: ${name}`, "ok");
  postSync("expression:set", { name, value });
}

function stopMotion() {
  state.mixer?.stopAllAction?.();
  setStatus("Motion parada", "ok");
  postSync("motion:stop", {});
}

async function playMotion(url) {
  if (!state.currentVRM) {
    setStatus("Carregue um VRM antes de tocar VRMA", "warn");
    return;
  }
  if (!url) {
    setStatus("Nenhuma motion selecionada", "warn");
    return;
  }

  const finalUrl = absUrl(url);
  setStatus(`Carregando motion ${url.split("/").pop()}...`, "warn");

  const loader = createVRMALoader();
  const gltf = await loader.loadAsync(finalUrl);
  const vrmAnimation = gltf?.userData?.vrmAnimations?.[0];

  if (!vrmAnimation) throw new Error("VRMA sem userData.vrmAnimations[0]");

  const clip = createVRMAnimationClip(vrmAnimation, state.currentVRM);
  state.mixer?.stopAllAction?.();

  const action = state.mixer.clipAction(clip);
  action.reset().play();

  setStatus(`Motion ativa: ${url.split("/").pop()}`, "ok");
  postSync("motion:play", { url });
}

function collectMotions(value, out) {
  if (!value) return;
  if (typeof value === "string" && value.toLowerCase().endsWith(".vrma")) {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMotions(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const key of ["path", "file", "src", "url", "motion", "vrma"]) collectMotions(value[key], out);
    for (const item of Object.values(value)) if (typeof item === "object") collectMotions(item, out);
  }
}

function normalizeMotionPath(path) {
  let p = String(path).replace(/\\/g, "/");
  if (p.startsWith("./")) return p;
  if (p.startsWith("src/assets/")) return "./assets/" + p.slice("src/assets/".length);
  if (p.startsWith("assets/")) return "./" + p;
  if (p.startsWith("motions/")) return "./assets/" + p;
  return "./assets/motions/" + p.split("/").pop();
}

async function loadMotionManifest() {
  const candidates = [
    "./assets/motion_manifest.json",
    "./assets/motions/motion_manifest.json",
    "./assets/room_manifest.json"
  ];
  const found = [];

  for (const url of candidates) {
    try {
      const res = await fetch(absUrl(url), { cache: "no-store" });
      if (!res.ok) continue;
      collectMotions(await res.json(), found);
      log(`Manifest lido: ${url}`);
    } catch (err) {
      log(`Manifest indisponível: ${url}`);
    }
  }

  let motions = [...new Set(found.map(normalizeMotionPath))];

  if (!motions.length) {
    motions = [
      "./assets/motions/001_motion_pose.vrma",
      "./assets/motions/004_hello_1.vrma",
      "./assets/motions/006_drinkwater.vrma",
      "./assets/motions/VRMA_01.vrma"
    ];
  }

  for (const url of motions.slice(0, 80)) {
    const option = document.createElement("option");
    option.value = url;
    option.textContent = url.split("/").pop();
    els.motionSelect.appendChild(option);
  }

  log(`Motions VRMA disponíveis: ${motions.length}`);
}

function copyReport() {
  const report = {
    patch: "Noelle V19.6 Avatar Lab Isolated",
    currentUrl: state.currentUrl,
    hasVRM: !!state.currentVRM,
    selectedMotion: els.motionSelect.value || "",
    sync: "BroadcastChannel noelle-avatar-room-sync + localStorage noelle.avatar.sync.state",
    documentBase: document.baseURI,
    note: "Se caminho local falhar, use input de arquivo local."
  };

  navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
  setStatus("Relatório copiado", "ok");
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());

  if (state.currentVRM?.update) {
    try { state.currentVRM.update(dt); } catch {}
  }
  if (state.mixer) {
    try { state.mixer.update(dt); } catch {}
  }

  if (state.currentRoot && !state.mixer) {
    state.idleTime += dt;
    state.currentRoot.position.y = Math.sin(state.idleTime * 2.0) * 0.012;
  }

  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

els.btnLoad.addEventListener("click", async () => {
  try {
    if (els.localFile.files?.[0]) {
      const file = els.localFile.files[0];
      const objectUrl = URL.createObjectURL(file);
      state.objectUrls.push(objectUrl);
      await loadAvatar(objectUrl, file.name);
      return;
    }
    await loadAvatar(els.avatarSelect.value, els.avatarSelect.value);
  } catch (err) {
    console.error(err);
    setStatus(`Falha ao carregar avatar: ${err.message}`, "danger");
    log(err.stack || err.message);
  }
});

els.localFile.addEventListener("change", () => {
  if (els.localFile.files?.[0]) {
    setStatus(`Arquivo local selecionado: ${els.localFile.files[0].name}`, "warn");
  }
});

els.avatarSelect.addEventListener("change", () => {
  els.localFile.value = "";
});

els.btnResetCamera.addEventListener("click", resetCamera);
els.zoomRange.addEventListener("input", resetCamera);
els.btnIdle.addEventListener("click", () => {
  stopMotion();
  setExpression("relaxed", 0.25);
  postSync("state:idle", { url: state.currentUrl });
});
els.btnBlink.addEventListener("click", () => setExpression("blink", 1));
els.btnHappy.addEventListener("click", () => setExpression("happy", 1));
els.btnNeutral.addEventListener("click", () => setExpression("neutral", 0));
els.btnPlayMotion.addEventListener("click", () => {
  playMotion(els.motionSelect.value).catch((err) => {
    console.error(err);
    setStatus(`Erro VRMA: ${err.message}`, "danger");
    log(err.stack || err.message);
  });
});
els.btnStopMotion.addEventListener("click", stopMotion);
els.btnSyncRoom.addEventListener("click", () => {
  postSync("avatar:sync-room", {
    url: state.currentUrl,
    motion: els.motionSelect.value || "",
    hasVRM: !!state.currentVRM
  });
  setStatus("Estado enviado para Room", "ok");
});
els.btnCopyReport.addEventListener("click", copyReport);

window.addEventListener("beforeunload", () => {
  for (const url of state.objectUrls) {
    try { URL.revokeObjectURL(url); } catch {}
  }
});

await loadMotionManifest();
await loadAvatar(els.avatarSelect.value, els.avatarSelect.value).catch((err) => {
  console.error(err);
  setStatus(`Falha ao carregar avatar por caminho: ${err.message}. Use arquivo local.`, "danger");
  log(err.stack || err.message);
});

resetCamera();
animate();
