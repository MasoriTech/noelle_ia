(() => {
  "use strict";
  const ASSET_BASE = "./assets";
  const state = { expressions: [], motions: [], items: [] };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function titleize(value) {
    return String(value || "")
      .replace(/\.[^.]+$/, "")
      .replace(/^\d+_?/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  async function loadJson(url, fallback = []) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      return Array.isArray(data) ? data : fallback;
    } catch (err) {
      console.warn("[Noelle V15] Falha ao carregar", url, err);
      return fallback;
    }
  }

  function getViewByName(name) {
    const exact = $(`#${name}, [data-view="${name}"], [data-tab="${name}"]`);
    if (exact) return exact;
    return $$('section, main, div').find(el => {
      const id = (el.id || "").toLowerCase();
      const cls = (el.className || "").toString().toLowerCase();
      return id.includes(name) || cls.includes(name);
    });
  }

  function ensureSection(viewName, title) {
    const view = getViewByName(viewName) || document.body;
    let box = $(`[data-noelle-v15="${viewName}"]`, view);
    if (box) return box;
    box = document.createElement("div");
    box.className = "noelle-v15-section";
    box.dataset.noelleV15 = viewName;
    box.innerHTML = `<div class="noelle-v15-section-head"><strong>${title}</strong><span>assets reais reconectados</span></div>`;
    view.appendChild(box);
    return box;
  }

  function button(label, className = "") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `noelle-v15-btn ${className}`.trim();
    btn.textContent = label;
    return btn;
  }

  function renderExpressions() {
    const host = ensureSection("emotes", "Expressões da Noelle");
    let grid = $(".noelle-v15-expressions", host);
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "noelle-v15-grid noelle-v15-expressions";
      host.appendChild(grid);
    }
    grid.innerHTML = "";
    if (!state.expressions.length) {
      grid.innerHTML = `<div class="noelle-v15-empty">Nenhuma expressão encontrada em src/assets/expressions.</div>`;
      return;
    }
    for (const exp of state.expressions) {
      const id = exp.id || exp.name || exp.file;
      const file = exp.file || `${id}.png`;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "noelle-v15-card expression-card";
      card.dataset.expression = id;
      card.innerHTML = `
        <img src="${ASSET_BASE}/expressions/${file}" alt="${exp.label || id}" loading="lazy" />
        <span>${exp.label || titleize(id)}</span>
      `;
      card.addEventListener("click", () => {
        localStorage.setItem("noelle:lastExpression", id);
        window.desktopWidget?.setExpression?.(id);
        window.noelleAPI?.setExpression?.(id);
        window.dispatchEvent(new CustomEvent("noelle:set-expression", { detail: { id, file } }));
      });
      grid.appendChild(card);
    }
  }

  function renderMotions() {
    const host = ensureSection("emotes", "Animações VRMA");
    let grid = $(".noelle-v15-motions", host);
    if (!grid) {
      grid = document.createElement("div");
      grid.className = "noelle-v15-grid noelle-v15-motions";
      host.appendChild(grid);
    }
    grid.innerHTML = "";
    if (!state.motions.length) {
      grid.innerHTML = `<div class="noelle-v15-empty">Nenhuma animação listada em src/assets/motion_manifest.json.</div>`;
      return;
    }
    for (const motion of state.motions) {
      const id = motion.id || motion.name || motion.file;
      const file = motion.file || `${id}.vrma`;
      const btn = button(motion.label || titleize(id), "motion-card");
      btn.dataset.motion = id;
      btn.addEventListener("click", () => {
        localStorage.setItem("noelle:lastMotion", id);
        window.desktopWidget?.playMotion?.(id, file);
        window.noelleAPI?.playMotion?.(id, file);
        window.dispatchEvent(new CustomEvent("noelle:play-motion", { detail: { id, file } }));
      });
      grid.appendChild(btn);
    }
  }

  function renderAvatarBadge() {
    const host = ensureSection("principal", "Avatar");
    if ($(".noelle-v15-avatar-badge", host)) return;
    const card = document.createElement("div");
    card.className = "noelle-v15-avatar-badge";
    card.innerHTML = `
      <div>
        <strong>Noelle.vrm</strong>
        <span>Avatar local detectado em src/assets/Noelle.vrm</span>
      </div>
      <button type="button" class="noelle-v15-btn">Abrir/Recarregar avatar</button>
    `;
    card.querySelector("button").addEventListener("click", () => {
      window.desktopWidget?.openAvatar?.();
      window.desktopWidget?.reloadAvatar?.();
      window.noelleAPI?.openAvatar?.();
      window.dispatchEvent(new CustomEvent("noelle:avatar-open"));
    });
    host.appendChild(card);
  }

  function attachTtsToChat() {
    if (!window.noelleTTS) return;
    const chatView = getViewByName("chat") || getViewByName("chat-ia") || document.body;
    if ($(".noelle-v15-tts-test", chatView)) return;
    const wrap = document.createElement("div");
    wrap.className = "noelle-v15-tts-test";
    const btn = button("Testar voz da Noelle", "tts-test");
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      const old = btn.textContent;
      btn.textContent = "Falando...";
      try { await window.noelleTTS.speak("Olá, eu sou a Noelle. Minha voz está funcionando."); }
      catch (err) { console.warn("TTS falhou", err); alert("TTS falhou. Rode o diagnóstico V15."); }
      finally { btn.disabled = false; btn.textContent = old; }
    });
    wrap.appendChild(btn);
    chatView.appendChild(wrap);
  }

  async function init() {
    state.expressions = await loadJson(`${ASSET_BASE}/expressions/manifest.json`, []);
    state.motions = await loadJson(`${ASSET_BASE}/motion_manifest.json`, []);
    state.items = await loadJson(`${ASSET_BASE}/item_manifest.json`, []);
    renderExpressions();
    renderMotions();
    renderAvatarBadge();
    attachTtsToChat();
    console.info("[Noelle V15] Assets reconectados", state);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
