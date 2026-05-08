
from __future__ import annotations
from dataclasses import dataclass, field
import time
from typing import Dict, List

@dataclass
class PerfStats:
    last: Dict[str, float] = field(default_factory=dict)
    counts: Dict[str, int] = field(default_factory=dict)
    latencies: List[float] = field(default_factory=list)
    autospeed_until: float = 0.0

    def mark(self, name: str, value: float) -> None:
        self.last[name] = float(value)

    def inc(self, name: str) -> None:
        self.counts[name] = self.counts.get(name, 0) + 1

    def add_latency(self, seconds: float, threshold: float = 18.0, decay_sec: float = 120.0) -> None:
        self.latencies.append(float(seconds))
        self.latencies = self.latencies[-20:]
        if seconds >= threshold:
            self.autospeed_until = time.monotonic() + decay_sec

    def autospeed_active(self) -> bool:
        return time.monotonic() < self.autospeed_until

    def avg_latency(self) -> float:
        return sum(self.latencies) / len(self.latencies) if self.latencies else 0.0

    def summary(self) -> str:
        parts = [f"autospeed={'ON' if self.autospeed_active() else 'OFF'}", f"lat_media={self.avg_latency():.1f}s"]
        if self.last:
            parts.append(' | '.join(f'{k}={v:.3f}s' for k, v in self.last.items()))
        if self.counts:
            parts.append('contagens=' + ', '.join(f'{k}:{v}' for k,v in sorted(self.counts.items())))
        return ' ; '.join(parts)
