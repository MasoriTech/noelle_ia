const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const target = path.join(ROOT, "src", "renderer", "modules", "noelle_stream_vad_v19_8_31.js");
const backup = target + ".bak_stream_v19_8_37";

if (!fs.existsSync(backup)) {
  console.log("[INFO] backup ausente: src/renderer/modules/noelle_stream_vad_v19_8_31.js.bak_stream_v19_8_37");
  process.exit(0);
}

fs.copyFileSync(backup, target);
console.log("[OK] VAD restaurado do backup v19.8.37");

try {
  cp.execFileSync("node", ["--check", target], { cwd: ROOT, stdio: "pipe" });
  console.log("[OK] node --check depois do rollback");
} catch {
  console.log("[WARN] rollback restaurou, mas node --check falhou");
}
