"use strict";

const path = require("path");
const fs = require("fs");

const root = process.cwd();
const entry = path.join(root, "src", "renderer", "avatar_carousel_preview_v19_8_2_app.mjs");
const outfile = path.join(root, "src", "renderer_dist", "avatar_carousel_preview_v19_8_2.bundle.js");

function fail(message) {
  console.error(`[ERRO] ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[OK] ${message}`);
}

if (!fs.existsSync(entry)) fail(`Entrada nao encontrada: ${path.relative(root, entry)}`);
fs.mkdirSync(path.dirname(outfile), { recursive: true });

let esbuild;
try {
  esbuild = require("esbuild");
} catch (err) {
  fail("esbuild nao encontrado. Rode npm install ou npm install esbuild --save-dev.");
}

esbuild.build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome120"],
  sourcemap: false,
  logLevel: "info",
  legalComments: "none"
}).then(() => {
  const size = fs.existsSync(outfile) ? fs.statSync(outfile).size : 0;
  if (size < 1000) fail("Bundle gerado parece pequeno demais.");
  ok(`Bundle Avatar Preview V19.8.2 gerado: ${path.relative(root, outfile)} (${size} bytes)`);
}).catch((err) => {
  fail(`Build Avatar Preview V19.8.2 falhou: ${err?.message || err}`);
});
