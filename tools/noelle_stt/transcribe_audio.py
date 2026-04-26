# -*- coding: utf-8 -*-
"""Noelle STT local com faster-whisper.

Uso interno pelo Electron:
  python tools/noelle_stt/transcribe_audio.py --audio arquivo.webm --model medium --compute-type int8 --language pt

Saída: sempre JSON em stdout.
"""
from __future__ import annotations

import argparse
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


def emit(payload: dict[str, Any], code: int = 0) -> None:
    payload.setdefault("ok", code == 0)
    print(json.dumps(payload, ensure_ascii=False), flush=True)
    raise SystemExit(code)


def package_version(name: str) -> str | None:
    try:
        return metadata.version(name)
    except Exception:
        return None


def bool_arg(value: str | bool | None, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "sim", "on"}


def clean_text(text: str) -> str:
    text = " ".join(str(text or "").split())
    # Evita retornar alguns ruídos comuns quando o áudio fica vazio/baixo.
    junk = {
        "legendas pela comunidade amara.org",
        "obrigado por assistir",
        "inscreva-se no canal",
    }
    return "" if text.lower() in junk else text


def build_model(model_name: str, compute_type: str, download_root: str | None, local_files_only: bool, cpu_threads: int, num_workers: int):
    from faster_whisper import WhisperModel

    compute_candidates = []
    for item in [compute_type, "int8_float32", "float32"]:
        item = str(item or "").strip()
        if item and item not in compute_candidates:
            compute_candidates.append(item)

    last_error: Exception | None = None
    for compute in compute_candidates:
        try:
            kwargs: dict[str, Any] = {
                "device": "cpu",
                "compute_type": compute,
                "cpu_threads": max(1, int(cpu_threads or 2)),
                "num_workers": max(1, int(num_workers or 1)),
                "local_files_only": bool(local_files_only),
            }
            if download_root:
                kwargs["download_root"] = download_root
            model = WhisperModel(model_name, **kwargs)
            return model, compute
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            # Se o erro parece download/modelo ausente, não adianta testar outros compute types por muito tempo.
            lower = str(exc).lower()
            if "local_files_only" in lower or "not found" in lower or "connection" in lower or "download" in lower:
                break
    raise RuntimeError(str(last_error or "não foi possível carregar o modelo"))


def transcribe_once(model: Any, audio_path: str, language: str, use_vad: bool, min_silence_ms: int, relaxed: bool = False) -> tuple[str, list[dict[str, Any]], Any]:
    kwargs: dict[str, Any] = {
        "language": language or "pt",
        "beam_size": 1 if not relaxed else 3,
        "best_of": 1 if not relaxed else 3,
        "vad_filter": bool(use_vad),
        "condition_on_previous_text": False,
        "temperature": 0.0,
        "initial_prompt": "Transcreva fala curta em português brasileiro. Não invente palavras.",
        "no_speech_threshold": 0.80 if relaxed else 0.68,
        "compression_ratio_threshold": 2.8,
        "log_prob_threshold": -1.5 if relaxed else -1.2,
    }
    if use_vad:
        kwargs["vad_parameters"] = {
            "min_silence_duration_ms": max(200, int(min_silence_ms or 500)),
            "speech_pad_ms": 250,
        }

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
    return clean_text(" ".join(parts)), segments, info


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--model", default="medium")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--language", default="pt")
    parser.add_argument("--download-root", default="")
    parser.add_argument("--local-files-only", default="false")
    parser.add_argument("--cpu-threads", type=int, default=2)
    parser.add_argument("--num-workers", type=int, default=1)
    parser.add_argument("--vad-filter", default="true")
    parser.add_argument("--min-silence-duration-ms", type=int, default=500)
    args = parser.parse_args()

    started = time.time()
    audio_path = Path(args.audio).expanduser().resolve()
    if not audio_path.exists():
        emit({"ok": False, "error": f"Arquivo de áudio não encontrado: {audio_path}"}, 2)
    if audio_path.stat().st_size < 1024:
        emit({"ok": False, "error": "Áudio vazio ou curto demais para transcrever."}, 2)

    try:
        import faster_whisper  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        emit({
            "ok": False,
            "error": "faster-whisper não está instalado no Python usado pela Noelle.",
            "hint": "Instale com: py -3 -m pip install -r tools/noelle_stt/requirements.txt",
            "details": str(exc),
            "python": sys.executable,
        }, 3)

    model_name = str(args.model or "medium").strip() or "medium"
    compute_type = str(args.compute_type or "int8").strip() or "int8"
    language = str(args.language or "pt").strip() or "pt"
    download_root = str(args.download_root or "").strip() or None
    local_only = bool_arg(args.local_files_only, False)
    use_vad = bool_arg(args.vad_filter, True)

    try:
        if download_root:
            Path(download_root).mkdir(parents=True, exist_ok=True)
        model, final_compute = build_model(
            model_name=model_name,
            compute_type=compute_type,
            download_root=download_root,
            local_files_only=local_only,
            cpu_threads=args.cpu_threads,
            num_workers=args.num_workers,
        )

        # Para áudio curto gravado pelo Electron, começar sem VAD costuma ser mais robusto.
        transcript, segments, info = transcribe_once(
            model=model,
            audio_path=str(audio_path),
            language=language,
            use_vad=False,
            min_silence_ms=args.min_silence_duration_ms,
            relaxed=False,
        )

        fallback_used = False
        if not transcript:
            fallback_used = True
            transcript, segments, info = transcribe_once(
                model=model,
                audio_path=str(audio_path),
                language=language,
                use_vad=use_vad,
                min_silence_ms=args.min_silence_duration_ms,
                relaxed=True,
            )

        seconds = round(time.time() - started, 2)
        if not transcript:
            emit({
                "ok": False,
                "error": "Não consegui identificar fala clara no áudio.",
                "hint": "Fale perto do microfone por 2 a 5 segundos. Se o medium demorar ou falhar, teste small/base. Confira se PREPARAR_AUDIO_STT.bat instalou faster-whisper, ctranslate2 e av.",
                "model": model_name,
                "compute_type": final_compute,
                "language": getattr(info, "language", language) if info else language,
                "seconds": seconds,
                "segments_count": len(segments),
                "fallback_used": fallback_used,
            }, 5)

        emit({
            "ok": True,
            "text": transcript,
            "language": getattr(info, "language", language),
            "language_probability": float(getattr(info, "language_probability", 0.0) or 0.0),
            "duration": float(getattr(info, "duration", 0.0) or 0.0),
            "seconds": seconds,
            "model": model_name,
            "compute_type": final_compute,
            "device": "cpu",
            "segments_count": len(segments),
            "fallback_used": fallback_used,
            "python": sys.executable,
            "faster_whisper_version": package_version("faster-whisper"),
            "ctranslate2_version": package_version("ctranslate2"),
        })
    except Exception as exc:  # noqa: BLE001
        detail = str(exc)
        lower = detail.lower()
        hint = "Na primeira vez o medium pode demorar porque baixa/cacheia o modelo."
        if "failed to open" in lower or "invalid data" in lower or "av" in lower:
            hint = "O áudio gravado não abriu no decodificador. Tente novamente e fale por mais tempo."
        elif "not enough memory" in lower or "bad allocation" in lower or "out of memory" in lower:
            hint = "O modelo medium ficou pesado. Troque para small/base/tiny no próximo patch ou libere RAM."
        elif "not found" in lower or "connection" in lower or "download" in lower:
            hint = "O modelo ainda não está baixado/cacheado ou a internet falhou durante o download."
        emit({
            "ok": False,
            "error": "Falha ao transcrever com faster-whisper.",
            "details": detail,
            "hint": hint,
            "model": model_name,
            "compute_type": compute_type,
            "seconds": round(time.time() - started, 2),
            "python": sys.executable,
        }, 4)


if __name__ == "__main__":
    main()
