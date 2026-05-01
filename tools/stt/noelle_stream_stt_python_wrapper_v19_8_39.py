import sys
from pathlib import Path

def write_output(path: str, text: str) -> None:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text.strip() + "\n", encoding="utf-8")

def main() -> int:
    if len(sys.argv) < 3:
        print("Uso: python noelle_stream_stt_python_wrapper_v19_8_39.py input_audio output_txt", file=sys.stderr)
        return 2

    audio_path = sys.argv[1]
    output_txt = sys.argv[2]

    try:
        import whisper
        model_name = "base"
        model = whisper.load_model(model_name)
        result = model.transcribe(audio_path, language="pt")
        text = (result or {}).get("text", "").strip()
        write_output(output_txt, text)
        print(text)
        return 0
    except Exception as err:
        first_error = err

    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("base", device="cpu", compute_type="int8")
        segments, _info = model.transcribe(audio_path, language="pt")
        text = " ".join((seg.text or "").strip() for seg in segments).strip()
        write_output(output_txt, text)
        print(text)
        return 0
    except Exception as err:
        print("Nenhum backend Python disponível.", file=sys.stderr)
        print("whisper error:", first_error, file=sys.stderr)
        print("faster_whisper error:", err, file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
