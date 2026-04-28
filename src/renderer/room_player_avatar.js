import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const DEFAULT_AVATAR_URLS = [
  "./assets/avatars/Yoru.vrm",
  "./assets/avatars/yoru.vrm",
  "./assets/Yoru.vrm",
  "./assets/Noelle.vrm",
  "./assets/avatars/Noelle.vrm",
  "./assets/avatars/noelle.vrm"
];

function disposeObject(object) {
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials.filter(Boolean)) {
      material.dispose?.();
    }
  });
}

function makeFallbackAvatar() {
  const root = new THREE.Group();
  root.name = "yoru-fallback-capsule";

  const body = new THREE.Mesh(
    THREE.CapsuleGeometry
      ? new THREE.CapsuleGeometry(0.22, 0.78, 6, 12)
      : new THREE.CylinderGeometry(0.22, 0.22, 1.25, 16),
    new THREE.MeshStandardMaterial({ color: 0xff477e, roughness: 0.65 })
  );
  body.position.y = 0.78;
  body.castShadow = true;
  body.receiveShadow = true;

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffbdd0, roughness: 0.7 })
  );
  head.position.y = 1.48;
  head.castShadow = true;

  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  );
  marker.position.set(0, 1.42, -0.23);

  root.add(body, head, marker);
  root.userData.noelleFallbackAvatar = true;
  return root;
}

function normalizeVisual(visualRoot, targetHeight = 1.62) {
  visualRoot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(visualRoot);
  if (box.isEmpty()) return { height: targetHeight, eyeHeight: 1.52 };

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  visualRoot.position.x -= center.x;
  visualRoot.position.z -= center.z;
  visualRoot.position.y -= box.min.y;

  const height = Math.max(0.01, size.y);
  const scale = targetHeight / height;
  visualRoot.scale.setScalar(Math.max(0.001, Math.min(20, scale)));

  // VRM humanoid eye is usually around 90-94% of height; keep a conservative value
  // to avoid seeing through hair/face meshes.
  return { height: targetHeight, eyeHeight: targetHeight * 0.92 };
}

export function createRoomPlayerAvatar({ toast } = {}) {
  const root = new THREE.Group();
  root.name = "yoru-player-avatar-root";

  let visual = makeFallbackAvatar();
  let loadedUrl = null;
  let eyeHeight = 1.50;
  let targetHeight = 1.62;
  let bobTime = 0;
  let disposed = false;

  root.add(visual);

  function replaceVisual(nextVisual, meta = {}) {
    const old = visual;
    old?.removeFromParent?.();
    if (old && !old.userData?.noelleExternalScene) disposeObject(old);

    visual = nextVisual;
    visual.name = meta.name || "yoru-player-visual";
    root.add(visual);

    targetHeight = meta.height || targetHeight;
    eyeHeight = meta.eyeHeight || eyeHeight;
  }

  async function load(urls = DEFAULT_AVATAR_URLS) {
    const loader = new GLTFLoader();

    for (const url of urls) {
      try {
        const gltf = await loader.loadAsync(url);
        if (disposed) return { ok: false, reason: "disposed" };

        const scene = gltf.scene || gltf.scenes?.[0];
        if (!scene) throw new Error("VRM/GLB sem cena carregável");

        scene.userData.noelleExternalScene = true;
        scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
          }
        });

        const wrapper = new THREE.Group();
        wrapper.name = "yoru-vrm-wrapper";
        wrapper.add(scene);

        const meta = normalizeVisual(wrapper, 1.62);
        replaceVisual(wrapper, { name: "yoru-vrm-player", ...meta });
        loadedUrl = url;
        toast?.("Yoru/Noelle carregada para POV");
        return { ok: true, url, eyeHeight, targetHeight };
      } catch (err) {
        console.warn("[Noelle Room] Falha ao carregar avatar player:", url, err);
      }
    }

    toast?.("Avatar VRM não encontrado; usando cápsula fallback");
    return { ok: false, reason: "not_found", eyeHeight, targetHeight };
  }

  function setMode(mode) {
    // In first-person the camera is at Yoru's eyes. Hiding the body prevents
    // seeing the inside of the head/face, which is the common first-person fix.
    root.visible = mode === "third_person";
  }

  function update(dt, moving, mode) {
    if (!visual) return;
    if (mode !== "third_person") {
      visual.position.y = 0;
      return;
    }

    if (moving) {
      bobTime += dt * 8.0;
      visual.position.y = Math.sin(bobTime) * 0.018;
    } else {
      visual.position.y *= 0.86;
    }
  }

  function getEyeHeight() {
    return eyeHeight || 1.50;
  }

  function getTargetHeight() {
    return targetHeight || 1.62;
  }

  function dispose() {
    disposed = true;
    visual?.removeFromParent?.();
    disposeObject(visual);
    root.removeFromParent();
  }

  return {
    root,
    load,
    setMode,
    update,
    getEyeHeight,
    getTargetHeight,
    get loadedUrl() { return loadedUrl; },
    dispose
  };
}
