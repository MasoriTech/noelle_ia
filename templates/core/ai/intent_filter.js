'use strict';

function shouldRespond(text) {
  const t = String(text || '').trim();
  if (!t || t.length <= 2) return { respond: false, reason: 'curto/vazio' };
  return { respond: true, reason: 'texto manual' };
}

module.exports = { shouldRespond };
