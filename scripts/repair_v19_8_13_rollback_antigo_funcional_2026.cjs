#!/usr/bin/env node
'use strict';

/*
  Noelle/Yoru V19.8.13 — Rollback para último estado funcional.
  Objetivo:
  - desfazer os patches agressivos de Configurações/tema que deixaram a janela vazia;
  - restaurar src/controls.html de um backup funcional, se existir;
  - manter preload limpo e iniciar.bat único;
  - remover apenas referências V19.8.11/11a/11b/11c/11d/12 que causaram tela vazia/repetição.
*/

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const VERSION = '19.8.13-rollback-antigo-funcional-2026';
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const BACKUP_DIR = path.join(ROOT, 'backups', `v19_8_13_rollback_antigo_funcional_${STAMP}`);

const BAD_RUNTIME_PATTERNS = [
  /<script[^>]+noelle_config_dashboard_v19_8_11[a-z]?\.js[^>]*>\s*<\/script>\s*/gi,
  /<link[^>]+noelle_config_dashboard_v19_8_11[a-z]?\.css[^>]*>\s*/gi,
  /<script[^>]+noelle_safe_theme_recovery_v19_8_11d\.js[^>]*>\s*<\/script>\s*/gi,
  /<link[^>]+noelle_safe_theme_recovery_v19_8_11d\.css[^>]*>\s*/gi,
  /<script[^>]+noelle_overlay_guard_v19_8_12\.js[^>]*>\s*<\/script>\s*/gi,
  /<link[^>]+noelle_static_theme_v19_8_12\.css[^>]*>\s*/gi
];

const BAD_TEXT = [
  'Modo recuperação ativo.',
  'O runtime visual agressivo foi removido.',
  'Visual final da Noelle, sem botões flutuantes antigos e com tema salvo.'
];

function log(msg){ console.log(msg); }
function ok(msg){ log(`[OK] ${msg}`); }
function warn(msg){ log(`[AVISO] ${msg}`); }
function fail(msg){ log(`[ERRO] ${msg}`); process.exitCode = 1; }

function full(rel){ return path.join(ROOT, rel); }
function exists(rel){ return fs.existsSync(full(rel)); }
function readFile(file){ return fs.readFileSync(file, 'utf8'); }
function writeRel(rel, content){
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, 'utf8');
}
function readRel(rel){ return fs.readFileSync(full(rel), 'utf8'); }

function backupCurrent(rel){
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok(`Backup atual: ${rel}`);
}

function listBackupControls(){
  const backupsRoot = full('backups');
  if (!fs.existsSync(backupsRoot)) return [];
  const dirs = fs.readdirSync(backupsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => path.join(backupsRoot, d.name));

  const found = [];
  for (const dir of dirs) {
    const f = path.join(dir, 'src', 'controls.html');
    if (fs.existsSync(f)) {
      const stat = fs.statSync(f);
      found.push({ file: f, dir, mtimeMs: stat.mtimeMs, name: path.basename(dir) });
    }
  }
  return found.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function scoreControlsHtml(html, backupName){
  let score = 0;
  const text = html.toLowerCase();

  // Precisa parecer a janela principal real.
  if (text.includes('noelle')) score += 3;
  if (text.includes('principal')) score += 2;
  if (text.includes('avatar')) score += 2;
  if (text.includes('chat ia')) score += 2;
  if (text.includes('configura')) score += 2;
  if (text.includes('sobre')) score += 1;

  // Estado funcional antigo: antes dos dashboards agressivos.
  if (text.includes('noelle_theme_manager_v19_8_10.js')) score += 4;
  if (text.includes('noelle_themes_v19_8_10.css')) score += 3;

  // Penaliza os patches que causaram tela vazia/repetição.
  if (/noelle_config_dashboard_v19_8_11[a-z]?\.js/i.test(html)) score -= 20;
  if (/noelle_safe_theme_recovery_v19_8_11d\.js/i.test(html)) score -= 20;
  if (/noelle_overlay_guard_v19_8_12\.js/i.test(html)) score -= 20;
  if (/Modo recuperação ativo|runtime visual agressivo|Visual final da Noelle/i.test(html)) score -= 12;

  // Preferência de backups antes de 11/12, especialmente 10/10a/8.10.
  if (/v19_8_10|19_8_10/i.test(backupName)) score += 6;
  if (/v19_8_9|19_8_9/i.test(backupName)) score += 3;
  if (/v19_8_11|19_8_11|v19_8_12|19_8_12/i.test(backupName)) score -= 4;

  // HTML vazio ou pequeno demais é ruim.
  if (html.length < 1500) score -= 10;

  return score;
}

function cleanBadRuntimes(html){
  let out = html;
  for (const p of BAD_RUNTIME_PATTERNS) out = out.replace(p, '\n');
  for (const t of BAD_TEXT) out = out.split(t).join('');
  return out;
}

function restoreBestControls(){
  backupCurrent('src/controls.html');

  const candidates = listBackupControls()
    .map(item => {
      let html = '';
      try { html = readFile(item.file); } catch { html = ''; }
      return { ...item, html, score: scoreControlsHtml(html, item.name) };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);

  if (!candidates.length) {
    warn('Nenhum backup funcional de src/controls.html encontrado. Vou apenas limpar os runtimes agressivos do arquivo atual.');
    if (exists('src/controls.html')) {
      const cleaned = cleanBadRuntimes(readRel('src/controls.html'));
      writeRel('src/controls.html', cleaned);
      ok('src/controls.html atual limpo de runtimes agressivos.');
    } else {
      fail('src/controls.html não existe e não há backup para restaurar.');
    }
    return;
  }

  const chosen = candidates[0];
  let restored = cleanBadRuntimes(chosen.html);

  writeRel('src/controls.html', restored);
  ok(`src/controls.html restaurado do backup: backups/${chosen.name}/src/controls.html`);
  ok(`Pontuação do backup escolhido: ${chosen.score}`);
}

function patchPackageJson(){
  const rel = 'package.json';
  if (!exists(rel)) {
    warn('package.json não encontrado; pulando.');
    return;
  }
  backupCurrent(rel);
  let pkg;
  try { pkg = JSON.parse(readRel(rel)); }
  catch (e) { fail(`package.json inválido: ${e.message}`); return; }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts['repair:v19.8.13-rollback'] = 'node scripts/repair_v19_8_13_rollback_antigo_funcional_2026.cjs';
  pkg.scripts['diagnostico:v19.8.13-rollback'] = 'node scripts/diagnostico_v19_8_13_rollback_antigo_funcional_2026.cjs';

  writeRel(rel, JSON.stringify(pkg, null, 2) + '\n');
  ok(`package.json atualizado para ${VERSION}.`);
}

function patchMemory(){
  const rel = 'MEMORIA_GPT_NOELLE.md';
  if (!exists(rel)) return;
  backupCurrent(rel);
  let md = readRel(rel);
  if (!md.includes('V19.8.13 — Rollback antigo funcional')) {
    md += '\n\n## V19.8.13 — Rollback antigo funcional\n\n- Reverte a janela principal para um backup funcional anterior aos runtimes agressivos de Configurações V19.8.11/11a/11b/11c/11d/12.\n- Remove referências a dashboards/guards que causaram tela vazia ou texto repetido.\n- Não apaga assets VRM/VRMA/PNG/GLB, Chat, Room ou Widget.\n- O iniciar.bat continua único e a opção [1] apenas inicia.\n';
    writeRel(rel, md);
    ok('MEMORIA_GPT_NOELLE.md atualizado.');
  }
}

function main(){
  log('================================================================');
  log(' Noelle/Yoru V19.8.13 - Rollback antigo funcional');
  log('================================================================');
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  restoreBestControls();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) fail('Rollback V19.8.13 terminou com problemas.');
  else {
    ok(`Rollback V19.8.13 concluído. Backup do estado atual: ${path.relative(ROOT, BACKUP_DIR)}`);
    log('[INFO] Rode o diagnóstico e depois inicie pela opção [1].');
  }
}

main();
