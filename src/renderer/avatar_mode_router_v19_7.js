(() => {
  "use strict";

  const PATCH_ID = "NOELLE_AVATAR_MODE_ROUTER_V19_7_2026";
  const STORAGE_KEY = "noelle_avatar_mode_v19_7";
  const MODES = {
    room: {
      label: "Room / Quarto",
      subtitle: "Usa o avatar no quarto com cenário, objetos GLB e layout da Room.",
      icon: "▣",
    },
    widget: {
      label: "Widget Mode",
      subtitle: "Abre a personagem sem fundo, transparente e flutuante na tela.",
      icon: "♙",
    },
    preview: {
      label: "Preview / Teste",
      subtitle: "Laboratório seguro: só testa VRM, câmera, pose, expressão e VRMA sem afetar a Room.",
      icon: "◉",
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message) {
    const status = $("launcherStatus");
    if (status) status.textContent = message;
    console.info(`[${PATCH_ID}] ${message}`);
  }

  function selectedAvatarInfo() {
    const active = document.querySelector(".avatar-card.active");
    const name = active?.querySelector?.(".avatar-card-name")?.textContent?.trim() || "avatar selecionado";
    const kind = active?.querySelector?.(".avatar-card-kind")?.textContent?.trim() || "VRM";
    return { name, kind };
  }

  async function saveMode(mode) {
    const selected = selectedAvatarInfo();
    const payload = {
      mode,
      modeLabel: MODES[mode]?.label || mode,
      selectedAvatarName: selected.name,
      selectedAvatarKind: selected.kind,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn(`[${PATCH_ID}] localStorage indisponível:`, err);
    }
    try {
      if (window.noelleAPI?.saveState) {
        await window.noelleAPI.saveState({ avatar: payload });
      }
    } catch (err) {
      console.warn(`[${PATCH_ID}] saveState falhou sem bloquear UI:`, err);
    }
    return payload;
  }

  function markMode(mode) {
    document.querySelectorAll("[data-noelle-avatar-mode]").forEach((button) => {
      button.classList.toggle("active", button.dataset.noelleAvatarMode === mode);
    });
  }

  async function openRoom() {
    await saveMode("room");
    markMode("room");
    setStatus("Abrindo Room / Quarto com o avatar selecionado...");
    try {
      if (window.noelleRoom?.open) {
        await window.noelleRoom.open();
        return;
      }
      if (window.noelleAPI?.openRoom) {
        await window.noelleAPI.openRoom();
        return;
      }
    } catch (err) {
      console.warn(`[${PATCH_ID}] API da Room falhou, usando fallback window.open:`, err);
    }
    window.open("./room.html", "noelle-room-quarto", "width=1440,height=900");
  }

  async function openWidget() {
    await saveMode("widget");
    markMode("widget");
    setStatus("Abrindo Widget Mode: avatar sem fundo e flutuante...");
    try {
      if (window.noelleAPI?.openAvatar) {
        await window.noelleAPI.openAvatar();
        return;
      }
      if (window.desktopWidget?.openAvatar) {
        await window.desktopWidget.openAvatar();
        return;
      }
    } catch (err) {
      console.warn(`[${PATCH_ID}] API do Widget falhou, usando fallback window.open:`, err);
    }
    window.open("./avatar_view.html", "noelle-widget-mode", "width=420,height=680");
  }

  async function openPreview() {
    await saveMode("preview");
    markMode("preview");
    setStatus("Abrindo Preview / Teste do VRM. Este modo não aplica mudanças reais na Room.");
    try {
      if (window.NoelleAvatarLabV196?.open) {
        window.NoelleAvatarLabV196.open();
        return;
      }
    } catch (err) {
      console.warn(`[${PATCH_ID}] launcher do Preview falhou, usando window.open:`, err);
    }
    window.open("./avatar_lab_v19_6.html", "noelle-preview-teste-vrm", "width=1180,height=780");
  }

  function injectStyle() {
    if ($("noelle-avatar-mode-router-style")) return;
    const style = document.createElement("style");
    style.id = "noelle-avatar-mode-router-style";
    style.textContent = `
      .avatar-actions.noelle-v19-7-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .noelle-mode-panel {
        margin-top: 10px;
        padding: 12px;
        border-radius: 18px;
        border: 1px solid rgba(215,44,85,.35);
        background:
          radial-gradient(circle at top left, rgba(215,44,85,.16), transparent 44%),
          linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.025));
        box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
      }
      .noelle-mode-title {
        display:flex; align-items:center; gap:8px;
        font-size:13px; font-weight:900; color:transparent8f8; margin-bottom:9px;
      }
      .noelle-mode-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:8px; }
      .noelle-mode-btn {
        min-height: 84px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.13);
        background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.025));
        color: transparent8f8;
        cursor: pointer;
        padding: 9px 8px;
        display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:4px;
        text-align:left;
        transition: transform .15s ease, border-color .15s ease, box-shadow .15s ease;
        -webkit-app-region:no-drag; app-region:no-drag;
      }
      .noelle-mode-btn:hover { transform: translateY(-1px); border-color: rgba(255,255,255,.24); }
      .noelle-mode-btn.active {
        border-color: rgba(215,44,85,.74);
        box-shadow: 0 0 22px rgba(215,44,85,.22), inset 0 0 0 1px rgba(255,255,255,.04);
      }
      .noelle-mode-name { font-size:12px; font-weight:950; display:flex; align-items:center; gap:6px; }
      .noelle-mode-desc { font-size:10.5px; line-height:1.28; color: rgba(255,248,248,.72); }
      .noelle-mode-note { margin-top:8px; color:rgba(255,248,248,.70); font-size:11px; line-height:1.35; }
      @media (max-width: 640px), (max-height: 650px) {
        .noelle-mode-grid { grid-template-columns: 1fr; }
        .noelle-mode-btn { min-height: 58px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createButton(mode, handler) {
    const def = MODES[mode];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "noelle-mode-btn";
    button.dataset.noelleAvatarMode = mode;
    button.innerHTML = `<span class="noelle-mode-name"><span>${def.icon}</span>${def.label}</span><span class="noelle-mode-desc">${def.subtitle}</span>`;
    button.addEventListener("click", () => handler().catch((err) => {
      console.error(`[${PATCH_ID}] falha ao abrir modo ${mode}:`, err);
      setStatus(`Falha ao abrir ${def.label}: ${err?.message || err}`);
    }));
    return button;
  }

  function injectModePanel() {
    if ($("noelleAvatarModePanel")) return;
    const avatarSelect = document.querySelector(".avatar-select") || $("avatarRoster")?.parentElement;
    if (!avatarSelect) return;

    const oldActions = avatarSelect.querySelector(".avatar-actions");
    if (oldActions) oldActions.classList.add("noelle-v19-7-actions");

    const oldOpen = $("openAvatarBtn");
    if (oldOpen) {
      oldOpen.textContent = "Widget Mode";
      oldOpen.title = "Abre o avatar selecionado como widget sem fundo";
      oldOpen.addEventListener("click", () => openWidget().catch(console.error));
    }

    const panel = document.createElement("section");
    panel.id = "noelleAvatarModePanel";
    panel.className = "noelle-mode-panel";
    const grid = document.createElement("div");
    grid.className = "noelle-mode-grid";
    grid.append(
      createButton("room", openRoom),
      createButton("widget", openWidget),
      createButton("preview", openPreview),
    );
    panel.innerHTML = `<div class="noelle-mode-title"><span>◇</span><span>Modo de uso do avatar</span></div>`;
    panel.appendChild(grid);
    const note = document.createElement("div");
    note.className = "noelle-mode-note";
    note.textContent = "Regra: Avatar seleciona e testa. Room aplica quarto/objetos. Widget mostra sem fundo. Preview não manda emotions/expressions para a Room.";
    panel.appendChild(note);

    if (oldActions?.parentElement === avatarSelect) {
      oldActions.insertAdjacentElement("afterend", panel);
    } else {
      avatarSelect.appendChild(panel);
    }

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.mode && MODES[saved.mode]) markMode(saved.mode);
    } catch {}
  }

  function boot() {
    injectStyle();
    injectModePanel();
    setTimeout(injectModePanel, 500);
    setTimeout(injectModePanel, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

  window.NoelleAvatarModesV197 = { openRoom, openWidget, openPreview, saveMode };
})();
