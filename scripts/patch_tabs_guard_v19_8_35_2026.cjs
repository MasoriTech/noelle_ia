/* Noelle Companion 2026 - Tabs Guard v19.8.35
   Patch cirurgico: adiciona um roteador de abas robusto por delegacao de evento.
   Nao remove codigo antigo; apenas instala uma camada de seguranca idempotente. */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = 'v19.8.35';
const guardRel = path.join('src','renderer','modules','noelle_tabs_guard_v19_8_35.js');
const cssRel = path.join('src','renderer','styles','noelle_tabs_guard_v19_8_35.css');
const guardPath = path.join(ROOT, guardRel);
const cssPath = path.join(ROOT, cssRel);
const backupDir = path.join(ROOT, 'backups', `tabs_guard_${VERSION}_${new Date().toISOString().replace(/[:.]/g,'-')}`);

function log(msg){ console.log(msg); }
function ensureDir(p){ fs.mkdirSync(p, {recursive:true}); }
function exists(p){ try { return fs.existsSync(p); } catch { return false; } }
function read(p){ return fs.readFileSync(p, 'utf8'); }
function write(p, s){ ensureDir(path.dirname(p)); fs.writeFileSync(p, s, 'utf8'); }
function copyBackup(p){
  if (!exists(p)) return;
  const rel = path.relative(ROOT, p);
  const dst = path.join(backupDir, rel);
  ensureDir(path.dirname(dst));
  fs.copyFileSync(p, dst);
}
function walk(dir, out=[]){
  if (!exists(dir)) return out;
  for (const name of fs.readdirSync(dir)){
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!['node_modules','.git','release','dist','backups'].includes(name)) walk(p, out);
    } else out.push(p);
  }
  return out;
}

const guardCode = `/* Noelle Tabs Guard ${VERSION} - robust tab router, 2026 */
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

  function norm(s){ return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
  function textNorm(el){ return norm(el && el.textContent); }
  function log(){ if (DEBUG) console.log('[NoelleTabsGuard]', ...arguments); }
  function cssEscape(s){ try { return CSS.escape(s); } catch { return String(s).replace(/[^a-zA-Z0-9_-]/g,'\\\\$&'); } }

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
    console.log('[Noelle] Tabs Guard ${VERSION}: ativo');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
`;

const cssCode = `/* Noelle Tabs Guard ${VERSION} */
.noelle-tab-hidden, [hidden] { display: none !important; }
.noelle-tab-active[role="tabpanel"], .tab-page.noelle-tab-active, .page.noelle-tab-active { display: block; }
[role="tab"][aria-selected="true"], [data-noelle-tab-id].noelle-tab-active { outline-offset: 2px; }
`;

function injectHtml(file){
  let s = read(file);
  let changed = false;
  if (!s.includes('noelle_tabs_guard_v19_8_35.css')) {
    const tag = '  <link rel="stylesheet" href="./styles/noelle_tabs_guard_v19_8_35.css">\n';
    if (/<\/head>/i.test(s)) s = s.replace(/<\/head>/i, tag + '</head>');
    else s = tag + s;
    changed = true;
  }
  if (!s.includes('noelle_tabs_guard_v19_8_35.js')) {
    const tag = '  <script defer src="./modules/noelle_tabs_guard_v19_8_35.js"></script>\n';
    if (/<\/body>/i.test(s)) s = s.replace(/<\/body>/i, tag + '</body>');
    else s += '\n' + tag;
    changed = true;
  }
  if (changed) { copyBackup(file); write(file, s); log(`[OK] Injetado em ${path.relative(ROOT,file)}`); }
  return changed;
}

function appendToRendererBootstrap(file){
  let s = read(file);
  if (s.includes('noelle_tabs_guard_v19_8_35')) return false;
  copyBackup(file);
  const rel = './modules/noelle_tabs_guard_v19_8_35.js';
  s += `\n\n// Noelle Tabs Guard ${VERSION}\ntry { import('${rel}'); } catch (e) { console.warn('[Noelle] Tabs Guard import falhou', e); }\n`;
  write(file, s);
  log(`[OK] Import dinamico adicionado em ${path.relative(ROOT,file)}`);
  return true;
}

ensureDir(backupDir);
write(guardPath, guardCode);
write(cssPath, cssCode);
log(`[OK] Criado ${guardRel}`);
log(`[OK] Criado ${cssRel}`);

const htmls = walk(ROOT).filter(p => /(^|[\\/])(src[\\/]renderer|renderer|app)([\\/]|$)/i.test(p) && p.endsWith('.html'));
let injected = 0;
for (const h of htmls) if (injectHtml(h)) injected++;

if (!injected) {
  const candidates = walk(path.join(ROOT,'src','renderer')).filter(p => /(?:app|index|renderer|main).*\.js$/i.test(path.basename(p)));
  if (candidates[0]) appendToRendererBootstrap(candidates[0]);
  else log('[AVISO] Nenhum HTML/bootstrap encontrado. Arquivos do guard foram criados; inclua manualmente se necessario.');
}

// cria diagnostico
const diagPath = path.join(ROOT, 'scripts', 'diagnostico_tabs_guard_v19_8_35_2026.cjs');
write(diagPath, `const fs=require('fs'),path=require('path');\nconst files=['${guardRel.replace(/\\/g,'\\\\')}','${cssRel.replace(/\\/g,'\\\\')}'];\nlet ok=true;\nfor(const f of files){const p=path.join(process.cwd(),f); if(fs.existsSync(p)) console.log('[OK]',f); else {console.log('[ERRO]',f,'nao encontrado'); ok=false;}}\nprocess.exit(ok?0:1);\n`);
log('[OK] Criado scripts/diagnostico_tabs_guard_v19_8_35_2026.cjs');
log(`[OK] Backup em ${path.relative(ROOT, backupDir)}`);
