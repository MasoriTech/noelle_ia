from __future__ import annotations
import time
from collections import deque
from pathlib import Path
from typing import Callable, Dict, Any
from ..config import PACK_ROOT
from ..utils.text import normalize
from .stt import STTEngine

class StreamController:
    """Chat Stream leve com VAD de energia + Faster-Whisper/CT2."""
    def __init__(self, config: Dict[str, Any], on_text: Callable[[str], str | None], tts_busy: Callable[[], bool] | None = None):
        self.config = config
        self.stream_cfg = config.get('stream', {})
        self.stt = STTEngine(config)
        self.on_text = on_text
        self.tts_busy = tts_busy or (lambda: False)
        self.running = False
        self._last_text = ''
        self._last_text_ts = 0.0

    def diagnose(self) -> str:
        c = self.stream_cfg
        return '\n'.join([
            self.stt.diagnose(),
            f"[STREAM] mode={c.get('mode')} vad={c.get('vad')} auto_calibrate={c.get('auto_calibrate')} threshold={c.get('energy_threshold')}",
            f"[STREAM] chunk={c.get('chunk_ms')}ms prebuffer={c.get('prebuffer_ms')}ms min_speech={c.get('min_speech_ms')}ms silence_end={c.get('silence_end_ms')}ms max_segment={c.get('max_segment_sec')}s",
            f"[STREAM] wake={c.get('require_wake_word')} words={c.get('wake_words')} questions={c.get('respond_to_questions')} continuous={c.get('continuous_mode')}"
        ])

    def should_respond(self, text: str) -> bool:
        n = normalize(text)
        if not n or len(n) < int(self.stream_cfg.get('min_transcript_chars', 3)): return False
        now = time.time()
        if n == self._last_text and (now - self._last_text_ts) < float(self.stream_cfg.get('ignore_repeated_transcript_sec', 4)):
            print('[STREAM] repetido/eco ignorado.'); return False
        self._last_text = n; self._last_text_ts = now
        if self.stream_cfg.get('continuous_mode'): return True
        wake_words = [normalize(x) for x in self.stream_cfg.get('wake_words', ['yoru'])]
        if self.stream_cfg.get('require_wake_word', True) and any(w and w in n for w in wake_words): return True
        question_words = ['quem','qual','como','quando','onde','porque','por que','o que','me ajuda','abra','abrir','pesquise','pesquisa','procure']
        return bool(self.stream_cfg.get('respond_to_questions', True) and any(x in n for x in question_words))

    def calibrate_energy(self, np, stream, sr: int, chunk_size: int) -> float:
        c = self.stream_cfg
        if not c.get('auto_calibrate', True): return float(c.get('energy_threshold', 0.012))
        sec = float(c.get('calibration_sec', 1.2))
        chunks = max(1, int(sec * sr / chunk_size))
        print(f'[STREAM] calibrando ruído por {sec:.1f}s. Fique em silêncio...')
        energies = []
        for _ in range(chunks):
            data, _ = stream.read(chunk_size)
            arr = data.reshape(-1).astype('float32') / 32768.0
            energies.append(float(np.sqrt(np.mean(arr * arr))) if arr.size else 0.0)
        noise = sorted(energies)[len(energies)//2] if energies else 0.0
        th = noise * float(c.get('noise_multiplier', 3.2))
        th = max(float(c.get('min_energy_threshold', 0.008)), th)
        th = min(float(c.get('max_energy_threshold', 0.055)), th)
        print(f'[STREAM] ruído≈{noise:.4f} threshold≈{th:.4f}')
        return th

    def run(self) -> None:
        import numpy as np
        import sounddevice as sd
        c = self.stream_cfg
        sr = int(c.get('sample_rate', 16000))
        chunk_ms = int(c.get('chunk_ms', 30))
        chunk_size = max(160, int(sr * chunk_ms / 1000))
        min_speech_chunks = max(1, int(int(c.get('min_speech_ms',300)) / chunk_ms))
        silence_end_chunks = max(1, int(int(c.get('silence_end_ms',650)) / chunk_ms))
        max_chunks = max(1, int(float(c.get('max_segment_sec',7)) * 1000 / chunk_ms))
        pre_chunks = max(0, int(int(c.get('prebuffer_ms',300)) / chunk_ms))
        cooldown = float(c.get('cooldown_after_tts_sec', 1.0))
        device = self.stt.stt_cfg.get('input_device', None)
        print('[STREAM] Iniciado. Fale com "Yoru" ou faça pergunta clara. Ctrl+C para sair.')
        print('[STREAM] Dica: /stream sensibilidade 1-5 ajusta ruído/corte.')
        self.running = True
        try:
            with sd.InputStream(samplerate=sr, channels=1, dtype='int16', blocksize=chunk_size, device=device) as stream:
                threshold = self.calibrate_energy(np, stream, sr, chunk_size)
                prebuf = deque(maxlen=pre_chunks); recording=[]; voiced=0; silent=0; active=False
                while self.running:
                    if self.tts_busy():
                        time.sleep(cooldown)
                        prebuf.clear(); recording=[]; voiced=0; silent=0; active=False
                        continue
                    data, _ = stream.read(chunk_size)
                    prebuf.append(data.copy())
                    arr = data.reshape(-1).astype('float32') / 32768.0
                    energy = float(np.sqrt(np.mean(arr * arr))) if arr.size else 0.0
                    is_voice = energy >= threshold
                    if c.get('print_energy_debug'): print(f'\r[energy {energy:.4f} th {threshold:.4f}]', end='', flush=True)
                    if is_voice: voiced += 1; silent = 0
                    else: silent += 1
                    if not active and voiced >= min_speech_chunks:
                        active=True; recording=list(prebuf); print('\n[STREAM] ouvindo...')
                    if active: recording.append(data.copy())
                    if active and (silent >= silence_end_chunks or len(recording) >= max_chunks):
                        active=False; voiced=0; silent=0
                        if len(recording) < min_speech_chunks: continue
                        wav = self._save_segment(recording, sr)
                        print('[STREAM] transcrevendo com faster-whisper/CT2...')
                        try: text = self.stt.transcribe_wav(wav)
                        except Exception as e:
                            print(f'[STREAM][STT ERRO] {e}'); continue
                        if c.get('delete_segments_after_transcribe'):
                            try: wav.unlink(missing_ok=True)
                            except Exception: pass
                        if not text:
                            print('[STREAM] vazio/ruído ignorado.'); continue
                        print(f'[OUVI] {text}')
                        if self.should_respond(text): self.on_text(text)
                        else: print('[STREAM] ignorado pelo filtro de intenção.')
        except KeyboardInterrupt:
            print('\n[STREAM] Encerrado.')
        finally:
            self.running=False

    def _save_segment(self, chunks, sr: int) -> Path:
        import numpy as np
        out = PACK_ROOT / 'data' / 'audio' / f'stream_{int(time.time()*1000)}.wav'
        audio = np.concatenate(chunks, axis=0).astype('int16')
        STTEngine.write_wav(out, audio, sr)
        return out
