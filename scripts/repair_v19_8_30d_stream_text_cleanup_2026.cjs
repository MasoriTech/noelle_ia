#!/usr/bin/env node
"use strict";

/*
  Noelle/Yoru V19.8.30d — Stream text cleanup
  Atualiza textos antigos da aba Stream após o microfone por botão já estar ativo.
  Não altera lógica do microfone.
*/

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "19.8.30d-stream-text-cleanup-2026";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_DIR = path.join(ROOT, "backups", "v19_8_30d_stream_text_cleanup_" + STAMP);

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

function patchStreamPage() {
  const rel = "src/renderer/pages/noelle_stream_page_v19_8_29.js";
  if (!exists(rel)) {
    warn(rel + " não encontrado; pulando.");
    return;
  }

  backup(rel);
  let code = read(rel);

  const replacements = [
    [
      "Stream IA · Fase 1",
      "Stream IA · Fase 2"
    ],
    [
      "Skeleton visual da aba Stream. Nesta fase o microfone ainda não é ativado.",
      "Microfone por botão ativo. A escuta só começa quando você aperta Iniciar escuta."
    ],
    [
      "Microfone desligado. Aperte iniciar quando quiser testar o fluxo visual.",
      "Microfone desligado. Aperte Iniciar escuta para ativar o medidor real."
    ],
    [
      "Fase 1: botão liga apenas o estado visual. Microfone real entra na V19.8.30.",
      "Fase 2: microfone por botão ativo. Transcrição, resposta da IA e voz entram em fases futuras."
    ],
    [
      "Escuta visual ligada",
      "Microfone ligado"
    ],
    [
      "Escuta visual ligada. Microfone real entra na próxima fase.",
      "Microfone ligando por botão. A barra mostra o volume real."
    ],
    [
      "Escuta visual iniciada. Nenhum áudio foi capturado.",
      "Escuta iniciada por botão. Somente medidor de volume ativo."
    ],
    [
      "Escuta visual parada.",
      "Escuta parada."
    ]
  ];

  for (const [from, to] of replacements) {
    if (code.includes(from)) {
      code = code.split(from).join(to);
      ok("Atualizado texto: " + from);
    }
  }

  if (!code.includes("NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP")) {
    code = code.replace(
      '"use strict";',
      '"use strict";\n// NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP'
    );
  }

  write(rel, code);
  ok("Stream page atualizada para textos V19.8.30d.");
}

function patchRecoverFallback() {
  const rel = "src/renderer/modules/noelle_stream_tab_recover_v19_8_30c.js";
  if (!exists(rel)) {
    warn(rel + " não encontrado; pulando fallback.");
    return;
  }

  backup(rel);
  let code = read(rel);

  code = code.replace(
    "A aba Stream foi recuperada. O microfone só deve ligar pelo botão Iniciar escuta.",
    "A aba Stream foi recuperada. O microfone só liga pelo botão Iniciar escuta."
  );

  code = code.replace(
    "V19.8.30c: recuperação visual da aba. STT/Ollama/TTS continuam desligados.",
    "V19.8.30d: microfone por botão ativo. Transcrição, resposta da IA e voz ficam para fases futuras."
  );

  if (!code.includes("NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP")) {
    code = code.replace(
      '"use strict";',
      '"use strict";\n// NOELLE_V19_8_30D_STREAM_TEXT_CLEANUP'
    );
  }

  write(rel, code);
  ok("Recovery fallback atualizado para textos V19.8.30d.");
}

function patchDocs() {
  const rel = "docs/STREAM_MIC_BUTTON_V19_8_30.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);

  if (!md.includes("V19.8.30d")) {
    md += `

## V19.8.30d — Ajuste de textos

A aba Stream agora deve mostrar textos compatíveis com a fase atual:

- Fase 2: microfone por botão ativo;
- transcrição fica para fase futura;
- resposta da IA fica para fase futura;
- voz fica para fase futura.
`;
    write(rel, md);
    ok("Doc do microfone atualizada.");
  }
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
  pkg.scripts["repair:v19.8.30d-stream-text-cleanup"] = "node scripts/repair_v19_8_30d_stream_text_cleanup_2026.cjs";
  pkg.scripts["diagnostico:v19.8.30d-stream-text-cleanup"] = "node scripts/diagnostico_v19_8_30d_stream_text_cleanup_2026.cjs";
  pkg.scripts["auto:v19.8.30d-stream-text-cleanup"] = "node scripts/apply_v19_8_30d_auto_2026.cjs";

  write(rel, JSON.stringify(pkg, null, 2) + "\n");
  ok("package.json atualizado para " + VERSION + ".");
}

function patchMemory() {
  const rel = "MEMORIA_GPT_NOELLE.md";
  if (!exists(rel)) return;

  backup(rel);
  let md = read(rel);

  const add = `

## V19.8.30d — Stream text cleanup

- Atualiza textos antigos da aba Stream que ainda diziam "Fase 1" ou "microfone real entra na V19.8.30".
- A interface passa a indicar corretamente: Fase 2, microfone por botão ativo.
- Não altera a lógica do microfone.
- Não adiciona transcrição, resposta da IA ou voz.
`;

  if (!md.includes("V19.8.30d — Stream text cleanup")) {
    md += add;
    write(rel, md);
    ok("MEMORIA_GPT_NOELLE.md atualizado.");
  } else {
    ok("MEMORIA_GPT_NOELLE.md já contém nota V19.8.30d.");
  }
}

function main() {
  log("================================================================");
  log(" Noelle/Yoru V19.8.30d - Stream text cleanup");
  log("================================================================");

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  patchStreamPage();
  patchRecoverFallback();
  patchDocs();
  patchPackageJson();
  patchMemory();

  if (process.exitCode) {
    fail("Reparo V19.8.30d terminou com problemas.");
  } else {
    ok("Reparo V19.8.30d concluído. Backup: " + path.relative(ROOT, BACKUP_DIR));
    log("[INFO] Rode o diagnóstico V19.8.30d e teste a aba Stream.");
  }
}

main();
