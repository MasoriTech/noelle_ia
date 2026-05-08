function mouthValueFromVolume(volume) {
  const n = Number(volume) || 0;
  return Math.max(0, Math.min(1, n));
}

module.exports = { mouthValueFromVolume };
