export function renderVoicePage(root, ctx) {
  root.innerHTML = `
    <h1>Chat de Voz IA</h1>
    <p>Fluxo seguro: botão falar, STT, filtro, resposta e TTS com fallback.</p>
    <div class="card">
      <button id="voice-start">Falar com a Yoru</button>
      <button id="voice-stop">Parar</button>
      <pre id="voice-log" class="log-box"></pre>
    </div>
  `;

  const log = root.querySelector('#voice-log');
  root.querySelector('#voice-start').addEventListener('click', async () => {
    ctx.setStatus('Escutando...');
    log.textContent += '\n[Voz] iniciando pipeline...\n';
    try {
      const res = await window.noelle.voice.start({ vadSilenceSeconds: 5 });
      log.textContent += JSON.stringify(res, null, 2) + '\n';
      ctx.setStatus('Pronta');
    } catch (e) {
      log.textContent += `Erro: ${e.message}\n`;
      ctx.setStatus('Erro na voz');
    }
  });

  root.querySelector('#voice-stop').addEventListener('click', async () => {
    await window.noelle.voice.stop();
    ctx.setStatus('Voz parada');
  });
}
