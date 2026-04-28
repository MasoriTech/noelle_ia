import * as THREE from "three";
import { findSafeSpawn, moveWithSliding, resolveThirdPersonCamera } from "./room_walk_collision.js";

export function createRoomPlayerController({
  scene,
  camera,
  renderer,
  getEntries,
  toast,
  setStatus,
  onModeChange,
  onPlayerChanged
}) {
  const player = new THREE.Group();
  player.name = "room-player";
  player.position.set(0, 0, 2.6);

  const geometry = THREE.CapsuleGeometry
    ? new THREE.CapsuleGeometry(0.22, 0.72, 6, 12)
    : new THREE.CylinderGeometry(0.22, 0.22, 1.1, 16);

  const body = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xff477e, roughness: 0.65 })
  );
  body.position.y = 0.72;
  body.castShadow = true;
  body.receiveShadow = true;
  player.add(body);

  const forwardMarker = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
  );
  forwardMarker.position.set(0, 1.12, -0.22);
  player.add(forwardMarker);

  scene.add(player);
  player.visible = false;

  const keys = new Set();
  const state = {
    mode: "build",
    yaw: 0,
    pitch: 0,
    speed: 2.2,
    runSpeed: 4.2,
    eyeHeight: 1.56,
    radius: 0.28,
    thirdDistance: 3.2,
    thirdHeight: 1.55,
    locked: false,
    lastTime: performance.now()
  };

  let frame = 0;
  let disposed = false;

  function entries() {
    return getEntries?.() || [];
  }

  function active() {
    return state.mode === "first_person" || state.mode === "third_person";
  }

  function isLocked() {
    return document.pointerLockElement === renderer.domElement;
  }

  function requestLock() {
    if (!active()) return;
    try { renderer.domElement.requestPointerLock?.(); } catch {}
  }

  function unlock() {
    try {
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
    } catch {}
  }

  function onPointerLockChange() {
    state.locked = isLocked();
    if (active()) {
      setStatus?.(state.locked ? "Mouse travado · Esc libera" : "Clique na Room para travar o mouse");
    }
  }

  function onKeyDown(event) {
    keys.add(event.key.toLowerCase());
  }

  function onKeyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function onMouseMove(event) {
    if (!active() || !state.locked) return;
    const sensitivity = 0.0022;
    state.yaw -= event.movementX * sensitivity;
    state.pitch -= event.movementY * sensitivity;
    state.pitch = Math.max(-1.18, Math.min(1.18, state.pitch));
    onPlayerChanged?.("look");
  }

  function onCanvasClick() {
    if (active() && !state.locked) requestLock();
  }

  function onWindowBlur() {
    keys.clear();
    unlock();
  }

  function onVisibilityChange() {
    if (document.hidden) {
      keys.clear();
      unlock();
    }
  }

  function setMode(mode, { lock = false } = {}) {
    const clean = ["build", "first_person", "third_person"].includes(mode) ? mode : "build";
    if (clean === state.mode && clean !== "build") {
      if (lock) requestLock();
      return;
    }

    state.mode = clean;
    player.visible = clean === "third_person";

    if (clean === "build") {
      unlock();
      keys.clear();
      setStatus?.("Build Mode ativo");
    } else {
      const safe = findSafeSpawn(entries(), player.position, state.radius);
      player.position.copy(safe);
      if (clean === "first_person") setStatus?.("First Person ativo · clique na tela para travar o mouse");
      if (clean === "third_person") setStatus?.("Third Person ativo · clique na tela para travar o mouse");
      updateCamera();
      if (lock) setTimeout(requestLock, 80);
    }

    onModeChange?.(clean);
  }

  function resetPlayer() {
    player.position.copy(findSafeSpawn(entries(), new THREE.Vector3(0, 0, 2.6), state.radius));
    state.yaw = 0;
    state.pitch = 0;
    updateCamera();
    onPlayerChanged?.("reset");
    toast?.("Player resetado");
  }

  function setPlayerFromLayout(playerData) {
    const pos = playerData?.position || [0, 0, 2.6];
    player.position.set(Number(pos[0] || 0), Number(pos[1] || 0), Number(pos[2] || 2.6));
    player.position.copy(findSafeSpawn(entries(), player.position, state.radius));
    state.yaw = Number(playerData?.yaw || 0);
    state.pitch = Number(playerData?.pitch || 0);
    updateCamera();
  }

  function getForward() {
    return new THREE.Vector3(Math.sin(state.yaw), 0, -Math.cos(state.yaw)).normalize();
  }

  function getRight() {
    return new THREE.Vector3(Math.cos(state.yaw), 0, Math.sin(state.yaw)).normalize();
  }

  function updateCamera() {
    const forward = getForward();
    player.rotation.y = state.yaw;

    if (state.mode === "first_person") {
      camera.position.set(player.position.x, player.position.y + state.eyeHeight, player.position.z);
      camera.rotation.order = "YXZ";
      camera.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;
      camera.rotation.z = 0;
      return;
    }

    if (state.mode === "third_person") {
      const target = player.position.clone().add(new THREE.Vector3(0, 1.15, 0));
      const behind = forward.clone().multiplyScalar(-state.thirdDistance);
      const height = state.thirdHeight + Math.max(-0.7, Math.min(0.8, state.pitch * 1.4));
      const desired = target.clone().add(behind).add(new THREE.Vector3(0, height, 0));
      const safeCamera = resolveThirdPersonCamera({ THREERef: THREE, target, desired, entries: entries() });
      camera.position.copy(safeCamera);
      camera.lookAt(target);
    }
  }

  function update() {
    if (disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - state.lastTime) / 1000);
    state.lastTime = now;

    if (active()) {
      const speed = keys.has("shift") ? state.runSpeed : state.speed;
      const forward = getForward();
      const right = getRight();
      const dir = new THREE.Vector3();

      if (keys.has("w")) dir.add(forward);
      if (keys.has("s")) dir.sub(forward);
      if (keys.has("d")) dir.add(right);
      if (keys.has("a")) dir.sub(right);

      if (dir.lengthSq() > 0) {
        dir.normalize().multiplyScalar(speed * dt);
        const next = moveWithSliding({
          current: player.position,
          delta: dir,
          entries: entries(),
          radius: state.radius
        });
        if (!next.equals(player.position)) {
          player.position.copy(next);
          onPlayerChanged?.("move");
        }
      }

      updateCamera();
    }

    frame = requestAnimationFrame(update);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("blur", onWindowBlur);
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  renderer.domElement.addEventListener("click", onCanvasClick);
  frame = requestAnimationFrame(update);

  function dispose() {
    disposed = true;
    cancelAnimationFrame(frame);
    unlock();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("blur", onWindowBlur);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    renderer.domElement.removeEventListener("click", onCanvasClick);
    player.traverse((child) => {
      if (child.isMesh) {
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      }
    });
    player.removeFromParent();
  }

  return {
    player,
    state,
    setMode,
    resetPlayer,
    setPlayerFromLayout,
    requestLock,
    unlock,
    dispose
  };
}
