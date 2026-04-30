/*
  Noelle/Yoru V19.8.11c — Configurações Premium Robusta
  Objetivo:
  - Recuperar/melhorar a aba Configurações sem deixar tela vazia.
  - Não criar overlay.
  - Não reativar Avatar Lab / Room V19 legado.
  - Manter Yoru Ember como tema principal.
*/
(() => {
  'use strict';

  if (window.__NOELLE_CONFIG_PREMIUM_V19811C__) return;
  window.__NOELLE_CONFIG_PREMIUM_V19811C__ = true;

  const VERSION = '19.8.11c-config-premium-robust-2026';
  const DASHBOARD_ID = 'noelle-config-premium-v19-8-11c';
  const HOST_ATTR = 'data-noelle-config-premium-v19-8-11c-host';
  const THEME_KEY = 'noelle.theme.id';
  const DENSITY_KEY = 'noelle.ui.density';
  const MODE_KEY = 'noelle.avatar.defaultMode';

  const THEMES = Object.freeze({
    'yoru-ember': { name: 'Yoru Ember', role: 'Principal da Yoru', desc: 'Preto carvão, grafite, laranja brasa e vermelho fogo.', colors: ['#080706', '#1B1713', '#FF7A1A', '#E13B1A'] },
    'noelle-noir': { name: 'Noelle Noir', role: 'Principal da Noelle', desc: 'Preto, vermelho vinho e branco premium.', colors: ['#07070A', '#17151A', '#E83D68', '#8B1E3F'] },
    'yoru-midnight': { name: 'Yoru Midnight', role: 'Noite elegante', desc: 'Azul noite, violeta e leitura confortável.', colors: ['#050713', '#11182B', '#6C8CFF', '#8A5CFF'] },
    'sakura-dark': { name: 'Sakura Dark', role: 'Anime suave', desc: 'Rosa sakura, lilás e fundo escuro.', colors: ['#0B0710', '#201727', '#FF79B7', '#B86BFF'] },
    'cyber-violet': { name: 'Cyber Violet', role: 'Futurista', desc: 'Roxo neon, azul elétrico e preto.', colors: ['#06030D', '#1A102B', '#A855F7', '#22D3EE'] },
    'crimson-glass': { name: 'Crimson Glass', role: 'Premium', desc: 'Vidro escuro, vermelho cristal e alto contraste.', colors: ['#050505', '#201C22', '#FF3F5E', '#B11232'] },
    'forest-spirit': { name: 'Forest Spirit', role: 'Descanso', desc: 'Verde escuro, musgo e dourado suave.', colors: ['#06100B', '#132419', '#4ADE80', '#D6B56D'] },
    'light-pearl': { name: 'Light Pearl', role: 'Claro opcional', desc: 'Claro suave para leitura e ajustes.', colors: ['#F8F5F1', '#FFFFFF', '#D35428', '#9F2E1C'] }
  });

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const low = (s) => norm(s).toLowerCase();
  const textOf = (el) => norm(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.('aria-label') || '');

  function getLS(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }
  function setLS(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function isTheme(id) { return Object.prototype.hasOwnProperty.call(THEMES, id); }
  function currentTheme() {
    const id = getLS(THEME_KEY, 'yoru-ember');
    return isTheme(id) ? id : 'yoru-ember';
  }
  function currentDensity() {
    const id = getLS(DENSITY_KEY, 'normal');
    return ['compacta', 'normal', 'confortavel'].includes(id) ? id : 'normal';
  }
  function currentMode() {
    const id = getLS(MODE_KEY, 'widget');
    return ['room', 'widget', 'preview'].includes(id) ? id : 'widget';
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 3 && r.height > 3;
  }

  function applyTheme(id = currentTheme(), persist = true) {
    const theme = isTheme(id) ? id : 'yoru-ember';
    document.documentElement.setAttribute('data-noelle-theme', theme);
    document.body?.setAttribute('data-noelle-theme', theme);
    document.body?.classList.add('noelle-v19811c-ready');
    if (persist) setLS(THEME_KEY, theme);
    return theme;
  }

  function applyDensity(id = currentDensity(), persist = true) {
    const density = ['compacta', 'normal', 'confortavel'].includes(id) ? id : 'normal';
    document.documentElement.setAttribute('data-noelle-density', density);
    document.body?.setAttribute('data-noelle-density', density);
    if (persist) setLS(DENSITY_KEY, density);
    return density;
  }

  function setDefaultMode(id) {
    const mode = ['room', 'widget', 'preview'].includes(id) ? id : 'widget';
    setLS(MODE_KEY, mode);
    document.documentElement.setAttribute('data-noelle-avatar-mode', mode);
  }

  function isSettingsRoute() {
    const active = $$('button, a, [role="button"], .active, [aria-current="page"], [data-active="true"]');
    if (active.some((el) => /configura/i.test(textOf(el)) && visible(el))) return true;

    const exactHeadings = $$('h1,h2,h3,.title,.page-title,.header-title')
      .filter(visible)
      .some((el) => /^configurações$|^configuracoes$/i.test(textOf(el)));
    if (exactHeadings) return true;

    const headerText = $$('header, .topbar, .titlebar, .page-header').map(textOf).join(' ');
    if (/configurações|configuracoes/i.test(headerText)) return true;

    const bodyText = low(document.body?.innerText || '');
    return bodyText.includes('configurações · noelle') || bodyText.includes('configuracoes · noelle');
  }

  function getSidebarLimit() {
    const sideCandidates = $$('aside, nav, .sidebar, .side, [data-sidebar]');
    const side = sideCandidates.find((el) => visible(el) && el.getBoundingClientRect().width > 160 && el.getBoundingClientRect().left < 80);
    return side ? Math.ceil(side.getBoundingClientRect().right) : 300;
  }

  function getHeaderBottom() {
    const headerCandidates = $$('header, .topbar, .titlebar, .page-header');
    const header = headerCandidates
      .filter((el) => visible(el) && /configurações|configuracoes|principal|avatar|chat/i.test(textOf(el)))
      .sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
    return header ? Math.ceil(header.getBoundingClientRect().bottom) : 120;
  }

  function robustFindSettingsSurface() {
    const sidebarRight = getSidebarLimit();
    const headerBottom = getHeaderBottom();

    const explicit = [
      '[data-page="settings"]',
      '[data-page="config"]',
      '[data-route="settings"]',
      '.settings-page',
      '.page-settings',
      '#settings',
      '#configuracoes',
      'main',
      '[role="main"]',
      '.content',
      '.page-content',
      '.workspace',
      '.view',
      '.page'
    ];

    for (const selector of explicit) {
      const candidates = $$(selector).filter((el) => {
        if (!visible(el)) return false;
        const r = el.getBoundingClientRect();
        return r.right > sidebarRight + 220 && r.bottom > headerBottom + 180;
      });
      const withSettings = candidates.find((el) => /configurações|configuracoes/i.test(textOf(el)));
      if (withSettings) return withSettings;
      if (candidates[0]) return candidates[0];
    }

    const all = $$('main, section, article, div')
      .filter((el) => {
        if (!visible(el)) return false;
        if (el.id === DASHBOARD_ID || el.closest?.(`#${DASHBOARD_ID}`)) return false;
        const r = el.getBoundingClientRect();
        if (r.left < sidebarRight - 12) return false;
        if (r.top < 40) return false;
        if (r.width < Math.min(560, window.innerWidth * 0.38)) return false;
        if (r.height < Math.min(320, window.innerHeight * 0.36)) return false;
        return true;
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect();
        const br = b.getBoundingClientRect();
        return (br.width * br.height) - (ar.width * ar.height);
      });

    return all[0] || document.body;
  }

  function ensureHost() {
    const surface = robustFindSettingsSurface();
    if (!surface) return null;

    let host = surface.querySelector?.(`[${HOST_ATTR}="true"]`);
    if (!host) {
      host = document.createElement('section');
      host.setAttribute(HOST_ATTR, 'true');
      host.className = 'noelle-v19811c-host';

      const headerLike = Array.from(surface.children || []).find((el) => {
        const t = textOf(el);
        return /configurações|configuracoes/i.test(t) && visible(el);
      });

      if (headerLike?.nextSibling) surface.insertBefore(host, headerLike.nextSibling);
      else surface.appendChild(host);
    }
    return host;
  }

  function removeOldRuntimeArtifacts() {
    const selectors = [
      '#noelle-settings-dashboard-v19-8-11',
      '#noelle-settings-dashboard-v19-8-11a',
      '#noelle-settings-dashboard-v19-8-11b',
      '#noelle-theme-panel-v19-8-10',
      '.noelle-theme-panel-v19-8-10',
      '[data-noelle-settings-v19-8-11-panel]',
      '[data-noelle-settings-v19-8-11a-panel]',
      '[data-noelle-settings-v19-8-11b-host]'
    ];
    selectors.forEach((sel) => $$(sel).forEach((el) => {
      if (!el.closest?.(`#${DASHBOARD_ID}`)) el.remove();
    }));
  }

  function hardHideLegacyFloating(root = document) {
    try {
      $$('button, a, [role="button"], .btn, .button, div, span', root).forEach((el) => {
        const label = low(textOf(el));
        const legacy = label === 'avatar lab' || label === 'room v19';
        if (!legacy) return;
        el.classList.add('noelle-v19811c-force-hidden');
        el.setAttribute('data-noelle-legacy-floating', 'true');
        el.setAttribute('aria-hidden', 'true');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    } catch (_) {}
  }

  function hideLegacySettingsCards(root = document) {
    if (!isSettingsRoute()) return;
    const needles = [
      'visual final da noelle',
      'sem botões flutuantes antigos',
      'sem botoes flutuantes antigos',
      'tema salvo',
      'resetar interface',
      'copiar diagnóstico',
      'copiar diagnostico',
      'áudio essencial',
      'audio essencial',
      'o iniciar.bat instala',
      'tema e interface'
    ];

    $$('section, article, aside, div', root).forEach((el) => {
      if (!visible(el)) return;
      if (el.id === DASHBOARD_ID || el.closest?.(`#${DASHBOARD_ID}`)) return;
      const txt = low(textOf(el));
      const directTitle = Array.from(el.children || []).some((child) => /^(interface|tema e interface|áudio essencial|audio essencial)$/i.test(textOf(child)));
      const hits = needles.filter((needle) => txt.includes(needle)).length;
      const hasControl = !!el.querySelector?.('button, select, input, [role="button"]');
      if (directTitle || (hits >= 2 && hasControl)) {
        el.classList.add('noelle-v19811c-hidden-legacy-card');
        el.setAttribute('data-noelle-hidden-legacy-settings-card', 'true');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function enhanceGlobalButtons(root = document) {
    $$('button, a[role="button"], .btn, .button, input[type="button"], input[type="submit"]', root).forEach((el) => {
      if (el.closest?.(`#${DASHBOARD_ID}`)) return;
      const label = low(textOf(el));
      if (label === 'abrir avatar') {
        el.textContent = 'Abrir Widget';
        el.dataset.noelleButtonRole = 'widget';
      } else if (label.includes('room') || label.includes('quarto')) el.dataset.noelleButtonRole = 'room';
      else if (label.includes('widget')) el.dataset.noelleButtonRole = 'widget';
      else if (label.includes('preview') || label.includes('teste')) el.dataset.noelleButtonRole = 'preview';
      else if (label.includes('excluir') || label.includes('apagar')) el.dataset.noelleButtonRole = 'danger';
    });
  }

  function makeButton(label, role, onClick) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'noelle-v19811c-button';
    el.dataset.noelleButtonRole = role || 'secondary';
    el.textContent = label;
    el.addEventListener('click', onClick);
    return el;
  }

  function makeCard(title, subtitle, build) {
    const el = document.createElement('section');
    el.className = 'noelle-v19811c-card';
    el.innerHTML = `
      <header class="noelle-v19811c-card-head">
        <div>
          <h3>${title}</h3>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
      </header>
      <div class="noelle-v19811c-card-body"></div>
    `;
    build(el.querySelector('.noelle-v19811c-card-body'), el);
    return el;
  }

  function themeTile(id, theme) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'noelle-v19811c-theme';
    el.dataset.themeId = id;
    el.setAttribute('aria-pressed', id === currentTheme() ? 'true' : 'false');
    el.innerHTML = `
      <span class="noelle-v19811c-theme-name">${theme.name}</span>
      <span class="noelle-v19811c-theme-role">${theme.role}</span>
      <span class="noelle-v19811c-swatches">${theme.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="noelle-v19811c-theme-desc">${theme.desc}</span>
    `;
    el.addEventListener('click', () => {
      applyTheme(id);
      renderDashboard();
    });
    return el;
  }

  function detectOllamaStatus() {
    const txt = low(document.body?.innerText || '');
    if (txt.includes('ollama online')) return 'online';
    if (txt.includes('ollama offline')) return 'offline';
    return 'não detectado';
  }

  function openWidget() {
    const api = window.desktopWidget || window.noelleAPI || {};
    if (typeof api.openAvatar === 'function') return api.openAvatar();
    if (typeof api.openAvatarWidget === 'function') return api.openAvatarWidget();
    if (typeof api.openWidget === 'function') return api.openWidget();
    document.dispatchEvent(new CustomEvent('noelle:open-widget'));
  }

  function openRoom() {
    const api = window.noelleRoom || window.noelleAPI || {};
    if (typeof api.openRoom === 'function') return api.openRoom();
    if (typeof api.open === 'function') return api.open();
    document.dispatchEvent(new CustomEvent('noelle:open-room'));
  }

  function openPreview() {
    const api = window.noelleAPI || window.desktopWidget || {};
    if (typeof api.openAvatarPreviewLoadFile === 'function') return api.openAvatarPreviewLoadFile();
    if (typeof api.openAvatarLab === 'function') return api.openAvatarLab();
    document.dispatchEvent(new CustomEvent('noelle:open-avatar-preview'));
  }

  async function copyReport() {
    const report = [
      `Noelle/Yoru ${VERSION}`,
      `Tema: ${THEMES[currentTheme()]?.name || currentTheme()}`,
      `Densidade: ${currentDensity()}`,
      `Modo avatar padrão: ${currentMode()}`,
      `Ollama: ${detectOllamaStatus()}`,
      `noelleAPI: ${!!window.noelleAPI}`,
      `desktopWidget: ${!!window.desktopWidget}`,
      `noelleRoom: ${!!window.noelleRoom}`,
      `URL: ${location.href}`,
      `UserAgent: ${navigator.userAgent}`
    ].join('\n');

    try {
      await navigator.clipboard.writeText(report);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) {}
      ta.remove();
    }
  }

  function renderDashboard() {
    if (!isSettingsRoute()) {
      $(`#${DASHBOARD_ID}`)?.remove();
      return false;
    }

    removeOldRuntimeArtifacts();
    hideLegacySettingsCards(document);
    hardHideLegacyFloating(document);

    const host = ensureHost();
    if (!host) return false;

    let dashboard = document.getElementById(DASHBOARD_ID);
    if (!dashboard) {
      dashboard = document.createElement('section');
      dashboard.id = DASHBOARD_ID;
      dashboard.className = 'noelle-v19811c-dashboard';
      dashboard.setAttribute('data-noelle-settings-dashboard', 'v19.8.11c');
      host.appendChild(dashboard);
    } else if (!host.contains(dashboard)) {
      host.appendChild(dashboard);
    }

    const theme = currentTheme();
    const density = currentDensity();
    const mode = currentMode();

    dashboard.innerHTML = '';

    const hero = document.createElement('div');
    hero.className = 'noelle-v19811c-hero';
    hero.innerHTML = `
      <div>
        <span class="noelle-v19811c-kicker">Configurações Premium</span>
        <h2>Yoru Ember como base visual</h2>
        <p>Central compacta para temas, IA local, avatar, áudio e manutenção. Sem cards legados e sem overlay antigo.</p>
      </div>
      <div class="noelle-v19811c-hero-badge">
        <strong>${THEMES[theme]?.name || 'Yoru Ember'}</strong>
        <small>Ollama ${detectOllamaStatus()}</small>
      </div>
    `;
    dashboard.appendChild(hero);

    const grid = document.createElement('div');
    grid.className = 'noelle-v19811c-grid';
    dashboard.appendChild(grid);

    grid.appendChild(makeCard('Temas', 'Troque o clima visual. Yoru Ember continua sendo o padrão principal.', (body) => {
      const select = document.createElement('select');
      select.className = 'noelle-v19811c-select';
      Object.entries(THEMES).forEach(([id, item]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = item.name;
        select.appendChild(opt);
      });
      select.value = theme;
      select.addEventListener('change', () => {
        applyTheme(select.value);
        renderDashboard();
      });
      body.appendChild(select);

      const themeGrid = document.createElement('div');
      themeGrid.className = 'noelle-v19811c-theme-grid';
      Object.entries(THEMES).forEach(([id, item]) => themeGrid.appendChild(themeTile(id, item)));
      body.appendChild(themeGrid);
    }));

    grid.appendChild(makeCard('Aparência', 'Densidade visual e ajustes leves da interface.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811c-button-row';
      const labels = { compacta: 'Compacta', normal: 'Normal', confortavel: 'Confortável' };
      Object.keys(labels).forEach((id) => {
        row.appendChild(makeButton(labels[id], id === density ? 'primary' : 'secondary', () => {
          applyDensity(id);
          renderDashboard();
        }));
      });
      body.appendChild(row);
      body.appendChild(makeButton('Copiar diagnóstico', 'secondary', copyReport));
    }));

    grid.appendChild(makeCard('IA / Ollama', 'Status e ações úteis para o núcleo local.', (body) => {
      const status = document.createElement('div');
      status.className = `noelle-v19811c-status noelle-v19811c-status-${detectOllamaStatus().replace(/\s+/g, '-')}`;
      status.textContent = `Ollama: ${detectOllamaStatus()}`;
      body.appendChild(status);
      const row = document.createElement('div');
      row.className = 'noelle-v19811c-button-row';
      row.appendChild(makeButton('Testar conexão', 'secondary', () => document.dispatchEvent(new CustomEvent('noelle:test-ollama'))));
      row.appendChild(makeButton('Copiar relatório', 'primary', copyReport));
      body.appendChild(row);
    }));

    grid.appendChild(makeCard('Avatar', 'Defina destino padrão e abra os modos principais.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811c-button-row';
      row.appendChild(makeButton('Room / Quarto', mode === 'room' ? 'room' : 'secondary', () => { setDefaultMode('room'); openRoom(); renderDashboard(); }));
      row.appendChild(makeButton('Widget Mode', mode === 'widget' ? 'widget' : 'secondary', () => { setDefaultMode('widget'); openWidget(); renderDashboard(); }));
      row.appendChild(makeButton('Preview / Teste', mode === 'preview' ? 'preview' : 'secondary', () => { setDefaultMode('preview'); openPreview(); renderDashboard(); }));
      body.appendChild(row);
      body.appendChild(makeButton('Abrir Widget', 'widget', openWidget));
    }));

    grid.appendChild(makeCard('Áudio', 'Teste TTS/STT sem o iniciar.bat instalar coisas sozinho.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811c-button-row';
      row.appendChild(makeButton('Testar TTS', 'secondary', () => document.dispatchEvent(new CustomEvent('noelle:test-tts'))));
      row.appendChild(makeButton('Testar STT', 'secondary', () => document.dispatchEvent(new CustomEvent('noelle:test-stt'))));
      body.appendChild(row);
      const note = document.createElement('p');
      note.className = 'noelle-v19811c-note';
      note.textContent = 'Piper quando houver voz .onnx; fallback Windows SAPI quando necessário.';
      body.appendChild(note);
    }));

    grid.appendChild(makeCard('Sistema', 'Manutenção clara sem sobrescrever o projeto ao iniciar.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811c-button-row';
      row.appendChild(makeButton('Copiar relatório', 'primary', copyReport));
      row.appendChild(makeButton('Recarregar tela', 'secondary', () => location.reload()));
      body.appendChild(row);
      const note = document.createElement('p');
      note.className = 'noelle-v19811c-note';
      note.textContent = 'O iniciar.bat opção [1] apenas inicia. Reparos ficam nas opções separadas.';
      body.appendChild(note);
    }));

    updateState();
    return true;
  }

  function updateState() {
    const theme = currentTheme();
    const density = currentDensity();
    const mode = currentMode();
    document.documentElement.setAttribute('data-noelle-theme', theme);
    document.documentElement.setAttribute('data-noelle-density', density);
    document.documentElement.setAttribute('data-noelle-avatar-mode', mode);
    document.body?.setAttribute('data-noelle-theme', theme);
    document.body?.setAttribute('data-noelle-density', density);
    $$(`#${DASHBOARD_ID} .noelle-v19811c-theme`).forEach((el) => {
      el.setAttribute('aria-pressed', el.dataset.themeId === theme ? 'true' : 'false');
    });
  }

  function tick() {
    applyTheme(currentTheme(), false);
    applyDensity(currentDensity(), false);
    hardHideLegacyFloating(document);
    enhanceGlobalButtons(document);
    renderDashboard();
  }

  function boot() {
    tick();
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        tick();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'aria-current', 'data-active', 'hidden']
    });

    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    window.addEventListener('popstate', schedule, { passive: true });
    document.addEventListener('click', () => setTimeout(schedule, 60), true);
    setInterval(schedule, 1500);

    window.noelleConfigPremium = Object.freeze({
      version: VERSION,
      renderDashboard,
      applyTheme,
      applyDensity,
      hardHideLegacyFloating,
      robustFindSettingsSurface,
      copyReport
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
