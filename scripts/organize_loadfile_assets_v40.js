const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();
function log(x){ console.log("[assets-v40] " + x); }
function mkdir(p){ fs.mkdirSync(p,{recursive:true}); }
function move(fromRel,toRel){
  const from=path.join(ROOT,fromRel), to=path.join(ROOT,toRel);
  if(!fs.existsSync(from)) return;
  mkdir(path.dirname(to));
  if(fs.existsSync(to)){ log("destino já existe: "+toRel); return; }
  fs.renameSync(from,to); log("movido: "+fromRel+" -> "+toRel);
}
mkdir(path.join(ROOT,"src/assets/avatars"));
mkdir(path.join(ROOT,"src/assets/scenes"));
move("src/assets/avatars/naruto_sala_examen_chunnin.glb","src/assets/scenes/naruto_sala_examen_chunnin.glb");
move("src/assets/avatars/naruto_sala_examen_chunnin.gltf","src/assets/scenes/naruto_sala_examen_chunnin.gltf");
if(fs.existsSync(path.join(ROOT,"src/assets/scenes/naruto_sala_examen_chunnin.glb"))) log("Naruto classificado como scene/arena");