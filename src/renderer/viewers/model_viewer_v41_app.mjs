const params = new URLSearchParams(window.location.search || "");
const mode = params.get("mode") || document.body.dataset.mode || "model";
const modelPath = params.get("model") || params.get("scene") || "";
const displayName = params.get("name") || "Modelo";

const messageEl = document.getElementById("message");
const modeEl = document.getElementById("modeBadge");
const nameEl = document.getElementById("nameBadge");

if (modeEl) modeEl.textContent = mode.toUpperCase();
if (nameEl) nameEl.textContent = displayName;

function setMessage(text, kind = "") {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.className = kind;
}

function toSrcRelativeUrl(assetPath) {
  const clean = String(assetPath || "").replace(/^src\//, "").replace(/^\.?\//, "");
  return new URL("../../" + clean, window.location.href).href;
}

async function boot() {
  if (!modelPath) {
    setMessage("Nenhum modelo foi informado.", "warn");
    return;
  }

  let THREE;
  let GLTFLoader;

  try {
    THREE = await import("three");
    ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
  } catch (err) {
    setMessage("Dependência Three.js não encontrada no node_modules. Rode npm install.", "warn");
    console.error(err);
    return;
  }

  const mount = document.getElementById("canvasMount");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080810);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 5000);
  camera.position.set(0, 1.25, 3.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  mount.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x221133, 2.2);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xffffff, 1.15);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 2.0);
  dir.position.set(1.2, 2.8, 2.4);
  scene.add(dir);

  const grid = new THREE.GridHelper(10, 40, 0x8a2be2, 0x2d203e);
  grid.position.y = 0;
  scene.add(grid);

  const loader = new GLTFLoader();
  const url = toSrcRelativeUrl(modelPath);

  setMessage("Carregando " + modelPath + "...");

  let modelRoot = null;
  let fitState = null;

  try {
    const gltf = await loader.loadAsync(url);
    modelRoot = gltf.scene || (gltf.scenes && gltf.scenes[0]);

    if (!modelRoot) throw new Error("GLTF sem scene");

    scene.add(modelRoot);
    fitState = fitObject(modelRoot);
    setMessage(
      mode === "scene"
        ? "Cenário carregado como room: " + modelPath
        : "Modelo carregado: " + modelPath,
      "ok"
    );
  } catch (err) {
    console.error(err);
    setMessage("Falha ao carregar: " + modelPath + " — " + (err.message || err), "warn");
  }

  function resize() {
    const rect = mount.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function fitAvatar(object) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return null;

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.65 / maxSize;

    object.position.sub(center);
    object.scale.setScalar(scale);

    const scaledHeight = size.y * scale;
    const scaledDepth = size.z * scale;
    object.position.y += Math.max(0.0, scaledHeight * 0.02);

    camera.fov = 35;
    camera.near = 0.01;
    camera.far = 100;
    camera.position.set(0, Math.max(1.05, scaledHeight * 0.58), Math.max(2.3, scaledDepth * 3.0));
    camera.lookAt(0, Math.max(0.8, scaledHeight * 0.52), 0);
    camera.updateProjectionMatrix();

    grid.scale.setScalar(Math.max(1.0, scaledHeight * 1.2));
    grid.position.y = -scaledHeight * 0.5;

    return {
      type: "avatar",
      resetRotation: new THREE.Euler(0, 0, 0)
    };
  }

  function fitSceneRoom(object) {
    const initialBox = new THREE.Box3().setFromObject(object);
    if (initialBox.isEmpty()) return null;

    const size = initialBox.getSize(new THREE.Vector3());
    const center = initialBox.getCenter(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z) || 1;
    const minSize = Math.min(size.x || 1, size.y || 1, size.z || 1);

    // CENÁRIO: não comprimir para 2 unidades como avatar.
    // Mantemos escala original para rooms médios/grandes e só ampliamos se vier muito pequeno.
    let scale = 1;
    if (maxSize < 6) {
      scale = 6 / maxSize;
    }

    object.scale.setScalar(scale);
    object.position.sub(center.multiplyScalar(scale));

    const box = new THREE.Box3().setFromObject(object);
    const scaledSize = box.getSize(new THREE.Vector3());
    const scaledCenter = box.getCenter(new THREE.Vector3());

    object.position.x -= scaledCenter.x;
    object.position.z -= scaledCenter.z;
    object.position.y -= box.min.y;

    const fittedBox = new THREE.Box3().setFromObject(object);
    const fittedSize = fittedBox.getSize(new THREE.Vector3());
    const fittedCenter = fittedBox.getCenter(new THREE.Vector3());

    const radius = fittedSize.length() * 0.5;
    const fov = 48;
    const distance = Math.max(
      5,
      radius / Math.tan(THREE.MathUtils.degToRad(fov * 0.5)) * 0.88,
      fittedSize.z * 0.78,
      fittedSize.x * 0.72
    );

    camera.fov = fov;
    camera.near = 0.05;
    camera.far = Math.max(500, distance * 20, radius * 20);
    camera.position.set(0, Math.max(1.7, fittedSize.y * 0.36), distance);
    camera.lookAt(0, Math.max(1.0, fittedCenter.y * 0.72), 0);
    camera.updateProjectionMatrix();

    const gridScale = Math.max(4, Math.max(fittedSize.x, fittedSize.z) * 1.08);
    grid.scale.setScalar(gridScale / 10);
    grid.position.y = 0;

    return {
      type: "scene",
      resetRotation: new THREE.Euler(0, 0, 0),
      sceneHeight: fittedSize.y,
      sceneDistance: distance
    };
  }

  function fitObject(object) {
    if (mode === "scene") return fitSceneRoom(object);
    return fitAvatar(object);
  }

  let dragging = false;
  let lastX = 0;

  renderer.domElement.addEventListener("pointerdown", (event) => {
    dragging = true;
    lastX = event.clientX;
    renderer.domElement.setPointerCapture(event.pointerId);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    if (!dragging || !modelRoot) return;
    const dx = event.clientX - lastX;
    lastX = event.clientX;
    modelRoot.rotation.y += dx * 0.01;
  });

  renderer.domElement.addEventListener("pointerup", () => {
    dragging = false;
  });

  renderer.domElement.addEventListener("wheel", (event) => {
    event.preventDefault();
    const step = mode === "scene" ? 0.01 : 0.002;
    const minZ = mode === "scene" ? 2.5 : 0.9;
    const maxZ = mode === "scene" ? 80 : 10;
    camera.position.z += event.deltaY * step;
    camera.position.z = Math.max(minZ, Math.min(maxZ, camera.position.z));
  }, { passive: false });

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (data.source !== "avatar-v41.1" && data.source !== "avatar-v41") return;

    if (data.action === "fit" && modelRoot) fitState = fitObject(modelRoot);
    if (data.action === "reset" && modelRoot) {
      modelRoot.rotation.set(0, 0, 0);
      fitState = fitObject(modelRoot);
    }
  });

  window.addEventListener("resize", resize);
  resize();

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

boot();
