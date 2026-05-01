/* Noelle Tabs Guard v19.8.35 - robust tab router, 2026 */
(function(){
  'use strict';
  if (window.__NOELLE_TABS_GUARD_V19_8_35__) return;
  window.__NOELLE_TABS_GUARD_V19_8_35__ = true;

  const STORE_KEY = 'noelle.activeTab';
  const DEBUG = false;
  const LABELS = {
    principal: ['principal','inicio','início','home'],
    avatar: ['avatar'],
    chat: ['chat ia','chat','ia'],
    emotes: ['emotes','emote'],
    inventario: ['inventário','inventario','inventory'],
    configuracoes: ['configurações','configuracoes','settings'],
    stream: ['stream','stream ia'],
    sobre: ['sobre','about']
  };

  function norm(s){ return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function textNorm(el){ return norm(el && el.textContent); }
  function log(){ if (DEBUG) console.log('[NoelleTabsGuard]', ...arguments); }
  function cssEscape(s){ try { return CSS.escape(s); } catch { return String(s).replace(/[^a-zA-Z0-9_-]/g,'\\$&'); } }

  function inferTabId(el){
    if (!el) return '';
    const attrs = ['data-tab','data-page','data-route','data-target','aria-controls','href'];
    for (const a of attrs){
      let v = el.getAttribute && el.getAttribute(a);
      if (!v) continue;
      v = String(v).replace(/^#/, '').replace(/^page-/, '').replace(/^tab-/, '');
      if (v) return norm(v);
    }
    const t = textNorm(el);
    for (const [id, aliases] of Object.entries(LABELS)) {
      if (aliases.some(a => t === norm(a) || t.includes(norm(a)))) return id;
    }
    return '';
  }

  function findTabButtonFromEvent(target){
    if (!target || !target.closest) return null;
    return target.closest('[data-tab], [data-page], [data-route], [role="tab"], a[href^="#"], button, .nav-item, .sidebar-item, .tab-button, .menu-item');
  }

  function allButtons(){
    const set = new Set();
    document.querySelectorAll('[data-tab], [data-page], [data-route], [role="tab"], .nav-item, .sidebar-item, .tab-button, .menu-item, aside button, nav button, aside a, nav a').forEach(el => {
      const id = inferTabId(el);
      if (id) {
        el.dataset.noelleTabId = id;
        set.add(el);
      }
    });
    return Array.from(set);
  }

  function candidatePanels(){
    const sels = [
      '.tab-page', '.page', '.view', '.screen', '.route-page', '.content-page',
      '[role="tabpanel"]', '[data-tab-panel]', '[data-page-id]', '[data-page]'
    ];
    const set = new Set();
    sels.forEach(sel => document.querySelectorAll(sel).forEach(el => set.add(el)));
    Object.keys(LABELS).forEach(id => {
      ['#'+id, '#page-'+id, '#tab-'+id, '#'+id+'-page', '#view-'+id].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) set.add(el);
      });
    });
    return Array.from(set).filter(el => el && el.nodeType === 1);
  }

  function inferPanelId(panel){
    const attrs = ['data-tab-panel','data-page-id','data-page','id','aria-labelledby'];
    for (const a of attrs){
      let v = panel.getAttribute && panel.getAttribute(a);
      if (!v) continue;
      v = String(v).replace(/^page-/, '').replace(/^tab-/, '').replace(/-page$/, '').replace(/^view-/, '');
      const n = norm(v);
      if (LABELS[n]) return n;
      for (const [id, aliases] of Object.entries(LABELS)) if (aliases.some(x => n === norm(x) || n.includes(norm(x)))) return id;
    }
    return '';
  }

  function panelFor(id){
    if (!id) return null;
    const direct = ['#page-'+id, '#tab-'+id, '#'+id, '#'+id+'-page', '#view-'+id, '[data-tab-panel="'+cssEscape(id)+'"]', '[data-page-id="'+cssEscape(id)+'"]'];
    for (const sel of direct){
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return candidatePanels().find(p => inferPanelId(p) === id) || null;
  }

  function knownPanels(){
    const byId = new Map();
    candidatePanels().forEach(p => {
      const id = inferPanelId(p);
      if (id) byId.set(id, p);
    });
    return Array.from(byId.entries()).map(([id, el]) => ({id, el}));
  }

  function setHidden(el, hidden){
    if (!el) return;
    el.hidden = !!hidden;
    el.setAttribute('aria-hidden', hidden ? 'true' : 'false');
    el.classList.toggle('active', !hidden);
    el.classList.toggle('is-active', !hidden);
    el.classList.toggle('noelle-tab-active', !hidden);
    el.classList.toggle('noelle-tab-hidden', !!hidden);
    if (hidden) {
      el.style.display = 'none';
    } else {
      el.style.removeProperty('display');
      if (getComputedStyle(el).display === 'none') el.style.display = 'block';
    }
  }

  function setButtonState(btn, active){
    btn.classList.toggle('active', active);
    btn.classList.toggle('is-active', active);
    btn.classList.toggle('selected', active);
    btn.classList.toggle('noelle-tab-active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.setAttribute('aria-current', active ? 'page' : 'false');
    if (!btn.hasAttribute('role')) btn.setAttribute('role','tab');
    btn.tabIndex = active ? 0 : -1;
  }

  function activate(id, opts){
    id = norm(id);
    const targetPanel = panelFor(id);
    if (!targetPanel) { log('panel not found', id); return false; }

    const panels = knownPanels();
    panels.forEach(({id: pid, el}) => setHidden(el, pid !== id));
    setHidden(targetPanel, false);

    allButtons().forEach(btn => setButtonState(btn, inferTabId(btn) === id));

    try { localStorage.setItem(STORE_KEY, id); } catch {}
    document.documentElement.dataset.noelleActiveTab = id;
    window.dispatchEvent(new CustomEvent('noelle:tabchange', {detail:{tab:id, panel:targetPanel}}));
    if (opts && opts.focus) targetPanel.setAttribute('tabindex','-1'), targetPanel.focus({preventScroll:true});
    return true;
  }

  function boot(){
    const buttons = allButtons();
    const panels = knownPanels();
    panels.forEach(({id, el}) => {
      if (!el.hasAttribute('role')) el.setAttribute('role','tabpanel');
      el.dataset.noellePanelId = id;
    });
    const selected = buttons.find(b => b.getAttribute('aria-selected') === 'true' || b.classList.contains('active'));
    let id = inferTabId(selected);
    try { id = localStorage.getItem(STORE_KEY) || id; } catch {}
    if (!panelFor(id)) id = panels[0] && panels[0].id || inferTabId(buttons[0]) || 'principal';
    activate(id);
  }

  document.addEventListener('click', function(ev){
    const btn = findTabButtonFromEvent(ev.target);
    const id = inferTabId(btn);
    if (!id || !panelFor(id)) return;
    if (btn && btn.tagName === 'A') ev.preventDefault();
    activate(id, {focus:false});
  }, true);

  document.addEventListener('keydown', function(ev){
    const btn = ev.target && ev.target.closest && ev.target.closest('[role="tab"], [data-noelle-tab-id]');
    if (!btn) return;
    const buttons = allButtons().filter(b => panelFor(inferTabId(b)));
    const i = buttons.indexOf(btn);
    if (i < 0) return;
    let next = null;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') next = buttons[(i - 1 + buttons.length) % buttons.length];
    if (ev.key === 'Home') next = buttons[0];
    if (ev.key === 'End') next = buttons[buttons.length - 1];
    if (!next) return;
    ev.preventDefault();
    next.focus();
    activate(inferTabId(next), {focus:false});
  }, true);

  let moTimer = null;
  const mo = new MutationObserver(() => {
    clearTimeout(moTimer);
    moTimer = setTimeout(boot, 80);
  });
  function start(){
    boot();
    mo.observe(document.documentElement, {childList:true, subtree:true});
    console.log('[Noelle] Tabs Guard v19.8.35: ativo');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
