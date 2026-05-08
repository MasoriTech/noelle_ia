export function renderSettingsPage(root, ctx) {
  root.innerHTML = `
    <h1>Configurações</h1>
    <p>Configuração separada por app, voz, modelos e caminhos.</p>
    <div class="card"><button id="load-config">Ler app_config</button><pre id="config-log" class="log-box"></pre></div>
  `;
  const log = root.querySelector('#config-log');
  root.querySelector('#load-config').addEventListener('click', async () => {
    const res = await window.noelle.config.read('app_config.json');
    log.textContent = JSON.stringify(res, null, 2);
    ctx.setStatus('Config lida');
  });
}
