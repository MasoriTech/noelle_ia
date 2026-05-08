from __future__ import annotations

import hashlib
import os
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
import queue
import contextlib
import io
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict

from ..config import PACK_ROOT, save_config
from ..utils.text import clean_for_tts


class TTSManager:
    """TTS persistente com Edge TTS + player interno opcional via pygame.

    1.8.39 BrowserIntentPlus / TTSControl:
    - mantém Edge TTS como voz principal pt-BR feminina;
    - usa pygame apenas para tocar/stopar o áudio de forma controlável;
    - mantém fallback para player externo do Windows quando pygame não está instalado;
    - expõe callbacks on_speech_start/on_speech_end/on_audio_ready para AvatarBridge/estado.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.tts_cfg = config.get('tts', {})
        self.q: queue.Queue[str | None] = queue.Queue()
        self.failures = 0
        self.total_spoken = 0
        self.last_error = ''
        self.last_text = ''
        self.last_file = ''
        self.last_engine = ''
        self.last_player = ''
        self.last_player_error = ''
        self._stop_event = threading.Event()
        self._stop_requested = False
        self._speaking_lock = threading.Lock()
        self._pygame_lock = threading.Lock()
        self._is_speaking = False
        self._pygame = None
        self._pygame_ready = False
        self.on_speech_start = None
        self.on_speech_end = None
        self.on_audio_ready = None
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()
        (PACK_ROOT / 'data' / 'tts').mkdir(parents=True, exist_ok=True)

    def is_busy(self) -> bool:
        try:
            return bool(getattr(self, '_is_speaking', False)) or self.q.qsize() > 0
        except Exception:
            return False

    def status(self) -> str:
        return (
            f"Voz: {'ON' if self.tts_cfg.get('enabled') else 'OFF'} | "
            f"engine: {self.tts_cfg.get('engine')} | voice: {self.tts_cfg.get('edge_voice')} | "
            f"player: {self.tts_cfg.get('player', 'external')} | último player: {self.last_player or 'nenhum'} | "
            f"fila: {self.q.qsize()} | persistente: {self.tts_cfg.get('voice_persistence_mode', True)} | "
            f"FAST fala: {self.tts_cfg.get('speak_fast_model', True)} | THINK fala: {self.tts_cfg.get('speak_think_model', True)} | "
            f"falas: {self.total_spoken} | erro: {self.last_error or self.last_player_error or 'nenhum'}"
        )

    def diagnose(self) -> str:
        tts_dir = PACK_ROOT / 'data' / 'tts'
        files = list(tts_dir.glob('tts_*.mp3'))
        pygame_status = 'pronto' if self._pygame_ready else 'lazy/aguardando primeiro áudio'
        return '\n'.join([
            '=== Diagnóstico TTS 1.8.39 BrowserIntentPlus ===',
            f'Config enabled: {self.tts_cfg.get("enabled")}',
            f'Engine: {self.tts_cfg.get("engine")}',
            f'Voice: {self.tts_cfg.get("edge_voice")}',
            f'Player: {self.tts_cfg.get("player", "external")}',
            f'Internal player enabled: {self.tts_cfg.get("internal_player_enabled", True)}',
            f'Pygame fallback externo: {self.tts_cfg.get("pygame_fallback_to_external", True)}',
            f'Pygame status: {pygame_status}',
            f'Persistência: {self.tts_cfg.get("voice_persistence_mode", True)}',
            f'Audio cache: {self.tts_cfg.get("audio_cache_enabled", False)}',
            f'Limpeza Markdown/TTS: {self.tts_cfg.get("strip_markdown_for_tts", True)}',
            f'Fila: {self.q.qsize()} / {self.tts_cfg.get("max_queue", 6)}',
            f'Falar local: {self.tts_cfg.get("speak_local", True)}',
            f'Falar modelo: {self.tts_cfg.get("speak_model", True)}',
            f'Falar FAST: {self.tts_cfg.get("speak_fast_model", True)}',
            f'Falar THINK: {self.tts_cfg.get("speak_think_model", True)}',
            f'Último engine usado: {self.last_engine or "nenhum"}',
            f'Último player usado: {self.last_player or "nenhum"}',
            f'Último arquivo: {self.last_file or "nenhum"}',
            f'Arquivos no cache: {len(files)}',
            f'Último erro TTS: {self.last_error or "nenhum"}',
            f'Último erro player: {self.last_player_error or "nenhum"}',
        ])

    def apply_persistent_mode(self) -> str:
        self.tts_cfg.update({
            'enabled': True,
            'engine': self.tts_cfg.get('engine', 'edge') or 'edge',
            'player': self.tts_cfg.get('player', 'pygame') or 'pygame',
            'internal_player_enabled': True,
            'speak_local': True,
            'speak_model': True,
            'speak_fast_model': True,
            'speak_think_model': True,
            'voice_persistence_mode': True,
            'audio_cache_enabled': False,
            'drop_old_when_queue_full': False,
            'max_queue': max(6, int(self.tts_cfg.get('max_queue', 6))),
            'auto_disable_after_errors': max(8, int(self.tts_cfg.get('auto_disable_after_errors', 8))),
        })
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return 'Modo voz persistente ligado: Edge TTS + player interno pygame, com local + FAST + THINK falando.'

    def set_enabled(self, enabled: bool) -> str:
        self.tts_cfg['enabled'] = bool(enabled)
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return 'Voz ligada.' if enabled else 'Voz desligada.'

    def set_engine(self, engine: str) -> str:
        if engine not in {'edge', 'windows'}:
            return 'Engine inválida. Use edge ou windows.'
        self.tts_cfg['engine'] = engine
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return f'Engine de voz alterada para {engine}.'

    def set_player(self, player: str) -> str:
        player = (player or '').strip().lower()
        aliases = {
            'pygame': 'pygame', 'interno': 'pygame', 'internal': 'pygame',
            'externo': 'external', 'external': 'external', 'windows': 'external', 'startfile': 'external',
        }
        player = aliases.get(player, player)
        if player not in {'pygame', 'external'}:
            return 'Player inválido. Use pygame ou external.'
        self.tts_cfg['player'] = player
        self.tts_cfg['internal_player_enabled'] = (player == 'pygame')
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return f'Player de voz alterado para {player}.'

    def set_model_speaking(self, fast: bool | None = None, think: bool | None = None, model: bool | None = None) -> str:
        if model is not None:
            self.tts_cfg['speak_model'] = bool(model)
        if fast is not None:
            self.tts_cfg['speak_fast_model'] = bool(fast)
        if think is not None:
            self.tts_cfg['speak_think_model'] = bool(think)
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return f"TTS modelos: geral={self.tts_cfg.get('speak_model')} fast={self.tts_cfg.get('speak_fast_model')} think={self.tts_cfg.get('speak_think_model')}"

    def speak(self, text: str, force: bool = False) -> bool:
        if not force and not self.tts_cfg.get('enabled', False):
            return False
        max_chars = int(self.tts_cfg.get('max_chars', 360))
        if self.tts_cfg.get('strip_markdown_for_tts', True):
            clean = clean_for_tts(text, max_chars)
        else:
            clean = (text or '').strip()
            if len(clean) > max_chars:
                clean = clean[:max_chars].rsplit(' ', 1)[0] + '.'
        if not clean:
            return False
        max_q = int(self.tts_cfg.get('max_queue', 6))
        if self.q.qsize() >= max_q:
            if self.tts_cfg.get('drop_old_when_queue_full', False):
                try:
                    self.q.get_nowait()
                except queue.Empty:
                    pass
            else:
                print('[VOZ] Fila cheia; fala ignorada para não travar.')
                return False
        self.q.put(clean)
        return True


    def _notify_speech_start(self, text: str) -> None:
        """Dispara speaking_start no momento certo: imediatamente antes do playback."""
        if callable(self.on_speech_start):
            try:
                self.on_speech_start(text)
            except Exception:
                pass

    def _mark_stop_requested(self, value: bool) -> None:
        self._stop_requested = bool(value)
        if value:
            self._stop_event.set()
        else:
            self._stop_event.clear()

    def stop(self) -> str:
        """Para fila/playback sem limpar o sinal de parada antes do worker perceber."""
        self._mark_stop_requested(True)
        try:
            while True:
                self.q.get_nowait()
        except queue.Empty:
            pass
        self._pygame_stop()
        if self.tts_cfg.get('player') == 'external' and os.name == 'nt':
            for proc in ['wmplayer.exe', 'Music.UI.exe', 'Microsoft.Media.Player.exe']:
                try:
                    subprocess.run(['taskkill', '/IM', proc, '/F'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=3)
                except Exception:
                    pass
        with self._speaking_lock:
            was_speaking = bool(self._is_speaking)
            self._is_speaking = False
        # Se não existe worker tocando agora, já libera; caso contrário o worker libera no finally.
        if not was_speaking:
            self._mark_stop_requested(False)
        return 'Fila de voz limpa e playback interrompido.'

    def reset(self) -> str:
        self.stop()
        self.failures = 0
        self.last_error = ''
        self.last_player_error = ''
        self.tts_cfg['enabled'] = True
        self.config['tts'] = self.tts_cfg
        save_config(self.config)
        return 'TTS resetado: falhas zeradas e voz religada.'

    def clear_cache(self) -> str:
        d = PACK_ROOT / 'data' / 'tts'
        count = 0
        for p in d.glob('tts_*.mp3'):
            try:
                p.unlink()
                count += 1
            except Exception:
                pass
        return f'Cache de voz limpo: {count} arquivo(s).'

    def _worker(self) -> None:
        while True:
            text = self.q.get()
            if text is None:
                return
            with self._speaking_lock:
                self._is_speaking = True
            if self._stop_event.is_set():
                with self._speaking_lock:
                    self._is_speaking = False
                self._mark_stop_requested(False)
                continue
            ok = False
            try:
                delay = float(self.tts_cfg.get('min_seconds_between_speech', 0.0))
                if delay > 0:
                    time.sleep(delay)
                self._speak_now(text)
                ok = not self._stop_requested
                self.failures = 0
                self.last_error = ''
                self.total_spoken += 1
                self.last_text = text[:120]
            except Exception as e:
                self.failures += 1
                self.last_error = str(e)[:300]
                print(f"[VOZ][ERRO] {e}")
                if self.failures >= int(self.tts_cfg.get('auto_disable_after_errors', 8)):
                    self.tts_cfg['enabled'] = False
                    self.config['tts'] = self.tts_cfg
                    save_config(self.config)
                    print('[VOZ] Desligada automaticamente após falhas repetidas.')
            finally:
                if callable(self.on_speech_end):
                    try:
                        self.on_speech_end(text, ok)
                    except TypeError:
                        try:
                            self.on_speech_end(text)
                        except Exception:
                            pass
                    except Exception:
                        pass
                with self._speaking_lock:
                    self._is_speaking = False
                self._mark_stop_requested(False)

    def _speak_now(self, text: str) -> None:
        engine = self.tts_cfg.get('engine', 'edge')
        if engine == 'edge':
            try:
                self.last_engine = 'edge'
                self._edge_tts(text)
                return
            except Exception as e:
                print(f'[VOZ][EDGE ERRO] {e}')
                if self.tts_cfg.get('fallback_engine') == 'windows':
                    self.last_engine = 'windows-fallback'
                    self._windows_tts(text)
                    return
                raise
        self.last_engine = 'windows'
        self._windows_tts(text)

    def _edge_tts(self, text: str) -> None:
        d = PACK_ROOT / 'data' / 'tts'
        d.mkdir(parents=True, exist_ok=True)
        voice = self.tts_cfg.get('edge_voice', 'pt-BR-FranciscaNeural')
        persistent = bool(self.tts_cfg.get('voice_persistence_mode', True))
        cache_enabled = bool(self.tts_cfg.get('audio_cache_enabled', False)) and not persistent
        if cache_enabled:
            key = hashlib.sha1((voice + '|' + text).encode('utf-8', errors='ignore')).hexdigest()[:20]
            out = d / f'tts_{key}.mp3'
        else:
            stamp = int(time.time() * 1000)
            tid = threading.get_ident()
            out = d / f'tts_{stamp}_{tid}.mp3'
        if not out.exists():
            cmd = [sys.executable, '-m', 'edge_tts', '--voice', voice, '--text', text, '--write-media', str(out)]
            if self.tts_cfg.get('rate'):
                cmd += ['--rate', str(self.tts_cfg.get('rate'))]
            if self.tts_cfg.get('volume'):
                cmd += ['--volume', str(self.tts_cfg.get('volume'))]
            timeout = float(self.tts_cfg.get('edge_timeout_sec', 35))
            r = subprocess.run(cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, timeout=timeout)
            if r.returncode != 0:
                err = (r.stderr or b'').decode('utf-8', errors='ignore')[-800:]
                raise RuntimeError(f'edge-tts falhou rc={r.returncode}: {err}')
            self._trim_audio_cache()
        self.last_file = str(out)
        if callable(self.on_audio_ready):
            try:
                self.on_audio_ready(str(out), text)
            except Exception:
                pass
        self._notify_speech_start(text)
        self._play_audio(out, text)

    def _play_audio(self, path: Path, text: str = '') -> None:
        player = str(self.tts_cfg.get('player', 'pygame')).lower().strip()
        internal = bool(self.tts_cfg.get('internal_player_enabled', True))
        if player == 'pygame' and internal:
            try:
                self._pygame_play(path)
                self.last_player = 'pygame'
                self.last_player_error = ''
                return
            except Exception as e:
                self.last_player_error = str(e)[:300]
                print(f'[VOZ][PYGAME ERRO] {e}')
                if not self.tts_cfg.get('pygame_fallback_to_external', True):
                    raise
        self._external_play(path, text)

    def _pygame_init(self):
        with self._pygame_lock:
            if self._pygame_ready and self._pygame is not None:
                return self._pygame
            # Evita o banner "Hello from the pygame community" aparecer no chat.
            os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")
            with contextlib.redirect_stdout(io.StringIO()):
                import pygame  # type: ignore
            pygame.mixer.init()
            self._pygame = pygame
            self._pygame_ready = True
            return pygame

    def _pygame_play(self, path: Path) -> None:
        pygame = self._pygame_init()
        with self._pygame_lock:
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass
            pygame.mixer.music.load(str(path))
            pygame.mixer.music.play()
        poll = max(20, int(self.tts_cfg.get('pygame_poll_ms', 80) or 80)) / 1000.0
        timeout = float(self.tts_cfg.get('pygame_play_timeout_sec', 90) or 90)
        start = time.time()
        while True:
            if self._stop_event.is_set():
                self._pygame_stop()
                return
            with self._pygame_lock:
                busy = bool(pygame.mixer.music.get_busy())
            if not busy:
                break
            if timeout > 0 and (time.time() - start) > timeout:
                self._pygame_stop()
                raise TimeoutError('pygame playback excedeu o tempo limite')
            time.sleep(poll)

    def _pygame_stop(self) -> None:
        try:
            if self._pygame_ready and self._pygame is not None:
                with self._pygame_lock:
                    self._pygame.mixer.music.stop()
        except Exception:
            pass

    def _external_play(self, path: Path, text: str = '') -> None:
        if not hasattr(os, 'startfile'):
            raise RuntimeError('os.startfile indisponível neste sistema; player externo deste pack é focado em Windows.')
        os.startfile(str(path))
        self.last_player = 'external'
        words = max(1, len((text or '').split()))
        estimated_sec = min(30.0, max(1.2, words / 2.4 + 0.5))
        end = time.time() + estimated_sec
        while time.time() < end:
            if self._stop_event.is_set():
                return
            time.sleep(0.1)

    def _trim_audio_cache(self) -> None:
        try:
            max_files = int(self.tts_cfg.get('audio_cache_max_files', 80))
            files = sorted((PACK_ROOT / 'data' / 'tts').glob('tts_*.mp3'), key=lambda p: p.stat().st_mtime, reverse=True)
            for p in files[max_files:]:
                try:
                    p.unlink()
                except Exception:
                    pass
        except Exception:
            pass

    def _windows_tts(self, text: str) -> None:
        self._notify_speech_start(text)
        safe = text.replace("'", "''")
        timeout = float(self.tts_cfg.get('windows_timeout_sec', 25))
        ps = "Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate=0; $s.Volume=90; $s.Speak('" + safe + "')"
        subprocess.run(['powershell', '-NoProfile', '-Command', ps], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout)
