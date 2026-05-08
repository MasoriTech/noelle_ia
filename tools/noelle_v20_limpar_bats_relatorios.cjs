#!/usr/bin/env node
/*
 Noelle v20 - limpeza segura de .bat e relatorios
 - Nao apaga nada.
 - Move arquivos para _archive/v20_limpeza_bats_relatorios_YYYYMMDD_HHMMSS.
 - Mantem a raiz mais limpa para a reestrutura v20.
*/

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--simular');
const keepInstallers = args.has('--manter-aplicadores');
const deep = args.has('--profundo');

const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, '').replace(/T/, '_').replace(/\..+/, '');
const archiveRoot = path.join(root, '_archive', `v20_limpeza_bats_relatorios_${stamp}`);
const archiveBats = path.join(archiveRoot, 'bats');
const archiveReports = path.join(archiveRoot, 'relatorios');
const logDir = path.join(root, 'data', 'logs');
const logPath = path.join(logDir, `limpeza_bats_relatorios_v20_${stamp}.md`);

const moved = [];
const kept = [];
const skipped = [];
const errors = [];

const rootKeepBatExact = new Set([
  'iniciar.bat',
  'aplicar_limpeza_bats_relatorios_v20.bat',
]);

const protectedDirs = new Set([
  'node_modules', '.git', '.venv', 'venv', 'release', 'dist', 'build',
  '_archive', 'noelle_app', 'assets', 'src', 'main', 'preload', 'renderer',
  'core', 'config', 'data', 'docs', 'scripts', 'tools', 'stt', 'models'
]);

const reportExts = new Set(['.txt', '.md', '.log', '.json', '.yaml', '.yml', '.csv', '.html']);
const reportNameRe = /(relat[oó]rio|relatorio|report|diagn[oó]stico|diagnostico|diagnostic|invent[aá]rio|inventario|inventory|resultado|result|erro|error|debug|log|teste|test)/i;
const reportFolderRe = /^(reports?|relatorios?|relat[oó]rios?|logs?|diagnosticos?|diagn[oó]sticos?|inventarios?|invent[aá]rios?|resultados?|test-results?|coverage)$/i;

function ensureDir(dir) {
  if (!dryRun) fs.mkdirSync(dir, { recursive: true });
}

function uniqueDest(dest) {
  if (!fs.existsSync(dest)) return dest;
  const parsed = path.parse(dest);
  let i = 2;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}_${i}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    i += 1;
  }
}

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function moveSafe(src, destDir, reason) {
  try {
    const dest = uniqueDest(path.join(destDir, path.basename(src)));
    moved.push({ from: rel(src), to: rel(dest), reason });
    if (!dryRun) {
      ensureDir(destDir);
      fs.renameSync(src, dest);
    }
  } catch (err) {
    errors.push({ item: rel(src), error: err && err.message ? err.message : String(err) });
  }
}

function listRootEntries() {
  try {
    return fs.readdirSync(root, { withFileTypes: true });
  } catch (err) {
    errors.push({ item: '.', error: err.message });
    return [];
  }
}

function shouldKeepBat(name) {
  const lower = name.toLowerCase();
  if (rootKeepBatExact.has(lower)) return true;
  if (keepInstallers && lower.startsWith('aplicar_')) return true;
  return false;
}

function cleanRootBats(entries) {
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (path.extname(ent.name).toLowerCase() !== '.bat') continue;

    const full = path.join(root, ent.name);
    if (shouldKeepBat(ent.name)) {
      kept.push({ item: ent.name, reason: 'BAT essencial mantido na raiz' });
      continue;
    }
    moveSafe(full, archiveBats, 'BAT duplicado/antigo movido para arquivo seguro');
  }
}

function isReportFileName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext);
  return reportExts.has(ext) && reportNameRe.test(base);
}

function cleanRootReports(entries) {
  for (const ent of entries) {
    const full = path.join(root, ent.name);

    if (ent.isFile() && isReportFileName(ent.name)) {
      moveSafe(full, archiveReports, 'Relatorio/log/diagnostico antigo movido para arquivo seguro');
      continue;
    }

    if (ent.isDirectory() && reportFolderRe.test(ent.name)) {
      moveSafe(full, archiveReports, 'Pasta de relatorios/logs movida para arquivo seguro');
      continue;
    }
  }
}

function walkForDeepReports(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    skipped.push({ item: rel(dir), reason: `Nao foi possivel ler: ${err.message}` });
    return;
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const relative = rel(full);
    const first = relative.split('/')[0];

    if (protectedDirs.has(first)) {
      skipped.push({ item: relative, reason: 'Pasta protegida no modo profundo' });
      continue;
    }

    if (ent.isDirectory()) {
      walkForDeepReports(full);
      continue;
    }

    if (ent.isFile() && isReportFileName(ent.name)) {
      const subdir = path.dirname(relative).replace(/[\\/:*?"<>|]/g, '_');
      moveSafe(full, path.join(archiveReports, subdir), 'Relatorio encontrado no modo profundo');
    }
  }
}

function writeRestoreBat() {
  const restorePath = path.join(archiveRoot, 'RESTAURAR_LIMPEZA_V20.bat');
  const lines = [
    '@echo off',
    'setlocal EnableExtensions',
    'chcp 65001 >nul',
    'cd /d "%~dp0\\..\\.."',
    'echo Restaurando arquivos movidos pela limpeza v20...',
    ''
  ];

  for (const item of moved) {
    const fromArchive = item.to.replace(/\//g, '\\');
    const toOriginal = item.from.replace(/\//g, '\\');
    lines.push(`if exist "${fromArchive}" (`);
    lines.push(`  if not exist "${path.dirname(toOriginal).replace(/\//g, '\\')}" mkdir "${path.dirname(toOriginal).replace(/\//g, '\\')}"`);
    lines.push(`  move /Y "${fromArchive}" "${toOriginal}" >nul`);
    lines.push(')');
  }
  lines.push('echo Restauracao concluida.');
  lines.push('pause');

  if (!dryRun) {
    ensureDir(archiveRoot);
    fs.writeFileSync(restorePath, lines.join('\r\n'), 'utf8');
  }
}

function writeLog() {
  const lines = [];
  lines.push('# Noelle v20 - limpeza de BATs e relatorios');
  lines.push('');
  lines.push(`Data: ${now.toLocaleString('pt-BR')}`);
  lines.push(`Modo: ${dryRun ? 'simulacao / dry-run' : 'aplicado'}`);
  lines.push(`Raiz: ${root}`);
  lines.push(`Arquivo: ${archiveRoot}`);
  lines.push('');

  lines.push('## Mantidos');
  if (!kept.length) lines.push('- Nenhum.');
  for (const k of kept) lines.push(`- ${k.item} — ${k.reason}`);
  lines.push('');

  lines.push('## Movidos');
  if (!moved.length) lines.push('- Nenhum arquivo precisou ser movido.');
  for (const m of moved) lines.push(`- ${m.from} -> ${m.to} — ${m.reason}`);
  lines.push('');

  lines.push('## Ignorados');
  if (!skipped.length) lines.push('- Nenhum.');
  for (const s of skipped.slice(0, 120)) lines.push(`- ${s.item} — ${s.reason}`);
  if (skipped.length > 120) lines.push(`- ...mais ${skipped.length - 120} itens ignorados.`);
  lines.push('');

  lines.push('## Erros');
  if (!errors.length) lines.push('- Nenhum.');
  for (const e of errors) lines.push(`- ${e.item}: ${e.error}`);
  lines.push('');

  if (!dryRun) {
    ensureDir(logDir);
    fs.writeFileSync(logPath, lines.join('\n'), 'utf8');
  }

  console.log(lines.join('\n'));
  if (!dryRun) console.log(`\n[OK] Relatorio salvo em: ${rel(logPath)}`);
}

function main() {
  console.log('==============================================================');
  console.log(' Noelle v20 - Limpeza segura de .bat e relatorios');
  console.log('==============================================================');
  console.log(`Raiz detectada: ${root}`);
  if (dryRun) console.log('[MODO] Simulacao: nada sera movido.');
  if (keepInstallers) console.log('[OPCAO] Mantendo APLICAR_*.bat na raiz.');
  if (deep) console.log('[OPCAO] Modo profundo ativado para relatorios fora da raiz.');
  console.log('');

  const entries = listRootEntries();
  cleanRootBats(entries);
  cleanRootReports(entries);
  if (deep) walkForDeepReports(root);

  if (moved.length && !dryRun) writeRestoreBat();
  writeLog();

  if (errors.length) process.exit(1);
}

main();
