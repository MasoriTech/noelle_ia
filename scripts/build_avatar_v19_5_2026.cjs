"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

async function main() {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch {
    console.error("[ERRO] esbuild não encontrado. Rode npm install.");
    process.exit(1);
  }

  const entry = path.join(ROOT, "src", "renderer", "avatar_v19_5_preview_app.js");
  const outdir = path.join(ROOT, "src", "renderer_dist");
  const outfile = path.join(outdir, "avatar_v19_5.bundle.js");

  if (!fs.existsSync(entry)) {
    console.error("[ERRO] Entrada não encontrada:", entry);
    process.exit(1);
  }

  fs.mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "iife",
    globalName: "NoelleAvatarV195",
    platform: "browser",
    target: ["chrome120"],
    sourcemap: true,
    logLevel: "info"
  });

  console.log("[OK] Bundle Avatar V19.5 gerado:", path.relative(ROOT, outfile));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
