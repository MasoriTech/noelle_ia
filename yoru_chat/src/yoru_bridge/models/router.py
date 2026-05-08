from __future__ import annotations
from typing import Dict, Any, List, Tuple, Callable
import time
from .kobold_client import KoboldClient

class ModelRouter:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        rt = config.get('runtime', {})
        fast = config['models']['fast']
        think = config['models']['think']
        self.clients = {
            'fast': KoboldClient(fast['api_url'], fast.get('label','FAST'), int(rt.get('fast_timeout_sec', rt.get('request_timeout_sec', 80)))),
            'think': KoboldClient(think['api_url'], think.get('label','THINK'), int(rt.get('think_timeout_sec', rt.get('request_timeout_sec', 140)))),
        }
        self._fail_until: Dict[str, float] = {}

    def check(self) -> Dict[str, str]:
        out = {}
        for name, client in self.clients.items():
            try:
                out[name] = str(client.models())
            except Exception as e:
                out[name] = f'ERRO: {e}'
        return out

    def _messages(self, system_prompt: str, user_text: str, history: List[Tuple[str,str]] | None):
        messages = [{'role': 'system', 'content': system_prompt}]
        for u, a in (history or []):
            messages.append({'role':'user','content':u})
            messages.append({'role':'assistant','content':a})
        messages.append({'role':'user','content':user_text})
        return messages

    def _is_in_cooldown(self, key: str) -> bool:
        return time.monotonic() < self._fail_until.get(key, 0.0)

    def _mark_fail(self, key: str) -> None:
        cooldown = float(self.config.get('runtime', {}).get('model_fail_cooldown_sec', 25))
        self._fail_until[key] = time.monotonic() + cooldown

    def _clear_fail(self, key: str) -> None:
        self._fail_until.pop(key, None)


    def _sampling_params(self, cfg: Dict[str, Any]) -> Dict[str, Any]:
        """Parâmetros extras aceitos por muitos endpoints OpenAI-compatible/KoboldCpp.
        Se o backend ignorar algum campo, a chamada continua funcionando.
        """
        allowed = ('top_p', 'top_k', 'min_p', 'repeat_penalty', 'presence_penalty', 'frequency_penalty', 'typical_p')
        out: Dict[str, Any] = {}
        for k in allowed:
            if k in cfg and cfg[k] is not None:
                out[k] = cfg[k]
        if isinstance(cfg.get('stop'), list):
            out['stop'] = cfg['stop']
        return out

    def complete(self, model_key: str, system_prompt: str, user_text: str, history: List[Tuple[str,str]] | None = None, profile: str = 'companion', on_token: Callable[[str], None] | None = None) -> tuple[str, str, bool]:
        key = model_key if model_key in ('fast','think') else 'fast'
        if self._is_in_cooldown(key):
            if key == 'think' and self.config.get('runtime', {}).get('fallback_to_fast', True):
                key = 'fast'
            else:
                return f'[ERRO MODELO] {key.upper()} em cooldown por falha recente.', key, False
        cfg = self.config['models'][key]
        xparams = self._sampling_params(cfg)
        messages = self._messages(system_prompt, user_text, history)
        try:
            if on_token and self.config.get('runtime', {}).get('stream_model_output', True):
                ans = self.clients[key].chat_stream(cfg.get('model','koboldcpp'), messages, float(cfg.get('temperature',0.4)), int(cfg.get('max_tokens',160)), on_token, xparams)
                self._clear_fail(key)
                return ans, key, True
            ans = self.clients[key].chat(cfg.get('model','koboldcpp'), messages, float(cfg.get('temperature',0.4)), int(cfg.get('max_tokens',160)), xparams)
            self._clear_fail(key)
            return ans, key, False
        except Exception as e:
            rt = self.config.get('runtime', {})
            err_text = str(e).lower()
            # Se o endpoint de streaming abrir mas não devolver tokens, tenta uma chamada normal sem stream.
            # Isso evita respostas tipo: [ERRO MODELO] stream sem tokens.
            if on_token and ('stream sem tokens' in err_text or rt.get('stream_retry_same_model', False)):
                try:
                    ans = self.clients[key].chat(cfg.get('model','koboldcpp'), messages, float(cfg.get('temperature',0.4)), int(cfg.get('max_tokens',160)), xparams)
                    if ans and ans.strip():
                        self._clear_fail(key)
                        return ans, key, False
                except Exception as e_non:
                    e = e_non
            if key == 'think' and rt.get('fallback_to_fast', True):
                fcfg = self.config['models']['fast']
                fxparams = self._sampling_params(fcfg)
                # Fallback rápido: sem histórico extra e com max_tokens menor.
                fallback_messages = self._messages(system_prompt, user_text, [])
                try:
                    ans = self.clients['fast'].chat(fcfg.get('model','koboldcpp'), fallback_messages, float(fcfg.get('temperature',0.38)), min(int(fcfg.get('max_tokens',80)), 90), fxparams)
                    self._clear_fail('fast')
                    return ans + "\n\n[aviso] THINK demorou/falhou; usei FAST como fallback rápido.", 'fast', False
                except Exception as e2:
                    self._mark_fail(key)
                    self._mark_fail('fast')
                    return f"[ERRO MODELO] THINK falhou: {e} | FAST também falhou: {e2}", key, False
            self._mark_fail(key)
            return f"[ERRO MODELO] {e}", key, False
