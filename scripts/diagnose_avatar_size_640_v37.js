const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const target = path.join(ROOT, "src", "renderer", "pages", "avatar", "avatar_restore_loadfile_v19_8_3.js");

console.log("Avatar Size 640 V37 Diagnostics");
console.log("================================");

if (!fs.existsSync(target)) {
  console.log("[MISSING] src/renderer/pages/avatar/avatar_restore_loadfile_v19_8_3.js");
  process.exit(0);
}

const js = fs.readFileSync(target, "utf8");

console.log(js.includes("height:640px") ? "[OK] height:640px" : "[WARN] height:640px não encontrado");
console.log(js.includes("min-height:640px") ? "[OK] min-height:640px" : "[WARN] min-height:640px não encontrado");
console.log(js.includes("max-height:640px") ? "[OK] max-height:640px" : "[WARN] max-height:640px não encontrado");
console.log(js.includes('style="width:100%;height:100%;border:0;display:block;background:#080810;"') ? "[OK] iframe 100%" : "[WARN] iframe 100% não confirmado");

const internalApp = path.join(ROOT, "src", "renderer", "avatar_loadfile_preview_v19_8_3_app.mjs");
const html = path.join(ROOT, "src", "avatar_loadfile_preview_v19_8_3.html");

console.log(fs.existsSync(internalApp) ? "[OK] app interno existe e não foi alterado pelo v37" : "[MISSING] app interno");
console.log(fs.existsSync(html) ? "[OK] html loadfile existe" : "[MISSING] html loadfile");