const fs=require('fs'),path=require('path');
const files=['src\\renderer\\modules\\noelle_tabs_guard_v19_8_35.js','src\\renderer\\styles\\noelle_tabs_guard_v19_8_35.css'];
let ok=true;
for(const f of files){const p=path.join(process.cwd(),f); if(fs.existsSync(p)) console.log('[OK]',f); else {console.log('[ERRO]',f,'nao encontrado'); ok=false;}}
process.exit(ok?0:1);
