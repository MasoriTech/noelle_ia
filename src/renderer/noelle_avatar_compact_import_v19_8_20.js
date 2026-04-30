/*
  Noelle/Yoru V19.8.20 — Avatar compact + import button
  Escopo: aba Avatar.
  Não remove DOM, não cria tela nova, não usa DOM observer.
*/
(() => {
  "use strict";

  const VERSION = "19.8.20-avatar-compact-import-2026";
  const STATUS_ID = "noelle-avatar-import-status-v19820";
  const ROW_ID = "noelle-avatar-import-row-v19820";

  function textOf(el) {
    return String(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.("aria-label") || "").toLowerCase();
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width > 60 && r.height > 40;
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

  function findCanvas() {
    return Array.from(document.querySelectorAll("canvas"))
      .filter(visible)
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      })[0] || null;
  }

  function ancestors(el, limit = 12) {
    const out = [];
    let cur = el;
    for (let i = 0; i < limit && cur && cur !== document.body; i++) {
      out.push(cur);
      cur = cur.parentElement;
    }
    return out;
  }

  function findSidePanel(canvas) {
    const canvasRect = canvas?.getBoundingClientRect?.();
    return Array.from(document.querySelectorAll("section, aside, article, div"))
      .filter(visible)
      .filter((el) => {
        const t = textOf(el);
        if (!(t.includes("room / quarto") || t.includes("widget mode") || t.includes("preview / teste") || t.includes("salvar avatar") || t.includes("recarregar lista"))) return false;
        const r = el.getBoundingClientRect();
        return !canvasRect || r.left > canvasRect.left + canvasRect.width * 0.42 || r.top > canvasRect.bottom * 0.35;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      })[0] || null;
  }

  function findActionsPanel(side) {
    if (!side) return null;

    const buttons = Array.from(side.querySelectorAll("button, [role='button'], a"))
      .filter((el) => /salvar avatar|recarregar lista|room|widget|preview/i.test(textOf(el)));

    if (!buttons.length) return side;

    const save = buttons.find((el) => textOf(el).includes("salvar avatar")) || buttons[buttons.length - 1];
    return save.closest("section, article, aside, div") || side;
  }

  function findPageRoot(canvas, side) {
    const candidate = ancestors(canvas, 14).find((el) => {
      const t = textOf(el);
      return t.includes("room / quarto") && t.includes("widget mode") && t.includes("preview / teste");
    });

    if (candidate) return candidate;

    if (side) {
      const sideSet = new Set(ancestors(side, 14));
      return ancestors(canvas, 14).find((el) => sideSet.has(el) && visible(el)) || null;
    }

    return ancestors(canvas, 8)[5] || ancestors(canvas, 8).at(-1) || null;
  }

  function findNav(canvas) {
    const canvasRect = canvas?.getBoundingClientRect?.();
    return Array.from(document.querySelectorAll("button, div, section"))
      .filter(visible)
      .filter((el) => {
        const t = textOf(el);
        const r = el.getBoundingClientRect();
        const looksNav = t.includes("←") || t.includes("→") || /\b[0-9]\s*\/\s*[0-9]\b/.test(t);
        return looksNav && (!canvasRect || r.top >= canvasRect.top + canvasRect.height * 0.55);
      })
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || null;
  }

  function setStatus(message, ok = true) {
    let status = document.getElementById(STATUS_ID);
    if (!status) return;
    status.textContent = message;
    status.classList.add("is-visible");
    status.style.borderColor = ok ? "rgba(126,255,180,.28)" : "rgba(255,80,80,.35)";
    status.style.color = ok ? "#adffc7" : "#ffb2b2";
  }

  function clickButtonByText(words) {
    const lowerWords = words.map((w) => w.toLowerCase());
    const btn = Array.from(document.querySelectorAll("button, [role='button'], a"))
      .find((el) => {
        const t = textOf(el);
        return lowerWords.some((w) => t.includes(w));
      });

    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  function getCurrentAvatarInfo() {
    const t = document.body.innerText || "";
    const pathMatch = t.match(/assets\/[^\s]+?\.(?:vrm|glb)/i);
    const nameMatch = t.match(/Avatar carregado:\s*([^\n\r]+)/i) || t.match(/\b(Noelle|Yoru|Arisa)\b/i);
    return {
      path: pathMatch ? pathMatch[0] : "",
      name: nameMatch ? nameMatch[1].trim() : ""
    };
  }

  async function importAvatar() {
    const api = window.noelleAvatarImportV19820 || window.noelleAPI || null;

    if (!api || typeof api.importAvatar !== "function") {
      setStatus("Importar avatar indisponível: preload/main ainda não expôs a API.", false);
      return;
    }

    setStatus("Abrindo seletor de arquivo...", true);

    try {
      const result = await api.importAvatar();
      if (!result || result.canceled) {
        setStatus("Importação cancelada.", true);
        return;
      }

      if (!result.ok) {
        setStatus(result.error || "Falha ao importar avatar.", false);
        return;
      }

      setStatus(`Avatar importado: ${result.name || result.path || "arquivo"}. Recarregando lista...`, true);

      setTimeout(() => {
        clickButtonByText(["recarregar lista", "recarregar", "reload"]);
        window.dispatchEvent(new CustomEvent("noelle-avatar-imported-v19820", { detail: result }));
      }, 120);
    } catch (err) {
      setStatus(`Falha ao importar avatar: ${err && err.message ? err.message : err}`, false);
    }
  }

  function activateAvatarHere() {
    const info = getCurrentAvatarInfo();

    try {
      if (info.path) {
        localStorage.setItem("noelle.avatar.selectedPath", info.path);
        localStorage.setItem("noelle.avatar.activePath", info.path);
      }
      if (info.name) {
        localStorage.setItem("noelle.avatar.selectedName", info.name);
        localStorage.setItem("noelle.avatar.activeName", info.name);
      }
    } catch (_) {}

    const clicked = clickButtonByText(["salvar avatar padrão", "salvar avatar", "usar avatar", "ativar avatar"]);

    window.dispatchEvent(new CustomEvent("noelle-avatar-activated-v19820", { detail: info }));

    setStatus(clicked
      ? `Avatar acionado${info.name ? `: ${info.name}` : ""}.`
      : `Avatar marcado como ativo${info.name ? `: ${info.name}` : ""}.`, true);
  }

  function ensureImportButtons(side) {
    const panel = findActionsPanel(side);
    if (!panel || document.getElementById(ROW_ID)) return;

    const row = document.createElement("div");
    row.id = ROW_ID;
    row.className = "noelle-avatar-import-row-v19820";
    row.innerHTML = `
      <button type="button" class="noelle-avatar-import-btn-v19820">Importar avatar</button>
      <button type="button" class="noelle-avatar-activate-btn-v19820">Acionar avatar</button>
    `;

    const status = document.createElement("div");
    status.id = STATUS_ID;
    status.className = "noelle-avatar-import-status-v19820";
    status.textContent = "";

    row.querySelector(".noelle-avatar-import-btn-v19820")?.addEventListener("click", importAvatar);
    row.querySelector(".noelle-avatar-activate-btn-v19820")?.addEventListener("click", activateAvatarHere);

    panel.appendChild(row);
    panel.appendChild(status);
  }

  function applyCompact() {
    const active = isAvatarPage();
    document.body.classList.toggle("noelle-avatar-compact-v19820", active);
    if (!active) return;

    const canvas = findCanvas();
    if (!canvas) return;

    const stage = canvas.parentElement;
    if (stage) stage.classList.add("noelle-avatar-stage-v19820");

    const previewCol = stage?.parentElement || null;
    if (previewCol) previewCol.classList.add("noelle-avatar-preview-col-v19820");

    const side = findSidePanel(canvas);
    if (side) side.classList.add("noelle-avatar-side-v19820");

    const page = findPageRoot(canvas, side);
    if (page) page.classList.add("noelle-avatar-page-v19820");

    const card = ancestors(canvas, 5).find(visible);
    if (card) card.classList.add("noelle-avatar-card-v19820");

    const nav = findNav(canvas);
    if (nav) nav.classList.add("noelle-avatar-nav-v19820");

    ensureImportButtons(side);
  }

  function boot() {
    applyCompact();
    [80, 180, 400, 900, 1600].forEach((ms) => setTimeout(applyCompact, ms));
    window.addEventListener("resize", applyCompact, { passive: true });
    document.addEventListener("click", () => setTimeout(applyCompact, 80), true);

    window.noelleAvatarCompactImportV19820 = Object.freeze({
      version: VERSION,
      applyCompact,
      importAvatar,
      activateAvatarHere
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
