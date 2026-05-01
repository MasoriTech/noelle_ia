const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const target = path.join(ROOT, "src", "renderer", "pages", "avatar", "avatar_render_owner_v38.js");

function log(msg) {
  console.log("[avatar-owner-width-v38.1] " + msg);
}

if (!fs.existsSync(target)) {
  console.log("[ERRO] Arquivo do owner não encontrado:");
  console.log("  src\\renderer\\pages\\avatar\\avatar_render_owner_v38.js");
  process.exit(1);
}

const backup = target + ".bak_v38_1";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
  log("backup criado: " + path.relative(ROOT, backup));
}

let js = fs.readFileSync(target, "utf8");
const before = js;

// Só reduz a largura horizontal do owner externo.
// Não mexe no iframe interno, câmera, Three.js, WebGL ou renderer.
js = js.replace(
  /width:100%;\s*\n\s*height:calc\(100vh - 145px\);/,
  "width:min(100%, 1120px);\n      max-width:1120px;\n      margin:0 auto;\n      height:calc(100vh - 145px);"
);

// Caso já tenha sido patchado antes com algum outro width.
js = js.replace(
  /width:min\(100%,\s*\d+px\);\s*\n\s*max-width:\d+px;\s*\n\s*margin:0 auto;\s*\n\s*height:calc\(100vh - 145px\);/,
  "width:min(100%, 1120px);\n      max-width:1120px;\n      margin:0 auto;\n      height:calc(100vh - 145px);"
);

// Marca o arquivo para diagnóstico.
if (!js.includes("AVATAR_OWNER_WIDTH_V38_1")) {
  js = js.replace(
    'window.__YORU_AVATAR_RENDER_OWNER__ = "v38";',
    'window.__YORU_AVATAR_RENDER_OWNER__ = "v38";\n      window.__YORU_AVATAR_OWNER_WIDTH_PATCH__ = "AVATAR_OWNER_WIDTH_V38_1";'
  );
}

if (js === before) {
  log("nenhuma alteração aplicada; talvez o bloco já esteja diferente");
} else {
  fs.writeFileSync(target, js, "utf8");
  log("largura horizontal do owner ajustada para 1120px");
}

log("render interno preservado");
log("iframe preservado em 100% x 100%");