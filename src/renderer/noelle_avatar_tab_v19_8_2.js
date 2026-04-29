"use strict";

// Noelle V19.8.2 - Aba Avatar Real
// Este runtime roda no renderer principal (src/controls.html), nao no preload.
// Responsabilidades: renderizar a aba Avatar limpa, carregar manifest/lista de avatares,
// controlar carrossel e abrir Room / Widget / Preview de forma separada.
(function () {
  const VERSION = "19.8.2-avatar-real-2026";
  const STATE = {
    avatars: [],
    currentIndex: 0,
    mounted: false,
    lastError: ""
  };

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $$(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function safeText(value) {
    return String(value ?? "");
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = safeText(value);
    return div.innerHTML;
  }

  function normalizeSlash(value) {
    return safeText(value).replace(/\\/g, "/").replace(/^\.\//, "");
  }

  function basenameNoExt(value) {
    const base = normalizeSlash(value).split("/").filter(Boolean).pop() || "Avatar";
    return base.replace(/\.(vrm|glb|gltf)$/i, "").replace(/[_-]+/g, " ").trim() || "Avatar";
  }

  function normalizeAvatar(entry, index) {
    if (!entry) return null;
    const rawRel = normalizeSlash(entry.rel || entry.file || entry.path || entry.url || "");
    if (!rawRel || !/\.(vrm|glb|gltf)(\?|#|$)/i.test(rawRel)) return null;
    let rel = rawRel;
    rel = rel.replace(/^src\//i, "");
    rel = rel.replace(/^\/src\//i, "");
    rel = rel.replace(/^\.\/src\//i, "");
    const typeMatch = rel.match(/\.([a-z0-9]+)(\?|#|$)/i);
    const type = (entry.type || typeMatch?.[1] || "vrm").toLowerCase();
    const name = safeText(entry.name || entry.label || basenameNoExt(rel));
    return {
      id: safeText(entry.id || name.toLowerCase().replace(/[^a-z0-9]+/gi, "-") || `avatar-${index}`),
      name,
      type,
      rel,
      source: entry.source || "manifest",
      exists: entry.exists !== false
    };
  }

  function uniqueAvatars(entries) {
    const seen = new Set();
    const out = [];
    for (const item of entries) {
      const avatar = normalizeAvatar(item, out.length);
      if (!avatar) continue;
      const key = avatar.rel.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(avatar);
    }
    return out;
  }

  async function loadAvatarsFromApi() {
    if (!window.noelleAPI?.assets) return [];
    try {
      const result = await window.noelleAPI.assets();
      const avatars = result?.assets?.avatars || result?.avatars || [];
      return uniqueAvatars(Array.isArray(avatars) ? avatars : []);
    } catch (err) {
      console.warn("[Noelle V19.8.2] Falha ao carregar avatares via noelleAPI.assets:", err);
      return [];
    }
  }

  async function loadAvatarsFromManifest() {
    try {
      const response = await fetch("./assets/avatar_manifest.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      const list = Array.isArray(json) ? json : Array.isArray(json?.avatars) ? json.avatars : [];
      return uniqueAvatars(list);
    } catch (err) {
      console.warn("[Noelle V19.8.2] Falha ao carregar avatar_manifest.json:", err);
      return [];
    }
  }

  async function loadAvatars() {
    const viaApi = await loadAvatarsFromApi();
    if (viaApi.length) return viaApi;
    return await loadAvatarsFromManifest();
  }

  function findAvatarPage() {
    return $('[data-page="avatar"].page') || $('#avatarPage') || $('.page.avatar') || $('[data-page="avatar"]');
  }

  function previewUrl(entry) {
    const params = new URLSearchParams();
    params.set("avatar", entry?.rel || "");
    params.set("name", entry?.name || "Avatar");
    params.set("v", "1982");
    return `./avatar_carousel_preview_v19_8_2.html?${params.toString()}`;
  }

  function currentAvatar() {
    if (!STATE.avatars.length) return null;
    STATE.currentIndex = ((STATE.currentIndex % STATE.avatars.length) + STATE.avatars.length) % STATE.avatars.length;
    return STATE.avatars[STATE.currentIndex] || null;
  }

  async function persistSelectedAvatar(entry) {
    if (!entry) return { ok: false, error: "Nenhum avatar selecionado." };
    try {
      if (window.noelleAPI?.saveState) {
        await window.noelleAPI.saveState({
          avatar: {
            selected: entry.rel,
            file: entry.rel,
            name: entry.name,
            type: entry.type,
            updatedAt: new Date().toISOString()
          }
        });
      }
      try {
        localStorage.setItem("noelle.avatar.selected.v19_8_2", JSON.stringify({ rel: entry.rel, name: entry.name }));
      } catch {}
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  }

  function showStatus(text, type = "info") {
    const status = $('#noelleAvatarV1982Status');
    if (!status) return;
    status.textContent = text;
    status.dataset.type = type;
  }

  function updatePreview() {
    const entry = currentAvatar();
    const root = $('#noelleAvatarV1982');
    if (!root) return;

    const iframe = $('#noelleAvatarV1982Frame', root);
    const nameEl = $('#noelleAvatarV1982Name', root);
    const fileEl = $('#noelleAvatarV1982File', root);
    const indexEl = $('#noelleAvatarV1982Index', root);
    const typeEl = $('#noelleAvatarV1982Type', root);

    if (!entry) {
      if (iframe) iframe.removeAttribute("src");
      if (nameEl) nameEl.textContent = "Nenhum avatar";
      if (fileEl) fileEl.textContent = "avatar_manifest.json vazio";
      if (indexEl) indexEl.textContent = "0 / 0";
      if (typeEl) typeEl.textContent = "—";
      showStatus("Nenhum VRM/GLB encontrado. Rode a reparação do manifest.", "bad");
      return;
    }

    if (iframe) iframe.src = previewUrl(entry);
    if (nameEl) nameEl.textContent = entry.name;
    if (fileEl) fileEl.textContent = entry.rel;
    if (indexEl) indexEl.textContent = `${STATE.currentIndex + 1} / ${STATE.avatars.length}`;
    if (typeEl) typeEl.textContent = entry.type.toUpperCase();
    showStatus(`Avatar carregado: ${entry.name}`, "ok");
  }

  function move(delta) {
    if (!STATE.avatars.length) return;
    STATE.currentIndex = (STATE.currentIndex + delta + STATE.avatars.length) % STATE.avatars.length;
    updatePreview();
  }

  async function openWidgetMode() {
    const entry = currentAvatar();
    if (!entry) return showStatus("Nenhum avatar selecionado.", "bad");
    await persistSelectedAvatar(entry);
    try {
      await window.noelleAPI?.openAvatar?.();
      // Compatibilidade futura: se main/avatar aceitar troca direta de avatar, este comando já chega.
      await window.noelleAPI?.avatarCommand?.("loadAvatar", { rel: entry.rel, file: entry.rel, name: entry.name, type: entry.type });
      showStatus(`Widget Mode aberto com ${entry.name}.`, "ok");
    } catch (err) {
      showStatus(`Falha ao abrir Widget Mode: ${err?.message || err}`, "bad");
    }
  }

  async function openRoomMode() {
    const entry = currentAvatar();
    if (!entry) return showStatus("Nenhum avatar selecionado.", "bad");
    await persistSelectedAvatar(entry);
    try {
      const api = window.noelleRoom || window.noelleRoomV19;
      if (api?.open) await api.open();
      else throw new Error("API da Room indisponível.");
      showStatus(`Room / Quarto aberto. Avatar selecionado: ${entry.name}.`, "ok");
    } catch (err) {
      showStatus(`Falha ao abrir Room: ${err?.message || err}`, "bad");
    }
  }

  async function openPreviewTest() {
    const entry = currentAvatar();
    if (!entry) return showStatus("Nenhum avatar selecionado.", "bad");
    await persistSelectedAvatar(entry);
    const url = previewUrl(entry);
    try {
      window.open(url, "noelle-avatar-preview-v1982", "width=980,height=820,resizable=yes");
      showStatus(`Preview / Teste aberto: ${entry.name}.`, "ok");
    } catch (err) {
      showStatus(`Falha ao abrir Preview: ${err?.message || err}`, "bad");
    }
  }

  async function saveDefault() {
    const entry = currentAvatar();
    if (!entry) return showStatus("Nenhum avatar selecionado.", "bad");
    const result = await persistSelectedAvatar(entry);
    showStatus(result.ok ? `Avatar padrão salvo: ${entry.name}.` : result.error || "Falha ao salvar avatar.", result.ok ? "ok" : "bad");
  }

  function buildMarkup() {
    return `
      <div id="noelleAvatarV1982" class="noelle-avatar-v1982" data-version="${VERSION}">
        <section class="noelle-avatar-v1982-stage" aria-label="Preview 3D do avatar">
          <div class="noelle-avatar-v1982-preview-card">
            <iframe id="noelleAvatarV1982Frame" class="noelle-avatar-v1982-frame" title="Preview 3D VRM" loading="eager"></iframe>
          </div>
          <div class="noelle-avatar-v1982-carousel" aria-label="Carrossel de personagens">
            <button type="button" class="noelle-avatar-v1982-arrow" data-avatar-v1982-prev aria-label="Avatar anterior">←</button>
            <div class="noelle-avatar-v1982-current">
              <strong id="noelleAvatarV1982Name">Carregando...</strong>
              <span id="noelleAvatarV1982Index">0 / 0</span>
            </div>
            <button type="button" class="noelle-avatar-v1982-arrow" data-avatar-v1982-next aria-label="Próximo avatar">→</button>
          </div>
        </section>

        <aside class="noelle-avatar-v1982-options" aria-label="Opções do avatar">
          <div class="noelle-avatar-v1982-card">
            <p class="noelle-avatar-v1982-kicker">Personagem</p>
            <h2 id="noelleAvatarV1982NameSide">Avatar</h2>
            <dl class="noelle-avatar-v1982-meta">
              <div><dt>Arquivo</dt><dd id="noelleAvatarV1982File">—</dd></div>
              <div><dt>Tipo</dt><dd id="noelleAvatarV1982Type">—</dd></div>
            </dl>
          </div>

          <div class="noelle-avatar-v1982-card">
            <p class="noelle-avatar-v1982-kicker">Usar em</p>
            <button type="button" class="noelle-avatar-v1982-action primary" data-avatar-v1982-room>Room / Quarto</button>
            <button type="button" class="noelle-avatar-v1982-action" data-avatar-v1982-widget>Widget Mode</button>
            <button type="button" class="noelle-avatar-v1982-action" data-avatar-v1982-preview>Preview / Teste</button>
          </div>

          <div class="noelle-avatar-v1982-card">
            <p class="noelle-avatar-v1982-kicker">Ações</p>
            <button type="button" class="noelle-avatar-v1982-action" data-avatar-v1982-save>Salvar avatar padrão</button>
            <button type="button" class="noelle-avatar-v1982-action" data-avatar-v1982-reload>Recarregar lista</button>
            <p id="noelleAvatarV1982Status" class="noelle-avatar-v1982-status" data-type="info">Carregando avatares...</p>
          </div>
        </aside>
      </div>
    `;
  }

  async function render() {
    const page = findAvatarPage();
    if (!page) {
      console.warn("[Noelle V19.8.2] Nao encontrei .page[data-page='avatar'].");
      return false;
    }

    if (!$('#noelleAvatarV1982', page)) {
      page.innerHTML = buildMarkup();
      bindAvatarTabEvents(page);
      STATE.mounted = true;
    }

    if (!STATE.avatars.length) {
      STATE.avatars = await loadAvatars();
      STATE.currentIndex = 0;
    }

    updatePreview();
    return true;
  }

  async function reload() {
    STATE.avatars = await loadAvatars();
    STATE.currentIndex = 0;
    updatePreview();
  }

  function bindAvatarTabEvents(root) {
    root.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-avatar-v1982-prev]")) move(-1);
      else if (target.closest("[data-avatar-v1982-next]")) move(1);
      else if (target.closest("[data-avatar-v1982-room]")) openRoomMode();
      else if (target.closest("[data-avatar-v1982-widget]")) openWidgetMode();
      else if (target.closest("[data-avatar-v1982-preview]")) openPreviewTest();
      else if (target.closest("[data-avatar-v1982-save]")) saveDefault();
      else if (target.closest("[data-avatar-v1982-reload]")) reload();
    });

    root.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    });
  }

  function bindPageActivation() {
    $$('[data-target="avatar"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        setTimeout(render, 0);
      });
    });

    // Caso a pagina ja esteja ativa ao abrir.
    const activeAvatar = $('[data-page="avatar"].page.active') || $('[data-target="avatar"].nav-item.active');
    if (activeAvatar) render();
  }

  window.NoelleAvatarTabV1982 = {
    version: VERSION,
    render,
    reload,
    getState: () => ({ ...STATE, avatars: STATE.avatars.slice() })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPageActivation, { once: true });
  } else {
    bindPageActivation();
  }
})();
