const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function log(msg) {
  console.log("[stream-v19.8.33] " + msg);
}

function copyWithBackup(rel) {
  const source = path.join(__dirname, "..", rel);
  const target = path.join(ROOT, rel);

  if (!fs.existsSync(source)) {
    console.log("[ERRO] fonte ausente: " + rel);
    process.exitCode = 1;
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });

  if (fs.existsSync(target)) {
    const backup = target + ".bak_stream_v19_8_33";
    if (!fs.existsSync(backup)) {
      fs.copyFileSync(target, backup);
      log("backup criado: " + path.relative(ROOT, backup));
    }
  }

  fs.copyFileSync(source, target);
  log("arquivo aplicado: " + rel);
}

function patchControls() {
  const controls = path.join(ROOT, "src", "controls.html");
  if (!fs.existsSync(controls)) {
    console.log("[WARN] src/controls.html não encontrado; scripts foram copiados, mas não injetados.");
    return;
  }

  const backup = controls + ".bak_stream_v19_8_33";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(controls, backup);
    log("backup criado: src/controls.html.bak_stream_v19_8_33");
  }

  let html = fs.readFileSync(controls, "utf8");

  const scripts = [
    "./renderer/modules/noelle_stream_stt_status_v22.js",
    "./renderer/modules/noelle_stream_stt_selector_v21.js",
    "./renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
    "./renderer/modules/noelle_stream_finalize_v19_8_33.js"
  ];

  for (const src of scripts) {
    const name = src.split("/").pop().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    html = html.replace(new RegExp(`<script[^>]*${name}[^>]*><\\/script>`, "g"), "");
  }

  const tags = scripts.map((src) => `<script src="${src}"></script>`).join("\n");

  if (html.includes("</body>")) {
    html = html.replace("</body>", tags + "\n</body>");
  } else {
    html += "\n" + tags + "\n";
  }

  fs.writeFileSync(controls, html, "utf8");
  log("scripts finais da Stream injetados no controls.html");
}

[
  "src/renderer/modules/noelle_stream_stt_selector_v21.js",
  "src/renderer/modules/noelle_stream_stt_status_v22.js",
  "src/renderer/modules/noelle_stream_transcribe_button_runtime_v20.js",
  "src/renderer/modules/noelle_stream_finalize_v19_8_33.js"
].forEach(copyWithBackup);

patchControls();