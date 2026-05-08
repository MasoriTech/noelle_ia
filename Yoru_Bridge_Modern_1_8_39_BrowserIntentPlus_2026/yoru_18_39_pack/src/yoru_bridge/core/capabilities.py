from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List

from ..utils.text import normalize

SKILL_COMMANDS = {'/skills', '/skill', '/habilidades', '/funcoes', '/funções', '/capacidades', '/comandos'}
SKILL_EXACT = {
    'skills', 'skill', 'habilidade', 'habilidades', 'funcoes', 'funções',
    'capacidades', 'comandos', 'lista comandos', 'listar comandos',
    'suas skills', 'suas habilidades', 'suas funcoes', 'suas funções'
}
SKILL_PHRASES = (
    'quais suas habilidades', 'quais sao suas habilidades', 'quais são suas habilidades',
    'quais suas skills', 'quais sao suas skills', 'quais são suas skills',
    'que habilidades voce tem', 'que habilidades você tem',
    'que skills voce tem', 'que skills você tem',
    'o que voce sabe fazer', 'o que você sabe fazer',
    'o que voce consegue fazer', 'o que você consegue fazer',
    'o que voce pode fazer', 'o que você pode fazer',
    'lista suas funcoes', 'liste suas funcoes', 'lista suas funções', 'liste suas funções',
    'mostra suas funcoes', 'mostre suas funcoes', 'mostra suas funções', 'mostre suas funções',
    'me mostre suas skills', 'me mostra suas skills',
    'me mostre suas habilidades', 'me mostra suas habilidades',
    'qual suas habilidades', 'qual sao suas habilidades', 'qual são suas habilidades',
    'quais comandos voce tem', 'quais comandos você tem',
    'meus comandos', 'seus comandos', 'comandos disponiveis', 'comandos disponíveis',
)


@dataclass(frozen=True)
class SkillItem:
    name: str
    category: str
    commands: tuple[str, ...]
    description: str
    safety: str = 'local/seguro'


SKILL_CATALOG: tuple[SkillItem, ...] = (
    SkillItem('Cérebros FAST/THINK/DUAL', 'cerebro', ('/fast texto', '/think texto', '/dual texto', '/cerebro status', '/fastbrain status'), 'roteia conversa leve, técnica e dupla revisão'),
    SkillItem('ContractsCore', 'resposta', ('/contratos status', '/contratos testar texto', '/contratos modo rigido', '/scope status'), 'contratos de resposta: lista, sim/não, data, comparação, tutorial, bug/código e detalhe'),
    SkillItem('Web Knowledge', 'web', ('/web pergunta', '/pesquisa texto', '/web cache clear'), 'pesquisa perguntas atuais com fontes compactas'),
    SkillItem('Navegador', 'web', ('abra youtube', 'pesquise X no youtube', '/site add nome url', '/sites'), 'abre sites seguros e pesquisas'),
    SkillItem('App Inventory', 'pc', ('/apps scan', '/apps list', '/apps buscar nome', '/apps abrir nome', '/apps favoritos', '/apps recentes'), 'sabe programas instalados, favoritos e recentes'),
    SkillItem('DesktopContext', 'pc', ('/pc status', '/pc diagnostico', '/pc processos', '/pc python'), 'diagnóstico local do PC'),
    SkillItem('Modelo/KoboldCpp', 'modelo', ('/modelo status', '/modelo api', '/warmup', '/check'), 'verifica portas, API e caminhos de modelos'),
    SkillItem('Tela/OCR', 'pc', ('/tela capturar', '/tela ocr', '/tela ler erro'), 'captura tela e tenta OCR opcional'),
    SkillItem('Janelas', 'pc', ('/janela list', '/janela focar nome', '/janela minimizar tudo', '/janela fechar nome --confirmar'), 'controle conservador de janelas'),
    SkillItem('Arquivos', 'arquivos', ('/arquivos recentes', '/arquivos buscar nome', '/arquivos abrir nome', '/arquivos organizar downloads'), 'busca/abre arquivos e organiza downloads com confirmação'),
    SkillItem('Clipboard', 'texto', ('/clip ler', '/clip resumir', '/clip melhorar', '/clip traduzir', '/clip copiar texto'), 'lê, copia e manda texto copiado para THINK quando pedido'),
    SkillItem('Tarefas', 'produtividade', ('/tarefa adicionar texto', '/tarefa hoje', '/tarefa concluir 1', '/tarefa remover 1', '/tarefa limpar concluidas'), 'tarefas locais simples em data/tasks.json'),
    SkillItem('Memória/Vault', 'memoria', ('/memoria lembrar texto', '/memoria buscar termo', '/memoria resumo', '/diario texto', '/exportar'), 'usa vault local da Yoru'),
    SkillItem('Projeto', 'projeto', ('/projeto status', '/projeto bugs', '/projeto changelog', '/projeto proxima versao', '/projeto arquivos'), 'acompanha estado do projeto Yoru/Noelle'),
    SkillItem('Rotinas', 'produtividade', ('/rotina modo yoru', '/rotina estudo', '/rotina trabalho', '/rotina noite'), 'checklists seguros'),
    SkillItem('AvatarBridge', 'avatar', ('/avatar status', '/avatar teste', '/avatar eventos', '/avatar emote happy', '/avatar dizer texto'), 'eventos JSONL para janela/Godot consumir'),
    SkillItem('TTS/STT/Stream', 'voz', ('/tts status', '/tts teste', '/tts parar', '/ouvir', '/stream status'), 'voz brasileira feminina via Edge TTS + pygame; STT/stream opcionais'),
    SkillItem('DownloadCenter', 'setup', ('/baixar status', '/baixar tudo', '/baixar modelos', '/baixar deps', '/baixar kobold'), 'verifica e baixa tudo que falta de uma vez'),
    SkillItem('MegaCheck', 'diagnostico', ('/mega check', '/diagnostico pack', '/perf', '/cache'), 'auditoria local do pack'),
)


def _skill_norm(text: str) -> str:
    n = normalize(text)
    n = re.sub(r"[^a-z0-9/ ]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def is_skills_question(text: str) -> bool:
    """Detecta pedidos de habilidades sem mandar para o modelo inventar resposta."""
    n = _skill_norm(text)
    if not n:
        return False
    if any(n == cmd or n.startswith(cmd + ' ') for cmd in SKILL_COMMANDS):
        return True
    exact = {_skill_norm(x) for x in SKILL_EXACT}
    if n in exact:
        return True
    return any(_skill_norm(p) in n for p in SKILL_PHRASES)


def _config_bool(config: Dict[str, Any] | None, section: str, key: str, default: bool = True) -> bool:
    try:
        return bool((config or {}).get(section, {}).get(key, default))
    except Exception:
        return default


def _runtime_file_status(config: Dict[str, Any] | None) -> Dict[str, str]:
    out: Dict[str, str] = {}
    try:
        from ..config import PACK_ROOT
        if config:
            inv_rel = (config.get('apps') or {}).get('inventory_file', 'data/apps_inventory.json')
            prefs_rel = (config.get('apps') or {}).get('apps_prefs_file', 'data/apps_prefs.json')
            tasks_rel = (config.get('desktop_context') or {}).get('tasks_file', 'data/tasks.json')
            events_rel = (config.get('avatar_bridge') or {}).get('event_log_path', 'data/avatar_events.jsonl')
        else:
            inv_rel, prefs_rel, tasks_rel, events_rel = 'data/apps_inventory.json', 'data/apps_prefs.json', 'data/tasks.json', 'data/avatar_events.jsonl'
        for key, rel in {'apps': inv_rel, 'apps_prefs': prefs_rel, 'tasks': tasks_rel, 'avatar_events': events_rel}.items():
            p = PACK_ROOT / rel
            out[key] = 'existe' if p.exists() else 'não criado'
    except Exception:
        pass
    return out


def _inventory_status(config: Dict[str, Any] | None) -> str:
    if not config:
        return "Programas do PC: /apps scan, /apps list, /apps buscar nome, /apps abrir nome."
    try:
        from ..config import PACK_ROOT
        inv_rel = (config.get('apps') or {}).get('inventory_file', 'data/apps_inventory.json')
        inv_path = PACK_ROOT / inv_rel
        if not inv_path.exists():
            return "Programas do PC: inventário ainda não criado. Use /apps scan."
        data = json.loads(inv_path.read_text(encoding='utf-8'))
        count = int(data.get('count') or len(data.get('apps') or []))
        generated = data.get('generated_at') or 'nunca'
        if count <= 0:
            return "Programas do PC: inventário vazio. Use /apps scan no seu Windows."
        prefs_path = PACK_ROOT / (config.get('apps') or {}).get('apps_prefs_file', 'data/apps_prefs.json')
        favs = 0
        if prefs_path.exists():
            try:
                prefs = json.loads(prefs_path.read_text(encoding='utf-8'))
                favs = len(prefs.get('favorites') or [])
            except Exception:
                favs = 0
        return f"Programas do PC: {count} app(s) no inventário local; favoritos={favs}. Atualizado: {generated}."
    except Exception:
        return "Programas do PC: /apps scan, /apps list, /apps buscar nome, /apps abrir nome."


def build_capabilities_text(config: Dict[str, Any] | None = None) -> str:
    """Resumo curto das habilidades reais da Bridge."""
    runtime = (config or {}).get('runtime', {}) if config else {}
    brain = runtime.get('brain_mode', 'auto')
    fastbrain = runtime.get('fast_brain_preset', 'fast_qwen35_08b_turbo')
    web_on = _config_bool(config, 'web_knowledge', 'enabled', True)
    tts_on = _config_bool(config, 'tts', 'enabled', True)
    stt_on = _config_bool(config, 'stt', 'enabled', True)
    stream_on = _config_bool(config, 'stream', 'enabled', True)
    apps_on = _config_bool(config, 'apps', 'enabled', True)
    scope_on = bool(runtime.get('answer_scope_enabled', True))

    lines = [
        "Eu sou a Yoru. Minhas habilidades reais neste pack são:",
        "",
        f"1. Conversar em FAST, THINK ou DUAL. Cérebro atual: {brain}. FastBrain: {fastbrain}.",
        f"2. ContractsCore/ScopeCore: {'ligado' if scope_on else 'desligado'}; lista/data/sim-não/comparação/tutorial/debug obedecem ao pedido.",
        "3. Analisar código, bugs, configs e estrutura do projeto Noelle/Yoru com /think.",
        "4. Usar memória/vault local do projeto e exportar sessão com /exportar.",
        f"5. Web Knowledge: {'ligado' if web_on else 'desligado'}; /web pergunta e /pesquisa texto.",
    ]
    lines.append("6. App Inventory: /apps scan, /apps list, /apps buscar, /apps abrir, /apps favoritos, /apps recentes." if apps_on else "6. App Inventory está desligado na config.")
    lines.extend([
        f"7. Voz/TTS: {'ligado' if tts_on else 'desligado'}; Edge pt-BR-FranciscaNeural + player pygame; /tts status, /tts teste, /tts parar.",
        f"8. STT/ouvir: {'ligado' if stt_on else 'desligado'}; /ouvir, /ctrlvoz, /stt diagnostico.",
        f"9. Chat Stream: {'ligado' if stream_on else 'desligado'}; /stream status, /stream on.",
        "10. Desktop: /tela ocr, /janela list/focar/minimizar/fechar com confirmação, /pc status, /pc gpu, /modelo api, /arquivos, /clip, /tarefa, /projeto e /rotina.",
        "11. AvatarBridge: /avatar status, /avatar teste, /avatar eventos, /avatar emote e /avatar dizer para janela externa consumir eventos locais.",
        "12. Diagnóstico: /mega check, /perf, /check, /modelos, /cache.",
        "",
        _inventory_status(config),
        "",
        "Comandos do SkillHub: /skills status | /skills comandos | /skills buscar termo | /skills exemplos.",
        "Eu não tenho controle livre do PC. Só executo skills locais seguras e comandos reconhecidos.",
    ])
    return "\n".join(lines)


def build_skills_status(config: Dict[str, Any] | None = None) -> str:
    cfg = config or {}
    rt = cfg.get('runtime', {}) or {}
    files = _runtime_file_status(config)
    rows = [
        ('ScopeCore', rt.get('answer_scope_enabled', True), '/scope status'),
        ('Web Knowledge', _config_bool(config, 'web_knowledge', 'enabled', True), '/web status'),
        ('Navegador', _config_bool(config, 'browser', 'enabled', True), '/sites'),
        ('App Inventory', _config_bool(config, 'apps', 'enabled', True), '/apps status'),
        ('DesktopContext', _config_bool(config, 'desktop_context', 'enabled', True), '/desktop'),
        ('MissingSkills', _config_bool(config, 'missing_skills', 'enabled', True), '/janela list'),
        ('AvatarBridge', _config_bool(config, 'avatar_bridge', 'enabled', True), '/avatar status'),
        ('RuntimeState', _config_bool(config, 'runtime_state', 'enabled', True), '/avatar status'),
        ('TTS', _config_bool(config, 'tts', 'enabled', True), '/tts status'),
        ('STT', _config_bool(config, 'stt', 'enabled', True), '/stt diagnostico'),
        ('Stream', _config_bool(config, 'stream', 'enabled', True), '/stream status'),
        ('MegaCheck', _config_bool(config, 'mega_pack', 'enabled', True), '/mega check'),
    ]
    lines = ['=== SkillHub / Status das skills ===']
    lines.append(f"Pack: {cfg.get('version', '?')} | cérebro={rt.get('brain_mode','auto')} | scope={'ON' if rt.get('answer_scope_enabled', True) else 'OFF'}")
    for name, enabled, cmd in rows:
        lines.append(f"- {name}: {'ON' if enabled else 'OFF'} | teste: {cmd}")
    if files:
        lines.append('Arquivos locais: ' + ' | '.join(f'{k}={v}' for k, v in files.items()))
    lines.append('Use /skills comandos para ver comandos por categoria ou /skills buscar termo.')
    return '\n'.join(lines)


def build_skills_commands(config: Dict[str, Any] | None = None) -> str:
    by_cat: Dict[str, List[SkillItem]] = {}
    for item in SKILL_CATALOG:
        by_cat.setdefault(item.category, []).append(item)
    lines = ['=== Comandos por skill ===']
    for cat in sorted(by_cat):
        lines.append(f'[{cat}]')
        for item in by_cat[cat]:
            cmds = ' | '.join(item.commands)
            lines.append(f'- {item.name}: {cmds}')
    lines.append('Dica: /skills buscar apps, /skills buscar tela, /skills buscar tarefa, etc.')
    return '\n'.join(lines)


def build_skills_examples(config: Dict[str, Any] | None = None) -> str:
    return '\n'.join([
        'Exemplos úteis:',
        '- “o que você sabe fazer?” -> mostra /skills sem usar modelo.',
        '- /skills status -> painel ON/OFF das skills.',
        '- /skills buscar arquivo -> mostra comandos ligados a arquivos.',
        '- /apps favoritos -> lista apps favoritos.',
        '- /apps favorito add Discord -> fixa Discord como favorito.',
        '- /apps recentes -> mostra últimos apps abertos pela Yoru.',
        '- /tarefa remover 2 -> remove tarefa local #2.',
        '- /tarefa limpar concluidas -> limpa tarefas finalizadas.',
        '- /scope exemplos -> exemplos de resposta filtrada.',
    ])


def search_skills(query: str) -> str:
    q = _skill_norm(query)
    if not q:
        return 'Use: /skills buscar termo. Exemplo: /skills buscar apps'
    hits: list[SkillItem] = []
    for item in SKILL_CATALOG:
        hay = _skill_norm(' '.join([item.name, item.category, item.description, ' '.join(item.commands)]))
        if q in hay:
            hits.append(item)
    if not hits:
        return f'Não achei skill para "{query}". Tente: apps, tela, arquivo, tarefa, voz, web, modelo, avatar.'
    lines = [f'Skills encontradas para "{query}":']
    for item in hits[:12]:
        lines.append(f'- {item.name}: {item.description}. Comandos: ' + ' | '.join(item.commands))
    return '\n'.join(lines)


def handle_skills_command(raw: str, config: Dict[str, Any] | None = None) -> str:
    n = _skill_norm(raw)
    if not n:
        return build_capabilities_text(config)
    # Aceita alias em português.
    if n.startswith('/comandos') or n == 'comandos' or 'comandos disponiveis' in n or 'comandos disponíveis' in n:
        return build_skills_commands(config)
    # /skills subcomandos.
    if any(n == p or n.startswith(p + ' ') for p in ['/skills', '/skill', '/habilidades', '/funcoes', '/funções', '/capacidades']):
        parts = n.split()
        sub = parts[1] if len(parts) > 1 else ''
        rest = ' '.join(parts[2:]) if len(parts) > 2 else ''
        if sub in {'status', 'estado', 'diagnostico', 'diagnóstico', 'check'}:
            return build_skills_status(config)
        if sub in {'comandos', 'cmds', 'lista', 'listar'}:
            return build_skills_commands(config)
        if sub in {'exemplos', 'exemplo', 'uso'}:
            return build_skills_examples(config)
        if sub in {'buscar', 'busca', 'find', 'procurar'}:
            return search_skills(rest)
        if sub in {'help', 'ajuda'}:
            return 'SkillHub: /skills | /skills status | /skills comandos | /skills buscar termo | /skills exemplos'
        # Se veio /skills termo, trata como busca, mas /skills sozinho mostra resumo.
        if sub:
            return search_skills(' '.join(parts[1:]))
        return build_capabilities_text(config)
    if any(w in n for w in ['status', 'diagnostico', 'diagnóstico']) and 'skill' in n:
        return build_skills_status(config)
    if any(w in n for w in ['comando', 'comandos']):
        return build_skills_commands(config)
    return build_capabilities_text(config)
