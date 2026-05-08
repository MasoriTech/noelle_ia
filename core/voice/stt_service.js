async function transcribeAudio(_audioPath, config = {}) {
  if (!config.command && !process.env.NOELLE_STT_CMD) {
    return { ok: false, text: '', error: 'STT backend nao configurado. Configure NOELLE_STT_CMD.' };
  }
  return { ok: false, text: '', error: 'STT ainda nao conectado neste skeleton.' };
}

module.exports = { transcribeAudio };
