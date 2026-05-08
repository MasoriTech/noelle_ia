function classifyIntent(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return { action: 'ignore', reason: 'empty' };
  if (t.startsWith('yoru') || t.startsWith('noelle')) return { action: 'answer', reason: 'called_by_name' };
  if (t.includes('?')) return { action: 'answer', reason: 'question' };
  if (t.includes('guarda isso') || t.includes('lembra disso')) return { action: 'memory', reason: 'memory_request' };
  if (t.includes('pesquisa') || t.includes('procura na internet')) return { action: 'web', reason: 'web_request' };
  if (t.length < 8) return { action: 'ignore', reason: 'too_short' };
  return { action: 'answer', reason: 'default_text' };
}

module.exports = { classifyIntent };
