import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

(() => {
  "use strict";

  const els = {
    canvas: document.getElementById("avatarCanvas"),
    loading: document.getElementById("loading"),
    status: document.getElementById("statusPill"),
    count: document.getElementById("countPill"),
    select: document.getElementById("avatarSelect"),
    name: document.getElementById("avatarName"),
    file: document.getElementById("avatarFile"),
    error: document.getElementById("errorBox"),
    prev: document.getElementById("prevAvatar"),
    next: document.getElementById("nextAvatar"),
    openRoom: document.getElementById("openRoom"),
    openWidget: document.getElementById("openWidget"),
    openPreview: document.getElementById("openPreview"),
    saveDefault: document.getElementById("saveDefault"),
    resetCamera: document.getElementById("resetCamera"),
    toggleSpin: document.getElementById("toggleSpin")
  };

  const state = {
    avatars: [],
    index: 0,
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    loader: null,
    currentObject: null,
    currentVRM: null,
    clock: new THREE.Clock(),
    spin: false,
    loadingToken: 0
  };

  function setStatus(text, kind = "") {
    if (!els.status) return;
    els.status.textContent = text;
    els.status.className = "pill" + (kind ? " " + kind : "");
  }

  function showError(error) {
    const message = String(error?.stack || error?.message || error || "Erro desconhecido");
    if (els.error) {
      els.error.style.display = "block";
      els.error.textContent = message;
    }
    setStatus("Erro no preview", "bad");
    if (els.loading) {
      els.loading.style.display = "grid";
      els.loading.innerHTML = "<div><strong>Falha ao carregar avatar</strong><span>Veja a mensagem de erro no painel direito.</span></div>";
    }
    console.error("[Noelle Avatar V19.7.6]", error);
  }

  function clearError() {
    if (els.error) {
      els.error.style.display = "none";
      els.error.textContent = "";
    }
  }

  async function fetchJson(url, fallback) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status + " em " + url);
      return await res.json();
    } catch (error) {
      console.warn("[Noelle Avatar V19.7.6] Manifest indisponível:", error);
      return fallback;
    }
  }

  function normalizeAvatar(entry, idx) {
    if (typeof entry === "string") {
      const name = entry.split(/[\\/]/).pop().replace(/\.(vrm|glb)$/i, "");
      return { id: name || "avatar_" + idx, name: name || "Avatar " + (idx + 1), file: entry };
    }
    const file = String(entry.file || entry.path || entry.url || "").replace(/^\.\//, "");
    const base = file.split(/[\\/]/).pop().replace(/\.(vrm|glb)$/i, "");
    return {
      id: String(entry.id || base || "avatar_" + idx),
      name: String(entry.name || entry.label || base || "Avatar " + (idx + 1)),
      file,
      type: String(entry.type || (file.toLowerCase().endsWith(".vrm") ? "vrm" : "glb"))
    };
  }

  async function loadAvatarManifest() {
    const fallback = [{ id: "noelle", name: "Noelle", file: "assets/Noelle.vrm", type: "vrm" }];
    const raw = await fetchJson("./assets/avatar_manifest.json", fallback);
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.avatars) ? raw.avatars : fallback;
    const clean = list.map(normalizeAvatar).filter((item) => item.file && /\.(vrm|glb)$/i.test(item.file));
    state.avatars = clean.length ? clean : fallback;
    if (els.count) els.count.textContent = "Avatares: " + state.avatars.length;
    if (els.select) {
      els.select.innerHTML = "";
      for (const [idx, avatar] of state.avatars.entries()) {
        const option = document.createElement("option");
        option.value = String(idx);
        option.textContent = avatar.name;
        els.select.appendChild(option);
      }
    }
  }

  function resize() {
    if (!state.renderer || !state.camera || !els.canvas) return;
    const rect = els.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || els.canvas.clientWidth || 800));
    const height = Math.max(320, Math.floor(rect.height || els.canvas.clientHeight || 600));
    state.renderer.setSize(width, height, false);
    state.camera.aspect = width / height;
    state.camera.updateProjectionMatrix();
  }

  function initThree() {
    if (!els.canvas) throw new Error("Canvas #avatarCanvas não encontrado.");
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    camera.position.set(0, 1.45, 4.2);

    const renderer = new THREE.WebGLRenderer({ canvas: els.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.25, 0);
    controls.minDistance = 1.4;
    controls.maxDistance = 8;
    controls.enablePan = false;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4c4160, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(2.2, 4.8, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8ec7, 1.1);
    rim.position.set(-3, 2.2, -2.2);
    scene.add(rim);

    const grid = new THREE.GridHelper(4.2, 22, 0xff4fa0, 0x36314a);
    grid.position.y = -0.01;
    grid.material.transparent = true;
    grid.material.opacity = 0.45;
    scene.add(grid);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    state.scene = scene;
    state.camera = camera;
    state.renderer = renderer;
    state.controls = controls;
    state.loader = loader;

    resize();
    window.addEventListener("resize", resize);
  }

  function disposeObject(obj) {
    if (!obj) return;
    obj.traverse?.((child) => {
      if (child.geometry) child.geometry.dispose?.();
      const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      for (const material of materials) {
        for (const key of Object.keys(material)) {
          const value = material[key];
          if (value && typeof value === "object" && value.isTexture) value.dispose?.();
        }
        material.dispose?.();
      }
    });
  }

  function clearCurrentAvatar() {
    if (state.currentObject) {
      state.scene.remove(state.currentObject);
      disposeObject(state.currentObject);
    }
    state.currentObject = null;
    state.currentVRM = null;
  }

  function resetCamera() {
    if (!state.camera || !state.controls) return;
    state.camera.position.set(0, 1.45, 4.2);
    state.controls.target.set(0, 1.25, 0);
    state.controls.update();
  }

  function fitCameraToObject(object) {
    try {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.length()) || size.length() <= 0.001) {
        resetCamera();
        return;
      }
      object.position.x += -center.x;
      object.position.z += -center.z;
      const height = Math.max(1.2, size.y);
      const distance = Math.max(2.4, height * 1.75);
      state.controls.target.set(0, Math.max(0.9, height * 0.55), 0);
      state.camera.position.set(0, Math.max(1.2, height * 0.62), distance);
      state.camera.near = 0.01;
      state.camera.far = Math.max(100, distance * 10);
      state.camera.updateProjectionMatrix();
      state.controls.update();
    } catch (error) {
      console.warn("[Noelle Avatar V19.7.6] fitCamera falhou:", error);
      resetCamera();
    }
  }

  function currentAvatar() {
    return state.avatars[state.index] || null;
  }

  function updateUiForAvatar() {
    const avatar = currentAvatar();
    if (!avatar) return;
    if (els.name) els.name.textContent = avatar.name;
    if (els.file) els.file.textContent = avatar.file;
    if (els.select) els.select.value = String(state.index);
  }

  async function loadAvatarAt(index) {
    if (!state.avatars.length) return;
    state.index = (index + state.avatars.length) % state.avatars.length;
    const avatar = currentAvatar();
    updateUiForAvatar();
    clearError();
    setStatus("Carregando " + avatar.name + "...", "warn");
    if (els.loading) {
      els.loading.style.display = "grid";
      els.loading.innerHTML = "<div><strong>Carregando avatar...</strong><span>" + avatar.name + "</span></div>";
    }
    const token = ++state.loadingToken;
    try {
      const gltf = await state.loader.loadAsync("./" + avatar.file.replace(/^\.\//, ""));
      if (token !== state.loadingToken) return;
      clearCurrentAvatar();
      const vrm = gltf.userData?.vrm || null;
      let object = null;
      if (vrm) {
        try { VRMUtils.removeUnnecessaryVertices(gltf.scene); } catch {}
        try { VRMUtils.removeUnnecessaryJoints(gltf.scene); } catch {}
        object = vrm.scene;
        state.currentVRM = vrm;
      } else {
        object = gltf.scene;
        state.currentVRM = null;
      }
      object.traverse?.((child) => { child.frustumCulled = false; });
      object.rotation.set(0, 0, 0);
      object.position.set(0, 0, 0);
      state.scene.add(object);
      state.currentObject = object;
      fitCameraToObject(object);
      if (els.loading) els.loading.style.display = "none";
      setStatus("Avatar carregado", "ok");
      postAvatar("selected");
    } catch (error) {
      if (token !== state.loadingToken) return;
      showError(error);
    }
  }

  function avatarForState() {
    const avatar = currentAvatar();
    if (!avatar) return null;
    return {
      id: avatar.id,
      name: avatar.name,
      file: avatar.file,
      stateFile: "src/" + avatar.file.replace(/^src\//, "")
    };
  }

  async function saveDefault() {
    const avatar = avatarForState();
    if (!avatar) return;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "noelle-avatar-carousel-v19-7-6", type: "save-avatar", avatar }, "*");
      }
      setStatus("Avatar padrão salvo", "ok");
    } catch (error) {
      showError(error);
    }
  }

  function postAvatar(mode) {
    const avatar = avatarForState();
    if (!avatar) return;
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "noelle-avatar-carousel-v19-7-6", type: "avatar-mode", mode, avatar }, "*");
      }
    } catch (error) {
      console.warn("[Noelle Avatar V19.7.6] postMessage falhou:", error);
    }
  }

  function openMode(mode) {
    const avatar = avatarForState();
    if (!avatar) return;
    postAvatar(mode);
    if (mode === "preview") {
      try {
        if (window.parent && window.parent !== window) window.parent.postMessage({ source: "noelle-avatar-carousel-v19-7-6", type: "open-preview", avatar }, "*");
        else window.open("./avatar_carousel_v19_7_6.html?preview=1", "_blank");
      } catch (error) {
        showError(error);
      }
    } else if (mode === "room") {
      setStatus("Abrindo Room / Quarto...", "ok");
    } else if (mode === "widget") {
      setStatus("Abrindo Widget Mode...", "ok");
    }
  }

  function bindEvents() {
    els.prev?.addEventListener("click", () => loadAvatarAt(state.index - 1));
    els.next?.addEventListener("click", () => loadAvatarAt(state.index + 1));
    els.select?.addEventListener("change", () => loadAvatarAt(Number(els.select.value || 0)));
    els.resetCamera?.addEventListener("click", resetCamera);
    els.toggleSpin?.addEventListener("click", () => {
      state.spin = !state.spin;
      els.toggleSpin.textContent = state.spin ? "Parar giro" : "Girar";
    });
    els.saveDefault?.addEventListener("click", saveDefault);
    els.openRoom?.addEventListener("click", () => openMode("room"));
    els.openWidget?.addEventListener("click", () => openMode("widget"));
    els.openPreview?.addEventListener("click", () => openMode("preview"));
    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") loadAvatarAt(state.index - 1);
      if (event.key === "ArrowRight") loadAvatarAt(state.index + 1);
    });
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = state.clock.getDelta();
    if (state.currentVRM?.update) state.currentVRM.update(delta);
    if (state.spin && state.currentObject) state.currentObject.rotation.y += delta * 0.55;
    state.controls?.update();
    state.renderer?.render(state.scene, state.camera);
  }

  async function boot() {
    try {
      setStatus("Inicializando preview...", "warn");
      initThree();
      bindEvents();
      await loadAvatarManifest();
      animate();
      await loadAvatarAt(0);
    } catch (error) {
      showError(error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
