(() => {
  "use strict";

  const SCRIPT_ID = "noelle-v19-7-6-avatar-clean-tab-script";
  const STYLE_ID = "noelle-v19-7-6-avatar-clean-tab-style";
  const OVERLAY_ID = "noelle-v19-7-6-avatar-clean-overlay";
  const SOURCE = "noelle-avatar-carousel-v19-7-6";

  if (window.__NOELLE_AVATAR_CLEAN_TAB_V1976__) return;
  window.__NOELLE_AVATAR_CLEAN_TAB_V1976__ = true;

  function textOf(el) {
    return String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        left: var(--noelle-avatar-clean-left, 330px);
        top: var(--noelle-avatar-clean-top, 38px);
        right: 0;
        bottom: 0;
        z-index: 2147481000;
        border-left: 1px solid rgba(255,255,255,.08);
        background: #080712;
        display: none;
      }
      #${OVERLAY_ID}[data-open="1"] { display: block; }
      #${OVERLAY_ID} iframe {
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        background: transparent;
      }
      .noelle-v1976-hidden-legacy-float {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      [data-noelle-v19-5-avatar-panel],
      [data-noelle-v19-4-avatar-panel],
      [data-noelle-v19-4-1-avatar-panel] {
        display: none !important;
      }
      @media (max-width: 900px) {
        #${OVERLAY_ID} { left: 0; top: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  function detectSidebarRight() {
    const candidates = [];
    const selectors = ["aside", "nav", "[class*='sidebar']", "[class*='side']", "[class*='menu']"];
    for (const selector of selectors) {
      for (const el of Array.from(document.querySelectorAll(selector))) {
        const text = textOf(el);
        if (/Principal/i.test(text) && /Avatar/i.test(text) && (/Chat/i.test(text) || /Config/i.test(text))) {
          candidates.push(el);
        }
      }
    }
    const byButton = Array.from(document.querySelectorAll("button, a, [role='button'], div, li")).find((el) => /^Avatar$/i.test(textOf(el)));
    if (byButton) {
      let cur = byButton.parentElement;
      for (let i = 0; cur && i < 5; i += 1, cur = cur.parentElement) {
        const t = textOf(cur);
        if (/Principal/i.test(t) && /Avatar/i.test(t)) candidates.push(cur);
      }
    }
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width >= 140 && rect.width <= 440 && rect.left <= 30 && rect.right > 160) {
        return Math.round(rect.right);
      }
    }
    return 330;
  }

  function detectTop() {
    const titleBarGuess = 38;
    return titleBarGuess;
  }

  function ensureOverlay() {
    injectStyle();
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) {
      overlay = document.createElement("section");
      overlay.id = OVERLAY_ID;
      overlay.setAttribute("aria-label", "Avatar limpo V19.7.6");
      overlay.innerHTML = `<iframe title="Avatar limpo" src="./avatar_carousel_v19_7_6.html"></iframe>`;
      document.body.appendChild(overlay);
    }
    document.documentElement.style.setProperty("--noelle-avatar-clean-left", detectSidebarRight() + "px");
    document.documentElement.style.setProperty("--noelle-avatar-clean-top", detectTop() + "px");
    return overlay;
  }

  function hideLegacyFloatingButtons() {
    const legacyLabels = [/^Avatar Lab$/i, /^Room V19$/i, /Sincronizar Room/i, /BroadcastChannel/i, /localStorage/i];
    for (const el of Array.from(document.querySelectorAll("button, a, [role='button'], .av195-btn, .av195-kbd, span, div"))) {
      const label = textOf(el);
      if (!label) continue;
      const style = getComputedStyle(el);
      const fixedLike = style.position === "fixed" || style.position === "absolute" || /Avatar Lab|Room V19|Sincronizar Room|BroadcastChannel|localStorage/i.test(label);
      if (fixedLike && legacyLabels.some((re) => re.test(label))) {
        el.classList.add("noelle-v1976-hidden-legacy-float");
      }
    }
    for (const el of Array.from(document.querySelectorAll("[data-noelle-v19-5-avatar-panel], [data-noelle-v19-4-avatar-panel], [data-noelle-v19-4-1-avatar-panel]"))) {
      el.classList.add("noelle-v1976-hidden-legacy-float");
    }
  }

  function setHeaderAvatar() {
    const headers = Array.from(document.querySelectorAll("h1, h2, [class*='title'], [class*='header']"));
    for (const el of headers.slice(0, 10)) {
      const text = textOf(el);
      if (/^Sobre$/i.test(text) || /^Principal$/i.test(text) || /^Avatar$/i.test(text)) {
        if (el.children.length === 0) el.textContent = "Avatar";
        break;
      }
    }
    const sub = Array.from(document.querySelectorAll("p, small, [class*='subtitle'], [class*='description']")).find((el) => /Noelle Companion 2026|Sobre ·|Avatar ·/i.test(textOf(el)));
    if (sub && sub.children.length === 0) sub.textContent = "Avatar · Noelle Companion 2026";
  }

  function setAvatarNavActive() {
    const interactive = Array.from(document.querySelectorAll("button, a, [role='button'], li, div"));
    for (const el of interactive) {
      const label = textOf(el);
      if (!/^(Principal|Avatar|Chat IA|Emotes|Inventário|Configurações|Sobre)$/i.test(label)) continue;
      el.removeAttribute("aria-current");
      el.classList.remove("active", "selected", "is-active", "current");
      if (/^Avatar$/i.test(label)) {
        el.setAttribute("aria-current", "page");
        el.classList.add("active");
      }
    }
  }

  function showAvatar() {
    const overlay = ensureOverlay();
    overlay.dataset.open = "1";
    setHeaderAvatar();
    setAvatarNavActive();
    hideLegacyFloatingButtons();
    window.__NOELLE_AVATAR_CLEAN_TAB_OPEN__ = true;
  }

  function hideAvatar() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.dataset.open = "0";
    window.__NOELLE_AVATAR_CLEAN_TAB_OPEN__ = false;
  }

  async function saveAvatarState(avatar) {
    if (!avatar) return;
    const stateAvatar = { file: avatar.stateFile || ("src/" + avatar.file), selectedId: avatar.id, name: avatar.name, mode: "carousel" };
    try {
      if (window.noelleAPI?.saveState) await window.noelleAPI.saveState({ avatar: stateAvatar });
    } catch (err) {
      console.warn("[Noelle V19.7.6] Falha ao salvar avatar:", err);
    }
    try {
      if (window.desktopWidget?.saveState) await window.desktopWidget.saveState({ avatar: stateAvatar });
    } catch {}
    try {
      if (window.noelleAPI?.avatarCommand) await window.noelleAPI.avatarCommand("setAvatar", stateAvatar);
    } catch {}
  }

  async function openMode(mode, avatar) {
    await saveAvatarState(avatar);
    if (mode === "room") {
      try {
        if (window.noelleRoom?.open) return await window.noelleRoom.open();
        if (window.noelleRoomV19?.open) return await window.noelleRoomV19.open();
      } catch (err) {
        console.warn("[Noelle V19.7.6] Falha ao abrir Room:", err);
      }
    }
    if (mode === "widget") {
      try {
        if (window.noelleAPI?.openAvatar) return await window.noelleAPI.openAvatar();
        if (window.desktopWidget?.openAvatar) return await window.desktopWidget.openAvatar();
      } catch (err) {
        console.warn("[Noelle V19.7.6] Falha ao abrir Widget:", err);
      }
    }
    if (mode === "preview") {
      try {
        window.open("./avatar_carousel_v19_7_6.html?preview=1", "noelle-avatar-preview-v1976", "popup,width=1180,height=860");
      } catch (err) {
        console.warn("[Noelle V19.7.6] Falha ao abrir Preview:", err);
      }
    }
  }

  function bindNav() {
    document.addEventListener("click", (event) => {
      const target = event.target?.closest?.("button, a, [role='button'], li, div");
      if (!target) return;
      const label = textOf(target);
      if (/^Avatar$/i.test(label) || /Abrir avatar/i.test(label)) {
        event.preventDefault();
        event.stopPropagation();
        showAvatar();
        return;
      }
      if (/^(Principal|Chat IA|Emotes|Inventário|Configurações|Sobre)$/i.test(label)) {
        hideAvatar();
      }
    }, true);

    window.addEventListener("message", async (event) => {
      const data = event.data || {};
      if (data.source !== SOURCE) return;
      if (data.type === "save-avatar") await saveAvatarState(data.avatar);
      if (data.type === "avatar-mode") await openMode(data.mode, data.avatar);
      if (data.type === "open-preview") await openMode("preview", data.avatar);
    });
  }

  function shouldOpenInitially() {
    const text = textOf(document.body);
    if (/Preview real do VRM V19\.5/i.test(text)) return true;
    if (/BroadcastChannel/i.test(text) && /localStorage/i.test(text)) return true;
    const avatarActive = Array.from(document.querySelectorAll("[aria-current='page'], .active, .selected, .is-active")).some((el) => /^Avatar$/i.test(textOf(el)));
    return avatarActive;
  }

  function boot() {
    injectStyle();
    bindNav();
    hideLegacyFloatingButtons();
    if (shouldOpenInitially()) showAvatar();
    setInterval(() => {
      hideLegacyFloatingButtons();
      if (window.__NOELLE_AVATAR_CLEAN_TAB_OPEN__) {
        setHeaderAvatar();
        setAvatarNavActive();
      }
    }, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
