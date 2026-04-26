// src/launcher_bootstrap.js
var activeAvatarId = null;
function byId(id) {
  return document.getElementById(id);
}
function setStatus(text) {
  const el = byId("launcherStatus");
  if (el) el.textContent = text;
}
function bind(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener("click", handler);
}
function avatarIconFor(entry) {
  if (entry.id === "noelle-default") return "\u2726";
  if (entry.kind === "vrm") return "\u265B";
  if (entry.kind === "gltf") return "\u25C6";
  return "\u25C7";
}
function avatarKindLabel(entry) {
  if (entry.kind === "vrm") return "VRM";
  if (entry.kind === "gltf") return "GLB/GLTF";
  return "Modelo";
}
async function loadAvatarRoster() {
  const roster = byId("avatarRoster");
  if (!roster) return;
  let library;
  try {
    library = await window.desktopWidget?.getAvatarLibrary?.();
  } catch (err) {
    console.error(err);
    setStatus("Falha ao ler lista de avatares.");
    return;
  }
  const avatars = library?.avatars || [];
  const activeId = library?.activeId || "noelle-default";
  activeAvatarId = activeId;
  roster.innerHTML = "";
  avatars.forEach((entry) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "avatar-card";
    if (entry.id === activeId) card.classList.add("active");
    card.dataset.avatarId = entry.id;
    card.innerHTML = `
      <div class="avatar-card-visual">${avatarIconFor(entry)}</div>
      <div class="avatar-card-name">${entry.name || "Avatar"}</div>
      <div class="avatar-card-kind">${avatarKindLabel(entry)}</div>
    `;
    card.addEventListener("click", async () => {
      setStatus(`Selecionando ${entry.name || "avatar"}...`);
      const result = await window.desktopWidget?.selectAvatarLibrary?.(entry.id);
      if (result?.ok) {
        setStatus(`${entry.name || "Avatar"} selecionado.`);
        await loadAvatarRoster();
      } else {
        setStatus(result?.error || "Falha ao selecionar avatar.");
      }
    });
    roster.appendChild(card);
  });
  const add = document.createElement("button");
  add.className = "avatar-card add-card";
  add.type = "button";
  add.id = "importAvatarCardRuntime";
  add.innerHTML = `
    <div class="avatar-card-visual">\uFF0B</div>
    <div class="avatar-card-name">Adicionar</div>
    <div class="avatar-card-kind">VRM / GLB</div>
  `;
  add.addEventListener("click", importAvatar);
  roster.appendChild(add);
}
async function openAvatar() {
  setStatus("Abrindo avatar selecionado...");
  try {
    await window.desktopWidget?.launcherStart?.();
    setStatus("Avatar aberto.");
  } catch (err) {
    setStatus("Falha ao abrir avatar.");
    console.error(err);
  }
}
async function exportAvatar() {
  setStatus("Exportando avatar selecionado...");
  try {
    const result = await window.desktopWidget?.exportAvatarLibrary?.(activeAvatarId);
    if (result?.ok) {
      setStatus(result.folderPath ? `Live2D exportado: ${result.folderPath}` : `Avatar exportado: ${result.filePath}`);
      return;
    }
    if (result?.canceled) {
      setStatus("Exporta\xE7\xE3o cancelada.");
      return;
    }
    setStatus(result?.error || "Falha ao exportar avatar.");
  } catch (err) {
    setStatus("Falha ao exportar avatar.");
    console.error(err);
  }
}
async function importAvatar() {
  setStatus("Selecionando avatar...");
  try {
    const result = await window.desktopWidget?.launcherImportAvatar?.() || await window.desktopWidget?.importAvatarVrmNative?.();
    if (result?.ok) {
      const name = result.avatar?.name || "Avatar";
      setStatus(result.warning ? `${name} importado. ${result.warning}` : `${name} importado e selecionado.`);
      await loadAvatarRoster();
      return;
    }
    if (result?.canceled) {
      setStatus("Importa\xE7\xE3o cancelada.");
      return;
    }
    setStatus("Falha ao importar avatar.");
    console.error(result?.error);
  } catch (err) {
    setStatus("Falha ao importar avatar.");
    console.error(err);
  }
}
async function main() {
  bind("startBtn", openAvatar);
  bind("openAvatarBtn", openAvatar);
  bind("importAvatarBtn", importAvatar);
  bind("exportAvatarBtn", exportAvatar);
  bind("importAvatarCard", importAvatar);
  bind("settingsBtn", async () => {
    setStatus("Abrindo configura\xE7\xF5es...");
    try {
      await window.desktopWidget?.launcherOpenConfig?.();
      setStatus("Configura\xE7\xF5es abertas.");
    } catch (err) {
      setStatus("Falha ao abrir configura\xE7\xF5es.");
      console.error(err);
    }
  });
  bind("aboutBtn", async () => {
    try {
      await window.desktopWidget?.launcherOpenAbout?.();
    } catch (err) {
      console.error(err);
    }
  });
  await loadAvatarRoster();
}
main();
