'use strict';

function intentFilter(text) {
  const t = String(text || '').trim();
  if (!t) return { action: 'ignore', reason: 'Mensagem vazia.' };
  if (t.length <= 2) return { action: 'ignore', reason: 'Mensagem curta demais.' };
  return { action: 'chat' };
}

function buildMessages({ text, history = [] }) {
  const system = [
    'Voce e a Yoru/Noelle, uma assistente local do app Noelle.',
    'Responda em portugues do Brasil.',
    'Seja direta, util e amigavel.',
    'Nao finja que executou comandos do computador; quando precisar, diga qual acao o app deveria chamar.',
    'Esta e a base v20 de chat texto; voz, avatar e stream entram nas proximas fases.'
  ].join(' ');

  const messages = [{ role: 'system', content: system }];
  for (const item of history) {
    if (item.user) messages.push({ role: 'user', content: String(item.user) });
    if (item.assistant) messages.push({ role: 'assistant', content: String(item.assistant) });
  }
  messages.push({ role: 'user', content: String(text) });
  return messages;
}

module.exports = { intentFilter, buildMessages };
