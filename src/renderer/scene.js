import { loadUiPrefs } from "./config.js";

function getPixelRatioCap(mode) {
  if (mode === "performance") return 1.0;
  if (mode === "quality") return 2.0;
  return 1.5;
}

export function createSceneRuntime(THREE, container) {
  const uiPrefs = loadUiPrefs();
  const performanceMode = uiPrefs.performanceMode || "balanced";
  const antialias = performanceMode !== "performance";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1.28, 1.94);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias,
    premultipliedAlpha: true,
    powerPreference: performanceMode === "performance" ? "high-performance" : "default",
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, getPixelRatioCap(performanceMode)));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const key = new THREE.DirectionalLight(0xffffff, 1.65);
  key.position.set(1.2, 2.4, 2.7);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffffff, 0.95);
  fill.position.set(-1.1, 1.6, 1.8);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(0.0, 1.8, -2.2);
  scene.add(rim);

  scene.add(new THREE.AmbientLight(0xffffff, 0.86));

  const sceneAnchor = new THREE.Group();
  sceneAnchor.position.set(0.0, -1.36, -0.55);
  scene.add(sceneAnchor);

  function applyRuntimeQuality() {
    const prefs = loadUiPrefs();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, getPixelRatioCap(prefs.performanceMode || "balanced")));
  }

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    applyRuntimeQuality();
  }

  return { scene, camera, renderer, resize, sceneAnchor, applyRuntimeQuality };
}
