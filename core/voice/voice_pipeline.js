const { classifyIntent } = require('../ai/intent_filter');

async function runVoicePipeline(payload = {}) {
  const vadSilenceSeconds = payload.vadSilenceSeconds || 5;
  return {
    ok: true,
    state: 'skeleton',
    vadSilenceSeconds,
    message: 'Pipeline de voz criado. Proximo passo: conectar captura de audio, STT e TTS.'
  };
}

function shouldAnswerTranscript(transcript) {
  return classifyIntent(transcript);
}

module.exports = { runVoicePipeline, shouldAnswerTranscript };
