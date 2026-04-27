export function createRoomControls({ manager, renderLayoutList, updateInspector, saveLayout, toast, grid }) {
  let gridEnabled = true;
  let collisionEnabled = true;

  function handleKey(event) {
    const tag = String(event.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;

    const fine = event.shiftKey;
    if (event.ctrlKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveLayout();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      manager.remove();
      renderLayoutList();
      updateInspector();
      return;
    }

    if (event.key === "1") { manager.setMode("translate"); toast("Modo mover"); return; }
    if (event.key === "2") { manager.setMode("rotate"); toast("Modo girar"); return; }
    if (event.key === "3") { manager.setMode("scale"); toast("Modo escalar"); return; }

    const map = { w: [0, 0, -1], s: [0, 0, 1], a: [-1, 0, 0], d: [1, 0, 0], q: [0, 1, 0], e: [0, -1, 0] };
    const lower = event.key.toLowerCase();
    if (map[lower]) {
      const [x, y, z] = map[lower];
      manager.moveSelected(x, y, z, fine);
      updateInspector();
      return;
    }

    if (event.key === "ArrowLeft") { manager.rotateSelected(15, fine); updateInspector(); }
    if (event.key === "ArrowRight") { manager.rotateSelected(-15, fine); updateInspector(); }
    if (event.key === "+" || event.key === "=") { manager.scaleSelected(0.05); updateInspector(); }
    if (event.key === "-" || event.key === "_") { manager.scaleSelected(-0.05); updateInspector(); }

    if (lower === "g") toggleGrid();
    if (lower === "c") toggleCollision();
    if (lower === "f") updateInspector(true);
  }

  function toggleGrid() {
    gridEnabled = !gridEnabled;
    if (grid) grid.visible = gridEnabled;
    toast(gridEnabled ? "Grid ligado" : "Grid desligado");
    return gridEnabled;
  }

  function toggleCollision() {
    collisionEnabled = !collisionEnabled;
    manager.setCollisionEnabled(collisionEnabled);
    toast(collisionEnabled ? "Validação de colisão ligada" : "Validação de colisão desligada");
    return collisionEnabled;
  }

  window.addEventListener("keydown", handleKey);

  return {
    destroy() { window.removeEventListener("keydown", handleKey); },
    toggleGrid,
    toggleCollision
  };
}
