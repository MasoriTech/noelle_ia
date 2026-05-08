from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

from ..config import PACK_ROOT, CONFIG_PATH
from .downloader import DownloadManager


def _ok(flag: bool) -> str:
    return 'OK' if flag else 'ATENÇÃO'


def _has_module(name: str) -> bool:
    try:
        return importlib.util.find_spec(name) is not None
    except Exception:
        return False


def run_pack_healthcheck(config: Dict[str, Any] | None = None) -> str:
    """Auditoria local leve do pack. Não abre internet e não altera arquivos."""
    cfg = config or {}
    lines: List[str] = []
    lines.append('=== Yoru Mega Pack Check 1.8.43 / NoelleKoboldReplace ===')
    lines.append(f'Pack root: {PACK_ROOT}')
    lines.append(f'Config: {CONFIG_PATH} | {_ok(CONFIG_PATH.exists())}')
    lines.append(f'Versão config: {cfg.get("version", "?")}')
    try:
        import yoru_bridge
        lines.append(f'Versão pacote: {getattr(yoru_bridge, "__version__", "?")}')
    except Exception as e:
        lines.append(f'Versão pacote: erro ao importar ({e})')

    data_dir = PACK_ROOT / 'data'
    lines.append(f'Data dir: {data_dir} | {_ok(data_dir.exists())}')
    for rel in ['data/tts', 'data/screenshots']:
        p = PACK_ROOT / rel
        lines.append(f'- {rel}: {_ok(p.exists())}')
    prefs = PACK_ROOT / 'data/apps_prefs.json'
    lines.append(f"- data/apps_prefs.json: {'criado' if prefs.exists() else 'opcional/não criado'}")

    deps = [
        ('edge_tts', 'TTS Edge'),
        ('pygame', 'player interno'),
        ('PIL', 'prints/OCR'),
        ('pytesseract', 'OCR'),
        ('psutil', 'diagnóstico RAM/processos'),
        ('sounddevice', 'STT/stream'),
        ('faster_whisper', 'STT'),
        ('keyboard', 'ctrlvoz'),
    ]
    lines.append('Dependências Python:')
    for mod, label in deps:
        lines.append(f'- {label} ({mod}): {_ok(_has_module(mod))}')

    models = cfg.get('models', {}) or {}
    paths = cfg.get('model_paths', {}) or {}
    lines.append('Modelos/config:')
    for key in ['fast', 'think']:
        mcfg = models.get(key, {}) or {}
        api = mcfg.get('api_url', '-')
        path = paths.get(f'{key}_model_path', '')
        exists = Path(os.path.expandvars(str(path))).exists() if path else False
        lines.append(f'- {key}: {mcfg.get("label", "-")} | {api} | arquivo={_ok(exists)}')

    tts = cfg.get('tts', {}) or {}
    lines.append('TTS:')
    lines.append(f'- enabled={tts.get("enabled")} engine={tts.get("engine")} voice={tts.get("edge_voice")} player={tts.get("player")} avatar_events={tts.get("emit_avatar_events")}')
    lines.append('DownloadCenter:')
    try:
        dm = DownloadManager(cfg)
        for st in dm.model_items():
            lines.append('- ' + st.line())
        lines.append('- ' + dm.kobold_status().line())
    except Exception as e:
        lines.append(f'- erro no DownloadCenter: {e}')
    nk = cfg.get('noelle_kobold_replace', {}) or {}
    lines.append(f"NoelleKoboldReplace: enabled={nk.get('enabled', True)} backend={nk.get('backend','koboldcpp_via_yoru')} transport={nk.get('transport','embedded_stdio_jsonl')} entrypoint=python -m yoru_bridge embedded | Ollama chat=OFF")
    lines.append('ContractsCore: /contratos status, /contratos testar texto, /contratos modo rigido. SkillHub continua com /skills status, /skills comandos e /skills buscar termo.')
    lines.append('Comandos úteis: python -m yoru_bridge embedded, /baixar status, /baixar tudo, /contratos exemplos, /scope status, /tts status, /avatar eventos, /pc status, /modelo api.')
    return '\n'.join(lines)
