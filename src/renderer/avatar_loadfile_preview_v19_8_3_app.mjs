import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

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
const errorEl = document.getElementById("error");
const pathInfo = document.getElementById("pathInfo");
const avatarName = document.getElementById("avatarName");

let renderer;
let camera;
let scene;
let controls;
let currentObject;
let animationId = 0;

function setStatus(text, error = false) {
  statusEl.textContent = text;
  statusEl.style.color = error ? "#ff9faf" : "#ffd3ea";
}

function showError(err) {
  const msg = String(err?.message || err || "Erro desconhecido");
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
  setStatus("erro", true);
  console.error("[Noelle V19.8.3 LoadFile Preview]", err);
}

function sanitizeAvatarRel(value) {
  let rel = String(value || "").replace(/\\/g, "/").trim();
  rel = rel.replace(/^file:\/\/\/?/i, "");
  rel = rel.replace(/^.*?\/src\//i, "");
  rel = rel.replace(/^src\//i, "");
  rel = rel.replace(/^\/+/, "");
  if (!rel) rel = "assets/Noelle.vrm";
  if (rel.includes("..")) throw new Error("Caminho de avatar inseguro: " + rel);
  if (!/\.(vrm|glb)$/i.test(rel)) throw new Error("Avatar precisa ser .vrm ou .glb: " + rel);
  return rel;
}

function getAvatarRel() {
  const params = new URLSearchParams(location.search);
  return sanitizeAvatarRel(params.get("avatar") || params.get("rel") || "assets/Noelle.vrm");
}

function avatarUrlFromRel(rel) {
  return new URL(rel, location.href).href;
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
  camera.position.set(0, 1.35, 4.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setClearColor(0x000000, 0);
try {
  const stage = (renderer && renderer.domElement && renderer.domElement.parentElement) ? renderer.domElement.parentElement : null;
  if (stage) {
    stage.style.background = 'transparent';
    stage.style.backgroundImage = 'none';
  }
  if (renderer && renderer.domElement) renderer.domElement.style.background = 'transparent';
} catch (_) {}

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  stage.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1.1, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x222233, 2.1);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 2.6);
  dir.position.set(2.2, 4.5, 3.5);
  scene.add(dir);

  const grid = new THREE.GridHelper(7, 36, 0xff4fa9, 0x433a58);
  grid.material.transparent = true;
  grid.material.opacity = 0.45;
  scene.add(grid);

  resize();
  window.addEventListener("resize", resize);
}

function resize() {
  if (!renderer || !camera) return;
  const rect = stage.getBoundingClientRect();
  const w = Math.max(240, Math.floor(rect.width));
  const h = Math.max(220, Math.floor(rect.height));
  renderer.setSize(w, h, false);

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

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function fitCamera(object) {
  if (!object) return;
  object.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  if (!Number.isFinite(size.y) || size.y <= 0.001) {
    camera.position.set(0, 1.35, 4.2);
    controls.target.set(0, 1.1, 0);
    controls.update();
    return;
  }

  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= box.min.y;

  const height = Math.max(1.2, size.y);
  controls.target.set(0, Math.min(height * 0.58, 1.25), 0);
  camera.position.set(0, Math.min(height * 0.64, 1.45), Math.max(2.4, height * 1.55));
  camera.near = 0.01;
  camera.far = Math.max(100, height * 25);
  camera.updateProjectionMatrix();
  controls.update();
}

async function loadAvatar() {
  const rel = getAvatarRel();
  const url = avatarUrlFromRel(rel);
  const name = rel.split("/").pop() || "Avatar";
  avatarName.textContent = name.replace(/\.(vrm|glb)$/i, "");
  pathInfo.textContent = "avatar: " + rel;
  setStatus("carregando VRM");
  errorEl.classList.add("hidden");

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        try {
          const vrm = gltf.userData?.vrm;
          const object = vrm?.scene || gltf.scene;
          if (!object) throw new Error("Arquivo carregou, mas não contém cena 3D.");

          if (vrm) {
            VRMUtils.removeUnnecessaryVertices(object);
            VRMUtils.removeUnnecessaryJoints(object);
          }

          currentObject = object;
          scene.add(currentObject);
          fitCamera(currentObject);
          setStatus("preview pronto");
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      undefined,
      (err) => {
        reject(new Error("Falha ao carregar arquivo local via loadFile: " + (err?.message || err)));
      }
    );
  });
}

function loop() {
  animationId = requestAnimationFrame(loop);
  controls?.update();
  renderer?.render(scene, camera);
}

document.getElementById("btnFit")?.addEventListener("click", () => fitCamera(currentObject));
document.getElementById("btnReset")?.addEventListener("click", () => {
  camera.position.set(0, 1.35, 4.2);
  controls.target.set(0, 1.1, 0);
  controls.update();
});

try {
  initScene();
  await loadAvatar();
  loop();
} catch (err) {
  showError(err);
}

window.addEventListener("beforeunload", () => {
  if (animationId) cancelAnimationFrame(animationId);
  renderer?.dispose();
});
