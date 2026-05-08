from __future__ import annotations
from pathlib import Path
import subprocess, sys, os
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from yoru_bridge.config import load_config, PACK_ROOT
from yoru_bridge.voice.stt import STTEngine

cfg = load_config()
print('=== Diagnóstico de Voz ===')
print('Python:', sys.executable)
print('TTS config:', cfg.get('tts'))
print('\n[Edge TTS]')
try:
    import edge_tts  # noqa
    print('[OK] edge_tts importado')
except Exception as e:
    print('[ERRO] edge_tts:', e)
print('\n[STT]')
print(STTEngine(cfg).diagnose())
print('\n[Windows SAPI fallback]')
try:
    subprocess.run(['powershell','-NoProfile','-Command','Add-Type -AssemblyName System.Speech; "OK"'], check=True)
    print('[OK] System.Speech disponível')
except Exception as e:
    print('[AVISO] System.Speech:', e)
print('\nCache TTS:', PACK_ROOT / 'data' / 'tts')
