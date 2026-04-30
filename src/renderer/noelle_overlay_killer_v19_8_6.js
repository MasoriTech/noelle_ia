(() => {
  'use strict';

  const VERSION = '19.8.6-overlay-launcher-killer-2026';
  const LOG_PREFIX = '[Noelle V19.8.6 OverlayKiller]';
  const LEGACY_TEXT_RE = /\b(avatar\s*lab|room\s*v19)\b/i;
  const AVATAR_ROUTE_TEXT_RE = /^avatar$/i;
  const PAGE_TITLES = ['Principal', 'Avatar', 'Chat IA', 'Emotes', 'Inventário', 'Configurações', 'Sobre'];
  const AVATAR_ROOT_SELECTORS = [
    '#noelle-avatar-real-tab',
    '#noelle-avatar-tab-v19-8-2',
    '#noelle-avatar-tab-v19-8-3',
    '#noelle-avatar-tab-v19-8-4',
    '#noelle-avatar-tab-v19-8-5',
    '[data-noelle-avatar-tab]',
    '.noelle-avatar-tab-v19-8-2',
    '.noelle-avatar-tab-v19-8-3',
    '.noelle-avatar-tab-v19-8-4',
    '.noelle-avatar-tab-v19-8-5',
    '.noelle-avatar-real-tab',
    '.noelle-avatar-shell',
    '.noelle-avatar-page-shell',
    '.noelle-avatar-carousel-shell',
    'iframe[src*="avatar_carousel_preview"]',
    'iframe[src*="avatar_loadfile_preview"]'
  ];

  let scheduled = false;
  let lastRoute = '';

  function log(...args) {
    try {
      if (window.NOELLE_DEBUG_OVERLAY_KILLER) console.log(LOG_PREFIX, ...args);
    } catch (_) {}
  }

  function textOf(el) {
    return (el && el.textContent ? el.textContent : '').replace(/\s+/g, ' ').trim();
  }

  function idClassOf(el) {
    const id = el && el.id ? String(el.id) : '';
    let className = '';
    try {
      className = typeof el.className === 'string' ? el.className : String(el.className && el.className.baseVal || '');
    } catch (_) {}
    return `${id} ${className}`.toLowerCase();
  }

  function getActiveNavText() {
    const candidates = [
      '.nav-item.active',
      '.nav-item.is-active',
      '.sidebar .active',
      '[aria-current="page"]',
      '[data-page].active',
      '[data-route].active'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      const txt = textOf(el);
      if (txt) return txt;
    }
    return '';
  }

  function getHeaderTitleText() {
    const candidates = [
      '.page-title',
      '.view-title',
      '.content-title',
      'header h1',
      'main h1',
      'h1'
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      const txt = textOf(el);
      if (txt && PAGE_TITLES.some((name) => txt.toLowerCase().includes(name.toLowerCase()))) return txt;
    }
    return '';
  }

  function currentRoute() {
    const nav = getActiveNavText();
    if (AVATAR_ROUTE_TEXT_RE.test(nav)) return 'avatar';
    const header = getHeaderTitleText();
    if (/^avatar\b/i.test(header) && /avatar/i.test(nav)) return 'avatar';
    if (/^principal\b/i.test(header)) return 'principal';
    if (/^chat\s*ia\b/i.test(header)) return 'chat';
    if (/^configura/i.test(header)) return 'config';
    if (/^sobre\b/i.test(header)) return 'sobre';
    if (/^emotes\b/i.test(header)) return 'emotes';
    if (/^invent/i.test(header)) return 'inventory';
    return nav || header || 'unknown';
  }

  function looksLikeFloatingLauncher(el) {
    if (!el || el.nodeType !== 1) return false;
    const txt = textOf(el);
    const idClass = idClassOf(el);

    const hasLegacyText = LEGACY_TEXT_RE.test(txt);
    const hasLegacyIdentity = /(avatar[-_\s]*lab|room[-_\s]*v19|room-v19|avatar-lab|canonical-button|floating|launcher)/i.test(idClass);
    if (!hasLegacyText && !hasLegacyIdentity) return false;

    let cs;
    try { cs = window.getComputedStyle(el); } catch (_) { return false; }
    if (!cs) return false;
    const rect = el.getBoundingClientRect();
    const isButtonLike = el.matches('button,a,[role="button"],.button,.btn,[onclick]') || hasLegacyIdentity;
    const isFloatingPosition = ['fixed', 'sticky', 'absolute'].includes(cs.position);
    const rightPinned = rect.right > window.innerWidth - 360 && rect.left > 0;
    const z = Number.parseInt(cs.zIndex || '0', 10);
    const highLayer = Number.isFinite(z) && z >= 10;

    return isButtonLike && (isFloatingPosition || rightPinned || highLayer || hasLegacyIdentity) && (hasLegacyText || hasLegacyIdentity);
  }

  function neutralizeElement(el, reason) {
    if (!el || el.dataset.noelleOverlayKilled === '1') return;
    el.dataset.noelleOverlayKilled = '1';
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('tabindex', '-1');
    el.style.setProperty('display', 'none', 'important');
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    el.style.setProperty('opacity', '0', 'important');
    log('neutralizado:', reason, textOf(el), el);
  }

  function killLegacyFloatingLaunchers() {
    const candidates = Array.from(document.querySelectorAll([
      'button',
      'a',
      '[role="button"]',
      '[onclick]',
      '[id*="avatar" i]',
      '[id*="room" i]',
      '[class*="avatar" i]',
      '[class*="room" i]',
      '[class*="float" i]',
      '[class*="launcher" i]'
    ].join(',')));

    for (const el of candidates) {
      if (looksLikeFloatingLauncher(el)) neutralizeElement(el, 'legacy-floating-launcher');
    }
  }

  function removeTextSelectionLeftovers() {
    try {
      const selection = window.getSelection && window.getSelection();
      if (selection && !selection.isCollapsed) selection.removeAllRanges();
    } catch (_) {}
  }

  function findAvatarRoots() {
    const roots = new Set();
    for (const sel of AVATAR_ROOT_SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => roots.add(el));
    }

    // Fallback: detect large avatar shells by visible title/phrases, but only when they are not the real page container.
    document.querySelectorAll('section, main > div, .page, .panel, .card').forEach((el) => {
      const txt = textOf(el).slice(0, 600);
      if (/Escolha o personagem\. O foco é o VRM grande/i.test(txt) || /Falha ao carregar avatar/i.test(txt)) {
        roots.add(el);
      }
    });
    return Array.from(roots).filter(Boolean);
  }

  function hideAvatarContentOutsideAvatarRoute(route) {
    const isAvatar = route === 'avatar';
    for (const root of findAvatarRoots()) {
      if (isAvatar) {
        if (root.dataset.noelleHiddenByRouteGuard === '1') {
          root.style.removeProperty('display');
          root.style.removeProperty('visibility');
          root.removeAttribute('aria-hidden');
          delete root.dataset.noelleHiddenByRouteGuard;
        }
        continue;
      }
      root.dataset.noelleHiddenByRouteGuard = '1';
      root.setAttribute('aria-hidden', 'true');
      root.style.setProperty('display', 'none', 'important');
      root.style.setProperty('visibility', 'hidden', 'important');
      root.style.setProperty('pointer-events', 'none', 'important');
    }
  }

  function addSafeCloseToAvatarTab(route) {
    if (route !== 'avatar') return;
    if (document.getElementById('noelle-avatar-v19-8-6-close')) return;

    const host = findAvatarRoots()[0] || document.querySelector('main') || document.body;
    const btn = document.createElement('button');
    btn.id = 'noelle-avatar-v19-8-6-close';
    btn.type = 'button';
    btn.textContent = 'Fechar Avatar';
    btn.title = 'Voltar para Principal sem deixar overlay aberto';
    btn.className = 'noelle-avatar-v19-8-6-close';
    btn.addEventListener('click', () => {
      const principal = Array.from(document.querySelectorAll('button,a,[role="button"],.nav-item'))
        .find((el) => /^principal$/i.test(textOf(el)));
      if (principal) principal.click();
      else hideAvatarContentOutsideAvatarRoute('principal');
      killLegacyFloatingLaunchers();
    });

    host.appendChild(btn);
  }

  function apply() {
    scheduled = false;
    const route = currentRoute();
    if (route !== lastRoute) {
      lastRoute = route;
      log('rota:', route);
    }
    removeTextSelectionLeftovers();
    killLegacyFloatingLaunchers();
    hideAvatarContentOutsideAvatarRoute(route);
    addSafeCloseToAvatarTab(route);
    document.documentElement.dataset.noelleActiveRoute = route;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(apply);
  }

  function install() {
    if (window.__NOELLE_OVERLAY_KILLER_V19_8_6__) return;
    window.__NOELLE_OVERLAY_KILLER_V19_8_6__ = VERSION;

    schedule();
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    window.addEventListener('popstate', schedule, { passive: true });
    document.addEventListener('click', () => setTimeout(schedule, 0), true);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        const route = currentRoute();
        if (route === 'avatar') {
          const close = document.getElementById('noelle-avatar-v19-8-6-close');
          if (close) close.click();
        }
        killLegacyFloatingLaunchers();
      }
    }, true);

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
    window.__NOELLE_OVERLAY_KILLER_V19_8_6_OBSERVER__ = observer;

    setInterval(schedule, 1200);
    log('instalado', VERSION);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
