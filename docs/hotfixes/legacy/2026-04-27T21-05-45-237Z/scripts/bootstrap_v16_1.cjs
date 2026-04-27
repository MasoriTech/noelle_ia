#!/usr/bin/env node
/*
  Noelle V16.1 bootstrap
  Correção principal: npm NÃO é obrigatório se node_modules/electron já existe.
  O npm só é exigido quando realmente for necessário instalar dependências.
*/
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MODE = process.argv[2] || 'start';
const IS_WIN = process.platform === 'win32';

function log(msg = '') { console.log(msg); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function info(msg) { console.log(`[INFO] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function err(msg) { console.log(`[ERRO] ${msg}`); }

function exists(p) { return fs.existsSync(path.join(ROOT, p)); }
function abs(p) { return path.join(ROOT, p); }

function run(command, args = [], options = {}) {
  const result = cp.spawnSync(command, args, {
    cwd: ROOT,
    stdio: options.quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: options.shell ?? (IS_WIN && /\.cmd$|\.bat$/i.test(command)),
    env: process.env,
  });
  if (!options.allowFail && result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} falhou com codigo ${result.status}`);
  }
  return result;
}

function capture(command, args = [], options = {}) {
  const result = cp.spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: options.shell ?? (IS_WIN && /\.cmd$|\.bat$/i.test(command)),
    env: process.env,
  });
  return result;
}

function which(command) {
  const checker = IS_WIN ? 'where' : 'which';
  const result = capture(checker, [command], { shell: true });
  if (result.status === 0) {
    const first = String(result.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean)[0];
    return first || command;
  }
  return null;
}

function commandVersion(command, args = ['--version']) {
  const result = capture(command, args, { shell: true });
  if (result.status === 0) return String(result.stdout || result.stderr || '').trim();
  return null;
}

function findNpm() {
  const candidates = IS_WIN ? ['npm.cmd', 'npm.exe', 'npm'] : ['npm'];
  for (const c of candidates) {
    const found = which(c);
    if (found) return found;
  }

  // Fallback comum quando Node está instalado, mas o PATH do npm não atualizou.
  if (IS_WIN) {
    const possible = [
      'C:\\Program Files\\nodejs\\npm.cmd',
      'C:\\Program Files (x86)\\nodejs\\npm.cmd',
      path.join(process.env.APPDATA || '', 'npm', 'npm.cmd'),
    ];
    for (const p of possible) {
      if (p && fs.existsSync(p)) return p;
    }
  }
  return null;
}

function findPython() {
  const venvPython = IS_WIN ? abs('.venv\\Scripts\\python.exe') : abs('.venv/bin/python');
  if (fs.existsSync(venvPython)) return { cmd: venvPython, isVenv: true };
  const py = IS_WIN ? which('py') : null;
  if (py) return { cmd: py, argsPrefix: ['-3'], isVenv: false };
  const python = which('python');
  if (python) return { cmd: python, argsPrefix: [], isVenv: false };
  const python3 = which('python3');
  if (python3) return { cmd: python3, argsPrefix: [], isVenv: false };
  return null;
}

function hasElectronInstalled() {
  return exists('node_modules/electron/package.json') || exists('node_modules/.bin/electron') || exists('node_modules/.bin/electron.cmd');
}

function electronCommand() {
  const winCmd = abs('node_modules\\.bin\\electron.cmd');
  const nixCmd = abs('node_modules/.bin/electron');
  if (IS_WIN && fs.existsSync(winCmd)) return winCmd;
  if (fs.existsSync(nixCmd)) return nixCmd;
  return null;
}

function ensureNode() {
  log('[1/6] Verificando Node...');
  const nodeVersion = commandVersion('node');
  if (!nodeVersion) {
    throw new Error('Node nao encontrado. Instale Node.js com npm ou corrija o PATH.');
  }
  ok(`Node: ${nodeVersion}`);
}

function ensureNpmOnlyIfNeeded(forceInstall = false) {
  log('');
  log('[2/6] Verificando dependencias npm...');

  if (!forceInstall && hasElectronInstalled()) {
    ok('node_modules/electron encontrado. Pulando npm install.');
    const npm = findNpm();
    if (npm) {
      const npmVersion = commandVersion(`"${npm}"`, ['--version']);
      if (npmVersion) ok(`npm disponivel: ${npmVersion}`);
    } else {
      warn('npm nao esta no PATH, mas as dependencias Node ja existem. Vou iniciar usando node_modules local.');
    }
    return;
  }

  const npm = findNpm();
  if (!npm) {
    err('npm nao encontrado e node_modules/electron tambem nao existe.');
    log('');
    log('Como corrigir:');
    log('  1. Reinstale Node.js marcando a opcao "npm package manager"; ou');
    log('  2. Adicione C:\\Program Files\\nodejs ao PATH; ou');
    log('  3. Abra um novo terminal depois de instalar o Node.');
    log('');
    log('Se voce instalou Node por ZIP/portable, ele pode vir sem npm.');
    throw new Error('npm necessario para instalar dependencias ausentes.');
  }

  const npmVersion = commandVersion(`"${npm}"`, ['--version']);
  ok(`npm: ${npmVersion || npm}`);
  info('Instalando/atualizando dependencias npm porque electron nao foi encontrado localmente...');
  run(npm, ['install'], { shell: true });
}

function ensurePythonDeps(force = false) {
  log('');
  log('[3/6] Verificando Python/STT/TTS...');
  const reqRoot = exists('requirements.txt');
  const reqStt = exists('tools/noelle_stt/requirements.txt');
  const reqTts = exists('tools/noelle_tts/requirements.txt');

  if (!reqRoot && !reqStt && !reqTts) {
    warn('Nenhum requirements.txt encontrado. Pulando Python.');
    return;
  }

  const venvPython = IS_WIN ? abs('.venv\\Scripts\\python.exe') : abs('.venv/bin/python');
  if (!fs.existsSync(venvPython)) {
    const py = findPython();
    if (!py) {
      warn('Python nao encontrado. Pulando STT/TTS.');
      return;
    }
    info('Criando .venv...');
    run(py.cmd, [...(py.argsPrefix || []), '-m', 'venv', '.venv'], { shell: IS_WIN && /\.cmd$|\.bat$/i.test(py.cmd) });
  } else {
    ok('.venv encontrado.');
  }

  const marker = abs('.venv/.noelle_deps_ok_v16_1');
  if (!force && fs.existsSync(marker)) {
    ok('Dependencias Python ja foram preparadas. Pulando pip install.');
    return;
  }

  const pipArgs = ['-m', 'pip', 'install', '--upgrade', 'pip'];
  run(venvPython, pipArgs, { shell: false, allowFail: true });
  if (reqRoot) run(venvPython, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { shell: false, allowFail: true });
  if (!reqRoot && reqStt) run(venvPython, ['-m', 'pip', 'install', '-r', 'tools/noelle_stt/requirements.txt'], { shell: false, allowFail: true });
  if (!reqRoot && reqTts) run(venvPython, ['-m', 'pip', 'install', '-r', 'tools/noelle_tts/requirements.txt'], { shell: false, allowFail: true });
  fs.mkdirSync(path.dirname(marker), { recursive: true });
  fs.writeFileSync(marker, new Date().toISOString(), 'utf8');
  ok('Python/STT/TTS preparado ou tentativa concluida.');
}

function repairManifestsIfAvailable() {
  log('');
  log('[4/6] Verificando manifests/assets...');
  const script = abs('scripts/rebuild_manifests_v16.cjs');
  if (fs.existsSync(script)) {
    run('node', [script], { allowFail: true });
  } else {
    warn('scripts/rebuild_manifests_v16.cjs nao encontrado. Apenas verificando assets.');
  }

  const required = [
    'src/assets/Noelle.vrm',
    'src/assets/motion_manifest.json',
    'src/assets/item_manifest.json',
    'src/assets/expressions/manifest.json',
  ];
  for (const file of required) {
    if (exists(file)) ok(file);
    else warn(`${file} ausente`);
  }
}

function checkOllama() {
  log('');
  log('[5/6] Verificando Ollama/modelo...');
  const ollama = which('ollama');
  if (!ollama) {
    warn('Ollama nao encontrado no PATH. Chat pode abrir, mas IA local nao responde ate o Ollama estar instalado/aberto.');
    return;
  }
  ok(`Ollama encontrado: ${ollama}`);

  const ps = capture(ollama, ['list'], { shell: true });
  if (ps.status !== 0) {
    warn('Ollama existe, mas nao respondeu ao comando list. Tentando continuar.');
    return;
  }
  const list = String(ps.stdout || '');
  if (/qwen3:0\.6b|qwen3\s+0\.6b/i.test(list)) {
    ok('Modelo qwen3:0.6b encontrado.');
  } else {
    warn('Modelo qwen3:0.6b nao encontrado. Se quiser, rode: ollama pull qwen3:0.6b');
  }
}

function startElectron() {
  log('');
  log('[6/6] Iniciando Noelle...');
  const electron = electronCommand();
  if (!electron) throw new Error('Electron local nao encontrado. Rode a opcao [2] Preparar/Reparar dependencias.');
  ok(`Electron local: ${electron}`);
  run(electron, ['.'], { shell: IS_WIN });
}

function cleanBats() {
  const bats = fs.readdirSync(ROOT).filter((name) => /\.bat$/i.test(name) && name.toLowerCase() !== 'iniciar.bat');
  if (!bats.length) {
    ok('Nenhum outro .bat na raiz.');
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = abs(path.join('backups', `bats_limpos_${stamp}`));
  fs.mkdirSync(dest, { recursive: true });
  for (const b of bats) {
    fs.renameSync(abs(b), path.join(dest, b));
    ok(`Movido: ${b} -> ${path.relative(ROOT, dest)}`);
  }
}

function diag() {
  log('================================================================');
  log(' Diagnostico Noelle V16.1');
  log('================================================================');
  const nodeVersion = commandVersion('node');
  log(`Node: ${nodeVersion || 'NAO ENCONTRADO'}`);
  const npm = findNpm();
  log(`npm: ${npm ? `${npm} (${commandVersion(`"${npm}"`, ['--version']) || 'sem versao'})` : 'NAO ENCONTRADO'}`);
  log(`node_modules/electron: ${hasElectronInstalled() ? 'OK' : 'AUSENTE'}`);
  log(`electron cmd: ${electronCommand() || 'AUSENTE'}`);
  log(`.venv: ${exists('.venv') ? 'OK' : 'AUSENTE'}`);
  log(`Noelle.vrm: ${exists('src/assets/Noelle.vrm') ? 'OK' : 'AUSENTE'}`);
  log(`motions: ${exists('src/assets/motions') ? fs.readdirSync(abs('src/assets/motions')).filter(f => /\.vrma$/i.test(f)).length : 0}`);
  log(`expressions: ${exists('src/assets/expressions') ? fs.readdirSync(abs('src/assets/expressions')).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f)).length : 0}`);
  log(`items: ${exists('src/assets/items') ? fs.readdirSync(abs('src/assets/items')).filter(f => /\.(glb|gltf)$/i.test(f)).length : 0}`);
  const ollama = which('ollama');
  log(`Ollama: ${ollama || 'NAO ENCONTRADO'}`);
}

try {
  if (MODE === 'diag') {
    diag();
  } else if (MODE === 'clean-bats') {
    cleanBats();
  } else if (MODE === 'prepare') {
    ensureNode();
    ensureNpmOnlyIfNeeded(true);
    ensurePythonDeps(true);
    repairManifestsIfAvailable();
    checkOllama();
    ok('Preparo/Reparo concluido.');
  } else {
    ensureNode();
    ensureNpmOnlyIfNeeded(false);
    ensurePythonDeps(false);
    repairManifestsIfAvailable();
    checkOllama();
    startElectron();
  }
} catch (e) {
  log('');
  err(e.message || String(e));
  log('');
  err('Processo falhou. Veja as mensagens acima.');
  process.exitCode = 1;
}
