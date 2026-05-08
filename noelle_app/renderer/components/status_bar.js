export function setStatus(text) {
  const el = document.querySelector('#status-bar');
  if (el) el.textContent = text;
}
