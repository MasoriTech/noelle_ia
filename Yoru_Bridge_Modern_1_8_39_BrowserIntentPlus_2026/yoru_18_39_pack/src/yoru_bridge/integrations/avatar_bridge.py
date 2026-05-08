from __future__ import annotations

import json
from typing import Any, Dict

from ..core.events import EventBus
from ..core.runtime_state import RuntimeState, ALLOWED_STATES
from ..utils.text import normalize


class AvatarBridge:
    """Ponte local por eventos para uma janela/avatar externo.

    Esta versão não cria UI nem abre servidor. Ela grava
    eventos JSONL e estado JSON para a janela/Godot lerem.
    """

    PREFIXES = ('/avatar', '/bridge', '/godot')

    def __init__(self, config: Dict[str, Any] | None, events: EventBus, runtime: RuntimeState):
        self.config = config or {}
        self.cfg = self.config.get('avatar_bridge', {}) or {}
        self.events = events
        self.runtime = runtime
        self.enabled = bool(self.cfg.get('enabled', True))

    def looks_like_command(self, raw: str) -> bool:
        n = normalize(raw)
        return any(n == p or n.startswith(p + ' ') for p in self.PREFIXES)

    def status(self) -> str:
        mode = self.cfg.get('mode', 'file_events')
        lines = [
            f'AvatarBridge: {"ON" if self.enabled else "OFF"} | modo={mode}',
            self.runtime.status(),
            self.events.status(),
            'Comandos: /avatar status, /avatar teste, /avatar eventos, /avatar emote happy, /avatar state thinking, /avatar dizer texto.',
            'Observação: esta camada não cria janela; a UI externa lê eventos locais. O TTSControl também emite audio_ready/tts_start/tts_end.',
        ]
        return '\n'.join(lines)

    def emit_say(self, text: str, local: bool = False, model_key: str | None = None) -> None:
        if not self.enabled or not text:
            return
        max_chars = int(self.cfg.get('max_text_event_chars', 1200) or 1200)
        out = str(text)
        if len(out) > max_chars:
            out = out[:max_chars].rstrip() + '...'
        self.events.emit('say', {'text': out, 'local': bool(local), 'model': model_key or None})

    def emit_emote(self, name: str, source: str = 'command') -> str:
        name = (name or '').strip().lower()
        if not name:
            return 'Use: /avatar emote happy'
        self.events.emit('emote', {'name': name, 'source': source})
        return f'Emote enviado para AvatarBridge: {name}'

    def _format_events(self, limit: int = 8) -> str:
        items = self.events.tail(limit)
        if not items:
            return 'Nenhum evento registrado ainda.'
        lines = [f'Últimos {len(items)} evento(s):']
        for e in items:
            payload = e.get('payload') or {}
            compact = json.dumps(payload, ensure_ascii=False)
            if len(compact) > 180:
                compact = compact[:180] + '...'
            lines.append(f"- #{e.get('seq')} {e.get('ts')} | {e.get('type')} | {compact}")
        return '\n'.join(lines)

    def handle(self, raw: str) -> str:
        n = normalize(raw)
        parts = raw.strip().split()
        if n in {'/avatar', '/avatar status', '/bridge', '/bridge status', '/godot', '/godot status'}:
            return self.status()
        if n in {'/avatar ping', '/bridge ping', '/godot ping'}:
            self.events.emit('ping', {'ok': True, 'source': 'avatar_command'})
            return 'AvatarBridge ping OK. Evento gravado.'
        if n.startswith('/avatar eventos') or n.startswith('/bridge eventos') or n.startswith('/godot eventos'):
            try:
                limit = int(parts[-1]) if parts and parts[-1].isdigit() else 8
            except Exception:
                limit = 8
            return self._format_events(limit)
        if n.startswith('/avatar limpar eventos') or n.startswith('/bridge limpar eventos') or n.startswith('/godot limpar eventos'):
            return self.events.clear(confirm='--confirmar' in n)
        if n.startswith('/avatar teste') or n.startswith('/bridge teste') or n.startswith('/godot teste'):
            self.runtime.set_state('thinking', source='avatar_test')
            self.events.emit('emote', {'name': 'thinking', 'source': 'avatar_test'})
            self.events.emit('say', {'text': 'Teste do AvatarBridge funcionando. A janela pode ler este evento.', 'local': True, 'model': None})
            self.runtime.set_state('idle', source='avatar_test')
            return 'Teste enviado: state thinking/idle, emote thinking e say.'
        if n.startswith('/avatar emote ') or n.startswith('/bridge emote ') or n.startswith('/godot emote '):
            name = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else ''
            return self.emit_emote(name)
        if n.startswith('/avatar state ') or n.startswith('/bridge state ') or n.startswith('/godot state '):
            state = raw.split(' ', 2)[2].strip().lower() if len(raw.split(' ', 2)) >= 3 else ''
            if state not in ALLOWED_STATES:
                return 'Estado inválido. Use: ' + ', '.join(sorted(ALLOWED_STATES))
            return self.runtime.set_state(state, source='avatar_command')
        if n.startswith('/avatar dizer ') or n.startswith('/bridge dizer ') or n.startswith('/godot dizer '):
            text = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else ''
            if not text:
                return 'Use: /avatar dizer texto'
            self.emit_say(text, local=True, model_key=None)
            return 'Texto enviado para AvatarBridge.'
        return 'Comando AvatarBridge não reconhecido. Use /avatar status.'
