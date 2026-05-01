"use strict";
/*
 Noelle V19.8.34 — Tab Router reforçado
 Objetivo: impedir que a troca de abas suma/quebre quando módulos novos criam páginas depois do boot.
 - Delegação global de clique
 - Revarredura por MutationObserver
 - Fallback para data-target/data-tab/href
 - Estado visual unificado: .active, .is-active, aria-selected, hidden
 - Não mexe em STT/Ollama/TTS
*/
(() => {
  const VERSION = "19.8.34-tab-router-robusto-2026";
  if (window.__NOELLE_TAB_ROUTER_V19834__) return;
  window.__NOELLE_TAB_ROUTER_V19834__ = true;

  const STORE_KEY = "noelle.activeTab.v19.8.34";
  const log = (...args) => console.info("[Noelle TabRouter V19.8.34]", ...args);
  const warn = (...args) => console.warn("[Noelle TabRouter V19.8.34]", ...args);

  function norm(value) {
    return String(value || "").trim().replace(/^#/, "").replace(/^page-/, "").replace(/^tab-/, "").toLowerCase();
  }

  function qsa(sel, root = document) {
    try { return Array.from(root.querySelectorAll(sel)); } catch { return []; }
  }

  function getTargetFromElement(el) {
    if (!el || !(el instanceof Element)) return "";
    const direct = el.getAttribute("data-target") || el.getAttribute("data-tab") || el.getAttribute("data-page") || el.getAttribute("aria-controls");
    if (direct) return norm(direct);
    const href = el.getAttribute("href");
    if (href && href.startsWith("#")) return norm(href);
    return "";
  }

  function findTriggerFromClick(target) {
    if (!(target instanceof Element)) return null;
    return target.closest('[data-target], [data-tab], [data-page], [aria-controls], a[href^="#"]');
  }

  function pageName(page) {
    if (!page || !(page instanceof Element)) return "";
    return norm(page.getAttribute("data-page") || page.id || page.getAttribute("aria-labelledby"));
  }

  function pages() {
    const found = qsa('.page[data-page], [data-page].page, section[data-page], main [data-page], .tab-page[data-page], .view[data-page]');
    const unique = [];
    const seen = new Set();
    for (const p of found) {
      const name = pageName(p);
      if (!name || seen.has(p)) continue;
      seen.add(p);
      unique.push(p);
    }
    return unique;
  }

  function triggers() {
    return qsa('[data-target], [data-tab], [aria-controls], a[href^="#"]')
      .filter((el) => getTargetFromElement(el));
  }

  function setActiveClass(el, active) {
    if (!el || !(el instanceof Element)) return;
    el.classList.toggle("active", active);
    el.classList.toggle("is-active", active);
    if (el.matches('button, a, [role="tab"], .nav-item')) {
      el.setAttribute("aria-selected", active ? "true" : "false");
      if (active) el.setAttribute("data-active", "true");
      else el.removeAttribute("data-active");
    }
  }

  function showPage(page, active) {
    if (!page || !(page instanceof HTMLElement)) return;
    setActiveClass(page, active);
    page.hidden = !active;
    page.style.display = active ? "" : "none";
    page.setAttribute("aria-hidden", active ? "false" : "true");
  }

  function activate(tab, options = {}) {
    const name = norm(tab);
    if (!name) return false;
    const allPages = pages();
    const match = allPages.find((p) => pageName(p) === name);
    if (!match) {
      warn("aba sem página correspondente:", name);
      return false;
    }

    for (const p of allPages) showPage(p, pageName(p) === name);
    for (const t of triggers()) setActiveClass(t, getTargetFromElement(t) === name);

    try { localStorage.setItem(STORE_KEY, name); } catch {}
    window.dispatchEvent(new CustomEvent("noelle:tab-change", { detail: { tab: name, version: VERSION } }));

    if (!options.silent) log("aba ativa:", name);
    return true;
  }

  function ensureInitial() {
    const allPages = pages();
    if (!allPages.length) return;
    let wanted = "";
    try { wanted = localStorage.getItem(STORE_KEY) || ""; } catch {}
    wanted = norm(location.hash || wanted || allPages.find((p) => p.classList.contains("active") || !p.hidden)?.getAttribute("data-page") || pageName(allPages[0]));
    if (!activate(wanted, { silent: true })) activate(pageName(allPages[0]), { silent: true });
  }

  function repairButtons() {
    for (const t of triggers()) {
      const name = getTargetFromElement(t);
      if (!name) continue;
      if (t.matches('button') && !t.getAttribute('type')) t.setAttribute('type', 'button');
      t.setAttribute('role', t.getAttribute('role') || 'tab');
      t.setAttribute('data-noelle-tab-router', VERSION);
    }
  }

  function boot() {
    repairButtons();
    ensureInitial();
  }

  document.addEventListener("click", (event) => {
    const trigger = findTriggerFromClick(event.target);
    if (!trigger) return;
    const name = getTargetFromElement(trigger);
    if (!name) return;
    if (pages().some((p) => pageName(p) === name)) {
      event.preventDefault();
      event.stopPropagation();
      activate(name);
    }
  }, true);

  window.addEventListener("hashchange", () => {
    const name = norm(location.hash);
    if (name) activate(name);
  });

  const mo = new MutationObserver(() => {
    clearTimeout(window.__NOELLE_TAB_ROUTER_V19834_T__);
    window.__NOELLE_TAB_ROUTER_V19834_T__ = setTimeout(boot, 60);
  });

  function start() {
    boot();
    try { mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-page", "data-target", "data-tab", "hidden", "class"] }); } catch {}
    setTimeout(boot, 120);
    setTimeout(boot, 500);
  }

  window.NoelleTabRouterV19834 = Object.freeze({ version: VERSION, activate, boot, pages: () => pages().map(pageName), triggers: () => triggers().map(getTargetFromElement) });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
