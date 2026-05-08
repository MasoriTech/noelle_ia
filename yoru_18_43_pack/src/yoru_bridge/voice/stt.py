from __future__ import annotations
import time
import wave
from pathlib import Path
from typing import Dict, Any, Optional
from ..config import PACK_ROOT

class STTEngine:
    """STT leve para a Yoru: faster-whisper/CT2 em CPU int8."""
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.stt_cfg = config.get('stt', {})
        self._model = None

    def diagnose(self) -> str:
        msgs = []
        try:
            import sounddevice as sd  # noqa
            try:
                default = sd.query_devices(kind='input')
                msgs.append(f"[OK] sounddevice | mic padrão: {default.get('name','desconhecido')}")
            except Exception:
                msgs.append('[OK] sounddevice')
        except Exception as e:
            msgs.append(f'[ERRO] sounddevice: {e}')
        try:
            import numpy  # noqa
            msgs.append('[OK] numpy')
        except Exception as e:
            msgs.append(f'[ERRO] numpy: {e}')
        try:
            import faster_whisper  # noqa
            msgs.append('[OK] faster-whisper')
        except Exception as e:
            msgs.append(f'[ERRO] faster-whisper: {e}')
        try:
            import ctranslate2  # noqa
            msgs.append('[OK] ctranslate2')
        except Exception as e:
            msgs.append(f'[AVISO] ctranslate2: {e}')
        c = self.stt_cfg
        msgs.append(f"[STT] model={c.get('model_size','tiny')} device={c.get('device','cpu')} compute={c.get('compute_type','int8')} beam={c.get('beam_size',1)} cpu_threads={c.get('cpu_threads',2)}")
        return '\n'.join(msgs)

    @staticmethod
    def write_wav(path: Path, audio, sr: int) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(path), 'wb') as wf:
            wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr); wf.writeframes(audio.tobytes())

    def record_wav(self, seconds: Optional[int] = None) -> Path:
        import sounddevice as sd
        sr = int(self.stt_cfg.get('sample_rate', 16000))
        sec = int(seconds or self.stt_cfg.get('record_seconds', 4))
        device = self.stt_cfg.get('input_device', None)
        print(f'[STT] Gravando {sec}s...')
        audio = sd.rec(int(sec * sr), samplerate=sr, channels=1, dtype='int16', device=device)
        sd.wait()
        out = PACK_ROOT / 'data' / 'audio' / 'stt_last.wav'
        self.write_wav(out, audio, sr)
        return out

    def listen_ctrl(self) -> str:
        import keyboard
        import sounddevice as sd
        import numpy as np
        sr = int(self.stt_cfg.get('sample_rate', 16000))
        chunk = max(160, int(sr * 0.05))
        device = self.stt_cfg.get('input_device', None)
        print('[CTRLVOZ] Segure CTRL para gravar. Solte CTRL para transcrever. Esc cancela.')
        while not keyboard.is_pressed('ctrl'):
            if keyboard.is_pressed('esc'):
                print('[CTRLVOZ] cancelado.'); return ''
            time.sleep(0.03)
        chunks = []
        print('[CTRLVOZ] gravando...')
        with sd.InputStream(samplerate=sr, channels=1, dtype='int16', blocksize=chunk, device=device) as stream:
            while keyboard.is_pressed('ctrl'):
                data, _ = stream.read(chunk)
                chunks.append(data.copy())
        if not chunks: return ''
        audio = np.concatenate(chunks, axis=0).astype('int16')
        out = PACK_ROOT / 'data' / 'audio' / f'ctrl_{int(time.time()*1000)}.wav'
        self.write_wav(out, audio, sr)
        print('[CTRLVOZ] transcrevendo...')
        return self.transcribe_wav(out)

    def load_model(self):
        if self._model is not None: return self._model
        from faster_whisper import WhisperModel
        kwargs = dict(device=self.stt_cfg.get('device','cpu'), compute_type=self.stt_cfg.get('compute_type','int8'))
        try:
            kwargs['cpu_threads'] = int(self.stt_cfg.get('cpu_threads', 2))
            kwargs['num_workers'] = int(self.stt_cfg.get('num_workers', 1))
            self._model = WhisperModel(self.stt_cfg.get('model_size','tiny'), **kwargs)
        except TypeError:
            kwargs.pop('cpu_threads', None); kwargs.pop('num_workers', None)
            self._model = WhisperModel(self.stt_cfg.get('model_size','tiny'), **kwargs)
        return self._model

    def transcribe_wav(self, wav_path: Path) -> str:
        model = self.load_model()
        vad_params = {
            'min_silence_duration_ms': int(self.stt_cfg.get('vad_min_silence_ms', 350)),
            'speech_pad_ms': int(self.stt_cfg.get('vad_speech_pad_ms', 120)),
        }
        kwargs = dict(
            language=self.stt_cfg.get('language','pt'),
            beam_size=int(self.stt_cfg.get('beam_size',1)),
            vad_filter=bool(self.stt_cfg.get('vad_filter', True)),
            vad_parameters=vad_params,
            condition_on_previous_text=bool(self.stt_cfg.get('condition_on_previous_text', False)),
            temperature=float(self.stt_cfg.get('temperature', 0.0)),
            word_timestamps=False,
            initial_prompt=self.stt_cfg.get('initial_prompt') or None,
        )
        segments, _info = model.transcribe(str(wav_path), **kwargs)
        text = ' '.join(seg.text.strip() for seg in segments).strip()
        bad = {'legendas pela comunidade amara.org', 'inscreva-se no canal', 'obrigado por assistir'}
        if text.lower().strip('.! ') in bad: return ''
        return text

    def listen_once(self, seconds: Optional[int] = None) -> str:
        wav = self.record_wav(seconds)
        print('[STT] Transcrevendo...')
        return self.transcribe_wav(wav)
