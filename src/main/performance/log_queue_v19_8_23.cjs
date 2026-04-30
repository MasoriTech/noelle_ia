"use strict";

/*
  Noelle/Yoru V19.8.23
  Log queue assíncrona para não travar o main process com appendFileSync.
  Também limita crescimento do log para evitar arquivo gigante.
*/

const fs = require("fs");
const path = require("path");

const MAX_LOG_BYTES = 2 * 1024 * 1024;
const KEEP_LOG_BYTES = 512 * 1024;
const FLUSH_DELAY_MS = 120;
const MAX_QUEUE_LINES = 300;

let queue = [];
let timer = null;
let flushing = false;

function ensureDirSafe(dirPath) {
  if (!dirPath) return;
  try { fs.mkdirSync(dirPath, { recursive: true }); } catch (_) {}
}

function trimText(value, max = 1200) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}

function safePayload(message, extra) {
  const payload = {
    at: new Date().toISOString(),
    message: trimText(message, 200)
  };

  if (extra !== null && extra !== undefined) {
    try {
      const json = JSON.stringify(extra);
      payload.extra = json && json.length > 1800 ? trimText(json, 1800) : extra;
    } catch (_) {
      payload.extra = trimText(extra, 800);
    }
  }

  return payload;
}

function rotateIfNeeded(filePath) {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size <= MAX_LOG_BYTES) return;

    const fd = fs.openSync(filePath, "r");
    const keep = Math.min(KEEP_LOG_BYTES, stat.size);
    const buffer = Buffer.alloc(keep);
    fs.readSync(fd, buffer, 0, keep, stat.size - keep);
    fs.closeSync(fd);

    fs.writeFileSync(
      filePath,
      Buffer.concat([
        Buffer.from(JSON.stringify({ at: new Date().toISOString(), message: "log_rotated_v19_8_23" }) + "\n", "utf8"),
        buffer
      ]),
      "utf8"
    );
  } catch (_) {}
}

function flushLogQueue() {
  if (flushing) return;
  flushing = true;
  timer = null;

  const batch = queue;
  queue = [];

  if (!batch.length) {
    flushing = false;
    return;
  }

  const grouped = new Map();

  for (const item of batch) {
    if (!grouped.has(item.filePath)) grouped.set(item.filePath, []);
    grouped.get(item.filePath).push(item.line);
  }

  for (const [filePath, lines] of grouped.entries()) {
    try {
      ensureDirSafe(path.dirname(filePath));
      rotateIfNeeded(filePath);
      fs.appendFile(filePath, lines.join(""), "utf8", () => {});
    } catch (_) {}
  }

  flushing = false;
  if (queue.length) scheduleFlush();
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(flushLogQueue, FLUSH_DELAY_MS);
  if (timer && typeof timer.unref === "function") timer.unref();
}

function appendNoelleLog(filePath, message, extra = null) {
  try {
    if (!filePath) return;

    if (queue.length >= MAX_QUEUE_LINES) {
      queue = queue.slice(-Math.floor(MAX_QUEUE_LINES / 2));
      queue.push({
        filePath,
        line: JSON.stringify({ at: new Date().toISOString(), message: "log_queue_trimmed_v19_8_23" }) + "\n"
      });
    }

    queue.push({
      filePath,
      line: JSON.stringify(safePayload(message, extra)) + "\n"
    });

    scheduleFlush();
  } catch (_) {}
}

function flushNoelleLogsNow() {
  try {
    if (timer) clearTimeout(timer);
    timer = null;
    flushLogQueue();
  } catch (_) {}
}

module.exports = {
  appendNoelleLog,
  flushNoelleLogsNow
};
