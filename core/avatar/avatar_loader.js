function validateAvatarPath(file) {
  if (!file) return { ok: false, error: 'Avatar nao informado.' };
  if (!/\.(glb|gltf|vrm)$/i.test(file)) return { ok: false, error: 'Formato de avatar invalido.' };
  return { ok: true, file };
}

module.exports = { validateAvatarPath };
