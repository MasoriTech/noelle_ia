const fs = require("fs");
const path = require("path");
const cp = require("child_process");
const readline = require("readline");

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, "config", "stream_stt_v19_8_39.json");

function log(msg) { console.log("[CONFIGURAR-STT] " + msg); }
function exists(file) { try { return fs.existsSync(file); } catch { return false; } }

function which(cmd) {
  const tool = process.platform === "win32" ? "where" : "which";
  const result = cp.spawnSync(tool, [cmd], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) return "";
  return String(result.stdout || "").split(/\r?\n/).map((x) => x.trim()).find(Boolean) || "";
}

function walk(dir, maxDepth = 4, depth = 0, out = []) {
  if (depth > maxDepth || !exists(dir)) return out;

  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "release", "dist", "out", "build"].includes(entry.name)) continue;
      walk(full, maxDepth, depth + 1, out);
    } else {
      out.push(full);
    }
  }

  return out;
}

function candidates() {
  const list = [];

  const fixed = [
    path.join(ROOT, "tools", "whisper", "whisper-cli.exe"),
    path.join(ROOT, "tools", "whisper", "main.exe"),
    path.join(ROOT, "tools", "whisper", "whisper-cli"),
    path.join(ROOT, "whisper-cli.exe"),
    path.join(ROOT, "main.exe")
  ];

  for (const file of fixed) {
    if (exists(file)) list.push(file);
  }

  const whereWhisper = which("whisper-cli");
  if (whereWhisper) list.push(whereWhisper);

  const whereMain = which("main");
  if (whereMain && /whisper/i.test(whereMain)) list.push(whereMain);

  const userProfile = process.env.USERPROFILE || process.env.HOME || "";
  const searchRoots = [
    ROOT,
    userProfile ? path.join(userProfile, "Downloads") : "",
    userProfile ? path.join(userProfile, "Desktop") : ""
  ].filter(Boolean);

  for (const root of searchRoots) {
    for (const file of walk(root, 3)) {
      const name = path.basename(file).toLowerCase();
      if (name === "whisper-cli.exe" || name === "main.exe" || name === "whisper-cli") {
        list.push(file);
      }
    }
  }

  const seen = new Set();
  return list.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function writeConfig(command) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });

  const config = {
    version: "v19.8.39",
    enabled: true,
    name: /main\.exe$/i.test(command) ? "whisper.cpp main" : "whisper.cpp whisper-cli",
    command,
    args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"],
    notes: [
      "Criado por CONFIGURAR_STT.bat.",
      "Se seu backend usar outros argumentos, edite este arquivo.",
      "Placeholders: {input}, {output}, {outputBase}, {outputDir}."
    ]
  };

  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2), "utf8");
  log("config salvo: " + path.relative(ROOT, CONFIG));
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return await new Promise((resolve) => rl.question(question, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

async function main() {
  const argPath = process.argv.slice(2).join(" ").trim();

  if (argPath) {
    const full = path.resolve(ROOT, argPath);
    if (!exists(full)) {
      console.log("[ERRO] caminho não existe: " + full);
      process.exit(1);
    }
    writeConfig(full);
    return;
  }

  const found = candidates();

  if (found.length) {
    console.log("Backends encontrados:");
    found.forEach((file, index) => console.log(`  ${index + 1}. ${file}`));

    const answer = await ask("Escolha o número ou Enter para usar o primeiro: ");
    const index = answer ? Number(answer) - 1 : 0;

    if (!Number.isFinite(index) || index < 0 || index >= found.length) {
      console.log("[ERRO] escolha inválida.");
      process.exit(1);
    }

    writeConfig(found[index]);
    return;
  }

  console.log("Nenhum whisper-cli.exe/main.exe encontrado automaticamente.");
  console.log("Coloque o executável em tools\\whisper\\whisper-cli.exe ou informe o caminho agora.");
  const manual = await ask("Caminho do executável STT ou Enter para cancelar: ");

  if (!manual) {
    console.log("Cancelado. STT continua sem backend.");
    process.exit(0);
  }

  const full = path.resolve(ROOT, manual);
  if (!exists(full)) {
    console.log("[ERRO] caminho não existe: " + full);
    process.exit(1);
  }

  writeConfig(full);
}

main().catch((err) => {
  console.error("[ERRO]", err && err.message ? err.message : err);
  process.exit(1);
});
