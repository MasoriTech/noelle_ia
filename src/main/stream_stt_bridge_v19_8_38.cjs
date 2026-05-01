// NOELLE_STREAM_STT_MAIN_V19_8_38_BEGIN
;(() => {
  try {
    const { ipcMain, app } = require("electron");
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const { spawn } = require("child_process");

    if (!ipcMain || global.__NOELLE_STREAM_STT_MAIN_V19_8_38__) return;
    global.__NOELLE_STREAM_STT_MAIN_V19_8_38__ = true;

    const ROOT = process.cwd();
    const CONFIG_FILE = path.join(ROOT, "config", "stream_stt_v19_8_38.json");

    function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
    function readJson(file, fallback) { try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; } }
    function fileExists(file) { try { return fs.existsSync(file); } catch { return false; } }
    function safeExt(mimeType) { const t = String(mimeType || "").toLowerCase(); if (t.includes("ogg")) return ".ogg"; if (t.includes("wav")) return ".wav"; if (t.includes("mp3")) return ".mp3"; return ".webm"; }
    function defaultTempDir() { try { return path.join(app.getPath("temp"), "noelle-stream-stt"); } catch { return path.join(os.tmpdir(), "noelle-stream-stt"); } }

    function bufferFromAudio(audioBuffer) {
      if (Buffer.isBuffer(audioBuffer)) return audioBuffer;
      if (audioBuffer instanceof ArrayBuffer) return Buffer.from(audioBuffer);
      if (ArrayBuffer.isView(audioBuffer)) return Buffer.from(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength);
      if (audioBuffer && audioBuffer.type === "Buffer" && Array.isArray(audioBuffer.data)) return Buffer.from(audioBuffer.data);
      throw new Error("Formato de áudio inválido no IPC.");
    }

    function candidateCommands() {
      const cfg = readJson(CONFIG_FILE, {});
      const list = [];

      if (process.env.NOELLE_STT_CMD) {
        list.push({
          name: "env:NOELLE_STT_CMD",
          command: process.env.NOELLE_STT_CMD,
          args: process.env.NOELLE_STT_ARGS ? process.env.NOELLE_STT_ARGS.split(" ") : ["{input}"]
        });
      }

      if (cfg.command) {
        list.push({
          name: cfg.name || "config",
          command: cfg.command,
          args: Array.isArray(cfg.args) ? cfg.args : ["{input}"],
          cwd: cfg.cwd || ROOT
        });
      }

      const bundled = [
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "whisper-cli.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "main.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp", command: path.join(ROOT, "tools", "whisper", "whisper-cli"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "faster-whisper", command: path.join(ROOT, "tools", "faster-whisper", "faster-whisper.exe"), args: ["{input}", "--language", "pt", "--output_dir", "{outputDir}"] }
      ];

      for (const item of bundled) if (fileExists(item.command)) list.push(item);
      return list;
    }

    function replaceArgs(args, paths) {
      return args.map((arg) => String(arg)
        .replaceAll("{input}", paths.input)
        .replaceAll("{output}", paths.output)
        .replaceAll("{outputBase}", paths.outputBase)
        .replaceAll("{outputDir}", paths.outputDir)
      );
    }

    function runCommand(spec, paths, timeoutMs = 120000) {
      return new Promise((resolve) => {
        const args = replaceArgs(spec.args || ["{input}"], paths);
        const child = spawn(spec.command, args, { cwd: spec.cwd || ROOT, windowsHide: true, shell: false });
        let stdout = "";
        let stderr = "";
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          try { child.kill("SIGKILL"); } catch {}
          resolve({ ok: false, error: "STT demorou demais.", stdout, stderr, command: spec.name || spec.command });
        }, timeoutMs);

        child.stdout.on("data", (data) => { stdout += String(data); if (stdout.length > 200000) stdout = stdout.slice(-100000); });
        child.stderr.on("data", (data) => { stderr += String(data); if (stderr.length > 200000) stderr = stderr.slice(-100000); });
        child.on("error", (err) => { if (done) return; done = true; clearTimeout(timer); resolve({ ok: false, error: err?.message || String(err), stdout, stderr, command: spec.name || spec.command }); });
        child.on("close", (code) => { if (done) return; done = true; clearTimeout(timer); resolve({ ok: code === 0, code, stdout, stderr, command: spec.name || spec.command }); });
      });
    }

    function readTranscript(paths, stdout) {
      const candidates = [paths.output, paths.outputBase + ".txt"];

      try {
        const files = fs.existsSync(paths.outputDir) ? fs.readdirSync(paths.outputDir) : [];
        for (const file of files) if (/\.txt$/i.test(file)) candidates.push(path.join(paths.outputDir, file));
      } catch {}

      for (const file of candidates) {
        try {
          if (fs.existsSync(file)) {
            const text = fs.readFileSync(file, "utf8").trim();
            if (text) return text;
          }
        } catch {}
      }

      return String(stdout || "").trim();
    }

    async function transcribeHandler(_event, audioBuffer, meta = {}) {
      try {
        const buffer = bufferFromAudio(audioBuffer);
        if (!buffer.length) return { ok: false, error: "Áudio vazio." };

        const tmpDir = defaultTempDir();
        ensureDir(tmpDir);

        const id = "stream_" + Date.now() + "_" + Math.random().toString(16).slice(2);
        const input = path.join(tmpDir, id + safeExt(meta.mimeType));
        const outputBase = path.join(tmpDir, id + "_out");
        const output = outputBase + ".txt";
        fs.writeFileSync(input, buffer);

        const commands = candidateCommands();
        if (!commands.length) {
          return {
            ok: false,
            error: "STT backend não configurado. Configure NOELLE_STT_CMD ou config/stream_stt_v19_8_38.json.",
            input,
            expectedConfig: CONFIG_FILE
          };
        }

        const paths = { input, output, outputBase, outputDir: tmpDir };
        const errors = [];

        for (const spec of commands) {
          const result = await runCommand(spec, paths, Number(meta.timeoutMs || 120000));
          if (!result.ok) {
            errors.push((result.command || spec.command) + ": " + (result.error || result.stderr || ("exit " + result.code)));
            continue;
          }

          const transcript = readTranscript(paths, result.stdout);
          if (transcript) return { ok: true, text: transcript, transcript, backend: result.command || spec.name || spec.command, input, mimeType: meta.mimeType || "" };
          errors.push((result.command || spec.command) + ": sem texto");
        }

        return { ok: false, error: "Nenhum backend STT retornou texto.", details: errors.slice(-5), input };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    }

    function sttStatus() {
      const commands = candidateCommands();
      return {
        ok: true,
        configured: commands.length > 0,
        configFile: CONFIG_FILE,
        commands: commands.map((item) => ({ name: item.name || item.command, command: item.command }))
      };
    }

    try { ipcMain.handle("noelle:stream-transcribe-audio-v19_8_38", transcribeHandler); } catch (err) {
      const msg = err?.message || String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.38] handler transcribe:", msg);
    }

    try { ipcMain.handle("noelle:stream-stt-status-v19_8_38", async () => sttStatus()); } catch (err) {
      const msg = err?.message || String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.38] handler status:", msg);
    }
  } catch (err) {
    console.warn("[stream-stt-v19.8.38] main bridge indisponível:", err?.message || err);
  }
})();
// NOELLE_STREAM_STT_MAIN_V19_8_38_END
