"use strict";

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
