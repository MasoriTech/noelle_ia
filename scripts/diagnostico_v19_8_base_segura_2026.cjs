#!/usr/bin/env node
/* Diagnostico V19.8.0 Base Segura */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = process.cwd();
let errors = 0;
let warnings = 0;

function rel(p) { return path.join(root, p); }
function exists(p) { return fs.existsSync(rel(p)); }
function read(p) { return fs.readFileSync(rel(p), 'utf8'); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { warnings++; console.log(`[AVISO] ${msg}`); }
function err(msg) { errors++; console.log(`[ERRO] ${msg}`); }
function info(msg) { console.log(`[INFO] ${msg}`); }

function section(text, startLabel, endLabels) {
  const lower = text.toLowerCase();
  const start = lower.indexOf(startLabel.toLowerCase());
  if (start < 0) return '';
  let end = text.length;
  for (const label of endLabels) {
    const pos = lower.indexOf(label.toLowerCase(), start + startLabel.length);
    if (pos >= 0 && pos < end) end = pos;
  }
  return text.slice(start, end);
}

function checkNodeSyntax(file) {
  if (!exists(file)) return;
  try {
    cp.execFileSync(process.execPath, ['--check', rel(file)], { stdio: 'pipe' });
    ok(`node --check ${file}`);
  } catch (e) {
    err(`node --check falhou: ${file}`);
    const out = [e.stdout, e.stderr].filter(Boolean).map(Buffer.isBuffer).length ? '' : '';
    const msg = String((e.stderr && e.stderr.toString()) || (e.stdout && e.stdout.toString()) || e.message || 'erro desconhecido');
    console.log(msg.trim());
  }
}

console.log('================================================================');
console.log(' Diagnostico Noelle V19.8.0 Base Segura');
console.log('================================================================');
console.log('');

if (!exists('package.json')) {
  err('package.json nao encontrado. Rode na raiz do projeto.');
} else {
  try {
    const pkg = JSON.parse(read('package.json'));
    info(`package: ${pkg.name || '(sem nome)'}`);
    info(`version: ${pkg.version || '(sem versao)'}`);
    if (!String(pkg.version || '').includes('19.8.0')) {
      warn('package.json ainda nao esta marcado como V19.8.0. Use iniciar.bat opcao [3] para reparar.');
    } else {
      ok('package.json marcado como V19.8.0.');
    }
    const scripts = pkg.scripts || {};
    if (scripts['diagnostico:v19.8-base']) ok('script diagnostico:v19.8-base encontrado.');
    else warn('script diagnostico:v19.8-base nao encontrado no package.json.');
  } catch (e) {
    err(`package.json invalido: ${e.message}`);
  }
}

if (!exists('iniciar.bat')) {
  err('iniciar.bat nao encontrado.');
} else {
  const bat = read('iniciar.bat');
  ok('iniciar.bat encontrado.');
  const activeBatLines = bat.split(/\r?\n/).filter((line) => {
    const t = line.trim();
    return t && !/^(:?rem\b|::|echo\b)/i.test(t);
  }).join('\n');
  const forbiddenGlobal = [/Activate\.ps1/i, /Set-ExecutionPolicy/i, /\bpowershell(?:\.exe)?\b/i];
  const forbiddenFound = forbiddenGlobal.filter((re) => re.test(activeBatLines));
  for (const re of forbiddenFound) err(`iniciar.bat contem comando ativo proibido: ${re}`);
  if (!forbiddenFound.length) ok('iniciar.bat sem comando ativo de PowerShell/Activate.ps1/Set-ExecutionPolicy.');

  const start = section(bat, ':start_program', [':run_diag', ':repair_project', ':rebuild_avatar', ':move_old_bats', ':delete_old_bats', ':show_status', ':end']);
  if (!start) {
    warn('Nao encontrei a secao :start_program para validar a opcao [1].');
  } else {
    const forbiddenStart = [/repair_v19_8/i, /diagnostico_v19_8/i, /fix_/i, /apply_/i, /aplicar/i, /npm\.cmd\s+run\s+build/i, /npm\s+run\s+build/i];
    const found = forbiddenStart.filter((re) => re.test(start));
    if (found.length) {
      err(`Opcao [1] parece executar reparo/build/diagnostico: ${found.map(String).join(', ')}`);
    } else {
      ok('Opcao [1] do iniciar.bat parece limpa: nao aplica patch, nao roda build, nao reescreve arquivos.');
    }
    if (/npm\.cmd\s+start|npm\s+start|electron\.cmd/i.test(start)) ok('Opcao [1] possui comando de inicializacao.');
    else warn('Opcao [1] nao parece conter npm start/electron fallback.');
  }
}

const batFiles = fs.readdirSync(root).filter((f) => f.toLowerCase().endsWith('.bat'));
if (batFiles.length > 1) warn(`Existem ${batFiles.length} .bat na raiz. Use iniciar.bat opcao [5] para mover os antigos para backup.`);
else ok('Apenas um .bat principal na raiz.');

if (exists('preload.js')) {
  const preload = read('preload.js');
  checkNodeSyntax('preload.js');
  if (/avatar_v19_5_panel_bootstrap/i.test(preload)) warn('preload.js ainda referencia avatar_v19_5_panel_bootstrap.js. Isso deve ser limpo na Fase V19.8.1.');
  else ok('preload.js nao referencia avatar_v19_5_panel_bootstrap.js.');
  if (/noelle_v19_3_complete_ui_md/i.test(preload)) warn('preload.js ainda referencia noelle_v19_3_complete_ui_md.js. Isso deve ser limpo na Fase V19.8.1.');
  else ok('preload.js nao referencia noelle_v19_3_complete_ui_md.js.');
} else {
  warn('preload.js nao encontrado.');
}

if (exists('main.js')) checkNodeSyntax('main.js');
checkNodeSyntax('scripts/repair_v19_8_base_segura_2026.cjs');
checkNodeSyntax('scripts/diagnostico_v19_8_base_segura_2026.cjs');
checkNodeSyntax('scripts/status_v19_8_base_segura_2026.cjs');

if (exists('src/assets/avatar_manifest.json')) {
  try {
    const manifest = JSON.parse(read('src/assets/avatar_manifest.json'));
    if (Array.isArray(manifest)) {
      ok(`avatar_manifest.json valido: ${manifest.length} avatar(es).`);
      if (manifest.length === 0) warn('Manifest existe, mas nao tem avatar. Use opcao [4] ou verifique pastas de assets.');
    } else {
      err('avatar_manifest.json nao e um array.');
    }
  } catch (e) {
    err(`avatar_manifest.json invalido: ${e.message}`);
  }
} else {
  warn('src/assets/avatar_manifest.json nao encontrado. Use opcao [4] para gerar.');
}

if (exists('src/renderer/avatar_v19_5_panel_bootstrap.js')) {
  const legacy = read('src/renderer/avatar_v19_5_panel_bootstrap.js');
  if (/BroadcastChannel|localStorage|Sincronizar Room|MutationObserver|setInterval/i.test(legacy)) {
    warn('Runtime antigo avatar_v19_5_panel_bootstrap.js contem logica tecnica/DOM antiga. Isso sera tratado na Fase V19.8.1/V19.8.2.');
  }
}

console.log('');
console.log('----------------------------------------------------------------');
if (errors) {
  console.log(`[ERRO] Diagnostico reprovado: ${errors} erro(s), ${warnings} aviso(s).`);
  process.exitCode = 1;
} else {
  console.log(`[OK] Diagnostico V19.8 Base aprovado com ${warnings} aviso(s).`);
  if (warnings) console.log('[INFO] Avisos esperados nesta fase indicam trabalho para as proximas fases, nao falha da base segura.');
}
