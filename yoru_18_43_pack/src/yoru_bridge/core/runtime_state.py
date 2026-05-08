from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

from ..config import PACK_ROOT
from .events import EventBus


ALLOWED_STATES = {'idle', 'listening', 'thinking', 'responding', 'speaking', 'error'}


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


class RuntimeState:
    """Estado central da Yoru para UI externa consumir.

    Registra estados que o app informa, inclusive speaking do TTSControl, como
    idle/thinking/listening/error, em JSON local e no EventBus.
    """

    def __init__(self, config: Dict[str, Any] | None, events: EventBus | None = None):
        self.config = config or {}
        self.cfg = self.config.get('runtime_state', {}) or {}
        self.events = events
        self.path = self._resolve_path(str(self.cfg.get('state_file', 'data/runtime_state.json')))
        self.current = 'idle'
        self.since = _utc_now()
        self.meta: Dict[str, Any] = {}
        self._load_or_init()

    def _resolve_path(self, value: str) -> Path:
        p = Path(value).expanduser()
        if not p.is_absolute():
            p = PACK_ROOT / p
        return p

    def _load_or_init(self) -> None:
        if not self.path.exists():
            self.save()
            return
        try:
            data = json.loads(self.path.read_text(encoding='utf-8'))
            state = str(data.get('state') or 'idle')
            if state in ALLOWED_STATES:
                self.current = state
            self.since = str(data.get('since') or self.since)
            self.meta = dict(data.get('meta') or {})
        except Exception:
            self.current = 'idle'
            self.since = _utc_now()
            self.meta = {}
            self.save()

    def as_dict(self) -> Dict[str, Any]:
        return {
            'state': self.current,
            'since': self.since,
            'meta': self.meta,
            'allowed': sorted(ALLOWED_STATES),
        }

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.as_dict(), ensure_ascii=False, indent=2), encoding='utf-8')

    def set_state(self, state: str, **meta: Any) -> str:
        state = str(state or '').lower().strip()
        if state not in ALLOWED_STATES:
            return f'Estado inválido: {state}. Use: {", ".join(sorted(ALLOWED_STATES))}.'
        changed = state != self.current
        self.current = state
        self.since = _utc_now()
        self.meta = {k: v for k, v in meta.items() if v is not None}
        self.save()
        if self.events:
            self.events.emit('state', {'value': self.current, 'since': self.since, 'changed': changed, 'meta': self.meta})
        return f'Estado da Yoru: {self.current}'

    def status(self) -> str:
        return f'RuntimeState: {self.current} desde {self.since} | arquivo={self.path}'
