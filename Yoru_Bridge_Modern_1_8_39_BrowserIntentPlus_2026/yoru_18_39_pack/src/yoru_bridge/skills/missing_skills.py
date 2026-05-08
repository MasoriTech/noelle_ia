
from __future__ import annotations

import json
import os
import re
import shutil
import socket
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib import request

from ..config import PACK_ROOT
from ..utils.text import normalize


def _run_cmd(cmd: List[str], timeout: int = 8) -> Tuple[int, str]:
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, shell=False)
        out = (p.stdout or '') + ((('\n' + p.stderr) if p.stderr else ''))
        return p.returncode, out.strip()
    except Exception as e:
        return 999, f'{type(e).__name__}: {e}'


def _home_dirs() -> Dict[str, Path]:
    h = Path.home()
    return {
        'downloads': h / 'Downloads',
        'documents': h / 'Documents',
        'desktop': h / 'Desktop',
        'pictures': h / 'Pictures',
    }


class MissingSkills:
    """Complementos seguros da 1.8.29.

    Foco: adicionar o que faltou na DesktopContext sem liberar controle perigoso.
    Ações que fecham janelas, movem arquivos ou limpam cache exigem --confirmar.
    """

    def __init__(self, config: Dict[str, Any], vault: Any = None):
        self.config = config
        self.vault = vault
        self.cfg = config.get('missing_skills', {})
        self.enabled = bool(self.cfg.get('enabled', True))
        self.screenshot_dir = PACK_ROOT / self.cfg.get('screenshots_dir', 'data/screenshots')
        self.screenshot_dir.mkdir(parents=True, exist_ok=True)

    def status(self) -> str:
        return f'MissingSkills: {"ON" if self.enabled else "OFF"} | OCR={self.cfg.get("ocr_enabled", True)} | confirmação={self._confirm_token()}'

    def looks_like_command(self, text: str) -> bool:
        n = normalize(text or '')
        if not n or not self.enabled:
            return False
        prefixes = (
            '/janela', '/janelas', '/window', '/windows',
            '/tela ocr', '/tela ler erro', '/tela ler texto', '/tela texto',
            '/arquivos abrir', '/arquivos organizar downloads', '/arquivos limpar cache yoru', '/files abrir',
            '/clip copiar', '/clipboard copiar', '/modelo api', '/modelo pingapi', '/pc gpu'
        )
        if any(n.startswith(p) for p in prefixes):
            return True
        phrases = ('janelas abertas', 'listar janelas', 'focar janela', 'minimizar tudo', 'fechar janela', 'ler erro na tela', 'texto da tela')
        return any(p in n for p in phrases)

    def handle(self, text: str) -> Optional[str]:
        raw = (text or '').strip()
        n = normalize(raw)
        if not raw or not self.enabled:
            return None
        if n.startswith('/tela') or 'texto da tela' in n or 'ler erro na tela' in n:
            return self.handle_screen(raw)
        if n.startswith('/janela') or n.startswith('/janelas') or n.startswith('/window') or n.startswith('/windows') or any(p in n for p in ['janelas abertas','listar janelas','focar janela','minimizar tudo','fechar janela']):
            return self.handle_windows(raw)
        if n.startswith('/arquivos') or n.startswith('/files'):
            return self.handle_files(raw)
        if n.startswith('/clip copiar') or n.startswith('/clipboard copiar'):
            text = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else ''
            return self.write_clipboard(text)
        if n.startswith('/modelo api') or n.startswith('/modelo pingapi'):
            return self.model_api_status()
        if n.startswith('/pc gpu'):
            return self.gpu_status()
        return None

    # Tela / OCR ---------------------------------------------------------
    def handle_screen(self, raw: str) -> str:
        n = normalize(raw)
        path, msg = self.capture_screen()
        if not path:
            return msg
        ocr = self.ocr_image(path)
        return f'[OK] Print salvo em: {path}\n{ocr}'

    def capture_screen(self) -> Tuple[Optional[Path], str]:
        out = self.screenshot_dir / f'tela_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
        try:
            from PIL import ImageGrab  # type: ignore
            img = ImageGrab.grab()
            img.save(out)
            return out, '[OK] Print capturado.'
        except Exception as e:
            return None, 'Não consegui capturar a tela. Instale Pillow (`pip install pillow`) ou use Print Screen. Detalhe: ' + str(e)[:220]

    def ocr_image(self, path: Path) -> str:
        if not bool(self.cfg.get('ocr_enabled', True)):
            return 'OCR desligado na config.'
        try:
            from PIL import Image  # type: ignore
            import pytesseract  # type: ignore
            lang = str(self.cfg.get('ocr_lang', 'por+eng') or 'por+eng')
            try:
                txt = pytesseract.image_to_string(Image.open(path), lang=lang)
            except Exception:
                txt = pytesseract.image_to_string(Image.open(path))
            txt = (txt or '').strip()
            if not txt:
                return 'OCR: não encontrei texto claro no print.'
            if len(txt) > 4000:
                txt = txt[:4000].rstrip() + '\n...[OCR cortado]'
            return 'OCR encontrado:\n' + txt
        except Exception as e:
            return 'OCR opcional indisponível. Instale Tesseract OCR no Windows e rode `pip install pytesseract pillow`. Detalhe: ' + str(e)[:240]

    # Janelas ------------------------------------------------------------
    def handle_windows(self, raw: str) -> str:
        n = normalize(raw)
        if n in {'/janela','/janelas','/window','/windows'} or 'list' in n or 'listar' in n or 'abertas' in n:
            return self.windows_list()
        if 'minimizar tudo' in n or 'minimize tudo' in n or 'minimizar' in n:
            return self.window_minimize_all()
        if 'focar' in n or 'foco' in n or 'ativar' in n:
            q = self.extract_arg(raw, ['focar','foco','ativar','/janela focar','/window focus'])
            return self.window_focus(q)
        if 'fechar' in n or 'close' in n:
            q = self.extract_arg(raw, ['fechar','close','/janela fechar','/window close'])
            return self.window_close(q, self.confirmed(raw))
        return 'Janelas: /janela list | /janela focar nome | /janela minimizar tudo | /janela fechar nome --confirmar'

    def windows_list(self) -> str:
        if os.name == 'nt':
            ps = 'Get-Process | Where-Object {$_.MainWindowTitle} | Select-Object ProcessName,Id,MainWindowTitle | ConvertTo-Json -Depth 2'
            code, out = _run_cmd(['powershell','-NoProfile','-Command',ps], timeout=8)
            if code == 0 and out:
                try:
                    data = json.loads(out)
                    if isinstance(data, dict):
                        data = [data]
                    rows = [f"- {r.get('ProcessName')}#{r.get('Id')}: {str(r.get('MainWindowTitle'))[:90]}" for r in data[:20]]
                    return 'Janelas abertas:\n' + ('\n'.join(rows) if rows else '- nenhuma janela com título')
                except Exception:
                    pass
        code, out = _run_cmd(['wmctrl','-l'], timeout=6)
        if code == 0 and out:
            return 'Janelas abertas:\n' + '\n'.join('- ' + ln[:120] for ln in out.splitlines()[:20])
        return 'Não consegui listar janelas. No Windows uso PowerShell; no Linux, instale wmctrl.'

    def window_focus(self, query: str) -> str:
        query = (query or '').strip()
        if not query:
            return 'Use: /janela focar nome. Exemplo: /janela focar discord'
        if os.name != 'nt':
            return 'Focar janela automaticamente só está implementado para Windows nesta versão.'
        safe = query.replace("'", "''")
        ps = f"""
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class Win32 {{
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
}}
'@
$q='{safe}'.ToLower();
$p=Get-Process | Where-Object {{$_.MainWindowTitle -and ($_.MainWindowTitle.ToLower().Contains($q) -or $_.ProcessName.ToLower().Contains($q))}} | Select-Object -First 1
if ($p) {{ [Win32]::ShowWindowAsync($p.MainWindowHandle, 9) | Out-Null; [Win32]::SetForegroundWindow($p.MainWindowHandle) | Out-Null; Write-Output ("OK " + $p.ProcessName + " " + $p.MainWindowTitle) }} else {{ Write-Output "NOTFOUND" }}
"""
        code, out = _run_cmd(['powershell','-NoProfile','-Command',ps], timeout=8)
        if 'OK ' in out:
            return '[OK] Foquei a janela: ' + out.split('OK ',1)[1].strip()[:160]
        return f'Não achei janela para focar com "{query}".'

    def window_minimize_all(self) -> str:
        if os.name != 'nt':
            return 'Minimizar tudo automaticamente só está implementado para Windows nesta versão.'
        code, out = _run_cmd(['powershell','-NoProfile','-Command','(New-Object -ComObject Shell.Application).MinimizeAll()'], timeout=5)
        return '[OK] Pedi para minimizar todas as janelas.' if code == 0 else 'Não consegui minimizar: ' + out[:200]

    def window_close(self, query: str, confirmed: bool) -> str:
        query = (query or '').replace(self._confirm_token(), '').strip()
        if not query:
            return 'Use: /janela fechar nome --confirmar. Exemplo: /janela fechar notepad --confirmar'
        protected = {'explorer','python','powershell','cmd','system','svchost','wininit','csrss'}
        if normalize(query) in protected:
            return 'Bloqueado: não fecho processos críticos/sensíveis por chat.'
        if not confirmed:
            return f'Para fechar janela com "{query}", repita com confirmação: /janela fechar {query} --confirmar. Vou tentar fechar normalmente, não à força.'
        if os.name != 'nt':
            return 'Fechar janela automaticamente só está implementado para Windows nesta versão.'
        safe = query.replace("'", "''")
        ps = f"$q='{safe}'.ToLower(); $ps=Get-Process | Where-Object {{$_.MainWindowTitle -and ($_.MainWindowTitle.ToLower().Contains($q) -or $_.ProcessName.ToLower().Contains($q))}}; $n=0; foreach($p in $ps){{ if($p.ProcessName.ToLower() -notin @('explorer','python','powershell','cmd')){{ $null=$p.CloseMainWindow(); $n++ }} }}; Write-Output $n"
        code, out = _run_cmd(['powershell','-NoProfile','-Command',ps], timeout=8)
        try:
            n = int((out or '0').strip().splitlines()[-1])
        except Exception:
            n = 0
        return f'[OK] Pedido de fechamento enviado para {n} janela(s).' if n else f'Não achei janela segura para fechar com "{query}".'

    # Arquivos -----------------------------------------------------------
    def handle_files(self, raw: str) -> str:
        n = normalize(raw)
        if 'abrir' in n:
            q = self.extract_arg(raw, ['abrir','/arquivos abrir','/files abrir'])
            return self.open_file_by_query(q)
        if 'organizar downloads' in n:
            return self.organize_downloads_apply() if self.confirmed(raw) else self.organize_downloads_preview()
        if 'limpar cache yoru' in n:
            return self.clean_yoru_cache() if self.confirmed(raw) else 'Use /arquivos limpar cache yoru --confirmar para remover só prints/áudios antigos do pack.'
        return None  # type: ignore[return-value]

    def file_roots(self) -> List[Path]:
        roots=[]
        for p in (_home_dirs()['downloads'], _home_dirs()['documents'], _home_dirs()['desktop']):
            if p.exists(): roots.append(p)
        return roots

    def open_file_by_query(self, query: str) -> str:
        query=(query or '').strip()
        if not query:
            return 'Use: /arquivos abrir nome. Exemplo: /arquivos abrir yoru.zip'
        q=normalize(query); matches=[]
        for root in self.file_roots():
            try:
                for p in root.rglob('*'):
                    if p.is_file() and q in normalize(p.name):
                        matches.append(p)
                        if len(matches) >= 10: break
            except Exception:
                pass
        if not matches:
            return f'Não achei arquivo para abrir com "{query}".'
        matches=sorted(matches,key=lambda p:p.stat().st_mtime if p.exists() else 0, reverse=True)
        return self.open_path(matches[0], 'arquivo encontrado')

    def classify_file(self, p: Path) -> str:
        s=p.suffix.lower()
        if s=='.zip': return 'zips'
        if s in {'.png','.jpg','.jpeg','.webp','.gif','.bmp'}: return 'imagens'
        if s in {'.pdf','.docx','.txt','.md','.xlsx','.pptx','.csv'}: return 'documentos'
        if s in {'.exe','.msi','.bat','.cmd'}: return 'executaveis'
        return 'outros'

    def organize_downloads_preview(self) -> str:
        d=_home_dirs()['downloads']
        if not d.exists(): return 'Pasta Downloads não encontrada.'
        buckets={'zips':0,'imagens':0,'documentos':0,'executaveis':0,'outros':0}
        for p in d.iterdir():
            if p.is_file(): buckets[self.classify_file(p)] += 1
        return 'Prévia de organização de Downloads, sem mover nada:\n' + '\n'.join(f'- {k}: {v}' for k,v in buckets.items()) + '\nPara mover não-executáveis para Downloads/_YoruOrganizado, use /arquivos organizar downloads --confirmar.'

    def organize_downloads_apply(self) -> str:
        d=_home_dirs()['downloads']
        if not d.exists(): return 'Pasta Downloads não encontrada.'
        base=d/'_YoruOrganizado'; moved=0; skipped=0
        for p in list(d.iterdir()):
            if not p.is_file(): continue
            bucket=self.classify_file(p)
            if bucket=='executaveis': skipped += 1; continue
            target_dir=base/bucket; target_dir.mkdir(parents=True,exist_ok=True)
            target=target_dir/p.name
            if target.exists(): target=target_dir/f'{target.stem}_{int(time.time())}{target.suffix}'
            try: shutil.move(str(p),str(target)); moved += 1
            except Exception: skipped += 1
        return f'[OK] Organização concluída: {moved} arquivo(s) movido(s) para {base}. Ignorados: {skipped}. Executáveis não foram movidos.'

    def clean_yoru_cache(self) -> str:
        cutoff=time.time()-7*24*3600; removed=0; kept=0
        for pattern in ['data/tts/tts_*.mp3','data/screenshots/tela_*.png']:
            for p in PACK_ROOT.glob(pattern):
                try:
                    if p.stat().st_mtime < cutoff: p.unlink(); removed += 1
                    else: kept += 1
                except Exception: kept += 1
        return f'[OK] Cache Yoru limpo: {removed} antigo(s) removido(s); {kept} recente(s) mantido(s).'

    # Clipboard ----------------------------------------------------------
    def write_clipboard(self, text: str) -> str:
        text=(text or '').strip()
        if not text: return 'Use: /clip copiar texto.'
        try:
            import tkinter as tk
            root=tk.Tk(); root.withdraw(); root.clipboard_clear(); root.clipboard_append(text); root.update(); root.destroy()
            return '[OK] Texto copiado para o clipboard.'
        except Exception:
            pass
        if os.name == 'nt':
            code,out=_run_cmd(['powershell','-NoProfile','-Command',f"Set-Clipboard -Value @'\n{text}\n'@"],timeout=6)
            return '[OK] Texto copiado para o clipboard.' if code==0 else 'Não consegui escrever no clipboard: '+out[:200]
        return 'Não consegui escrever no clipboard neste sistema.'

    # Modelo / PC --------------------------------------------------------
    def model_api_status(self) -> str:
        lines=['API do modelo:']
        for key,cfg in self.config.get('models',{}).items():
            url=str(cfg.get('api_url','')).rstrip('/') + '/models'
            try:
                req=request.Request(url,headers={'User-Agent':'YoruBridge/1.8.39'})
                with request.urlopen(req,timeout=2.0) as resp:
                    lines.append(f'- {key}: HTTP {resp.status} em {url}')
            except Exception as e:
                lines.append(f'- {key}: sem resposta em {url} ({type(e).__name__})')
        return '\n'.join(lines)

    def gpu_status(self) -> str:
        if os.name == 'nt':
            code,out=_run_cmd(['wmic','path','win32_VideoController','get','name,AdapterRAM','/format:list'],timeout=6)
            if code==0 and out:
                rows=[]; cur={}
                for line in out.splitlines()+['']:
                    if '=' in line:
                        k,v=line.split('=',1); cur[k.strip()]=v.strip()
                    elif cur:
                        name=cur.get('Name','?'); ram=cur.get('AdapterRAM','')
                        try: ram_s=f'{int(ram)/(1024**3):.1f} GB' if ram and int(ram)>0 else '?'
                        except Exception: ram_s='?'
                        rows.append(f'- {name} | VRAM aprox: {ram_s}'); cur={}
                if rows: return 'GPU/vídeo:\n'+'\n'.join(rows)
        return 'GPU/vídeo: leitura automática indisponível.'

    # Helpers ------------------------------------------------------------
    def open_path(self, path: Path, label: str) -> str:
        try:
            if os.name == 'nt': os.startfile(str(path))  # type: ignore[attr-defined]
            elif sys.platform == 'darwin': subprocess.Popen(['open', str(path)])
            else: subprocess.Popen(['xdg-open', str(path)])
            return f'[OK] Abrindo {label}: {path}'
        except Exception as e:
            return f'Não consegui abrir {label}: {path}\nDetalhe: {e}'

    def _confirm_token(self) -> str:
        return str(self.cfg.get('confirm_token','--confirmar') or '--confirmar')

    def confirmed(self, raw: str) -> bool:
        return self._confirm_token().lower() in (raw or '').lower()

    def extract_arg(self, raw: str, words: List[str]) -> str:
        s=raw.strip()
        for w in words:
            m=re.search(re.escape(w), s, re.I)
            if m: return s[m.end():].strip(' :')
        parts=s.split(' ',2)
        return parts[2].strip() if len(parts)>=3 else ''
