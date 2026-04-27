#!/usr/bin/env python3
import sys
text = " ".join(sys.argv[1:]).strip()
if not text:
    print("Sem texto para TTS.")
    raise SystemExit(0)
print("[Noelle TTS] Piper preparado. Configure uma voz .onnx em tools/noelle_tts/models para voz neural.")
print(text[:300])
