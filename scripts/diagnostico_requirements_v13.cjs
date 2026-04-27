#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const files = [
  'requirements.txt',
  path.join('tools', 'noelle_stt', 'requirements.txt'),
  path.join('tools', 'noelle_stt', 'noelle_stt_worker.py'),
  path.join('tools', 'noelle_stt', 'transcribe_audio.py'),
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function run(cmd, args) {
  try {
    return cp.spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true });
  } catch (err) {
    return { error: err };
  }
}

console.log('==============================================');
console.log(' Noelle IA V13 - diagnostico requirements/STT');
console.log('==============================================');

let ok = true;
for (const rel of files) {
  const yes = exists(rel);
  console.log(`${yes ? '[ok]' : '[falha]'} ${rel}`);
  if (!yes) ok = false;
}

const reqPath = path.join(ROOT, 'tools', 'noelle_stt', 'requirements.txt');
if (fs.existsSync(reqPath)) {
  const req = fs.readFileSync(reqPath, 'utf8');
  for (const name of ['faster-whisper', 'ctranslate2', 'av', 'huggingface-hub']) {
    const yes = req.includes(name);
    console.log(`${yes ? '[ok]' : '[aviso]'} requirement menciona ${name}`);
    if (!yes && name === 'faster-whisper') ok = false;
  }
}

const pyLauncher = run('py', ['-3', '--version']);
if (!pyLauncher.error && pyLauncher.status === 0) {
  console.log(`[ok] Python launcher: ${(pyLauncher.stdout || pyLauncher.stderr || '').trim()}`);
} else {
  const py = run('python', ['--version']);
  if (!py.error && py.status === 0) {
    console.log(`[ok] Python: ${(py.stdout || py.stderr || '').trim()}`);
  } else {
    console.log('[aviso] Python nao encontrado no PATH. Instale Python 3.10+ ou abra terminal novo.');
  }
}

console.log('');
console.log(ok ? '[ok] Diagnostico basico aprovado.' : '[falha] Corrija os itens marcados acima.');
process.exit(ok ? 0 : 1);
