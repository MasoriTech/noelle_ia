#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = process.cwd();
const entry = path.join(root, "src", "renderer", "avatar_carousel_v19_7_6_app.js");
const outdir = path.join(root, "src", "renderer_dist");
const outfile = path.join(outdir, "avatar_carousel_v19_7_6.bundle.js");

function fail(message) {
  console.error("[ERRO] " + message);
  process.exit(1);
}

if (!fs.existsSync(entry)) fail("Entrada não encontrada: " + path.relative(root, entry));
fs.mkdirSync(outdir, { recursive: true });

esbuild.build({
  entryPoints: [entry],
  bundle: true,
  outfile,
  platform: "browser",
  format: "iife",
  target: ["chrome120"],
  sourcemap: false,
  logLevel: "info",
  legalComments: "none"
}).then(() => {
  const bytes = fs.statSync(outfile).size;
  console.log("[OK] Bundle Avatar Carrossel V19.7.6 gerado:", path.relative(root, outfile), bytes + " bytes");
}).catch((err) => {
  console.error("[ERRO] Build Avatar Carrossel V19.7.6 falhou:", err?.message || err);
  process.exit(1);
});
