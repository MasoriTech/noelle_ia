function createVadConfig(seconds = 5) {
  return { silenceSeconds: seconds, mode: 'manual_button_first' };
}

module.exports = { createVadConfig };
