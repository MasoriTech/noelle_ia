from __future__ import annotations

import difflib
import json
import os
import platform
import re
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from ..config import PACK_ROOT
from ..utils.text import normalize

_SKIP_NAME_HINTS = {
    'uninstall', 'desinstalar', 'remove', 'remover', 'setup', 'installer', 'install',
    'readme', 'leia-me', 'manual', 'help', 'ajuda', 'documentation', 'docs', 'update',
    'updater', 'repair', 'modify', 'license', 'licença', 'licenca'
}

_APP_CMD_PREFIXES = (
    'abra o programa ', 'abre o programa ', 'abrir o programa ',
    'abra programa ', 'abre programa ', 'abrir programa ',
    'abra o app ', 'abre o app ', 'abrir o app ',
    'abra app ', 'abre app ', 'abrir app ',
    'execute ', 'executa ', 'rodar ', 'rode ', 'inicie ', 'iniciar ',
)
# Não entra em looks_like_app_command para não roubar "abra youtube" antes do BrowserSkill.
# É usado apenas quando o router já decidiu que não era navegador.
_GENERIC_OPEN_PREFIXES = (
    'abra ', 'abre ', 'abrir ', 'abri ', 'inicie ', 'iniciar ', 'execute ', 'executa ', 'rode ', 'rodar ',
)

_STATUS_PHRASES = {
    'programas', 'meus programas', 'apps', 'aplicativos',
    'quais programas tenho', 'que programas tenho', 'lista programas', 'listar programas',
    'mostra meus programas', 'mostrar meus programas'
}

_SCAN_PHRASES = {
    'escaneia meus programas', 'escaneie meus programas', 'scan programas',
    'atualiza programas', 'atualize programas', 'reindexa programas', 'reindexe programas'
}


def _clean_shortcut_name(name: str) -> str:
    name = re.sub(r'\s*\([^)]*\)\s*$', '', name).strip()
    name = re.sub(r'\s+', ' ', name).strip()
    return name


def _looks_like_helper(name: str) -> bool:
    n = normalize(name)
    return any(h in n for h in _SKIP_NAME_HINTS)


def _strip_icon_path(value: str) -> str:
    raw = (value or '').strip().strip('"')
    # Registry DisplayIcon often uses: C:\Path\app.exe,0
    if ',' in raw:
        left, right = raw.rsplit(',', 1)
        if right.strip().lstrip('-').isdigit():
            raw = left.strip().strip('"')
    return os.path.expandvars(raw)


def _safe_existing_launch_path(path: str) -> str:
    p = Path(os.path.expandvars(path.strip().strip('"')))
    if p.exists() and p.suffix.lower() in {'.exe', '.lnk', '.appref-ms'}:
        return str(p)
    return ''


class AppInventorySkill:
    """Inventário local de programas do PC.

    A skill salva somente um índice local em data/apps_inventory.json. Ela não envia a
    lista para internet nem para o modelo. Abertura automática é conservadora: usa
    atalhos do Menu Iniciar ou executáveis encontrados de forma explícita.
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.cfg = config.get('apps', {})
        self.enabled = bool(self.cfg.get('enabled', True))
        self.db_file = PACK_ROOT / self.cfg.get('inventory_file', 'data/apps_inventory.json')
        self.prefs_file = PACK_ROOT / self.cfg.get('apps_prefs_file', 'data/apps_prefs.json')
        self.db_file.parent.mkdir(parents=True, exist_ok=True)
        self.prefs_file.parent.mkdir(parents=True, exist_ok=True)

    def status(self) -> str:
        db = self._load_db()
        prefs = self._load_prefs()
        favs = len(prefs.get('favorites', []))
        recent = len(prefs.get('recent', []))
        if not db:
            return f'App Inventory: {"ON" if self.enabled else "OFF"} | apps=0 | favoritos={favs} | recentes={recent} | atualizado=nunca | use /apps scan | arquivo={self.db_file}'
        count = len(db.get('apps', []))
        gen = db.get('generated_at') or 'nunca'
        return f'App Inventory: {"ON" if self.enabled else "OFF"} | apps={count} | favoritos={favs} | recentes={recent} | atualizado={gen} | arquivo={self.db_file}'

    def looks_like_app_command(self, text: str) -> bool:
        n = normalize(text or '')
        if n.startswith('/apps') or n.startswith('/programas'):
            return True
        if n in _STATUS_PHRASES or n in _SCAN_PHRASES:
            return True
        return any(n.startswith(p) for p in _APP_CMD_PREFIXES)

    def handle(self, text: str) -> Optional[str]:
        raw = (text or '').strip()
        n = normalize(raw)
        if not raw:
            return None
        if n.startswith('/programas'):
            raw = '/apps' + raw[len('/programas'):]
            n = normalize(raw)
        if n in _SCAN_PHRASES:
            return self.scan_and_save()
        if n in _STATUS_PHRASES:
            return self.list_apps(limit=30)
        if any(n.startswith(p) for p in _APP_CMD_PREFIXES) or any(n.startswith(p) for p in _GENERIC_OPEN_PREFIXES):
            q = self._extract_natural_launch_query(raw)
            return self.launch(q) if q else 'Diga o nome do programa. Exemplo: abre o programa Discord.'
        if not n.startswith('/apps'):
            return None
        parts = raw.split(' ', 2)
        if len(parts) == 1 or (len(parts) >= 2 and parts[1].lower() in {'status', 'estado'}):
            return self.status() + '\nComandos: /apps scan | /apps list | /apps buscar nome | /apps abrir nome | /apps favoritos | /apps favorito add nome | /apps recentes | /apps arquivo'
        cmd = parts[1].lower().strip()
        arg = parts[2].strip() if len(parts) >= 3 else ''
        if cmd in {'scan', 'rescan', 'atualizar', 'reindexar'}:
            return self.scan_and_save()
        if cmd in {'list', 'lista', 'listar'}:
            limit = 40
            if arg.isdigit():
                limit = max(1, min(int(arg), 200))
            return self.list_apps(limit=limit)
        if cmd in {'favoritos', 'favorito', 'fav', 'favorita'}:
            return self.handle_favorites(arg)
        if cmd in {'recentes', 'recent', 'ultimos', 'últimos'}:
            return self.recent_apps()
        if cmd in {'buscar', 'busca', 'find', 'procurar'}:
            if not arg:
                return 'Use: /apps buscar nome. Exemplo: /apps buscar discord'
            return self.search_text(arg)
        if cmd in {'abrir', 'abre', 'open', 'executar', 'rodar'}:
            if not arg:
                return 'Use: /apps abrir nome. Exemplo: /apps abrir Discord'
            return self.launch(arg)
        if cmd in {'arquivo', 'json', 'path'}:
            return f'Inventário local: {self.db_file}'
        if cmd in {'on', 'ligar'}:
            self.config.setdefault('apps', {})['enabled'] = True
            self.enabled = True
            from ..config import save_config
            save_config(self.config)
            return 'App Inventory ligado.'
        if cmd in {'off', 'desligar'}:
            self.config.setdefault('apps', {})['enabled'] = False
            self.enabled = False
            from ..config import save_config
            save_config(self.config)
            return 'App Inventory desligado.'
        return 'Comando de apps não reconhecido. Use /apps scan, /apps list, /apps buscar nome ou /apps abrir nome.'

    def _extract_natural_launch_query(self, raw: str) -> str:
        n = normalize(raw)
        for p in tuple(_APP_CMD_PREFIXES) + tuple(_GENERIC_OPEN_PREFIXES):
            if n.startswith(p):
                # Remove verbo/artigos/palavras de app e deixa só o nome: "abra o hydra" -> "hydra".
                q = re.sub(r'^(abra|abre|abrir|abri|execute|executa|rodar|rode|inicie|iniciar)\s+', '', raw, flags=re.I).strip()
                q = re.sub(r'^(o|a|um|uma|os|as)\s+', '', q, flags=re.I).strip()
                q = re.sub(r'^(programa|app|aplicativo)\s+', '', q, flags=re.I).strip()
                # remove cortesia final sem destruir nomes compostos.
                q = re.sub(r'\s+(?:para mim|pra mim|por favor|por gentileza)\s*$', '', q, flags=re.I).strip()
                return q
        return ''

    def _load_prefs(self) -> Dict[str, Any]:
        try:
            if self.prefs_file.exists():
                data = json.loads(self.prefs_file.read_text(encoding='utf-8'))
                if isinstance(data, dict):
                    data.setdefault('favorites', [])
                    data.setdefault('recent', [])
                    return data
        except Exception:
            pass
        return {'version': 1, 'favorites': [], 'recent': []}

    def _save_prefs(self, prefs: Dict[str, Any]) -> None:
        prefs.setdefault('version', 1)
        prefs.setdefault('favorites', [])
        prefs.setdefault('recent', [])
        self.prefs_file.write_text(json.dumps(prefs, ensure_ascii=False, indent=2), encoding='utf-8')

    def _favorite_norms(self) -> set[str]:
        prefs = self._load_prefs()
        return {normalize(str(x)) for x in prefs.get('favorites', []) if str(x).strip()}

    def handle_favorites(self, arg: str) -> str:
        arg = (arg or '').strip()
        prefs = self._load_prefs()
        favs: List[str] = list(prefs.get('favorites', []))
        low = normalize(arg)
        if not arg or low in {'list', 'lista', 'listar'}:
            if not favs:
                return 'Você ainda não fixou apps favoritos. Use: /apps favorito add Discord'
            return 'Apps favoritos: ' + ', '.join(favs)
        if low.startswith(('add ', 'adicionar ', 'fixar ', 'pin ')):
            name = re.sub(r'^(add|adicionar|fixar|pin)\s+', '', arg, flags=re.I).strip()
            if not name:
                return 'Use: /apps favorito add nome.'
            # Se o app existir no inventário, usa o nome oficial.
            matches = self._matches(name)
            if matches:
                name = str(matches[0][1].get('name') or name)
            if normalize(name) not in {normalize(x) for x in favs}:
                favs.append(name)
                prefs['favorites'] = favs[:50]
                self._save_prefs(prefs)
            return f'[OK] Favorito adicionado: {name}'
        if low.startswith(('remove ', 'remover ', 'del ', 'delete ', 'unpin ')):
            name = re.sub(r'^(remove|remover|del|delete|unpin)\s+', '', arg, flags=re.I).strip()
            before = len(favs)
            favs = [x for x in favs if normalize(x) != normalize(name)]
            prefs['favorites'] = favs
            self._save_prefs(prefs)
            return f'[OK] Favorito removido: {name}' if len(favs) < before else f'Favorito não encontrado: {name}'
        # /apps favorito nome = abrir favorito/nome
        return self.launch(arg)

    def _record_launch(self, app: Dict[str, Any]) -> None:
        try:
            prefs = self._load_prefs()
            name = str(app.get('name') or '').strip()
            if not name:
                return
            recent = [r for r in prefs.get('recent', []) if normalize(str(r.get('name',''))) != normalize(name)]
            recent.insert(0, {'name': name, 'path': app.get('path',''), 'source': app.get('source',''), 'opened_at': time.strftime('%Y-%m-%d %H:%M:%S')})
            prefs['recent'] = recent[:int(self.cfg.get('recent_limit', 12))]
            self._save_prefs(prefs)
        except Exception:
            pass

    def recent_apps(self) -> str:
        prefs = self._load_prefs()
        recent = prefs.get('recent', [])
        if not recent:
            return 'Nenhum app aberto pela Yoru ainda. Use /apps abrir nome.'
        lines = ['Apps recentes abertos pela Yoru:']
        for i, item in enumerate(recent[:int(self.cfg.get('recent_limit', 12))], 1):
            lines.append(f"{i}. {item.get('name','?')} | {item.get('opened_at','?')}")
        return '\n'.join(lines)

    def _load_db(self) -> Dict[str, Any]:
        try:
            if self.db_file.exists():
                return json.loads(self.db_file.read_text(encoding='utf-8'))
        except Exception:
            return {}
        return {}

    def _save_db(self, apps: List[Dict[str, Any]]) -> None:
        payload = {
            'version': 1,
            'generated_at': time.strftime('%Y-%m-%d %H:%M:%S'),
            'platform': platform.platform(),
            'count': len(apps),
            'apps': apps,
        }
        self.db_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')

    def _start_menu_dirs(self) -> List[Path]:
        dirs = []
        envs = [
            os.environ.get('APPDATA', ''),
            os.environ.get('PROGRAMDATA', ''),
        ]
        suffixes = [
            r'Microsoft\Windows\Start Menu\Programs',
            r'Microsoft\Windows\Start Menu\Programs',
        ]
        for base, suffix in zip(envs, suffixes):
            if base:
                p = Path(base) / suffix
                if p.exists():
                    dirs.append(p)
        return dirs

    def _scan_start_menu(self) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for base in self._start_menu_dirs():
            try:
                files = list(base.rglob('*.lnk')) + list(base.rglob('*.appref-ms'))
            except Exception:
                files = []
            for p in files:
                name = _clean_shortcut_name(p.stem)
                if not name or _looks_like_helper(name):
                    continue
                out.append({
                    'name': name,
                    'name_norm': normalize(name),
                    'source': 'start_menu',
                    'kind': p.suffix.lower().lstrip('.'),
                    'path': str(p),
                    'launchable': True,
                })
        return out

    def _registry_locations(self) -> Iterable[Tuple[str, str]]:
        if os.name != 'nt':
            return []
        return [
            ('HKCU', r'Software\Microsoft\Windows\CurrentVersion\Uninstall'),
            ('HKLM', r'Software\Microsoft\Windows\CurrentVersion\Uninstall'),
            ('HKLM', r'Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'),
        ]

    def _scan_registry(self) -> List[Dict[str, Any]]:
        if os.name != 'nt':
            return []
        try:
            import winreg  # type: ignore
        except Exception:
            return []
        hives = {'HKCU': winreg.HKEY_CURRENT_USER, 'HKLM': winreg.HKEY_LOCAL_MACHINE}
        out: List[Dict[str, Any]] = []
        for hive_name, subkey in self._registry_locations():
            try:
                key = winreg.OpenKey(hives[hive_name], subkey)
            except OSError:
                continue
            try:
                total = winreg.QueryInfoKey(key)[0]
                for i in range(total):
                    try:
                        child_name = winreg.EnumKey(key, i)
                        child = winreg.OpenKey(key, child_name)
                        name = self._reg_get(child, 'DisplayName')
                        if not name or _looks_like_helper(name):
                            continue
                        system_component = self._reg_get(child, 'SystemComponent')
                        if str(system_component).strip() == '1':
                            continue
                        icon = _strip_icon_path(str(self._reg_get(child, 'DisplayIcon') or ''))
                        install_location = str(self._reg_get(child, 'InstallLocation') or '').strip()
                        launch_path = _safe_existing_launch_path(icon)
                        out.append({
                            'name': _clean_shortcut_name(name),
                            'name_norm': normalize(name),
                            'source': 'registry',
                            'kind': 'installed_app',
                            'path': launch_path,
                            'install_location': os.path.expandvars(install_location),
                            'launchable': bool(launch_path),
                        })
                    except Exception:
                        continue
            finally:
                try:
                    winreg.CloseKey(key)
                except Exception:
                    pass
        return out

    @staticmethod
    def _reg_get(key: Any, value: str) -> Any:
        try:
            import winreg  # type: ignore
            return winreg.QueryValueEx(key, value)[0]
        except Exception:
            return None

    def scan(self) -> List[Dict[str, Any]]:
        if not self.enabled:
            return []
        apps: List[Dict[str, Any]] = []
        if self.cfg.get('scan_start_menu', True):
            apps.extend(self._scan_start_menu())
        if self.cfg.get('scan_registry', True):
            apps.extend(self._scan_registry())
        # dedupe por nome normalizado + path; prefira atalhos launchable.
        best: Dict[str, Dict[str, Any]] = {}
        for app in apps:
            key = (app.get('name_norm') or normalize(app.get('name', ''))).strip()
            if not key:
                continue
            old = best.get(key)
            if old is None:
                best[key] = app
                continue
            old_score = (10 if old.get('launchable') else 0) + (5 if old.get('source') == 'start_menu' else 0)
            new_score = (10 if app.get('launchable') else 0) + (5 if app.get('source') == 'start_menu' else 0)
            if new_score > old_score:
                best[key] = app
        return sorted(best.values(), key=lambda x: x.get('name_norm', ''))

    def scan_and_save(self) -> str:
        if not self.enabled:
            return 'App Inventory está desligado. Use /apps on para ligar.'
        apps = self.scan()
        self._save_db(apps)
        launchable = sum(1 for a in apps if a.get('launchable'))
        return f'[OK] Inventário de programas atualizado: {len(apps)} app(s), {launchable} abrível(is). Arquivo: {self.db_file}'

    def _ensure_db(self) -> Dict[str, Any]:
        db = self._load_db()
        if not db.get('apps') and self.cfg.get('auto_scan_if_missing', True):
            self.scan_and_save()
            db = self._load_db()
        return db

    def list_apps(self, limit: int = 40) -> str:
        db = self._ensure_db()
        apps = db.get('apps', [])
        if not apps:
            return 'Ainda não tenho inventário de programas. Use /apps scan.'
        launchable = [a for a in apps if a.get('launchable')]
        shown = launchable[:limit]
        favs = self._favorite_norms()
        names = ', '.join(('⭐ ' if normalize(a.get('name','')) in favs else '') + a.get('name', '?') for a in shown)
        more = '' if len(launchable) <= limit else f' ... +{len(launchable)-limit}'
        return f'Programas abríveis ({len(launchable)}/{len(apps)}): {names}{more}'

    def _matches(self, query: str) -> List[Tuple[float, Dict[str, Any]]]:
        db = self._ensure_db()
        apps = db.get('apps', [])
        qn = normalize(query)
        if not qn:
            return []
        scored: List[Tuple[float, Dict[str, Any]]] = []
        for app in apps:
            name = app.get('name', '')
            nn = app.get('name_norm') or normalize(name)
            score = 0.0
            if nn == qn:
                score = 1.0
            elif nn.startswith(qn):
                score = 0.92
            elif qn in nn:
                score = 0.84
            else:
                score = difflib.SequenceMatcher(None, qn, nn).ratio()
            if app.get('launchable'):
                score += 0.04
            if app.get('source') == 'start_menu':
                score += 0.03
            if score >= 0.45:
                scored.append((min(score, 1.0), app))
        scored.sort(key=lambda x: x[0], reverse=True)
        return scored

    def search_text(self, query: str, limit: int = 10) -> str:
        matches = self._matches(query)[:limit]
        if not matches:
            return f'Não encontrei programa parecido com "{query}". Use /apps scan para atualizar.'
        favs = self._favorite_norms()
        lines = [f'{i+1}. {("⭐ " if normalize(a.get("name","")) in favs else "")}{a.get("name")} [{a.get("source")}] {"abrível" if a.get("launchable") else "só inventário"}' for i, (_, a) in enumerate(matches)]
        return 'Encontrei:\n' + '\n'.join(lines)

    def launch(self, query: str) -> str:
        matches = self._matches(query)
        favs = self._favorite_norms()
        boosted = []
        for s, a in matches:
            if normalize(a.get('name','')) in favs:
                s = min(1.0, s + 0.06)
            boosted.append((s, a))
        boosted.sort(key=lambda x: x[0], reverse=True)
        launchable = [(s, a) for s, a in boosted if a.get('launchable') and a.get('path')]
        if not launchable:
            return f'Não encontrei atalho/executável seguro para "{query}". Use /apps buscar {query} ou /apps scan.'
        top_score, top = launchable[0]
        # Evita abrir programa errado quando houver empate forte.
        close = [(s, a) for s, a in launchable[1:4] if top_score - s < 0.04]
        if close:
            opts = ', '.join([top.get('name', '?')] + [a.get('name', '?') for _, a in close])
            return f'Encontrei opções muito parecidas: {opts}. Use /apps abrir nome mais específico.'
        path = str(top.get('path'))
        try:
            if os.name == 'nt':
                os.startfile(path)  # type: ignore[attr-defined]
            elif path.lower().endswith(('.desktop', '.app')):
                subprocess.Popen(['xdg-open', path])
            else:
                subprocess.Popen([path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            self._record_launch(top)
            return f'Abrindo {top.get("name")}.'
        except Exception as e:
            return f'Encontrei {top.get("name")}, mas não consegui abrir: {e}'
