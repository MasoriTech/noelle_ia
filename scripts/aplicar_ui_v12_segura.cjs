/*
  Noelle UI V12 - injecao segura
  Objetivo: preservar Principal/Emotes/Inventario/Configuracoes antigos e mexer so no Chat IA.
*/
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(root, 'backups', `ui_v12_segura_${stamp}`);
const changed = [];
const warnings = [];

function p(...parts) { return path.join(root, ...parts); }
function exists(file) { return fs.existsSync(file); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, text) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text, 'utf8'); }
function rel(file) { return path.relative(root, file).replace(/\\/g, '/'); }
function copyFileSafe(src, dest) {
  if (!exists(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
function backup(file) {
  if (!exists(file)) return;
  const dest = path.join(backupRoot, rel(file));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(file, dest);
}
function backupMany(files) {
  for (const file of files) backup(file);
}
function replaceIfChanged(file, next) {
  const prev = exists(file) ? read(file) : '';
  if (prev !== next) {
    backup(file);
    write(file, next);
    changed.push(rel(file));
  }
}
function runCheck(file) {
  if (!exists(file)) return { ok: false, error: 'arquivo ausente' };
  try {
    cp.execFileSync(process.execPath, ['--check', file], { cwd: root, stdio: 'pipe' });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.stderr || err.message || err) };
  }
}

const controlsHtml = p('src', 'controls.html');
const mainJs = p('main.js');
const preloadJs = p('preload.js');
const rendererApp = p('src', 'renderer', 'controls_window_app.js');
const v12Css = p('src', 'styles', 'noelle_chat_v12.css');
const v12Js = p('src', 'renderer', 'noelle_chat_v12.js');

console.log('Raiz:', root);

const required = [controlsHtml, mainJs];
for (const file of required) {
  if (!exists(file)) {
    console.error(`ERRO: ${rel(file)} nao encontrado. Extraia este pack na raiz do projeto Noelle.`);
    process.exit(1);
  }
}

backupMany([controlsHtml, mainJs, preloadJs, rendererApp, v12Css, v12Js]);

// 1) Garante que os arquivos V12 existem. Quando o pack e extraido, eles ja ficam em src/.
if (!exists(v12Css)) warnings.push('src/styles/noelle_chat_v12.css nao encontrado no pack.');
if (!exists(v12Js)) warnings.push('src/renderer/noelle_chat_v12.js nao encontrado no pack.');

// 2) Limpa referencias antigas de patches que causavam sobreposicao.
let html = read(controlsHtml);
const beforeClean = html;
html = html
  .replace(/\s*<link[^>]+noelle_chat_(?:focus_patch|safe_repair|layout_moderno|janela_fix|window_fix|v\d+)[^>]*>\s*/gi, '\n')
  .replace(/\s*<script[^>]+noelle_chat_(?:focus_patch|safe_repair|layout_moderno|janela_fix|window_fix|v\d+)[^>]*><\/script>\s*/gi, '\n')
  .replace(/\s*<script[^>]+noelle_chat_discord[^>]*><\/script>\s*/gi, '\n');
if (html !== beforeClean) changed.push('src/controls.html (limpeza de patches antigos)');

// 3) Injeta CSS/JS V12 apenas uma vez, sem substituir as abas antigas.
const cssTag = '<link rel="stylesheet" href="./styles/noelle_chat_v12.css">';
if (!html.includes('noelle_chat_v12.css')) {
  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `  ${cssTag}\n</head>`);
  } else {
    html = `${cssTag}\n${html}`;
  }
}
const jsTag = '<script src="./renderer/noelle_chat_v12.js"></script>';
if (!html.includes('noelle_chat_v12.js')) {
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `  ${jsTag}\n</body>`);
  } else {
    html = `${html}\n${jsTag}\n`;
  }
}
replaceIfChanged(controlsHtml, html);

// 4) Corrige ensureDir se estiver faltando. Isso evita quebrar STT/cache.
let main = read(mainJs);
let mainNext = main;
if (!/function\s+ensureDir\s*\(/.test(mainNext) && !/const\s+ensureDir\s*=/.test(mainNext)) {
  const helper = `\nfunction ensureDir(dirPath) {\n  if (!dirPath) return;\n  fs.mkdirSync(dirPath, { recursive: true });\n}\n`;
  if (/const\s+fs\s*=\s*require\(['"](?:node:)?fs['"]\);?/.test(mainNext)) {
    mainNext = mainNext.replace(/const\s+fs\s*=\s*require\(['"](?:node:)?fs['"]\);?/, (m) => `${m}\n${helper}`);
  } else {
    mainNext = `const fs = require('node:fs');\n${helper}\n${mainNext}`;
  }
}

// 5) Evita sobreposicao de titlebar na janela de controles sem mexer no layout das abas.
// A troca e conservadora: remove titleBarOverlay e troca titleBarStyle hidden/hiddenInset por default.
mainNext = mainNext
  .replace(/,?\s*titleBarOverlay\s*:\s*\{[\s\S]*?\}\s*,?/g, ',')
  .replace(/titleBarStyle\s*:\s*['"]hidden(?:Inset)?['"]/g, 'titleBarStyle: "default"');
replaceIfChanged(mainJs, mainNext);

// 6) Pequeno fallback no renderer antigo: garante scroll para baixo depois de renderizar mensagens, sem substituir handlers.
if (exists(rendererApp)) {
  let app = read(rendererApp);
  if (!app.includes('NOELLE_UI_V12_SCROLL_FALLBACK')) {
    const fallback = `\n\n// NOELLE_UI_V12_SCROLL_FALLBACK\nwindow.addEventListener('noelle:v12-chat-updated', () => {\n  const log = document.getElementById('coreChatLog') || document.querySelector('.noelle-chat-v12-messages');\n  if (log) requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });\n});\n`;
    replaceIfChanged(rendererApp, app + fallback);
  }
}

// 7) Checagens de sintaxe.
const checks = [mainJs, preloadJs, rendererApp, v12Js].filter(exists).map((file) => [rel(file), runCheck(file)]);
let failed = false;
for (const [name, result] of checks) {
  if (result.ok) console.log(`OK sintaxe: ${name}`);
  else { failed = true; console.log(`FALHA sintaxe: ${name}\n${result.error}`); }
}

console.log('\nResumo:');
if (changed.length) {
  for (const item of [...new Set(changed)]) console.log(' - alterado:', item);
} else {
  console.log(' - nada precisava ser alterado');
}
console.log(' - backup:', path.relative(root, backupRoot));

if (warnings.length) {
  console.log('\nAvisos:');
  for (const w of warnings) console.log(' -', w);
}
if (failed) {
  console.log('\nATENCAO: houve falha de sintaxe. Restaure o backup antes de rodar.');
  process.exit(2);
}
console.log('\nUI V12 segura aplicada. Feche e abra a Noelle para testar.');
