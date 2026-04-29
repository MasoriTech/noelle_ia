import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const stage = document.getElementById('stage');
const statusEl = document.getElementById('status');

function setStatus(text, kind = '') {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = kind;
}

const scene = new THREE.Scene();
scene.background = null;
const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
stage.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 0.9;
controls.maxDistance = 8;
controls.target.set(0, 1.15, 0);

const hemi = new THREE.HemisphereLight(0xffffff, 0x332244, 2.2);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.9);
key.position.set(2.5, 4.5, 3.5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xd8ccff, 0.9);
fill.position.set(-3, 2, 2);
scene.add(fill);

const grid = new THREE.GridHelper(6, 24, 0xff3f9b, 0x2e2941);
grid.position.y = 0;
scene.add(grid);

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));
let currentRoot = null;
let currentVrm = null;
let loadingId = 0;

function resize() {
  const width = Math.max(1, stage.clientWidth || window.innerWidth || 1);
  const height = Math.max(1, stage.clientHeight || window.innerHeight || 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function disposeObject(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
    const mat = obj.material;
    if (Array.isArray(mat)) mat.forEach((m) => m && typeof m.dispose === 'function' && m.dispose());
    else if (mat && typeof mat.dispose === 'function') mat.dispose();
  });
}

function clearCurrent() {
  if (currentRoot) {
    scene.remove(currentRoot);
    disposeObject(currentRoot);
  }
  currentRoot = null;
  currentVrm = null;
}

function normalizePath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').replace(/^src\//, './');
}

function fitCameraToAvatar(root) {
  root.updateWorldMatrix(true, true);
  let box = new THREE.Box3().setFromObject(root);
  if (!Number.isFinite(box.min.y) || box.isEmpty()) {
    camera.position.set(0, 1.35, 3.2);
    controls.target.set(0, 1.1, 0);
    camera.lookAt(controls.target);
    controls.update();
    return;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;
  root.updateWorldMatrix(true, true);

  box = new THREE.Box3().setFromObject(root);
  box.getSize(size);
  const height = Math.max(size.y, 1.35);
  const width = Math.max(size.x, 0.7);
  const targetY = Math.max(0.85, height * 0.55);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect || 1, 0.1);
  const distanceByHeight = (height * 0.56) / Math.tan(fov / 2);
  const distanceByWidth = (width * 0.62) / (Math.tan(fov / 2) * aspect);
  const distance = Math.max(1.45, distanceByHeight, distanceByWidth) * 1.22;

  controls.target.set(0, targetY, 0);
  camera.position.set(0, targetY + height * 0.03, distance);
  camera.near = 0.01;
  camera.far = Math.max(50, distance * 10);
  camera.updateProjectionMatrix();
  camera.lookAt(controls.target);
  controls.update();
}

async function loadAvatar(filePath, label = '') {
  const path = normalizePath(filePath);
  if (!path) {
    setStatus('Nenhum avatar selecionado.', 'err');
    return;
  }
  const myId = ++loadingId;
  setStatus('Carregando ' + (label || path) + '...');
  try {
    const gltf = await loader.loadAsync(path);
    if (myId !== loadingId) return;
    clearCurrent();
    const vrm = gltf.userData && gltf.userData.vrm ? gltf.userData.vrm : null;
    if (vrm) {
      try { VRMUtils.removeUnnecessaryVertices(gltf.scene); } catch {}
      try { VRMUtils.removeUnnecessaryJoints(gltf.scene); } catch {}
      currentVrm = vrm;
      currentRoot = vrm.scene;
    } else {
      currentRoot = gltf.scene;
    }
    scene.add(currentRoot);
    fitCameraToAvatar(currentRoot);
    setStatus('Preview VRM pronto', 'ok');
  } catch (err) {
    const msg = err && err.message ? err.message : String(err || 'erro desconhecido');
    setStatus('Falha ao carregar avatar: ' + msg.slice(0, 180), 'err');
  }
}

async function loadFirstFromManifest() {
  try {
    const res = await fetch('./assets/avatar_manifest.json?noelle_v=1978', { cache: 'no-store' });
    if (!res.ok) throw new Error('manifest HTTP ' + res.status);
    const data = await res.json();
    const list = Array.isArray(data.avatars) ? data.avatars : [];
    if (!list.length) {
      setStatus('Nenhum VRM/GLB encontrado em assets.', 'err');
      return;
    }
    await loadAvatar(list[0].file, list[0].name);
  } catch (err) {
    setStatus('Falha ao ler avatar_manifest.json: ' + String(err && err.message ? err.message : err).slice(0, 160), 'err');
  }
}

window.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'noelle-avatar-load') loadAvatar(data.file, data.name);
  if (data.type === 'noelle-avatar-reset-camera' && currentRoot) fitCameraToAvatar(currentRoot);
});

function animate() {
  requestAnimationFrame(animate);
  const delta = 1 / 60;
  try { if (currentVrm && currentVrm.update) currentVrm.update(delta); } catch {}
  controls.update();
  renderer.render(scene, camera);
}
animate();
loadFirstFromManifest();
