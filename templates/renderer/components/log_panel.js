export function appendLog(el, message) {
  if (!el) return;
  el.textContent += `${new Date().toLocaleTimeString()} ${message}\n`;
  el.scrollTop = el.scrollHeight;
}
