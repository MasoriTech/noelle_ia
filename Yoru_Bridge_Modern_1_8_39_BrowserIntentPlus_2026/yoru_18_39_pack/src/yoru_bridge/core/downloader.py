
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from ..config import PACK_ROOT, save_config


DEFAULT_DOWNLOADS = {
    "models_dir": r"C:\IA_MODELOS",
    "kobold_dir": r"C:\KoboldCpp",
    "deps_requirements": [
        "requirements_mega.txt",
    ],
    "models": {
        "fast": {
            "label": "FAST - Qwen3.5 0.8B Q4_K_M",
            "url": "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf?download=true",
            "target": r"C:\IA_MODELOS\Qwen3.5-0.8B-Q4_K_M.gguf",
            "min_bytes": 300_000_000,
        },
        "think": {
            "label": "THINK - Qwen3.5 2B Q4_K_M",
            "url": "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf?download=true",
            "target": r"C:\IA_MODELOS\Qwen3.5-2B-Q4_K_M.gguf",
            "min_bytes": 700_000_000,
        },
    },
    "koboldcpp": {
        "enabled": True,
        "target": r"C:\KoboldCpp\koboldcpp_oldpc.exe",
        "github_api": "https://api.github.com/repos/LostRuins/koboldcpp/releases/latest",
        "preferred_asset_keywords": ["oldcpu", "oldpc", "nocuda", "koboldcpp.exe"],
        "min_bytes": 20_000_000,
    },
}


@dataclass
class ItemStatus:
    key: str
    label: str
    path: Path
    exists: bool
    size: int
    min_bytes: int
    ok: bool

    def line(self) -> str:
        if self.ok:
            return f"[OK] {self.label}: já baixado ({_fmt_bytes(self.size)}) -> {self.path}"
        if self.exists:
            return f"[PARCIAL] {self.label}: arquivo existe mas parece incompleto ({_fmt_bytes(self.size)}) -> {self.path}"
        return f"[FALTA] {self.label}: não encontrado -> {self.path}"


def _fmt_bytes(n: int) -> str:
    n = int(n or 0)
    units = ["B", "KB", "MB", "GB", "TB"]
    v = float(n)
    for u in units:
        if v < 1024 or u == units[-1]:
            return f"{v:.1f} {u}" if u != "B" else f"{int(v)} B"
        v /= 1024
    return f"{n} B"


def _as_path(p: str | Path) -> Path:
    text = str(p).strip().strip('"')
    # Windows paths are intentionally kept as-is on Windows. On Linux/testing they
    # become harmless relative-looking paths and are not used unless download runs.
    return Path(os.path.expandvars(text)).expanduser()


def _merge_downloads(cfg: dict) -> dict:
    merged = json.loads(json.dumps(DEFAULT_DOWNLOADS))
    incoming = cfg.get("downloads", {}) if isinstance(cfg.get("downloads", {}), dict) else {}
    def deep(a, b):
        for k, v in b.items():
            if isinstance(v, dict) and isinstance(a.get(k), dict):
                deep(a[k], v)
            else:
                a[k] = v
        return a
    return deep(merged, incoming)


class DownloadManager:
    def __init__(self, config: dict):
        self.config = config
        self.cfg = _merge_downloads(config)

    def model_items(self) -> List[ItemStatus]:
        out: List[ItemStatus] = []
        for key, item in self.cfg.get("models", {}).items():
            target = _as_path(item.get("target") or self.config.get("model_paths", {}).get(f"{key}_model_path", ""))
            size = target.stat().st_size if target.exists() else 0
            min_bytes = int(item.get("min_bytes", 1))
            out.append(ItemStatus(key, item.get("label", key), target, target.exists(), size, min_bytes, target.exists() and size >= min_bytes))
        return out

    def kobold_status(self) -> ItemStatus:
        kcfg = self.cfg.get("koboldcpp", {})
        target = _as_path(kcfg.get("target") or self.config.get("koboldcpp_exe", r"C:\KoboldCpp\koboldcpp.exe"))
        size = target.stat().st_size if target.exists() else 0
        min_bytes = int(kcfg.get("min_bytes", 1))
        return ItemStatus("koboldcpp", "KoboldCpp", target, target.exists(), size, min_bytes, target.exists() and size >= min_bytes)

    def dependency_status(self) -> str:
        checks = {
            "edge_tts": "edge-tts",
            "pygame": "pygame",
            "faster_whisper": "faster-whisper",
            "sounddevice": "sounddevice",
            "PIL": "Pillow",
            "psutil": "psutil",
            "pytesseract": "pytesseract",
        }
        lines = ["Dependências Python:"]
        for mod, pkg in checks.items():
            try:
                __import__(mod)
                lines.append(f"[OK] {pkg}")
            except Exception:
                lines.append(f"[FALTA] {pkg}")
        return "\n".join(lines)

    def status_text(self) -> str:
        lines = ["=== Download Center / Baixar Tudo ===", "Modelos:"]
        for st in self.model_items():
            lines.append(st.line())
        lines.append("\nKoboldCpp:")
        lines.append(self.kobold_status().line())
        lines.append("")
        lines.append(self.dependency_status())
        lines.append("\nComandos: /baixar tudo | /baixar modelos | /baixar deps | /baixar kobold | /baixar status")
        return "\n".join(lines)

    def install_deps(self) -> str:
        reqs = self.cfg.get("deps_requirements") or ["requirements_mega.txt"]
        lines = ["[DEPS] Instalando/atualizando dependências Python..."]
        for req in reqs:
            path = PACK_ROOT / "requirements" / req
            if not path.exists():
                lines.append(f"[FALTA] requirements/{req}")
                continue
            lines.append(f"[RUN] python -m pip install -r {path}")
            try:
                subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(path)], cwd=str(PACK_ROOT), check=False)
                lines.append(f"[OK] requirements/{req} processado.")
            except KeyboardInterrupt:
                lines.append("[CANCELADO] Instalação interrompida pelo usuário.")
                break
            except Exception as e:
                lines.append(f"[ERRO] requirements/{req}: {e}")
        return "\n".join(lines)

    def download_models(self) -> str:
        lines = ["[MODELOS] Verificando/baixando modelos FAST e THINK..."]
        for key, item in self.cfg.get("models", {}).items():
            target = _as_path(item.get("target"))
            url = item.get("url", "")
            min_bytes = int(item.get("min_bytes", 1))
            label = item.get("label", key)
            lines.append(self._download_item(label, url, target, min_bytes))
        self._sync_config_paths()
        return "\n".join(lines)

    def download_koboldcpp(self) -> str:
        kcfg = self.cfg.get("koboldcpp", {})
        if not kcfg.get("enabled", True):
            return "[KOBOLD] Download do KoboldCpp está desligado no config."
        target = _as_path(kcfg.get("target") or self.config.get("koboldcpp_exe", r"C:\KoboldCpp\koboldcpp.exe"))
        min_bytes = int(kcfg.get("min_bytes", 1))
        status = self.kobold_status()
        if status.ok:
            return status.line()
        try:
            url = self._latest_kobold_asset_url()
        except Exception as e:
            return "[KOBOLD][ERRO] Não consegui descobrir o release mais recente do KoboldCpp. Abra manualmente: https://github.com/LostRuins/koboldcpp/releases\nDetalhe: " + str(e)
        result = self._download_item("KoboldCpp", url, target, min_bytes)
        self.config["koboldcpp_exe"] = str(target)
        save_config(self.config)
        return result

    def download_all(self) -> str:
        lines = ["=== Baixar Tudo ==="]
        lines.append(self.install_deps())
        lines.append("")
        lines.append(self.download_koboldcpp())
        lines.append("")
        lines.append(self.download_models())
        lines.append("")
        lines.append("[FINAL] Verificação depois do processo:")
        lines.append(self.status_text())
        return "\n".join(lines)

    def open_folders(self) -> str:
        targets = [_as_path(self.cfg.get("models_dir", r"C:\IA_MODELOS")), _as_path(self.cfg.get("kobold_dir", r"C:\KoboldCpp"))]
        lines = []
        for p in targets:
            try:
                p.mkdir(parents=True, exist_ok=True)
                if os.name == "nt":
                    os.startfile(str(p))  # type: ignore[attr-defined]
                    lines.append(f"[OK] Abrindo pasta: {p}")
                else:
                    lines.append(f"[OK] Pasta: {p}")
            except Exception as e:
                lines.append(f"[ERRO] {p}: {e}")
        return "\n".join(lines)

    def handle(self, raw: str) -> str:
        n = (raw or '').strip().lower()
        if n in {"/baixar", "/download", "/downloads", "/baixar status", "/download status", "/downloads status", "/verificar downloads", "/downloads verificar"}:
            return self.status_text()
        if n in {"/baixar deps", "/download deps", "/baixar dependencias", "/baixar dependências"}:
            return self.install_deps()
        if n in {"/baixar modelos", "/download modelos", "/baixar modelo"}:
            return self.download_models()
        if n in {"/baixar kobold", "/download kobold", "/baixar koboldcpp"}:
            return self.download_koboldcpp()
        if n in {"/baixar tudo", "/download tudo", "/downloads tudo", "/baixar todos"}:
            return self.download_all()
        if n in {"/baixar pasta", "/downloads pasta", "/download pasta", "/baixar abrir"}:
            return self.open_folders()
        return "Use: /baixar status, /baixar tudo, /baixar modelos, /baixar deps, /baixar kobold ou /baixar pasta."

    def _sync_config_paths(self) -> None:
        paths = self.config.setdefault("model_paths", {})
        models = self.cfg.get("models", {})
        if "fast" in models:
            paths["fast_model_path"] = str(_as_path(models["fast"].get("target")))
        if "think" in models:
            paths["think_model_path"] = str(_as_path(models["think"].get("target")))
        self.config["downloads"] = self.cfg
        save_config(self.config)

    def _download_item(self, label: str, url: str, target: Path, min_bytes: int) -> str:
        if not url:
            return f"[ERRO] {label}: URL vazia no config."
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            return f"[ERRO] {label}: não consegui criar pasta {target.parent}: {e}"
        current = target.stat().st_size if target.exists() else 0
        if target.exists() and current >= min_bytes:
            return f"[OK] {label}: já baixado ({_fmt_bytes(current)}) -> {target}"
        part = target.with_suffix(target.suffix + ".part")
        tmp_size = part.stat().st_size if part.exists() else 0
        headers = {"User-Agent": "YoruBridge/1.8.39 BrowserIntentPlus"}
        mode = "wb"
        if tmp_size > 0:
            headers["Range"] = f"bytes={tmp_size}-"
            mode = "ab"
        started = time.time()
        last_print = time.time()
        downloaded = tmp_size
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as r, part.open(mode + "") as f:
                total_header = r.headers.get("Content-Length")
                total = int(total_header) + tmp_size if total_header and mode == "ab" else int(total_header or 0)
                while True:
                    chunk = r.read(1024 * 1024)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    now = time.time()
                    if now - last_print > 5:
                        if total:
                            pct = min(100.0, downloaded * 100 / total)
                            print(f"[DOWNLOAD] {label}: {_fmt_bytes(downloaded)} / {_fmt_bytes(total)} ({pct:.1f}%)", flush=True)
                        else:
                            print(f"[DOWNLOAD] {label}: {_fmt_bytes(downloaded)}", flush=True)
                        last_print = now
            final_size = part.stat().st_size if part.exists() else 0
            if final_size < min_bytes:
                return f"[PARCIAL] {label}: baixou {_fmt_bytes(final_size)}, menor que o esperado ({_fmt_bytes(min_bytes)}). Arquivo parcial: {part}"
            if target.exists():
                target.unlink()
            part.rename(target)
            return f"[OK] {label}: baixado em {time.time()-started:.1f}s ({_fmt_bytes(final_size)}) -> {target}"
        except KeyboardInterrupt:
            return f"[CANCELADO] {label}: download interrompido. Parcial mantido em {part}"
        except urllib.error.HTTPError as e:
            # Alguns servidores ignoram Range; tenta de novo do zero uma vez.
            if e.code == 416 and part.exists():
                part.unlink(missing_ok=True)
            return f"[ERRO] {label}: HTTP {e.code} - {e.reason}"
        except Exception as e:
            return f"[ERRO] {label}: {e}"

    def _latest_kobold_asset_url(self) -> str:
        kcfg = self.cfg.get("koboldcpp", {})
        api = kcfg.get("github_api", DEFAULT_DOWNLOADS["koboldcpp"]["github_api"])
        req = urllib.request.Request(api, headers={"User-Agent": "YoruBridge/1.8.39 BrowserIntentPlus"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode("utf-8", errors="replace"))
        assets = data.get("assets", []) or []
        if not assets:
            raise RuntimeError("release sem assets")
        candidates = []
        for a in assets:
            name = str(a.get("name", "")).lower()
            url = a.get("browser_download_url")
            if not url or not name.endswith(".exe"):
                continue
            candidates.append((name, url))
        prefs = [str(x).lower() for x in kcfg.get("preferred_asset_keywords", [])]
        for pref in prefs:
            for name, url in candidates:
                if pref in name:
                    return url
        for name, url in candidates:
            if "koboldcpp" in name and name.endswith(".exe"):
                return url
        raise RuntimeError("não encontrei asset .exe compatível no release")
