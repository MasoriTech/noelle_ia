"use strict";
/*
  NOELLE_TABS_STRUCTURE_GUARD_V19_8_36_2026
  Router defensivo para abas/paginas do Noelle Companion.
  Objetivo: impedir sobreposicao de paginas quando Stream/temas/chat injetam DOM depois do boot.
*/
(() => {
  const VERSION = "19.8.36-tabs-structure-guard-2026";
  const STATE_KEY = "noelle.activeTab";
  const ROOT_FLAG = "data-noelle-tabs-guard";
  const logPrefix = "[NoelleTabsGuard]";

  const TAB_ALIASES = new Map([
    ["home", "principal"],
    ["main", "principal"],
    ["inicio", "principal"],
    ["principal", "principal"],
    ["chat", "chat"],
    ["chat-ia", "chat"],
    ["chatia", "chat"],
    ["ia", "chat"],
    ["avatar", "avatar"],
    ["emote", "emotes"],
    ["emotes", "emotes"],
    ["inventario", "inventory"],
    ["inventory", "inventory"],
    ["config", "settings"],
    ["configuracoes", "settings"],
    ["settings", "settings"],
    ["stream", "stream"],
    ["sobre", "about"],
    ["about", "about"]
  ]);

  function clean(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function canonical(value) {
    const key = clean(value);
    return TAB_ALIASES.get(key) || key;
  }

  function safeText(el) {
    return clean(el?.textContent || "");
  }

  function candidateNameFromButton(btn) {
    return canonical(
      btn?.dataset?.target ||
      btn?.dataset?.tab ||
      btn?.dataset?.page ||
      btn?.getAttribute?.("aria-controls") ||
      btn?.getAttribute?.("href")?.replace(/^#/, "") ||
      safeText(btn)
    );
  }

  function candidateNameFromPage(page) {
    const id = page?.id || "";
    const data = page?.dataset || {};
    const fromId = id
      .replace(/^page[-_]/i, "")
      .replace(/[-_]page$/i, "")
      .replace(/^noelle[-_]/i, "")
      .replace(/PageV\d+$/i, "");
    return canonical(data.page || data.tab || data.view || data.route || fromId || safeText(page.querySelector("h1,h2,.page-title")));
  }

  function isLikelyNavButton(el) {
    if (!(el instanceof HTMLElement)) return false;
    if (el.matches('[data-target],[data-tab],[data-page][role="tab"],button.nav-item,.nav-item,aside button,nav button')) return true;
    return false;
  }

  function collectButtons() {
    const selectors = [
      '[data-target]', '[data-tab]', '[role="tab"]',
      '.nav-item', '.sidebar button', '.side-nav button', 'aside button', 'nav button'
    ];
    return Array.from(document.querySelectorAll(selectors.join(',')))
      .filter((el) => el instanceof HTMLElement)
      .filter((el) => {
        const name = candidateNameFromButton(el);
        return !!name && (document.querySelector(`.page[data-page="${CSS.escape(name)}"]`) || name !== "");
      });
  }

  function collectPages() {
    const selectors = [
      '.page[data-page]', '.page[data-tab]', '.page[data-view]',
      '[data-page].page', '[data-tab].page', '[data-view].page',
      '.tab-page', '.view-page', '.screen-page',
      'main > section[id]', 'main > div[id]'
    ];
    const pages = Array.from(document.querySelectorAll(selectors.join(',')))
      .filter((el) => el instanceof HTMLElement)
      .filter((el) => {
        if (el.closest('template')) return false;
        if (el.matches('script,style,link,meta')) return false;
        const name = candidateNameFromPage(el);
        return !!name;
      });
    return Array.from(new Set(pages));
  }

  function ensureBaseCss() {
    if (document.getElementById("noelle-tabs-structure-guard-style-v19-8-36")) return;
    const style = document.createElement("style");
    style.id = "noelle-tabs-structure-guard-style-v19-8-36";
    style.textContent = `
      [${ROOT_FLAG}="on"] .page[hidden],
      [${ROOT_FLAG}="on"] .tab-page[hidden],
      [${ROOT_FLAG}="on"] .view-page[hidden],
      [${ROOT_FLAG}="on"] .screen-page[hidden] { display: none !important; visibility: hidden !important; pointer-events: none !important; }
      [${ROOT_FLAG}="on"] .page.noelle-page-hidden,
      [${ROOT_FLAG}="on"] .tab-page.noelle-page-hidden,
      [${ROOT_FLAG}="on"] .view-page.noelle-page-hidden,
      [${ROOT_FLAG}="on"] .screen-page.noelle-page-hidden { display: none !important; visibility: hidden !important; pointer-events: none !important; }
      [${ROOT_FLAG}="on"] .page.noelle-page-active,
      [${ROOT_FLAG}="on"] .tab-page.noelle-page-active,
      [${ROOT_FLAG}="on"] .view-page.noelle-page-active,
      [${ROOT_FLAG}="on"] .screen-page.noelle-page-active { display: block !important; visibility: visible !important; }
      [${ROOT_FLAG}="on"] .nav-item.active,
      [${ROOT_FLAG}="on"] [role="tab"].active { pointer-events: auto; }
    `;
    document.head.appendChild(style);
  }

  function normalizeStructure() {
    document.documentElement.setAttribute(ROOT_FLAG, "on");
    ensureBaseCss();

    for (const btn of collectButtons()) {
      const name = candidateNameFromButton(btn);
      if (!name) continue;
      btn.dataset.target = name;
      btn.dataset.tab = name;
      btn.setAttribute("role", "tab");
      if (!btn.hasAttribute("type") && btn.tagName === "BUTTON") btn.setAttribute("type", "button");
      const page = findPage(name);
      if (page?.id) btn.setAttribute("aria-controls", page.id);
    }

    for (const page of collectPages()) {
      const name = candidateNameFromPage(page);
      if (!name) continue;
      page.dataset.page = name;
      page.setAttribute("role", "tabpanel");
      if (!page.id) page.id = `page-${name}`;
    }
  }

  function findPage(name) {
    const tab = canonical(name);
    const pages = collectPages();
    return pages.find((page) => candidateNameFromPage(page) === tab) || null;
  }

  function activeFromDom() {
    const activeButton = collectButtons().find((btn) => btn.classList.contains("active") || btn.getAttribute("aria-selected") === "true");
    const byButton = candidateNameFromButton(activeButton);
    if (byButton) return byButton;
    const activePage = collectPages().find((page) => page.classList.contains("active") || page.classList.contains("noelle-page-active") || page.hidden === false);
    const byPage = candidateNameFromPage(activePage);
    return byPage || "principal";
  }

  function setPageVisible(page, visible) {
    page.classList.toggle("active", visible);
    page.classList.toggle("is-active", visible);
    page.classList.toggle("noelle-page-active", visible);
    page.classList.toggle("noelle-page-hidden", !visible);
    page.hidden = !visible;
    page.setAttribute("aria-hidden", visible ? "false" : "true");
    if ("inert" in page) page.inert = !visible;
    page.style.display = visible ? "block" : "none";
    page.style.visibility = visible ? "visible" : "hidden";
    page.style.pointerEvents = visible ? "auto" : "none";
  }

  function activate(tab, options = {}) {
    normalizeStructure();
    const target = canonical(tab || activeFromDom() || "principal");
    const pages = collectPages();
    const buttons = collectButtons();
    const targetPage = pages.find((page) => candidateNameFromPage(page) === target);
    const finalTab = targetPage ? target : (pages[0] ? candidateNameFromPage(pages[0]) : target);

    for (const page of pages) setPageVisible(page, candidateNameFromPage(page) === finalTab);

    for (const btn of buttons) {
      const active = candidateNameFromButton(btn) === finalTab;
      btn.classList.toggle("active", active);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.tabIndex = active ? 0 : -1;
    }

    try { localStorage.setItem(STATE_KEY, finalTab); } catch {}
    if (!options.silent) window.dispatchEvent(new CustomEvent("noelle:tabchange", { detail: { tab: finalTab, version: VERSION } }));
    return finalTab;
  }

  function fromClick(event) {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[data-target],[data-tab],[role="tab"],.nav-item,aside button,nav button') : null;
    if (!isLikelyNavButton(btn)) return;
    const tab = candidateNameFromButton(btn);
    if (!tab) return;
    const page = findPage(tab);
    if (!page) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    activate(tab);
  }

  function onKeydown(event) {
    const btn = event.target instanceof HTMLElement ? event.target.closest('[role="tab"],[data-target],[data-tab],.nav-item') : null;
    if (!btn) return;
    const keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "];
    if (!keys.includes(event.key)) return;
    const buttons = collectButtons().filter((b) => findPage(candidateNameFromButton(b)));
    const index = buttons.indexOf(btn);
    if (index < 0) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % buttons.length;
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = buttons.length - 1;
    if (event.key === "Enter" || event.key === " ") next = index;
    buttons[next]?.focus?.();
    activate(candidateNameFromButton(buttons[next]));
  }

  let raf = 0;
  function scheduleRepair() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const saved = (() => { try { return localStorage.getItem(STATE_KEY); } catch { return null; } })();
      activate(saved || activeFromDom(), { silent: true });
    });
  }

  function boot() {
    if (window.__NOELLE_TABS_STRUCTURE_GUARD_V19_8_36__) return;
    window.__NOELLE_TABS_STRUCTURE_GUARD_V19_8_36__ = true;
    document.addEventListener("click", fromClick, true);
    document.addEventListener("keydown", onKeydown, true);
    const saved = (() => { try { return localStorage.getItem(STATE_KEY); } catch { return null; } })();
    activate(saved || activeFromDom(), { silent: true });
    new MutationObserver(scheduleRepair).observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "data-page", "data-tab", "data-target", "aria-selected"]
    });
    setTimeout(scheduleRepair, 80);
    setTimeout(scheduleRepair, 300);
    console.info(logPrefix, VERSION, "ativo");
  }

  window.NoelleTabsStructureGuardV19836 = Object.freeze({ version: VERSION, activate, repair: scheduleRepair, collectPages, collectButtons });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
