const $ = (id) => document.getElementById(id);
const HISTORY_KEY = 'noelle_chat_limpo_history_v2';

const state = {
  messages: loadHistory(),
  online: false,
  busy: false,
};

function loadHistory(){
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(-40); }
  catch { return []; }
}
function saveHistory(){ localStorage.setItem(HISTORY_KEY, JSON.stringify(state.messages.slice(-40))); }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
function addMessage(role, content, meta={}){ state.messages.push({role, content:String(content||''), meta, at:new Date().toISOString()}); saveHistory(); render(); }
function setBusy(v){ state.busy = !!v; $('sendBtn').disabled = !!v; $('input').disabled = !!v; $('sendBtn').textContent = v ? 'Pensando...' : 'Enviar'; }
function setStatus(kind, text){ const el=$('statusPill'); el.className='status-pill '+kind; el.textContent=text; }
function render(){
  const log = $('log');
  if (!state.messages.length) {
    log.innerHTML = `<div class="message system">Pronto. Teste com: <b>oi</b>. Se aparecer offline, abra o Ollama antes.</div>`;
    return;
  }
  log.innerHTML = state.messages.map(m => {
    const role = m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system';
    const who = role === 'user' ? 'Você' : role === 'assistant' ? 'Noelle' : 'Sistema';
    const meta = m.meta?.seconds ? `<span class="meta">${escapeHtml(m.meta.seconds)}s</span>` : '';
    return `<article class="message ${role}"><div class="who">${who}${meta}</div>${escapeHtml(m.content)}</article>`;
  }).join('');
  requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
}

async function refreshStatus(showMessage=false){
  setStatus('warn','checando...');
  try {
    const status = await window.noelleChat.status();
    state.online = !!status.online;
    if (status.online) {
      const model = $('modelSelect').value;
      const hasModel = (status.models || []).some(name => name === model || name.startsWith(model + ':'));
      setStatus(hasModel ? 'ok' : 'warn', hasModel ? `Ollama online • ${model}` : `Ollama online • modelo talvez ausente`);
      $('modelHint').textContent = (status.models || []).length ? `Instalados: ${(status.models || []).slice(0,4).join(', ')}` : 'Ollama online, mas sem modelos listados.';
      if (showMessage) addMessage('system', `Ollama online em ${status.host}.\nModelos: ${(status.models || []).join(', ') || 'nenhum listado'}`);
    } else {
      setStatus('bad','Ollama offline');
      $('modelHint').textContent = `Falha: ${status.error || 'Ollama fechado'}`;
      if (showMessage) addMessage('system', `Ollama offline em ${status.host}.\nDetalhe: ${status.error || 'sem resposta'}\nAbra o Ollama e tente de novo.`);
    }
  } catch (err) {
    state.online = false;
    setStatus('bad','erro no status');
    $('modelHint').textContent = String(err?.message || err);
  }
}

function toOllamaMessages(){
  const base = [{ role:'system', content:'Você é Noelle, uma assistente de chat em português do Brasil. Responda com clareza, seja útil e direta.' }];
  const recent = state.messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-18).map(m => ({ role:m.role, content:m.content }));
  return base.concat(recent);
}

async function send(){
  const input = $('input');
  const text = input.value.trim();
  if (!text || state.busy) return;
  input.value = '';
  addMessage('user', text);
  setBusy(true);
  const placeholderIndex = state.messages.length;
  state.messages.push({role:'assistant', content:'...', meta:{}, at:new Date().toISOString()});
  render();
  try {
    const result = await window.noelleChat.chat({ model:$('modelSelect').value, messages:toOllamaMessages(), temperature:0.7, num_ctx:2048 });
    state.messages[placeholderIndex] = {role:'assistant', content: result.content, meta:{seconds:result.seconds}, at:new Date().toISOString()};
    saveHistory(); render();
    refreshStatus(false);
  } catch (err) {
    state.messages.splice(placeholderIndex, 1);
    addMessage('system', `Falha na IA: ${err?.message || err}\nSe for ECONNREFUSED 127.0.0.1:11434, o Ollama esta fechado/offline.`);
    setStatus('bad','falha na IA');
  } finally {
    setBusy(false);
    input.focus();
  }
}

$('sendBtn').addEventListener('click', send);
$('input').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('clearBtn').addEventListener('click', () => { state.messages = []; saveHistory(); render(); });
$('statusBtn').addEventListener('click', () => refreshStatus(true));
$('diagChannel').addEventListener('click', () => refreshStatus(true));
$('modelSelect').addEventListener('change', () => refreshStatus(false));

render();
refreshStatus(false);
setInterval(() => refreshStatus(false), 30000);
