async function speakText(text, _config = {}) {
  if (!text) return { ok: false, error: 'Texto vazio para TTS.' };
  return { ok: true, spoken: false, fallback: 'TTS skeleton: texto deve aparecer na UI se voz falhar.' };
}

module.exports = { speakText };
