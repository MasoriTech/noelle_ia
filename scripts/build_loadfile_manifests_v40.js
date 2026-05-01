const fs=require("fs"), path=require("path");
const ROOT=process.cwd();
const policy=JSON.parse(fs.readFileSync(path.join(ROOT,"config/loadfile_runtime_policy_v40.json"),"utf8"));
const ext=(f)=>path.extname(f).toLowerCase();
const title=(f)=>path.basename(f,path.extname(f)).replace(/[_-]+/g," ").replace(/\b\w/g,m=>m.toUpperCase());
const existsSrc=(rel)=>fs.existsSync(path.join(ROOT,"src",rel));
const relSrc=(abs)=>path.relative(path.join(ROOT,"src"),abs).replace(/\\/g,"/");
function scan(dirs, exts){
  const out=[];
  for(const d of dirs||[]){ const abs=path.join(ROOT,d); if(!fs.existsSync(abs)) continue;
    for(const name of fs.readdirSync(abs)){ const f=path.join(abs,name); if(fs.statSync(f).isFile() && exts.includes(ext(name))) out.push(f); }
  }
  return out;
}
const candidates=[policy.default_avatar,{name:"Yoru",path:"assets/avatars/Yoru.vrm",type:"vrm"}];
for(const abs of scan(policy.avatars_scan, policy.avatar_listed_ext)){
  const rel=relSrc(abs); if(rel.startsWith("assets/scenes/")) continue;
  if(!candidates.some(x=>x.path===rel)) candidates.push({name:title(abs),path:rel,type:ext(abs).slice(1)});
}
const seen=new Set();
const avatars=[];
for(const a of candidates){ if(!a||!a.path||seen.has(a.path)) continue; seen.add(a.path);
  const e=ext(a.path), exists=existsSrc(a.path), isGlb=e===".glb"||e===".gltf";
  const renderable=exists && ((policy.avatar_renderable_ext||[".vrm"]).includes(e) || (isGlb && policy.enable_glb_avatar));
  const reason=!exists?"arquivo ausente":(!renderable?"não suportado pelo Loadfile VRM":"");
  avatars.push({name:a.name||title(a.path),path:a.path,type:a.type||e.slice(1),kind:"avatar",fallback:a.path===policy.default_avatar.path,exists,renderable,enabled:renderable,reason});
}
const scenes=[];
for(const abs of scan(policy.scenes_scan, policy.scene_ext)){
  const rel=relSrc(abs);
  scenes.push({name:/naruto_sala_examen_chunnin/i.test(rel)?"Arena Chunin":title(abs),path:rel,type:ext(abs).slice(1),kind:"scene",exists:true,renderable:!!policy.scene_support_in_preview,enabled:!!policy.scene_support_in_preview,reason:policy.scene_support_in_preview?"":"cenário listado; preview VRM ainda não aplica scene GLB"});
}
fs.mkdirSync(path.join(ROOT,"src/assets/avatars"),{recursive:true});
fs.mkdirSync(path.join(ROOT,"src/assets/scenes"),{recursive:true});
const payload={version:"loadfile-v40",generatedAt:new Date().toISOString(),avatars};
fs.writeFileSync(path.join(ROOT,"src/assets/avatars/avatar_manifest_runtime_v40.json"),JSON.stringify(payload,null,2));
fs.writeFileSync(path.join(ROOT,"src/assets/avatars/avatar_manifest_runtime_v39_9.json"),JSON.stringify({...payload,version:"v39.9-compat-from-loadfile-v40"},null,2));
fs.writeFileSync(path.join(ROOT,"src/assets/scenes/scene_manifest_runtime_v40.json"),JSON.stringify({version:"loadfile-v40",generatedAt:new Date().toISOString(),scenes},null,2));
for(const a of avatars) console.log((a.renderable?"[AVATAR OK] ":"[AVATAR BLOCKED] ")+a.path+(a.reason?" - "+a.reason:""));
for(const s of scenes) console.log("[SCENE] "+s.name+" -> "+s.path);