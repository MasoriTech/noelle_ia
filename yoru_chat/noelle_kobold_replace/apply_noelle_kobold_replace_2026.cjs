"use strict";
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const mainPath = path.join(repoRoot, "main.js");
const packagePath = path.join(repoRoot, "package.json");
const yoruRoot = path.resolve(__dirname, "..");
const clientSrc = path.join(__dirname, "yoru_kobold_embedded_client.cjs");
const clientDstDir = path.join(repoRoot, "src", "main");
const clientDst = path.join(clientDstDir, "yoru_kobold_embedded_client.cjs");
const markerBegin = "// YORU_KOBOLD_REPLACE_2026_BEGIN";
const markerEnd = "// YORU_KOBOLD_REPLACE_2026_END";

function fail(msg) { console.error("[ERRO]", msg); process.exit(1); }
function backup(file) {
  if (!fs.existsSync(file)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = `${file}.bak_yoru_kobold_${stamp}`;
  fs.copyFileSync(file, out);
  console.log("[backup]", path.relative(repoRoot, out));
}
function ensurePackageFiles() {
  if (!fs.existsSync(packagePath)) return console.warn("[aviso] package.json não encontrado; pulando build.files.");
  backup(packagePath);
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  pkg.build = pkg.build || {};
  const files = Array.isArray(pkg.build.files) ? pkg.build.files : [];
  for (const item of ["yoru_chat/**/*", "src/main/yoru_kobold_embedded_client.cjs"]) {
    if (!files.includes(item)) files.push(item);
  }
  pkg.build.files = files;
  pkg.scripts = pkg.scripts || {};
  pkg.scripts["diagnostico:yoru-kobold"] = "node yoru_chat/noelle_kobold_replace/diagnostico_noelle_kobold_replace_2026.cjs";
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2), "utf8");
  console.log("[ok] package.json atualizado com yoru_chat/**/*");
}
function writeClient() {
  fs.mkdirSync(clientDstDir, { recursive: true });
  fs.copyFileSync(clientSrc, clientDst);
  console.log("[ok] cliente STDIO copiado para", path.relative(repoRoot, clientDst));
}
function patchMain() {
  if (!fs.existsSync(mainPath)) fail("main.js não encontrado. Rode este script na raiz do Noelle Companion.");
  backup(mainPath);
  let main = fs.readFileSync(mainPath, "utf8");
  if (main.includes(markerBegin)) {
    main = main.replace(new RegExp(`${markerBegin}[\\s\\S]*?${markerEnd}\\n?`, "m"), "");
  }
  const block = `\n${markerBegin}\n(() => {\n  let __yoruKoboldChat = null;\n  function getYoruKoboldChat() {\n    if (!__yoruKoboldChat) {\n      const { YoruKoboldEmbeddedClient } = require(\"./src/main/yoru_kobold_embedded_client.cjs\");\n      __yoruKoboldChat = new YoruKoboldEmbeddedClient({ root: path.join(__dirname, \"yoru_chat\"), timeoutMs: 180000 });\n    }\n    return __yoruKoboldChat;\n  }\n  function normalizeYoruResult(res, secondsFallback = null) {\n    const text = String(res?.message || res?.text || res?.reply || \"\").trim();\n    return {\n      ok: !!res?.ok,\n      message: text,\n      text,\n      reply: text,\n      seconds: res?.elapsed_sec || res?.elapsedSec || secondsFallback,\n      model: res?.model || \"koboldcpp/yoru\",\n      profile: res?.profile || \"auto\",\n      persona: \"yoru\",\n      route: res?.route || null,\n      state: res?.state || \"idle\",\n      backend: \"koboldcpp_via_yoru\",\n      replaced: \"ollama\",\n      source: \"yoru_kobold_embedded\",\n      raw: res\n    };\n  }\n  async function yoruKoboldChatHandler(_event, payload = {}) {\n    const start = Date.now();\n    try {\n      const userText = String(payload?.message || payload?.text || payload?.prompt || \"\").trim();\n      if (!userText) return { ok: false, error: \"Mensagem vazia.\", backend: \"koboldcpp_via_yoru\", replaced: \"ollama\" };\n      runtime.lastStatus = \"gerando_kobold\";\n      updateTrayMenu?.();\n      const res = await getYoruKoboldChat().chat({ ...payload, message: userText, speak: false });\n      const out = normalizeYoruResult(res, ((Date.now() - start) / 1000).toFixed(2));\n      runtime.lastChatSeconds = out.seconds;\n      runtime.lastStatus = out.ok ? \"pronto_kobold\" : \"erro_kobold\";\n      runtime.lastError = out.ok ? null : (out.raw?.error || \"Erro Yoru/Kobold\");\n      runtime.lastSuccessAt = out.ok ? new Date().toISOString() : runtime.lastSuccessAt;\n      updateTrayMenu?.();\n      return out.ok ? out : { ...out, error: out.raw?.error || \"Falha no Yoru/Kobold\" };\n    } catch (err) {\n      const msg = String(err?.message || err);\n      runtime.lastStatus = \"erro_kobold\";\n      runtime.lastError = msg;\n      updateTrayMenu?.();\n      return { ok: false, error: msg, backend: \"koboldcpp_via_yoru\", replaced: \"ollama\" };\n    }\n  }\n  async function yoruKoboldStatusHandler() {\n    let yoru = null;\n    try { yoru = await getYoruKoboldChat().status(); } catch (err) { yoru = { ok: false, error: String(err?.message || err) }; }\n    let state = {};\n    let assets = null;\n    try { state = typeof loadState === \"function\" ? loadState() : {}; } catch (_) {}\n    try { assets = typeof scanAssets === \"function\" ? scanAssets() : null; } catch (_) {}\n    return {\n      ok: true,\n      year: typeof APP_YEAR !== \"undefined\" ? APP_YEAR : 2026,\n      app: \"Noelle Companion\",\n      backend: \"koboldcpp_via_yoru\",\n      chat: { backend: \"koboldcpp_via_yoru\", transport: \"stdio_jsonl\", yoru },\n      kobold: yoru,\n      ollama: { ok: false, disabled: true, replacedBy: \"koboldcpp_via_yoru\" },\n      runtime,\n      state,\n      assets: assets ? { counts: assets.counts, required: assets.required } : null,\n      options: {\n        models: { \"koboldcpp/yoru\": { label: \"Yoru + KoboldCpp\", note: \"Chat principal substituindo Ollama.\" } },\n        profiles: { auto: { label: \"Auto\" }, fast: { label: \"FAST\" }, think: { label: \"THINK\" } },\n        personas: { yoru: { label: \"Yoru\" } }\n      }\n    };\n  }\n  function installYoruKoboldReplacement() {\n    try { ipcMain.removeHandler(\"noelle:chat\"); } catch (_) {}\n    ipcMain.handle(\"noelle:chat\", yoruKoboldChatHandler);\n    try { ipcMain.removeHandler(\"noelle:status\"); } catch (_) {}\n    ipcMain.handle(\"noelle:status\", yoruKoboldStatusHandler);\n    try { ipcMain.removeHandler(\"noelle:kobold-status\"); } catch (_) {}\n    ipcMain.handle(\"noelle:kobold-status\", async () => getYoruKoboldChat().status());\n    appendLog?.(\"yoru_kobold_replace_enabled\", { channel: \"noelle:chat\", backend: \"koboldcpp_via_yoru\" });\n    console.log(\"[NoelleKoboldReplace] noelle:chat agora usa Yoru + KoboldCpp. Ollama não é mais usado no chat.\");\n  }\n  try { installYoruKoboldReplacement(); } catch (err) { console.warn(\"[NoelleKoboldReplace] instalação inicial falhou:\", err?.message || err); }\n  try { app.whenReady().then(() => setTimeout(installYoruKoboldReplacement, 300)); } catch (_) {}\n  setTimeout(() => { try { installYoruKoboldReplacement(); } catch (_) {} }, 1500);\n  try { app.on(\"before-quit\", () => { try { if (__yoruKoboldChat) __yoruKoboldChat.stop(); } catch (_) {} }); } catch (_) {}\n})();\n${markerEnd}\n`;
  fs.writeFileSync(mainPath, main + block, "utf8");
  console.log("[ok] main.js recebeu patch NoelleKoboldReplace");
}

if (!fs.existsSync(path.join(yoruRoot, "src", "yoru_bridge"))) fail("Pasta yoru_chat inválida. Coloque este pack como yoru_chat/ dentro do repo.");
writeClient();
ensurePackageFiles();
patchMain();
console.log("\nPronto. Agora rode:");
console.log("  node yoru_chat/noelle_kobold_replace/diagnostico_noelle_kobold_replace_2026.cjs");
console.log("  npm start");
