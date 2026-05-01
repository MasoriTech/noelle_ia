// NOELLE_STREAM_STT_MAIN_V19_8_39_BEGIN
;(() => {
  try {
    const { ipcMain, app } = require("electron");
    const fs = require("fs");
    const path = require("path");
    const os = require("os");
    const { spawn, spawnSync } = require("child_process");

    if (!ipcMain || global.__NOELLE_STREAM_STT_MAIN_V19_8_39__) return;
    global.__NOELLE_STREAM_STT_MAIN_V19_8_39__ = true;

    const ROOT = process.cwd();
    const CONFIG_FILE_39 = path.join(ROOT, "config", "stream_stt_v19_8_39.json");
    const CONFIG_FILE_38 = path.join(ROOT, "config", "stream_stt_v19_8_38.json");

    function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
    function exists(file) { try { return fs.existsSync(file); } catch { return false; } }
    function readJson(file, fallback) { try { return exists(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback; } catch { return fallback; } }
    function safeExt(mimeType) { const t = String(mimeType || "").toLowerCase(); if (t.includes("ogg")) return ".ogg"; if (t.includes("wav")) return ".wav"; if (t.includes("mp3")) return ".mp3"; return ".webm"; }
    function tempDir() { try { return path.join(app.getPath("temp"), "noelle-stream-stt"); } catch { return path.join(os.tmpdir(), "noelle-stream-stt"); } }

    function bufferFromAudio(audioBuffer) {
      if (Buffer.isBuffer(audioBuffer)) return audioBuffer;
      if (audioBuffer instanceof ArrayBuffer) return Buffer.from(audioBuffer);
      if (ArrayBuffer.isView(audioBuffer)) return Buffer.from(audioBuffer.buffer, audioBuffer.byteOffset, audioBuffer.byteLength);
      if (audioBuffer && audioBuffer.type === "Buffer" && Array.isArray(audioBuffer.data)) return Buffer.from(audioBuffer.data);
      throw new Error("Formato de áudio inválido no IPC.");
    }

    function commandExistsInPath(command) {
      if (!command || command.includes("\\") || command.includes("/")) return exists(command);
      const tool = process.platform === "win32" ? "where" : "which";
      const result = spawnSync(tool, [command], { encoding: "utf8", windowsHide: true });
      return result.status === 0 && String(result.stdout || "").trim().length > 0;
    }

    function normalizeCommandSpec(spec, sourceName) {
      if (!spec || !spec.command) return null;
      const command = String(spec.command || "").trim();
      if (!command) return null;

      const args = Array.isArray(spec.args) ? spec.args : ["{input}"];
      return {
        name: spec.name || sourceName || command,
        command,
        args,
        cwd: spec.cwd || ROOT,
        source: sourceName || "config"
      };
    }

    function candidateCommands() {
      const list = [];

      if (process.env.NOELLE_STT_CMD) {
        list.push({
          name: "env:NOELLE_STT_CMD",
          command: process.env.NOELLE_STT_CMD,
          args: process.env.NOELLE_STT_ARGS ? process.env.NOELLE_STT_ARGS.split(" ") : ["{input}"],
          cwd: ROOT,
          source: "env"
        });
      }

      const cfg39 = readJson(CONFIG_FILE_39, {});
      const cfg38 = readJson(CONFIG_FILE_38, {});
      const from39 = normalizeCommandSpec(cfg39, "config_v19_8_39");
      const from38 = normalizeCommandSpec(cfg38, "config_v19_8_38");

      if (from39) list.push(from39);
      if (from38) list.push(from38);

      const bundled = [
        { name: "whisper.cpp whisper-cli.exe", command: path.join(ROOT, "tools", "whisper", "whisper-cli.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp main.exe", command: path.join(ROOT, "tools", "whisper", "main.exe"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "whisper.cpp whisper-cli", command: path.join(ROOT, "tools", "whisper", "whisper-cli"), args: ["-f", "{input}", "-otxt", "-of", "{outputBase}"] },
        { name: "noelle python wrapper", command: process.platform === "win32" ? "py" : "python3", args: [path.join(ROOT, "tools", "stt", "noelle_stream_stt_python_wrapper_v19_8_39.py"), "{input}", "{output}"] }
      ];

      for (const item of bundled) {
        if (commandExistsInPath(item.command)) list.push({ ...item, source: "auto" });
      }

      const seen = new Set();
      return list.filter((item) => {
        const key = item.command + "::" + JSON.stringify(item.args || []);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
        const child = spawn(spec.command, args, {
          cwd: spec.cwd || ROOT,
          windowsHide: true,
          shell: false
        });

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

        child.on("error", (err) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: false, error: err && err.message ? err.message : String(err), stdout, stderr, command: spec.name || spec.command });
        });

        child.on("close", (code) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          resolve({ ok: code === 0, code, stdout, stderr, command: spec.name || spec.command });
        });
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

    function statusPayload(extra = {}) {
      const commands = candidateCommands();
      return {
        ok: true,
        configured: commands.length > 0,
        configFile: CONFIG_FILE_39,
        legacyConfigFile: CONFIG_FILE_38,
        commands: commands.map((item) => ({
          name: item.name || item.command,
          command: item.command,
          args: item.args,
          source: item.source || "unknown",
          exists: commandExistsInPath(item.command)
        })),
        message: commands.length
          ? "STT configurado."
          : "STT backend não configurado. Rode CONFIGURAR_STT.bat ou edite config/stream_stt_v19_8_39.json.",
        ...extra
      };
    }

    async function transcribeHandler(_event, audioBuffer, meta = {}) {
      try {
        const buffer = bufferFromAudio(audioBuffer);
        if (!buffer.length) return { ok: false, error: "Áudio vazio.", status: statusPayload() };

        const dir = tempDir();
        ensureDir(dir);

        const id = "stream_" + Date.now() + "_" + Math.random().toString(16).slice(2);
        const input = path.join(dir, id + safeExt(meta.mimeType));
        const outputBase = path.join(dir, id + "_out");
        const output = outputBase + ".txt";
        fs.writeFileSync(input, buffer);

        const commands = candidateCommands();

        if (!commands.length) {
          return {
            ok: false,
            error: "STT backend não configurado.",
            help: "Rode CONFIGURAR_STT.bat ou configure config/stream_stt_v19_8_39.json.",
            input,
            savedAudio: input,
            status: statusPayload({ lastAudio: input })
          };
        }

        const paths = { input, output, outputBase, outputDir: dir };
        const errors = [];

        for (const spec of commands) {
          const result = await runCommand(spec, paths, Number(meta.timeoutMs || 120000));

          if (!result.ok) {
            errors.push((result.command || spec.command) + ": " + (result.error || result.stderr || ("exit " + result.code)));
            continue;
          }

          const transcript = readTranscript(paths, result.stdout);
          if (transcript) {
            return {
              ok: true,
              text: transcript,
              transcript,
              backend: result.command || spec.name || spec.command,
              input,
              savedAudio: input,
              mimeType: meta.mimeType || ""
            };
          }

          errors.push((result.command || spec.command) + ": sem texto");
        }

        return {
          ok: false,
          error: "Nenhum backend STT retornou texto.",
          details: errors.slice(-5),
          input,
          savedAudio: input,
          status: statusPayload({ lastAudio: input })
        };
      } catch (err) {
        return { ok: false, error: err && err.message ? err.message : String(err), status: statusPayload() };
      }
    }

    try { ipcMain.handle("noelle:stream-transcribe-audio-v19_8_39", transcribeHandler); } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.39] handler transcribe:", msg);
    }

    try { ipcMain.handle("noelle:stream-stt-status-v19_8_39", async () => statusPayload()); } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      if (!/second handler|already registered|Attempted to register/i.test(msg)) console.warn("[stream-stt-v19.8.39] handler status:", msg);
    }
  } catch (err) {
    console.warn("[stream-stt-v19.8.39] main bridge indisponível:", err && err.message ? err.message : err);
  }
})();
// NOELLE_STREAM_STT_MAIN_V19_8_39_END
