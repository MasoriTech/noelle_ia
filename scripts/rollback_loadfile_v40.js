const fs=require("fs"), path=require("path"); const ROOT=process.cwd();
function restore(rel){const f=path.join(ROOT,rel), b=f+".bak_loadfile_v40"; if(fs.existsSync(b)){fs.copyFileSync(b,f);console.log("[OK] restaurado "+rel)}else console.log("[INFO] backup ausente "+rel)}
restore("src/avatar_loadfile_preview_v19_8_3.html"); restore("src/renderer/avatar_loadfile_preview_v19_8_3_app.mjs");