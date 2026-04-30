"use strict";

/*
  Noelle/Yoru V19.8.22
  Escrita JSON atômica para reduzir risco de corromper state/config/logs se o app fechar no meio da gravação.
*/

const fs = require("fs");
const path = require("path");

function ensureDirSafe(dirPath) {
  if (!dirPath) return;
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJsonAtomic(filePath, value) {
  ensureDirSafe(path.dirname(filePath));
  const text = JSON.stringify(value, null, 2);
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, text, "utf8");
  fs.renameSync(tmp, filePath);
}

module.exports = {
  writeJsonAtomic
};
