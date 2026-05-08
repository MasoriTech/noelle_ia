from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
import webbrowser
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional

from ..config import PACK_ROOT
from ..utils.text import normalize
from ..core.answer_scope import build_scope_instruction, classify_answer_scope


@dataclass
class SearchResult:
    title: str
    url: str
    snippet: str = ""


CURRENT_HINTS = [
    'atual', 'agora', 'hoje', '2026', '2025', 'recente', 'mais novo', 'nova versao', 'nova versão',
    'ultima versao', 'última versão', 'lancamento', 'lançamento', 'noticia', 'notícia', 'noticias', 'notícias',
    'melhor anime', 'anime mais famoso', 'melhores modelos', 'quem ganhou', 'resultado', 'ranking', 'top 10',
    'preco', 'preço', 'download', 'github', 'reddit', 'huggingface'
]

SEARCH_VERBS = [
    'pesquise', 'pesquisa', 'procure', 'buscar', 'busque', 'veja no google', 'olha no google',
    'verifica na internet', 'procura na internet', 'pesquise na internet', 'modo pesquisa'
]

BLOCKED_HINTS = ['redecanais','seriesflix','flixtv','pirata','torrent','xvideos','porn','bet365','aposta']


class WebKnowledge:
    """Pesquisa leve na web para a Yoru.

    Objetivo: quando a pergunta for atual ou o usuário pedir pesquisa, buscar resultados rápidos,
    montar um contexto pequeno e pedir ao THINK para responder com base nas fontes.

    Não usa dependências externas. Se a busca falhar, abre o navegador como fallback.
    """

    def __init__(self, config: Dict[str, Any], vault=None):
        self.config = config
        self.vault = vault
        cfg = config.get('web_knowledge', {})
        self.enabled = bool(cfg.get('enabled', True))
        self.cache_file = PACK_ROOT / cfg.get('cache_file', 'data/web_knowledge_cache.json')
        self.cache_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.cache_file.exists():
            self.cache_file.write_text('{}', encoding='utf-8')

    def cfg(self) -> Dict[str, Any]:
        return self.config.setdefault('web_knowledge', {})

    def status(self) -> str:
        c = self.cfg()
        return (
            f"Web Knowledge: {'ON' if c.get('enabled', True) else 'OFF'} | "
            f"auto={'ON' if c.get('auto_web_fallback', True) else 'OFF'} | "
            f"cache={self.cache_file} | ttl={c.get('cache_ttl_sec', 21600)}s"
        )

    def clear_cache(self) -> int:
        try:
            data = self._load_cache()
            n = len(data)
            self.cache_file.write_text('{}', encoding='utf-8')
            return n
        except Exception:
            self.cache_file.write_text('{}', encoding='utf-8')
            return 0

    def is_search_request(self, text: str) -> bool:
        n = normalize(text)
        return any(v in n for v in SEARCH_VERBS)

    def should_auto_search(self, text: str, profile: str = 'companion') -> bool:
        if not self.cfg().get('auto_web_fallback', True):
            return False
        n = normalize(text)
        if any(b in n for b in BLOCKED_HINTS):
            return False
        if profile in {'technical', 'project'} and not any(x in n for x in ['github','release','versao','versão','download','erro atual','documentacao','documentação']):
            return False
        if any(h in n for h in CURRENT_HINTS):
            return True
        # Perguntas amplas de ranking/opinião atual costumam precisar web.
        if n.startswith(('qual melhor ', 'quais melhores ', 'top ', 'lista de ')):
            return True
        return False

    def clean_query(self, text: str) -> str:
        raw = text.strip()
        patterns = [
            r'^(\/web|\/pesquisa|\/pesquisar|\/google)\s+',
            r'^(pesquise na internet|procura na internet|verifica na internet|procure na internet)\s+',
            r'^(veja no google|olha no google|pesquise no google|pesquisa no google)\s+',
            r'^(pesquise|pesquisa|procure|buscar|busque)\s+',
        ]
        q = raw
        for p in patterns:
            q = re.sub(p, '', q, flags=re.I).strip()
        return q or raw

    def search(self, query: str, max_results: Optional[int] = None) -> List[SearchResult]:
        if not self.enabled or not self.cfg().get('enabled', True):
            return []
        q = self.clean_query(query)
        if any(b in normalize(q) for b in BLOCKED_HINTS):
            return []
        max_results = int(max_results or self.cfg().get('max_results', 5))
        cached = self._cache_get(q)
        if cached:
            return [SearchResult(**r) for r in cached[:max_results]]
        results: List[SearchResult] = []
        # 1) DuckDuckGo HTML.
        try:
            results = self._search_duckduckgo(q, max_results=max_results)
        except Exception:
            results = []
        # 2) Fallback Wikipedia para perguntas conceituais.
        if not results:
            try:
                results = self._search_wikipedia(q, max_results=max_results)
            except Exception:
                results = []
        if results:
            self._cache_set(q, results)
        return results[:max_results]

    def format_sources(self, results: List[SearchResult]) -> str:
        lines = []
        for i, r in enumerate(results, 1):
            title = self._squash(r.title)
            snip = self._squash(r.snippet)
            url = r.url.strip()
            lines.append(f"[{i}] {title}\nURL: {url}\nResumo: {snip}")
        return "\n\n".join(lines)

    def answer_with_sources(self, question: str, model_router, profile: str = 'knowledge') -> tuple[str, bool]:
        """Busca e usa o THINK para responder. Retorna (texto, usou_busca)."""
        q = self.clean_query(question)
        scope = classify_answer_scope(q)
        max_results = int(self.cfg().get('list_max_results', 8)) if scope.kind == 'list_only' else int(self.cfg().get('max_results', 5))
        results = self.search(q, max_results=max_results)
        if not results:
            url = 'https://www.google.com/search?q=' + urllib.parse.quote_plus(q)
            if self.cfg().get('open_browser_if_search_fails', True):
                webbrowser.open(url)
            return (
                f"Não consegui ler resultados automaticamente agora. Abri a busca no navegador para: {q}",
                False,
            )
        sources = self.format_sources(results)
        scope_instruction = build_scope_instruction(q, self.config)
        system = (
            "Você é Yoru, uma IA companion de projeto. Responda em português do Brasil. "
            "Use SOMENTE as fontes fornecidas abaixo. Se as fontes forem insuficientes, diga que não dá para garantir. "
            "Obedeça exatamente ao escopo do pedido: não dê aula, sinopse, histórico ou curiosidades se o usuário não pediu. "
            "Cite fontes no formato [1], [2], sem Markdown decorativo.\n"
            + scope_instruction
        )
        user = (
            f"Pergunta do usuário: {q}\n\n"
            f"Tipo de resposta esperado: {scope.label}\n"
            f"Resultados encontrados:\n{sources}\n\n"
            "Responda com base nesses resultados e no contrato de escopo. No final, inclua uma linha curta: Fontes: [números usados]."
        )
        try:
            # Sem stream aqui para evitar imprimir rascunho e depois corrigir. Se falhar, não cai no FAST inventando.
            old_fb = self.config.setdefault('runtime', {}).get('fallback_to_fast', False)
            self.config['runtime']['fallback_to_fast'] = False
            try:
                ans, used, _ = model_router.complete('think', system, user, [], profile, None)
            finally:
                self.config['runtime']['fallback_to_fast'] = old_fb
            if not ans or ans.startswith('[ERRO MODELO]'):
                ans = self._fallback_answer(q, results, ans)
        except Exception as e:
            ans = self._fallback_answer(q, results, f'erro: {e}')
        if self.cfg().get('save_summaries_to_obsidian', True):
            self._save_summary(q, ans, results)
        return ans, True

    def _fallback_answer(self, q: str, results: List[SearchResult], err: str = '') -> str:
        top = results[0]
        msg = f"Encontrei resultados, mas o THINK não conseguiu montar a resposta agora. Resultado principal: {top.title} — {top.snippet or top.url} [1]"
        if err:
            msg += f"\nAviso técnico: {err[:180]}"
        return msg

    def _save_summary(self, q: str, ans: str, results: List[SearchResult]) -> None:
        if not self.vault:
            return
        try:
            top_urls = '; '.join(r.url for r in results[:3])
            text = f"Pesquisa: {q}\nResumo: {self._squash(ans)[:500]}\nFontes: {top_urls}"
            self.vault.append_memory('05_MEMORIA/cache_pesquisas.md', text)
        except Exception:
            pass

    def _search_duckduckgo(self, query: str, max_results: int = 5) -> List[SearchResult]:
        q = urllib.parse.quote_plus(query)
        url = f'https://duckduckgo.com/html/?q={q}'
        html_text = self._fetch(url)
        # Resultados no DDG HTML têm result__a e result__snippet.
        # Parse leve por blocos.
        blocks = re.split(r'<div class="result', html_text)
        out: List[SearchResult] = []
        for block in blocks:
            if 'result__a' not in block:
                continue
            m = re.search(r'<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, flags=re.S|re.I)
            if not m:
                continue
            href = html.unescape(m.group(1))
            title = self._strip_tags(m.group(2))
            href = self._decode_ddg_url(href)
            sm = re.search(r'<a[^>]+class="result__snippet"[^>]*>(.*?)</a>|<div[^>]+class="result__snippet"[^>]*>(.*?)</div>', block, flags=re.S|re.I)
            snippet = ''
            if sm:
                snippet = self._strip_tags(sm.group(1) or sm.group(2) or '')
            if href and title and not any(b in href.lower() for b in BLOCKED_HINTS):
                out.append(SearchResult(title=title, url=href, snippet=snippet))
            if len(out) >= max_results:
                break
        if not out:
            # Lite fallback parse.
            lite = self._fetch(f'https://lite.duckduckgo.com/lite/?q={q}')
            for m in re.finditer(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', lite, flags=re.S|re.I):
                title = self._strip_tags(m.group(2))
                href = self._decode_ddg_url(html.unescape(m.group(1)))
                if title and href.startswith(('http://','https://')) and 'duckduckgo.com' not in href:
                    out.append(SearchResult(title=title, url=href, snippet=''))
                if len(out) >= max_results:
                    break
        return out

    def _search_wikipedia(self, query: str, max_results: int = 5) -> List[SearchResult]:
        q = urllib.parse.quote(query)
        url = f'https://pt.wikipedia.org/w/api.php?action=opensearch&search={q}&limit={max_results}&namespace=0&format=json'
        data = json.loads(self._fetch(url))
        titles = data[1] if len(data) > 1 else []
        snippets = data[2] if len(data) > 2 else []
        urls = data[3] if len(data) > 3 else []
        out = []
        for title, snip, u in zip(titles, snippets, urls):
            out.append(SearchResult(title=title, url=u, snippet=snip))
        return out

    def _fetch(self, url: str) -> str:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 YoruBridge/1.8.39',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.7',
        })
        timeout = float(self.cfg().get('timeout_sec', 8))
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read(int(self.cfg().get('max_download_bytes', 600_000)))
        enc = 'utf-8'
        try:
            enc = r.headers.get_content_charset() or 'utf-8'
        except Exception:
            pass
        return raw.decode(enc, errors='ignore')

    def _decode_ddg_url(self, href: str) -> str:
        if href.startswith('//duckduckgo.com/l/?') or href.startswith('https://duckduckgo.com/l/?') or href.startswith('/l/?'):
            parsed = urllib.parse.urlparse(href if href.startswith('http') else 'https://duckduckgo.com' + href)
            qs = urllib.parse.parse_qs(parsed.query)
            if 'uddg' in qs:
                return qs['uddg'][0]
        return href

    def _strip_tags(self, s: str) -> str:
        s = re.sub(r'<script.*?</script>|<style.*?</style>', '', s, flags=re.S|re.I)
        s = re.sub(r'<[^>]+>', ' ', s)
        return self._squash(html.unescape(s))

    def _squash(self, s: str) -> str:
        return re.sub(r'\s+', ' ', (s or '')).strip()

    def _load_cache(self) -> Dict[str, Any]:
        try:
            return json.loads(self.cache_file.read_text(encoding='utf-8'))
        except Exception:
            return {}

    def _cache_get(self, query: str) -> Optional[List[Dict[str, str]]]:
        data = self._load_cache()
        key = normalize(query)
        item = data.get(key)
        if not item:
            return None
        ttl = int(self.cfg().get('cache_ttl_sec', 21600))
        if time.time() - float(item.get('ts', 0)) > ttl:
            return None
        return item.get('results') or None

    def _cache_set(self, query: str, results: List[SearchResult]) -> None:
        data = self._load_cache()
        key = normalize(query)
        data[key] = {'ts': time.time(), 'results': [asdict(r) for r in results]}
        # mantém pequeno
        max_items = int(self.cfg().get('cache_max_items', 80))
        if len(data) > max_items:
            oldest = sorted(data.items(), key=lambda kv: kv[1].get('ts', 0))[: len(data)-max_items]
            for k, _ in oldest:
                data.pop(k, None)
        self.cache_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
