import { AVATAR_CONFIG, CAMERA_PRESETS, loadAvatarTuning } from "./config.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function setBoneEuler(vrm, boneName, x = 0, y = 0, z = 0) {
  try {
    const bone = vrm?.humanoid?.getNormalizedBoneNode?.(boneName);
    if (bone) bone.rotation.set(x, y, z);
  } catch {}
}

export function getEffectiveAvatarTuning() {
  return loadAvatarTuning();
}

export function applyAvatarAnchor(vrm) {
  if (!vrm) return;
  const tuning = getEffectiveAvatarTuning();
  vrm.scene.position.set(
    tuning.spawnX,
    tuning.spawnY,
    tuning.spawnZ
  );
  vrm.scene.rotation.set(0, 0, 0);
}

export function applyRelaxedPose(vrm) {
  setBoneEuler(vrm, "neck", 0.02, 0.0, 0.0);
  setBoneEuler(vrm, "chest", 0.01, 0.0, 0.0);
  setBoneEuler(vrm, "spine", -0.005, 0.0, 0.0);
  setBoneEuler(vrm, "leftUpperArm", 0.12, 0.0, -0.92);
  setBoneEuler(vrm, "rightUpperArm", 0.12, 0.0, 0.92);
  setBoneEuler(vrm, "leftLowerArm", -0.18, 0.0, -0.12);
  setBoneEuler(vrm, "rightLowerArm", -0.18, 0.0, 0.12);
  setBoneEuler(vrm, "leftHand", 0.0, 0.0, 0.06);
  setBoneEuler(vrm, "rightHand", 0.0, 0.0, -0.06);
}

export function applyCameraPreset(camera, controls, state, presetName) {
  const preset = CAMERA_PRESETS[presetName];
  if (!preset) return;

  const tuning = getEffectiveAvatarTuning();

  camera.position.set(
    (preset.x ?? 0) + tuning.frameOffsetX,
    preset.y,
    preset.z
  );

  state.scale = preset.scale;
  state.preset = presetName;

  const targetX = (preset.targetX ?? 0) + tuning.frameOffsetX;
  const targetY = (preset.targetY ?? 0.8) + tuning.frameOffsetY;

  if (controls) {
    controls.target.set(targetX, targetY, 0);
    controls.update();
  } else {
    camera.lookAt(targetX, targetY, 0);
  }
}

export function applyScale(currentVRM, scale) {
  if (currentVRM) currentVRM.scene.scale.setScalar(scale);
}

export function updateIdle(vrm, timeSeconds, motionPlaying) {
  if (!vrm || motionPlaying) return;
  const tuning = getEffectiveAvatarTuning();
  vrm.scene.position.y = tuning.spawnY + Math.sin(timeSeconds * 1.4) * AVATAR_CONFIG.idleFloatAmount;
  vrm.scene.position.x = tuning.spawnX;
  vrm.scene.position.z = tuning.spawnZ;
  vrm.scene.rotation.z = Math.sin(timeSeconds * 0.7) * 0.006;
  const neck = vrm?.humanoid?.getNormalizedBoneNode?.("neck");
  if (neck) {
    neck.rotation.x = 0.02 + Math.sin(timeSeconds * 1.6) * 0.01;
    neck.rotation.y = Math.sin(timeSeconds * 0.8) * 0.03;
  }
}
