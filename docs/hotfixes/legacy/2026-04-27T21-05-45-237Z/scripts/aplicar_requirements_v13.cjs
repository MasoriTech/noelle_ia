#!/usr/bin/env node
/*
  Noelle IA V13 - atualiza requirements Python sem substituir telas antigas.
  - Cria backup dos requirements existentes.
  - Atualiza requirements.txt da raiz e tools/noelle_stt/requirements.txt.
  - Nao instala nada automaticamente; a instalacao fica no INICIAR.bat.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(ROOT, 'backups', `requirements_v13_${stamp}`);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readIfExists(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function backupFile(file) {
  if (!fs.existsSync(file)) return false;
  ensureDir(backupDir);
  const rel = path.relative(ROOT, file);
  const dest = path.join(backupDir, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(file, dest);
  return true;
}

function writeFileSafe(file, content) {
  ensureDir(path.dirname(file));
  const old = readIfExists(file);
  if (old !== null && old.trim() === content.trim()) {
    console.log(`[ok] Ja atualizado: ${path.relative(ROOT, file)}`);
    return;
  }
  backupFile(file);
  fs.writeFileSync(file, content.replace(/\n/g, '\r\n'), 'utf8');
  console.log(`[ok] Atualizado: ${path.relative(ROOT, file)}`);
}

const rootRequirements = `# Noelle IA - requirements Python de entrada
# Mantem um arquivo na raiz para ferramentas/IDEs e redireciona para o STT.
# Instalar: py -3 -m pip install -r requirements.txt

-r tools/noelle_stt/requirements.txt
`;

const sttRequirements = `# Noelle IA 2026 - dependencias Python do STT local
# Foco: Windows, CPU, faster-whisper, audio curto do microfone.
# Python recomendado: 3.10+.
# Evitei travar onnxruntime aqui porque as wheels variam por versao do Python.

faster-whisper==1.2.1
ctranslate2>=4.7.1,<5
av>=17.0.1,<18
huggingface-hub>=1.12.0,<2
`;

const report = `Noelle IA V13 - requirements atualizados
========================================

Arquivos atualizados:
- requirements.txt
- tools/noelle_stt/requirements.txt

Dependencias principais:
- faster-whisper==1.2.1
- ctranslate2>=4.7.1,<5
- av>=17.0.1,<18
- huggingface-hub>=1.12.0,<2

Notas:
- O projeto atual ja usa tools/noelle_stt/requirements.txt para STT.
- O requirements.txt da raiz foi adicionado para facilitar IDE, pip e automacao.
- onnxruntime fica como dependencia transitiva do faster-whisper para o pip escolher wheel compativel com seu Python.
- Se o Python for antigo, prefira Python 3.10 ou 3.11 no Windows.

Backup:
${backupDir}
`;

function main() {
  console.log('==============================================');
  console.log(' Noelle IA V13 - atualizando requirements.txt');
  console.log('==============================================');
  writeFileSafe(path.join(ROOT, 'requirements.txt'), rootRequirements);
  writeFileSafe(path.join(ROOT, 'tools', 'noelle_stt', 'requirements.txt'), sttRequirements);
  writeFileSafe(path.join(ROOT, 'docs', 'DEPENDENCIAS_PYTHON_V13.txt'), report);
  console.log('');
  console.log('[ok] Requirements atualizados com backup seguro.');
  console.log(`Backup: ${backupDir}`);
}

try {
  main();
} catch (err) {
  console.error('[erro] Falha ao atualizar requirements:', err && err.message ? err.message : err);
  process.exit(1);
}
