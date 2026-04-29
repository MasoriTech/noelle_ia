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

  const entry = path.join(ROOT, "src", "renderer", "avatar_lab_v19_6_app.js");
  const outdir = path.join(ROOT, "src", "renderer_dist");
  const outfile = path.join(outdir, "avatar_lab_v19_6.bundle.js");

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
    platform: "browser",
    target: ["chrome120"],
    sourcemap: true,
    logLevel: "info"
  });

  console.log("[OK] Bundle Avatar Lab V19.6 gerado:", path.relative(ROOT, outfile));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
