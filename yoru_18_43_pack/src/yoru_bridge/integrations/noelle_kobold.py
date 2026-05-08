from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict


def _cfg(config: Dict[str, Any]) -> Dict[str, Any]:
    return config.get('noelle_kobold_replace', {}) or {}


def noelle_kobold_status(config: Dict[str, Any]) -> str:
    c = _cfg(config)
    models = config.get('models', {}) or {}
    fast = (models.get('fast') or {}).get('label') or (models.get('fast') or {}).get('path') or '-'
    think = (models.get('think') or {}).get('label') or (models.get('think') or {}).get('path') or '-'
    return (
        "NoelleKoboldReplace: ON\n"
        f"Backend: {c.get('backend','koboldcpp_via_yoru')}\n"
        f"Transporte: {c.get('transport','embedded_stdio_jsonl')}\n"
        f"Entrada: {c.get('entrypoint','python -m yoru_bridge embedded')}\n"
        f"Substitui canal: {c.get('chat_channel_to_replace','noelle:chat')}\n"
        f"Ollama no chat: DESATIVADO\n"
        f"FAST: {fast}\n"
        f"THINK: {think}\n"
        "Use no GitHub do Noelle: node yoru_chat/noelle_kobold_replace/apply_noelle_kobold_replace_2026.cjs"
    )


def noelle_kobold_docs(config: Dict[str, Any]) -> str:
    return """NoelleKoboldReplace / KoboldCpp no lugar do Ollama

Objetivo:
- Noelle Companion mantém janela/avatar/renderer.
- O chat antigo/Ollama deixa de ser o cérebro principal.
- Yoru roda embutida por STDIO: python -m yoru_bridge embedded.
- Yoru usa KoboldCpp FAST/THINK para responder.

No GitHub do Noelle:
1. Copie este pack para a pasta yoru_chat/.
2. Rode: node yoru_chat/noelle_kobold_replace/apply_noelle_kobold_replace_2026.cjs
3. Rode diagnóstico: node yoru_chat/noelle_kobold_replace/diagnostico_noelle_kobold_replace_2026.cjs
4. Inicie o app: npm start

Comandos úteis na Yoru:
/noelle status
/kobold status
/baixar status
/modelo status
""".strip()


def handle_noelle_kobold_command(raw: str, config: Dict[str, Any]) -> str:
    n = (raw or '').strip().lower()
    if n in {'/noelle', '/noelle status', '/kobold', '/kobold status', '/noelle kobold'}:
        return noelle_kobold_status(config)
    if n in {'/noelle docs', '/kobold docs', '/noelle ajuda', '/kobold ajuda'}:
        return noelle_kobold_docs(config)
    if n in {'/noelle config', '/kobold config'}:
        return json.dumps(_cfg(config), ensure_ascii=False, indent=2)
    return 'Use /noelle status, /noelle docs, /kobold status ou /kobold config.'
