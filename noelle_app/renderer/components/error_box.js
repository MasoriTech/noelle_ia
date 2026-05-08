export function showError(root, message) {
  const box = document.createElement('div');
  box.className = 'error-box';
  box.textContent = message;
  root.prepend(box);
}
