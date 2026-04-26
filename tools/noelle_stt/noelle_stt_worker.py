# -*- coding: utf-8 -*-
"""Worker persistente de STT para Noelle.

Lê comandos JSON por stdin e responde 1 JSON por linha em stdout.
Mantém o modelo faster-whisper carregado entre transcrições para evitar
recarregar o modelo medium a cada clique do microfone.
"""
from __future__ import annotations

import gc
import json
import os
import sys
import time
from importlib import metadata
from pathlib import Path
from typing import Any

os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
os.environ.setdefault("CT2_VERBOSE", "0")
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")

_MODEL: Any | None = None
_MODEL_KEY: tuple[str, str, str, int, int] | None = None
_FINAL_COMPUTE = ""


def version(name: str) -> str | None:
    try:
        return metadata.version(name)
    except Exception:
        return None


def emit(payload: dict[str, Any]) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def clean_text(text: str) -> str:
    text = " ".join(str(text or "").split())
    junk = {
        "legendas pela comunidade amara.org",
        "obrigado por assistir",
        "inscreva-se no canal",
        "e aí",
    }
    return "" if text.lower() in junk else text


def bool_arg(value: Any, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "sim", "on"}


def load_model(model_name: str, compute_type: str, download_root: str | None, local_files_only: bool, cpu_threads: int, num_workers: int):
    global _MODEL, _MODEL_KEY, _FINAL_COMPUTE
    from faster_whisper import WhisperModel

    model_name = str(model_name or "medium").strip() or "medium"
    compute_type = str(compute_type or "int8").strip() or "int8"
    device = "cpu"
    cpu_threads = max(1, int(cpu_threads or 2))
    num_workers = max(1, int(num_workers or 1))
    key = (model_name, compute_type, device, cpu_threads, num_workers)

    if _MODEL is not None and _MODEL_KEY == key:
        return _MODEL, _FINAL_COMPUTE, False

    # Só um modelo por vez para não estourar RAM em PC fraco.
    _MODEL = None
    _MODEL_KEY = None
    gc.collect()

    if download_root:
        Path(download_root).mkdir(parents=True, exist_ok=True)

    candidates: list[str] = []
    for item in [compute_type, "int8_float32", "float32"]:
        item = str(item or "").strip()
        if item and item not in candidates:
            candidates.append(item)

    last_error: Exception | None = None
    for compute in candidates:
        try:
            kwargs: dict[str, Any] = {
                "device": device,
                "compute_type": compute,
                "cpu_threads": cpu_threads,
                "num_workers": num_workers,
                "local_files_only": bool(local_files_only),
            }
            if download_root:
                kwargs["download_root"] = download_root
            model = WhisperModel(model_name, **kwargs)
            _MODEL = model
            _MODEL_KEY = key
            _FINAL_COMPUTE = compute
            return model, compute, True
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            lower = str(exc).lower()
            if "local_files_only" in lower or "not found" in lower or "download" in lower or "connection" in lower:
                break
    raise RuntimeError(str(last_error or "não foi possível carregar o modelo"))


def transcribe_once(model: Any, audio_path: str, payload: dict[str, Any], use_vad: bool, relaxed: bool = False):
    language = str(payload.get("language") or "pt").strip() or "pt"
    min_silence_ms = int(payload.get("minSilenceDurationMs") or payload.get("min_silence_duration_ms") or 500)
    initial_prompt = str(payload.get("initialPrompt") or "Transcreva fala curta em português brasileiro. Não invente palavras.")

    kwargs: dict[str, Any] = {
        # Passar language evita detecção automática e melhora latência para ditado em pt-BR.
        "language": language,
        "beam_size": int(payload.get("beamSize") or payload.get("beam_size") or 1),
        "best_of": int(payload.get("bestOf") or payload.get("best_of") or 1),
        "vad_filter": bool(use_vad),
        "condition_on_previous_text": False,
        "temperature": 0.0,
        "initial_prompt": initial_prompt,
        "no_speech_threshold": 0.30 if relaxed else 0.48,
        "compression_ratio_threshold": 2.4,
        "log_prob_threshold": -1.4 if relaxed else -1.0,
    }
    if use_vad:
        kwargs["vad_parameters"] = {
            "min_silence_duration_ms": max(180, min_silence_ms),
            "speech_pad_ms": 250,
        }

    started = time.time()
    segments_iter, info = model.transcribe(audio_path, **kwargs)
    parts: list[str] = []
    segments: list[dict[str, Any]] = []
    for segment in segments_iter:
        text = clean_text(getattr(segment, "text", ""))
        if text:
            parts.append(text)
        segments.append({
            "start": round(float(getattr(segment, "start", 0.0) or 0.0), 2),
            "end": round(float(getattr(segment, "end", 0.0) or 0.0), 2),
            "text": text,
        })
    return clean_text(" ".join(parts)), segments, info, round(time.time() - started, 2)


def handle_transcribe(payload: dict[str, Any]) -> dict[str, Any]:
    started = time.time()
    audio_path = Path(str(payload.get("audio") or payload.get("audioPath") or "")).expanduser().resolve()
    if not audio_path.exists():
        return {"ok": False, "error": f"Arquivo de áudio não encontrado: {audio_path}"}
    if audio_path.stat().st_size < 1024:
        return {"ok": False, "error": "Áudio vazio ou curto demais para transcrever."}

    model_name = str(payload.get("model") or "medium").strip() or "medium"
    compute_type = str(payload.get("computeType") or payload.get("compute_type") or "int8").strip() or "int8"
    download_root = str(payload.get("downloadRoot") or payload.get("download_root") or "").strip() or None
    local_only = bool_arg(payload.get("localFilesOnly") or payload.get("local_files_only"), False)
    cpu_threads = int(payload.get("cpuThreads") or payload.get("cpu_threads") or 2)
    num_workers = int(payload.get("numWorkers") or payload.get("num_workers") or 1)

    model, final_compute, model_loaded_now = load_model(
        model_name=model_name,
        compute_type=compute_type,
        download_root=download_root,
        local_files_only=local_only,
        cpu_threads=cpu_threads,
        num_workers=num_workers,
    )

    # Para clipe curto de microfone, primeiro sem VAD: é mais rápido e evita cortar fala curta.
    transcript, segments, info, pass_seconds = transcribe_once(model, str(audio_path), payload, use_vad=False, relaxed=False)
    fallback_used = False
    fallback_mode = None

    if not transcript:
        fallback_used = True
        fallback_mode = "relaxed_no_vad"
        transcript, segments, info, pass_seconds = transcribe_once(model, str(audio_path), payload, use_vad=False, relaxed=True)

    if not transcript and bool_arg(payload.get("allowVadFallback"), True):
        fallback_mode = "vad_relaxed"
        transcript, segments, info, pass_seconds = transcribe_once(model, str(audio_path), payload, use_vad=True, relaxed=True)

    seconds = round(time.time() - started, 2)
    if not transcript:
        return {
            "ok": False,
            "error": "Não consegui identificar fala clara no áudio.",
            "hint": "Fale perto do microfone por 2 a 5 segundos. Se continuar ruim, use small/base ou aumente o volume do microfone.",
            "model": model_name,
            "compute_type": final_compute,
            "language": getattr(info, "language", payload.get("language") or "pt") if info else payload.get("language") or "pt",
            "seconds": seconds,
            "pass_seconds": pass_seconds,
            "segments_count": len(segments),
            "fallback_used": fallback_used,
            "fallback_mode": fallback_mode,
            "model_loaded_now": model_loaded_now,
        }

    return {
        "ok": True,
        "text": transcript,
        "language": getattr(info, "language", payload.get("language") or "pt"),
        "language_probability": float(getattr(info, "language_probability", 0.0) or 0.0),
        "duration": float(getattr(info, "duration", 0.0) or 0.0),
        "seconds": seconds,
        "pass_seconds": pass_seconds,
        "model": model_name,
        "compute_type": final_compute,
        "device": "cpu",
        "segments_count": len(segments),
        "fallback_used": fallback_used,
        "fallback_mode": fallback_mode,
        "model_loaded_now": model_loaded_now,
        "python": sys.executable,
        "faster_whisper_version": version("faster-whisper"),
        "ctranslate2_version": version("ctranslate2"),
    }


def handle(payload: dict[str, Any]) -> dict[str, Any]:
    global _MODEL, _MODEL_KEY, _FINAL_COMPUTE
    cmd = str(payload.get("cmd") or "transcribe")
    req_id = payload.get("id")
    try:
        if cmd == "ping":
            return {"ok": True, "id": req_id, "ready": True, "model_loaded": _MODEL_KEY is not None}
        if cmd == "unload":
            _MODEL = None
            _MODEL_KEY = None
            _FINAL_COMPUTE = ""
            gc.collect()
            return {"ok": True, "id": req_id, "unloaded": True}
        if cmd == "transcribe":
            out = handle_transcribe(payload)
            out["id"] = req_id
            return out
        return {"ok": False, "id": req_id, "error": "Comando desconhecido do worker STT."}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "id": req_id, "error": "Falha no worker faster-whisper.", "details": str(exc)}


def main() -> None:
    # Import inicial para falhar cedo com mensagem clara.
    try:
        import faster_whisper  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        emit({
            "ok": False,
            "id": None,
            "error": "faster-whisper não está instalado no Python usado pela Noelle.",
            "hint": "Instale com: py -3 -m pip install -r tools/noelle_stt/requirements.txt",
            "details": str(exc),
            "python": sys.executable,
        })
        return

    emit({
        "ok": True,
        "id": "ready",
        "ready": True,
        "python": sys.executable,
        "faster_whisper_version": version("faster-whisper"),
        "ctranslate2_version": version("ctranslate2"),
    })

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
        except Exception as exc:  # noqa: BLE001
            emit({"ok": False, "id": None, "error": "JSON inválido no worker STT.", "details": str(exc)})
            continue
        emit(handle(payload))


if __name__ == "__main__":
    main()
