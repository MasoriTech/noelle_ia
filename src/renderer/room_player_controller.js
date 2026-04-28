import * as THREE from "three";
import { findSafeSpawn, moveWithSliding, resolveThirdPersonCamera } from "./room_walk_collision.js";
import { createRoomPlayerAvatar } from "./room_player_avatar.js";

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
  player.name = "room-player-yuru-pov";
  player.position.set(0, 0, 2.6);

  const avatar = createRoomPlayerAvatar({ toast });
  player.add(avatar.root);

  scene.add(player);
  player.visible = false;

  avatar.load().catch((err) => {
    console.warn("[Noelle Room] Player avatar load failed:", err);
  });

  const keys = new Set();
  const state = {
    mode: "build",
    yaw: 0,
    pitch: 0,
    speed: 2.2,
    runSpeed: 4.2,
    radius: 0.28,
    thirdDistance: 3.15,
    thirdHeight: 1.30,
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

  function rememberKey(event, pressed) {
    const key = String(event.key || "").toLowerCase();
    const code = String(event.code || "").toLowerCase();
    if (pressed) {
      if (key) keys.add(key);
      if (code) keys.add(code);
    } else {
      if (key) keys.delete(key);
      if (code) keys.delete(code);
    }
  }

  function hasMoveKey(letter) {
    return keys.has(letter) || keys.has(`key${letter}`);
  }

  function hasShift() {
    return keys.has("shift") || keys.has("shiftleft") || keys.has("shiftright");
  }

  function onPointerLockChange() {
    state.locked = isLocked();
    if (active()) {
      setStatus?.(state.locked ? "Yoru POV ativo · Esc libera o mouse" : "Clique na Room para entrar na visão da Yoru");
    }
  }

  function onKeyDown(event) {
    rememberKey(event, true);
  }

  function onKeyUp(event) {
    rememberKey(event, false);
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
    avatar.setMode(clean);

    if (clean === "build") {
      unlock();
      keys.clear();
      setStatus?.("Build Mode ativo");
    } else {
      const safe = findSafeSpawn(entries(), player.position, state.radius);
      player.position.copy(safe);

      if (clean === "first_person") {
        setStatus?.("First Person/Yoru POV · clique na Room para entrar na visão dela");
      }
      if (clean === "third_person") {
        setStatus?.("Third Person · Yoru visível com câmera atrás");
      }

      updateCamera();
      if (lock) requestLock();
    }

    onModeChange?.(clean);
  }

  function resetPlayer() {
    player.position.copy(findSafeSpawn(entries(), new THREE.Vector3(0, 0, 2.6), state.radius));
    state.yaw = 0;
    state.pitch = 0;
    updateCamera();
    onPlayerChanged?.("reset");
    toast?.("Player/Yoru resetado");
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
      const eyeHeight = avatar.getEyeHeight();
      camera.position.set(player.position.x, player.position.y + eyeHeight, player.position.z);
      camera.rotation.order = "YXZ";
      camera.rotation.y = state.yaw;
      camera.rotation.x = state.pitch;
      camera.rotation.z = 0;
      return;
    }

    if (state.mode === "third_person") {
      const targetHeight = Math.max(1.05, avatar.getTargetHeight() * 0.72);
      const target = player.position.clone().add(new THREE.Vector3(0, targetHeight, 0));
      const behind = forward.clone().multiplyScalar(-state.thirdDistance);
      const height = state.thirdHeight + Math.max(-0.65, Math.min(0.85, state.pitch * 1.35));
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
      const speed = hasShift() ? state.runSpeed : state.speed;
      const forward = getForward();
      const right = getRight();
      const dir = new THREE.Vector3();

      if (hasMoveKey("w")) dir.add(forward);
      if (hasMoveKey("s")) dir.sub(forward);
      if (hasMoveKey("d")) dir.add(right);
      if (hasMoveKey("a")) dir.sub(right);

      const moving = dir.lengthSq() > 0;
      if (moving) {
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

      avatar.update(dt, moving, state.mode);
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
    avatar.dispose();
    player.removeFromParent();
  }

  return {
    player,
    state,
    avatar,
    setMode,
    resetPlayer,
    setPlayerFromLayout,
    requestLock,
    unlock,
    dispose
  };
}
