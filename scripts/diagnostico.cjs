"use strict";

const fs = require("fs");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const required = [
  "package.json",
  "main.js",
  "preload.js",
  "src/controls.html",
  "src/styles/noelle.css",
  "src/renderer/controls_window_app.js"
];

function checkFile(file) {
  const full = path.join(ROOT, file);
  return { file, ok: fs.existsSync(full), size: fs.existsSync(full) ? fs.statSync(full).size : 0 };
}

function checkOllama() {
  return new Promise((resolve) => {
    const req = http.request({ hostname: "127.0.0.1", port: 11434, path: "/api/tags", method: "GET", timeout: 3500 }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data || "{}");
          resolve({ ok: true, statusCode: res.statusCode, models: Array.isArray(parsed.models) ? parsed.models.map((m) => m.name) : [] });
        } catch (err) {
          resolve({ ok: false, error: "Resposta inválida: " + err.message });
        }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", (err) => resolve({ ok: false, error: err.message }));
    req.end();
  });
}

(async () => {
  console.log("============================================================");
  console.log(" Noelle Companion 2026 - Diagnóstico");
  console.log("============================================================");
  console.log("Raiz:", ROOT);
  console.log("Node:", process.version);
  console.log("");
  console.log("Arquivos:");
  for (const item of required.map(checkFile)) {
    console.log(` - ${item.ok ? "OK" : "FALTA"} ${item.file}${item.ok ? ` (${item.size} bytes)` : ""}`);
  }
  console.log("");
  console.log("Electron:", fs.existsSync(path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron")) ? "instalado" : "não instalado / rode npm install");
  const ollama = await checkOllama();
  console.log("Ollama:", ollama.ok ? "online" : "offline");
  if (ollama.ok) console.log("Modelos:", ollama.models.length ? ollama.models.join(", ") : "nenhum listado");
  else console.log("Detalhe:", ollama.error);
  console.log("============================================================");
})();
