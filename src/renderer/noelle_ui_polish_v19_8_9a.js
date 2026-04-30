(() => {
  "use strict";

  const VERSION = "V19.8.9a";
  const SETTINGS_KEY = "noelle.v19.8.9.settings";
  const LEGACY_LABELS = ["Avatar Lab", "Room V19"];
  const OLD_RUNTIME_MARKERS = [
    "noelle_ui_polish_v19_8_9.js",
    "noelle_avatar_resize_guard_v19_8_3",
    "noelle_avatar_route_guard_v19_8_4",
    "noelle_avatar_overlay_killer_v19_8_5",
    "noelle_avatar_overlay_launcher_killer_v19_8_6"
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const safeText = (el) => String(el?.innerText || el?.textContent || "").replace(/\s+/g, " ").trim();

  let scheduled = false;
  let settingsRenderedAt = 0;

  function log(...args) {
    if (localStorage.getItem("noelle.debug.ui") === "1") console.debug(`[Noelle ${VERSION}]`, ...args);
  }

  function readSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch { return {}; }
  }

  function saveSettings(patch) {
    const next = { ...readSettings(), ...patch, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch {}
    return next;
  }

  function applyTheme(theme) {
    const normalized = theme || readSettings().theme || "pbv";
    document.body.classList.remove("theme-noelle", "theme-pbv", "theme-dark", "theme-light", "theme-noelle-pbv");
    if (normalized === "pbv") document.body.classList.add("theme-pbv", "theme-noelle-pbv");
    else document.body.classList.add(`theme-${normalized}`);
    document.body.dataset.noelleTheme = normalized;
    saveSettings({ theme: normalized });
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden";
  }

  function isLegacyLabel(text) {
    return LEGACY_LABELS.some((label) => text === label || text.includes(label));
  }

  function isButtonish(el) {
    if (!el || !el.matches) return false;
    if (el.matches('button, a, [role="button"], [onclick], .btn, .button, .pill, .chip')) return true;
    const s = getComputedStyle(el);
    return s.cursor === "pointer";
  }

  function hasLegacyIdOrClass(el) {
    const idClass = `${el?.id || ""} ${typeof el?.className === "string" ? el.className : ""}`.toLowerCase();
    return idClass.includes("avatar-lab") || idClass.includes("avatar_lab") || idClass.includes("room-v19") || idClass.includes("room_v19") || idClass.includes("floating-avatar") || idClass.includes("floating-room");
  }

  function findLauncherAncestor(el) {
    let cur = el;
    for (let i = 0; cur && i < 6; i += 1, cur = cur.parentElement) {
      const text = safeText(cur);
      const r = cur.getBoundingClientRect?.();
      const area = r ? r.width * r.height : 0;
      const s = cur.nodeType === 1 ? getComputedStyle(cur) : null;
      const fixedLike = s && ["fixed", "absolute", "sticky"].includes(s.position);
      if (hasLegacyIdOrClass(cur)) return cur;
      if (isLegacyLabel(text) && (isButtonish(cur) || fixedLike || area < 90000)) return cur;
    }
    return null;
  }

  function removeLegacyElement(el) {
    if (!el || el.dataset?.noelleV1989aKilled === "1") return;
    try { el.dataset.noelleV1989aKilled = "1"; } catch {}
    el.classList?.add("noelle-v1989a-hidden-legacy");
    try { el.setAttribute("aria-hidden", "true"); } catch {}
    try { el.style.setProperty("display", "none", "important"); } catch {}
    try { el.style.setProperty("visibility", "hidden", "important"); } catch {}
    try { el.style.setProperty("pointer-events", "none", "important"); } catch {}
    // Para overlays fixed/absolute, remover do DOM é mais seguro: eles não deixam camada invisível por cima.
    try {
      const s = getComputedStyle(el);
      if (["fixed", "absolute"].includes(s.position) || hasLegacyIdOrClass(el)) {
        el.remove();
      }
    } catch {}
  }

  function killLegacyOverlays(root = document) {
    // Seletores por id/class cobrem a maioria dos botões antigos.
    const selector = [
      '[id*="avatar-lab" i]', '[class*="avatar-lab" i]',
      '[id*="avatar_lab" i]', '[class*="avatar_lab" i]',
      '[id*="room-v19" i]', '[class*="room-v19" i]',
      '[id*="room_v19" i]', '[class*="room_v19" i]',
      '.noelle-floating-avatar-lab', '.noelle-floating-room-v19',
      '#noelle-room-v19-canonical-button', '#noelle-avatar-lab-canonical-button'
    ].join(',');
    for (const el of $$(selector, root)) removeLegacyElement(el);

    // Busca por texto exato sem apagar containers grandes.
    const nodes = $$('button, a, [role="button"], [onclick], .pill, .chip, div, span, section', root);
    for (const node of nodes) {
      if (!isVisible(node) && !hasLegacyIdOrClass(node)) continue;
      const text = safeText(node);
      if (!isLegacyLabel(text)) continue;
      const target = findLauncherAncestor(node) || node;
      removeLegacyElement(target);
    }
  }

  function removeOldRuntimeTags() {
    for (const script of $$('script[src], link[href]')) {
      const src = script.getAttribute('src') || script.getAttribute('href') || '';
      if (OLD_RUNTIME_MARKERS.some((marker) => src.includes(marker))) removeLegacyElement(script);
    }
  }

  function renameOpenAvatarButtons(root = document) {
    for (const el of $$('button, a, [role="button"]', root)) {
      if (!isVisible(el)) continue;
      const text = safeText(el);
      if (text === "Abrir avatar" || text === "Abrir janela do avatar") {
        el.textContent = "Abrir Widget";
        el.title = "Abre o avatar em modo widget/flutuante. Room e Preview ficam na aba Avatar.";
      }
    }
  }

  function currentPageName() {
    const active = $('.nav-item.active, [data-target].active, [data-page].active, [aria-selected="true"]');
    const text = safeText(active).toLowerCase();
    const target = active?.dataset?.target || active?.dataset?.page || active?.getAttribute?.('data-page') || active?.getAttribute?.('data-target');
    if (target) return String(target).toLowerCase();
    if (text.includes('config')) return 'settings';
    if (text.includes('avatar')) return 'avatar';
    if (text.includes('chat')) return 'chat';
    const title = safeText($('#topTitle') || $('header h1') || $('main h1') || $('h1')).toLowerCase();
    if (title.includes('config')) return 'settings';
    if (title.includes('avatar')) return 'avatar';
    return 'unknown';
  }

  function findSettingsPage() {
    const direct = $('[data-page="settings"], [data-page="configuracoes"], .page.settings, #settingsPage, #settings, #configuracoes');
    if (direct && isVisible(direct)) return direct;
    const candidates = $$('main section, main div, .content section, .content div, [class*="content"] section, [class*="page"]')
      .filter((el) => /Tema e interface|Áudio essencial|Configurações|Audio essencial|Interface/i.test(safeText(el)))
      .filter((el) => el.querySelector?.('button, select') && isVisible(el));
    return candidates.sort((a, b) => Math.abs((a.getBoundingClientRect().width || 0) - (b.getBoundingClientRect().width || 0))).pop() || null;
  }

  async function getStatus() {
    try {
      if (!window.noelleAPI?.status) return null;
      return await window.noelleAPI.status();
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  function buildReport(status) {
    const lines = [];
    lines.push(`Noelle ${VERSION}`);
    lines.push(`Tema: ${readSettings().theme || 'pbv'}`);
    lines.push(`Página: ${currentPageName()}`);
    lines.push(`Viewport: ${window.innerWidth}x${window.innerHeight}`);
    if (status) {
      lines.push(`Ollama: ${status?.ollama?.ok ? 'online' : 'offline/indisponível'}`);
      if (status?.ollama?.model) lines.push(`Modelo: ${status.ollama.model}`);
      if (status?.error) lines.push(`Erro: ${status.error}`);
    } else {
      lines.push("Status API: não consultado");
    }
    return lines.join("\n");
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
    return true;
  }

  function setStatusPill(root, status) {
    const pill = $('[data-v1989a-ollama-pill]', root);
    if (!pill) return;
    const dot = $('.noelle-v1989a-dot', pill);
    const label = $('span', pill);
    const ok = !!status?.ollama?.ok;
    if (dot) dot.classList.toggle('ok', ok);
    if (label) label.textContent = ok ? 'Ollama online' : 'Ollama offline';
  }

  function renderSettingsPage() {
    const page = findSettingsPage();
    if (!page) return;
    const now = Date.now();
    if (page.dataset.noelleV1989aSettings === 'ready' && now - settingsRenderedAt < 8000) return;
    settingsRenderedAt = now;
    page.dataset.noelleV1989aSettings = 'ready';
    page.classList.add('noelle-v1989a-settings-page');
    const settings = readSettings();
    page.innerHTML = `
      <div class="noelle-v1989a-settings">
        <section class="noelle-v1989a-card">
          <h2>Interface</h2>
          <p>Visual final da Noelle, sem botões flutuantes antigos e com tema salvo.</p>
          <label class="noelle-v1989a-label">Tema</label>
          <select data-v1989a-theme>
            <option value="pbv">Preto / Vermelho / Branco</option>
            <option value="noelle">Noelle roxo</option>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
          </select>
          <div class="noelle-v1989a-grid-small top-gap">
            <button class="noelle-v1989a-btn" data-v1989a-reset-ui>Resetar interface</button>
            <button class="noelle-v1989a-btn" data-v1989a-copy-report>Copiar diagnóstico</button>
          </div>
        </section>
        <section class="noelle-v1989a-card">
          <h2>IA / Ollama</h2>
          <p>Status claro para não parecer travado quando o servidor local estiver fechado.</p>
          <span class="noelle-v1989a-status-pill" data-v1989a-ollama-pill><i class="noelle-v1989a-dot"></i><span>Verificando Ollama...</span></span>
          <div class="noelle-v1989a-grid-small top-gap">
            <button class="noelle-v1989a-btn primary" data-v1989a-test-ollama>Testar conexão</button>
            <button class="noelle-v1989a-btn" data-v1989a-refresh-assets>Recarregar assets</button>
          </div>
          <p class="muted" data-v1989a-ollama-detail>Ollama usa 127.0.0.1:11434 quando configurado localmente.</p>
        </section>
        <section class="noelle-v1989a-card">
          <h2>Avatar</h2>
          <p>A aba Avatar é o seletor visual. Widget, Room e Preview ficam separados.</p>
          <div class="noelle-v1989a-grid-small">
            <button class="noelle-v1989a-btn primary" data-v1989a-open-widget>Abrir Widget</button>
            <button class="noelle-v1989a-btn" data-v1989a-open-room>Abrir Room / Quarto</button>
            <button class="noelle-v1989a-btn" data-v1989a-open-preview>Preview LoadFile</button>
            <button class="noelle-v1989a-btn" data-v1989a-avatar-tab>Ir para aba Avatar</button>
          </div>
          <p class="muted">Atalhos flutuantes legados foram bloqueados.</p>
        </section>
        <section class="noelle-v1989a-card">
          <h2>Áudio</h2>
          <p>O áudio usa Piper quando houver voz .onnx configurada. Se não houver, pode usar fallback Windows SAPI.</p>
          <div class="noelle-v1989a-grid-small">
            <button class="noelle-v1989a-btn primary" data-v1989a-test-tts>Testar TTS</button>
            <button class="noelle-v1989a-btn" data-v1989a-audio-status>Status de áudio</button>
          </div>
          <p class="muted" data-v1989a-audio-detail>Aguardando teste.</p>
        </section>
        <section class="noelle-v1989a-card noelle-v1989a-wide">
          <h2>Sistema / Diagnóstico</h2>
          <p>Resumo rápido do estado atual da Noelle.</p>
          <pre class="noelle-v1989a-report" data-v1989a-report>Carregando relatório...</pre>
        </section>
      </div>`;

    const themeSelect = $('[data-v1989a-theme]', page);
    if (themeSelect) {
      themeSelect.value = settings.theme || 'pbv';
      themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
    }
    $('[data-v1989a-reset-ui]', page)?.addEventListener('click', () => {
      localStorage.removeItem(SETTINGS_KEY);
      applyTheme('pbv');
      updateReport(page);
    });
    $('[data-v1989a-copy-report]', page)?.addEventListener('click', async () => {
      const report = $('[data-v1989a-report]', page)?.textContent || buildReport(await getStatus());
      await copyText(report);
      const target = $('[data-v1989a-report]', page);
      if (target) target.textContent = `${report}\n\n[OK] Relatório copiado.`;
    });
    $('[data-v1989a-test-ollama]', page)?.addEventListener('click', async () => {
      const status = await getStatus();
      setStatusPill(page, status);
      const detail = $('[data-v1989a-ollama-detail]', page);
      if (detail) detail.textContent = status?.ollama?.ok ? 'Ollama respondeu. Chat IA pode usar o modelo local.' : (status?.ollama?.error || 'Ollama offline ou indisponível.');
      updateReport(page, status);
    });
    $('[data-v1989a-refresh-assets]', page)?.addEventListener('click', async () => updateReport(page, await getStatus()));
    $('[data-v1989a-open-widget]', page)?.addEventListener('click', () => window.noelleAPI?.openAvatar?.());
    $('[data-v1989a-open-room]', page)?.addEventListener('click', () => window.noelleRoom?.open?.());
    $('[data-v1989a-open-preview]', page)?.addEventListener('click', () => window.noelleAPI?.openAvatarPreviewLoadFile?.({ source: 'settings' }));
    $('[data-v1989a-avatar-tab]', page)?.addEventListener('click', () => {
      const avatarNav = $('[data-target="avatar"], [data-page-target="avatar"], [data-page="avatar"]');
      avatarNav?.click?.();
    });
    $('[data-v1989a-test-tts]', page)?.addEventListener('click', () => {
      const detail = $('[data-v1989a-audio-detail]', page);
      if (window.noelleAPI?.speak) {
        window.noelleAPI.speak('Teste de voz da Noelle concluído.');
        if (detail) detail.textContent = 'Comando de TTS enviado.';
      } else if (detail) detail.textContent = 'API de TTS não disponível no preload.';
    });
    $('[data-v1989a-audio-status]', page)?.addEventListener('click', () => {
      const detail = $('[data-v1989a-audio-detail]', page);
      if (detail) detail.textContent = window.noelleAPI?.speak ? 'TTS disponível via preload.' : 'TTS não disponível.';
    });
    applyTheme(settings.theme || 'pbv');
    updateReport(page);
  }

  async function updateReport(root, status = null) {
    const report = $('[data-v1989a-report]', root);
    if (!report) return;
    const current = status || await getStatus();
    report.textContent = buildReport(current);
    setStatusPill(root, current);
  }

  function enhanceExistingText() {
    const replacements = new Map([
      ['O INICIAR.bat instala STT/TTS. O app usa Piper quando houver voz .onnx e fallback Windows SAPI quando não houver.', 'O áudio usa Piper quando houver voz .onnx configurada. Se não houver, usa fallback Windows SAPI. Use Testar TTS para verificar.'],
      ['A opção 1 do INICIAR.bat verifica dependências, TTS/STT, Ollama, modelo e assets antes de abrir.', 'A opção 1 do iniciar.bat abre a Noelle sem aplicar reparos. Diagnóstico e manutenção ficam nas outras opções do menu.']
    ]);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let value = node.nodeValue || '';
      for (const [from, to] of replacements) value = value.replace(from, to);
      if (value !== node.nodeValue) node.nodeValue = value;
    }
  }

  function tick() {
    scheduled = false;
    removeOldRuntimeTags();
    killLegacyOverlays();
    renameOpenAvatarButtons();
    enhanceExistingText();
    if (currentPageName() === 'settings') renderSettingsPage();
  }

  function scheduleTick() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(tick);
  }

  function boot() {
    if (window.__NOELLE_V1989A_UI_POLISH__) return;
    window.__NOELLE_V1989A_UI_POLISH__ = true;
    applyTheme(readSettings().theme || 'pbv');
    tick();
    const observer = new MutationObserver(scheduleTick);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'id'] });
    window.addEventListener('resize', () => {
      document.body.dataset.noelleViewport = `${window.innerWidth}x${window.innerHeight}`;
      scheduleTick();
    });
    window.addEventListener('click', () => setTimeout(scheduleTick, 0), true);
    setInterval(scheduleTick, 700);
    log('UI polish reforçado ativo');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
