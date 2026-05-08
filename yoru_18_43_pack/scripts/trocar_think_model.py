from __future__ import annotations
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path

PACK_ROOT = Path(__file__).resolve().parents[1]
CONFIG = PACK_ROOT / "config.json"

QWEN35_2B_DEFAULT = r"C:\IA_MODELOS\Qwen3.5-2B-Q4_K_M.gguf"
QWEN25_3B_DEFAULT = r"C:\IA_MODELOS\qwen2.5-3b-instruct-q4_k_m.gguf"


def backup_config() -> Path:
    bdir = PACK_ROOT / "data" / "config_backups"
    bdir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dst = bdir / f"config_before_switch_think_{stamp}.json"
    if CONFIG.exists():
        shutil.copy2(CONFIG, dst)
    return dst


def load() -> dict:
    return json.loads(CONFIG.read_text(encoding="utf-8"))


def save(cfg: dict) -> None:
    CONFIG.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def apply(profile: str, custom_path: str | None = None) -> None:
    cfg = load()
    backup = backup_config()
    models = cfg.setdefault("models", {})
    think = models.setdefault("think", {})
    paths = cfg.setdefault("model_paths", {})

    if profile in {"qwen35", "qwen35_2b", "2b", "default"}:
        path = custom_path or paths.get("think_model_path") or QWEN35_2B_DEFAULT
        # Se o config ainda aponta para o Qwen2.5 3B, usa o padrão 2B.
        if "qwen2.5" in path.lower() or "3b-instruct" in path.lower():
            path = QWEN35_2B_DEFAULT
        think.update({
            "label": "Yoru THINK - Qwen3.5 2B",
            "api_url": "http://127.0.0.1:5002/v1",
            "model": "koboldcpp",
            "temperature": 0.27,
            "max_tokens": 150,
            "prompt_profile": "technical"
        })
        paths["think_model_path"] = path
    elif profile in {"qwen25", "qwen25_3b", "3b", "backup"}:
        path = custom_path or paths.get("think_backup_qwen25_3b_path") or QWEN25_3B_DEFAULT
        think.update({
            "label": "Yoru THINK BACKUP - Qwen2.5 3B",
            "api_url": "http://127.0.0.1:5002/v1",
            "model": "koboldcpp",
            "temperature": 0.28,
            "max_tokens": 150,
            "prompt_profile": "technical"
        })
        paths["think_model_path"] = path
    else:
        raise SystemExit("Uso: python scripts/trocar_think_model.py qwen35_2b|qwen25_3b [C:\\caminho\\modelo.gguf]")

    # Não altera cfg["version"]: trocar o modelo THINK não deve rebaixar a versão do pack.
    cfg.setdefault("runtime", {})["think_timeout_sec"] = 45
    cfg.setdefault("runtime", {})["model_fail_cooldown_sec"] = 25
    save(cfg)
    print("[OK] THINK atualizado.")
    print("Backup:", backup)
    print("Label:", think.get("label"))
    print("Path:", paths.get("think_model_path"))
    print("Agora gere os BATs novamente e abra INICIAR_KOBOLD_THINK_5002.bat.")


if __name__ == "__main__":
    prof = sys.argv[1] if len(sys.argv) >= 2 else "qwen35_2b"
    custom = sys.argv[2] if len(sys.argv) >= 3 else None
    apply(prof, custom)
