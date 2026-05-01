const fs=require("fs"), path=require("path"), cp=require("child_process");
const ROOT=process.cwd();
const app=path.join(ROOT,"src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs");
function check(){ cp.execFileSync("node",["--check",app],{cwd:ROOT,stdio:"pipe"}); }
if(!fs.existsSync(app)){ console.log("[app-v40] preview app ausente; só HTML bridge aplicado"); process.exit(0); }
let src=fs.readFileSync(app,"utf8");
if(src.includes("NOELLE_LOADFILE_V40_PATCH")){ console.log("[app-v40] patch já aplicado"); process.exit(0); }
const bak=app+".bak_loadfile_v40"; if(!fs.existsSync(bak)) fs.copyFileSync(app,bak);
const header='/* NOELLE_LOADFILE_V40_PATCH */\nconst __NOELLE_LOADFILE_V40_ACTIVE_AVATAR__ = (() => { try { return window.__NOELLE_LOADFILE_V40_CONFIG__?.avatarPath || "assets/Noelle.vrm"; } catch { return "assets/Noelle.vrm"; } })();\n';
src=header+src;
let n=0;
for(const re of [/([\"'])assets\/Noelle\.vrm\1/g,/([\"'])\.\/assets\/Noelle\.vrm\1/g,/([\"'])src\/assets\/Noelle\.vrm\1/g,/([\"'])assets\/avatars\/Yoru\.vrm\1/g]){
  src=src.replace(re,()=>{n++; return "__NOELLE_LOADFILE_V40_ACTIVE_AVATAR__";});
}
fs.writeFileSync(app,src,"utf8");
try{ check(); }catch{ fs.copyFileSync(bak,app); console.log("[ERRO] patch quebrou sintaxe; backup restaurado"); process.exit(1); }
console.log("[app-v40] literais substituídos: "+n);