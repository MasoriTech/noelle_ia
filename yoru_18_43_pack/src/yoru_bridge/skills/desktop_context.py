from __future__ import annotations

import json
import os
import platform
import re
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime, date
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib import request, error

from ..config import PACK_ROOT
from ..utils.text import normalize


def _now() -> str:
    return datetime.now().strftime('%Y-%m-%d %H:%M:%S')


def _safe_name(text: str, fallback: str = 'item') -> str:
    s = re.sub(r'[^a-zA-Z0-9._-]+', '_', (text or '').strip())[:60].strip('_')
    return s or fallback


def _home_dirs() -> Dict[str, Path]:
    home = Path.home()
    return {
        'home': home,
        'desktop': home / 'Desktop',
        'downloads': home / 'Downloads',
        'documents': home / 'Documents',
        'pictures': home / 'Pictures',
    }


def _run_cmd(cmd: List[str], timeout: int = 8) -> Tuple[int, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        out = (p.stdout or '') + ((('\n' + p.stderr) if p.stderr else ''))
        return p.returncode, out.strip()
    except Exception as e:
        return 999, f'{type(e).__name__}: {e}'


class DesktopContextSkill:
    """Skills locais de contexto do PC para a Yoru.

    1.8.38: DesktopContext com tarefas melhoradas, SkillHub e mensagens de projeto atualizadas.
    """

    def __init__(self, config: Dict[str, Any], vault: Any = None):
        self.config = config
        self.vault = vault
        self.cfg = config.get('desktop_context', {})
        self.enabled = bool(self.cfg.get('enabled', True))
        self.data_dir = PACK_ROOT / 'data'
        self.screenshot_dir = PACK_ROOT / self.cfg.get('screenshots_dir', 'data/screenshots')
        self.tasks_file = PACK_ROOT / self.cfg.get('tasks_file', 'data/tasks.json')
        self.project_state_file = PACK_ROOT / self.cfg.get('project_state_file', 'data/project_state.json')
        self.routines_file = PACK_ROOT / self.cfg.get('routines_file', 'data/routines.json')
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)
        self.tasks_file.parent.mkdir(parents=True, exist_ok=True)

    def status(self) -> str:
        tasks = self._load_tasks()
        pending = len([t for t in tasks.get('tasks', []) if not t.get('done')])
        last_shot = '-'
        try:
            shots = sorted(self.screenshot_dir.glob('*.png'), key=lambda p: p.stat().st_mtime, reverse=True)
            if shots:
                last_shot = shots[0].name
        except Exception:
            pass
        return f'DesktopContext: {"ON" if self.enabled else "OFF"} | tarefas pendentes={pending} | último print={last_shot} | projeto={self.config.get("version","?")}'

    def looks_like_command(self, text: str) -> bool:
        n = normalize(text or '')
        if not n:
            return False
        prefixes = (
            '/tela', '/pc', '/modelo', '/arquivos', '/files', '/clip', '/clipboard',
            '/tarefa', '/tarefas', '/lembra', '/lembrete', '/memoria', '/memória',
            '/diario', '/diário', '/projeto', '/rotina', '/rotinas', '/desktop'
        )
        if any(n.startswith(p) for p in prefixes):
            return True
        phrases = (
            'ver tela', 've a tela', 'vê a tela', 'print da tela', 'tirar print', 'capture a tela',
            'status do pc', 'diagnostico do pc', 'diagnóstico do pc', 'como esta meu pc', 'como está meu pc',
            'arquivos recentes', 'ultimos arquivos', 'últimos arquivos', 'buscar arquivo', 'procure arquivo',
            'ler clipboard', 'ler area de transferencia', 'ler área de transferência', 'o que esta copiado', 'o que está copiado',
            'lembra de ', 'me lembra de ', 'minhas tarefas', 'tarefas de hoje',
            'status do projeto', 'proxima versao', 'próxima versão', 'modo yoru'
        )
        return any(p in n for p in phrases)

    def clip_model_request(self, text: str) -> Optional[Tuple[str, str]]:
        n = normalize(text or '')
        actions = {
            '/clip resumir': 'Resuma o conteúdo do clipboard em português, curto e direto.',
            '/clipboard resumir': 'Resuma o conteúdo do clipboard em português, curto e direto.',
            '/clip melhorar': 'Melhore o texto do clipboard, mantendo o sentido e deixando mais claro.',
            '/clipboard melhorar': 'Melhore o texto do clipboard, mantendo o sentido e deixando mais claro.',
            '/clip traduzir': 'Traduza o conteúdo do clipboard para português do Brasil, mantendo nomes técnicos.',
            '/clipboard traduzir': 'Traduza o conteúdo do clipboard para português do Brasil, mantendo nomes técnicos.',
        }
        for prefix, instruction in actions.items():
            if n == prefix or n.startswith(prefix + ' '):
                return self.read_clipboard(), instruction
        return None

    def handle(self, text: str) -> Optional[str]:
        raw = (text or '').strip()
        n = normalize(raw)
        if not raw:
            return None
        if n.startswith('/desktop'):
            return self.status() + '\nComandos: /tela | /pc status | /modelo status | /arquivos recentes | /clip ler | /tarefa hoje | /projeto status | /rotina modo yoru'
        if n.startswith('/tela') or any(p in n for p in ['ver tela', 'print da tela', 'tirar print', 'capture a tela']):
            return self.handle_screen(raw)
        if n.startswith('/pc') or any(p in n for p in ['status do pc', 'diagnostico do pc', 'diagnóstico do pc', 'como esta meu pc', 'como está meu pc']):
            return self.handle_pc(raw)
        if n.startswith('/modelo'):
            return self.handle_model(raw)
        if n.startswith('/arquivos') or n.startswith('/files') or any(p in n for p in ['arquivos recentes', 'ultimos arquivos', 'últimos arquivos', 'buscar arquivo', 'procure arquivo']):
            return self.handle_files(raw)
        if n.startswith('/clip') or n.startswith('/clipboard') or any(p in n for p in ['ler clipboard', 'area de transferencia', 'área de transferência', 'o que esta copiado', 'o que está copiado']):
            return self.handle_clipboard(raw)
        if n.startswith('/tarefa') or n.startswith('/tarefas') or n.startswith('/lembra') or n.startswith('/lembrete') or n.startswith('lembra de ') or n.startswith('me lembra de ') or 'tarefas de hoje' in n or n == 'minhas tarefas':
            return self.handle_tasks(raw)
        if n.startswith('/memoria') or n.startswith('/memória') or n.startswith('/diario') or n.startswith('/diário'):
            return self.handle_memory(raw)
        if n.startswith('/projeto') or 'status do projeto' in n or 'proxima versao' in n or 'próxima versão' in n:
            return self.handle_project(raw)
        if n.startswith('/rotina') or n.startswith('/rotinas') or 'modo yoru' in n:
            return self.handle_routines(raw)
        return None

    # Screen --------------------------------------------------------------
    def handle_screen(self, raw: str) -> str:
        n = normalize(raw)
        if n in {'/tela', '/tela status'}:
            return 'Tela: use /tela capturar para salvar um print, /tela pasta para abrir a pasta ou /tela analisar para capturar e preparar análise.'
        if 'pasta' in n:
            return self._open_path(self.screenshot_dir, 'Pasta de prints')
        path, msg = self.capture_screen()
        if path:
            extra = ''
            if 'analisar' in n or 'ler erro' in n or 'explicar' in n or not raw.startswith('/tela capturar'):
                extra = '\nObservação: este pack ainda não tem modelo local com visão. Eu salvei o print; para análise visual real, use uma versão futura com VLM/OCR ou envie o print para análise.'
            return f'[OK] Print salvo em: {path}{extra}'
        return msg

    def capture_screen(self) -> Tuple[Optional[Path], str]:
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        out = self.screenshot_dir / f'tela_{stamp}.png'
        try:
            from PIL import ImageGrab  # type: ignore
            img = ImageGrab.grab()
            img.save(out)
            return out, '[OK] Print capturado.'
        except Exception as e1:
            # Fallback Windows: Snipping Tool cannot silently save; inform clearly.
            return None, f'Não consegui capturar a tela automaticamente. Instale Pillow (`pip install pillow`) ou use Print Screen. Detalhe: {e1}'

    # PC ------------------------------------------------------------------
    def handle_pc(self, raw: str) -> str:
        n = normalize(raw)
        if 'porta' in n or 'portas' in n:
            return self._ports_status()
        if 'process' in n or 'processos' in n:
            return self._processes_status()
        if 'python' in n:
            return self._python_status()
        if 'diagnostico' in n or 'diagnóstico' in n:
            return self._pc_status(full=True)
        return self._pc_status(full=False)

    def _pc_status(self, full: bool = False) -> str:
        lines = [
            'Status do PC:',
            f'- Sistema: {platform.platform()}',
            f'- Python: {sys.version.split()[0]} | {sys.executable}',
            f'- CPU lógica: {os.cpu_count() or "?"}',
        ]
        try:
            total, used, free = shutil.disk_usage(Path.home())
            gb = 1024**3
            lines.append(f'- Disco HOME: livre {free/gb:.1f} GB de {total/gb:.1f} GB')
        except Exception:
            pass
        ram_line = self._ram_status()
        if ram_line:
            lines.append(ram_line)
        lines.append(self._ports_status(short=True))
        if full:
            lines.append(self._python_status())
            lines.append(self._processes_status(limit=8))
        return '\n'.join(lines)

    def _ram_status(self) -> str:
        try:
            import psutil  # type: ignore
            vm = psutil.virtual_memory()
            gb = 1024**3
            return f'- RAM: livre {vm.available/gb:.1f} GB de {vm.total/gb:.1f} GB ({vm.percent:.0f}% em uso)'
        except Exception:
            if os.name == 'nt':
                code, out = _run_cmd(['wmic','OS','get','FreePhysicalMemory,TotalVisibleMemorySize','/Value'], timeout=5)
                if code == 0 and out:
                    vals = {}
                    for line in out.splitlines():
                        if '=' in line:
                            k,v=line.split('=',1); vals[k.strip()] = v.strip()
                    try:
                        free = int(vals.get('FreePhysicalMemory','0'))/1024/1024
                        total = int(vals.get('TotalVisibleMemorySize','0'))/1024/1024
                        if total > 0:
                            return f'- RAM: livre {free:.1f} GB de {total:.1f} GB'
                    except Exception:
                        pass
        return '- RAM: instale psutil para leitura detalhada (`pip install psutil`).'

    def _ports_status(self, short: bool = False) -> str:
        ports = self.cfg.get('model_ports', [5001, 5002])
        parts = []
        for port in ports:
            ok = self._is_port_open('127.0.0.1', int(port), timeout=0.7)
            parts.append(f'{port}={"aberta" if ok else "fechada"}')
        txt = 'Portas locais: ' + ' | '.join(parts)
        return ('- ' + txt) if short else txt

    def _is_port_open(self, host: str, port: int, timeout: float = 1.0) -> bool:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except Exception:
            return False

    def _python_status(self) -> str:
        lines = ['Python/ambiente:']
        for mod in ['PIL', 'psutil', 'faster_whisper', 'edge_tts']:
            try:
                __import__(mod)
                lines.append(f'- {mod}: OK')
            except Exception:
                lines.append(f'- {mod}: não instalado')
        return '\n'.join(lines)

    def _processes_status(self, limit: int = 12) -> str:
        if os.name == 'nt':
            code, out = _run_cmd(['tasklist'], timeout=8)
            if code == 0 and out:
                needles = ['python', 'kobold', 'chrome', 'code.exe', 'discord', 'steam']
                rows = [ln for ln in out.splitlines() if any(x in ln.lower() for x in needles)]
                rows = rows[:limit]
                return 'Processos relevantes:\n' + ('\n'.join('- ' + r[:110] for r in rows) if rows else '- nenhum processo relevante encontrado')
        else:
            code, out = _run_cmd(['ps','-eo','pid,comm,args'], timeout=8)
            if code == 0 and out:
                rows = [ln for ln in out.splitlines() if any(x in ln.lower() for x in ['python','kobold','chrome','code','discord','steam'])]
                return 'Processos relevantes:\n' + ('\n'.join('- ' + r[:120] for r in rows[:limit]) if rows else '- nenhum processo relevante encontrado')
        return 'Processos relevantes: não consegui listar neste sistema.'

    # Model ---------------------------------------------------------------
    def handle_model(self, raw: str) -> str:
        n = normalize(raw)
        if 'porta' in n or 'portas' in n:
            return self._ports_status()
        if 'ping' in n or 'diagnostico' in n or 'diagnóstico' in n or 'status' in n:
            return self._model_status()
        if 'iniciar' in n or 'start' in n:
            return 'Ainda não inicio KoboldCpp automaticamente nesta versão. Use os BATs gerados pelo menu de modelos. Depois rode /modelo status.'
        if 'parar' in n or 'stop' in n:
            return 'Por segurança, não encerro processos de modelo automaticamente nesta versão. Feche o KoboldCpp manualmente ou implemente allowlist depois.'
        if 'benchmark' in n:
            return 'Benchmark real precisa chamar o modelo. Use /warmup para medir uma chamada curta no FAST e THINK.'
        return self._model_status()

    def _model_status(self) -> str:
        models = self.config.get('models', {})
        paths = self.config.get('model_paths', {})
        lines = ['Modelo/KoboldCpp:']
        for key, port in [('fast', 5001), ('think', 5002)]:
            cfg = models.get(key, {})
            try:
                port = int(str(cfg.get('api_url','')).split(':')[-1].split('/')[0])
            except Exception:
                pass
            open_ = self._is_port_open('127.0.0.1', port, timeout=0.7)
            path_key = f'{key}_model_path'
            mpath = paths.get(path_key, '')
            exists = Path(os.path.expandvars(str(mpath))).exists() if mpath else False
            lines.append(f'- {key.upper()}: {cfg.get("label","-")} | porta {port}: {"ON" if open_ else "OFF"} | arquivo={"OK" if exists else "não encontrado"}')
        lines.append('Use /warmup para teste real de resposta curta.')
        return '\n'.join(lines)

    # Files ---------------------------------------------------------------
    def handle_files(self, raw: str) -> str:
        n = normalize(raw)
        if 'buscar' in n or 'busca' in n or 'procur' in n:
            q = self._extract_arg(raw, ['buscar','busca','procurar','procure','/arquivos buscar','/files buscar'])
            if not q:
                return 'Use: /arquivos buscar nome. Exemplo: /arquivos buscar yoru'
            return self._search_files(q)
        if 'abrir ultimo zip' in n or 'abrir último zip' in n:
            return self._open_latest_zip()
        if 'organizar downloads' in n:
            return self._organize_downloads_preview()
        if 'pasta' in n:
            return self._folders_status()
        return self._recent_files()

    def _file_roots(self) -> List[Path]:
        roots = []
        for name in self.cfg.get('file_roots', ['Downloads','Documents','Desktop']):
            p = _home_dirs().get(name.lower()) or Path.home()/name
            if p.exists():
                roots.append(p)
        return roots

    def _recent_files(self, limit: int = 12) -> str:
        files = []
        for root in self._file_roots():
            try:
                for p in root.iterdir():
                    if p.is_file():
                        files.append(p)
            except Exception:
                pass
        files = sorted(files, key=lambda p: p.stat().st_mtime if p.exists() else 0, reverse=True)[:limit]
        if not files:
            return 'Não encontrei arquivos recentes nas pastas padrão.'
        lines = ['Arquivos recentes:']
        for p in files:
            try:
                age = datetime.fromtimestamp(p.stat().st_mtime).strftime('%Y-%m-%d %H:%M')
                lines.append(f'- {age} | {p.name} | {p.parent}')
            except Exception:
                lines.append(f'- {p.name}')
        return '\n'.join(lines)

    def _search_files(self, query: str, limit: int = 20) -> str:
        q = normalize(query)
        found = []
        for root in self._file_roots():
            try:
                for p in root.rglob('*'):
                    if len(found) >= limit:
                        break
                    if p.is_file() and q in normalize(p.name):
                        found.append(p)
            except Exception:
                continue
        if not found:
            return f'Não achei arquivo com "{query}" nas pastas padrão.'
        lines = [f'Arquivos encontrados para "{query}":']
        for p in found[:limit]:
            lines.append(f'- {p.name} | {p.parent}')
        return '\n'.join(lines)

    def _open_latest_zip(self) -> str:
        zips = []
        for root in self._file_roots():
            try:
                zips.extend(root.glob('*.zip'))
            except Exception:
                pass
        if not zips:
            return 'Não encontrei ZIP recente nas pastas padrão.'
        latest = max(zips, key=lambda p: p.stat().st_mtime)
        return self._open_path(latest, 'ZIP recente')

    def _organize_downloads_preview(self) -> str:
        downloads = _home_dirs().get('downloads')
        if not downloads or not downloads.exists():
            return 'Pasta Downloads não encontrada.'
        buckets: Dict[str, int] = {'zips':0,'imagens':0,'documentos':0,'executaveis':0,'outros':0}
        for p in downloads.iterdir():
            if not p.is_file():
                continue
            suf = p.suffix.lower()
            if suf == '.zip': buckets['zips'] += 1
            elif suf in {'.png','.jpg','.jpeg','.webp','.gif'}: buckets['imagens'] += 1
            elif suf in {'.pdf','.docx','.txt','.md','.xlsx','.pptx'}: buckets['documentos'] += 1
            elif suf in {'.exe','.msi','.bat'}: buckets['executaveis'] += 1
            else: buckets['outros'] += 1
        return 'Prévia de organização de Downloads, sem mover nada:\n' + '\n'.join(f'- {k}: {v}' for k,v in buckets.items()) + '\nNesta versão eu só mostro a prévia. Mover/apagar exige confirmação futura.'

    def _folders_status(self) -> str:
        lines = ['Pastas padrão:']
        for name,p in _home_dirs().items():
            lines.append(f'- {name}: {p} | {"OK" if p.exists() else "não existe"}')
        return '\n'.join(lines)

    def _open_path(self, path: Path, label: str = 'Arquivo') -> str:
        try:
            if os.name == 'nt':
                os.startfile(str(path))  # type: ignore[attr-defined]
            elif sys.platform == 'darwin':
                subprocess.Popen(['open', str(path)])
            else:
                subprocess.Popen(['xdg-open', str(path)])
            return f'[OK] Abrindo {label}: {path}'
        except Exception as e:
            return f'Não consegui abrir {label}: {path}\nDetalhe: {e}'

    # Clipboard -----------------------------------------------------------
    def handle_clipboard(self, raw: str) -> str:
        n = normalize(raw)
        if 'salvar' in n or 'nota' in n:
            txt = self.read_clipboard()
            if not txt:
                return 'Clipboard vazio ou inacessível.'
            if self.vault:
                p = self.vault.append_memory('05_MEMORIA/clipboard_notas.md', txt[:4000])
                return f'[OK] Clipboard salvo em memória: {p}'
            return 'Vault indisponível para salvar clipboard.'
        txt = self.read_clipboard()
        if not txt:
            return 'Clipboard vazio ou inacessível. No Windows, verifique se há texto copiado.'
        preview = txt[:1500]
        if len(txt) > len(preview):
            preview += '\n...[cortado]'
        return 'Clipboard atual:\n' + preview

    def read_clipboard(self) -> str:
        # tkinter é stdlib e costuma funcionar com texto.
        try:
            import tkinter as tk
            root = tk.Tk(); root.withdraw()
            txt = root.clipboard_get()
            root.destroy()
            return str(txt or '').strip()
        except Exception:
            pass
        if os.name == 'nt':
            code, out = _run_cmd(['powershell', '-NoProfile', '-Command', 'Get-Clipboard'], timeout=6)
            if code == 0:
                return out.strip()
        return ''

    # Tasks ---------------------------------------------------------------
    def _load_tasks(self) -> Dict[str, Any]:
        try:
            if self.tasks_file.exists():
                return json.loads(self.tasks_file.read_text(encoding='utf-8'))
        except Exception:
            pass
        return {'version': 1, 'tasks': []}

    def _save_tasks(self, data: Dict[str, Any]) -> None:
        data['updated_at'] = _now()
        self.tasks_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')

    def handle_tasks(self, raw: str) -> str:
        n = normalize(raw)
        if n.startswith('/lembra') or n.startswith('/lembrete') or n.startswith('lembra de ') or n.startswith('me lembra de '):
            text = re.sub(r'^/?(lembra|lembrete|me lembra)\s+(de\s+)?', '', raw, flags=re.I).strip()
            return self._add_task(text or raw)
        if 'limpar concluidas' in n or 'limpar concluídas' in n or 'clear done' in n:
            return self._clear_done_tasks()
        if 'remover' in n or 'apagar' in n or 'delete' in n or 'excluir' in n:
            m = re.search(r'(\d+)', raw)
            if not m:
                return 'Use: /tarefa remover número. Exemplo: /tarefa remover 2'
            return self._remove_task(int(m.group(1)))
        if 'adicionar' in n or 'add' in n or 'nova' in n:
            text = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else ''
            return self._add_task(text)
        if 'concluir' in n or 'feito' in n or 'done' in n:
            m = re.search(r'(\d+)', raw)
            if not m:
                return 'Use: /tarefa concluir número. Exemplo: /tarefa concluir 2'
            return self._finish_task(int(m.group(1)))
        return self._list_tasks(today=('hoje' in n or 'today' in n or 'tarefas de hoje' in n))

    def _add_task(self, text: str) -> str:
        text = (text or '').strip()
        if not text:
            return 'Use: /tarefa adicionar texto ou /lembra de texto.'
        data = self._load_tasks()
        tasks = data.setdefault('tasks', [])
        tid = (max([int(t.get('id', 0)) for t in tasks] or [0]) + 1)
        due = None
        low = normalize(text)
        if 'amanha' in low or 'amanhã' in low:
            from datetime import timedelta
            due = (date.today() + timedelta(days=1)).isoformat()
        elif 'hoje' in low:
            due = date.today().isoformat()
        tasks.append({'id': tid, 'text': text, 'created_at': _now(), 'due': due, 'done': False})
        self._save_tasks(data)
        return f'[OK] Tarefa adicionada #{tid}: {text}' + (f' | data={due}' if due else '')

    def _list_tasks(self, today: bool = False) -> str:
        data = self._load_tasks()
        tasks = [t for t in data.get('tasks', []) if not t.get('done')]
        if today:
            today_s = date.today().isoformat()
            tasks = [t for t in tasks if t.get('due') in {None, today_s}]
        if not tasks:
            return 'Nenhuma tarefa pendente.'
        lines = ['Tarefas pendentes:']
        for t in tasks[:30]:
            due = f" | data={t.get('due')}" if t.get('due') else ''
            lines.append(f"- #{t.get('id')}: {t.get('text')}{due}")
        return '\n'.join(lines)

    def _finish_task(self, task_id: int) -> str:
        data = self._load_tasks()
        for t in data.get('tasks', []):
            if int(t.get('id', -1)) == task_id:
                t['done'] = True; t['done_at'] = _now()
                self._save_tasks(data)
                return f'[OK] Tarefa #{task_id} concluída.'
        return f'Não encontrei tarefa #{task_id}.'

    def _remove_task(self, task_id: int) -> str:
        data = self._load_tasks()
        tasks = data.get('tasks', [])
        new_tasks = [t for t in tasks if int(t.get('id', -1)) != task_id]
        if len(new_tasks) == len(tasks):
            return f'Não encontrei tarefa #{task_id}.'
        data['tasks'] = new_tasks
        self._save_tasks(data)
        return f'[OK] Tarefa #{task_id} removida.'

    def _clear_done_tasks(self) -> str:
        data = self._load_tasks()
        tasks = data.get('tasks', [])
        kept = [t for t in tasks if not t.get('done')]
        removed = len(tasks) - len(kept)
        data['tasks'] = kept
        self._save_tasks(data)
        return f'[OK] Tarefas concluídas removidas: {removed}.'

    # Memory --------------------------------------------------------------
    def handle_memory(self, raw: str) -> str:
        n = normalize(raw)
        if not self.vault:
            return 'Vault indisponível.'
        if n.startswith('/diario') or n.startswith('/diário'):
            text = raw.split(' ', 1)[1].strip() if ' ' in raw else 'Registro rápido do dia.'
            p = self.vault.append_memory('05_MEMORIA/diario.md', text)
            return f'[OK] Diário salvo em {p}'
        if 'lembrar' in n or 'salvar' in n or 'guarda' in n or 'guardar' in n:
            text = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else raw
            p = self.vault.append_memory('05_MEMORIA/memoria_manual.md', text)
            return f'[OK] Memória salva em {p}'
        if 'buscar' in n or 'procura' in n or 'procurar' in n:
            q = self._extract_arg(raw, ['buscar','procura','procurar','/memoria buscar','/memória buscar'])
            return self._search_memory(q)
        if 'resumo' in n or 'status' in n:
            return self._memory_summary()
        return 'Memória: /memoria lembrar texto | /memoria buscar termo | /memoria resumo | /diario texto'

    def _search_memory(self, query: str) -> str:
        if not query:
            return 'Use: /memoria buscar termo.'
        q = normalize(query)
        hits = []
        for p in Path(self.vault.path).rglob('*.md'):
            try:
                txt = p.read_text(encoding='utf-8', errors='ignore')
                if q in normalize(txt) or q in normalize(p.name):
                    line = next((ln.strip() for ln in txt.splitlines() if q in normalize(ln)), '')
                    hits.append((p, line[:180]))
            except Exception:
                pass
            if len(hits) >= 12:
                break
        if not hits:
            return f'Não achei "{query}" na memória.'
        lines = [f'Memória: resultados para "{query}":']
        for p,line in hits:
            rel = p.relative_to(self.vault.path) if str(p).startswith(str(self.vault.path)) else p
            lines.append(f'- {rel}: {line}')
        return '\n'.join(lines)

    def _memory_summary(self) -> str:
        base = Path(self.vault.path)
        count = 0; total = 0
        for p in base.rglob('*.md'):
            count += 1
            try: total += p.stat().st_size
            except Exception: pass
        return f'Memória/Vault: {base}\nArquivos .md: {count} | tamanho aprox: {total/1024:.1f} KB'

    # Project -------------------------------------------------------------
    def handle_project(self, raw: str) -> str:
        n = normalize(raw)
        if 'bug' in n:
            return self._project_bugs()
        if 'changelog' in n:
            return self._project_changelog()
        if 'proxima' in n or 'próxima' in n:
            return self._project_next()
        if 'arquivo' in n:
            return self._project_files()
        return self._project_status()

    def _project_status(self) -> str:
        cfgv = self.config.get('version','?')
        pyv = '?'
        try:
            init = (PACK_ROOT/'src/yoru_bridge/__init__.py').read_text(encoding='utf-8')
            m = re.search(r'__version__\s*=\s*["\']([^"\']+)', init); pyv = m.group(1) if m else '?'
        except Exception:
            pass
        return '\n'.join([
            'Projeto Yoru/Noelle:',
            f'- Versão config: {cfgv}',
            f'- Versão pacote: {pyv}',
            f'- Pack root: {PACK_ROOT}',
            '- Estado: MegaPack/ScopeCore + ContractsCore: skills mais fáceis de descobrir, apps favoritos/recentes e tarefas melhoradas; ainda não cria a janela.',
            '- Próximo foco recomendado: testar integração da janela/Godot com AvatarBridge e decidir VLM/OCR avançado depois.'
        ])

    def _project_bugs(self) -> str:
        notes = [
            'Pendências conhecidas:',
            '- Modo widget real ainda não existe; o pack continua terminal/menu.',
            '- /tela captura print e /tela ocr tenta OCR; análise visual real por VLM ainda é futura.',
            '- TTS Edge usa pygame como player interno; fallback externo ainda pode ser usado se pygame falhar.',
            '- Controle de apps é conservador; ações destrutivas não são automáticas. App Inventory agora tem favoritos/recentes.'
        ]
        return '\n'.join(notes)

    def _project_changelog(self) -> str:
        docs = PACK_ROOT/'docs'
        files = sorted(docs.glob('CHANGELOG*.md'), key=lambda p: p.name, reverse=True)[:8]
        if not files:
            return 'Nenhum changelog encontrado.'
        return 'Changelogs recentes:\n' + '\n'.join(f'- {p.name}' for p in files)

    def _project_next(self) -> str:
        return 'Próxima versão sugerida: 1.8.38 WindowBridgeReady ou VisionPrep. Foco: consumir AvatarBridge na janela/Godot e depois avaliar VLM/OCR avançado.'

    def _project_files(self) -> str:
        dirs = ['src/yoru_bridge', 'src/yoru_bridge/skills', 'docs', 'requirements']
        lines = ['Arquivos/pastas do projeto:']
        for d in dirs:
            p = PACK_ROOT/d
            lines.append(f'- {d}: {len(list(p.rglob("*"))) if p.exists() else 0} item(ns)')
        return '\n'.join(lines)

    # Routines ------------------------------------------------------------
    def handle_routines(self, raw: str) -> str:
        n = normalize(raw)
        if n in {'/rotina', '/rotinas', '/rotina list', '/rotinas list'} or 'listar' in n:
            return self._routine_list()
        if 'modo yoru' in n or 'yoru' in n:
            return self._routine_yoru()
        if 'estudo' in n:
            return self._routine_study()
        if 'trabalho' in n:
            return self._routine_work()
        if 'noite' in n:
            return self._routine_night()
        return self._routine_list()

    def _routine_list(self) -> str:
        return 'Rotinas disponíveis: /rotina modo yoru | /rotina estudo | /rotina trabalho | /rotina noite. Mostro checklist, abro pastas seguras e uso skills locais; não clico nem apago nada sem confirmação.'

    def _routine_yoru(self) -> str:
        lines = ['Rotina modo Yoru:']
        lines.append(self._open_path(PACK_ROOT, 'pasta do pack'))
        lines.append('- Checklist: rode /skills status, /pc status, /modelo status, /apps scan se mudou apps, /apps favoritos, /warmup para testar FAST/THINK.')
        return '\n'.join(lines)

    def _routine_study(self) -> str:
        return 'Rotina estudo: feche distrações manualmente, abra material, depois use /tarefa adicionar e /clip resumir para textos copiados.'

    def _routine_work(self) -> str:
        return 'Rotina trabalho: use /pc status, /arquivos recentes, /projeto status e /tarefa hoje. Não fecho apps automaticamente por segurança.'

    def _routine_night(self) -> str:
        return 'Rotina noite: use /exportar para salvar sessão, /tarefa hoje para revisar pendências e /diario texto para registrar o dia.'

    # Helpers -------------------------------------------------------------
    def _extract_arg(self, raw: str, words: List[str]) -> str:
        s = raw.strip()
        for w in words:
            pattern = re.compile(re.escape(w), re.I)
            m = pattern.search(s)
            if m:
                return s[m.end():].strip(' :')
        parts = s.split(' ', 2)
        return parts[2].strip() if len(parts) >= 3 else ''
