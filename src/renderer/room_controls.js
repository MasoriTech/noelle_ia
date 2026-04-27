export function createRoomControls({ manager, renderLayoutList, updateInspector, saveLayout, undo, redo, toast, grid }) {
  let gridEnabled = true;
  let collisionEnabled = true;

  async function handleKey(event) {
    const tag = String(event.target?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;

    const key = event.key.toLowerCase();
    const fine = event.shiftKey;

    if (event.ctrlKey && key === "s") {
      event.preventDefault();
      await saveLayout();
      return;
    }
    if (event.ctrlKey && key === "z") {
      event.preventDefault();
      await undo();
      return;
    }
    if (event.ctrlKey && (key === "y" || (event.shiftKey && key === "z"))) {
      event.preventDefault();
      await redo();
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
    if (map[key]) {
      const [x, y, z] = map[key];
      manager.moveSelected(x, y, z, fine);
      updateInspector();
      return;
    }

    if (event.key === "ArrowLeft") { manager.rotateSelected(15, fine); updateInspector(); }
    if (event.key === "ArrowRight") { manager.rotateSelected(-15, fine); updateInspector(); }
    if (event.key === "+" || event.key === "=") { manager.scaleSelected(0.05); updateInspector(); }
    if (event.key === "-" || event.key === "_") { manager.scaleSelected(-0.05); updateInspector(); }

    if (key === "g") toggleGrid();
    if (key === "c") toggleCollision();
    if (key === "f") updateInspector(true);
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
