/* eslint-disable no-console */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "diagnostics");
const OUT_FILE = path.join(OUT_DIR, "tabs_duplicates_v19_8_37.txt");
const IGNORE = new Set(["node_modules", ".git", "release", "dist", "out", "build", ".venv", "venv", "backups"]);
const TAB_NAMES = ["principal", "avatar", "chat", "chat-ia", "emotes", "inventario", "inventory", "configuracoes", "settings", "stream", "sobre", "about"];

function clean(s) {
  return String(s || "")
    .trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function canon(s) {
  const x = clean(s);
  if (["home", "main", "inicio"].includes(x)) return "principal";
  if (["chatia", "chat-ia", "ia"].includes(x)) return "chat";
  if (["inventario", "inventory"].includes(x)) return "inventario";
  if (["config", "configuracoes", "settings"].includes(x)) return "configuracoes";
  if (["sobre", "about"].includes(x)) return "sobre";
  return x;
}
function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const p = path.join(dir, name);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, files);
    else if (/\.(html?|js|mjs|cjs|css)$/i.test(name)) files.push(p);
  }
  return files;
}
function add(map, key, item) {
  key = canon(key);
  if (!key) return;
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(item);
}
function lineOf(txt, idx) { return txt.slice(0, idx).split(/\r?\n/).length; }
function excerpt(txt, idx) {
  const start = Math.max(0, idx - 90), end = Math.min(txt.length, idx + 140);
  return txt.slice(start, end).replace(/\s+/g, " ").trim();
}

const buttons = new Map();
const pages = new Map();
const renderTargets = new Map();
const scriptImports = new Map();
const suspiciousAvatar = [];
const files = walk(path.join(ROOT, "src"));

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const txt = fs.readFileSync(file, "utf8");
  let m;

  const attrRe = /<(button|a|div|li|span)[^>]*(?:data-(?:tab|target|page)|role=["']tab["'])[^>]*>/gi;
  while ((m = attrRe.exec(txt))) {
    const tag = m[0];
    const val = /data-(?:tab|target|page)=["']([^"']+)["']/i.exec(tag)?.[1]
      || /aria-controls=["'](?:page[-_])?([^"']+)["']/i.exec(tag)?.[1]
      || />([^<]{2,40})</.exec(tag)?.[1]
      || "desconhecido";
    add(buttons, val, { rel, line: lineOf(txt, m.index), sample: tag.replace(/\s+/g, " ").slice(0, 220) });
  }

  const pageRe = /<(section|main|div)[^>]*(?:id=["']([^"']*(?:page|principal|avatar|chat|stream|emotes|invent|config|sobre)[^"']*)["']|data-(?:page|tab|view)=["']([^"']+)["'])[^>]*>/gi;
  while ((m = pageRe.exec(txt))) {
    const tag = m[0];
    const raw = m[2] || m[3] || "";
    const val = raw.replace(/^page[-_]/i, "").replace(/[-_]page$/i, "");
    add(pages, val, { rel, line: lineOf(txt, m.index), sample: tag.replace(/\s+/g, " ").slice(0, 240) });
  }

  const targetRe = /(?:querySelector|getElementById)\(\s*[`"']([^`"']*(?:page-|#page-|principal|avatar|chat|stream|pages-root|app|root)[^`"']*)[`"']\s*\)/gi;
  while ((m = targetRe.exec(txt))) {
    const raw = m[1];
    let key = raw.replace(/^#/, "").replace(/^page[-_]/, "");
    if (key === "app" || key === "root" || key === "pages-root") key = `container:${key}`;
    add(renderTargets, key, { rel, line: lineOf(txt, m.index), sample: excerpt(txt, m.index) });
  }

  const scriptRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = scriptRe.exec(txt))) add(scriptImports, m[1], { rel, line: lineOf(txt, m.index), sample: m[0].replace(/\s+/g, " ") });

  if (/avatar/i.test(rel) && /(avatar_lab|phase|v1[0-8]|antig|legacy|old|backup)/i.test(rel)) {
    suspiciousAvatar.push(`${rel}`);
  }
}

function reportMap(title, map, expectedOne = true) {
  const lines = [];
  lines.push(`\n## ${title}`);
  const keys = Array.from(map.keys()).sort();
  if (!keys.length) { lines.push("Nada encontrado."); return lines; }
  for (const key of keys) {
    const arr = map.get(key);
    const marker = expectedOne && arr.length > 1 ? "DUPLICADO" : "OK";
    lines.push(`\n[${marker}] ${key}: ${arr.length}`);
    for (const it of arr.slice(0, 20)) lines.push(`  - ${it.rel}:${it.line} :: ${it.sample}`);
    if (arr.length > 20) lines.push(`  ... +${arr.length - 20} ocorrencias`);
  }
  return lines;
}

const out = [];
out.push("Noelle Companion - Diagnostico de abas duplicadas V19.8.37");
out.push(`Raiz: ${ROOT}`);
out.push(`Arquivos analisados em src: ${files.length}`);
out.push("\nREGRA: cada aba deve ter 1 botao no menu e 1 pagina/container real. Mais que isso indica duplicacao ou versao antiga montada junto.");
out.push(...reportMap("BOTOES DE ABA", buttons));
out.push(...reportMap("PAGINAS/CONTAINERS DE ABA", pages));
out.push(...reportMap("ALVOS DE RENDER/QUERYSELECTOR", renderTargets, false));
out.push(...reportMap("SCRIPTS INJETADOS EM HTML", scriptImports, false));

out.push("\n## SUSPEITAS DE AVATAR ANTIGO/LEGACY");
if (suspiciousAvatar.length) suspiciousAvatar.forEach(x => out.push(`  - ${x}`));
else out.push("Nenhum arquivo de avatar com nome antigo/legacy detectado pelo nome.");

out.push("\n## RESUMO RAPIDO");
for (const name of ["principal","avatar","chat","emotes","inventario","configuracoes","stream","sobre"]) {
  const b = buttons.get(name)?.length || 0;
  const p = pages.get(name)?.length || 0;
  out.push(`${name.padEnd(14)} botoes=${String(b).padStart(2)} paginas=${String(p).padStart(2)} ${b>1||p>1?" <-- VERIFICAR":""}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, out.join("\n"), "utf8");
console.log(out.join("\n"));
