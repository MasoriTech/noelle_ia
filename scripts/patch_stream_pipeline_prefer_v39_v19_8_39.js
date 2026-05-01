const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();
const RUNTIME = path.join(ROOT, "src", "renderer", "modules", "noelle_stream_pipeline_complete_v19_8_38.js");

function log(msg) { console.log("[stream-v19.8.39-runtime] " + msg); }

if (!fs.existsSync(RUNTIME)) {
  log("runtime v19.8.38 não encontrado; pulando patch de preferência da bridge.");
  process.exit(0);
}

const backup = RUNTIME + ".bak_stream_v19_8_39";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(RUNTIME, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let source = fs.readFileSync(RUNTIME, "utf8");
source = source.replace(
  /return\s+window\.noelleStreamBridgeV19838\s*\|\|\s*window\.noelleStreamBridge\s*\|\|\s*null\s*;/,
  "return window.noelleStreamBridgeV19839 || window.noelleStreamBridgeV19838 || window.noelleStreamBridge || null;"
);

if (!source.includes("noelleStreamBridgeV19839")) {
  source = source.replace(
    /function getBridge\(\)\s*\{\s*return\s+window\.noelleStreamBridgeV19838\s*\|\|\s*window\.noelleStreamBridge\s*\|\|\s*null;\s*\}/,
    "function getBridge() { return window.noelleStreamBridgeV19839 || window.noelleStreamBridgeV19838 || window.noelleStreamBridge || null; }"
  );
}

fs.writeFileSync(RUNTIME, source, "utf8");

try {
  cp.execFileSync("node", ["--check", RUNTIME], { cwd: ROOT, stdio: "pipe" });
  log("runtime agora prefere bridge v19.8.39");
} catch {
  fs.copyFileSync(backup, RUNTIME);
  throw new Error("node --check falhou; runtime restaurado");
}
