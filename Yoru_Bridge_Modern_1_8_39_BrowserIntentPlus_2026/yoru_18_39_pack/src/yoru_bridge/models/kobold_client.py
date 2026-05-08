from __future__ import annotations
import json
import urllib.request
from typing import Any, Dict, List, Callable

class KoboldClient:
    def __init__(self, api_url: str, label: str, timeout: int = 180):
        self.api_url = api_url.rstrip('/')
        self.label = label
        self.timeout = timeout

    def models(self) -> Dict[str, Any]:
        url = self.api_url + '/models'
        with urllib.request.urlopen(url, timeout=8) as r:
            return json.loads(r.read().decode('utf-8', errors='ignore'))

    def chat(self, model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int, extra_params: Dict[str, Any] | None = None) -> str:
        url = self.api_url + '/chat/completions'
        payload = {'model': model, 'messages': messages, 'temperature': temperature, 'max_tokens': max_tokens, 'stream': False}
        if extra_params:
            payload.update(extra_params)
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type':'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            data = json.loads(r.read().decode('utf-8', errors='ignore'))
        try:
            return data['choices'][0]['message']['content'].strip()
        except Exception:
            return str(data)

    def chat_stream(self, model: str, messages: List[Dict[str, str]], temperature: float, max_tokens: int, on_token: Callable[[str], None], extra_params: Dict[str, Any] | None = None) -> str:
        """OpenAI-compatible streaming. Se o servidor não streamar, levanta exceção para fallback."""
        url = self.api_url + '/chat/completions'
        payload = {'model': model, 'messages': messages, 'temperature': temperature, 'max_tokens': max_tokens, 'stream': True}
        if extra_params:
            payload.update(extra_params)
        req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={'Content-Type':'application/json'}, method='POST')
        parts: list[str] = []
        with urllib.request.urlopen(req, timeout=self.timeout) as r:
            for raw in r:
                line = raw.decode('utf-8', errors='ignore').strip()
                if not line:
                    continue
                if line.startswith('data:'):
                    line = line[5:].strip()
                if line == '[DONE]':
                    break
                try:
                    data = json.loads(line)
                    delta = data.get('choices', [{}])[0].get('delta', {}).get('content')
                    if delta is None:
                        delta = data.get('choices', [{}])[0].get('message', {}).get('content')
                    if delta:
                        parts.append(delta)
                        on_token(delta)
                except Exception:
                    continue
        out = ''.join(parts).strip()
        if not out:
            raise RuntimeError('stream sem tokens')
        return out
