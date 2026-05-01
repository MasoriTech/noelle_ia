const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const ROOT = process.cwd();
const app = path.join(ROOT, "src", "renderer", "avatar_loadfile_preview_v19_8_3_app.mjs");

function log(msg) {
  console.log("[restore-loadfile-v41] " + msg);
}

function nodeCheck(file) {
  childProcess.execFileSync("node", ["--check", file], { cwd: ROOT, stdio: "pipe" });
}

function isClean(content) {
  return !/NOELLE_AVATAR_QUERY_V39_[789]|LOADFILE_RUNTIME_BRIDGE_V40|__NOELLE_ACTIVE_AVATAR_V39_[789]/.test(content);
}

if (!fs.existsSync(app)) {
  log("app Loadfile não encontrado");
  process.exit(0);
}

const current = fs.readFileSync(app, "utf8");

if (isClean(current)) {
  log("Loadfile já está limpo");
  process.exit(0);
}

const restoreBackup = app + ".bak_restore_v41";
if (!fs.existsSync(restoreBackup)) {
  fs.copyFileSync(app, restoreBackup);
  log("backup do estado atual criado: " + path.relative(ROOT, restoreBackup));
}

const candidates = [
  app + ".bak_query_v39_9",
  app + ".bak_query_v39_8",
  app + ".bak_query_v39_7",
  app + ".bak_v39_9",
  app + ".bak_v39_8",
  app + ".bak_v39_7",
  app + ".bak_v39_6",
  app + ".bak_v34"
];

for (const candidate of candidates) {
  if (!fs.existsSync(candidate)) continue;

  const content = fs.readFileSync(candidate, "utf8");

  if (!isClean(content)) {
    log("backup ignorado por ainda conter bridge: " + path.basename(candidate));
    continue;
  }

  fs.writeFileSync(app, content, "utf8");

  try {
    nodeCheck(app);
    log("Loadfile restaurado por backup limpo: " + path.basename(candidate));
    process.exit(0);
  } catch {
    log("backup falhou node --check: " + path.basename(candidate));
  }
}

log("nenhum backup limpo encontrado; mantendo arquivo atual. O owner v41 usará Loadfile sem query para reduzir risco.");