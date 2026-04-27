const $ = (selector) => document.querySelector(selector);

const state = {
  assets: null,
  currentExpression: null,
  currentMotion: null,
  vrmLoaded: false,
  rendererReady: false,
  clock: null,
  vrm: null,
  mixer: null
};

function setStatus(text) {
  const el = $("#avatarStatus");
  if (el) el.textContent = text;
}

function setFallback(text) {
  const title = $("#fallbackTitle");
  const status = $("#fallbackStatus");
  if (title) title.textContent = text.title || title.textContent;
  if (status) status.textContent = text.status || status.textContent;
}

function pulseFace(kind = "motion") {
  const face = $("#fallbackFace");
  if (!face) return;
  face.classList.remove("motion");
  void face.offsetWidth;
  face.classList.add("motion");
  setTimeout(() => face.classList.remove("motion"), 400);
  if (kind === "happy") face.textContent = "☺";
  if (kind === "sad") face.textContent = "☹";
  if (kind === "angry") face.textContent = "!";
  if (kind === "sick") face.textContent = "…";
  if (kind === "neutral") face.textContent = "♛";
}

async function loadAssets() {
  try {
    const result = await window.noelleAPI?.assets?.();
    if (result?.ok) {
      state.assets = result.assets;
      return result.assets;
    }
  } catch (err) {
    setStatus("Falha ao ler assets: " + (err.message || err));
  }
  return null;
}

async function tryLoad3D() {
  const canvas = $("#avatarCanvas");
  if (!canvas) return false;
  const assets = state.assets || await loadAssets();
  const avatar = assets?.avatars?.find((item) => item.exists && /noelle/i.test(item.id)) || assets?.avatars?.find((item) => item.exists);
  if (!avatar) {
    setFallback({ title: "Nenhum VRM encontrado", status: "Coloque Noelle.vrm em src/assets/Noelle.vrm." });
    return false;
  }
  try {
    const THREE = await import("../../node_modules/three/build/three.module.js");
    const { GLTFLoader } = await import("../../node_modules/three/examples/jsm/loaders/GLTFLoader.js");
    let VRMUtils = null;
    let VRMLoaderPlugin = null;
    try {
      const vrmModule = await import("../../node_modules/@pixiv/three-vrm/lib/three-vrm.module.js");
      VRMUtils = vrmModule.VRMUtils;
      VRMLoaderPlugin = vrmModule.VRMLoaderPlugin;
    } catch (_) {
      const vrmModule = await import("../../node_modules/@pixiv/three-vrm/lib/three-vrm.module.min.js");
      VRMUtils = vrmModule.VRMUtils;
      VRMLoaderPlugin = vrmModule.VRMLoaderPlugin;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, canvas.clientWidth / Math.max(1, canvas.clientHeight), 0.1, 20);
    camera.position.set(0, 1.35, 3.2);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const light = new THREE.DirectionalLight(0xffffff, 1.7);
    light.position.set(1, 2, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 1.35));

    const loader = new GLTFLoader();
    if (VRMLoaderPlugin) loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(avatar.url);
    const vrm = gltf.userData.vrm;
    if (!vrm) throw new Error("Arquivo carregou, mas não retornou VRM.");
    if (VRMUtils?.removeUnnecessaryVertices) VRMUtils.removeUnnecessaryVertices(gltf.scene);
    if (VRMUtils?.removeUnnecessaryJoints) VRMUtils.removeUnnecessaryJoints(gltf.scene);
    vrm.scene.rotation.y = Math.PI;
    scene.add(vrm.scene);
    state.vrm = vrm;
    state.vrmLoaded = true;
    state.rendererReady = true;
    state.clock = new THREE.Clock();
    $("#avatarFallback")?.classList.add("hidden");
    setStatus("VRM carregado: " + avatar.rel);

    function resize() {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    window.addEventListener("resize", resize);

    function tick() {
      requestAnimationFrame(tick);
      const delta = state.clock.getDelta();
      state.vrm?.update?.(delta);
      renderer.render(scene, camera);
    }
    tick();
    return true;
  } catch (err) {
    console.warn("Viewer VRM fallback:", err);
    setFallback({ title: "Fallback visual ativo", status: "O VRM existe, mas o viewer 3D não carregou. Rode INICIAR.bat opção 1/3 para instalar three e @pixiv/three-vrm." });
    setStatus("Viewer 3D indisponível: " + (err.message || err));
    return false;
  }
}

function applyExpression(entry = {}) {
  state.currentExpression = entry;
  const preview = $("#expressionPreview");
  if (preview && entry.url) {
    preview.src = entry.url;
    preview.style.display = "block";
  }
  pulseFace(String(entry.id || entry.label || "neutral").toLowerCase());
  setStatus("Expressão: " + (entry.label || entry.id || "desconhecida"));
}

function playMotion(entry = {}) {
  state.currentMotion = entry;
  pulseFace("motion");
  setStatus("Motion VRMA recebido: " + (entry.label || entry.id || entry.file || "motion"));
  // A reprodução real de VRMA depende de um loader de animação VRM específico.
  // Esta janela preserva o comando e o arquivo para integração incremental sem quebrar o widget.
}

function equipItem(entry = {}) {
  pulseFace("neutral");
  setStatus("Item recebido: " + (entry.label || entry.id || entry.file || "item"));
}

function handleCommand(data = {}) {
  const command = data.command;
  const payload = data.payload || {};
  if (command === "expression") applyExpression(payload);
  else if (command === "motion") playMotion(payload);
  else if (command === "item") equipItem(payload);
  else if (command === "camera") setStatus("Câmera: " + (payload.value || payload.id || "padrão"));
  else if (command === "pause") setStatus("Avatar pausado.");
  else if (command === "stop") setStatus("Avatar parado.");
  else if (command === "reload") location.reload();
  else if (command === "center") setStatus("Centralizar: mova/salve a posição pelo controle.");
  else setStatus("Comando: " + command);
}

function bindWindowButtons() {
  $("#closeBtn")?.addEventListener("click", () => window.noelleAPI?.closeAvatar?.());
  $("#minBtn")?.addEventListener("click", () => window.noelleAPI?.closeAvatar?.());
}

async function boot() {
  bindWindowButtons();
  setStatus("Lendo assets...");
  await loadAssets();
  await tryLoad3D();
  window.noelleAPI?.onAvatarCommand?.(handleCommand);
  setStatus(state.vrmLoaded ? "Avatar pronto." : "Fallback do avatar pronto.");
}

document.addEventListener("DOMContentLoaded", boot);
