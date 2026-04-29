#!/usr/bin/env python3
"""Diagnóstico do Yoru Memory Core 2026."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEM = ROOT / "yoru_memory"
REQUIRED_FILES = ["soul.md", "system.md", "constraints.md", "user.md", "state.md", "memory_short.md", "memory_long.md", "memory_rules.md", "reflection.md", "goals.md", "tools.md"]
REQUIRED_DIRS = ["evaluation", "tasks", "connectors", "skills", "knowledge", "logs", "rag", "metrics"]

def main() -> int:
    ok = True
    print("================================================")
    print(" Yoru Memory Core 2026 - diagnostico")
    print("================================================")
    if not MEM.exists():
        print("[ERRO] Pasta yoru_memory nao existe.")
        return 1
    for name in REQUIRED_FILES:
        path = MEM / name
        if path.exists():
            print(f"[OK] arquivo: yoru_memory/{name}")
        else:
            print(f"[ERRO] ausente: yoru_memory/{name}")
            ok = False
    for name in REQUIRED_DIRS:
        path = MEM / name
        if path.is_dir():
            print(f"[OK] pasta: yoru_memory/{name}")
        else:
            print(f"[ERRO] pasta ausente: yoru_memory/{name}")
            ok = False
    events = MEM / "metrics" / "events.jsonl"
    if events.exists():
        bad_lines = 0
        for i, line in enumerate(events.read_text(encoding="utf-8", errors="replace").splitlines(), start=1):
            if not line.strip():
                continue
            try:
                json.loads(line)
            except Exception:
                bad_lines += 1
                print(f"[AVISO] JSONL invalido em metrics/events.jsonl linha {i}")
        if bad_lines == 0:
            print("[OK] metrics/events.jsonl valido")
        else:
            ok = False
    print("================================================")
    if ok:
        print("[OK] Memoria da Yoru pronta.")
        return 0
    print("[ERRO] Corrija os itens acima ou rode setup com --apply.")
    return 1

if __name__ == "__main__":
    raise SystemExit(main())
