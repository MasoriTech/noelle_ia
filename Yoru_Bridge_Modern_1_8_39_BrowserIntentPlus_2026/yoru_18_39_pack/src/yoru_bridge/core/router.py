from __future__ import annotations
from dataclasses import dataclass
from typing import Optional
from .local_responses import local_response
from .capabilities import is_skills_question
from ..utils.text import normalize
from ..skills.browser import looks_like_browser_command

@dataclass
class Route:
    kind: str  # local, browser, apps, desktop, avatar, downloader, skills, voice, model, stream, menu, exit, none
    model: str = 'auto'  # fast, think, auto
    profile: str = 'companion'
    command: Optional[str] = None
    payload: str = ''

TECH_WORDS = ['erro','log','bug','codigo','código','python','config','porta','kobold','tts','stt','whisper','faster','playwright','electron','stack','traceback']
PROJECT_WORDS = ['noelle','yoru','projeto','bridge','obsidian','vault','avatar','stream','pack','fase','estrutura']
KNOW_WORDS = ['quem e','quem é','quem foi','quem era','o que e','o que é','qual e','qual é','explique','resuma','teoria','historia','história','black clover','anime','copa','brasil','silvio santos','teseu']
CREATIVE_WORDS = ['frase','personalidade','estilo','fala','criativo','crie','ideia']
BROWSER_WORDS = ['abra ', 'abre ', 'abri ', 'abrir ', 'pesquisa ', 'pesquise ', 'pesquisar ', 'pesqusia ', 'procure ', 'procura ', 'buscar ', 'busque ', 'busca ', 'veja no google', 'olha no google', 'youtube', 'google']
APP_CMD_PREFIXES = ['abra o programa ', 'abre o programa ', 'abrir o programa ', 'abra programa ', 'abre programa ', 'abrir programa ', 'abra o app ', 'abre o app ', 'abrir o app ', 'abra app ', 'abre app ', 'abrir app ', 'execute ', 'executa ', 'rodar ', 'rode ', 'inicie ', 'iniciar ']
AVATAR_PREFIXES = ('/avatar','/bridge','/godot')
DOWNLOAD_PREFIXES = ('/baixar','/download','/downloads')
DESKTOP_PREFIXES = ('/tela','/pc','/modelo','/arquivos','/files','/clip','/clipboard','/tarefa','/tarefas','/lembra','/lembrete','/memoria','/memória','/diario','/diário','/projeto','/rotina','/rotinas','/desktop','/janela','/janelas','/window','/windows')
APP_STATUS = {'programas','meus programas','apps','aplicativos','quais programas tenho','que programas tenho','lista programas','listar programas','mostra meus programas','mostrar meus programas'}

def _after_cmd(raw: str) -> str:
    return raw.split(' ', 1)[1].strip() if ' ' in raw else ''

def _cmd(n: str, name: str) -> bool:
    return n == name or n.startswith(name + ' ')

def _any_cmd_prefix(n: str, prefixes) -> bool:
    return any(n == p or n.startswith(p + ' ') for p in prefixes)

def route_message(text: str, default_model: str = 'auto') -> Route:
    raw = (text or '').strip()
    n = normalize(raw)
    if not raw:
        return Route('none')
    if raw in {'0','/menu','menu','voltar'}:
        return Route('menu')
    if n in {'sair','/sair','exit','quit'}:
        return Route('exit')

    # comandos locais/skills antes do modelo
    if _cmd(n, '/scope'):
        return Route('local', payload='Use /scope status, /scope on, /scope off ou /scope exemplos.')
    if is_skills_question(raw):
        return Route('skills', command=raw)
    if _any_cmd_prefix(n, DOWNLOAD_PREFIXES) or n in {'baixar tudo', 'baixar modelos', 'verificar downloads'}:
        return Route('downloader', command=raw)
    if _cmd(n, '/apps') or _cmd(n, '/programas') or n in APP_STATUS or any(n.startswith(x) for x in APP_CMD_PREFIXES):
        return Route('apps', command=raw)
    if _any_cmd_prefix(n, AVATAR_PREFIXES):
        return Route('avatar', command=raw)
    if _any_cmd_prefix(n, DESKTOP_PREFIXES) or any(p in n for p in ['status do pc','arquivos recentes','ler clipboard','area de transferencia','área de transferência','status do projeto','proxima versao','próxima versão','modo yoru','janelas abertas','listar janelas','focar janela','minimizar tudo','fechar janela']):
        return Route('desktop', command=raw)
    if _cmd(n, '/stream') or n in {'chat stream','stream'}:
        return Route('stream', command=raw)
    if _cmd(n, '/voz') or _cmd(n, '/tts') or n in {'/testarvoz','/pararvoz','/limparvoz'} or n.startswith('/falar'):
        return Route('voice', command=raw)
    if _cmd(n, '/ouvir') or _cmd(n, '/ctrlvoz') or _cmd(n, '/stt'):
        return Route('voice', command=raw)
    if _cmd(n, '/abrir') or _cmd(n, '/pesquisar') or _cmd(n, '/pesquisa') or _cmd(n, '/site') or _cmd(n, '/sites'):
        return Route('browser', command=raw)
    if looks_like_browser_command(raw):
        return Route('browser', command=raw)

    # comandos de modelo explícitos
    if _cmd(n, '/fast'):
        return Route('model', model='fast', profile='companion', payload=raw[5:].strip())
    if _cmd(n, '/think'):
        return Route('model', model='think', profile='technical', payload=raw[6:].strip())
    if _cmd(n, '/dual'):
        return Route('model', model='dual', profile='technical', payload=raw[5:].strip())
    if _cmd(n, '/tecnico') or _cmd(n, '/técnico'):
        return Route('model', model='think', profile='technical', payload=_after_cmd(raw))
    if _cmd(n, '/projeto'):
        return Route('model', model='think', profile='project', payload=_after_cmd(raw))
    if _cmd(n, '/saber'):
        return Route('model', model='think', profile='knowledge', payload=_after_cmd(raw))
    if _cmd(n, '/criativo'):
        return Route('model', model='fast', profile='creative', payload=_after_cmd(raw))

    # roteador local: evita chamar Qwen para coisa simples
    lr = local_response(raw)
    if lr is not None:
        return Route('local', payload=lr)

    # roteamento leve: só usa THINK quando realmente precisa
    if any(w in n for w in TECH_WORDS):
        return Route('model', model='think', profile='technical', payload=raw)
    if any(w in n for w in PROJECT_WORDS):
        return Route('model', model='think', profile='project', payload=raw)
    # Perguntas de conhecimento sempre vão para THINK. Evita o FAST responder genérico ou sem tokens.
    if any(w in n for w in KNOW_WORDS) or n.startswith(('quem ', 'o que ', 'qual ', 'quando ', 'onde ', 'por que ', 'porque ')):
        return Route('model', model='think', profile='knowledge', payload=raw)
    if any(w in n for w in CREATIVE_WORDS):
        return Route('model', model='fast', profile='creative', payload=raw)
    if '?' in raw:
        return Route('model', model='think', profile='knowledge', payload=raw)

    # padrão turbo: conversa leve no FAST sem memória/histórico
    return Route('model', model='fast' if default_model == 'auto' else default_model, profile='companion', payload=raw)
