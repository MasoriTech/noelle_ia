"use strict";

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const ROOT = process.cwd();

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }
function read(rel) { return exists(rel) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : ""; }
function parseJson(rel, fallback) { try { return JSON.parse(read(rel)); } catch { return fallback; } }
function ok(msg) { console.log("[OK] " + msg); }
function warn(msg) { console.log("[AVISO] " + msg); }
function err(msg) { console.error("[ERRO] " + msg); process.exitCode = 1; }

function checkJs(rel) {
  if (!exists(rel)) return warn(rel + " não encontrado.");
  const result = cp.spawnSync(process.execPath, ["--check", path.join(ROOT, rel)], { encoding: "utf8" });
  if (result.status === 0) ok("node --check " + rel);
  else {
    err("node --check falhou: " + rel);
    console.error(result.stderr || result.stdout);
  }
}

console.log("============================================================");
console.log(" Diagnóstico V17.7 - items robustos");
console.log("============================================================");

checkJs("src/renderer/item_slots.js");
checkJs("src/renderer/item_behaviors.js");
checkJs("src/renderer/items.js");
checkJs("src/renderer/avatar_window_app.js");

const slots = read("src/renderer/item_slots.js");
if (slots.includes("validateItemTransform") && slots.includes("front_floor") && slots.includes("ground")) ok("item_slots robusto: validação, chão e scene slots.");
else err("item_slots.js não parece ser V17.7.");

const itemsJs = read("src/renderer/items.js");
if (itemsJs.includes("SkeletonUtils") || itemsJs.includes("cloneSkeleton")) ok("items.js usa SkeletonUtils.clone/fallback.");
else err("items.js não usa SkeletonUtils.clone.");
if (itemsJs.includes("createNormalizedItemNode") && itemsJs.includes("getBoundingBoxSafe")) ok("items.js normaliza pivot/tamanho por bounding box.");
else err("items.js não normaliza pivot/tamanho.");
if (itemsJs.includes("ground") && itemsJs.includes("front_floor")) ok("items.js trata scene props/chão.");
else warn("items.js pode não tratar scene props.");
if (itemsJs.includes("noelle:item-behavior:motion")) ok("items.js dispara behavior motion.");
else warn("items.js não dispara behavior motion.");

const behaviors = read("src/renderer/item_behaviors.js");
if (behaviors.includes("006_drinkwater") && behaviors.includes("005_smartphone")) ok("item_behaviors tem água e iPhone.");
else err("item_behaviors incompleto.");

const manifest = parseJson("src/assets/item_manifest.json", []);
if (!Array.isArray(manifest) || !manifest.length) err("item_manifest vazio/inválido.");
else ok(`item_manifest lista ${manifest.length} items.`);

for (const id of ["agua", "office_desk", "grand_piano", "iphone_14_pro", "microfone"]) {
  const item = manifest.find((entry) => entry.id === id);
  if (!item) {
    err("Item obrigatório ausente: " + id);
    continue;
  }
  if (item.defaultSlot || item.slot) ok(`${id}: slot = ${item.defaultSlot || item.slot}`);
  else err(`${id}: sem slot.`);
  if (item.transform && Object.keys(item.transform).length) ok(`${id}: transform OK.`);
  else err(`${id}: sem transform.`);
}

const agua = manifest.find((entry) => entry.id === "agua");
if (agua?.behavior?.onEquip?.playMotion === "006_drinkwater") ok("Água ligada ao motion 006_drinkwater.");
else warn("Água não está ligada ao motion 006_drinkwater.");

for (const id of ["office_desk", "grand_piano"]) {
  const item = manifest.find((entry) => entry.id === id);
  const t = item?.transform?.front_floor;
  if (!t) {
    err(`${id}: sem front_floor.`);
    continue;
  }
  const pos = t.position || [];
  if (Number(pos[1]) === 0 && Number(pos[2]) < 0 && t.ground !== false) ok(`${id}: chão/frente robusto.`);
  else warn(`${id}: front_floor pode precisar ajuste: ${JSON.stringify(t)}`);
}

const avatar = read("src/renderer/avatar_window_app.js");
if (avatar.includes("noelle:item-behavior:motion")) ok("avatar escuta behavior motion.");
else warn("avatar ainda não escuta behavior motion.");

console.log("============================================================");
if (process.exitCode) console.log("[RESULTADO] Existem problemas.");
else console.log("[RESULTADO] Diagnóstico sem erro crítico.");
