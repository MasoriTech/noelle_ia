# -*- coding: utf-8 -*-
"""TTS essencial da Noelle.

Prioridade:
1. Se houver uma voz Piper .onnx em tools/noelle_tts/voices, usa Piper.
2. No Windows, se não houver voz Piper, usa SAPI como fallback local.

Isso evita que o app fique mudo enquanto você escolhe/baixa uma voz Piper específica.
"""
from __future__ import annotations

import argparse
import os
import platform
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VOICES_DIR = Path(__file__).resolve().parent / "voices"


def find_voice() -> Path | None:
    if not VOICES_DIR.exists():
        return None
    voices = sorted(VOICES_DIR.glob("*.onnx"))
    return voices[0] if voices else None


def speak_windows_sapi(text: str) -> int:
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$s.Rate = 0; $s.Volume = 100; "
        f"$s.Speak({text!r});"
    )
    completed = subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return int(completed.returncode)


def speak_piper(text: str, voice: Path) -> int:
    wav_out = Path(os.environ.get("TEMP", str(ROOT))) / "noelle_tts_out.wav"
    cmd = [sys.executable, "-m", "piper", "--model", str(voice), "--output_file", str(wav_out)]
    completed = subprocess.run(
        cmd,
        input=text.encode("utf-8"),
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    if completed.returncode != 0 or not wav_out.exists():
        return int(completed.returncode or 1)
    if platform.system().lower() == "windows":
        subprocess.Popen(
            ["powershell.exe", "-NoProfile", "-Command", f"(New-Object Media.SoundPlayer {str(wav_out)!r}).PlaySync();"],
            cwd=str(ROOT),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ).wait(timeout=30)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    args = parser.parse_args()
    text = " ".join(str(args.text).split())[:1000]
    if not text:
        print("texto vazio")
        return 1
    voice = find_voice()
    if voice:
        code = speak_piper(text, voice)
        if code == 0:
            print(f"piper ok: {voice.name}")
            return 0
    if platform.system().lower() == "windows":
        code = speak_windows_sapi(text)
        if code == 0:
            print("windows sapi ok")
            return 0
    print("TTS indisponível. Coloque uma voz .onnx em tools/noelle_tts/voices ou use Windows SAPI.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
