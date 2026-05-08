from __future__ import annotations
from pathlib import Path
import os
from datetime import datetime
from typing import Dict, Any, List, Tuple
import time

class VaultStore:
    """Leitor/escritor leve do vault Obsidian.

    1.8.4: memória seletiva por perfil + cache curto.
    Isso evita ler todos os .md a cada mensagem e reduz prompt para o Qwen.
    """
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        raw_path = str(config.get('vault_path') or '')
        # Suporta %USERPROFILE% no Windows e usa HOME como fallback fora do Windows.
        userprofile = os.environ.get('USERPROFILE') or str(Path.home())
        raw_path = raw_path.replace('%USERPROFILE%', userprofile)
        for key, value in os.environ.items():
            raw_path = raw_path.replace(f'%{key}%', value)
        raw_path = os.path.expandvars(os.path.expanduser(raw_path))
        if os.name != 'nt':
            raw_path = raw_path.replace('\\', '/')
        self.path = Path(raw_path)
        self._cache: Dict[str, Tuple[float, str]] = {}

    def exists(self) -> bool:
        return bool(str(self.path)) and self.path.exists()

    def ensure(self) -> None:
        self.path.mkdir(parents=True, exist_ok=True)
        for rel in [
            '03_PROMPTS','04_FLUXOS','05_MEMORIA','06_TESTES','10_DECISOES','12_ROTEIRO_2026','99_SESSOES'
        ]:
            (self.path / rel).mkdir(parents=True, exist_ok=True)
        defaults = {
            '05_MEMORIA/memoria_base.md': '# Memória Base da Yoru\n\n- Motor atual: KoboldCpp oldpc/noavx2.\n- Modelo FAST: Qwen3.5 0.8B.\n- Modelo THINK: Qwen3.5 2B.\n- Obsidian é a memória oficial.\n',
            '05_MEMORIA/skills_ativas.md': '# Skills Ativas\n\n- Chat texto com FAST, THINK e DUAL.\n- Modo widget/companheira com respostas curtas.\n- /skills, /habilidades e perguntas naturais sobre capacidades.\n- App Inventory: /apps scan, /apps list, /apps buscar, /apps abrir.\n- Memória/vault local e exportação de sessão.\n- Navegador, pesquisa e Web Knowledge quando configurado.\n- Chat de voz por /ouvir, STT e TTS quando instalados.\n- Chat Stream experimental com VAD.\n- Diagnóstico/performance: /perf, /check, /modelos.\n',
            '05_MEMORIA/regras_de_verdade.md': '# Regras de Verdade\n\n- A Yoru não deve fingir funções que não existem.\n- A Yoru não controla o PC livremente.\n- A Yoru só abre sites via skill segura.\n- Responder exatamente o escopo pedido: lista sem resumo, data direta, sim/não direto, detalhe só quando o usuário pedir.\n',
            '05_MEMORIA/preferencias_do_usuario.md': '# Preferências do Usuário\n\n- Ir direto ao ponto.\n- Estabilidade antes de visual.\n- Poucos BATs e menus claros.\n- Priorizar velocidade e fallback.\n',
            '05_MEMORIA/correcoes_de_conhecimento.md': '# Correções de Conhecimento\n\n- Asta é o protagonista de Black Clover; nasceu sem magia e usa anti-magia por meio de espadas.\n- O Navio de Teseu discute identidade quando partes de um objeto são substituídas.\n',
            '05_MEMORIA/ajustes_de_personalidade.md': '# Ajustes de Personalidade\n\n- Soar como companion de projeto, não atendente genérica.\n- Responder curto quando a pergunta for simples, mas completo quando o usuário pedir detalhe.\n',
        }
        for rel, content in defaults.items():
            p = self.path / rel
            if not p.exists():
                p.write_text(content, encoding='utf-8')

    def _rels_for_profile(self, profile: str) -> List[str]:
        mem = self.config.get('memory', {})
        strategy = str(mem.get('strategy', 'selective')).lower()
        if strategy == 'selective':
            table = mem.get('profile_files', {}) or {}
            rels = table.get(profile) or table.get('companion') or []
            return list(rels)
        return list(mem.get('files', []))

    def read_memory(self, profile: str = 'auto', model_key: str = 'auto') -> str:
        if not self.exists():
            return ''
        runtime = self.config.get('runtime', {})
        if model_key == 'fast' and runtime.get('skip_memory_for_fast', True):
            return ''
        ttl = int(self.config.get('memory', {}).get('cache_ttl_sec', 20))
        cache_key = f'{profile}:{model_key}'
        now = time.monotonic()
        if cache_key in self._cache:
            ts, txt = self._cache[cache_key]
            if now - ts <= ttl:
                return txt
        max_chars = int(self.config.get('memory', {}).get('max_chars_per_file', 650))
        budget = int(runtime.get('prompt_token_budget_chars', 2600))
        rels = self._rels_for_profile(profile)
        chunks = []
        total = 0
        for rel in rels:
            p = self.path / rel
            if p.exists() and p.is_file():
                try:
                    txt = p.read_text(encoding='utf-8', errors='ignore').strip()
                    if not txt:
                        continue
                    piece = f"[{rel}]\n" + txt[:max_chars]
                    if total + len(piece) > budget:
                        break
                    chunks.append(piece)
                    total += len(piece)
                except Exception:
                    pass
        out = "\n\n".join(chunks)
        self._cache[cache_key] = (now, out)
        return out

    def append_memory(self, rel: str, text: str) -> Path:
        self.ensure()
        p = self.path / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        with p.open('a', encoding='utf-8') as f:
            f.write(f"\n- [{stamp}] {text.strip()}\n")
        self._cache.clear()
        return p

    def export_session(self, lines: list[str]) -> Path:
        self.ensure()
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        p = self.path / '99_SESSOES' / f'sessao_yoru_{stamp}.md'
        p.write_text('# Sessão Yoru\n\n' + '\n'.join(lines), encoding='utf-8')
        return p
