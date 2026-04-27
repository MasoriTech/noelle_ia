"use strict";

/*
 Noelle IA - Manutenção V17 segura
 - Não redesenha UI inteira.
 - Não apaga assets.
 - Corrige bootstrap, package, gitignore, manifests e sobras de hotfix com backup.
*/

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const NOW = new Date().toISOString().replace(/[:.]/g, "-");
const BACKUP_ROOT = path.join(ROOT, "backups", `v17_manutencao_${NOW}`);
const LOG_DIR = path.join(ROOT, "logs");
const BOOT_STATE = path.join(ROOT, ".noelle_v17_bootstrap.json");
const MODEL_FAST = "qwen3:0.6b";

const FIXED_VERSIONS = {
  dependencies: {
    "three": "0.184.0",
    "@pixiv/three-vrm": "3.5.2",
    "@pixiv/three-vrm-animation": "3.5.2"
  },
  devDependencies: {
    "electron": "41.3.0",
    "electron-builder": "26.8.1",
    "esbuild": "0.28.0"
  }
};

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function log(message) {
  console.log(message);
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, "v17_manutencao.log"), `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch (_) {}
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function readText(relPath, fallback = "") {
  const file = path.join(ROOT, relPath);
  try {
    return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : fallback;
  } catch (_) {
    return fallback;
  }
}

function writeText(relPath, content) {
  const file = path.join(ROOT, relPath);
  backup(relPath);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, "utf8");
}

function readJson(relPath, fallback = null) {
  try {
    const text = readText(relPath, "");
    return text.trim() ? JSON.parse(text) : fallback;
  } catch (err) {
    log(`[AVISO] JSON inválido em ${relPath}: ${err.message}`);
    return fallback;
  }
}

function writeJson(relPath, value) {
  writeText(relPath, `${JSON.stringify(value, null, 2)}\n`);
}

function backup(relPath) {
  const source = path.join(ROOT, relPath);
  if (!fs.existsSync(source)) return;
  const dest = path.join(BACKUP_ROOT, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) fs.copyFileSync(source, dest);
}

function moveWithBackup(relPath, destRel) {
  const source = path.join(ROOT, relPath);
  const dest = path.join(ROOT, destRel);
  if (!fs.existsSync(source)) return false;
  backup(relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    const parsed = path.parse(dest);
    const renamed = path.join(parsed.dir, `${parsed.name}_${Date.now()}${parsed.ext}`);
    fs.renameSync(source, renamed);
    log(`[OK] Movido ${relPath} -> ${rel(renamed)}`);
  } else {
    fs.renameSync(source, dest);
    log(`[OK] Movido ${relPath} -> ${destRel}`);
  }
  return true;
}

function run(cmd, args, options = {}) {
  const printable = `${cmd} ${args.join(" ")}`.trim();
  if (!options.quiet) log(`[CMD] ${printable}`);
  const result = cp.spawnSync(cmd, args, {
    cwd: ROOT,
    shell: process.platform === "win32",
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    timeout: options.timeout || undefined
  });
  if (options.capture) {
    return {
      ok: result.status === 0,
      status: result.status,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      error: result.error
    };
  }
  return { ok: result.status === 0, status: result.status, error: result.error };
}

function commandExists(cmd) {
  const probe = process.platform === "win32" ? run("where", [cmd], { capture: true, quiet: true, timeout: 8000 }) : run("which", [cmd], { capture: true, quiet: true, timeout: 8000 });
  return probe.ok;
}

function findNpm() {
  if (process.platform !== "win32") return commandExists("npm") ? "npm" : null;
  const where = run("where", ["npm.cmd"], { capture: true, quiet: true, timeout: 8000 });
  if (where.ok) {
    const first = where.stdout.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
    if (first) return first;
  }
  const candidates = [
    path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "npm.cmd"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs", "npm.cmd"),
    path.join(process.env.APPDATA || "", "npm", "npm.cmd")
  ];
  return candidates.find((candidate) => candidate && fs.existsSync(candidate)) || null;
}

function normalizeGitignore() {
  log("[1/10] Corrigindo .gitignore...");
  const lines = [
    "# Dependencias",
    "node_modules/",
    "",
    "# Builds / empacotamento",
    "release/",
    "dist/",
    "build/",
    "out/",
    "",
    "# Logs e backups",
    "logs/",
    "backups/",
    "*.log",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    "",
    "# Estado/cache local da Noelle",
    ".noelle_*bootstrap*.json",
    ".noelle_*state*.json",
    ".noelle_*.cache",
    "",
    "# Python / STT / TTS",
    ".venv/",
    "venv/",
    "__pycache__/",
    "*.pyc",
    "tools/noelle_stt/models/",
    "tools/noelle_stt/cache/",
    "tools/noelle_stt/tmp/",
    "tools/noelle_stt/temp/",
    "tools/noelle_tts/models/",
    "tools/noelle_tts/cache/",
    "tools/noelle_tts/tmp/",
    "tools/noelle_tts/temp/",
    "",
    "# Arquivos grandes temporarios",
    "*.zip",
    "*.rar",
    "*.7z",
    "",
    "# Sistema/editor",
    ".DS_Store",
    "Thumbs.db",
    ".idea/",
    "",
    "# Importante: nao ignorar assets reais do app",
    "!src/assets/",
    "!src/assets/Noelle.vrm",
    "!src/assets/avatars/",
    "!src/assets/motions/",
    "!src/assets/expressions/",
    "!src/assets/items/",
    "!src/assets/motion_manifest.json",
    "!src/assets/item_manifest.json",
    "!src/assets/expressions/manifest.json"
  ];
  writeText(".gitignore", `${lines.join("\n")}\n`);
  log("[OK] .gitignore normalizado.");
}

function updatePackageJson() {
  log("[2/10] Verificando package.json...");
  const pkg = readJson("package.json", null);
  if (!pkg || typeof pkg !== "object") {
    log("[AVISO] package.json ausente ou inválido. Pulando ajuste de package.");
    return;
  }

  pkg.name = pkg.name || "noelle-companion";
  pkg.version = "17.0.0-maintenance";
  pkg.description = pkg.description || "Noelle Companion - Electron, Ollama, avatar VRM, emotes VRMA, expressions PNG e inventario GLB.";
  pkg.main = pkg.main || "main.js";
  pkg.private = true;

  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};
  pkg.scripts = pkg.scripts || {};

  for (const [name, version] of Object.entries(FIXED_VERSIONS.dependencies)) {
    const current = pkg.dependencies[name];
    if (!current || current === "latest" || String(current).startsWith("^") || String(current).startsWith("~")) {
      pkg.dependencies[name] = version;
    }
  }

  for (const [name, version] of Object.entries(FIXED_VERSIONS.devDependencies)) {
    const current = pkg.devDependencies[name];
    if (!current || current === "latest" || String(current).startsWith("^") || String(current).startsWith("~")) {
      pkg.devDependencies[name] = version;
    }
  }

  // Remove "latest" que tenha escapado em qualquer dependência conhecida.
  for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    if (!pkg[section]) continue;
    for (const [name, value] of Object.entries(pkg[section])) {
      if (value === "latest") {
        const fixed = FIXED_VERSIONS.dependencies[name] || FIXED_VERSIONS.devDependencies[name];
        if (fixed) pkg[section][name] = fixed;
      }
    }
  }

  pkg.scripts.start = "electron .";
  pkg.scripts.diagnostico = "node scripts/diagnostico_v17.cjs";
  pkg.scripts.doctor = "node scripts/diagnostico_v17.cjs";
  pkg.scripts.bootstrap = "node scripts/noelle_maintenance_v17.cjs --apply";
  pkg.scripts["rebuild:manifests"] = "node scripts/rebuild_manifests_noelle.cjs";
  if (exists("scripts/bundle-renderers.mjs")) {
    pkg.scripts["build-renderers"] = "node scripts/bundle-renderers.mjs";
  }
  pkg.scripts.check = "node --check main.js && node --check preload.js && node --check scripts/noelle_maintenance_v17.cjs && node --check scripts/diagnostico_v17.cjs && node --check scripts/rebuild_manifests_noelle.cjs && node --check src/renderer/controls_window_app.js && node --check src/renderer/avatar_window_app.js";
  pkg.scripts.lint = "node scripts/diagnostico_v17.cjs --ci";
  pkg.scripts.format = "node scripts/diagnostico_v17.cjs --format-check";
  pkg.scripts.test = "node scripts/diagnostico_v17.cjs --ci";

  pkg.build = pkg.build || {};
  pkg.build.files = pkg.build.files || ["main.js", "preload.js", "package.json", "src/**/*", "tools/**/*", "scripts/**/*", "requirements.txt"];
  pkg.build.directories = pkg.build.directories || { output: "release" };
  pkg.build.appId = pkg.build.appId || "com.masoritech.noelle";
  pkg.build.productName = pkg.build.productName || "Noelle Companion";

  writeJson("package.json", pkg);
  log("[OK] package.json ajustado sem latest/^ nos pacotes principais.");
}

function ensureRequirements() {
  log("[3/10] Verificando requirements STT/TTS...");
  const rootReq = [
    "# Noelle IA - requirements raiz",
    "# Mantem STT/TTS separados para facilitar manutenção.",
    "-r tools/noelle_stt/requirements.txt",
    "-r tools/noelle_tts/requirements.txt",
    ""
  ].join("\n");

  const sttReq = [
    "# STT local - faster-whisper",
    "faster-whisper==1.2.1",
    "ctranslate2==4.7.1",
    "av==17.0.1",
    "huggingface-hub==1.12.0",
    ""
  ].join("\n");

  const ttsReq = [
    "# TTS local - Piper com fallback no app quando indisponivel",
    "piper-tts==1.4.2",
    ""
  ].join("\n");

  writeText("requirements.txt", rootReq);
  writeText("tools/noelle_stt/requirements.txt", sttReq);
  writeText("tools/noelle_tts/requirements.txt", ttsReq);

  const speakPy = path.join(ROOT, "tools/noelle_tts/speak_piper.py");
  if (!fs.existsSync(speakPy)) {
    writeText("tools/noelle_tts/speak_piper.py", `#!/usr/bin/env python3
# Fallback simples: tenta Piper quando configurado; se faltar voz, sai com mensagem clara.
import sys
text = " ".join(sys.argv[1:]).strip()
if not text:
    print("Sem texto para TTS.")
    sys.exit(0)
print("[Noelle TTS] Piper preparado. Configure uma voz .onnx em tools/noelle_tts/models para voz neural.")
print(text[:300])
`);
  }
  log("[OK] requirements atualizados.");
}

function ensureExampleState() {
  const example = {
    ollamaModel: MODEL_FAST,
    tts: { engine: "piper", voice: "configure uma voz .onnx em tools/noelle_tts/models" },
    stt: { engine: "faster-whisper", model: "base" },
    note: "Arquivo de exemplo. Nao coloque estado real no Git."
  };
  writeJson(".noelle_bootstrap.example.json", example);
}

function organizeRootBats() {
  log("[4/10] Organizando .bat extras da raiz...");
  const legacyDir = path.join("scripts", "windows", "legacy", NOW);
  let moved = 0;
  for (const name of fs.readdirSync(ROOT)) {
    if (!/\.bat$/i.test(name)) continue;
    if (name.toLowerCase() === "iniciar.bat") continue;
    if (moveWithBackup(name, path.join(legacyDir, name))) moved += 1;
  }
  log(moved ? `[OK] ${moved} .bat extras movidos para ${legacyDir}.` : "[OK] Nenhum .bat extra para mover.");
}

function importantReferenceText() {
  const files = [
    "main.js",
    "preload.js",
    "package.json",
    "src/controls.html",
    "src/renderer/controls_window_app.js",
    "src/renderer/avatar_window_app.js",
    "scripts/bundle-renderers.mjs"
  ];
  return files.map((f) => readText(f, "")).join("\n");
}

function organizeHotfixLeftovers() {
  log("[5/10] Organizando sobras de hotfix claramente nao importadas...");
  const refs = importantReferenceText();
  const candidates = [];

  const rendererDir = path.join(ROOT, "src", "renderer");
  if (fs.existsSync(rendererDir)) {
    for (const file of fs.readdirSync(rendererDir)) {
      if (/^noelle_chat_.*\.js$/i.test(file)) {
        candidates.push(path.join("src", "renderer", file));
      }
    }
  }

  const stylesDir = path.join(ROOT, "src", "styles");
  if (fs.existsSync(stylesDir)) {
    for (const file of fs.readdirSync(stylesDir)) {
      if (/^noelle_chat_.*\.css$/i.test(file)) {
        candidates.push(path.join("src", "styles", file));
      }
    }
  }

  const scriptsDir = path.join(ROOT, "scripts");
  if (fs.existsSync(scriptsDir)) {
    for (const file of fs.readdirSync(scriptsDir)) {
      if (/\.cjs$/i.test(file) && /(chat|hotfix|v4|v7|v8|v12|v13|v15|v16)/i.test(file) && !/^noelle_maintenance_v17|^diagnostico_v17|^rebuild_manifests_noelle/.test(file)) {
        candidates.push(path.join("scripts", file));
      }
    }
  }

  let moved = 0;
  for (const candidate of candidates) {
    const base = path.basename(candidate);
    if (refs.includes(base)) {
      log(`[SKIP] ${candidate} parece referenciado.`);
      continue;
    }
    const dest = path.join("docs", "hotfixes", "legacy", NOW, candidate);
    if (moveWithBackup(candidate, dest)) moved += 1;
  }

  // READMEs/relatorios de hotfix na raiz, sem tocar README.md principal.
  for (const file of fs.readdirSync(ROOT)) {
    if (!/\.(txt|md)$/i.test(file)) continue;
    if (/^README\.md$/i.test(file) || /^CHANGELOG\.md$/i.test(file) || /^LICENSE$/i.test(file)) continue;
    if (/(HOTFIX|CORRE|CHAT|RELATORIO|APLICAR|V1[0-9]|V[0-9])/i.test(file)) {
      const dest = path.join("docs", "hotfixes", "legacy", NOW, file);
      if (moveWithBackup(file, dest)) moved += 1;
    }
  }
  log(moved ? `[OK] ${moved} sobras movidas para docs/hotfixes/legacy.` : "[OK] Nenhuma sobra clara para mover.");
}

function ensureCiWorkflow() {
  log("[6/10] Criando workflow CI basico...");
  const ci = `name: Noelle CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  check:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install dependencies
        run: npm ci
      - name: Check syntax and diagnostics
        run: npm run check
      - name: Build renderers
        if: hashFiles('scripts/bundle-renderers.mjs') != ''
        run: npm run build-renderers
`;
  writeText(".github/workflows/ci.yml", ci);
  log("[OK] .github/workflows/ci.yml criado/atualizado.");
}

function ensureReadmeAddendum() {
  log("[7/10] Registrando README V17...");
  const doc = `# Noelle IA — V17 manutenção cirúrgica

Este pack organiza o projeto atual sem redesign total.

## O que ele faz

- Mantém a janela principal e o avatar/widget existentes.
- Mantém assets reais: VRM, VRMA, PNG e GLB.
- Corrige o INICIAR.bat para verificar dependências e iniciar tudo pela opção [1].
- Corrige .gitignore.
- Remove "latest" dos pacotes principais quando possível.
- Reconstrói manifests a partir dos assets reais.
- Move sobras de hotfix para docs/hotfixes/legacy com backup.

## O que ele não faz

- Não substitui src/avatar_view.html.
- Não substitui src/renderer/avatar_window_app.js.
- Não redesenha a UI inteira.
- Não apaga assets.

## Ordem recomendada

1. Rode INICIAR.bat.
2. Escolha [2] Diagnóstico completo.
3. Escolha [1] Iniciar Noelle.
4. Teste Chat, Avatar, Emotes, Expressions e Inventário.
`;
  writeText("docs/README_V17_MANUTENCAO_SEGURA.md", doc);
}

function ensureManifests() {
  log("[8/10] Reconstruindo manifests...");
  const result = run("node", ["scripts/rebuild_manifests_noelle.cjs"], { capture: true, quiet: true, timeout: 30000 });
  if (!result.ok) {
    log(result.stdout.trim());
    log(result.stderr.trim());
    throw new Error("Falha ao reconstruir manifests.");
  }
  log(result.stdout.trim() || "[OK] Manifests reconstruidos.");
}

function ensureNpmDeps() {
  log("[9/10] Verificando dependencias npm/Electron...");
  if (fs.existsSync(path.join(ROOT, "node_modules", "electron"))) {
    log("[OK] Electron local encontrado. npm install pulado.");
    return;
  }

  const npm = findNpm();
  if (!npm) {
    throw new Error("npm nao encontrado e node_modules/electron nao existe. Reinstale Node.js com npm ou rode npm install manualmente.");
  }

  const hasLock = fs.existsSync(path.join(ROOT, "package-lock.json"));
  const args = hasLock ? ["ci"] : ["install"];
  const res = run(npm, args, { timeout: 10 * 60 * 1000 });
  if (!res.ok) throw new Error(`Falha no ${npm} ${args.join(" ")}.`);
  if (!fs.existsSync(path.join(ROOT, "node_modules", "electron"))) {
    throw new Error("Instalacao npm terminou, mas node_modules/electron nao apareceu.");
  }
  log("[OK] Dependencias npm prontas.");
}

function ensurePythonDeps() {
  log("[10/10] Verificando Python/.venv/STT/TTS...");
  const pyLauncher = commandExists("py") ? ["py", ["-3"]] : commandExists("python") ? ["python", []] : null;
  if (!pyLauncher) {
    log("[AVISO] Python nao encontrado. Noelle inicia sem STT/TTS Python.");
    return;
  }

  const venvPython = path.join(ROOT, ".venv", "Scripts", "python.exe");
  if (!fs.existsSync(venvPython)) {
    log("[INFO] Criando .venv...");
    const [cmd, prefix] = pyLauncher;
    const res = run(cmd, [...prefix, "-m", "venv", ".venv"], { timeout: 2 * 60 * 1000 });
    if (!res.ok) {
      log("[AVISO] Falha ao criar .venv. Noelle inicia sem STT/TTS Python.");
      return;
    }
  } else {
    log("[OK] .venv encontrado.");
  }

  const state = readJson(".noelle_v17_bootstrap.json", {});
  if (state && state.pythonDepsInstalled) {
    log("[OK] STT/TTS ja marcados como instalados.");
    return;
  }

  log("[INFO] Instalando requirements.txt...");
  run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { timeout: 5 * 60 * 1000 });
  const res = run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], { timeout: 20 * 60 * 1000 });
  if (!res.ok) {
    log("[AVISO] Falha ao instalar requirements. Noelle ainda inicia sem STT/TTS Python.");
    return;
  }
  writeJson(".noelle_v17_bootstrap.json", { ...(state || {}), pythonDepsInstalled: true, at: new Date().toISOString() });
  log("[OK] STT/TTS pronto.");
}

function ensureOllama() {
  log("[INFO] Verificando Ollama...");
  if (!commandExists("ollama")) {
    log("[AVISO] Ollama nao encontrado no PATH. Chat pode ficar offline.");
    return;
  }
  let list = run("ollama", ["list"], { capture: true, quiet: true, timeout: 10000 });
  if (!list.ok) {
    log("[INFO] Ollama instalado, mas offline. Tentando iniciar ollama serve...");
    try {
      cp.spawn("ollama", ["serve"], { cwd: ROOT, detached: true, stdio: "ignore", shell: process.platform === "win32" }).unref();
    } catch (err) {
      log(`[AVISO] Nao consegui iniciar Ollama: ${err.message}`);
    }
    const waitUntil = Date.now() + 12000;
    while (Date.now() < waitUntil) {
      list = run("ollama", ["list"], { capture: true, quiet: true, timeout: 10000 });
      if (list.ok) break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
  }
  if (!list.ok) {
    log("[AVISO] Ollama nao respondeu. Noelle abrira, mas Chat IA pode ficar offline.");
    return;
  }
  log("[OK] Ollama online.");
  if (!list.stdout.toLowerCase().includes(MODEL_FAST.toLowerCase())) {
    log(`[INFO] Modelo ${MODEL_FAST} ausente. Baixando...`);
    const pull = run("ollama", ["pull", MODEL_FAST], { timeout: 30 * 60 * 1000 });
    if (!pull.ok) {
      log(`[AVISO] Falha ao baixar ${MODEL_FAST}.`);
      return;
    }
  }
  log(`[OK] Modelo ${MODEL_FAST} pronto.`);
}

function verifyAssetsOrWarn() {
  const required = [
    "src/assets/Noelle.vrm",
    "src/assets/motion_manifest.json",
    "src/assets/item_manifest.json",
    "src/assets/expressions/manifest.json"
  ];
  for (const file of required) {
    if (exists(file)) log(`[OK] ${file}`);
    else log(`[AVISO] Faltando ${file}`);
  }
  countGlob("src/assets/motions", /\.vrma$/i, "Motions .vrma");
  countGlob("src/assets/expressions", /\.png$/i, "Expressions PNG");
  countGlob("src/assets/items", /\.(glb|gltf)$/i, "Items GLB/GLTF");
  countGlob("src/assets/avatars", /\.vrm$/i, "Avatares VRM extras");
}

function countGlob(relDir, regex, label) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) {
    log(`[AVISO] ${label}: pasta ausente (${relDir})`);
    return 0;
  }
  const count = fs.readdirSync(dir).filter((name) => regex.test(name)).length;
  log(`[OK] ${label} encontrados: ${count}`);
  return count;
}

function applyMaintenance() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  normalizeGitignore();
  updatePackageJson();
  ensureRequirements();
  ensureExampleState();
  organizeRootBats();
  organizeHotfixLeftovers();
  ensureCiWorkflow();
  ensureReadmeAddendum();
  ensureManifests();
  verifyAssetsOrWarn();
  log(`[OK] Manutencao aplicada. Backup: ${rel(BACKUP_ROOT)}`);
}

function startNoelle() {
  applyMaintenance();
  ensureNpmDeps();
  ensurePythonDeps();
  ensureOllama();

  const electronCmd = process.platform === "win32"
    ? path.join(ROOT, "node_modules", ".bin", "electron.cmd")
    : path.join(ROOT, "node_modules", ".bin", "electron");

  if (fs.existsSync(electronCmd)) {
    log("[START] Iniciando Noelle via Electron local...");
    const res = run(electronCmd, ["."], { timeout: undefined });
    process.exitCode = res.status || 0;
    return;
  }

  const npm = findNpm();
  if (npm) {
    log("[START] Iniciando Noelle via npm start...");
    const res = run(npm, ["start"], { timeout: undefined });
    process.exitCode = res.status || 0;
    return;
  }

  throw new Error("Nao encontrei Electron local nem npm para iniciar.");
}

function cleanBatsOnly() {
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });
  organizeRootBats();
}

function main() {
  const args = new Set(process.argv.slice(2));
  try {
    if (args.has("--start")) {
      startNoelle();
      return;
    }
    if (args.has("--clean-bats")) {
      cleanBatsOnly();
      return;
    }
    if (args.has("--apply")) {
      applyMaintenance();
      return;
    }
    console.log("Uso: node scripts/noelle_maintenance_v17.cjs --start | --apply | --clean-bats");
  } catch (err) {
    log(`[ERRO] ${err.message || err}`);
    process.exitCode = 1;
  }
}

main();
