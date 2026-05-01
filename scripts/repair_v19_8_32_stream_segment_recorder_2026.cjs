#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.32 — Stream Segment Recorder
  Fase 4: grava trecho em memória entre VAD start/finish.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.32-stream-segment-recorder-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_32_stream_segment_recorder_" + STAMP);

const MODULE_REL = "src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js";

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

function patchMicModuleEvents() {
  const rel = "src/renderer/modules/noelle_stream_audio_capture_v19_8_30.js";
  if (!exists(rel)) {
    fail(rel + " não encontrado. Aplique a Fase 2 primeiro.");
    return;
  }

  backup(rel);
  let code = read(rel);

  if (!code.includes("noelle-stream-mic-start-v19832")) {
    const needle = 'addLog("mic", "Microfone ligado. Nenhum processamento de fala será feito nesta fase.");';
    const fallbackNeedle = 'addLog("mic", "Microfone ligado. Nenhuma transcrição será feita nesta fase.");';
    const inject = `
      window.dispatchEvent(new CustomEvent("noelle-stream-mic-start-v19832", {
        detail: { stream, version: "19.8.32-stream-segment-recorder-2026" }
      }));`;

    if (code.includes(needle)) {
      code = code.replace(needle, needle + inject);
      ok("Evento mic-start V19.8.32 adicionado ao módulo de microfone.");
    } else if (code.includes(fallbackNeedle)) {
      code = code.replace(fallbackNeedle, fallbackNeedle + inject);
      ok("Evento mic-start V19.8.32 adicionado ao módulo de microfone.");
    } else {
      warn("Ponto exato de mic-start não encontrado; tentando injetar após state.lastError.");
      code = code.replace(
        'state.lastError = "";',
        'state.lastError = "";\n\n      window.dispatchEvent(new CustomEvent("noelle-stream-mic-start-v19832", { detail: { stream, version: "19.8.32-stream-segment-recorder-2026" } }));'
      );
    }
  } else {
    ok("Evento mic-start V19.8.32 já existe.");
  }

  if (!code.includes("noelle-stream-mic-stop-v19832")) {
    code = code.replace(
      "setMeter(0);",
      'setMeter(0);\n\n    window.dispatchEvent(new CustomEvent("noelle-stream-mic-stop-v19832", { detail: { version: "19.8.32-stream-segment-recorder-2026", reason } }));'
    );
    ok("Evento mic-stop V19.8.32 adicionado ao módulo de microfone.");
  } else {
    ok("Evento mic-stop V19.8.32 já existe.");
  }

  if (!code.includes("getInternalStream")) {
    code = code.replace(
      "function getState() {",
      "function getInternalStream() { return state.stream; }\n\n  function getState() {"
    );

    code = code.replace(
      "getState\n  });",
      "getState,\n    getInternalStream\n  });"
    );

    ok("getInternalStream adicionado ao módulo de microfone.");
  } else {
    ok("getInternalStream já existe.");
  }

  if (!code.includes("NOELLE_V19_8_32_SEGMENT_RECORDER_EVENTS")) {
    code = code.replace(
      '"use strict";',
      '"use strict";\n// NOELLE_V19_8_32_SEGMENT_RECORDER_EVENTS'
    );
  }

  write(rel, code);
}

function patchControlsHtml() {
  const rel = "src/controls.html";
  if (!exists(rel)) {
    fail("src/controls.html não encontrado.");
    return;
  }

  backup(rel);
  let html = read(rel);

  html = html.replace(/\s*<script[^>]+noelle_stream_segment_recorder_v19_8_32\.js[^>]*>\s*<\/script>\s*/gi, "\n");

  const tag = '  <script src="./renderer/modules/noelle_stream_segment_recorder_v19_8_32.js" defer data-noelle-stream-segment-v19-8-32="true"></script>';

  if (/noelle_stream_vad_v19_8_31\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+noelle_stream_vad_v19_8_31\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    ok("controls.html: recorder inserido após VAD.");
  } else if (/noelle_stream_audio_capture_v19_8_30\.js/i.test(html)) {
    html = html.replace(/(\s*<script[^>]+noelle_stream_audio_capture_v19_8_30\.js[^>]*>\s*<\/script>)/i, "$1\n" + tag);
    warn("controls.html: VAD não encontrado; recorder inserido após mic.");
  } else if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, tag + "\n</body>");
    warn("controls.html: scripts Stream não encontrados; recorder inserido antes de </body>.");
  } else {
    html += "\n" + tag + "\n";
    warn("controls.html: recorder anexado ao final.");
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

  if (!code.includes("NOELLE_V19_8_32_STREAM_SEGMENT_RECORDER")) {
    code = code.replace(
      '"use strict";',
      '"use strict";\n// NOELLE_V19_8_32_STREAM_SEGMENT_RECORDER'
    );
  }

  code = code.replace(
    "Fase 3: VAD simples ativo. A aba detecta fala e silêncio; transcrição, resposta da IA e voz entram em fases futuras.",
    "Fase 4: gravação de trecho em memória ativa. Transcrição, resposta da IA e voz entram em fases futuras."
  );

  code = code.replace(
    "Fase 2: microfone por botão ativo. Transcrição, resposta da IA e voz entram em fases futuras.",
    "Fase 4: gravação de trecho em memória ativa. Transcrição, resposta da IA e voz entram em fases futuras."
  );

  write(rel, code);
  ok("Stream page marcada com V19.8.32.");
}

function patchStreamCss() {
  const rel = "src/styles/noelle_stream_v19_8_29.css";
  if (!exists(rel)) {
    warn("CSS da Stream não encontrado; pulando.");
    return;
  }

  backup(rel);
  let css = read(rel);

  if (!css.includes("stream-v19832-segment-grid")) {
    css += `

/* Noelle/Yoru V19.8.32 — Segment Recorder */
.stream-v19832-segment-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.stream-v19832-segment-stats {
  display: grid;
  gap: 6px;
  min-width: 190px;
  color: rgba(255, 243, 232, .78);
}

.stream-v19832-segment-stats span {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, .06);
}

#streamSegmentAudioV19832 {
  width: 100%;
  margin-top: 12px;
}

@media (max-width: 900px) {
  .stream-v19832-segment-grid {
    grid-template-columns: 1fr;
  }
}
`;
    ok("CSS do recorder adicionado.");
  } else {
    ok("CSS do recorder já existe.");
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
  pkg.scripts["repair:v19.8.32-stream-segment"] = "node scripts/repair_v19_8_32_stream_segment_recorder_2026.cjs";
  pkg.scripts["diagnostico:v19.8.32-stream-segment"] = "node scripts/diagnostico_v19_8_32_stream_segment_recorder_2026.cjs";
  pkg.scripts["auto:v19.8.32-stream-segment"] = "node scripts/apply_v19_8_32_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);
  const add = `

## V19.8.32 — Stream Segment Recorder

- Fase 4 da aba Stream.
- Cria \`src/renderer/modules/noelle_stream_segment_recorder_v19_8_32.js\`.
- Grava em memória o trecho entre \`noelle-stream-vad-start-v19831\` e \`noelle-stream-vad-finish-v19831\`.
- Expõe evento \`noelle-stream-segment-ready-v19832\` com Blob/URL/duração/tamanho.
- Não salva em disco, não transcreve, não chama IA e não gera voz.
- O microfone continua ligando somente por botão.
`;

  if (!md.includes("V19.8.32 — Stream Segment Recorder")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.32.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.32 - Stream Segment Recorder");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  if (!exists(MODULE_REL)) fail(MODULE_REL + " não encontrado. Copie o pack inteiro para a raiz.");
  else ok(MODULE_REL + " existe");

  patchMicModuleEvents();
  patchControlsHtml();
  patchStreamPageMarker();
  patchStreamCss();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.32 terminou com problemas.");
  } else {
    ok("Reparo V19.8.32 concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.32 e teste a gravação de trecho.");
  }
}

main();
