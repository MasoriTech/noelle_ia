"use strict";
const path = require("path");
const { spawn } = require("child_process");
const readline = require("readline");

class YoruKoboldEmbeddedClient {
  constructor(options = {}) {
    this.root = options.root || path.join(process.cwd(), "yoru_chat");
    this.python = options.python || process.env.YORU_PYTHON || "python";
    this.timeoutMs = Number(options.timeoutMs || process.env.YORU_TIMEOUT_MS || 180000);
    this.proc = null;
    this.rl = null;
    this.seq = 0;
    this.pending = new Map();
    this.ready = false;
    this.readyPayload = null;
  }

  start() {
    if (this.proc && !this.proc.killed) return Promise.resolve(this.readyPayload || { ok: true, ready: this.ready });
    this.proc = spawn(this.python, ["-m", "yoru_bridge", "embedded"], {
      cwd: this.root,
      env: {
        ...process.env,
        PYTHONPATH: path.join(this.root, "src") + path.delimiter + (process.env.PYTHONPATH || ""),
        PYGAME_HIDE_SUPPORT_PROMPT: "1",
        PYTHONIOENCODING: "utf-8"
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    this.proc.stderr.on("data", chunk => {
      const text = chunk.toString("utf8").trim();
      if (text) console.warn("[Yoru/Kobold STDERR]", text);
    });
    this.proc.on("exit", code => {
      this.ready = false;
      for (const [id, item] of this.pending.entries()) {
        clearTimeout(item.timer);
        item.reject(new Error(`Yoru/Kobold saiu. code=${code}`));
      }
      this.pending.clear();
      this.proc = null;
    });
    this.rl = readline.createInterface({ input: this.proc.stdout });
    this.rl.on("line", line => this._handleLine(line));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timeout esperando Yoru/Kobold ready")), 45000);
      this._readyResolver = msg => {
        clearTimeout(timer);
        this.ready = true;
        this.readyPayload = msg;
        resolve(msg);
      };
    });
  }

  _handleLine(line) {
    let msg;
    try { msg = JSON.parse(line); }
    catch (_) { console.warn("[Yoru/Kobold non-json]", line); return; }
    if (msg.type === "ready") {
      if (this._readyResolver) this._readyResolver(msg);
      return;
    }
    const item = msg.id ? this.pending.get(msg.id) : null;
    if (item) {
      this.pending.delete(msg.id);
      clearTimeout(item.timer);
      item.resolve(msg);
    } else {
      console.log("[Yoru/Kobold event]", msg);
    }
  }

  async request(payload) {
    await this.start();
    if (!this.proc || !this.proc.stdin || !this.proc.stdin.writable) throw new Error("Yoru/Kobold não iniciado.");
    const id = payload.id || `noelle-kobold-${Date.now()}-${++this.seq}`;
    const body = { ...payload, id };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Timeout Yoru/Kobold"));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin.write(JSON.stringify(body) + "\n", "utf8");
    });
  }

  chat(payload = {}) {
    const message = String(payload.message || payload.text || payload.prompt || "").trim();
    return this.request({
      type: "chat",
      message,
      mode: payload.mode || "auto",
      speak: false,
      history: Array.isArray(payload.history) ? payload.history : []
    });
  }

  command(command) { return this.request({ type: "command", command: String(command || "") }); }
  status() { return this.request({ type: "status" }); }
  stop() {
    if (!this.proc) return Promise.resolve({ ok: true, stopped: true });
    const p = this.request({ type: "shutdown" }).catch(() => null);
    setTimeout(() => { try { if (this.proc) this.proc.kill(); } catch (_) {} }, 1000);
    return p;
  }
}

module.exports = { YoruKoboldEmbeddedClient };
