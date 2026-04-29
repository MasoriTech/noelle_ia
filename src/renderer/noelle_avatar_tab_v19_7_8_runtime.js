(() => {
  if (window.__NOELLE_AVATAR_TAB_V1978__) return;
  window.__NOELLE_AVATAR_TAB_V1978__ = true;

  const LABELS = ['Principal', 'Avatar', 'Chat IA', 'Emotes', 'Inventário', 'Configurações', 'Sobre'];
  let avatars = [];
  let index = 0;
  let root = null;
  let iframe = null;
  let sidebarRight = 0;
  let showing = false;
  let initialized = false;
  let navMemory = new WeakMap();

  function qs(selector, base = document) { return base.querySelector(selector); }
  function qsa(selector, base = document) { return Array.from(base.querySelectorAll(selector)); }
  function textOf(el) { return String(el && (el.innerText || el.textContent) || '').replace(/\s+/g, ' ').trim(); }
  function norm(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }

  function injectCss() {
    if (document.getElementById('noelle-avatar-tab-v1978-style')) return;
    const style = document.createElement('style');
    style.id = 'noelle-avatar-tab-v1978-style';
    style.textContent = `
      #noelle-avatar-tab-v1978-root {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        z-index: 2147482000;
        display: none;
        box-sizing: border-box;
        overflow: hidden;
        color: #fff7ff;
        background: linear-gradient(135deg, rgba(11,7,20,.99), rgba(24,9,31,.99) 48%, rgba(7,5,15,.99));
        font-family: Inter, system-ui, Segoe UI, Arial, sans-serif;
      }
      #noelle-avatar-tab-v1978-root * { box-sizing: border-box; }
      .noelle-v1978-shell {
        width: 100%; height: 100%; overflow: hidden;
        padding: 26px 28px 24px 28px;
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 20px;
      }
      .noelle-v1978-header { display:flex; align-items:center; justify-content:space-between; gap:18px; min-height:58px; }
      .noelle-v1978-title h1 { margin:0; font-size:32px; line-height:1.05; letter-spacing:-.035em; }
      .noelle-v1978-title p { margin:9px 0 0; color:#d7c7e9; font-weight:600; font-size:15px; }
      .noelle-v1978-status {
        color:#ffd879; border:1px solid rgba(255,216,121,.32); background:rgba(255,216,121,.08);
        border-radius:999px; padding:11px 16px; font-size:14px; font-weight:900; white-space:nowrap;
      }
      .noelle-v1978-status.ok { color:#38ffc9; border-color:rgba(56,255,201,.35); background:rgba(56,255,201,.08); }
      .noelle-v1978-status.err { color:#ff9aae; border-color:rgba(255,154,174,.38); background:rgba(255,154,174,.08); }
      .noelle-v1978-main {
        min-height:0;
        display:grid;
        grid-template-columns: minmax(620px, 1fr) minmax(320px, 410px);
        gap:22px;
        overflow:hidden;
      }
      .noelle-v1978-stage-card,
      .noelle-v1978-side-card {
        min-height:0;
        border:1px solid rgba(255,62,160,.35);
        border-radius:28px;
        background:rgba(8,6,18,.76);
        box-shadow: 0 20px 70px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.035);
        overflow:hidden;
      }
      .noelle-v1978-stage-card { display:grid; grid-template-rows: 1fr auto; }
      .noelle-v1978-preview-wrap { position:relative; min-height:0; overflow:hidden; }
      .noelle-v1978-preview {
        position:absolute; inset:0; width:100%; height:100%; border:0; display:block;
        background:radial-gradient(circle at center 20%, rgba(134,90,255,.22), rgba(10,8,20,1) 56%);
      }
      .noelle-v1978-nav {
        height:118px;
        display:grid;
        grid-template-columns: 98px 1fr 98px;
        gap:20px;
        align-items:center;
        padding:16px 24px 22px;
        border-top:1px solid rgba(255,255,255,.08);
        background:rgba(5,4,12,.7);
      }
      .noelle-v1978-arrow {
        height:70px; border-radius:22px; border:1px solid rgba(255,255,255,.13);
        background:linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.045));
        color:#fff; font-size:42px; font-weight:950; cursor:pointer;
      }
      .noelle-v1978-arrow:hover { transform:translateY(-1px); border-color:rgba(255,86,180,.55); }
      .noelle-v1978-current { text-align:center; min-width:0; }
      .noelle-v1978-current h2 { margin:0; font-size:28px; letter-spacing:-.03em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .noelle-v1978-current p { margin:7px 0 0; color:#a99ab9; font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .noelle-v1978-side-card { padding:28px 26px; overflow:auto; }
      .noelle-v1978-side-card h2 { margin:0 0 22px; font-size:30px; letter-spacing:-.035em; }
      .noelle-v1978-field { margin:0 0 20px; }
      .noelle-v1978-field label { display:block; color:#d7c7e8; font-weight:950; font-size:14px; margin-bottom:9px; }
      .noelle-v1978-select {
        width:100%; height:58px; border-radius:18px; border:1px solid rgba(255,255,255,.16);
        background:#201b2d; color:#fff; padding:0 16px; font-size:17px; font-weight:700; outline:none;
      }
      .noelle-v1978-actions { display:grid; gap:12px; margin-top:12px; }
      .noelle-v1978-btn {
        min-height:58px; border-radius:18px; border:1px solid rgba(255,255,255,.14);
        background:linear-gradient(180deg, rgba(255,255,255,.1), rgba(255,255,255,.055));
        color:#fff; font-size:18px; font-weight:950; cursor:pointer;
      }
      .noelle-v1978-btn.primary { border:0; background:linear-gradient(90deg,#ff4ca8,#8d75ff); }
      .noelle-v1978-btn:hover { filter:brightness(1.08); transform:translateY(-1px); }
      .noelle-v1978-note { margin-top:18px; color:#b6a7c9; font-size:13px; line-height:1.55; font-weight:650; }
      body.noelle-avatar-v1978-active { overflow:hidden !important; }
      body.noelle-avatar-v1978-active #noelle-v19-floating-actions,
      body.noelle-avatar-v1978-active .noelle-v19-floating-actions,
      body.noelle-avatar-v1978-active .noelle-v19-floating,
      body.noelle-avatar-v1978-active .noelle-v19-room-fab,
      body.noelle-avatar-v1978-active .noelle-v19-avatar-lab-fab,
      body.noelle-avatar-v1978-active [id*="avatar-lab" i][style*="fixed"],
      body.noelle-avatar-v1978-active [id*="room" i][style*="fixed"] { display:none !important; pointer-events:none !important; }
      @media (max-width: 1050px) {
        .noelle-v1978-main { grid-template-columns: 1fr; overflow:auto; }
        .noelle-v1978-stage-card { min-height: 640px; }
        .noelle-v1978-side-card { overflow:visible; }
      }
    `;
    document.head.appendChild(style);
  }

  function candidateElements() {
    return qsa('button, a, [role="button"], nav *, aside *, [data-tab], [data-section], .tab, .nav-item, .menu-item, div');
  }

  function findNav(label) {
    const want = norm(label);
    const candidates = candidateElements().filter((el) => {
      const t = norm(textOf(el));
      if (!t) return false;
      if (t === want) return true;
      const parts = t.split(' ');
      return parts.includes(want) && t.length <= want.length + 8;
    });
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (ar.left - br.left) || (ar.top - br.top);
    });
    return candidates[0] || null;
  }

  function findSidebar() {
    const avatarNav = findNav('Avatar');
    let node = avatarNav;
    while (node && node !== document.body) {
      const t = textOf(node);
      const hits = LABELS.filter((label) => t.includes(label)).length;
      const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
      if (hits >= 4 && rect && rect.width > 180 && rect.width < Math.max(520, window.innerWidth * 0.45)) return node;
      node = node.parentElement;
    }
    return null;
  }

  function updateBounds() {
    if (!root) return;
    const sidebar = findSidebar();
    let left = 0;
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      left = Math.max(0, Math.min(window.innerWidth - 720, Math.round(rect.right)));
    } else {
      const avatarNav = findNav('Avatar');
      if (avatarNav) {
        const rect = avatarNav.getBoundingClientRect();
        left = Math.max(0, Math.round(rect.right + 20));
      }
    }
    sidebarRight = left;
    root.style.left = left + 'px';
    root.style.width = 'calc(100vw - ' + left + 'px)';
  }

  function createRoot() {
    if (root) return root;
    injectCss();
    root = document.createElement('div');
    root.id = 'noelle-avatar-tab-v1978-root';
    root.innerHTML = `
      <div class="noelle-v1978-shell">
        <div class="noelle-v1978-header">
          <div class="noelle-v1978-title">
            <h1>Avatar</h1>
            <p>Escolha o personagem. O foco é o VRM grande; as setas ficam embaixo.</p>
          </div>
          <div id="noelle-v1978-status" class="noelle-v1978-status">Inicializando preview...</div>
        </div>
        <div class="noelle-v1978-main">
          <section class="noelle-v1978-stage-card">
            <div class="noelle-v1978-preview-wrap">
              <iframe id="noelle-v1978-preview" class="noelle-v1978-preview" src="./avatar_carousel_preview_v19_7_8.html"></iframe>
            </div>
            <div class="noelle-v1978-nav">
              <button id="noelle-v1978-prev" class="noelle-v1978-arrow" type="button" title="Avatar anterior">‹</button>
              <div class="noelle-v1978-current">
                <h2 id="noelle-v1978-name">Carregando...</h2>
                <p id="noelle-v1978-path">assets/avatar_manifest.json</p>
              </div>
              <button id="noelle-v1978-next" class="noelle-v1978-arrow" type="button" title="Próximo avatar">›</button>
            </div>
          </section>
          <aside class="noelle-v1978-side-card">
            <h2>Opções</h2>
            <div class="noelle-v1978-field">
              <label for="noelle-v1978-select">Personagem</label>
              <select id="noelle-v1978-select" class="noelle-v1978-select"></select>
            </div>
            <div class="noelle-v1978-field">
              <label>Usar avatar em</label>
              <div class="noelle-v1978-actions">
                <button id="noelle-v1978-room" class="noelle-v1978-btn primary" type="button">Room / Quarto</button>
                <button id="noelle-v1978-widget" class="noelle-v1978-btn" type="button">Widget Mode</button>
                <button id="noelle-v1978-preview-action" class="noelle-v1978-btn" type="button">Preview / Teste</button>
              </div>
            </div>
            <div class="noelle-v1978-field">
              <label>Ações</label>
              <div class="noelle-v1978-actions">
                <button id="noelle-v1978-save" class="noelle-v1978-btn" type="button">Salvar avatar padrão</button>
                <button id="noelle-v1978-reset" class="noelle-v1978-btn" type="button">Reset câmera</button>
              </div>
            </div>
            <p class="noelle-v1978-note">A aba Avatar agora é só seleção e preview limpo. Room cuida do quarto/objetos. Widget Mode abre a personagem sem fundo.</p>
          </aside>
        </div>
      </div>`;
    document.body.appendChild(root);
    iframe = qs('#noelle-v1978-preview', root);
    qs('#noelle-v1978-prev', root).addEventListener('click', () => move(-1));
    qs('#noelle-v1978-next', root).addEventListener('click', () => move(1));
    qs('#noelle-v1978-select', root).addEventListener('change', (event) => selectIndex(Number(event.target.value || 0)));
    qs('#noelle-v1978-room', root).addEventListener('click', openRoom);
    qs('#noelle-v1978-widget', root).addEventListener('click', openWidget);
    qs('#noelle-v1978-preview-action', root).addEventListener('click', () => setStatus('Preview / Teste já está ativo nesta aba.', 'ok'));
    qs('#noelle-v1978-save', root).addEventListener('click', saveDefault);
    qs('#noelle-v1978-reset', root).addEventListener('click', resetCamera);
    iframe.addEventListener('load', () => sendAvatarToFrame());
    updateBounds();
    return root;
  }

  function setStatus(text, kind = '') {
    const el = root ? qs('#noelle-v1978-status', root) : null;
    if (!el) return;
    el.textContent = text;
    el.className = 'noelle-v1978-status' + (kind ? ' ' + kind : '');
  }

  async function loadManifest() {
    try {
      const res = await fetch('./assets/avatar_manifest.json?noelle_v=1978&t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      avatars = Array.isArray(data.avatars) ? data.avatars.filter((item) => item && item.file) : [];
      avatars = avatars.map((item, i) => ({
        id: item.id || String(i),
        name: item.name || String(item.file).split('/').pop().replace(/\.(vrm|glb)$/i, ''),
        file: String(item.file || '').replace(/\\/g, '/')
      }));
      if (!avatars.length) throw new Error('Nenhum .vrm/.glb no manifest');
      fillSelect();
      setStatus('Avatares encontrados: ' + avatars.length, 'ok');
      selectIndex(0);
    } catch (err) {
      setStatus('Manifest não carregou: ' + String(err && err.message ? err.message : err), 'err');
      avatars = [];
      fillSelect();
    }
  }

  function fillSelect() {
    const select = root ? qs('#noelle-v1978-select', root) : null;
    if (!select) return;
    select.innerHTML = '';
    if (!avatars.length) {
      const opt = document.createElement('option');
      opt.value = '0';
      opt.textContent = 'Nenhum avatar encontrado';
      select.appendChild(opt);
      return;
    }
    avatars.forEach((avatar, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = avatar.name;
      select.appendChild(opt);
    });
  }

  function currentAvatar() { return avatars[index] || null; }

  function sendAvatarToFrame() {
    const avatar = currentAvatar();
    if (!iframe || !iframe.contentWindow || !avatar) return;
    iframe.contentWindow.postMessage({ type: 'noelle-avatar-load', file: avatar.file, name: avatar.name }, '*');
  }

  function selectIndex(nextIndex) {
    if (!avatars.length) return;
    index = ((Number(nextIndex) || 0) + avatars.length) % avatars.length;
    const avatar = currentAvatar();
    const name = qs('#noelle-v1978-name', root);
    const path = qs('#noelle-v1978-path', root);
    const select = qs('#noelle-v1978-select', root);
    if (name) name.textContent = avatar.name;
    if (path) path.textContent = avatar.file;
    if (select) select.value = String(index);
    sendAvatarToFrame();
  }

  function move(delta) { if (avatars.length) selectIndex(index + delta); }

  async function saveDefault() {
    const avatar = currentAvatar();
    if (!avatar) return setStatus('Nenhum avatar para salvar.', 'err');
    try {
      if (window.noelleAPI && window.noelleAPI.saveState) {
        await window.noelleAPI.saveState({ avatar: { file: avatar.file, name: avatar.name, camera: 'fullbody', alwaysOnTop: false } });
      }
      setStatus('Avatar padrão salvo: ' + avatar.name, 'ok');
    } catch (err) {
      setStatus('Falha ao salvar avatar: ' + String(err && err.message ? err.message : err), 'err');
    }
  }

  async function openRoom() {
    const avatar = currentAvatar();
    if (!avatar) return setStatus('Nenhum avatar selecionado.', 'err');
    await saveDefault();
    try {
      if (window.noelleRoom && window.noelleRoom.open) await window.noelleRoom.open();
      else if (window.noelleRoomV19 && window.noelleRoomV19.open) await window.noelleRoomV19.open();
      else throw new Error('API noelleRoom.open indisponível');
      setStatus('Room / Quarto aberta com ' + avatar.name, 'ok');
    } catch (err) {
      setStatus('Falha ao abrir Room: ' + String(err && err.message ? err.message : err), 'err');
    }
  }

  async function openWidget() {
    const avatar = currentAvatar();
    if (!avatar) return setStatus('Nenhum avatar selecionado.', 'err');
    await saveDefault();
    try {
      if (window.noelleAPI && window.noelleAPI.openAvatar) await window.noelleAPI.openAvatar();
      else if (window.desktopWidget && window.desktopWidget.openAvatar) await window.desktopWidget.openAvatar();
      else throw new Error('API openAvatar indisponível');
      setStatus('Widget Mode aberto com ' + avatar.name, 'ok');
    } catch (err) {
      setStatus('Falha ao abrir Widget: ' + String(err && err.message ? err.message : err), 'err');
    }
  }

  function resetCamera() {
    if (iframe && iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'noelle-avatar-reset-camera' }, '*');
    setStatus('Câmera resetada.', 'ok');
  }

  function hideLegacyFloatingButtons() {
    if (!showing) return;
    const badWords = ['Avatar Lab', 'Room V19', 'BroadcastChannel', 'localStorage', 'Sincronizar Room'];
    candidateElements().forEach((el) => {
      if (!el || (root && root.contains(el))) return;
      const t = textOf(el);
      if (!t) return;
      if (badWords.some((word) => t.includes(word))) {
        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null;
        if (!rect || rect.width < 900 || t.includes('BroadcastChannel') || t.includes('localStorage') || t.includes('Avatar Lab') || t.includes('Room V19') || t.includes('Sincronizar Room')) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        }
      }
    });
  }

  function setNavVisual(active) {
    LABELS.forEach((label) => {
      const el = findNav(label);
      if (!el) return;
      if (!navMemory.has(el)) navMemory.set(el, el.getAttribute('style') || '');
      if (!active) {
        const old = navMemory.get(el);
        if (old) el.setAttribute('style', old);
        else el.removeAttribute('style');
        return;
      }
      if (label === 'Avatar') {
        el.style.setProperty('background', 'linear-gradient(90deg, rgba(91, 58, 180, .48), rgba(52, 24, 74, .34))', 'important');
        el.style.setProperty('border-color', 'rgba(172, 89, 255, .72)', 'important');
        el.style.setProperty('color', '#fff', 'important');
      } else {
        el.style.setProperty('background', 'rgba(13, 10, 24, .44)', 'important');
        el.style.setProperty('border-color', 'rgba(255,255,255,.08)', 'important');
        el.style.setProperty('color', '#fff', 'important');
      }
    });
  }

  function showAvatar() {
    createRoot();
    updateBounds();
    showing = true;
    root.style.display = 'block';
    document.body.classList.add('noelle-avatar-v1978-active');
    setNavVisual(true);
    hideLegacyFloatingButtons();
    if (!initialized) {
      initialized = true;
      loadManifest();
    } else {
      sendAvatarToFrame();
    }
  }

  function hideAvatar() {
    if (!root) return;
    showing = false;
    root.style.display = 'none';
    document.body.classList.remove('noelle-avatar-v1978-active');
    setNavVisual(false);
  }

  function installNavHooks() {
    const avatarNav = findNav('Avatar');
    if (avatarNav && !avatarNav.__noelleV1978Hook) {
      avatarNav.__noelleV1978Hook = true;
      avatarNav.addEventListener('click', () => setTimeout(showAvatar, 20), true);
    }
    LABELS.filter((label) => label !== 'Avatar').forEach((label) => {
      const el = findNav(label);
      if (el && !el.__noelleV1978HideHook) {
        el.__noelleV1978HideHook = true;
        el.addEventListener('click', () => setTimeout(hideAvatar, 20), true);
      }
    });
  }

  function shouldAutoShow() {
    const bodyText = textOf(document.body);
    if (bodyText.includes('Escolha o personagem. O foco é o VRM')) return true;
    if (bodyText.includes('Preview real do VRM V19.5')) return true;
    if (bodyText.includes('BroadcastChannel') && bodyText.includes('Sincronizar Room')) return true;
    return false;
  }

  function boot() {
    injectCss();
    installNavHooks();
    if (shouldAutoShow()) showAvatar();
    setInterval(() => {
      installNavHooks();
      updateBounds();
      hideLegacyFloatingButtons();
    }, 900);
    window.addEventListener('resize', updateBounds);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
