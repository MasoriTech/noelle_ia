export function createRoomModeManager({
  sceneApi,
  manager,
  player,
  setModeBox,
  toast,
  updateInspector
}) {
  let currentMode = "build";

  function setActiveButton(mode) {
    const ids = {
      build: "btnModeBuild",
      first_person: "btnModeFirst",
      third_person: "btnModeThird"
    };
    for (const id of Object.values(ids)) document.getElementById(id)?.classList.remove("active", "primary");
    const btn = document.getElementById(ids[mode]);
    btn?.classList.add("active", "primary");
  }

  function setWalkHint(mode) {
    const hint = document.getElementById("walkHint");
    if (hint) hint.classList.toggle("show", mode !== "build");
  }

  function setMode(mode) {
    const clean = ["build", "first_person", "third_person"].includes(mode) ? mode : "build";
    currentMode = clean;
    setActiveButton(clean);
    setWalkHint(clean);

    if (clean === "build") {
      sceneApi.setBuildControlsEnabled?.(true);
      const selected = manager.getSelected?.();
      if (selected) manager.select(selected.uid);
      player.setMode("build");
      setModeBox?.("Build Mode ativo. Edição de móveis ligada.", "ok");
      toast?.("Build Mode");
      updateInspector?.();
      return;
    }

    sceneApi.setBuildControlsEnabled?.(false);
    player.setMode(clean, { lock: true });
    if (clean === "first_person") {
      setModeBox?.("First Person ativo. WASD anda, mouse olha, Shift corre, Esc libera mouse.", "warn");
      toast?.("First Person");
    } else {
      setModeBox?.("Third Person ativo. Player visível com câmera atrás.", "warn");
      toast?.("Third Person");
    }
    updateInspector?.();
  }

  return {
    get mode() { return currentMode; },
    setMode
  };
}
