const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const CONFIG_39 = path.join(ROOT, "config", "stream_stt_v19_8_39.json");
const CONFIG_38 = path.join(ROOT, "config", "stream_stt_v19_8_38.json");

function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
function readJson(file) { try { return exists(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null; } catch { return null; } }
function which(cmd) {
  const tool = process.platform === "win32" ? "where" : "which";
  const result = cp.spawnSync(tool, [cmd], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return "";
  return String(result.stdout || "").split(/\r?\n/).map((x) => x.trim()).find(Boolean) || "";
}

function commandExists(cmd) {
  if (!cmd) return false;
  if (cmd.includes("\\") || cmd.includes("/")) return exists(cmd);
  return Boolean(which(cmd));
}

console.log("STT Backend Checkup V19.8.39");
console.log("============================");

const env = process.env.NOELLE_STT_CMD || "";
console.log(env ? "[OK] NOELLE_STT_CMD=" + env : "[INFO] NOELLE_STT_CMD não configurado");

const cfg39 = readJson(CONFIG_39);
const cfg38 = readJson(CONFIG_38);

if (cfg39?.command) {
  console.log(commandExists(cfg39.command) ? "[OK] config v39 command existe" : "[WARN] config v39 command não encontrado");
  console.log("     " + cfg39.command);
} else {
  console.log("[WARN] config/stream_stt_v19_8_39.json sem command");
}

if (cfg38?.command) {
  console.log(commandExists(cfg38.command) ? "[OK] config v38 command existe" : "[WARN] config v38 command não encontrado");
  console.log("     " + cfg38.command);
}

const auto = [
  path.join(ROOT, "tools", "whisper", "whisper-cli.exe"),
  path.join(ROOT, "tools", "whisper", "main.exe"),
  path.join(ROOT, "tools", "whisper", "whisper-cli"),
  which("whisper-cli")
].filter(Boolean);

if (auto.length) {
  console.log("[OK] candidatos automáticos:");
  for (const item of auto) console.log("     " + item);
} else {
  console.log("[WARN] nenhum whisper-cli/main automático encontrado");
}

console.log("");
console.log("Próximo passo:");
console.log("  1. Coloque whisper-cli.exe em tools\\whisper\\whisper-cli.exe");
console.log("  2. Rode CONFIGURAR_STT.bat");
console.log("  3. Rode iniciar.bat");
