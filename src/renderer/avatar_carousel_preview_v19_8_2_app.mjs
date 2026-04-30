import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

/* NOELLE_V19_8_17_APOSE_BEGIN */
function noelleApplyAPoseV19817(vrm) {
  try {
    const humanoid = vrm && vrm.humanoid;
    if (!humanoid) return false;

    const getBone = humanoid.getNormalizedBoneNode
      ? (name) => humanoid.getNormalizedBoneNode(name)
      : (name) => (humanoid.getRawBoneNode ? humanoid.getRawBoneNode(name) : null);

    const rad = (deg) => deg * Math.PI / 180;
    const set = (name, axis, deg) => {
      const bone = getBone(name);
      if (bone && bone.rotation) bone.rotation[axis] = rad(deg);
    };

    // A-pose leve: braços descem do T-pose sem parecerem colados ao corpo.
    set('leftShoulder', 'z', -5);
    set('rightShoulder', 'z', 5);
    set('leftUpperArm', 'z', -38);
    set('rightUpperArm', 'z', 38);
    set('leftLowerArm', 'z', -6);
    set('rightLowerArm', 'z', 6);
    set('leftHand', 'z', -3);
    set('rightHand', 'z', 3);

    if (typeof vrm.update === 'function') vrm.update(0);
    return true;
  } catch (_) {
    return false;
  }
}
/* NOELLE_V19_8_17_APOSE_END */


/* NOELLE_V19_8_15_AVATAR_FIX_BEGIN */
function noelleForceAvatarAPoseV19815(vrm, THREERef) {
  try {
    const THREE_SAFE = THREERef || (typeof THREE !== 'undefined' ? THREE : null);
    const humanoid = vrm && vrm.humanoid;
    if (!humanoid || !THREE_SAFE || !THREE_SAFE.MathUtils) return false;
    const getBone = humanoid.getNormalizedBoneNode
      ? (name) => humanoid.getNormalizedBoneNode(name)
      : (name) => (humanoid.getRawBoneNode ? humanoid.getRawBoneNode(name) : null);
    const rad = THREE_SAFE.MathUtils.degToRad || ((v) => v * Math.PI / 180);
    const set = (name, axis, deg) => {
      const b = getBone(name);
      if (b && b.rotation) b.rotation[axis] = rad(deg);
    };
    set('leftShoulder', 'z', 8);
    set('rightShoulder', 'z', -8);
    set('leftUpperArm', 'z', 22);
    set('rightUpperArm', 'z', -22);
    set('leftLowerArm', 'z', -4);
    set('rightLowerArm', 'z', 4);
    set('leftHand', 'z', -2);
    set('rightHand', 'z', 2);
    if (typeof vrm.update === 'function') vrm.update(0);
    return true;
  } catch (_) {
    return false;
  }
}
/* NOELLE_V19_8_15_AVATAR_FIX_END */


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


const stage = document.getElementById("stage");
const statusEl = document.getElementById("status");
const fallback = document.getElementById("fallback");
const params = new URLSearchParams(location.search);
const avatarParam = params.get("avatar") || "";
const nameParam = params.get("name") || "Avatar";

let renderer;
let scene;
let camera;
let controls;
let currentRoot = null;
let currentVrm = null;
let rafId = 0;

function setStatus(text, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = type;
}

function toPreviewPath(rel) {
  let p = String(rel || "").replace(/\\/g, "/").replace(/^\.\//, "");
  p = p.replace(/^src\//i, "");
  p = p.replace(/^\/src\//i, "");
  if (/^(file:|https?:|data:|blob:)/i.test(p)) return p;
  if (p.startsWith("assets/")) return `./${p}`;
  if (p.startsWith("./assets/")) return p;
  return `./assets/${p.split("/").pop()}`;
}

function disposeObject(root) {
  if (!root) return;
  root.traverse?.((obj) => {
    if (obj.geometry?.dispose) obj.geometry.dispose();
    const material = obj.material;
    if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
    else material?.dispose?.();
  });
}

function clearAvatar() {
  if (currentRoot) {
    scene.remove(currentRoot);
    disposeObject(currentRoot);
    currentRoot = null;
  }
  currentVrm = null;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080706);

  camera = new THREE.PerspectiveCamera(28, window.innerWidth / Math.max(1, window.innerHeight), 0.01, 100);
  camera.position.set(0, 1.45, 4.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setClearColor(0x080706, 1);
try {
  const stage = (renderer && renderer.domElement && renderer.domElement.parentElement) ? renderer.domElement.parentElement : null;
  if (stage) {
    stage.style.background = 'linear-gradient(135deg, #080706, #15100c)';
    stage.style.backgroundImage = 'radial-gradient(circle at 50% 35%, rgba(255,122,26,.14), transparent 36%), linear-gradient(135deg, #080706, #15100c)';
  }
  if (renderer && renderer.domElement) renderer.domElement.style.background = '#080706';
} catch (_) {}

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);

try {
  const noelleAvatarTransparentV19815 = (r) => {
    if (!r) return;
    if (typeof r.setClearColor === 'function') r.setClearColor(0x080706, 1);
    if (typeof r.setClearAlpha === 'function') r.setClearAlpha(1);
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

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x443366, 2.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(2.5, 4.5, 3.0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffb7cc, 1.2);
  rim.position.set(-3, 2.2, -2);
  scene.add(rim);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.5;
  controls.maxDistance = 7;
  controls.target.set(0, 1.25, 0);
  controls.update();

  window.addEventListener("resize", onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function fitCameraToObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.x) || box.isEmpty()) {
    camera.position.set(0, 1.45, 4.2);
    controls.target.set(0, 1.25, 0);
    controls.update();
    return;
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  const height = Math.max(size.y, 1.4);
  const width = Math.max(size.x, size.z, 0.8);
  const targetY = Math.min(Math.max(height * 0.58, 0.95), 1.55);
  const distance = Math.max(2.2, height * 1.6, width * 2.2);

  controls.target.set(0, targetY, 0);
  camera.position.set(0, targetY + 0.08, distance);
  camera.near = 0.01;
  camera.far = Math.max(20, distance * 8);
  camera.updateProjectionMatrix();
  controls.update();
}

async function loadAvatar(rel, name = "Avatar") {
  if (!rel) {
    setStatus("Nenhum avatar informado para o preview.", "bad");
    return;
  }
  clearAvatar();
  const url = toPreviewPath(rel);
  setStatus(`Carregando ${name}...`);

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  try {
    const gltf = await loader.loadAsync(url, (event) => {
      if (!event.total) return;
      const pct = Math.round((event.loaded / event.total) * 100);
      setStatus(`Carregando ${name}: ${pct}%`);
    });

    const vrm = gltf.userData?.vrm || null;
    if (vrm) {
      VRMUtils.removeUnnecessaryVertices(gltf.scene);
      VRMUtils.combineSkeletons(gltf.scene);
      try { VRMUtils.rotateVRM0(vrm); } catch {}
      currentVrm = vrm;
noelleForceAvatarAPoseV19815(vrm, typeof THREE !== "undefined" ? THREE : null);
noelleApplyDefaultAPose(vrm, typeof THREE !== "undefined" ? THREE : null);
      currentRoot = vrm.scene;
    } else {
      currentRoot = gltf.scene;
    }

    currentRoot.name = name;
    scene.add(currentRoot);
    try { noelleApplyAPoseV19817(typeof vrm !== "undefined" ? vrm : (typeof currentVrm !== "undefined" ? currentVrm : null)); } catch (_) {}
fitCameraToObject(currentRoot);
    fallback?.remove();
    setStatus(`${name} carregado. Arraste para girar, use scroll para zoom.`, "ok");
try { console.info("[Noelle] V19.8.17 alvo correto aplicado"); } catch (_) {}
  } catch (err) {
    console.error("[Noelle V19.8.2] Falha no preview:", err);
    setStatus(`Falha ao carregar avatar: ${err?.message || err}`, "bad");
  }
}

function animate() {
  rafId = requestAnimationFrame(animate);
  controls?.update();
  currentVrm?.update?.(1 / 60);
  renderer?.render(scene, camera);
}

window.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "noelle-avatar-preview-load") {
    loadAvatar(data.avatar?.rel || data.rel, data.avatar?.name || data.name || "Avatar");
  }
});

initScene();
animate();
loadAvatar(avatarParam, nameParam);
