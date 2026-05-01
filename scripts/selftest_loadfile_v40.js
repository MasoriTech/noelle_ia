const fs=require("fs"), path=require("path"), cp=require("child_process"); const ROOT=process.cwd(); let bad=false;
const ok=x=>console.log("[OK] "+x), fail=x=>{bad=true;console.log("[ERRO] "+x)}; const ex=f=>fs.existsSync(path.join(ROOT,f)); const read=f=>fs.readFileSync(path.join(ROOT,f),"utf8");
function chk(f){try{cp.execFileSync("node",["--check",f],{cwd:ROOT,stdio:"pipe"});ok("node --check "+f)}catch{fail("node --check "+f)}}
["src/renderer/loadfile/loadfile_runtime_bridge_v40.js","config/loadfile_runtime_policy_v40.json","scripts/apply_loadfile_v40.js"].forEach(f=>ex(f)?ok("existe "+f):fail("faltando "+f));
["src/renderer/loadfile/loadfile_runtime_bridge_v40.js","scripts/apply_loadfile_v40.js","scripts/checkup_loadfile_v40.js","scripts/rollback_loadfile_v40.js"].forEach(chk);
read("src/renderer/loadfile/loadfile_runtime_bridge_v40.js").includes("__NOELLE_LOADFILE_V40_CONFIG__")?ok("bridge global"):fail("bridge global ausente");
const p=JSON.parse(read("config/loadfile_runtime_policy_v40.json")); p.enable_glb_avatar===false?ok("GLB avatar bloqueado"):fail("GLB avatar deveria estar bloqueado");
if(bad) process.exit(1);