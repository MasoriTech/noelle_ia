/*
  Noelle/Yoru V19.8.11a — Configurações Premium Reforço
  - Dashboard compacto e idempotente para Configurações.
  - Yoru Ember como tema principal.
  - Não cria overlay, não usa position: fixed e não reativa Avatar Lab / Room V19.
  - Não exibe card chamado "Interface".
*/
(() => {
  'use strict';

  if (window.__NOELLE_SETTINGS_DASHBOARD_V19811A__) return;
  window.__NOELLE_SETTINGS_DASHBOARD_V19811A__ = true;

  const VERSION = '19.8.11a-configuracoes-premium-reforco-2026';
  const DASHBOARD_ID = 'noelle-settings-dashboard-v19-8-11a';
  const OLD_DASHBOARD_IDS = [
    'noelle-settings-dashboard-v19-8-11',
    'noelle-theme-panel-v19-8-10'
  ];

  const DEFAULT_THEME = 'yoru-ember';
  const THEME_KEY = 'noelle.theme.id';
  const DENSITY_KEY = 'noelle.ui.density';
  const MODE_KEY = 'noelle.avatar.defaultMode';
  const COMPACT_KEY = 'noelle.settings.compact';

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
  const lower = (s) => norm(s).toLowerCase();
  const textOf = (el) => norm(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.('aria-label'));

  function getLS(key, fallback = '') {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }

  function setLS(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* sem storage */ }
  }

  function isTheme(id) { return Object.prototype.hasOwnProperty.call(THEMES, id); }
  function currentTheme() { return isTheme(getLS(THEME_KEY, DEFAULT_THEME)) ? getLS(THEME_KEY, DEFAULT_THEME) : DEFAULT_THEME; }
  function currentDensity() { return ['compacta', 'normal', 'confortavel'].includes(getLS(DENSITY_KEY, 'normal')) ? getLS(DENSITY_KEY, 'normal') : 'normal'; }

  function isVisible(el) {
    if (!el) return false;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function applyTheme(themeId = currentTheme(), persist = true) {
    const id = isTheme(themeId) ? themeId : DEFAULT_THEME;
    document.documentElement.setAttribute('data-noelle-theme', id);
    document.body?.setAttribute('data-noelle-theme', id);
    document.body?.classList.add('noelle-v19-8-11-ready', 'noelle-v19-8-11a-ready');
    if (persist) setLS(THEME_KEY, id);
    updatePressedStates();
    return id;
  }

  function applyDensity(density = currentDensity(), persist = true) {
    const id = ['compacta', 'normal', 'confortavel'].includes(density) ? density : 'normal';
    document.documentElement.setAttribute('data-noelle-density', id);
    document.body?.setAttribute('data-noelle-density', id);
    if (persist) setLS(DENSITY_KEY, id);
    updatePressedStates();
    return id;
  }

  function applyCompactMode(enabled = getLS(COMPACT_KEY, '0') === '1', persist = true) {
    document.body?.classList.toggle('noelle-v19811a-compact-settings', !!enabled);
    if (persist) setLS(COMPACT_KEY, enabled ? '1' : '0');
    updatePressedStates();
  }

  function updatePressedStates() {
    const theme = currentTheme();
    const density = currentDensity();
    const compact = getLS(COMPACT_KEY, '0') === '1';
    $$('[data-v19811a-theme]').forEach((el) => el.setAttribute('aria-pressed', el.dataset.v19811aTheme === theme ? 'true' : 'false'));
    $$('[data-v19811a-density]').forEach((el) => el.setAttribute('aria-pressed', el.dataset.v19811aDensity === density ? 'true' : 'false'));
    $$('[data-v19811a-theme-select]').forEach((el) => { el.value = theme; });
    $$('[data-v19811a-theme-label]').forEach((el) => { el.textContent = THEMES[theme]?.name || 'Yoru Ember'; });
    $$('[data-v19811a-compact]').forEach((el) => el.setAttribute('aria-pressed', compact ? 'true' : 'false'));
  }

  function isSettingsRoute() {
    const activeCandidates = $$('button, a, [role="button"], .active, [aria-current="page"], [data-active="true"]');
    if (activeCandidates.some((el) => /configura/i.test(textOf(el)))) return true;
    const titles = $$('h1,h2,h3,.title,.page-title,.header-title').filter(isVisible);
    if (titles.some((el) => /^configurações$|^configuracoes$/i.test(textOf(el)))) return true;
    const body = lower(document.body?.innerText || '');
    return /configurações\s*[·\-]|configuracoes\s*[·\-]/i.test(body);
  }

  function findSettingsHost() {
    const title = $$('h1,h2,h3,.title,.page-title,.header-title').find((el) => isVisible(el) && /^configurações$|^configuracoes$/i.test(textOf(el)));
    if (title) {
      let cur = title;
      for (let i = 0; i < 7 && cur.parentElement; i += 1) {
        cur = cur.parentElement;
        const r = cur.getBoundingClientRect();
        if (r.width > Math.min(520, window.innerWidth * 0.45) && r.height > Math.min(260, window.innerHeight * 0.3)) return cur;
      }
    }

    const selectors = ['main', '[role="main"]', '.content', '.page-content', '.app-content', '.workspace', '#content', '#app'];
    for (const sel of selectors) {
      const node = $(sel);
      if (node && isVisible(node)) return node;
    }
    return document.body;
  }

  function removeOldDashboards() {
    OLD_DASHBOARD_IDS.forEach((id) => $$(`#${id}`).forEach((el) => el.remove()));
    $$('[data-noelle-settings-v19-8-11-panel], .noelle-theme-panel-v19-8-10').forEach((el) => el.remove());
  }

  function hideLegacyFloating(root = document) {
    $$('button, a, [role="button"], .btn, .button, div, span', root).forEach((el) => {
      const label = lower(textOf(el));
      if (label !== 'avatar lab' && label !== 'room v19') return;
      el.classList.add('noelle-v19811-hidden-legacy');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
    });
  }

  function purgeLegacySettingsCards(root = document) {
    const needles = [
      'visual final da noelle',
      'tema e interface',
      'áudio essencial',
      'audio essencial',
      'o iniciar.bat instala',
      'o iniciar.bat agora inicia limpo',
      'sem botões flutuantes antigos',
      'sem botoes flutuantes antigos',
      'tema salvo',
      'resetar interface'
    ];
    $$('section, article, aside, div', root).forEach((el) => {
      if (!isVisible(el) || el.id === DASHBOARD_ID || el.closest?.(`#${DASHBOARD_ID}`)) return;
      const txt = lower(textOf(el));
      const directTitle = Array.from(el.children || []).some((child) => /^(interface|tema e interface|áudio essencial|audio essencial)$/i.test(textOf(child)));
      const hits = needles.filter((needle) => txt.includes(needle)).length;
      const hasControls = !!el.querySelector?.('select, button, [role="button"]');
      if (directTitle || (hits >= 2 && hasControls)) {
        el.classList.add('noelle-v19811-legacy-settings-card');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function enhanceButtons(root = document) {
    $$('button, a[role="button"], .btn, .button, input[type="button"], input[type="submit"]', root).forEach((el) => {
      if (el.closest?.(`#${DASHBOARD_ID}`)) return;
      const label = lower(textOf(el));
      el.classList.add('noelle-v19811-button');
      if (label === 'abrir avatar') {
        el.textContent = 'Abrir Widget';
        el.dataset.v19811Button = 'widget';
      } else if (label.includes('room') || label.includes('quarto')) el.dataset.v19811Button = 'room';
      else if (label.includes('widget')) el.dataset.v19811Button = 'widget';
      else if (label.includes('preview') || label.includes('teste')) el.dataset.v19811Button = 'preview';
      else if (label.includes('excluir') || label.includes('apagar')) el.dataset.v19811Button = 'danger';
      else if (label.includes('salvar') || label.includes('iniciar') || label.includes('aplicar')) el.dataset.v19811Button = 'primary';
      else el.dataset.v19811Button = 'secondary';
    });
  }

  function makeButton(label, role, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'noelle-v19811-action';
    btn.dataset.v19811Button = role || 'secondary';
    btn.textContent = label;
    btn.addEventListener('click', handler);
    return btn;
  }

  function card(title, subtitle, build) {
    const section = document.createElement('section');
    section.className = 'noelle-v19811-card';
    section.innerHTML = `
      <header class="noelle-v19811-card-head">
        <div>
          <h3>${title}</h3>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
      </header>
      <div class="noelle-v19811-card-body"></div>
    `;
    build(section.querySelector('.noelle-v19811-card-body'), section);
    return section;
  }

  function themeCard(id, theme) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'noelle-v19811-theme-card';
    btn.dataset.v19811aTheme = id;
    btn.setAttribute('aria-pressed', 'false');
    btn.innerHTML = `
      <span class="noelle-v19811-theme-title">${theme.name}</span>
      <span class="noelle-v19811-theme-role">${theme.role}</span>
      <span class="noelle-v19811-swatches">${theme.colors.map((c) => `<i style="background:${c}"></i>`).join('')}</span>
      <span class="noelle-v19811-theme-desc">${theme.desc}</span>
    `;
    btn.addEventListener('click', () => applyTheme(id));
    return btn;
  }

  function statusText() {
    const body = lower(document.body?.innerText || '');
    if (body.includes('ollama online')) return 'Online';
    if (body.includes('ollama offline')) return 'Offline';
    return 'Não detectado';
  }

  function manifestCount() {
    const m = textOf(document.body).match(/avatares:\s*(\d+)/i);
    return m ? Number(m[1]) : null;
  }

  async function copyReport() {
    const report = [
      `Noelle/Yoru Configurações ${VERSION}`,
      `Tema: ${THEMES[currentTheme()]?.name || currentTheme()}`,
      `Densidade: ${currentDensity()}`,
      `Modo avatar padrão: ${getLS(MODE_KEY, 'widget')}`,
      `Ollama: ${statusText()}`,
      `Avatares detectados: ${manifestCount() ?? 'manifest local'}`,
      `UserAgent: ${navigator.userAgent}`
    ].join('\n');
    try { await navigator.clipboard.writeText(report); }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = report;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (_) { }
      ta.remove();
    }
  }

  function installDashboard() {
    if (!isSettingsRoute()) {
      $(`#${DASHBOARD_ID}`)?.remove();
      return false;
    }

    const host = findSettingsHost();
    if (!host) return false;

    removeOldDashboards();
    purgeLegacySettingsCards(host);

    let panel = $(`#${DASHBOARD_ID}`);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = DASHBOARD_ID;
      panel.className = 'noelle-v19811-dashboard';
      panel.setAttribute('data-noelle-settings-v19-8-11a-panel', 'true');

      const title = $$('h1,h2,h3,.title,.page-title,.header-title', host).find((el) => /configura/i.test(textOf(el)));
      if (title?.parentElement && title.parentElement !== document.body) {
        title.parentElement.insertAdjacentElement('afterend', panel);
      } else {
        host.appendChild(panel);
      }
    }

    panel.innerHTML = `
      <header class="noelle-v19811-hero">
        <div>
          <span class="noelle-v19811-kicker">Yoru Ember</span>
          <h2>Configurações Premium</h2>
          <p>Painel limpo para tema, IA, avatar, áudio e sistema. Sem card Interface legado e sem botões flutuantes antigos.</p>
        </div>
        <div class="noelle-v19811-hero-badge">
          <strong data-v19811a-theme-label>${THEMES[currentTheme()]?.name || 'Yoru Ember'}</strong>
          <span>Tema ativo</span>
        </div>
      </header>
      <div class="noelle-v19811-grid"></div>
    `;

    const grid = panel.querySelector('.noelle-v19811-grid');

    grid.appendChild(card('Temas', 'Yoru Ember é o padrão principal da Yoru.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      row.innerHTML = `
        <label class="noelle-v19811-field">
          <span>Tema ativo</span>
          <select data-v19811a-theme-select>${Object.entries(THEMES).map(([id, t]) => `<option value="${id}">${t.name}</option>`).join('')}</select>
        </label>
      `;
      row.querySelector('select').value = currentTheme();
      row.querySelector('select').addEventListener('change', (e) => applyTheme(e.target.value));
      row.appendChild(makeButton('Restaurar Yoru Ember', 'primary', () => applyTheme(DEFAULT_THEME)));
      body.appendChild(row);

      const themeGrid = document.createElement('div');
      themeGrid.className = 'noelle-v19811-theme-grid';
      Object.entries(THEMES).forEach(([id, t]) => themeGrid.appendChild(themeCard(id, t)));
      body.appendChild(themeGrid);
    }));

    grid.appendChild(card('Aparência', 'Ajuste tamanho visual sem tocar no avatar.', (body) => {
      const segment = document.createElement('div');
      segment.className = 'noelle-v19811-segment';
      [
        ['compacta', 'Compacta'],
        ['normal', 'Normal'],
        ['confortavel', 'Confortável']
      ].forEach(([id, label]) => {
        const btn = makeButton(label, 'secondary', () => applyDensity(id));
        btn.dataset.v19811aDensity = id;
        segment.appendChild(btn);
      });
      body.appendChild(segment);

      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      const compactBtn = makeButton('Modo compacto da página', 'ghost', () => applyCompactMode(!(getLS(COMPACT_KEY, '0') === '1')));
      compactBtn.dataset.v19811aCompact = 'true';
      row.appendChild(compactBtn);
      row.appendChild(makeButton('Copiar diagnóstico', 'secondary', copyReport));
      body.appendChild(row);
    }));

    grid.appendChild(card('IA / Ollama', 'Estado rápido e ações de verificação.', (body) => {
      const line = document.createElement('div');
      const status = statusText();
      line.className = 'noelle-v19811-status-line';
      line.innerHTML = `<span class="${status === 'Online' ? 'is-online' : 'is-offline'}"></span><strong>Ollama:</strong> ${status}`;
      body.appendChild(line);
      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      row.appendChild(makeButton('Copiar relatório', 'secondary', copyReport));
      row.appendChild(makeButton('Status do app', 'ghost', () => $$('button,a,[role="button"]').find((el) => /status/i.test(textOf(el)))?.click()));
      body.appendChild(row);
    }));

    grid.appendChild(card('Avatar', 'Room, Widget e Preview continuam separados.', (body) => {
      const info = document.createElement('div');
      info.className = 'noelle-v19811-status-line';
      info.innerHTML = `<strong>Avatares:</strong> ${manifestCount() ?? 'manifest local'} &nbsp; <strong>Modo padrão:</strong> ${getLS(MODE_KEY, 'widget')}`;
      body.appendChild(info);

      const select = document.createElement('select');
      select.className = 'noelle-v19811-select';
      select.innerHTML = '<option value="widget">Widget Mode</option><option value="room">Room / Quarto</option><option value="preview">Preview / Teste</option>';
      select.value = getLS(MODE_KEY, 'widget');
      select.addEventListener('change', () => setLS(MODE_KEY, select.value));
      body.appendChild(select);

      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      row.appendChild(makeButton('Abrir Widget', 'widget', () => window.noelleAPI?.openAvatar?.() || window.desktopWidget?.show?.()));
      row.appendChild(makeButton('Ir para Avatar', 'preview', () => $$('button,a,[role="button"]').find((el) => /^avatar$/i.test(textOf(el)))?.click()));
      body.appendChild(row);
    }));

    grid.appendChild(card('Áudio', 'Piper quando houver voz .onnx; fallback Windows SAPI quando necessário.', (body) => {
      const line = document.createElement('div');
      line.className = 'noelle-v19811-status-line';
      line.innerHTML = '<strong>TTS/STT:</strong> teste pelo app ou terminal.';
      body.appendChild(line);
      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      row.appendChild(makeButton('Testar TTS', 'secondary', () => window.noelleAPI?.testTTS?.()));
      row.appendChild(makeButton('Recarregar assets', 'secondary', () => window.noelleAPI?.reloadAssets?.()));
      body.appendChild(row);
    }));

    grid.appendChild(card('Sistema', 'Manutenção manual. O iniciar.bat opção [1] continua só iniciando.', (body) => {
      const row = document.createElement('div');
      row.className = 'noelle-v19811-row';
      row.appendChild(makeButton('Copiar diagnóstico', 'secondary', copyReport));
      row.appendChild(makeButton('Reset visual local', 'ghost', () => {
        setLS(THEME_KEY, DEFAULT_THEME);
        setLS(DENSITY_KEY, 'normal');
        setLS(COMPACT_KEY, '0');
        applyTheme(DEFAULT_THEME);
        applyDensity('normal');
        applyCompactMode(false);
      }));
      body.appendChild(row);
      const note = document.createElement('p');
      note.className = 'noelle-v19811-note';
      note.textContent = 'Reparos e builds ficam no menu do iniciar.bat, separados de iniciar o programa.';
      body.appendChild(note);
    }));

    updatePressedStates();
    enhanceButtons(panel);
    return true;
  }

  function refresh() {
    applyTheme(currentTheme(), false);
    applyDensity(currentDensity(), false);
    applyCompactMode(getLS(COMPACT_KEY, '0') === '1', false);
    hideLegacyFloating(document);
    enhanceButtons(document);
    if (isSettingsRoute()) installDashboard();
    else $(`#${DASHBOARD_ID}`)?.remove();
  }

  function boot() {
    refresh();
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        refresh();
      });
    };

    new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('hashchange', schedule, { passive: true });
    document.addEventListener('click', () => setTimeout(schedule, 60), true);

    window.noelleSettings = Object.freeze({
      version: VERSION,
      installDashboard,
      applyTheme,
      applyDensity,
      themes: THEMES,
      copyReport
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
