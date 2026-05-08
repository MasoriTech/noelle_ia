from __future__ import annotations
import json, re, webbrowser, urllib.parse, difflib
from pathlib import Path
from typing import Dict, Any
from ..config import PACK_ROOT
from ..utils.text import normalize

DEFAULT_SITES = {
    'navegador': 'about:blank',
    'google': 'https://www.google.com',
    'youtube': 'https://www.youtube.com',
    'netflix': 'https://www.netflix.com',
    'hbo max': 'https://www.max.com',
    'max': 'https://www.max.com',
    'whatsapp': 'https://web.whatsapp.com/',
    'github': 'https://github.com',
    'reddit': 'https://www.reddit.com',
    'huggingface': 'https://huggingface.co',
    'wikipedia': 'https://pt.wikipedia.org',
    'crunchyroll': 'https://www.crunchyroll.com',
    'myanimelist': 'https://myanimelist.net',
    'anilist': 'https://anilist.co',
    'spotify': 'https://open.spotify.com',
    'twitch': 'https://www.twitch.tv',
    'twitter': 'https://x.com',
}

SEARCH_URLS = {
    'google': 'https://www.google.com/search?q={q}',
    'youtube': 'https://www.youtube.com/results?search_query={q}',
    'github': 'https://github.com/search?q={q}',
    'reddit': 'https://www.reddit.com/search/?q={q}',
    'huggingface': 'https://huggingface.co/search/full-text?q={q}',
    'wikipedia': 'https://pt.wikipedia.org/w/index.php?search={q}',
    'myanimelist': 'https://myanimelist.net/search/all?q={q}',
}

BLOCKED_HINTS = ['redecanais','seriesflix','flixtv','pirata','torrent','xvideos','porn','bet365','aposta']

# 1.8.40: mantém tolerância maior para erro de digitação/STT.
# Exemplos reais corrigidos: youbue/youtube, pquise/pequise/pesquie/pesqusia.
SEARCH_VERB_RE = r'(?:pesquisar|pesquise|pesquisa|pesquis[ae]|pesqusia|pesquie|pesq(?:u)?ise|pquise|pequise|pequ(?:i)?se|pequisa|procure|procura|buscar|busque|busca)'
OPEN_VERB_RE = r'(?:abra|abre|abrir|abri|abrir\s+o|abrir\s+a)'

SITE_ALIASES = {
    'yt': 'youtube',
    'you tube': 'youtube',
    'yotube': 'youtube',
    'youtub': 'youtube',
    'youtbe': 'youtube',
    'youtue': 'youtube',
    'youbue': 'youtube',
    'yutub': 'youtube',
    'yutube': 'youtube',
    'youtube com': 'youtube',
    'google com': 'google',
    'gogle': 'google',
    'googl': 'google',
    'gooogle': 'google',
    'zap': 'whatsapp',
    'whatsapp web': 'whatsapp',
    'hbo': 'max',
    'hbo max': 'hbo max',
    'x': 'twitter',
    'twitter': 'twitter',
}

_CONNECTORS_RE = r'\s+(?:e|para|pra|por|sobre|no|na|em|pelo|pela|com)\s+'


def _collapse(s: str) -> str:
    return re.sub(r'\s+', ' ', (s or '').strip())


def _clean_site_fragment(site: str) -> str:
    s = _collapse(site)
    s = re.sub(r'\b(?:para mim|pra mim|por favor|por gentileza)\b', ' ', s, flags=re.I)
    s = re.sub(r'\b(?:site|site do|site da)\b', ' ', s, flags=re.I)
    s = re.sub(r'^\s*(?:o|a|os|as|do|da|de|no|na|em)\s+', '', s, flags=re.I)
    s = _collapse(s)
    return _canonical_site(s)


def _clean_query_fragment(query: str) -> str:
    q = _collapse(query)
    # remove cortesia no começo ou no fim. Ex: "pesquie para mim roberto carlos".
    q = re.sub(r'^\s*(?:para mim|pra mim|por favor|por gentileza)\s+', '', q, flags=re.I)
    q = re.sub(r'\b(?:para mim|pra mim|por favor|por gentileza)\b\s*$', '', q, flags=re.I)
    q = re.sub(r'^\s*(?:por|sobre|de)\s+', '', q, flags=re.I)
    q = re.sub(r'\s+(?:para mim|pra mim|por favor|por gentileza)\s*$', '', q, flags=re.I)
    return _collapse(q)


def _canonical_site(site: str) -> str:
    key = normalize(site).strip()
    for prefix in ('o ', 'a ', 'os ', 'as ', 'site ', 'site do ', 'site da ', 'do ', 'da ', 'de ', 'no ', 'na ', 'em '):
        if key.startswith(prefix):
            key = key[len(prefix):].strip()
    key = SITE_ALIASES.get(key, key)
    if key in DEFAULT_SITES or key in SEARCH_URLS:
        return key
    # Tolerância leve para site curto digitado/escutado errado. Só aplica em candidatos pequenos.
    if len(key) <= 14 and key.replace(' ', '').isalpha():
        names = list(DEFAULT_SITES) + list(SEARCH_URLS) + list(SITE_ALIASES)
        match = difflib.get_close_matches(key, names, n=1, cutoff=0.74)
        if match:
            return SITE_ALIASES.get(match[0], match[0])
    return key


def _strip_open_prefix(raw: str) -> str:
    return re.sub(rf'^\s*{OPEN_VERB_RE}\s+', '', raw, flags=re.I).strip()


def _strip_search_prefix(raw: str) -> str:
    return re.sub(rf'^\s*{SEARCH_VERB_RE}\s+', '', raw, flags=re.I).strip()


def _known_site_from_start(fragment: str) -> tuple[str, str] | None:
    """Extrai site no começo do texto e devolve (site, resto).

    Ajuda quando o usuário fala: "abra o youtube e pquise roberto carlos".
    """
    f = _collapse(fragment)
    f = re.sub(r'^\s*(?:o|a|os|as|no|na|em|do|da|de)\s+', '', f, flags=re.I)
    norm = normalize(f)
    candidates = sorted(set(list(DEFAULT_SITES) + list(SEARCH_URLS) + list(SITE_ALIASES)), key=len, reverse=True)
    for cand in candidates:
        c = normalize(cand)
        if norm == c:
            return (_canonical_site(cand), '')
        if norm.startswith(c + ' '):
            # preserva o resto no texto original por aproximação simples.
            words = c.split()
            rest_words = f.split()[len(words):]
            return (_canonical_site(cand), ' '.join(rest_words))
    # Se a primeira palavra parecer typo de site conhecido.
    first, _, rest = f.partition(' ')
    site = _canonical_site(first)
    if site != normalize(first) and (site in DEFAULT_SITES or site in SEARCH_URLS):
        return (site, rest)
    return None


def parse_browser_intent(text: str):
    """Return ('open', site, '') or ('search', site, query) for browser commands.

    Tolerante com fala/typos de STT: abri/abre/abra, youtube/youbue,
    pesquisa/pesqusia/pesquie/pquise/pequise, "para mim" etc.
    Isso impede que comandos de navegador caiam no modelo.
    """
    raw = (text or '').strip()
    if not raw:
        return None
    n = normalize(raw)

    # Comandos slash oficiais.
    if n.startswith('/abrir '):
        return ('open', raw.split(' ', 1)[1].strip(), '')
    if n.startswith('/pesquisa ') or n.startswith('/pesquisar '):
        return ('search', 'google', raw.split(' ', 1)[1].strip())
    if n.startswith('/pesquisar-em '):
        rest = raw.split(' ', 1)[1].strip()
        site, _, q = rest.partition(' ')
        return ('search', site, q.strip()) if q.strip() else ('open', site, '')

    # "abre/abri o youtube para mim e pesquisa gojo vs sukuna amv"
    m = re.match(rf'^\s*{OPEN_VERB_RE}\s+(.+?)\s+(?:para mim\s+|pra mim\s+)?e\s+{SEARCH_VERB_RE}\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        site = _clean_site_fragment(m.group(1))
        query = _clean_query_fragment(m.group(2))
        if site and query:
            return ('search', site, query)

    # "abre youtube pesquisar gojo" / "abre google pquise ronaldo"
    m = re.match(rf'^\s*{OPEN_VERB_RE}\s+(.+?)\s+{SEARCH_VERB_RE}\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        site = _clean_site_fragment(m.group(1))
        query = _clean_query_fragment(m.group(2))
        if site and query:
            return ('search', site, query)

    # Fallback robusto para: "abra o youtube e pquise para mim roberto carlos".
    if re.match(rf'^\s*{OPEN_VERB_RE}\s+', raw, flags=re.I):
        rest = _strip_open_prefix(raw)
        start = _known_site_from_start(rest)
        if start:
            site, after_site = start
            after_site_clean = _collapse(after_site)
            # remove conector e verbo de busca depois do site.
            after_site_clean = re.sub(r'^\s*(?:e|para|pra|por favor|por gentileza)\s+', '', after_site_clean, flags=re.I)
            if re.match(rf'^{SEARCH_VERB_RE}\b', after_site_clean, flags=re.I):
                query = _clean_query_fragment(_strip_search_prefix(after_site_clean))
                if query:
                    return ('search', site, query)
            if not after_site_clean:
                return ('open', site, '')

    # "pesquisa gojo vs sukuna amv no youtube"
    m = re.match(rf'^\s*{SEARCH_VERB_RE}\s+(.+?)\s+(?:no|na|em|pelo|pela)\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        site = _clean_site_fragment(m.group(2))
        query = _clean_query_fragment(m.group(1))
        if site and query:
            return ('search', site, query)

    # "pesquisa no youtube gojo vs sukuna amv"
    m = re.match(rf'^\s*{SEARCH_VERB_RE}\s+(?:no|na|em|pelo|pela)\s+(.+?)\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        site = _clean_site_fragment(m.group(1))
        query = _clean_query_fragment(m.group(2))
        if site and query:
            return ('search', site, query)

    # "veja no google gojo" / "olha no google gojo"
    m = re.match(r'^\s*(?:veja|olha)\s+no\s+google\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        return ('search', 'google', _clean_query_fragment(m.group(1)))

    # "abre youtube" / "abri o youtube pra mim".
    m = re.match(rf'^\s*{OPEN_VERB_RE}\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        site = _clean_site_fragment(m.group(1))
        return ('open', site, '')

    # "pesquisa gojo" -> Google por padrão.
    m = re.match(rf'^\s*{SEARCH_VERB_RE}\s+(.+?)\s*$', raw, flags=re.I)
    if m:
        query = _clean_query_fragment(m.group(1))
        return ('search', 'google', query) if query else None

    return None


def _is_known_web_target(site: str) -> bool:
    key = _canonical_site(site)
    if key in DEFAULT_SITES or key in SEARCH_URLS:
        return True
    # domínio explícito digitado pelo usuário: abra example.com
    if "." in key and " " not in key:
        return True
    return False


def looks_like_browser_command(text: str) -> bool:
    intent = parse_browser_intent(text)
    if intent is None:
        return False
    kind, site, query = intent
    n = normalize(text or "")
    # Comandos slash continuam sendo tratados como navegador.
    if n.startswith(('/abrir ', '/pesquisa ', '/pesquisar ', '/pesquisar-em ', '/site', '/sites')):
        return True
    # Pesquisa sempre é navegador, porque pode cair no Google por padrão.
    if kind == 'search':
        return True
    # Abrir site natural só é navegador se for site conhecido/domínio explícito.
    # Ex.: "abra youtube" -> navegador; "abra hydra" -> app local.
    if kind == 'open':
        return _is_known_web_target(site)
    return True


class BrowserSkill:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.custom_file = PACK_ROOT / config.get('browser',{}).get('safe_sites_file','data/custom_sites.json')
        self.custom_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.custom_file.exists():
            self.custom_file.write_text('{}', encoding='utf-8')

    def custom_sites(self) -> Dict[str, str]:
        try:
            return json.loads(self.custom_file.read_text(encoding='utf-8'))
        except Exception:
            return {}

    def sites(self) -> Dict[str, str]:
        out = dict(DEFAULT_SITES)
        out.update(self.custom_sites())
        return out

    def _site_key(self, site: str) -> str:
        return _canonical_site(site)

    def handle(self, text: str) -> str | None:
        raw = text.strip()
        n = normalize(raw)
        if n.startswith('/sites'):
            names = ', '.join(sorted(self.sites()))
            return 'Sites conhecidos: ' + names
        if n.startswith('/site add '):
            parts = raw.split(' ', 3)
            if len(parts) < 4:
                return 'Use: /site add nome https://site.com'
            return self.add_site(parts[2], parts[3])
        if n.startswith('/site remover '):
            name = raw.split(' ', 2)[2]
            return self.remove_site(name)
        intent = parse_browser_intent(raw)
        if intent:
            kind, site, query = intent
            if kind == 'open':
                return self.open_site(site)
            if kind == 'search':
                return self.search(site, query)
        return None

    def looks_like_command(self, text: str) -> bool:
        return looks_like_browser_command(text)

    def _safe_url(self, url: str) -> bool:
        low = url.lower()
        return low.startswith(('https://','http://','about:')) and not any(x in low for x in BLOCKED_HINTS)

    def add_site(self, name: str, url: str) -> str:
        key = normalize(name)
        if any(x in key or x in url.lower() for x in BLOCKED_HINTS):
            return 'Não vou salvar esse site. Ele parece problemático para automação.'
        if not self._safe_url(url):
            return 'Use uma URL http/https válida.'
        sites = self.custom_sites()
        sites[key] = url
        self.custom_file.write_text(json.dumps(sites, ensure_ascii=False, indent=2), encoding='utf-8')
        return f'Site salvo: {key} -> {url}'

    def remove_site(self, name: str) -> str:
        key = normalize(name)
        sites = self.custom_sites()
        if key in sites:
            del sites[key]
            self.custom_file.write_text(json.dumps(sites, ensure_ascii=False, indent=2), encoding='utf-8')
            return f'Site removido: {key}'
        return 'Site não encontrado nos personalizados.'

    def open_site(self, site: str) -> str:
        key = self._site_key(site)
        url = self.sites().get(key)
        if not url and '.' in key:
            url = 'https://' + key
        if not url:
            return f'Não conheço esse site. Use /site add {site} https://site.com para salvar.'
        if not self._safe_url(url):
            return 'Site bloqueado por segurança.'
        webbrowser.open(url)
        pretty = 'YouTube' if key == 'youtube' else ('Google' if key == 'google' else site)
        return f'Abrindo {pretty}.'

    def search(self, site: str, query: str) -> str:
        key = self._site_key(site)
        query = _clean_query_fragment(query)
        if not query:
            return f'O que você quer pesquisar em {site}?'
        q = urllib.parse.quote_plus(query.strip())
        if any(x in key or x in query.lower() for x in BLOCKED_HINTS):
            return 'Não vou pesquisar isso por segurança.'
        template = SEARCH_URLS.get(key)
        if template:
            url = template.format(q=q)
        elif key in self.sites():
            domain = urllib.parse.urlparse(self.sites()[key]).netloc or self.sites()[key].replace('https://','').replace('http://','').split('/')[0]
            url = f'https://www.google.com/search?q=site%3A{urllib.parse.quote_plus(domain)}+{q}'
        else:
            # Melhor fallback: se o site não é conhecido, pesquisa no Google em vez de inventar que não existe.
            key = 'google'
            url = 'https://www.google.com/search?q=' + q
        webbrowser.open(url)
        pretty = 'YouTube' if key == 'youtube' else ('Google' if key == 'google' else site)
        return f'Pesquisando "{query}" em {pretty}.'
