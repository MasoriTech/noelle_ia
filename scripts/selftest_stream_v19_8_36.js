const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
let failed = false;

function ok(label) {
  console.log("[OK] " + label);
}

function fail(label) {
  failed = true;
  console.log("[ERRO] " + label);
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function nodeCheck(file) {
  try {
    cp.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
    ok("node --check " + file);
  } catch {
    fail("node --check " + file);
  }
}

console.log("Selftest Stream V19.8.36");
console.log("========================");

[
  "src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js",
  "scripts/apply_stream_v19_8_36.js",
  "scripts/checkup_stream_v19_8_36.js",
  "scripts/rollback_stream_v19_8_36.js"
].forEach((file) => exists(file) ? ok("existe " + file) : fail("faltando " + file));

[
  "src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js",
  "scripts/apply_stream_v19_8_36.js",
  "scripts/checkup_stream_v19_8_36.js",
  "scripts/rollback_stream_v19_8_36.js"
].forEach(nodeCheck);

const runtime = read("src/renderer/modules/noelle_stream_turn_history_runtime_v19_8_36.js");

runtime.includes("streamHistoryPanelV19836") ? ok("painel histórico") : fail("painel histórico ausente");
runtime.includes("localStorage") ? ok("localStorage") : fail("localStorage ausente");
runtime.includes("noelle:stream-ai-reply") ? ok("evento resposta IA") : fail("evento resposta IA ausente");
runtime.includes("noelle:stream-turn-saved") ? ok("evento turno salvo") : fail("evento turno salvo ausente");
runtime.includes("Copiar histórico") ? ok("copiar histórico") : fail("copiar histórico ausente");
runtime.includes("Exportar") ? ok("exportar") : fail("exportar ausente");
runtime.includes("PLACEHOLDER_PATTERNS") ? ok("bloqueia placeholders") : fail("bloqueio placeholders ausente");

if (failed) process.exit(1);
