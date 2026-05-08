export function renderAvatarPage(root, ctx) {
  root.innerHTML = `
    <h1>Avatar</h1>
    <p>Estados: idle, listening, thinking, speaking, error.</p>
    <div class="card button-row">
      <button data-state="idle">Idle</button>
      <button data-state="listening">Escutando</button>
      <button data-state="thinking">Pensando</button>
      <button data-state="speaking">Falando</button>
      <button data-state="error">Erro</button>
    </div>
  `;
  for (const btn of root.querySelectorAll('[data-state]')) {
    btn.addEventListener('click', async () => {
      await window.noelle.avatar.setState(btn.dataset.state);
      ctx.setStatus(`Avatar: ${btn.dataset.state}`);
    });
  }
}
