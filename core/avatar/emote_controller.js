function emoteForState(state) {
  const map = {
    idle: 'idle',
    listening: 'attentive',
    transcribing: 'thinking_light',
    thinking: 'thinking',
    speaking: 'talking',
    error: 'alert'
  };
  return map[state] || 'idle';
}

module.exports = { emoteForState };
