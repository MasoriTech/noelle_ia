/*
  Noelle/Yoru V19.8.10 — Theme Manager
  Tema principal: Yoru Ember.
  Este runtime não cria overlays. Ele apenas aplica tema, reforça botões e instala painel dentro de Configurações quando existir.
*/
(() => {
  'use strict';

  const VERSION = '19.8.10-yoru-ember-themes-2026';
  const DEFAULT_THEME = 'yoru-ember';
  const STORAGE_KEY = 'noelle.theme.id';
  const STORAGE_VERSION_KEY = 'noelle.theme.version';
  const PANEL_ID = 'noelle-theme-panel-v19-8-10';

  const THEMES = Object.freeze({
    'yoru-ember': {
      id: 'yoru-ember',
      name: 'Yoru Ember',
      role: 'Tema principal da Yoru',
      description: 'Preto carvão, grafite, laranja brasa e vermelho fogo.',
      swatches: ['#080706', '#1B1713', '#FF7A1A', '#E13B1A']
    },
    'noelle-noir': {
      id: 'noelle-noir',
      name: 'Noelle Noir',
      role: 'Tema principal da Noelle',
      description: 'Preto, vermelho vinho e branco premium.',
      swatches: ['#07070A', '#17151A', '#E83D68', '#8B1E3F']
    },
    'yoru-midnight': {
      id: 'yoru-midnight',
      name: 'Yoru Midnight',
      role: 'Escuro elegante',
      description: 'Azul noite, violeta e energia calma.',
      swatches: ['#050713', '#11182B', '#6C8CFF', '#8A5CFF']
    },
    'sakura-dark': {
      id: 'sakura-dark',
      name: 'Sakura Dark',
      role: 'Anime suave',
      description: 'Rosa sakura, lilás e fundo escuro.',
      swatches: ['#0B0710', '#201727', '#FF79B7', '#B86BFF']
    },
    'cyber-violet': {
      id: 'cyber-violet',
      name: 'Cyber Violet',
      role: 'Gamer/futurista',
      description: 'Roxo neon, azul elétrico e preto.',
      swatches: ['#06030D', '#1A102B', '#A855F7', '#22D3EE']
    },
    'crimson-glass': {
      id: 'crimson-glass',
      name: 'Crimson Glass',
      role: 'Premium/glass',
      description: 'Vidro escuro, vermelho cristal e contraste alto.',
      swatches: ['#050505', '#201C22', '#FF3F5E', '#B11232']
    },
    'forest-spirit': {
      id: 'forest-spirit',
      name: 'Forest Spirit',
      role: 'Uso longo/descanso',
      description: 'Verde escuro, musgo e dourado suave.',
      swatches: ['#06100B', '#132419', '#4ADE80', '#D6B56D']
    },
    'light-pearl': {
      id: 'light-pearl',
      name: 'Light Pearl',
      role: 'Claro opcional',
      description: 'Tema claro suave para leitura e ajustes.',
      swatches: ['#F8F5F1', '#FFFFFF', '#D35428', '#9F2E1C']
    }
  });

  const BUTTON_RULES = [
    { role: 'danger', words: ['excluir', 'apagar', 'deletar', 'remover permanente', 'permanentemente', 'resetar tudo'] },
    { role: 'room', words: ['room', 'quarto'] },
    { role: 'widget', words: ['widget', 'abrir avatar', 'abrir widget'] },
    { role: 'preview', words: ['preview', 'teste', 'avatar lab', 'loadfile'] },
    { role: 'primary', words: ['iniciar', 'salvar', 'aplicar', 'enviar', 'confirmar', 'baixar', 'gerar', 'regenerar'] },
    { role: 'ghost', words: ['fechar', 'voltar', 'cancelar', 'status', 'diagnóstico', 'diagnostico', 'reset câmera', 'reset camera'] },
    { role: 'secondary', words: ['configurações', 'configuracoes', 'sobre', 'copiar', 'testar', 'verificar'] }
  ];

  function safeLocalStorageGet(key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  }

  function safeLocalStorageSet(key, value) {
    try { window.localStorage.setItem(key, value); } catch (_) { /* sem storage, segue em memória */ }
  }

  function normalizeThemeId(id) {
    return Object.prototype.hasOwnProperty.call(THEMES, id) ? id : DEFAULT_THEME;
  }

  function getCurrentThemeId() {
    const attr = document.documentElement.getAttribute('data-noelle-theme') || document.body?.getAttribute('data-noelle-theme');
    return normalizeThemeId(attr || safeLocalStorageGet(STORAGE_KEY) || DEFAULT_THEME);
  }

  function updateMetaThemeColor(themeId) {
    const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head?.appendChild(meta);
    }
    meta.setAttribute('content', theme.swatches[0]);
  }

  function markActiveTheme(themeId) {
    document.querySelectorAll('.noelle-theme-card-v19-8-10').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.themeId === themeId ? 'true' : 'false');
    });
    document.querySelectorAll('[data-noelle-theme-select]').forEach((select) => {
      select.value = themeId;
    });
    document.querySelectorAll('[data-noelle-theme-badge]').forEach((badge) => {
      const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
      badge.textContent = `Tema ativo: ${theme.name}`;
    });
  }

  function applyTheme(id, options = {}) {
    const themeId = normalizeThemeId(id);
    const persist = options.persist !== false;

    document.documentElement.setAttribute('data-noelle-theme', themeId);
    if (document.body) {
      document.body.setAttribute('data-noelle-theme', themeId);
      document.body.classList.add('noelle-theme-ready');
      document.body.classList.toggle('noelle-theme-yuru-ember-main', themeId === DEFAULT_THEME);
    }

    if (persist) {
      safeLocalStorageSet(STORAGE_KEY, themeId);
      safeLocalStorageSet(STORAGE_VERSION_KEY, VERSION);
    }

    updateMetaThemeColor(themeId);
    markActiveTheme(themeId);
    enhanceButtons(document);

    window.dispatchEvent(new CustomEvent('noelle-theme-changed', {
      detail: { themeId, theme: THEMES[themeId], version: VERSION }
    }));

    return themeId;
  }

  function textOf(el) {
    return String(el?.innerText || el?.textContent || el?.value || el?.getAttribute?.('aria-label') || '').trim().toLowerCase();
  }

  function roleForButton(el) {
    const existing = el.getAttribute?.('data-noelle-button-role');
    if (existing) return existing;
    const t = textOf(el);
    for (const rule of BUTTON_RULES) {
      if (rule.words.some((word) => t.includes(word))) return rule.role;
    }
    return 'secondary';
  }

  function enhanceButton(el) {
    if (!el || el.dataset?.noelleThemeRaw === 'true') return;
    const tag = el.tagName?.toLowerCase();
    const isButton = tag === 'button' || tag === 'a' || tag === 'input' || el.getAttribute?.('role') === 'button' || el.classList?.contains('btn') || el.classList?.contains('button');
    if (!isButton) return;

    const role = roleForButton(el);
    el.classList.add('noelle-theme-button');
    el.setAttribute('data-noelle-button-role', role);
    el.classList.remove('noelle-btn-primary', 'noelle-btn-secondary', 'noelle-btn-ghost', 'noelle-btn-danger', 'noelle-btn-room', 'noelle-btn-widget', 'noelle-btn-preview');
    el.classList.add(`noelle-btn-${role}`);

    const label = textOf(el);
    if (label === 'abrir avatar') {
      if (tag === 'input') el.value = 'Abrir Widget';
      else el.textContent = 'Abrir Widget';
      el.setAttribute('data-noelle-button-role', 'widget');
      el.classList.remove(`noelle-btn-${role}`);
      el.classList.add('noelle-btn-widget');
    }
  }

  function enhanceButtons(root = document) {
    try {
      root.querySelectorAll?.('button, a[role="button"], .btn, .button, input[type="button"], input[type="submit"]').forEach(enhanceButton);
    } catch (_) { /* DOM parcial */ }
  }

  function hideLegacyFloating(root = document) {
    const candidates = [];
    try {
      root.querySelectorAll?.('button, a, [role="button"], .btn, .button, div, span').forEach((el) => {
        const label = textOf(el);
        if (label === 'avatar lab' || label === 'room v19') candidates.push(el);
      });
    } catch (_) { return; }

    candidates.forEach((el) => {
      const style = window.getComputedStyle(el);
      const floating = style.position === 'fixed' || style.position === 'absolute' || el.closest?.('[style*="position: fixed"], [style*="position:fixed"], [style*="position: absolute"], [style*="position:absolute"]');
      if (floating || textOf(el) === 'avatar lab' || textOf(el) === 'room v19') {
        el.setAttribute('data-noelle-legacy-floating', 'true');
        el.classList.add('noelle-legacy-floating');
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      }
    });
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findSettingsContainer() {
    const selectors = [
      '[data-page="settings"]',
      '[data-page="config"]',
      '[data-route="settings"]',
      '.settings-page',
      '.page-settings',
      '#settings',
      '#configuracoes',
      'main',
      '.content',
      '.page',
      'section'
    ];

    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector)).filter(isVisible);
      const match = nodes.find((node) => /configura|settings/i.test(node.innerText || ''));
      if (match) return match;
    }

    const headings = Array.from(document.querySelectorAll('h1,h2,h3')).filter((h) => /configura|settings/i.test(h.textContent || '') && isVisible(h));
    const heading = headings[0];
    if (heading) return heading.closest('main, section, .page, .content, div') || heading.parentElement;
    return null;
  }

  function createThemeCard(theme) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'noelle-theme-card-v19-8-10';
    card.dataset.themeId = theme.id;
    card.setAttribute('aria-pressed', 'false');
    card.setAttribute('data-noelle-button-role', theme.id === DEFAULT_THEME ? 'primary' : 'secondary');
    card.innerHTML = `
      <strong>${theme.name}</strong>
      <div class="noelle-theme-swatches-v19-8-10" aria-hidden="true">
        ${theme.swatches.map((color) => `<span class="noelle-theme-swatch-v19-8-10" style="background:${color}"></span>`).join('')}
      </div>
      <small>${theme.role}</small>
      <p>${theme.description}</p>
    `;
    card.addEventListener('click', () => applyTheme(theme.id));
    return card;
  }

  function installThemePanel() {
    const settingsContainer = findSettingsContainer();
    if (!settingsContainer) return false;

    document.querySelectorAll(`#${PANEL_ID}`).forEach((panel, index) => {
      if (index > 0 || !settingsContainer.contains(panel)) panel.remove();
    });

    if (settingsContainer.querySelector(`#${PANEL_ID}`)) {
      markActiveTheme(getCurrentThemeId());
      return true;
    }

    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'noelle-theme-panel-v19-8-10';
    panel.setAttribute('data-noelle-card', 'true');
    panel.innerHTML = `
      <h3>Temas oficiais Noelle/Yoru</h3>
      <p><strong>Yoru Ember</strong> é o tema principal da Yoru: escuro, quente, com brasa e contraste forte. Escolha outro tema quando quiser mudar o clima visual.</p>
      <div class="noelle-theme-compact-controls-v19-8-10">
        <label>
          Tema ativo<br>
          <select data-noelle-theme-select aria-label="Selecionar tema Noelle/Yoru">
            ${Object.values(THEMES).map((theme) => `<option value="${theme.id}">${theme.name}</option>`).join('')}
          </select>
        </label>
        <button type="button" data-noelle-theme-reset data-noelle-button-role="primary">Restaurar Yoru Ember</button>
        <span class="noelle-theme-active-badge-v19-8-10" data-noelle-theme-badge>Tema ativo: Yoru Ember</span>
      </div>
      <div class="noelle-theme-grid-v19-8-10" data-noelle-theme-grid></div>
    `;

    const grid = panel.querySelector('[data-noelle-theme-grid]');
    Object.values(THEMES).forEach((theme) => grid.appendChild(createThemeCard(theme)));

    panel.querySelector('[data-noelle-theme-select]').addEventListener('change', (event) => applyTheme(event.target.value));
    panel.querySelector('[data-noelle-theme-reset]').addEventListener('click', () => applyTheme(DEFAULT_THEME));

    const firstConfigCard = Array.from(settingsContainer.children).find((child) => isVisible(child) && child.id !== PANEL_ID);
    if (firstConfigCard?.nextSibling) settingsContainer.insertBefore(panel, firstConfigCard.nextSibling);
    else settingsContainer.appendChild(panel);

    enhanceButtons(panel);
    markActiveTheme(getCurrentThemeId());
    return true;
  }

  function boot() {
    applyTheme(safeLocalStorageGet(STORAGE_KEY) || DEFAULT_THEME, { persist: false });
    enhanceButtons(document);
    hideLegacyFloating(document);
    installThemePanel();

    let scheduled = false;
    const scheduleRefresh = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        applyTheme(getCurrentThemeId(), { persist: false });
        enhanceButtons(document);
        hideLegacyFloating(document);
        installThemePanel();
      });
    };

    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('resize', scheduleRefresh, { passive: true });
    window.addEventListener('hashchange', scheduleRefresh, { passive: true });
    document.addEventListener('click', () => setTimeout(scheduleRefresh, 40), true);

    window.noelleTheme = Object.freeze({
      version: VERSION,
      defaultTheme: DEFAULT_THEME,
      themes: THEMES,
      getCurrentThemeId,
      applyTheme,
      enhanceButtons,
      installThemePanel,
      hideLegacyFloating
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
