"use strict";
// NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP

/*
  Noelle/Yoru V19.8.30c — Stream Tab Recover
  Corrige aba Stream sumida após V19.8.30b.
  Não liga microfone.
  Não chama STT/Ollama/TTS.
*/

(() => {
  const VERSION = "19.8.30c-stream-tab-recover-2026";

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function findNavParent() {
    const streamExisting = qs('[data-target="stream"]');
    if (streamExisting && streamExisting.parentElement) return streamExisting.parentElement;

    const known =
      qs('[data-target="avatar"]') ||
      qs('[data-target="settings"]') ||
      qs('[data-target="chat"]') ||
      qs('[data-target="about"]');

    if (known && known.parentElement) return known.parentElement;

    return qs(".side-nav") || qs(".nav") || qs("nav") || null;
  }

  function makeButton(parent) {
    const ref =
      qs('[data-target="avatar"]') ||
      qs('[data-target="settings"]') ||
      qs('[data-target="about"]') ||
      qs('[data-target]');

    const btn = document.createElement(ref?.tagName?.toLowerCase() === "a" ? "a" : "button");

    if (ref) btn.className = ref.className || "nav-item";
    else btn.className = "nav-item";

    if (btn.tagName.toLowerCase() === "button") btn.type = "button";
    else btn.href = "#stream";

    btn.dataset.target = "stream";
    btn.setAttribute("data-noelle-stream-tab-v19-8-30c", "true");

    if (ref && ref.children && ref.children.length >= 2) {
      btn.innerHTML = '<span>◌</span><span>Stream</span>';
    } else {
      btn.textContent = "Stream";
    }

    const about = parent.querySelector('[data-target="about"]');
    if (about) parent.insertBefore(btn, about);
    else parent.appendChild(btn);

    return btn;
  }

  function ensureNav() {
    let btn = qs('[data-target="stream"]');
    if (btn) return btn;

    const parent = findNavParent();
    if (!parent) return null;

    btn = makeButton(parent);
    return btn;
  }

  function fallbackPageHtml() {
    return `
      <div class="stream-v19829-shell">
        <section class="stream-v19829-hero">
          <div>
            <p class="eyebrow">Stream IA · Recuperação V19.8.30c</p>
            <h2>Aba Stream</h2>
            <p class="muted">A aba Stream foi recuperada. O microfone só liga pelo botão Iniciar escuta.</p>
          </div>
          <div class="stream-v19829-state-card">
            <span id="streamStatePill" class="stream-v19829-pill" data-state="idle">Parado</span>
            <small id="streamStateDetail">Microfone desligado.</small>
          </div>
        </section>
        <section class="stream-v19829-grid">
          <article class="stream-v19829-card">
            <h3>Controle</h3>
            <div class="stream-v19829-actions">
              <button id="streamStartBtn" type="button" class="primary">Iniciar escuta</button>
              <button id="streamStopBtn" type="button">Parar escuta</button>
              <button id="streamMuteBtn" type="button">Mute voz: não</button>
              <button id="streamClearBtn" type="button">Limpar</button>
            </div>
            <div class="stream-v19829-meter"><div id="streamFakeMeterBar"></div></div>
            <p class="stream-v19829-note">V19.8.30d: microfone por botão ativo. Transcrição, resposta da IA e voz ficam para fases futuras.</p>
          </article>
          <article class="stream-v19829-card">
            <h3>Teste StreamGuard</h3>
            <textarea id="streamManualTranscript" class="stream-v19829-textarea" rows="4" placeholder="Noelle, qual é o próximo passo?"></textarea>
            <div class="stream-v19829-actions">
              <button id="streamCheckGuardBtn" type="button" class="primary">Testar regra</button>
              <button id="streamUseExampleBtn" type="button">Exemplo</button>
            </div>
          </article>
        </section>
        <section class="stream-v19829-grid">
          <article class="stream-v19829-card">
            <h3>Você disse</h3>
            <div id="streamLastTranscript" class="stream-v19829-box">Nenhuma fala ainda.</div>
          </article>
          <article class="stream-v19829-card">
            <h3>Resposta futura</h3>
            <div id="streamFutureAnswer" class="stream-v19829-box">A IA ainda não responde nesta fase.</div>
          </article>
        </section>
        <section class="stream-v19829-card">
          <h3>Log da Stream</h3>
          <div id="streamLog" class="stream-v19829-log"><p class="muted">Aba recuperada.</p></div>
        </section>
      </div>
    `;
  }

  function findPagesRoot() {
    const stream = qs('.page[data-page="stream"]');
    if (stream && stream.parentElement) return stream.parentElement;

    const known =
      qs('.page[data-page="avatar"]') ||
      qs('.page[data-page="settings"]') ||
      qs('.page[data-page="chat"]') ||
      qs('.page[data-page="about"]');

    if (known && known.parentElement) return known.parentElement;

    return qs("main") || qs(".content") || document.body;
  }

  function ensurePage() {
    let page = qs('.page[data-page="stream"]');
    if (page) return page;

    if (window.NoelleStreamPageV19829?.ensure) {
      try {
        window.NoelleStreamPageV19829.ensure();
        page = qs('.page[data-page="stream"]');
        if (page) return page;
      } catch (err) {
        console.warn("[Noelle V19.8.30c] Stream ensure falhou:", err);
      }
    }

    const root = findPagesRoot();
    page = document.createElement("section");
    page.className = "page";
    page.dataset.page = "stream";
    page.id = "streamPageV19830c";
    page.setAttribute("data-noelle-stream-page-v19-8-30c", "true");
    page.innerHTML = fallbackPageHtml();

    const about = root.querySelector('.page[data-page="about"]');
    if (about) root.insertBefore(page, about);
    else root.appendChild(page);

    return page;
  }

  function showStreamPage() {
    ensure();

    qsa(".page").forEach((page) => {
      const isStream = page.dataset.page === "stream";
      page.classList.toggle("active", isStream);
      page.classList.toggle("is-active", isStream);
      page.hidden = !isStream;
      page.style.display = isStream ? "" : "none";
    });

    qsa("[data-target]").forEach((btn) => {
      const isStream = btn.dataset.target === "stream";
      btn.classList.toggle("active", isStream);
      btn.classList.toggle("is-active", isStream);
      btn.setAttribute("aria-selected", isStream ? "true" : "false");
    });

    if (window.NoelleStreamPageV19829?.render) {
      try { window.NoelleStreamPageV19829.render(); } catch (_) {}
    }
  }

  function bind() {
    if (window.__NOELLE_STREAM_TAB_RECOVER_V19830C_BOUND__) return;
    window.__NOELLE_STREAM_TAB_RECOVER_V19830C_BOUND__ = true;

    document.addEventListener("click", (event) => {
      const btn = event.target instanceof HTMLElement ? event.target.closest('[data-target="stream"]') : null;
      if (!btn) return;

      event.preventDefault();
      showStreamPage();
    }, true);
  }

  function ensure() {
    ensureNav();
    ensurePage();
    bind();
  }

  function boot() {
    ensure();
    setTimeout(ensure, 100);
    setTimeout(ensure, 350);
    setTimeout(ensure, 900);
  }

  window.NoelleStreamTabRecoverV19830c = Object.freeze({
    version: VERSION,
    ensure,
    showStreamPage
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
