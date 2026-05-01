const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const target = path.join(ROOT, "src", "renderer", "pages", "avatar", "avatar_render_owner_v38.js");

console.log("Avatar Owner Width V38.1 Diagnostics");
console.log("====================================");

if (!fs.existsSync(target)) {
  console.log("[MISSING] src/renderer/pages/avatar/avatar_render_owner_v38.js");
  process.exit(0);
}

const js = fs.readFileSync(target, "utf8");

console.log(js.includes("width:min(100%, 1120px)") ? "[OK] width 1120px aplicado" : "[WARN] width 1120px não encontrado");
console.log(js.includes("max-width:1120px") ? "[OK] max-width 1120px aplicado" : "[WARN] max-width 1120px não encontrado");
console.log(js.includes("margin:0 auto") ? "[OK] centralizado com margin auto" : "[WARN] margin auto não encontrado");
console.log(js.includes("AVATAR_OWNER_WIDTH_V38_1") ? "[OK] marcador v38.1 presente" : "[WARN] marcador v38.1 ausente");

console.log("");
console.log("Valores atuais recomendados:");
console.log("- 1040px = mais estreito");
console.log("- 1120px = recomendado para sua tela");
console.log("- 1180px = menos estreito");
console.log("- 1240px = quase como antes");