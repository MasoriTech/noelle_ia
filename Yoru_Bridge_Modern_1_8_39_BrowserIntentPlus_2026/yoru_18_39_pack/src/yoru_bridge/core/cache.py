from __future__ import annotations
import time
from dataclasses import dataclass
from typing import Dict, Tuple
from ..utils.text import normalize

@dataclass
class ResponseCache:
    enabled: bool = True
    ttl_sec: int = 300
    max_items: int = 80

    def __post_init__(self):
        self._data: Dict[str, Tuple[float, str, str]] = {}

    def _key(self, text: str, model: str, profile: str) -> str:
        return f"{model}:{profile}:{normalize(text)[:240]}"

    def get(self, text: str, model: str, profile: str) -> str | None:
        if not self.enabled:
            return None
        k = self._key(text, model, profile)
        row = self._data.get(k)
        if not row:
            return None
        ts, ans, _ = row
        if time.monotonic() - ts > self.ttl_sec:
            self._data.pop(k, None)
            return None
        return ans

    def set(self, text: str, model: str, profile: str, answer: str) -> None:
        if not self.enabled or not answer:
            return
        if len(self._data) >= self.max_items:
            oldest = min(self._data.items(), key=lambda kv: kv[1][0])[0]
            self._data.pop(oldest, None)
        self._data[self._key(text, model, profile)] = (time.monotonic(), answer, profile)

    def clear(self) -> int:
        n = len(self._data)
        self._data.clear()
        return n

    def status(self) -> str:
        return f"cache={'ON' if self.enabled else 'OFF'} itens={len(self._data)} ttl={self.ttl_sec}s"
