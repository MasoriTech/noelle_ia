# -*- coding: utf-8 -*-
"""
Noelle TTS helper 2026.
Usa Piper quando houver voz .onnx configurada; caso contrário usa o TTS nativo do Windows como fallback.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_voice_model() -> Path | None:
    env_voice = os.environ.get("NOELLE_PIPER_VOICE", "").strip()
    if env_voice:
        p = Path(env_voice)
        if p.exists():
            return p

    voices_dir = _repo_root() / "tools" / "noelle_tts" / "voices"
    if voices_dir.exists():
        voices = sorted(voices_dir.glob("*.onnx"))
        if voices:
            return voices[0]
    return None


def _powershell_speak(text: str, output: Path | None = None) -> int:
    # Usa System.Speech do Windows. Não precisa instalar nada e evita a Noelle ficar muda.
    escaped = text.replace("'", "''")
    ps = [
        "Add-Type -AssemblyName System.Speech;",
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer;",
        "$s.Rate = 0;",
        "$s.Volume = 100;",
    ]
    if output:
        output.parent.mkdir(parents=True, exist_ok=True)
        out = str(output).replace("'", "''")
        ps.append(f"$s.SetOutputToWaveFile('{out}');")
    ps.append(f"$s.Speak('{escaped}');")
    ps.append("$s.Dispose();")
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", " ".join(ps)]
    return subprocess.call(cmd)


def _piper_speak(text: str, voice_model: Path, output: Path | None = None) -> int:
    piper_cmd = shutil.which("piper") or shutil.which("piper.exe")
    if not piper_cmd:
        return 2

    if output is None:
        output = _repo_root() / "logs" / "tts_last.wav"
    output.parent.mkdir(parents=True, exist_ok=True)

    cmd = [piper_cmd, "--model", str(voice_model), "--output_file", str(output)]
    proc = subprocess.run(cmd, input=text, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr or "Piper falhou sem detalhe.\n")
        return proc.returncode

    # Toca o wav gerado quando nenhum arquivo de saída foi solicitado explicitamente.
    if os.name == "nt" and output.name == "tts_last.wav":
        ps = f"(New-Object Media.SoundPlayer '{str(output).replace("'", "''")}').PlaySync();"
        subprocess.call(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps])
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Noelle TTS helper")
    parser.add_argument("text", nargs="*", help="Texto para falar")
    parser.add_argument("--out", dest="out", default="", help="Arquivo wav de saída opcional")
    parser.add_argument("--status", action="store_true", help="Mostra status do TTS")
    args = parser.parse_args()

    voice = _default_voice_model()
    piper_cmd = shutil.which("piper") or shutil.which("piper.exe")

    if args.status:
        print("NOELLE_TTS_STATUS")
        print(f"python={sys.version.split()[0]}")
        print(f"piper_cmd={piper_cmd or 'nao encontrado'}")
        print(f"voice_model={str(voice) if voice else 'nao configurado'}")
        print("fallback_windows_sapi=disponivel" if os.name == "nt" else "fallback_windows_sapi=indisponivel")
        return 0

    text = " ".join(args.text).strip()
    if not text:
        text = "Olá, eu sou a Noelle. O sistema de voz está pronto."

    out = Path(args.out).resolve() if args.out else None

    if voice and piper_cmd:
        code = _piper_speak(text, voice, out)
        if code == 0:
            return 0
        print("Piper falhou. Tentando fallback nativo do Windows...", file=sys.stderr)

    if os.name == "nt":
        return _powershell_speak(text, out)

    print("Sem voz Piper configurada e sem fallback disponível neste sistema.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
