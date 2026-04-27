import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { clampToRoom, validateRoomObject, createBoxHelper } from "./room_collision.js";

function cleanPath(file) {
  return String(file || "").replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

function itemUrl(item) {
  const file = cleanPath(item.file || item.path);
  if (/^(file|https?):/i.test(file)) return file;
  if (file.startsWith("src/assets/")) return "./" + file.slice("src/".length);
  if (file.startsWith("assets/")) return "./" + file;
  if (file.startsWith("items/")) return "./assets/" + file;
  return "./assets/items/" + file;
}

function uidFor(itemId) {
  return `${itemId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function degToRad(deg) {
  return Number(deg || 0) * Math.PI / 180;
}

function radToDeg(rad) {
  return Number(rad || 0) * 180 / Math.PI;
}

function snap(value, step) {
  if (!step) return value;
  return Math.round(value / step) * step;
}

function cloneMaterial(material) {
  if (!material) return material;
  const cloned = material.clone ? material.clone() : material;
  cloned.userData = { ...(cloned.userData || {}), noelleCloneOwned: true };
  return cloned;
}

function makeCloneResourcesUnique(object) {
  object.traverse((child) => {
    child.frustumCulled = false;
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.geometry?.clone) {
        child.geometry = child.geometry.clone();
        child.geometry.userData = { ...(child.geometry.userData || {}), noelleCloneOwned: true };
      }
      if (Array.isArray(child.material)) child.material = child.material.map(cloneMaterial);
      else child.material = cloneMaterial(child.material);
    }
  });
}

function disposeObject(object) {
  object?.traverse?.((child) => {
    if (!child.isMesh) return;
    if (child.geometry?.userData?.noelleCloneOwned) child.geometry.dispose?.();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials.filter(Boolean)) {
      if (material.userData?.noelleCloneOwned) material.dispose?.();
    }
  });
}

function createMissingAssetPlaceholder(item, error) {
  const group = new THREE.Group();
  group.userData.noelleMissingAsset = true;
  group.userData.noelleMissingError = String(error?.message || error || "asset missing");

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.45, 0.65),
    new THREE.MeshStandardMaterial({ color: 0x7a1f35, roughness: 0.85, metalness: 0.0 })
  );
  body.castShadow = true;
  body.receiveShadow = true;

  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.05, 0.72),
    new THREE.MeshStandardMaterial({ color: 0xff477e, roughness: 0.8 })
  );
  top.position.y = 0.25;

  group.add(body, top);
  group.name = `missing:${item?.id || "item"}`;
  return group;
}

async function loadSourceOrPlaceholder(loader, item) {
  try {
    const gltf = await loader.loadAsync(itemUrl(item));
    const root = gltf.scene || gltf.scenes?.[0];
    if (!root) throw new Error(`GLB sem cena: ${item.id}`);
    return root;
  } catch (err) {
    console.warn("[Noelle Room] Asset ausente ou inválido, usando placeholder:", item?.id, err);
    return createMissingAssetPlaceholder(item, err);
  }
}

function normalizeLoadedObject(source, targetSize = 1, alignGround = true) {
  const wrapper = new THREE.Group();
  const object = (() => {
    try { return cloneSkeleton(source); }
    catch { return source.clone(true); }
  })();

  if (source.userData?.noelleMissingAsset) {
    object.userData.noelleMissingAsset = true;
    object.userData.noelleMissingError = source.userData.noelleMissingError;
  }

  makeCloneResourcesUnique(object);

  wrapper.add(object);
  object.updateMatrixWorld(true);

  let baseScale = 1;
  const box = new THREE.Box3().setFromObject(object);
  if (!box.isEmpty()) {
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= alignGround ? box.min.y : center.y;

    const maxDim = Math.max(size.x, size.y, size.z);
    if (Number.isFinite(maxDim) && maxDim > 0.0001) {
      baseScale = Number(targetSize || 1) / maxDim;
      baseScale = Math.min(20, Math.max(0.001, baseScale));
      wrapper.scale.setScalar(baseScale);
    }
  }

  wrapper.userData.noelleRoom = { baseScale, userScale: [1, 1, 1] };
  if (object.userData?.noelleMissingAsset) {
    wrapper.userData.noelleMissingAsset = true;
    wrapper.userData.noelleMissingError = object.userData.noelleMissingError;
  }
  return wrapper;
}

function setUserScale(object, scale = [1, 1, 1]) {
  const base = Number(object.userData?.noelleRoom?.baseScale || 1);
  const user = [
    Math.max(0.001, Number(scale[0] || 1)),
    Math.max(0.001, Number(scale[1] || 1)),
    Math.max(0.001, Number(scale[2] || 1))
  ];
  object.userData.noelleRoom = { ...(object.userData.noelleRoom || {}), userScale: user };
  object.scale.set(base * user[0], base * user[1], base * user[2]);
}

function getUserScale(object) {
  const base = Number(object.userData?.noelleRoom?.baseScale || 1);
  if (!base) return [object.scale.x, object.scale.y, object.scale.z];
  return [object.scale.x / base, object.scale.y / base, object.scale.z / base];
}

export function createRoomItemManager({ THREE: ThreeRef, roomRoot, scene, camera, renderer, transformControls, gridSize = 0.25, toast, onValidate, onObjectChanged, onObjectCommitted }) {
  const loader = new GLTFLoader();
  loader.setCrossOrigin?.("anonymous");

  const cache = new Map();
  const placed = new Map();
  const boxHelper = createBoxHelper(ThreeRef, scene);
  let selectedUid = null;
  let collisionEnabled = true;

  async function loadSource(item) {
    if (cache.has(item.id)) return cache.get(item.id);
    const root = await loadSourceOrPlaceholder(loader, item);
    cache.set(item.id, root);
    return root;
  }

  function validateSelected() {
    const entry = getSelected();
    if (!entry) {
      onValidate?.({ ok: true, errors: [], warnings: [] });
      return { ok: true, errors: [], warnings: [] };
    }
    const result = validateRoomObject(entry, [...placed.values()], { collisionEnabled });
    onValidate?.(result);
    return result;
  }

  function select(uid) {
    selectedUid = uid;
    const entry = placed.get(uid) || null;
    if (entry) {
      if (!entry.locked) transformControls?.attach(entry.object);
      else transformControls?.detach();
      boxHelper.attach(entry.object);
    } else {
      transformControls?.detach();
      boxHelper.attach(null);
    }
    validateSelected();
    return entry;
  }

  function getSelected() {
    return selectedUid ? placed.get(selectedUid) || null : null;
  }

  async function addItem(item, transform = {}) {
    const source = await loadSource(item);
    const object = normalizeLoadedObject(source, item.placement?.targetSize || item.targetSize || 1, true);
    const uid = transform.uid || uidFor(item.id);

    object.name = `room:${item.id}:${uid}`;
    object.userData.room = { uid, itemId: item.id, selectable: true };

    const pos = transform.position || item.placement?.position || [0, 0, 0];
    const rot = transform.rotationDeg || item.placement?.rotationDeg || [0, 0, 0];
    const sc = transform.scale || [1, 1, 1];

    object.position.set(
      snap(Number(pos[0] || 0), gridSize),
      Math.max(0, Number(pos[1] || 0)),
      snap(Number(pos[2] || 0), gridSize)
    );
    clampToRoom(object.position);

    object.rotation.set(degToRad(rot[0]), degToRad(rot[1]), degToRad(rot[2]));
    setUserScale(object, sc);

    roomRoot.add(object);
    placed.set(uid, { uid, item, object, locked: !!transform.locked, original: { item, transform } });
    select(uid);
    toast?.(`${item.label || item.id} adicionado`);
    onObjectCommitted?.("add");
    return placed.get(uid);
  }

  function remove(uid = selectedUid) {
    const entry = placed.get(uid);
    if (!entry) return false;
    if (selectedUid === uid) {
      transformControls?.detach();
      boxHelper.attach(null);
      selectedUid = null;
    }
    entry.object.removeFromParent();
    disposeObject(entry.object);
    placed.delete(uid);
    validateSelected();
    onObjectCommitted?.("remove");
    return true;
  }

  async function duplicate(uid = selectedUid, offset = [gridSize * 2, 0, gridSize * 2]) {
    const entry = placed.get(uid);
    if (!entry) return null;
    const data = serializeEntry(entry);
    data.uid = uidFor(entry.item.id);
    data.position[0] += offset[0] || 0;
    data.position[1] += offset[1] || 0;
    data.position[2] += offset[2] || 0;
    return addItem(entry.item, data);
  }

  async function resetSelected() {
    const entry = getSelected();
    if (!entry) return;
    const item = entry.item;
    remove(entry.uid);
    const result = await addItem(item, item.placement || {});
    onObjectCommitted?.("reset");
    return result;
  }

  function clear({ silent = false } = {}) {
    for (const uid of [...placed.keys()]) {
      const entry = placed.get(uid);
      if (entry) {
        entry.object.removeFromParent();
        disposeObject(entry.object);
      }
      placed.delete(uid);
    }
    transformControls?.detach();
    boxHelper.attach(null);
    selectedUid = null;
    validateSelected();
    if (!silent) onObjectCommitted?.("clear");
  }

  let transformDirty = false;
  function postTransformChanged() {
    const entry = getSelected();
    if (entry) {
      transformDirty = true;
      clampToRoom(entry.object.position);
      boxHelper.update(entry.object);
    }
    validateSelected();
    onObjectChanged?.("transform");
  }

  transformControls?.addEventListener("objectChange", postTransformChanged);
  transformControls?.addEventListener("mouseUp", () => {
    if (transformDirty) {
      transformDirty = false;
      onObjectCommitted?.("transform");
    }
  });

  function moveSelected(dx = 0, dy = 0, dz = 0, fine = false) {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    const step = fine ? gridSize / 4 : gridSize;
    entry.object.position.x = snap(entry.object.position.x + dx * step, gridSize);
    entry.object.position.y = Math.max(0, entry.object.position.y + dy * step);
    entry.object.position.z = snap(entry.object.position.z + dz * step, gridSize);
    clampToRoom(entry.object.position);
    postTransformChanged();
    onObjectCommitted?.("move");
  }

  function rotateSelected(degY = 0, fine = false) {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    const step = fine ? 5 : degY;
    entry.object.rotation.y += degToRad(step);
    postTransformChanged();
    onObjectCommitted?.("rotate");
  }

  function scaleSelected(delta = 0) {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    const factor = Math.max(0.05, 1 + delta);
    const scale = getUserScale(entry.object).map((v) => v * factor);
    setUserScale(entry.object, scale);
    postTransformChanged();
    onObjectCommitted?.("scale");
  }

  function setSelectedTransform({ position, rotationDeg, scale }) {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    if (Array.isArray(position)) entry.object.position.set(Number(position[0] || 0), Math.max(0, Number(position[1] || 0)), Number(position[2] || 0));
    if (Array.isArray(rotationDeg)) entry.object.rotation.set(degToRad(rotationDeg[0]), degToRad(rotationDeg[1]), degToRad(rotationDeg[2]));
    if (Array.isArray(scale)) setUserScale(entry.object, scale);
    clampToRoom(entry.object.position);
    postTransformChanged();
    onObjectCommitted?.("apply-transform");
  }

  function centerSelected() {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    entry.object.position.set(0, Math.max(0, entry.object.position.y), 0);
    postTransformChanged();
    onObjectCommitted?.("center");
  }

  function groundSelected() {
    const entry = getSelected();
    if (!entry || entry.locked) return;
    entry.object.position.y = 0;
    postTransformChanged();
    onObjectCommitted?.("ground");
  }

  function rotateSelected90() {
    rotateSelected(90, false);
  }

  function setMode(mode) {
    const clean = ["translate", "rotate", "scale"].includes(mode) ? mode : "translate";
    transformControls?.setMode(clean);
  }

  function toggleLock(uid = selectedUid) {
    const entry = placed.get(uid);
    if (!entry) return false;
    entry.locked = !entry.locked;
    if (entry.locked) transformControls?.detach();
    else select(uid);
    onObjectCommitted?.("lock");
    return entry.locked;
  }

  function setCollisionEnabled(value) {
    collisionEnabled = !!value;
    validateSelected();
    return collisionEnabled;
  }

  function serializeEntry(entry) {
    const userScale = getUserScale(entry.object);
    return {
      uid: entry.uid,
      itemId: entry.item.id,
      position: [entry.object.position.x, entry.object.position.y, entry.object.position.z].map((n) => Number(n.toFixed(4))),
      rotationDeg: [radToDeg(entry.object.rotation.x), radToDeg(entry.object.rotation.y), radToDeg(entry.object.rotation.z)].map((n) => Number(n.toFixed(2))),
      scale: userScale.map((n) => Number(n.toFixed(4))),
      locked: !!entry.locked
    };
  }

  function serialize() {
    return [...placed.values()].map(serializeEntry);
  }

  async function loadLayout(layout, catalog) {
    clear({ silent: true });
    const byId = new Map(catalog.map((item) => [item.id, item]));
    for (const entry of Array.isArray(layout?.items) ? layout.items : []) {
      const item = byId.get(entry.itemId);
      if (!item) {
        console.warn("Item do layout não existe no catálogo:", entry.itemId);
        continue;
      }
      try { await addItem(item, entry); }
      catch (err) { console.warn("Falha ao carregar item da Room:", entry.itemId, err); }
    }
    onObjectCommitted?.("load-layout");
  }

  const raycaster = new ThreeRef.Raycaster();
  const pointer = new ThreeRef.Vector2();

  function pickFromEvent(event) {
    if (transformControls?.dragging) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const roots = [...placed.values()].map((entry) => entry.object);
    const hits = raycaster.intersectObjects(roots, true);
    if (!hits.length) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData?.room?.uid) obj = obj.parent;
    return obj?.userData?.room?.uid || null;
  }

  const onPointerDown = (event) => {
    const uid = pickFromEvent(event);
    if (uid) select(uid);
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  function dispose() {
    clear({ silent: true });
    cache.clear();
    boxHelper.dispose();
    transformControls?.removeEventListener("objectChange", postTransformChanged);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
  }

  return {
    placed,
    addItem,
    remove,
    duplicate,
    resetSelected,
    clear,
    select,
    getSelected,
    moveSelected,
    rotateSelected,
    rotateSelected90,
    scaleSelected,
    setSelectedTransform,
    centerSelected,
    groundSelected,
    setMode,
    toggleLock,
    setCollisionEnabled,
    serialize,
    loadLayout,
    validateSelected,
    dispose
  };
}
