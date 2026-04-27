"use strict";

const fs = require("fs");
const path = require("path");
const child_process = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";

function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function log(msg) { console.log(msg); }
function run(cmd, args, opts = {}) {
  log(`> ${cmd} ${args.join(" ")}`);
  const result = child_process.spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: false, windowsHide: false, ...opts });
  return result.status === 0;
}
function runQuiet(cmd, args) {
  try {
    const result = child_process.spawnSync(cmd, args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
    return { ok: result.status === 0, text: (result.stdout || result.stderr || "").trim() };
  } catch (err) { return { ok: false, text: err.message }; }
}
function npmCmd() { return isWin ? "npm.cmd" : "npm"; }
function pyCmd() { return isWin ? "py" : "python3"; }
function venvPython() { return isWin ? path.join(ROOT, ".venv", "Scripts", "python.exe") : path.join(ROOT, ".venv", "bin", "python"); }

function ensureNpm() {
  log("\n[1/6] Verificando Node/npm...");
  const node = runQuiet(process.execPath, ["-v"]);
  log(node.ok ? `[OK] Node: ${node.text}` : "[ERRO] Node não encontrado.");
  const npm = runQuiet(npmCmd(), ["-v"]);
  if (!npm.ok) throw new Error("npm não encontrado. Instale Node.js LTS.");
  log(`[OK] npm: ${npm.text}`);
  const electronBin = isWin ? path.join(ROOT, "node_modules", ".bin", "electron.cmd") : path.join(ROOT, "node_modules", ".bin", "electron");
  if (!exists(electronBin)) {
    log("[INFO] node_modules/electron ausente. Instalando dependências npm...");
    if (!run(npmCmd(), ["install"])) throw new Error("npm install falhou.");
  } else {
    log("[OK] dependências npm encontradas.");
  }
}

function ensurePython() {
  log("\n[2/6] Verificando Python/.venv...");
  const venv = venvPython();
  if (!exists(venv)) {
    log("[INFO] .venv ausente. Criando ambiente Python...");
    const args = isWin ? ["-3", "-m", "venv", ".venv"] : ["-m", "venv", ".venv"];
    if (!run(pyCmd(), args)) throw new Error("Falha ao criar .venv.");
  } else {
    log("[OK] .venv encontrado.");
  }
  log("[INFO] Atualizando pip e instalando STT/TTS...");
  run(venv, ["-m", "pip", "install", "--upgrade", "pip"]);
  if (!run(venv, ["-m", "pip", "install", "-r", "requirements.txt"])) {
    log("[AVISO] pip install falhou. A Noelle ainda inicia, mas STT/TTS podem ficar limitados.");
  }
}

function repairManifests() {
  log("\n[3/6] Reconstruindo manifests de assets reais...");
  if (!run(process.execPath, [path.join("scripts", "rebuild_manifests_v16.cjs")])) throw new Error("Falha ao reconstruir manifests.");
}

function checkAssets() {
  log("\n[4/6] Verificando assets obrigatórios...");
  const checks = [
    ["Avatar VRM", path.join(ROOT, "src", "assets", "Noelle.vrm")],
    ["Motions", path.join(ROOT, "src", "assets", "motions")],
    ["Expressions", path.join(ROOT, "src", "assets", "expressions")],
    ["Items", path.join(ROOT, "src", "assets", "items")]
  ];
  for (const [label, target] of checks) log(`${exists(target) ? "[OK]" : "[AVISO]"} ${label}: ${path.relative(ROOT, target)}`);
}

function ensureOllama() {
  log("\n[5/6] Verificando Ollama e modelo qwen3:0.6b...");
  const ollama = runQuiet("ollama", ["--version"]);
  if (!ollama.ok) {
    log("[AVISO] Ollama não encontrado no PATH. A janela abre, mas o chat ficará offline.");
    return;
  }
  log(`[OK] ${ollama.text.split("\n")[0]}`);
  if (isWin) {
    child_process.spawn("cmd.exe", ["/c", "start", "\"Ollama\"", "/min", "ollama", "serve"], { cwd: ROOT, detached: true, stdio: "ignore", windowsHide: true }).unref();
  }
  const list = runQuiet("ollama", ["list"]);
  if (!/qwen3:0\.6b/i.test(list.text || "")) {
    log("[INFO] Modelo qwen3:0.6b não encontrado. Baixando...");
    run("ollama", ["pull", "qwen3:0.6b"]);
  } else {
    log("[OK] Modelo qwen3:0.6b encontrado.");
  }
}

function startApp() {
  log("\n[6/6] Iniciando Noelle...");
  run(npmCmd(), ["start"], { stdio: "inherit" });
}

function main() {
  const start = process.argv.includes("--start");
  ensureNpm();
  ensurePython();
  repairManifests();
  checkAssets();
  ensureOllama();
  log("\n[OK] Bootstrap V16 concluído.");
  if (start) startApp();
}

try { main(); }
catch (err) { console.error("\n[ERRO] " + (err.message || err)); process.exit(1); }
