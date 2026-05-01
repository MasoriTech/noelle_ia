const fs=require("fs"), path=require("path");
const ROOT=process.cwd();
const file=path.join(ROOT,"src/avatar_loadfile_preview_v19_8_3.html");
const tag='<script src="./renderer/loadfile/loadfile_runtime_bridge_v40.js"></script>';
if(!fs.existsSync(file)){ console.log("[html-v40] preview HTML ausente"); process.exit(1); }
let html=fs.readFileSync(file,"utf8");
const bak=file+".bak_loadfile_v40"; if(!fs.existsSync(bak)) fs.copyFileSync(file,bak);
html=html.replace(/<script[^>]*loadfile_runtime_bridge_v40\.js[^>]*><\/script>/g,"");
const module=html.match(/<script[^>]*type=["']module["'][^>]*>/i);
if(module) html=html.replace(module[0],tag+"\n"+module[0]);
else if(html.includes("</head>")) html=html.replace("</head>",tag+"\n</head>");
else if(html.includes("</body>")) html=html.replace("</body>",tag+"\n</body>");
else html=tag+"\n"+html;
fs.writeFileSync(file,html,"utf8");
console.log("[html-v40] bridge injetado");