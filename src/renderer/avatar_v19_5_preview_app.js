import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from "@pixiv/three-vrm-animation";

/* NOELLE_V19_8_14_AVATAR_FIX_BEGIN */
function noelleApplyDefaultAPose(vrm, THREERef) {
  try {
    const humanoid = vrm && vrm.humanoid;
    const THREE_SAFE = THREERef || (typeof THREE !== 'undefined' ? THREE : null);
    if (!humanoid || !humanoid.getNormalizedBoneNode || !THREE_SAFE || !THREE_SAFE.MathUtils) return false;
    const rad = THREE_SAFE.MathUtils.degToRad;
    const bone = (name) => humanoid.getNormalizedBoneNode(name);
    const leftShoulder = bone('leftShoulder');
    const rightShoulder = bone('rightShoulder');
    const leftUpperArm = bone('leftUpperArm');
    const rightUpperArm = bone('rightUpperArm');
    const leftLowerArm = bone('leftLowerArm');
    const rightLowerArm = bone('rightLowerArm');

    if (leftShoulder) leftShoulder.rotation.z = rad(6);
    if (rightShoulder) rightShoulder.rotation.z = rad(-6);
    if (leftUpperArm) leftUpperArm.rotation.z = rad(18);
    if (rightUpperArm) rightUpperArm.rotation.z = rad(-18);
    if (leftLowerArm) leftLowerArm.rotation.z = rad(-2);
    if (rightLowerArm) rightLowerArm.rotation.z = rad(2);

    if (typeof vrm.update === 'function') vrm.update(0);
    return true;
  } catch (_) {
    return false;
  }
}
/* NOELLE_V19_8_14_AVATAR_FIX_END */


const mounted = new WeakMap();
let channel = null;

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
    source: "avatar-v19-5",
    type,
    payload,
    at: new Date().toISOString()
  };
  try {
    getChannel()?.postMessage(message);
  } catch {}
  try {
    localStorage.setItem("noelle.avatar.sync.state", JSON.stringify(message, null, 2));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("noelle:avatar-sync", { detail: message }));
  } catch {}
}

function updateDebug(ctx, text) {
  if (!ctx.debugEl) return;
  const previous = ctx.debugEl.textContent || "";
  const line = `[${new Date().toLocaleTimeString()}] ${text}`;
  ctx.debugEl.textContent = (line + "\n" + previous).slice(0, 4500);
}

function setStatus(ctx, text, type = "warn") {
  if (!ctx.statusEl) return;
  ctx.statusEl.innerHTML = `<span class="av195-pill ${type}">${text}</span>`;
  updateDebug(ctx, text);
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

async function loadMotionManifest(ctx) {
  const candidates = [
    "./assets/motion_manifest.json",
    "./assets/motions/motion_manifest.json",
    "./assets/room_manifest.json"
  ];
  const found = [];

  function collect(value) {
    if (!value) return;
    if (typeof value === "string" && value.toLowerCase().endsWith(".vrma")) {
      found.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) collect(item);
      return;
    }
    if (typeof value === "object") {
      for (const key of ["path", "file", "src", "url", "motion", "vrma"]) collect(value[key]);
      for (const item of Object.values(value)) {
        if (typeof item === "object") collect(item);
      }
    }
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      collect(await res.json());
      updateDebug(ctx, `manifest lido: ${url}`);
    } catch {}
  }

  const normalized = [...new Set(found)].map((path) => {
    let p = String(path).replace(/\\/g, "/");
    if (p.startsWith("./")) return p;
    if (p.startsWith("src/assets/")) return "./assets/" + p.slice("src/assets/".length);
    if (p.startsWith("assets/")) return "./" + p;
    if (p.startsWith("motions/")) return "./assets/" + p;
    return "./assets/motions/" + p.split("/").pop();
  });

  if (!normalized.length) {
    normalized.push(
      "./assets/motions/001_motion_pose.vrma",
      "./assets/motions/004_hello_1.vrma",
      "./assets/motions/006_drinkwater.vrma",
      "./assets/motions/VRMA_01.vrma"
    );
  }

  if (ctx.motionSelect) {
    for (const url of normalized.slice(0, 60)) {
      const option = document.createElement("option");
      option.value = url;
      option.textContent = url.split("/").pop();
      ctx.motionSelect.appendChild(option);
    }
  }

  updateDebug(ctx, `motions VRMA disponíveis: ${normalized.length}`);
}

async function loadAvatar(ctx, url) {
  setStatus(ctx, `Carregando ${url}...`, "warn");

  if (ctx.currentRoot) {
    ctx.scene.remove(ctx.currentRoot);
    disposeObject(ctx.currentRoot);
    ctx.currentRoot = null;
  }
  ctx.currentVRM = null;
  ctx.mixer = null;

  const loader = createVRMLoader();
  const gltf = await loader.loadAsync(url);
  const vrm = gltf?.userData?.vrm || null;
  const scene = vrm?.scene || gltf.scene || gltf.scenes?.[0];

  if (!scene) throw new Error("Arquivo carregou sem scene/vrm.scene");

  if (vrm) {
    try { VRMUtils.removeUnnecessaryVertices?.(scene); } catch {}
    try { VRMUtils.removeUnnecessaryJoints?.(scene); } catch {}
    try { VRMUtils.rotateVRM0?.(vrm); } catch {}
  }

  scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials.filter(Boolean)) {
        material.needsUpdate = true;
        if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = "NoelleAvatarV195PreviewRoot";
  wrapper.add(scene);
  normalizeModel(wrapper, 1.62);
  ctx.scene.add(wrapper);

  ctx.currentRoot = wrapper;
  ctx.currentVRM = vrm;
  ctx.currentUrl = url;
  ctx.mixer = new THREE.AnimationMixer(wrapper);

  setStatus(ctx, vrm ? `VRM ativo: ${url}` : `GLB fallback ativo: ${url}`, vrm ? "ok" : "warn");
  postSync("avatar:loaded", { url, hasVRM: !!vrm });
}

function setExpression(ctx, name, value = 1.0) {
  const manager = ctx.currentVRM?.expressionManager;
  if (!manager) {
    setStatus(ctx, "expressionManager não disponível neste VRM", "warn");
    return;
  }

  const names = ["happy", "relaxed", "angry", "sad", "aa", "ih", "ou", "ee", "oh", "blink", "blinkLeft", "blinkRight"];
  for (const n of names) {
    try { manager.setValue(n, 0); } catch {}
  }
  try { manager.setValue(name, value); } catch {}
  try { manager.update?.(); } catch {}

  setStatus(ctx, `Expression: ${name}`, "ok");
  postSync("expression:set", { name, value });
}

async function playMotion(ctx, url) {
  if (!ctx.currentVRM) {
    setStatus(ctx, "Carregue um VRM antes de tocar VRMA", "warn");
    return;
  }
  if (!url) {
    setStatus(ctx, "Nenhuma motion selecionada", "warn");
    return;
  }

  setStatus(ctx, `Carregando motion ${url}...`, "warn");
  const loader = createVRMALoader();
  const gltf = await loader.loadAsync(url);
  const vrmAnimation = gltf?.userData?.vrmAnimations?.[0];

  if (!vrmAnimation) throw new Error("VRMA não retornou userData.vrmAnimations[0]");

  const clip = createVRMAnimationClip(vrmAnimation, ctx.currentVRM);
  ctx.mixer?.stopAllAction?.();
  const action = ctx.mixer.clipAction(clip);
  action.reset().play();

  setStatus(ctx, `Motion ativa: ${url.split("/").pop()}`, "ok");
  postSync("motion:play", { url });
}

function stopMotion(ctx) {
  ctx.mixer?.stopAllAction?.();
  setStatus(ctx, "Motion parada", "ok");
  postSync("motion:stop", {});
}

function resize(ctx) {
  const rect = ctx.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  ctx.renderer.setSize(width, height, false);

try {
  const noelleAvatarTransparentV19815 = (r) => {
    if (!r) return;
    if (typeof r.setClearColor === 'function') r.setClearColor(0x000000, 0);
    if (typeof r.setClearAlpha === 'function') r.setClearAlpha(0);
    if (r.domElement) {
      r.domElement.style.background = 'transparent';
      r.domElement.style.backgroundColor = 'transparent';
      if (r.domElement.parentElement) {
        r.domElement.parentElement.style.background = 'transparent';
        r.domElement.parentElement.style.backgroundColor = 'transparent';
      }
    }
  };
  if (typeof renderer !== 'undefined') noelleAvatarTransparentV19815(renderer);
} catch (_) {}

  ctx.camera.aspect = width / height;
  ctx.camera.updateProjectionMatrix();
}

function animate(ctx) {
  if (ctx.disposed) return;
  const dt = Math.min(0.05, ctx.clock.getDelta());

  if (ctx.currentVRM?.update) {
    try { ctx.currentVRM.update(dt); } catch {}
  }
  if (ctx.mixer) {
    try { ctx.mixer.update(dt); } catch {}
  }

  if (!ctx.mixer && ctx.currentRoot) {
    ctx.idleTime += dt;
    ctx.currentRoot.position.y = Math.sin(ctx.idleTime * 2.0) * 0.012;
  }

  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  ctx.frame = requestAnimationFrame(() => animate(ctx));
}

export async function mount(options) {
  const root = options.root;
  if (!root || mounted.has(root)) return mounted.get(root);

  const canvas = options.canvas;
  if (!canvas) throw new Error("canvas ausente no painel Avatar V19.5");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x10101c);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 1.25, 4.2);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x242435, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2, 4, 3);
  key.castShadow = true;
  scene.add(key);

  const grid = new THREE.GridHelper(4, 20, 0xff477e, 0x39394a);
  grid.position.y = 0;
  scene.add(grid);

  const ctx = {
    root,
    canvas,
    renderer,
    scene,
    camera,
    controls,
    clock: new THREE.Clock(),
    statusEl: options.statusEl,
    debugEl: options.debugEl,
    avatarSelect: options.avatarSelect,
    motionSelect: options.motionSelect,
    currentRoot: null,
    currentVRM: null,
    currentUrl: null,
    mixer: null,
    idleTime: 0,
    disposed: false,
    frame: 0
  };

  mounted.set(root, ctx);

  const ro = new ResizeObserver(() => resize(ctx));
  ro.observe(canvas);
  ctx.resizeObserver = ro;
  resize(ctx);

  await loadMotionManifest(ctx);
  await loadAvatar(ctx, ctx.avatarSelect?.value || "./assets/Noelle.vrm").catch((err) => {
    console.error(err);
    setStatus(ctx, `Falha ao carregar avatar: ${err.message}`, "danger");
    updateDebug(ctx, err.stack || err.message);
  });

  root.addEventListener("click", async (event) => {
    const action = event.target?.dataset?.av195Action;
    if (!action) return;

    try {
      if (action === "load") await loadAvatar(ctx, ctx.avatarSelect?.value || "./assets/Noelle.vrm");
      if (action === "idle") {
        stopMotion(ctx);
        setExpression(ctx, "relaxed", 0.25);
        postSync("state:idle", { url: ctx.currentUrl });
      }
      if (action === "blink") setExpression(ctx, "blink", 1.0);
      if (action === "happy") setExpression(ctx, "happy", 1.0);
      if (action === "neutral") setExpression(ctx, "neutral", 0.0);
      if (action === "play-motion") await playMotion(ctx, ctx.motionSelect?.value);
      if (action === "stop-motion") stopMotion(ctx);
      if (action === "sync-room") {
        postSync("avatar:sync-room", { url: ctx.currentUrl, motion: ctx.motionSelect?.value || "" });
        setStatus(ctx, "Estado enviado para Room", "ok");
      }
      if (action === "copy-report") {
        const report = {
          patch: "V19.5",
          avatarUrl: ctx.currentUrl,
          hasVRM: !!ctx.currentVRM,
          motion: ctx.motionSelect?.value || "",
          renderer: "three.js + @pixiv/three-vrm",
          sync: "BroadcastChannel noelle-avatar-room-sync + localStorage"
        };
        await navigator.clipboard?.writeText(JSON.stringify(report, null, 2));
        setStatus(ctx, "Relatório copiado", "ok");
      }
    } catch (err) {
      console.error(err);
      setStatus(ctx, `Erro: ${err.message}`, "danger");
      updateDebug(ctx, err.stack || err.message);
    }
  });

  ctx.avatarSelect?.addEventListener("change", () => {
    loadAvatar(ctx, ctx.avatarSelect.value).catch((err) => {
      console.error(err);
      setStatus(ctx, `Falha: ${err.message}`, "danger");
    });
  });

  animate(ctx);
  setStatus(ctx, "Preview VRM pronto", "ok");
  return ctx;
}

export function unmount(root) {
  const ctx = mounted.get(root);
  if (!ctx) return;

  ctx.disposed = true;
  cancelAnimationFrame(ctx.frame);
  ctx.resizeObserver?.disconnect?.();
  ctx.controls?.dispose?.();
  if (ctx.currentRoot) disposeObject(ctx.currentRoot);
  ctx.renderer?.dispose?.();
  mounted.delete(root);
}
