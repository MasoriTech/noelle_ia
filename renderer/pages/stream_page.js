export function renderStreamPage(root, ctx) {
  root.innerHTML = `
    <h1>Stream</h1>
    <p>Aba Stream deve voltar depois que Chat e Voz IA estiverem estáveis.</p>
    <div class="card"><button id="stream-status">Ver status</button><pre id="stream-log" class="log-box"></pre></div>
  `;
  const log = root.querySelector('#stream-log');
  root.querySelector('#stream-status').addEventListener('click', async () => {
    const res = await window.noelle.stream.status();
    log.textContent = JSON.stringify(res, null, 2);
    ctx.setStatus('Stream consultada');
  });
}
