#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const PACK_ROOT = path.resolve(__dirname, "..");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", `v19_7_avatar_modes_2026_${STAMP}`);
const MARK = "NOELLE_AVATAR_MODES_V19_7_2026";

function log(msg) { console.log(msg); }
function warn(msg) { console.warn(`[AVISO] ${msg}`); }
function fail(msg) { console.error(`[ERRO] ${msg}`); process.exitCode = 1; }

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
function write(rel, text) { ensureDir(path.dirname(path.join(ROOT, rel))); fs.writeFileSync(path.join(ROOT, rel), text, "utf8"); }

function backup(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  const dest = path.join(BACKUP_DIR, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function backupMany(files) {
  ensureDir(BACKUP_DIR);
  files.forEach(backup);
}

function copyPackFile(rel) {
  const src = path.join(PACK_ROOT, rel);
  const dest = path.join(ROOT, rel);
  if (!fs.existsSync(src)) throw new Error(`Arquivo do pack não encontrado: ${rel}`);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  log(`[OK] Copiado ${rel}`);
}

function patchLauncherHtml() {
  const rel = "src/launcher_view.html";
  if (!exists(rel)) {
    warn(`${rel} não existe. Pulando injeção do painel na janela principal.`);
    return;
  }
  let text = read(rel);
  const tag = `<script defer src="./renderer/avatar_mode_router_v19_7.js"></script>`;
  if (!text.includes("avatar_mode_router_v19_7.js")) {
    if (text.includes(`<script type="module" src="./renderer_dist/launcher.bundle.js"></script>`)) {
      text = text.replace(
        `<script type="module" src="./renderer_dist/launcher.bundle.js"></script>`,
        `${tag}\n\n  <script type="module" src="./renderer_dist/launcher.bundle.js"></script>`
      );
    } else if (text.includes("</body>")) {
      text = text.replace("</body>", `  ${tag}\n</body>`);
    } else {
      text += `\n${tag}\n`;
    }
    log("[OK] launcher_view.html recebeu o roteador de modos Avatar/Room/Widget/Preview.");
  } else {
    log("[OK] launcher_view.html já tinha o roteador de modos.");
  }
  write(rel, text);
}

function patchPreload() {
  const rel = "preload.js";
  if (!exists(rel)) {
    warn("preload.js não encontrado. O fallback window.open ainda funciona fora do Electron.");
    return;
  }
  let text = read(rel);
  if (!text.includes("openRoom:")) {
    text = text.replace(
      /openAvatar:\s*\(\)\s*=>\s*invoke\("avatar:open"\),/,
      (m) => `${m}\n\n  openRoom: () => invoke("room:open"),`
    );
  }
  if (!text.includes("openRoom: noelleAPI.openRoom")) {
    text = text.replace(
      /openAvatar:\s*noelleAPI\.openAvatar,/, 
      (m) => `${m}\n  openRoom: noelleAPI.openRoom,`
    );
  }
  write(rel, text);
  log("[OK] preload.js reforçado com noelleAPI.openRoom / desktopWidget.openRoom quando possível.");
}

function patchMainLabels() {
  const rel = "main.js";
  if (!exists(rel)) {
    warn("main.js não encontrado. Pulando rótulos da bandeja.");
    return;
  }
  let text = read(rel);
  text = text.replaceAll('label: "Abrir Room"', 'label: "Abrir Room / Quarto"');
  text = text.replaceAll('label: "Abrir widget/avatar"', 'label: "Abrir Widget Mode"');
  text = text.replaceAll('title: "Noelle Avatar Widget"', 'title: "Noelle Widget Mode"');
  write(rel, text);
  log("[OK] main.js teve rótulos ajustados para Room / Quarto e Widget Mode.");
}

function patchAvatarLabLauncherLabel() {
  const rel = "src/renderer/avatar_lab_launcher_v19_6.js";
  if (!exists(rel)) {
    warn(`${rel} não encontrado. Pulando renome do botão Avatar Lab.`);
    return;
  }
  let text = read(rel);
  text = text.replaceAll('btn.textContent = " Avatar Lab"', 'btn.textContent = " Preview / Teste"');
  text = text.replaceAll('Abrir Noelle Avatar Lab V19.6', 'Abrir Preview / Teste VRM V19.7');
  write(rel, text);
  log("[OK] Avatar Lab renomeado visualmente para Preview / Teste quando o launcher existir.");
}

function patchAvatarLabTopLevelAwait() {
  const rel = "src/renderer/avatar_lab_v19_6_app.js";
  if (!exists(rel)) return;
  let text = read(rel);
  if (!/^\s*await\s+/m.test(text)) {
    log("[OK] Avatar Lab sem top-level await aparente.");
    return;
  }
  if (text.includes("bootAvatarLabV196")) {
    log("[OK] Avatar Lab já tem boot async.");
    return;
  }

  const patterns = [
    {
      name: "manifest+avatar+animate",
      re: /await\s+loadMotionManifest\(\);\s*await\s+loadAvatar\(([^;]+?)\);\s*animate\(\);?/s,
      rep: (_m, args) => `async function bootAvatarLabV196() {\n  await loadMotionManifest();\n  await loadAvatar(${args});\n  animate();\n}\n\nvoid bootAvatarLabV196().catch((err) => {\n  console.error("[Avatar Lab V19.6] Falha ao iniciar:", err);\n  try { setStatus("Erro ao iniciar Preview/Teste: " + (err?.message || err)); } catch {}\n});`
    },
    {
      name: "manifest+avatar",
      re: /await\s+loadMotionManifest\(\);\s*await\s+loadAvatar\(([^;]+?)\);?/s,
      rep: (_m, args) => `async function bootAvatarLabV196() {\n  await loadMotionManifest();\n  await loadAvatar(${args});\n}\n\nvoid bootAvatarLabV196().catch((err) => {\n  console.error("[Avatar Lab V19.6] Falha ao iniciar:", err);\n  try { setStatus("Erro ao iniciar Preview/Teste: " + (err?.message || err)); } catch {}\n});`
    }
  ];

  let patched = false;
  for (const p of patterns) {
    if (p.re.test(text)) {
      text = text.replace(p.re, p.rep);
      log(`[OK] Corrigido top-level await do Avatar Lab pelo padrão ${p.name}.`);
      patched = true;
      break;
    }
  }
  if (!patched) {
    warn("Foi encontrado top-level await no Avatar Lab, mas o padrão não foi reconhecido. Mantive o arquivo e deixei o diagnóstico apontar isso.");
  }
  write(rel, text);
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return;
  let pkg;
  try { pkg = JSON.parse(read(rel)); } catch (err) { warn("package.json inválido para patch automático."); return; }
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts["diagnostico:avatar-modes"]) {
    pkg.scripts["diagnostico:avatar-modes"] = "node scripts/diagnostico_avatar_modes_v19_7_2026.cjs";
  }
  if (typeof pkg.version === "string" && !pkg.version.includes("v19.7")) {
    pkg.version = pkg.version.replace(/19\.6\.0-avatar-lab-isolated-2026/i, "19.7.0-avatar-modes-2026");
  }
  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  log("[OK] package.json recebeu script diagnostico:avatar-modes.");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;
  let text = read(rel);
  if (text.includes(MARK)) {
    log("[OK] MEMORIA_GPT_NOELLE.md já tinha nota V19.7.");
    return;
  }
  text += `\n\n---\n\n## ${MARK}\n\nFluxo confirmado pelo usuário em 2026:\n\n1. Janela principal mantém Chat, Avatar, Configurações e Sobre.\n2. Aba Avatar escolhe/visualiza o VRM e oferece três saídas claras.\n3. **Room / Quarto** aplica cenário, objetos GLB e interações reais.\n4. **Widget Mode** abre a personagem sem fundo/transparente.\n5. **Preview / Teste** é laboratório seguro para testar VRM, câmera, pose, expression e VRMA sem enviar estado real para a Room.\n\nRegra: Avatar/Preview não deve controlar a Room diretamente; Room é quem aplica o estado real de quarto/objetos.\n`;
  write(rel, text);
  log("[OK] MEMORIA_GPT_NOELLE.md atualizada com regra V19.7.");
}

function main() {
  if (!exists("package.json") || !exists("main.js")) {
    fail("Rode este script na raiz do projeto noelle_ia, onde ficam package.json e main.js.");
    return;
  }

  backupMany([
    "main.js",
    "preload.js",
    "package.json",
    "MEMORIA_GPT_NOELLE.md",
    "src/launcher_view.html",
    "src/renderer/avatar_lab_launcher_v19_6.js",
    "src/renderer/avatar_lab_v19_6_app.js",
  ]);

  copyPackFile("src/renderer/avatar_mode_router_v19_7.js");
  copyPackFile("docs/NOELLE_FLUXO_AVATAR_ROOM_WIDGET_PREVIEW_V19_7.md");

  patchLauncherHtml();
  patchPreload();
  patchMainLabels();
  patchAvatarLabLauncherLabel();
  patchAvatarLabTopLevelAwait();
  patchPackageJson();
  patchMemory();

  log(`\n[OK] Pack V19.7 aplicado. Backup em: ${BACKUP_DIR}`);
  log("[OK] Agora rode: npm run diagnostico:avatar-modes");
}

main();
