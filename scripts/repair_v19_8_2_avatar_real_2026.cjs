"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const root = process.cwd();
const VERSION = "19.8.2-avatar-real-2026";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, "backups", `v19_8_2_avatar_real_${stamp}`);

function rel(p) { return path.relative(root, p).replace(/\\/g, "/"); }
function log(msg) { console.log(msg); }
function ok(msg) { console.log(`[OK] ${msg}`); }
function warn(msg) { console.log(`[AVISO] ${msg}`); }
function fail(msg) { console.error(`[ERRO] ${msg}`); process.exit(1); }
function exists(p) { try { return fs.existsSync(p); } catch { return false; } }
function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, text) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text, "utf8"); }
function backup(file) {
  const abs = path.join(root, file);
  if (!exists(abs)) return;
  const out = path.join(backupDir, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(abs, out);
  ok(`Backup: ${file} -> ${rel(out)}`);
}
function ensureCopy(srcRel, dstRel) {
  const src = path.join(root, srcRel);
  const dst = path.join(root, dstRel);
  if (!exists(src)) fail(`Arquivo do pack nao encontrado depois da copia: ${srcRel}`);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
}

function patchControlsHtml() {
  const file = path.join(root, "src", "controls.html");
  if (!exists(file)) fail("src/controls.html nao encontrado.");
  backup("src/controls.html");
  let html = read(file);

  // Remove tags legadas conhecidas se ainda existirem no HTML.
  html = html.replace(/\s*<script[^>]+(?:avatar_v19_5_panel_bootstrap|noelle_v19_3_complete_ui_md)[^>]*><\/script>\s*/gi, "\n");

  const cssTag = '<link rel="stylesheet" href="./styles/noelle_avatar_tab_v19_8_2.css">';
  if (!html.includes("noelle_avatar_tab_v19_8_2.css")) {
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${cssTag}\n</head>`);
    else html = `${cssTag}\n${html}`;
    ok("CSS da aba Avatar V19.8.2 registrado em src/controls.html.");
  } else {
    ok("CSS da aba Avatar V19.8.2 ja estava registrado.");
  }

  const scriptTag = '<script src="./renderer/noelle_avatar_tab_v19_8_2.js" defer></script>';
  if (!html.includes("noelle_avatar_tab_v19_8_2.js")) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `  ${scriptTag}\n</body>`);
    else html = `${html}\n${scriptTag}\n`;
    ok("Runtime da aba Avatar V19.8.2 registrado em src/controls.html.");
  } else {
    ok("Runtime da aba Avatar V19.8.2 ja estava registrado.");
  }

  write(file, html);
}

function patchControlsRenderer() {
  const file = path.join(root, "src", "renderer", "controls_window_app.js");
  if (!exists(file)) {
    warn("src/renderer/controls_window_app.js nao encontrado; a aba ainda sera inicializada por evento de clique.");
    return;
  }
  backup("src/renderer/controls_window_app.js");
  let js = read(file);
  if (js.includes("NoelleAvatarTabV1982")) {
    ok("controls_window_app.js ja contem hook V19.8.2.");
    return;
  }

  const hook = ' if (page === "avatar") window.NoelleAvatarTabV1982?.render?.();';
  const patterns = [
    /if \(page === "chat"\) scrollChatToBottom\(\);/,
    /if\(page==="chat"\)scrollChatToBottom\(\);/
  ];
  let patched = false;
  for (const pattern of patterns) {
    if (pattern.test(js)) {
      js = js.replace(pattern, (match) => `${match}${hook}`);
      patched = true;
      break;
    }
  }
  if (!patched) {
    // Fallback seguro: renderizar no DOMContentLoaded e clicks ja funciona. Nao forcar patch arriscado.
    warn("Nao encontrei ponto seguro para hook em setPage; usando runtime por evento de clique/DOMContentLoaded.");
  } else {
    write(file, js);
    ok("Hook V19.8.2 adicionado ao setPage(page === avatar).");
  }
}

function patchPackageJson() {
  const file = path.join(root, "package.json");
  if (!exists(file)) return warn("package.json nao encontrado.");
  backup("package.json");
  let pkg;
  try { pkg = JSON.parse(read(file)); } catch (err) { fail(`package.json invalido: ${err.message}`); }
  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["build:avatar-preview-v19.8.2"] = "node scripts/build_avatar_preview_v19_8_2_2026.cjs";
  pkg.scripts["repair:v19.8.2-avatar-real"] = "node scripts/repair_v19_8_2_avatar_real_2026.cjs";
  pkg.scripts["diagnostico:v19.8.2"] = "node scripts/diagnostico_v19_8_2_avatar_real_2026.cjs";
  pkg.scripts["status:v19.8.2"] = "node scripts/status_v19_8_2_avatar_real_2026.cjs";
  write(file, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para V19.8.2.");
}

function patchMemoria() {
  const file = path.join(root, "MEMORIA_GPT_NOELLE.md");
  if (!exists(file)) return warn("MEMORIA_GPT_NOELLE.md nao encontrado.");
  backup("MEMORIA_GPT_NOELLE.md");
  let md = read(file);
  if (!md.includes("V19.8.2 — Aba Avatar Real")) {
    md += `\n\n## V19.8.2 — Aba Avatar Real\n- A aba Avatar deve ser parte do renderer principal, nao injetada pelo preload.\n- Layout final: avatar grande a esquerda, setas embaixo, opcoes a direita.\n- Carrossel deve carregar avatar_manifest.json e renderizar um VRM/GLB por vez.\n- Room / Widget Mode / Preview-Teste continuam separados.\n- Nao reativar V19.3/V19.5 como runtime visual automatico.\n`;
    write(file, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado com nota V19.8.2.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md ja contem nota V19.8.2.");
  }
}

function maybeBuildPreview() {
  const buildScript = path.join(root, "scripts", "build_avatar_preview_v19_8_2_2026.cjs");
  if (!exists(buildScript)) return warn("Build script V19.8.2 nao encontrado; pulei bundle.");
  const nodeModules = path.join(root, "node_modules", "esbuild");
  if (!exists(nodeModules)) {
    warn("node_modules/esbuild nao encontrado; pulei build automatico. Rode npm install e depois opcao [4].");
    return;
  }
  try {
    cp.execFileSync(process.execPath, [buildScript], { cwd: root, stdio: "inherit" });
  } catch (err) {
    warn("Build automatico falhou. Rode a opcao [4] depois de verificar npm install.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle V19.8.2 - reparo Aba Avatar Real");
  log("================================================================");
  fs.mkdirSync(backupDir, { recursive: true });
  patchControlsHtml();
  patchControlsRenderer();
  patchPackageJson();
  patchMemoria();
  maybeBuildPreview();
  ok(`Reparacao V19.8.2 concluida. Backup: ${rel(backupDir)}`);
  log("[INFO] Rode: node scripts\\diagnostico_v19_8_2_avatar_real_2026.cjs");
}

main();
