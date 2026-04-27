import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";

export function createRoomScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x090a14);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 120);
  camera.position.set(4.2, 3.0, 5.0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.75, 0);

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setMode("translate");
  transformControls.setTranslationSnap(0.25);
  transformControls.setRotationSnap(THREE.MathUtils.degToRad(15));
  transformControls.setScaleSnap(0.05);
  transformControls.addEventListener("dragging-changed", (event) => {
    controls.enabled = !event.value;
  });

  const transformHelper = typeof transformControls.getHelper === "function" ? transformControls.getHelper() : transformControls;
  scene.add(transformHelper);

  const ambient = new THREE.HemisphereLight(0xffffff, 0x1b1330, 1.8);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xffd8ef, 0.7);
  fill.position.set(-4, 3, -3);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({ color: 0x171420, roughness: 0.9, metalness: 0.0 })
  );
  floor.name = "room-floor";
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(10, 40, 0xff477e, 0x3b3147);
  grid.name = "room-grid";
  grid.position.y = 0.002;
  scene.add(grid);

  const roomRoot = new THREE.Group();
  roomRoot.name = "room-root";
  scene.add(roomRoot);

  function focusOnObject(object) {
    if (!object) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    controls.target.copy(center);
    const distance = Math.max(2.5, Math.max(size.x, size.y, size.z) * 2.6);
    camera.position.set(center.x + distance, center.y + distance * 0.62 + 0.9, center.z + distance);
  }

  function resetCamera() {
    camera.position.set(4.2, 3.0, 5.0);
    controls.target.set(0, 0.75, 0);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("resize", resize);
  resize();

  let frame = 0;
  function render() {
    frame = requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  }
  render();

  function dispose() {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    transformControls.detach();
    transformControls.dispose?.();
    controls.dispose();
    renderer.dispose();
  }

  return { THREE, renderer, scene, camera, controls, transformControls, transformHelper, floor, grid, roomRoot, resize, focusOnObject, resetCamera, dispose };
}
