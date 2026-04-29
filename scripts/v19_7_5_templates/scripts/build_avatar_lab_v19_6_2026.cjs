"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function fail(message) {
  console.error("[ERRO] " + message);
  process.exit(1);
}

async function main() {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch {
    fail("esbuild não encontrado. Rode npm install.");
  }

  const entry = path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js");
  const outdir = path.join(ROOT, "src", "renderer_dist");
  const outfile = path.join(outdir, "avatar_lab_v19_6.bundle.js");

  if (!fs.existsSync(entry)) fail("Entrada não encontrada: " + entry);
  const source = fs.readFileSync(entry, "utf8");
  if (/^await\s+load(?:MotionManifest|Avatar)\b/m.test(source)) {
    fail("Top-level await encontrado no Avatar Preview. A versão V19.7.5 usa boot async interno.");
  }
  if (/BroadcastChannel|noelle-avatar-room-sync|noelle\.avatar\.sync|Sincronizar Room/.test(source)) {
    fail("Código técnico antigo ainda apareceu no app do Avatar. Reaplique o pack V19.7.5.");
  }

  fs.mkdirSync(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    sourcemap: true,
    logLevel: "info",
  });
  console.log("[OK] Bundle Avatar Carousel gerado:", path.relative(ROOT, outfile));
}

main().catch((err) => {
  console.error("[ERRO] Build Avatar Preview falhou:", err && err.message ? err.message : err);
  process.exit(1);
});
