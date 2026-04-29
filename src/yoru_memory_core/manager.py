from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

class YoruMemoryCore:
    """Gerenciador simples e sem dependências para a memória da Yoru."""
    def __init__(self, root: str | Path | None = None) -> None:
        self.root = Path(root or Path.cwd()).resolve()
        self.memory_dir = self.root / "yoru_memory"

    def _now(self) -> str:
        return dt.datetime.now().isoformat(timespec="seconds")

    def _append_md(self, relative_path: str, text: str) -> None:
        path = self.memory_dir / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(f"\n- {self._now()} — {text}\n")

    def _event(self, kind: str, text: str) -> None:
        path = self.memory_dir / "metrics" / "events.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"ts": self._now(), "kind": kind, "text": text}
        with path.open("a", encoding="utf-8", newline="\n") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def remember_short(self, text: str) -> None:
        self._append_md("memory_short.md", text)
        self._event("memory_short", text)

    def remember_long(self, text: str) -> None:
        self._append_md("memory_long.md", text)
        self._event("memory_long", text)

    def log(self, text: str) -> None:
        day = dt.datetime.now().strftime("%Y-%m-%d")
        self._append_md(f"logs/{day}.md", text)
        self._event("log", text)

    def state(self, text: str) -> None:
        self._append_md("state.md", text)
        self._event("state", text)

    def read_context(self) -> str:
        names = ["soul.md", "system.md", "constraints.md", "user.md", "state.md", "memory_short.md", "memory_long.md", "memory_rules.md", "goals.md", "tools.md"]
        parts: list[str] = []
        for name in names:
            path = self.memory_dir / name
            if path.exists():
                parts.append(f"\n--- {name} ---\n" + path.read_text(encoding="utf-8", errors="replace"))
        return "\n".join(parts).strip()

    def search(self, term: str, limit: int = 25) -> list[tuple[str, int, str]]:
        term_low = term.lower()
        results: list[tuple[str, int, str]] = []
        for path in sorted(self.memory_dir.rglob("*.md")):
            content = path.read_text(encoding="utf-8", errors="replace")
            for n, line in enumerate(content.splitlines(), start=1):
                if term_low in line.lower():
                    results.append((str(path.relative_to(self.root)), n, line))
                    if len(results) >= limit:
                        return results
        return results
