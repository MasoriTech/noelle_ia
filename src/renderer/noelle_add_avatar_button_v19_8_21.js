/*
  Noelle/Yoru V19.8.21 — Adicionar Avatar na aba Avatar
  - Não usa observador de DOM.
  - Não remove elementos.
  - Só injeta o botão uma vez perto de "Recarregar lista" ou "Salvar avatar padrão".
*/
(() => {
  "use strict";

  const VERSION = "19.8.21-adicionar-avatar-botao-2026";
  const ROW_ID = "noelle-add-avatar-row-v19821";
  const STATUS_ID = "noelle-add-avatar-status-v19821";

  function textOf(el) {
    return String(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.("aria-label") || "").trim().toLowerCase();
  }

  function isAvatarPage() {
    const t = textOf(document.body);
    return (
      t.includes("arraste para girar") ||
      t.includes("use scroll para zoom") ||
      t.includes("avatar carregado") ||
      (t.includes("room / quarto") && t.includes("widget mode") && t.includes("preview / teste"))
    );
  }

  function setStatus(message, isError = false) {
    const status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = message;
    status.classList.add("is-visible");
    status.classList.toggle("is-error", Boolean(isError));
  }

  function findButtonByText(words) {
    const needle = words.map((w) => String(w).toLowerCase());
    return Array.from(document.querySelectorAll("button, [role='button'], a"))
      .find((el) => {
        const t = textOf(el);
        return needle.some((w) => t.includes(w));
      }) || null;
  }

  function findActionContainer() {
    const reload = findButtonByText(["recarregar lista", "recarregar"]);
    if (reload) return reload.parentElement || reload.closest("section, article, aside, div");

    const save = findButtonByText(["salvar avatar padrão", "salvar avatar"]);
    if (save) return save.parentElement || save.closest("section, article, aside, div");

    const side = Array.from(document.querySelectorAll("section, aside, article, div"))
      .filter((el) => {
        const t = textOf(el);
        return t.includes("room / quarto") && t.includes("widget mode") && t.includes("preview / teste");
      })
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height))[0];

    return side || null;
  }

  function clickReloadList() {
    const reload = findButtonByText(["recarregar lista", "recarregar"]);
    if (reload) {
      reload.click();
      return true;
    }
    return false;
  }

  async function addAvatar() {
    const api =
      window.noelleAvatarImportV19821 ||
      window.noelleAvatarImportV19820 ||
      window.noelleAPI ||
      null;

    if (!api || typeof api.importAvatar !== "function") {
      setStatus("Importação indisponível: API do preload/main não foi encontrada.", true);
      return;
    }

    setStatus("Abrindo seletor de avatar...");

    try {
      const result = await api.importAvatar();

      if (!result || result.canceled) {
        setStatus("Importação cancelada.");
        return;
      }

      if (!result.ok) {
        setStatus(result.error || "Falha ao adicionar avatar.", true);
        return;
      }

      const label = result.name || result.path || "avatar";
      setStatus(`Avatar adicionado: ${label}. Atualizando lista...`);

      setTimeout(() => {
        const reloaded = clickReloadList();
        setStatus(reloaded ? `Avatar adicionado: ${label}. Lista recarregada.` : `Avatar adicionado: ${label}. Use Recarregar lista.`);
        window.dispatchEvent(new CustomEvent("noelle-avatar-added-v19821", { detail: result }));
      }, 180);
    } catch (err) {
      setStatus(`Falha ao adicionar avatar: ${err && err.message ? err.message : err}`, true);
    }
  }

  function ensureButton() {
    if (!isAvatarPage()) return false;
    if (document.getElementById(ROW_ID)) return true;

    const container = findActionContainer();
    if (!container) return false;

    const row = document.createElement("div");
    row.id = ROW_ID;
    row.className = "noelle-add-avatar-row-v19821";
    row.innerHTML = `
      <button type="button" class="noelle-add-avatar-button-v19821">Adicionar avatar</button>
      <div id="${STATUS_ID}" class="noelle-add-avatar-status-v19821"></div>
    `;

    row.querySelector(".noelle-add-avatar-button-v19821")?.addEventListener("click", addAvatar);

    const reload = findButtonByText(["recarregar lista", "recarregar"]);
    if (reload && reload.parentElement && reload.parentElement.parentElement === container) {
      container.insertBefore(row, reload.parentElement);
    } else if (reload && reload.parentElement === container) {
      container.insertBefore(row, reload);
    } else {
      container.appendChild(row);
    }

    return true;
  }

  function boot() {
    ensureButton();
    [80, 220, 500, 1000, 1800, 3000].forEach((ms) => setTimeout(ensureButton, ms));
    window.addEventListener("resize", ensureButton, { passive: true });
    document.addEventListener("click", () => setTimeout(ensureButton, 80), true);

    window.noelleAddAvatarButtonV19821 = Object.freeze({
      version: VERSION,
      ensureButton,
      addAvatar
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
