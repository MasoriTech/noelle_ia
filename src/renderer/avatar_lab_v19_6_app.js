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


(() => {
  "use strict";

  const els = {
    canvas: document.getElementById("avatarCanvas"),
    statusPill: document.getElementById("statusPill"),
    overlay: document.getElementById("overlayPills"),
    avatarName: document.getElementById("avatarName"),
    avatarFile: document.getElementById("avatarFile"),
    avatarSelect: document.getElementById("avatarSelect"),
    localFile: document.getElementById("localFile"),
    prevAvatar: document.getElementById("prevAvatar"),
    nextAvatar: document.getElementById("nextAvatar"),
    btnRoom: document.getElementById("btnRoom"),
    btnWidget: document.getElementById("btnWidget"),
    btnPreview: document.getElementById("btnPreview"),
    btnSave: document.getElementById("btnSave"),
    btnResetCamera: document.getElementById("btnResetCamera"),
    debug: document.getElementById("debugBox"),
  };

  const runtimeManifest = Array.isArray(window.NoelleAvatarManifestV1975) ? window.NoelleAvatarManifestV1975 : [];
  const state = {
    avatars: runtimeManifest.length ? runtimeManifest : [
      { id: "noelle", name: "Noelle", url: "./assets/Noelle.vrm", file: "src/assets/Noelle.vrm", kind: "VRM" },
      { id: "yoru", name: "Yoru", url: "./assets/avatars/Yoru.vrm", file: "src/assets/avatars/Yoru.vrm", kind: "VRM" },
    ],
    index: 0,
    root: null,
    vrm: null,
    objectUrls: [],
    loadToken: 0,
    idleTime: 0,
  };

  function log(message) {
    const line = "[" + new Date().toLocaleTimeString() + "] " + message;
    if (els.debug) els.debug.textContent = (line + "\n" + (els.debug.textContent || "")).slice(0, 5000);
    console.log("[Noelle Avatar Carousel]", message);
  }

  function setStatus(text, type = "warn") {
    if (!els.statusPill) return;
    els.statusPill.textContent = text;
    els.statusPill.className = "pill " + type;
    log(text);
  }

  function setOverlay(items) {
    if (!els.overlay) return;
    els.overlay.innerHTML = "";
    for (const item of items) {
      const span = document.createElement("span");
      span.className = "pill " + (item.type || "");
      span.textContent = item.text;
      els.overlay.appendChild(span);
    }
  }

  function getTopApi(name) {
    try { if (window[name]) return window[name]; } catch {}
    try { if (window.parent && window.parent !== window && window.parent[name]) return window.parent[name]; } catch {}
    try { if (window.top && window.top !== window && window.top[name]) return window.top[name]; } catch {}
    return null;
  }

  function selectedAvatar() {
    return state.avatars[state.index] || state.avatars[0];
  }

  function absUrl(url) {
    if (!url) return "";
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

  function normalizeModel(root, targetHeight = 1.74) {
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

  const renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
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
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
  camera.position.set(0, 1.18, 4.15);

  const controls = new OrbitControls(camera, els.canvas);
  controls.target.set(0, 1.05, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 1.9;
  controls.maxDistance = 7.0;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x252235, 1.28));
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(2.5, 4.4, 3.0);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8abc, 0.65);
  rim.position.set(-3, 2.2, -2.5);
  scene.add(rim);

  const floor = new THREE.GridHelper(3.6, 18, 0xff4f94, 0x3a354c);
  floor.position.y = -0.01;
  scene.add(floor);

  const clock = new THREE.Clock();

  function resize() {
    if (!els.canvas) return;
    const rect = els.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);

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

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function resetCamera() {
    camera.position.set(0, 1.18, 4.15);
    controls.target.set(0, 1.05, 0);
    controls.update();
  }

  function clearAvatar() {
    if (state.root) {
      scene.remove(state.root);
      disposeObject(state.root);
    }
    state.root = null;
    state.vrm = null;
  }

  function updateLabels(item) {
    if (!item) return;
    if (els.avatarName) els.avatarName.textContent = item.name || "Avatar";
    if (els.avatarFile) els.avatarFile.textContent = item.file || item.url || "";
    if (els.avatarSelect && els.avatarSelect.value !== String(state.index)) els.avatarSelect.value = String(state.index);
  }

  async function loadAvatarAt(index) {
    if (!state.avatars.length) {
      setStatus("Nenhum VRM/GLB encontrado.", "danger");
      return;
    }
    state.index = (index + state.avatars.length) % state.avatars.length;
    const item = selectedAvatar();
    const token = ++state.loadToken;
    updateLabels(item);
    setStatus("Carregando " + item.name + "...", "warn");
    setOverlay([{ text: "Carregando avatar", type: "warn" }]);
    clearAvatar();

    try {
      const loader = createLoader();
      const gltf = await loader.loadAsync(absUrl(item.url));
      if (token !== state.loadToken) return;
      const vrm = gltf?.userData?.vrm || null;
      const modelScene = vrm?.scene || gltf.scene || gltf.scenes?.[0];
      if (!modelScene) throw new Error("Arquivo carregou sem cena 3D.");

      if (vrm) {
        try { VRMUtils.removeUnnecessaryVertices?.(modelScene); } catch {}
        try { VRMUtils.removeUnnecessaryJoints?.(modelScene); } catch {}
        try { VRMUtils.rotateVRM0?.(vrm); } catch {}
      }

      modelScene.traverse((child) => {
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
      wrapper.name = "NoelleAvatarCarouselRoot";
      wrapper.add(modelScene);
      normalizeModel(wrapper);
      scene.add(wrapper);
      state.root = wrapper;
      state.vrm = vrm;
      state.idleTime = 0;
      resetCamera();
      setOverlay([
        { text: vrm ? "VRM ativo" : "GLB ativo", type: "ok" },
        { text: (item.kind || "").toUpperCase() || "3D", type: "ok" },
      ]);
      setStatus("Avatar pronto: " + item.name, "ok");
    } catch (err) {
      console.error(err);
      setStatus("Falha ao carregar: " + (err?.message || err), "danger");
      setOverlay([{ text: "Falha no arquivo", type: "danger" }]);
      log(err?.stack || err?.message || String(err));
    }
  }

  function rebuildSelect() {
    if (!els.avatarSelect) return;
    els.avatarSelect.innerHTML = "";
    state.avatars.forEach((item, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = item.name + (item.kind ? " — " + item.kind : "");
      els.avatarSelect.appendChild(option);
    });
  }

  async function saveSelected() {
    const item = selectedAvatar();
    const api = getTopApi("noelleAPI") || getTopApi("desktopWidget");
    try {
      if (api?.saveState) {
        await api.saveState({ avatar: { selected: item.url, name: item.name, file: item.file, updatedAt: new Date().toISOString() } });
        setStatus("Avatar padrão salvo: " + item.name, "ok");
      } else {
        setStatus("Avatar selecionado: " + item.name, "ok");
      }
    } catch (err) {
      setStatus("Não foi possível salvar agora.", "warn");
      log(err?.message || String(err));
    }
  }

  async function openRoom() {
    const room = getTopApi("noelleRoom") || getTopApi("noelleRoomV19");
    await saveSelected();
    if (room?.open) {
      await room.open();
      setStatus("Abrindo Room / Quarto...", "ok");
    } else {
      setStatus("API da Room não encontrada nesta janela.", "warn");
    }
  }

  async function openWidget() {
    const api = getTopApi("noelleAPI") || getTopApi("desktopWidget");
    await saveSelected();
    try { await api?.avatarCommand?.("set-avatar", selectedAvatar()); } catch {}
    if (api?.openAvatar) {
      await api.openAvatar();
      setStatus("Abrindo Widget Mode...", "ok");
    } else {
      setStatus("API do Widget não encontrada nesta janela.", "warn");
    }
  }

  async function openPreview() {
    setStatus("Preview / Teste já está ativo nesta aba.", "ok");
    resetCamera();
  }

  function attachEvents() {
    els.prevAvatar?.addEventListener("click", () => loadAvatarAt(state.index - 1));
    els.nextAvatar?.addEventListener("click", () => loadAvatarAt(state.index + 1));
    els.avatarSelect?.addEventListener("change", () => loadAvatarAt(Number(els.avatarSelect.value || 0)));
    els.btnResetCamera?.addEventListener("click", resetCamera);
    els.btnSave?.addEventListener("click", () => saveSelected());
    els.btnRoom?.addEventListener("click", () => openRoom().catch((err) => setStatus(err?.message || String(err), "danger")));
    els.btnWidget?.addEventListener("click", () => openWidget().catch((err) => setStatus(err?.message || String(err), "danger")));
    els.btnPreview?.addEventListener("click", () => openPreview());
    els.localFile?.addEventListener("change", () => {
      const file = els.localFile.files?.[0];
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      state.objectUrls.push(objectUrl);
      state.avatars.push({ id: "local-" + Date.now(), name: file.name.replace(/\.(vrm|glb)$/i, ""), url: objectUrl, file: file.name, kind: file.name.split(".").pop().toUpperCase() });
      rebuildSelect();
      loadAvatarAt(state.avatars.length - 1);
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") loadAvatarAt(state.index - 1);
      if (event.key === "ArrowRight") loadAvatarAt(state.index + 1);
    });
    window.addEventListener("beforeunload", () => {
      for (const url of state.objectUrls) {
        try { URL.revokeObjectURL(url); } catch {}
      }
    });
  }

  function animate() {
    const dt = Math.min(0.05, clock.getDelta());
    if (state.vrm?.update) {
      try { state.vrm.update(dt); } catch {}
    }
    if (state.root) {
      state.idleTime += dt;
      state.root.position.y = Math.sin(state.idleTime * 1.6) * 0.01;
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  async function boot() {
    if (!els.canvas) return;
    rebuildSelect();
    attachEvents();
    new ResizeObserver(resize).observe(els.canvas);
    resize();
    setStatus("Avatares encontrados: " + state.avatars.length, "ok");
    await loadAvatarAt(0);
    animate();
  }

  void boot().catch((err) => {
    console.error(err);
    setStatus("Falha no preview: " + (err?.message || err), "danger");
  });
})();
