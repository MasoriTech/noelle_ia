export function renderChatPage(root, ctx) {
  root.innerHTML = `
    <h1>Chat IA</h1>
    <p>Primeira fase: chat de texto com Ollama.</p>
    <div class="card">
      <textarea id="chat-input" placeholder="Escreva para a Yoru..."></textarea>
      <button id="chat-send">Enviar</button>
      <pre id="chat-output" class="log-box"></pre>
    </div>
  `;

  const input = root.querySelector('#chat-input');
  const output = root.querySelector('#chat-output');
  root.querySelector('#chat-send').addEventListener('click', async () => {
    const message = input.value.trim();
    if (!message) return;
    ctx.setStatus('Pensando...');
    output.textContent += `\nVoce: ${message}\n`;
    try {
      const res = await window.noelle.ai.chat(message);
      output.textContent += `Yoru: ${res.text || JSON.stringify(res)}\n`;
      ctx.setStatus('Pronta');
    } catch (e) {
      output.textContent += `Erro: ${e.message}\n`;
      ctx.setStatus('Erro no chat');
    }
  });
}
