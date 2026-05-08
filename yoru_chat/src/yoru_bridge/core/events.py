from __future__ import annotations

import json
import threading
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List

from ..config import PACK_ROOT


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


class EventBus:
    """Barramento simples de eventos locais da Yoru.

    A interface/widget/Godot pode consumir o arquivo JSONL configurado em
    avatar_bridge.event_log_path. Não abre portas, não cria servidor e não
    depende de TTS. É uma ponte segura por arquivo local.
    """

    def __init__(self, config: Dict[str, Any] | None = None):
        self.config = config or {}
        self.cfg = self.config.get('avatar_bridge', {}) or {}
        self.enabled = bool(self.cfg.get('enabled', True))
        self._lock = threading.Lock()
        self._seq = 0
        self.log_path = self._resolve_path(str(self.cfg.get('event_log_path', 'data/avatar_events.jsonl')))
        self.max_lines = int(self.cfg.get('max_event_log_lines', 800) or 800)
        self._seq = self._initial_sequence()


    def _initial_sequence(self) -> int:
        """Continua a sequência quando o app reinicia, útil para UI externa."""
        if not self.log_path.exists():
            return 0
        last = 0
        try:
            with self.log_path.open('r', encoding='utf-8') as f:
                for line in deque(f, maxlen=50):
                    try:
                        data = json.loads(line)
                        seq = int(data.get('seq') or 0)
                        if seq > last:
                            last = seq
                    except Exception:
                        pass
        except Exception:
            return 0
        return last

    def _resolve_path(self, value: str) -> Path:
        p = Path(value).expanduser()
        if not p.is_absolute():
            p = PACK_ROOT / p
        return p

    def emit(self, event_type: str, payload: Dict[str, Any] | None = None, **extra: Any) -> Dict[str, Any]:
        payload = payload or {}
        event = {
            'seq': None,
            'ts': _utc_now(),
            'type': str(event_type),
            'payload': payload,
        }
        if extra:
            event['meta'] = extra
        if not self.enabled:
            return event
        with self._lock:
            self._seq += 1
            event['seq'] = self._seq
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            with self.log_path.open('a', encoding='utf-8') as f:
                f.write(json.dumps(event, ensure_ascii=False, separators=(',', ':')) + '\n')
            self._trim_if_needed()
        return event

    def _trim_if_needed(self) -> None:
        if self.max_lines <= 0:
            return
        try:
            # Só corta quando passar bastante do limite para não regravar a cada evento.
            with self.log_path.open('r', encoding='utf-8') as f:
                lines = f.readlines()
            if len(lines) <= self.max_lines + 100:
                return
            keep = lines[-self.max_lines:]
            self.log_path.write_text(''.join(keep), encoding='utf-8')
        except Exception:
            pass

    def tail(self, limit: int = 10) -> List[Dict[str, Any]]:
        limit = max(1, min(int(limit or 10), 100))
        if not self.log_path.exists():
            return []
        out: List[Dict[str, Any]] = []
        with self.log_path.open('r', encoding='utf-8') as f:
            for line in deque(f, maxlen=limit):
                line = line.strip()
                if not line:
                    continue
                try:
                    out.append(json.loads(line))
                except Exception:
                    out.append({'type': 'invalid_jsonl', 'payload': {'raw': line[:300]}})
        return out

    def count(self) -> int:
        if not self.log_path.exists():
            return 0
        try:
            with self.log_path.open('r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except Exception:
            return 0

    def clear(self, confirm: bool = False) -> str:
        if not confirm:
            return 'Para limpar eventos, use /avatar limpar eventos --confirmar.'
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        self.log_path.write_text('', encoding='utf-8')
        return f'Eventos do Avatar Bridge limpos: {self.log_path}'

    def status(self) -> str:
        exists = self.log_path.exists()
        size = self.log_path.stat().st_size if exists else 0
        return (
            f'EventBus: {"ON" if self.enabled else "OFF"} | '
            f'arquivo={self.log_path} | eventos={self.count()} | bytes={size}'
        )
