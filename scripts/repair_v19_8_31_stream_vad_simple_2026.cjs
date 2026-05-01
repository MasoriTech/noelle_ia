#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.31 — Stream VAD Simple
  Fase 3: detecta fala/silêncio usando nível de áudio da Fase 2.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.31-stream-vad-simple-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_31_stream_vad_simple_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_stream_vad_v19_8_31.js";

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

  html = html.replace(/\s*<script[^>]+noelle_stream_vad_v19_8_31\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_stream_vad_v19_8_31.js" defer data-noelle-stream-vad-v19-8-31="true"></script>';

  if (/noelle_stream_audio_capture_v19_8_30\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+noelle_stream_audio_capture_v19_8_30\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    ok("controls.html: VAD inserido após módulo de microfone.");
  } else if (/noelle_stream_tab_recover_v19_8_30c\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+noelle_stream_tab_recover_v19_8_30c\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    warn("controls.html: módulo mic não encontrado; VAD inserido após recovery.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: scripts Stream não encontrados; VAD inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: VAD anexado ao final.");
  }

  write(rel, html);
}

function patchStreamPageMarker() {
  const rel = "src/renderer/pages/noelle_stream_page_v19_8_29.js";
  if (!exists(rel)) {
    warn("Stream page V19.8.29 não encontrada; recovery pode criar fallback.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (!code.includes("NOELLE_V19_8_31_STREAM_VAD_SIMPLE")) {
    code = code.replace(
      '"use strict";',
      '"use strict";\n// NOELLE_V19_8_31_STREAM_VAD_SIMPLE'
    );
  }

  code = code.replace(
    "Fase 2: microfone por botão ativo. Transcrição, resposta da IA e voz entram em fases futuras.",
    "Fase 3: VAD simples ativo. A aba detecta fala e silêncio; transcrição, resposta da IA e voz entram em fases futuras."
  );

  write(rel, code);
  ok("Stream page marcada com V19.8.31.");
}

function patchStreamCss() {
  const rel = "src/styles/noelle_stream_v19_8_29.css";
  if (!exists(rel)) {
    warn("CSS da Stream não encontrado; pulando.");
    return;
  }

  backup(rel);
  let css = read(rel);

  if (!css.includes("stream-v19831-vad-grid")) {
    css += `

/* Noelle/Yoru V19.8.31 — VAD Simple */
.stream-v19831-vad-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.stream-v19831-vad-stats {
  display: grid;
  gap: 6px;
  min-width: 180px;
  color: rgba(255, 243, 232, .78);
}

.stream-v19831-vad-stats span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .06);
}

@media (max-width: 900px) {
  .stream-v19831-vad-grid {
    grid-template-columns: 1fr;
  }
}
`;
    ok("CSS VAD adicionado.");
  } else {
    ok("CSS VAD já existe.");
  }

  write(rel, css);
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
  pkg.scripts["repair:v19.8.31-stream-vad"] = "node scripts/repair_v19_8_31_stream_vad_simple_2026.cjs";
  pkg.scripts["diagnostico:v19.8.31-stream-vad"] = "node scripts/diagnostico_v19_8_31_stream_vad_simple_2026.cjs";
  pkg.scripts["auto:v19.8.31-stream-vad"] = "node scripts/apply_v19_8_31_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.31 — Stream VAD Simple

- Fase 3 da aba Stream.
- Cria \`src/renderer/modules/noelle_stream_vad_v19_8_31.js\`.
- Detecta fala iniciada e trecho finalizado usando eventos de nível de áudio do módulo V19.8.30.
- Não grava áudio, não transcreve, não chama Ollama e não gera voz.
- O microfone continua ligando somente por botão.
- Próxima fase recomendada: preparar gravação de trecho para STT, ainda com StreamGuard obrigatório.
`;

  if (!md.includes("V19.8.31 — Stream VAD Simple")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.31.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.31 - Stream VAD Simple");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  else ok(MODULE_REL + " existe");

  patchControlsHtml();
  patchStreamPageMarker();
  patchStreamCss();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.31 terminou com problemas.");
  } else {
    ok("Reparo V19.8.31 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.31 e teste o VAD na aba Stream.");
  }
}

main();
