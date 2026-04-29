#!/usr/bin/env python3
"""CLI simples para memória/logs da Yoru."""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEM = ROOT / "yoru_memory"

def now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")

def append_md(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="\n") as f:
        f.write(f"\n- {now()} — {text}\n")

def event(kind: str, text: str) -> None:
    p = MEM / "metrics" / "events.jsonl"
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8", newline="\n") as f:
        f.write(json.dumps({"ts": now(), "kind": kind, "text": text}, ensure_ascii=False) + "\n")

def log(text: str) -> None:
    day = dt.datetime.now().strftime("%Y-%m-%d")
    p = MEM / "logs" / f"{day}.md"
    append_md(p, text)
    event("log", text)
    print(f"[OK] log registrado: yoru_memory/logs/{day}.md")

def remember_short(text: str) -> None:
    append_md(MEM / "memory_short.md", text)
    event("memory_short", text)
    print("[OK] memoria curta atualizada")

def remember_long(text: str) -> None:
    append_md(MEM / "memory_long.md", text)
    event("memory_long", text)
    print("[OK] memoria longa atualizada")

def set_state(text: str) -> None:
    append_md(MEM / "state.md", text)
    event("state", text)
    print("[OK] state.md atualizado")

def search(term: str) -> int:
    term_low = term.lower()
    found = 0
    for path in sorted(MEM.rglob("*.md")):
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        for n, line in enumerate(content.splitlines(), start=1):
            if term_low in line.lower():
                rel = path.relative_to(ROOT)
                print(f"{rel}:{n}: {line[:240]}")
                found += 1
                if found >= 50:
                    return 0
    if not found:
        print("[INFO] nada encontrado")
    return 0

def main(argv=None) -> int:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ["remember-short", "remember-long", "log", "state", "search"]:
        p = sub.add_parser(name)
        p.add_argument("text", nargs="+", help="texto")
    args = parser.parse_args(argv)
    text = " ".join(args.text).strip()
    if not text:
        print("[ERRO] texto vazio")
        return 1
    if args.cmd == "remember-short":
        remember_short(text)
    elif args.cmd == "remember-long":
        remember_long(text)
    elif args.cmd == "log":
        log(text)
    elif args.cmd == "state":
        set_state(text)
    elif args.cmd == "search":
        return search(text)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
