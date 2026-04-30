"use strict";

/**
 * Noelle V19.8.3a - Resize Guard da Aba Avatar
 *
 * Objetivo:
 * - manter o avatar como foco visual
 * - fazer botoes e opcoes acompanharem a tela quando a janela diminui
 * - garantir scroll seguro
 * - adicionar Preview LoadFile sem depender de fetch
 *
 * Marcador exigido pelo diagnostico:
 * controle por resize
 */

(() => {
  if (window.__NOELLE_AVATAR_RESIZE_GUARD_V19_8_3A__) return;
  window.__NOELLE_AVATAR_RESIZE_GUARD_V19_8_3A__ = true;

  const MODES = ["compacta", "normal", "grande", "foco"];

  function q(sel, root = document) {
    return root.querySelector(sel);
  }

  function qa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function isAvatarPage() {
    const active = q(".nav-item.active, [data-page].active, .active");
    const activeText = active ? String(active.textContent || "").toLowerCase() : "";
    const title = q("h1, h2, header h1, header h2");
    const titleText = title ? String(title.textContent || "").toLowerCase() : "";
    return activeText.includes("avatar") || titleText.includes("avatar") || !!q("[data-noelle-avatar-tab='v19.8.2'], .noelle-avatar-tab-v19-8-2, #noelle-avatar-tab-v19-8-2");
  }

  function root() {
    return q("[data-noelle-avatar-tab='v19.8.2'], .noelle-avatar-tab-v19-8-2, #noelle-avatar-tab-v19-8-2") ||
           q(".noelle-avatar-v19-8-2") ||
           q("main") ||
           document.body;
  }

  function removeLegacyFloatingButtons() {
    if (!isAvatarPage()) return;
    qa("button, a, [role='button']").forEach((el) => {
      const text = String(el.textContent || "").trim().toLowerCase();
      if (text === "avatar lab" || text === "room v19") {
        el.style.display = "none";
        el.setAttribute("aria-hidden", "true");
        el.dataset.noelleHiddenLegacy = "true";
      }
    });
  }

  function ensureResponsiveShell() {
    const r = root();
    if (!r) return;

    r.classList.add("noelle-avatar-responsive-v19-8-3a");
    r.style.minWidth = "0";
    r.style.minHeight = "0";

    const containers = [
      r,
      q(".content"),
      q(".page"),
      q("main"),
      q(".noelle-avatar-layout", r),
      q(".noelle-avatar-preview-shell", r),
      q(".noelle-avatar-options", r)
    ].filter(Boolean);

    for (const el of containers) {
      el.style.minWidth = "0";
      if (!el.style.overflow) el.style.overflow = "auto";
    }
  }

  function applyAvatarResponsiveMode() {
    // controle por resize V19.8.3a
    const r = root();
    if (!r) return;

    const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const short = height < 720;
    const narrow = width < 1180;
    const veryNarrow = width < 860;

    r.classList.remove(
      "noelle-avatar-auto-compacta",
      "noelle-avatar-auto-normal",
      "noelle-avatar-auto-grande",
      "noelle-avatar-auto-foco"
    );

    if (veryNarrow || short) r.classList.add("noelle-avatar-auto-compacta");
    else if (narrow) r.classList.add("noelle-avatar-auto-normal");
    else r.classList.add("noelle-avatar-auto-grande");

    document.documentElement.style.setProperty("--noelle-avatar-window-w", String(width));
    document.documentElement.style.setProperty("--noelle-avatar-window-h", String(height));

    removeLegacyFloatingButtons();
    ensureResponsiveShell();
  }

  function setManualMode(mode) {
    const r = root();
    if (!r) return;
    const safe = MODES.includes(mode) ? mode : "normal";
    for (const m of MODES) r.classList.remove("noelle-avatar-mode-" + m);
    r.classList.add("noelle-avatar-mode-" + safe);
    try { localStorage.setItem("noelle.avatar.resolutionMode", safe); } catch {}
    applyAvatarResponsiveMode();
  }

  function currentAvatarFromUi() {
    const select = q("select[data-avatar-select], #noelle-avatar-select, .noelle-avatar-options select");
    if (select && select.value) return select.value;

    const active = q("[data-avatar-path][aria-current='true'], [data-avatar-path].active");
    if (active) return active.getAttribute("data-avatar-path") || "";

    const label = q("[data-current-avatar-path], .noelle-avatar-current-path");
    if (label) return String(label.textContent || "").trim();

    return "";
  }

  async function openPreviewLoadFile() {
    const payload = { avatar: currentAvatarFromUi() };
    const api = window.noelleAPI || window.desktopWidget || {};
    if (typeof api.openAvatarPreviewLoadFile === "function") {
      return api.openAvatarPreviewLoadFile(payload);
    }
    if (typeof api.openAvatarPreview === "function") {
      return api.openAvatarPreview(payload);
    }
    console.warn("[Noelle] API openAvatarPreviewLoadFile indisponivel no preload.");
    alert("API openAvatarPreviewLoadFile indisponivel. Rode o diagnostico V19.8.3a.");
  }

  function ensureResolutionToolbar() {
    if (!isAvatarPage()) return;
    const r = root();
    if (!r || q("[data-noelle-avatar-resize-toolbar='v19.8.3a']", r)) return;

    const toolbar = document.createElement("div");
    toolbar.dataset.noelleAvatarResizeToolbar = "v19.8.3a";
    toolbar.className = "noelle-avatar-resize-toolbar-v19-8-3a";
    toolbar.innerHTML = [
      "<strong>Resolução</strong>",
      "<button type='button' data-avatar-mode='compacta'>Compacta</button>",
      "<button type='button' data-avatar-mode='normal'>Normal</button>",
      "<button type='button' data-avatar-mode='grande'>Grande</button>",
      "<button type='button' data-avatar-mode='foco'>Foco avatar</button>",
      "<button type='button' data-avatar-preview-loadfile='1'>Preview LoadFile</button>"
    ].join("");

    toolbar.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const mode = target.getAttribute("data-avatar-mode");
      if (mode) setManualMode(mode);
      if (target.hasAttribute("data-avatar-preview-loadfile")) openPreviewLoadFile();
    });

    const title = q("h1, h2", r);
    if (title && title.parentElement) title.parentElement.appendChild(toolbar);
    else r.insertBefore(toolbar, r.firstChild);
  }

  function install() {
    ensureResolutionToolbar();

    let saved = "normal";
    try { saved = localStorage.getItem("noelle.avatar.resolutionMode") || "normal"; } catch {}
    setManualMode(saved);
    applyAvatarResponsiveMode();
  }

  const debounced = (() => {
    let timer = 0;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        applyAvatarResponsiveMode();
        ensureResolutionToolbar();
      }, 80);
    };
  })();

  window.addEventListener("resize", debounced, { passive: true });
  window.addEventListener("orientationchange", debounced, { passive: true });
  document.addEventListener("DOMContentLoaded", install);

  const mo = new MutationObserver(() => {
    if (isAvatarPage()) debounced();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
