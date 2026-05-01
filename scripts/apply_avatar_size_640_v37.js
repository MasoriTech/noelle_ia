const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const target = path.join(ROOT, "src", "renderer", "pages", "avatar", "avatar_restore_loadfile_v19_8_3.js");

function log(msg) {
  console.log("[avatar-size-640-v37] " + msg);
}

if (!fs.existsSync(target)) {
  console.log("[ERRO] Arquivo não encontrado:");
  console.log("  src\\renderer\\pages\\avatar\\avatar_restore_loadfile_v19_8_3.js");
  process.exit(1);
}

const backup = target + ".bak_v37";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let js = fs.readFileSync(target, "utf8");

const before = js;

// Corrige somente o bloco do shell externo do Loadfile.
// Não toca no iframe interno, câmera, Three.js ou renderer.
js = js.replace(
  /height\s*:\s*min\([^;]+;\s*min-height\s*:\s*\d+px;\s*(?:max-height\s*:\s*[^;]+;\s*)?/g,
  "height:640px;\n        min-height:640px;\n        max-height:640px;\n        "
);

// Caso o arquivo já tenha sido alterado por outro patch.
js = js.replace(
  /height\s*:\s*calc\(100vh\s*-\s*\d+px\);\s*min-height\s*:\s*\d+px;\s*(?:max-height\s*:\s*[^;]+;\s*)?/g,
  "height:640px;\n        min-height:640px;\n        max-height:640px;\n        "
);

js = js.replace(
  /height\s*:\s*\d+px;\s*min-height\s*:\s*\d+px;\s*max-height\s*:\s*\d+px;/g,
  "height:640px;\n        min-height:640px;\n        max-height:640px;"
);

// Garante iframe 100% sem mexer no app interno.
js = js.replace(
  /style="width:100%;height:[^;"]+;border:0;display:block;background:#080810;"/g,
  'style="width:100%;height:100%;border:0;display:block;background:#080810;"'
);

if (js === before) {
  log("nenhuma alteração automática detectada; talvez o arquivo já esteja em 640px ou o bloco mudou");
} else {
  fs.writeFileSync(target, js, "utf8");
  log("altura do preview ajustada para 640px");
}

log("renderer interno preservado");
log("não mexeu em avatar_loadfile_preview_v19_8_3_app.mjs");
log("não mexeu em src/avatar_loadfile_preview_v19_8_3.html");