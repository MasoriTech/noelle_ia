#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.29 — Stream Tab Skeleton
  Fase 1: cria aba Stream visual sem microfone real.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.29-stream-tab-skeleton-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_29_stream_tab_skeleton_" + STAMP);

const JS_REL = "src/renderer/pages/noelle_stream_page_v19_8_29.js";
const CSS_REL = "src/styles/noelle_stream_v19_8_29.css";

function log(msg) { console.log(msg); }
function ok(msg) { log("[OK] " + msg); }
function warn(msg) { log("[AVISO] " + msg); }
function fail(msg) { log("[ERRO] " + msg); process.exitCode = 1; }

function full(rel) { return path.join(ROOT, rel); }
function exists(rel) { return fs.existsSync(full(rel)); }
function read(rel) { return fs.readFileSync(full(rel), "utf8"); }
function write(rel, content) {
  fs.mkdirSync(path.dirname(full(rel)), { recursive: true });
  fs.writeFileSync(full(rel), content, "utf8");
}

function backup(rel) {
  if (!exists(rel)) return;
  const dest = path.join(BACKUP_DIR, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(full(rel), dest);
  ok("Backup: " + rel);
}

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) {
    fail("src/controls.html não encontrado.");
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<link[^>]+noelle_stream_v19_8_29\.css[^>]*>\s*/gi, "\n");
  html = html.replace(/\s*<script[^>]+noelle_stream_page_v19_8_29\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const cssTag = '  <link rel="stylesheet" href="./styles/noelle_stream_v19_8_29.css" data-noelle-stream-v19-8-29="true">';
  const jsTag = '  <script src="./renderer/pages/noelle_stream_page_v19_8_29.js" defer data-noelle-stream-v19-8-29="true"></script>';

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, cssTag + "\n</head>");
  } else {
    html = cssTag + "\n" + html;
  }

  if (/controls_window_app\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+controls_window_app\.js[^>]*>\s*<\/script>)/i, "\n" + jsTag + "$1");
    ok("controls.html: Stream script inserido antes de controls_window_app.js.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, jsTag + "\n</body>");
    warn("controls.html: controls_window_app.js não encontrado; Stream script inserido antes de </body>.");
  } else {
    html += "\n" + jsTag + "\n";
    warn("controls.html: </body> não encontrado; Stream script anexado ao final.");
  }

  write(rel, html);
}

function patchControlsApp() {
  const rel = "src/renderer/controls_window_app.js";
  if (!exists(rel)) {
    warn("controls_window_app.js não encontrado; aba ainda pode funcionar por injeção própria.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (!code.includes("NOELLE_V19_8_29_STREAM_TAB_SKELETON")) {
    code = code.replace('"use strict";', '"use strict"; /* NOELLE_V19_8_29_STREAM_TAB_SKELETON */');
    if (!code.includes("NOELLE_V19_8_29_STREAM_TAB_SKELETON")) {
      code = '/* NOELLE_V19_8_29_STREAM_TAB_SKELETON */\n' + code;
    }
  }

  if (!/stream:\s*"Stream IA"/.test(code)) {
    code = code.replace(/about:\s*"Sobre"\s*\}/, 'stream: "Stream IA", about: "Sobre" }');
    ok("controls_window_app.js: título Stream IA adicionado.");
  } else {
    ok("controls_window_app.js: título Stream IA já existe.");
  }

  if (!code.includes('if (page === "stream") window.NoelleStreamPageV19829?.render?.();')) {
    if (code.includes('if (page === "avatar") window.NoelleAvatarTabV1982?.render?.();')) {
      code = code.replace(
        'if (page === "avatar") window.NoelleAvatarTabV1982?.render?.();',
        'if (page === "avatar") window.NoelleAvatarTabV1982?.render?.(); if (page === "stream") window.NoelleStreamPageV19829?.render?.();'
      );
      ok("controls_window_app.js: hook render da Stream adicionado.");
    } else {
      warn("controls_window_app.js: hook do Avatar não encontrado; Stream dependerá da própria injeção.");
    }
  } else {
    ok("controls_window_app.js: hook Stream já existe.");
  }

  write(rel, code);
}

function patchPackageJson() {
  const rel = "package.json";
  if (!exists(rel)) return;

  backup(rel);
  let pkg;
  try {
    pkg = JSON.parse(read(rel));
  } catch (err) {
    fail("package.json inválido: " + err.message);
    return;
  }

  pkg.version = VERSION;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["repair:v19.8.29-stream-tab"] = "node scripts/repair_v19_8_29_stream_tab_skeleton_2026.cjs";
  pkg.scripts["diagnostico:v19.8.29-stream-tab"] = "node scripts/diagnostico_v19_8_29_stream_tab_skeleton_2026.cjs";
  pkg.scripts["auto:v19.8.29-stream-tab"] = "node scripts/apply_v19_8_29_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.29 — Stream Tab Skeleton

- Cria a aba **Stream** como Fase 1 da IA em tempo real.
- A aba Stream nesta fase é apenas visual: não liga microfone, não transcreve, não chama Ollama e não chama TTS.
- Regra inicial do projeto: o microfone nunca liga automaticamente; só poderá ligar quando o usuário apertar "Iniciar escuta" em fase futura.
- Regra principal StreamGuard: Noelle/Yoru só responde se a fala for uma pergunta direcionada a ela.
- Wake words obrigatórias por padrão: Noelle, Yoru, Ei Noelle, Ei Yoru.
- Exemplo: "Como faço isso?" não responde. "Noelle, como faço isso?" responde.
- Nunca deixar conversa contínua como padrão.
`;

  if (!md.includes("V19.8.29 — Stream Tab Skeleton")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.29.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.29 - Stream Tab Skeleton");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  [JS_REL, CSS_REL].forEach((rel) => {
    if (exists(rel)) ok(rel + " existe");
    else fail(rel + " não encontrado. Copie o pack inteiro para a raiz.");
  });

  patchControlsHtml();
  patchControlsApp();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.29 terminou com problemas.");
  } else {
    ok("Reparo V19.8.29 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.29 e teste a aba Stream.");
  }
}

main();
