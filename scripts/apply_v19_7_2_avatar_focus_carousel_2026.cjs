"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const SCRIPTS = path.join(ROOT, "scripts");
const DOCS = path.join(ROOT, "docs");
const BACKUP_ROOT = path.join(
  ROOT,
  "backups",
  "v19_7_2_avatar_focus_carousel_" + new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19)
);

const APPLY = process.argv.includes("--apply");
const ENSURE = process.argv.includes("--ensure");

function log(msg) { console.log(msg); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) { ensureDir(path.dirname(file)); fs.writeFileSync(file, content, "utf8"); log(`[OK] Atualizado: ${path.relative(ROOT, file)}`); }
function backup(file) {
  if (!exists(file)) return;
  const rel = path.relative(ROOT, file);
  const dest = path.join(BACKUP_ROOT, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
}
function writeWithBackup(file, content) {
  backup(file);
  write(file, content);
}
function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
function prettyName(file) {
  return path.basename(file).replace(/\.(vrm|glb)$/i, "").replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function toSrcUrl(file) {
  let rel = path.relative(SRC, file).replace(/\\/g, "/");
  return "./" + rel;
}
function scanAvatars() {
  const candidates = [
    path.join(SRC, "assets"),
    path.join(SRC, "assets", "avatars"),
    path.join(SRC, "assets", "vrm"),
    path.join(SRC, "assets", "models")
  ];
  const seen = new Set();
  const avatars = [];
  for (const dir of candidates) {
    for (const file of walk(dir)) {
      if (!/\.(vrm|glb)$/i.test(file)) continue;
      const key = path.resolve(file).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      avatars.push({
        id: path.basename(file).replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_"),
        name: prettyName(file),
        file: toSrcUrl(file),
        kind: path.extname(file).slice(1).toLowerCase()
      });
    }
  }
  avatars.sort((a, b) => {
    const pa = /noelle/i.test(a.name) ? 0 : /yoru/i.test(a.name) ? 1 : 2;
    const pb = /noelle/i.test(b.name) ? 0 : /yoru/i.test(b.name) ? 1 : 2;
    return pa - pb || a.name.localeCompare(b.name, "pt-BR");
  });
  if (!avatars.length) {
    avatars.push(
      { id: "noelle", name: "Noelle", file: "./assets/Noelle.vrm", kind: "vrm" },
      { id: "yoru", name: "Yoru", file: "./assets/avatars/Yoru.vrm", kind: "vrm" }
    );
  }
  return avatars;
}

const avatarLabHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' blob: data: file:; script-src 'self' 'unsafe-inline' blob: data: file:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: file:; connect-src 'self' blob: data: file:;" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Noelle/Yoru Avatar Preview V19.7.2</title>
  <style>
    :root {
      --bg: #070711;
      --panel: rgba(18, 15, 32, 0.92);
      --panel2: rgba(10, 9, 18, 0.78);
      --border: rgba(255, 120, 180, 0.26);
      --text: #f7f0ff;
      --muted: #cdbfe6;
      --accent: #ff3f83;
      --accent2: #25f0b8;
      --danger: #ff5570;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      overflow: hidden;
      color: var(--text);
      background:
        radial-gradient(circle at 30% 20%, rgba(255, 63, 131, .12), transparent 28%),
        radial-gradient(circle at 80% 10%, rgba(100, 80, 255, .12), transparent 30%),
        var(--bg);
      font-family: Inter, Segoe UI, system-ui, Arial, sans-serif;
    }
    .app {
      width: 100vw;
      height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      padding: 18px;
      gap: 14px;
    }
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 12px 16px;
      border: 1px solid var(--border);
      border-radius: 22px;
      background: rgba(9, 8, 18, .70);
      box-shadow: 0 18px 60px rgba(0,0,0,.28);
    }
    h1 { margin: 0; font-size: 22px; letter-spacing: .2px; }
    .sub { color: var(--muted); font-size: 13px; }
    .pillrow { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .pill {
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.06);
      color: var(--muted);
      border-radius: 999px;
      padding: 7px 11px;
      font-size: 12px;
      white-space: nowrap;
    }
    .pill.ok { color: var(--accent2); border-color: rgba(37,240,184,.42); }
    .pill.warn { color: #ffe6a3; border-color: rgba(255,230,163,.36); }
    .pill.danger { color: var(--danger); border-color: rgba(255,85,112,.42); }

    .layout {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(620px, 1fr) 320px;
      gap: 16px;
    }
    .stagePanel, .sidePanel {
      min-height: 0;
      border: 1px solid var(--border);
      border-radius: 28px;
      background: var(--panel);
      box-shadow: 0 24px 80px rgba(0,0,0,.36);
    }
    .stagePanel {
      display: grid;
      grid-template-rows: 1fr auto;
      overflow: hidden;
      position: relative;
    }
    .stage {
      min-height: 0;
      position: relative;
      background:
        radial-gradient(circle at 50% 55%, rgba(255, 70, 140, .12), transparent 34%),
        linear-gradient(180deg, rgba(255,255,255,.03), transparent);
    }
    #avatarCanvas {
      width: 100%;
      height: 100%;
      display: block;
      min-height: 650px;
    }
    .loadingHint {
      position: absolute;
      left: 22px;
      top: 22px;
      max-width: 420px;
      pointer-events: none;
    }
    .bigName {
      position: absolute;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(0,0,0,.35);
      border: 1px solid rgba(255,255,255,.1);
      color: var(--text);
      font-weight: 800;
      letter-spacing: .25px;
      pointer-events: none;
    }
    .carouselControls {
      padding: 16px 18px 18px;
      display: grid;
      grid-template-columns: 92px 1fr 92px;
      align-items: center;
      gap: 14px;
      background: rgba(5, 4, 12, .55);
      border-top: 1px solid rgba(255,255,255,.08);
    }
    .arrowBtn {
      height: 62px;
      border: 1px solid rgba(255, 63, 131, .45);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255,63,131,.16), rgba(255,255,255,.04));
      color: #fff;
      font-size: 34px;
      font-weight: 900;
      cursor: pointer;
      transition: transform .12s ease, border-color .12s ease, background .12s ease;
    }
    .arrowBtn:hover { transform: translateY(-1px); border-color: rgba(37,240,184,.7); }
    .avatarTitle {
      text-align: center;
      min-width: 0;
    }
    .avatarTitle .name { font-size: 22px; font-weight: 900; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .avatarTitle .file { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .sidePanel {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      overflow: auto;
    }
    .card {
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 22px;
      background: var(--panel2);
      padding: 14px;
    }
    .card h2 { margin: 0 0 10px; font-size: 15px; }
    .field { display: grid; gap: 6px; margin: 10px 0; }
    label { color: var(--muted); font-size: 12px; }
    select, input[type="file"], input[type="range"] {
      width: 100%;
      color: var(--text);
      background: rgba(255,255,255,.06);
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 14px;
      padding: 10px;
      outline: none;
    }
    button.action {
      width: 100%;
      min-height: 46px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 16px;
      color: var(--text);
      background: rgba(255,255,255,.07);
      font-weight: 800;
      cursor: pointer;
      margin-top: 8px;
    }
    button.primary { background: linear-gradient(135deg, rgba(255,63,131,.75), rgba(132,78,255,.55)); border-color: rgba(255,255,255,.18); }
    button.green { background: rgba(37,240,184,.12); border-color: rgba(37,240,184,.35); color: #dffff5; }
    button.action:hover { filter: brightness(1.1); }
    .tiny { color: var(--muted); font-size: 12px; line-height: 1.45; }
    #debugBox {
      white-space: pre-wrap;
      max-height: 150px;
      overflow: auto;
      font-family: Consolas, ui-monospace, monospace;
      font-size: 11px;
      color: #d7cff0;
    }
    @media (max-width: 980px) {
      body { overflow: auto; }
      .app { height: auto; min-height: 100vh; }
      .layout { grid-template-columns: 1fr; }
      #avatarCanvas { min-height: 620px; }
      .sidePanel { max-height: none; }
    }
  </style>
</head>
<body>
  <main class="app">
    <header class="topbar">
      <div>
        <h1>Avatar</h1>
        <div class="sub">Foco no personagem: avatar grande, opções do lado e setas embaixo.</div>
      </div>
      <div class="pillrow">
        <span id="statusPill" class="pill warn">Inicializando...</span>
        <span id="countPill" class="pill">0 avatares</span>
      </div>
    </header>

    <section class="layout">
      <section class="stagePanel" aria-label="Preview 3D do avatar">
        <div class="stage">
          <canvas id="avatarCanvas"></canvas>
          <div class="loadingHint">
            <span class="pill ok">Preview VRM/GLB</span>
          </div>
          <div id="bigName" class="bigName">Avatar</div>
        </div>
        <div class="carouselControls">
          <button id="btnPrev" class="arrowBtn" title="Avatar anterior">←</button>
          <div class="avatarTitle">
            <div id="avatarName" class="name">Carregando...</div>
            <div id="avatarFile" class="file">assets/avatars</div>
          </div>
          <button id="btnNext" class="arrowBtn" title="Próximo avatar">→</button>
        </div>
      </section>

      <aside class="sidePanel" aria-label="Opções do avatar">
        <div class="card">
          <h2>Personagem</h2>
          <div class="field">
            <label for="avatarSelect">Avatar encontrado</label>
            <select id="avatarSelect"></select>
          </div>
          <div class="field">
            <label for="localFile">Ou carregar VRM/GLB local</label>
            <input id="localFile" type="file" accept=".vrm,.glb,.gltf,model/gltf-binary" />
          </div>
          <button id="btnSaveDefault" class="action green">Salvar como padrão</button>
        </div>

        <div class="card">
          <h2>Usar em</h2>
          <button id="btnOpenRoom" class="action primary">Room / Quarto</button>
          <button id="btnOpenWidget" class="action primary">Widget Mode</button>
          <button id="btnPreviewOnly" class="action">Preview / Teste</button>
          <p class="tiny">A aba Avatar só escolhe e testa. Room cuida do quarto/objetos. Widget mostra sem fundo.</p>
        </div>

        <div class="card">
          <h2>Câmera</h2>
          <button id="btnResetCamera" class="action">Reset câmera</button>
          <div class="field">
            <label for="zoomRange">Zoom</label>
            <input id="zoomRange" type="range" min="2.1" max="5.8" step="0.05" value="3.15" />
          </div>
        </div>

        <div class="card">
          <h2>Debug</h2>
          <div id="debugBox">Aguardando...</div>
        </div>
      </aside>
    </section>
  </main>
  <script src="./renderer_dist/avatar_lab_v19_6.bundle.js"></script>
</body>
</html>
`;

const avatarLabApp = `import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const els = {
  canvas: document.getElementById("avatarCanvas"),
  statusPill: document.getElementById("statusPill"),
  countPill: document.getElementById("countPill"),
  avatarSelect: document.getElementById("avatarSelect"),
  localFile: document.getElementById("localFile"),
  btnPrev: document.getElementById("btnPrev"),
  btnNext: document.getElementById("btnNext"),
  btnSaveDefault: document.getElementById("btnSaveDefault"),
  btnOpenRoom: document.getElementById("btnOpenRoom"),
  btnOpenWidget: document.getElementById("btnOpenWidget"),
  btnPreviewOnly: document.getElementById("btnPreviewOnly"),
  btnResetCamera: document.getElementById("btnResetCamera"),
  zoomRange: document.getElementById("zoomRange"),
  avatarName: document.getElementById("avatarName"),
  avatarFile: document.getElementById("avatarFile"),
  bigName: document.getElementById("bigName"),
  debug: document.getElementById("debugBox")
};

const DEFAULT_AVATARS = [
  { id: "noelle", name: "Noelle", file: "./assets/Noelle.vrm", kind: "vrm" },
  { id: "yoru", name: "Yoru", file: "./assets/avatars/Yoru.vrm", kind: "vrm" },
  { id: "noelle-avatars", name: "Noelle Avatars", file: "./assets/avatars/Noelle.vrm", kind: "vrm" }
];

const state = {
  avatars: [],
  index: 0,
  currentRoot: null,
  currentVRM: null,
  objectUrls: [],
  loadingToken: 0,
  idleTime: 0
};

function log(message) {
  const line = "[" + new Date().toLocaleTimeString() + "] " + message;
  if (els.debug) els.debug.textContent = (line + "\n" + (els.debug.textContent || "")).slice(0, 5000);
  console.log("[Avatar Focus V19.7.2]", message);
}

function setStatus(text, type = "warn") {
  if (!els.statusPill) return;
  els.statusPill.textContent = text;
  els.statusPill.className = "pill " + type;
  log(text);
}

function absUrl(url) {
  if (!url) return url;
  if (/^(blob:|data:|file:|https?:)/i.test(url)) return url;
  return new URL(url, document.baseURI).href;
}

function createLoader() {
  const loader = new GLTFLoader();
  loader.setCrossOrigin?.("anonymous");
  loader.register((parser) => new VRMLoaderPlugin(parser));
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

function clearAvatar() {
  if (state.currentRoot) {
    scene.remove(state.currentRoot);
    disposeObject(state.currentRoot);
  }
  state.currentRoot = null;
  state.currentVRM = null;
}

function normalizeModel(root, targetHeight = 1.78) {
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
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
const controls = new OrbitControls(camera, els.canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 2.0;
controls.maxDistance = 6.2;
controls.target.set(0, 0.98, 0);

scene.add(new THREE.HemisphereLight(0xffffff, 0x242435, 1.35));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(2.4, 4.8, 3.6);
key.castShadow = true;
scene.add(key);
const fill = new THREE.DirectionalLight(0xffd9ee, 0.75);
fill.position.set(-2.5, 2.0, 2.2);
scene.add(fill);

const floor = new THREE.GridHelper(3.2, 16, 0xff477e, 0x39394a);
floor.position.y = 0;
floor.material.opacity = 0.22;
floor.material.transparent = true;
scene.add(floor);

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
window.addEventListener("resize", resize);

function resetCamera() {
  const z = Number(els.zoomRange?.value || 3.15);
  camera.position.set(0, 1.16, z);
  controls.target.set(0, 0.98, 0);
  controls.update();
}

function currentAvatar() {
  return state.avatars[state.index] || state.avatars[0] || DEFAULT_AVATARS[0];
}

function updateLabels() {
  const avatar = currentAvatar();
  const name = avatar?.name || "Avatar";
  const file = avatar?.file || "";
  if (els.avatarName) els.avatarName.textContent = name;
  if (els.avatarFile) els.avatarFile.textContent = file;
  if (els.bigName) els.bigName.textContent = name;
  if (els.avatarSelect) els.avatarSelect.value = String(state.index);
  if (els.countPill) els.countPill.textContent = state.avatars.length + " avatar" + (state.avatars.length === 1 ? "" : "es");
}

function saveSelection(mode = "preview") {
  const avatar = currentAvatar();
  const payload = {
    version: "19.7.2",
    mode,
    avatar,
    selectedIndex: state.index,
    at: new Date().toISOString()
  };
  try { localStorage.setItem("noelle.avatar.selected", JSON.stringify(payload, null, 2)); } catch {}
  try { localStorage.setItem("noelle.avatar.currentUrl", avatar?.file || ""); } catch {}
  try { window.dispatchEvent(new CustomEvent("noelle:avatar-selected", { detail: payload })); } catch {}
  return payload;
}

async function callNoelleApi(names, ...args) {
  const api = window.noelleAPI || {};
  for (const name of names) {
    if (typeof api[name] === "function") {
      try { return await api[name](...args); } catch (err) { log("API " + name + " falhou: " + err.message); }
    }
  }
  return null;
}

async function openMode(mode) {
  const payload = saveSelection(mode);
  setStatus("Avatar salvo para " + mode + ": " + (payload.avatar?.name || "Avatar"), "ok");
  if (mode === "room") {
    await callNoelleApi(["openRoom", "roomOpen", "openRoomWindow"], payload);
  } else if (mode === "widget") {
    await callNoelleApi(["openAvatar", "openAvatarWindow", "avatarOpen"], payload);
  }
}

async function loadAvatarByIndex(index) {
  if (!state.avatars.length) return;
  const next = (index + state.avatars.length) % state.avatars.length;
  state.index = next;
  updateLabels();
  const avatar = currentAvatar();
  const token = ++state.loadingToken;
  setStatus("Carregando " + avatar.name + "...", "warn");
  clearAvatar();
  try {
    const loader = createLoader();
    const gltf = await loader.loadAsync(absUrl(avatar.file));
    if (token !== state.loadingToken) return;
    const vrm = gltf?.userData?.vrm || null;
    const model = vrm?.scene || gltf.scene || gltf.scenes?.[0];
    if (!model) throw new Error("Modelo sem scene/vrm.scene");
    if (vrm) {
      try { VRMUtils.removeUnnecessaryVertices?.(model); } catch {}
      try { VRMUtils.removeUnnecessaryJoints?.(model); } catch {}
      try { VRMUtils.rotateVRM0?.(vrm); } catch {}
    }
    model.traverse((child) => {
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
    wrapper.name = "AvatarFocusCarouselRoot";
    wrapper.add(model);
    normalizeModel(wrapper, 1.78);
    wrapper.position.y = -0.035;
    scene.add(wrapper);
    state.currentRoot = wrapper;
    state.currentVRM = vrm;
    state.idleTime = 0;
    saveSelection("preview");
    setStatus((vrm ? "VRM pronto: " : "Modelo pronto: ") + avatar.name, "ok");
  } catch (err) {
    console.error(err);
    setStatus("Falha ao carregar: " + err.message, "danger");
    log(err.stack || err.message);
  }
}

async function loadManifest() {
  const candidates = ["./assets/avatar_manifest.json", "./assets/avatars/avatar_manifest.json"];
  for (const url of candidates) {
    try {
      const res = await fetch(absUrl(url), { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.avatars) ? data.avatars : [];
      const clean = list
        .map((item, i) => ({
          id: String(item.id || item.name || "avatar_" + i).replace(/[^a-zA-Z0-9_-]/g, "_"),
          name: String(item.name || item.label || item.file || "Avatar " + (i + 1)),
          file: String(item.file || item.path || item.url || ""),
          kind: String(item.kind || item.type || "vrm")
        }))
        .filter(item => item.file && /\.(vrm|glb|gltf)(\?.*)?$/i.test(item.file));
      if (clean.length) {
        log("Manifest de avatares lido: " + url);
        return clean;
      }
    } catch (err) {
      log("Manifest indisponível: " + url);
    }
  }
  return DEFAULT_AVATARS;
}

function populateSelect() {
  els.avatarSelect.innerHTML = "";
  state.avatars.forEach((avatar, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = avatar.name + " — " + avatar.file;
    els.avatarSelect.appendChild(option);
  });
}

async function bootAvatarFocusCarousel() {
  resize();
  resetCamera();
  state.avatars = await loadManifest();
  populateSelect();
  try {
    const saved = JSON.parse(localStorage.getItem("noelle.avatar.selected") || "null");
    const savedFile = saved?.avatar?.file || saved?.avatar?.url || "";
    const found = state.avatars.findIndex(a => a.file === savedFile || a.id === saved?.avatar?.id);
    if (found >= 0) state.index = found;
  } catch {}
  await loadAvatarByIndex(state.index);
  animate();
}

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  if (state.currentVRM?.update) {
    try { state.currentVRM.update(dt); } catch {}
  }
  if (state.currentRoot) {
    state.idleTime += dt;
    state.currentRoot.position.y = -0.035 + Math.sin(state.idleTime * 2.0) * 0.01;
  }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

els.btnPrev.addEventListener("click", () => loadAvatarByIndex(state.index - 1));
els.btnNext.addEventListener("click", () => loadAvatarByIndex(state.index + 1));
els.avatarSelect.addEventListener("change", () => loadAvatarByIndex(Number(els.avatarSelect.value || 0)));
els.btnResetCamera.addEventListener("click", resetCamera);
els.zoomRange.addEventListener("input", resetCamera);
els.btnSaveDefault.addEventListener("click", () => { saveSelection("default"); setStatus("Avatar padrão salvo", "ok"); });
els.btnOpenRoom.addEventListener("click", () => openMode("room"));
els.btnOpenWidget.addEventListener("click", () => openMode("widget"));
els.btnPreviewOnly.addEventListener("click", () => openMode("preview"));
els.localFile.addEventListener("change", async () => {
  const file = els.localFile.files?.[0];
  if (!file) return;
  const objectUrl = URL.createObjectURL(file);
  state.objectUrls.push(objectUrl);
  state.avatars.push({ id: "local_" + Date.now(), name: file.name.replace(/\.[^.]+$/, ""), file: objectUrl, kind: file.name.split(".").pop().toLowerCase() });
  state.index = state.avatars.length - 1;
  populateSelect();
  await loadAvatarByIndex(state.index);
});
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") loadAvatarByIndex(state.index - 1);
  if (event.key === "ArrowRight") loadAvatarByIndex(state.index + 1);
});
window.addEventListener("beforeunload", () => {
  for (const url of state.objectUrls) {
    try { URL.revokeObjectURL(url); } catch {}
  }
});

void bootAvatarFocusCarousel().catch((err) => {
  console.error(err);
  setStatus("Erro no boot do Avatar: " + err.message, "danger");
  log(err.stack || err.message);
});
`;

const buildScript = "\"use strict\";\nconst fs = require(\"fs\");\nconst path = require(\"path\");\n\nlet esbuild;\ntry {\n  esbuild = require(\"esbuild\");\n} catch (err) {\n  console.error(\"[ERRO] esbuild nao encontrado. Rode: npm install\");\n  process.exit(1);\n}\n\nconst ROOT = process.cwd();\nconst srcFile = path.join(ROOT, \"src\", \"renderer\", \"avatar_lab_v19_6_app.js\");\nconst outFile = path.join(ROOT, \"src\", \"renderer_dist\", \"avatar_lab_v19_6.bundle.js\");\n\nfunction ensureDir(dir) {\n  fs.mkdirSync(dir, { recursive: true });\n}\n\nfunction log(msg) {\n  console.log(msg);\n}\n\nfunction hasTopLevelAwaitBug(code) {\n  const reMotion = new RegExp(\"(^|\\\\n)\\\\s*await\\\\s+loadMotionManifest\\\\s*\\\\(\");\n  const reAvatar = new RegExp(\"(^|\\\\n)\\\\s*await\\\\s+loadAvatar\\\\s*\\\\(\");\n  return reMotion.test(code) || reAvatar.test(code);\n}\n\nasync function main() {\n  if (!fs.existsSync(srcFile)) {\n    throw new Error(\"Arquivo nao encontrado: \" + srcFile);\n  }\n\n  const code = fs.readFileSync(srcFile, \"utf8\");\n  if (hasTopLevelAwaitBug(code)) {\n    throw new Error(\"Top-level await detectado em avatar_lab_v19_6_app.js. Rode o patch V19.7.3 antes do build iife.\");\n  }\n\n  ensureDir(path.dirname(outFile));\n  await esbuild.build({\n    entryPoints: [srcFile],\n    bundle: true,\n    outfile: outFile,\n    platform: \"browser\",\n    format: \"iife\",\n    target: [\"chrome120\"],\n    sourcemap: false,\n    legalComments: \"none\",\n    logLevel: \"info\"\n  });\n\n  const size = fs.statSync(outFile).size;\n  log(\"[OK] Bundle Avatar Preview gerado: \" + path.relative(ROOT, outFile) + \" (\" + size + \" bytes)\");\n}\n\nmain().catch((err) => {\n  console.error(\"[ERRO] Build Avatar Preview falhou:\", err && err.message ? err.message : err);\n  process.exit(1);\n});\n";

const diagnosticScript = `"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const checks = [];
function ok(name, value, hint = "") { checks.push({ name, ok: !!value, hint }); }
function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }

ok("package.json", exists("package.json"));
ok("iniciar.bat atualizado", exists("iniciar.bat") && /V19\.7\.2|Avatar Preview V19\.7\.2|Avatar Foco/i.test(read("iniciar.bat")), "copie o iniciar.bat do pack para a raiz");
ok("src/avatar_lab_v19_6.html", exists("src/avatar_lab_v19_6.html"));
ok("avatar canvas grande", exists("src/avatar_lab_v19_6.html") && /carouselControls|Foco no personagem|btnPrev|btnNext/.test(read("src/avatar_lab_v19_6.html")), "HTML ainda parece antigo");
ok("src/renderer/avatar_lab_v19_6_app.js", exists("src/renderer/avatar_lab_v19_6_app.js"));
ok("sem top-level await", exists("src/renderer/avatar_lab_v19_6_app.js") && !/(^|\n)\s*await\s+load(MotionManifest|Avatar)\s*\(/.test(read("src/renderer/avatar_lab_v19_6_app.js")), "corrigir await solto");
ok("carrossel VRM", exists("src/renderer/avatar_lab_v19_6_app.js") && /btnPrev|btnNext|avatar_manifest|loadAvatarByIndex/.test(read("src/renderer/avatar_lab_v19_6_app.js")), "app ainda nao e carrossel");
ok("build script robusto", exists("scripts/build_avatar_lab_v19_6_2026.cjs") && /format:\s*\"iife\"|format:\s*'iife'/.test(read("scripts/build_avatar_lab_v19_6_2026.cjs")));
ok("manifest de avatares", exists("src/assets/avatar_manifest.json"), "rode o aplicador para gerar");
if (exists("src/assets/avatar_manifest.json")) {
  try {
    const data = JSON.parse(read("src/assets/avatar_manifest.json"));
    ok("manifest contem lista", Array.isArray(data.avatars) && data.avatars.length >= 1, "adicione .vrm em src/assets/avatars");
  } catch { ok("manifest JSON valido", false); }
}

let failed = 0;
console.log("===============================================================");
console.log(" Noelle/Yoru - Diagnostico Avatar Foco Carrossel V19.7.2");
console.log("===============================================================");
for (const c of checks) {
  if (c.ok) console.log("[OK] " + c.name);
  else { failed++; console.log("[ERRO] " + c.name + (c.hint ? " - " + c.hint : "")); }
}
if (failed) {
  console.log("===============================================================");
  console.log("[ERRO] Diagnostico falhou com " + failed + " problema(s).");
  process.exit(1);
}
console.log("===============================================================");
console.log("[OK] Avatar Preview maior e focado esta pronto.");
`;

const docs = `# Noelle/Yoru V19.7.2 — Avatar Foco + Carrossel VRM

Objetivo: a aba/janela de Avatar deve focar no personagem.

## Layout

- Avatar grande à esquerda.
- Opções à direita.
- Setas embaixo do avatar.
- Preview limpo, com menos texto técnico.

## Fluxo

1. O aplicador procura arquivos \`.vrm\`, \`.glb\` e \`.gltf\` em:
   - \`src/assets/\`
   - \`src/assets/avatars/\`
   - \`src/assets/vrm/\`
   - \`src/assets/models/\`
2. Ele gera \`src/assets/avatar_manifest.json\`.
3. O preview carrega um avatar por vez.
4. As setas esquerda/direita trocam o personagem.
5. Botões de destino:
   - Room / Quarto
   - Widget Mode
   - Preview / Teste

## Regra de arquitetura

A aba Avatar escolhe e testa o avatar. A Room aplica quarto/objetos. Widget Mode mostra o avatar sem fundo.
`;

function updatePackageJson() {
  const file = path.join(ROOT, "package.json");
  if (!exists(file)) return;
  backup(file);
  const pkg = JSON.parse(read(file));
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["build:avatar-lab-v19.6"] = "node scripts/build_avatar_lab_v19_6_2026.cjs";
  pkg.scripts["apply:v19.7.2-avatar-focus"] = "node scripts/apply_v19_7_2_avatar_focus_carousel_2026.cjs --apply";
  pkg.scripts["diagnostico:v19.7.2-avatar-focus"] = "node scripts/diagnostico_v19_7_2_avatar_focus_carousel_2026.cjs";
  write(file, JSON.stringify(pkg, null, 2) + "\n");
}

function updateMemory() {
  const file = path.join(ROOT, "MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) return;
  let txt = read(file);
  const marker = "## V19.7.2 — Avatar Foco + Carrossel VRM";
  if (txt.includes(marker)) {
    log("[OK] MEMORIA_GPT_NOELLE.md ja contem V19.7.2.");
    return;
  }
  backup(file);
  txt += `\n\n---\n\n${marker}\n\n- A aba/janela Avatar deve ter foco visual no personagem.\n- Avatar grande a esquerda, opcoes a direita, setas embaixo.\n- Carrossel deve carregar um VRM/GLB por vez a partir de src/assets/avatar_manifest.json.\n- Nao acoplar o preview a Room em tempo real; Room cuida do quarto/objetos e Widget Mode cuida da janela sem fundo.\n- Todo pack futuro deve incluir iniciar.bat atualizado.\n`;
  write(file, txt);
}

function updateMainWindowSize() {
  const file = path.join(ROOT, "main.js");
  if (!exists(file)) return;
  let txt = read(file);
  let changed = false;

  // Aumenta o widget/avatar se encontrar o bloco atual conhecido.
  const oldBlock = `avatarWin = new BrowserWindow({\n\n  width: 420,\n\n  height: 680,\n\n  minWidth: 280,\n\n  minHeight: 360,`;
  const newBlock = `avatarWin = new BrowserWindow({\n\n  width: 720,\n\n  height: 900,\n\n  minWidth: 420,\n\n  minHeight: 640,`;
  if (txt.includes(oldBlock)) {
    txt = txt.replace(oldBlock, newBlock);
    changed = true;
  } else {
    // Regex tolerante para versoes compactadas.
    txt = txt.replace(/(avatarWin\s*=\s*new\s+BrowserWindow\s*\(\s*\{[\s\S]{0,260}?width\s*:\s*)\d+(\s*,[\s\S]{0,80}?height\s*:\s*)\d+(\s*,[\s\S]{0,80}?minWidth\s*:\s*)\d+(\s*,[\s\S]{0,80}?minHeight\s*:\s*)\d+/m, (m, a,b,c,d) => {
      changed = true;
      return `${a}720${b}900${c}420${d}640`;
    });
  }

  // Aumenta a janela principal para caber melhor a aba Avatar quando ela estiver dentro da janela principal.
  txt = txt.replace(/(mainWin\s*=\s*new\s+BrowserWindow\s*\(\s*\{[\s\S]{0,260}?width\s*:\s*)1180(\s*,[\s\S]{0,80}?height\s*:\s*)760/m, (m,a,b) => {
    changed = true;
    return `${a}1320${b}860`;
  });

  if (changed) {
    writeWithBackup(file, txt);
  } else {
    log("[AVISO] main.js nao teve tamanho de janela alterado automaticamente. O HTML ainda fica responsivo.");
  }
}

function generateManifest() {
  const avatars = scanAvatars();
  const manifest = { version: "19.7.2", generatedAt: new Date().toISOString(), avatars };
  const file = path.join(SRC, "assets", "avatar_manifest.json");
  backup(file);
  write(file, JSON.stringify(manifest, null, 2) + "\n");
  log(`[OK] Avatares encontrados no manifest: ${avatars.length}`);
}

function runNodeCheck(rel) {
  const file = path.join(ROOT, rel);
  if (!exists(file)) return;
  try {
    cp.execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
    log(`[OK] node --check ${rel}`);
  } catch (err) {
    throw new Error(`node --check falhou: ${rel}`);
  }
}

function apply() {
  if (!exists(path.join(ROOT, "package.json"))) {
    throw new Error("Rode este script na raiz do projeto noelle_ia.");
  }
  ensureDir(BACKUP_ROOT);
  ensureDir(path.join(SRC, "renderer"));
  ensureDir(path.join(SRC, "renderer_dist"));
  ensureDir(SCRIPTS);
  ensureDir(DOCS);

  writeWithBackup(path.join(SRC, "avatar_lab_v19_6.html"), avatarLabHtml);
  writeWithBackup(path.join(SRC, "renderer", "avatar_lab_v19_6_app.js"), avatarLabApp);
  writeWithBackup(path.join(SCRIPTS, "build_avatar_lab_v19_6_2026.cjs"), buildScript);
  writeWithBackup(path.join(SCRIPTS, "diagnostico_v19_7_2_avatar_focus_carousel_2026.cjs"), diagnosticScript);
  writeWithBackup(path.join(DOCS, "NOELLE_V19_7_2_AVATAR_FOCO_CARROSSEL.md"), docs);
  generateManifest();
  updatePackageJson();
  updateMemory();
  updateMainWindowSize();

  runNodeCheck("src/renderer/avatar_lab_v19_6_app.js");
  runNodeCheck("scripts/build_avatar_lab_v19_6_2026.cjs");
  runNodeCheck("scripts/diagnostico_v19_7_2_avatar_focus_carousel_2026.cjs");

  log("===============================================================");
  log("[OK] V19.7.2 aplicado: Avatar maior, foco no personagem e setas embaixo.");
  log(`[OK] Backup: ${path.relative(ROOT, BACKUP_ROOT)}`);
}

try {
  if (!APPLY && !ENSURE) {
    console.log("Uso: node scripts/apply_v19_7_2_avatar_focus_carousel_2026.cjs --apply");
    console.log("Ou:  node scripts/apply_v19_7_2_avatar_focus_carousel_2026.cjs --ensure");
    process.exit(0);
  }
  apply();
} catch (err) {
  console.error("[ERRO]", err.message || err);
  process.exit(1);
}
