#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.30c — Stream Tab Recover
  Corrige aba Stream sumida.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.30c-stream-tab-recover-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_30c_stream_tab_recover_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js";

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

  html = html.replace(/\s*<script[^>]+noelle_stream_tab_recover_v19_8_30c\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_stream_tab_recover_v19_8_30c.js" defer data-noelle-stream-recover-v19-8-30c="true"></script>';

  if (/controls_window_app\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+controls_window_app\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    ok("controls.html: recovery Stream inserido após controls_window_app.js.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: controls_window_app.js não encontrado; recovery inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: recovery anexado ao final.");
  }

  write(rel, html);
}

function patchStreamPageComment() {
  const rel = "src/renderer/pages/noelle_stream_page_v19_8_29.js";
  if (!exists(rel)) {
    warn("Stream page V19.8.29 não encontrada. Recovery criará página fallback.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = code.replace(/Fase 1:\s*\/\*\s*NOELLE_V19_8_30_MIC_BUTTON_READY\s*\*\//g, "Fase 1:");
  code = code.replace(/\/\*\s*NOELLE_V19_8_30_MIC_BUTTON_READY\s*\*\/\s*/g, "");

  if (!code.includes("NOELLE_V19_8_30C_STREAM_TAB_RECOVER_READY")) {
    code = code.replace('"use strict";', '"use strict";\n// NOELLE_V19_8_30C_STREAM_TAB_RECOVER_READY');
  }

  write(rel, code);
  ok("Stream page validada para recovery V19.8.30c.");
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
  pkg.scripts["repair:v19.8.30c-stream-tab-recover"] = "node scripts/repair_v19_8_30c_stream_tab_recover_2026.cjs";
  pkg.scripts["diagnostico:v19.8.30c-stream-tab-recover"] = "node scripts/diagnostico_v19_8_30c_stream_tab_recover_2026.cjs";
  pkg.scripts["auto:v19.8.30c-stream-tab-recover"] = "node scripts/apply_v19_8_30c_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.30c — Stream Tab Recover

- Corrige aba Stream sumida após V19.8.30b.
- Cria \`src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js\`.
- Recovery garante botão/menu Stream e página Stream depois que \`controls_window_app.js\` carrega.
- Não liga microfone sozinho.
- Não chama STT, Ollama ou TTS.
`;

  if (!md.includes("V19.8.30c — Stream Tab Recover")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.30c.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.30c - Stream Tab Recover");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  else ok(MODULE_REL + " existe");

  patchControlsHtml();
  patchStreamPageComment();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.30c terminou com problemas.");
  } else {
    ok("Reparo V19.8.30c concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.30c e teste a aba Stream.");
  }
}

main();
