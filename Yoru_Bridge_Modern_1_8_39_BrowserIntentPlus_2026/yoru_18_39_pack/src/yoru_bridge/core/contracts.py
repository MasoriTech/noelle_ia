from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Dict

from ..utils.text import normalize


@dataclass(frozen=True)
class ResponseContract:
    kind: str = 'direct'
    label: str = 'direto'
    detail_allowed: bool = False
    needs_search: bool = False
    requested_count: int | None = None
    instruction: str = ''
    max_tokens_key: str = 'default'


_NUMBER_WORDS = {
    'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'três': 3, 'quatro': 4,
    'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10,
    'onze': 11, 'doze': 12, 'quinze': 15, 'vinte': 20,
}


def _num_from_text(value: str | None) -> int | None:
    if not value:
        return None
    value = value.strip().lower()
    if value.isdigit():
        return max(1, min(50, int(value)))
    return _NUMBER_WORDS.get(value)


def extract_requested_count(text: str) -> int | None:
    n = normalize(text)
    patterns = [
        r'\btop\s*(\d{1,2}|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte)\b',
        r'\b(\d{1,2}|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte)\s+(melhores|maiores|piores|mais|animes|filmes|jogos|series|séries|opcoes|opções|itens|programas|apps)\b',
    ]
    for pat in patterns:
        m = re.search(pat, n)
        if m:
            got = _num_from_text(m.group(1))
            if got:
                return got
    return None


def _has_any(n: str, words: list[str] | tuple[str, ...]) -> bool:
    return any(w in n for w in words)


def classify_contract(text: str) -> ResponseContract:
    raw = text or ''
    n = normalize(raw)
    count = extract_requested_count(n)

    detail_markers = (
        'me fale mais', 'fale mais', 'explique', 'explica', 'detalhe', 'detalha', 'analise', 'análise',
        'por que', 'porque', 'como funciona', 'resuma', 'resumo', 'sinopse', 'sobre o numero', 'sobre o número',
        'numero ', 'número ', 'item ', 'opcao ', 'opção ', 'desenvolva', 'aprofundar', 'aprofundado',
        'me conta mais', 'conte mais', 'mais detalhes', 'detalhes sobre'
    )
    asks_detail = _has_any(n, detail_markers)

    code_markers = (
        'traceback', 'stack trace', 'erro no codigo', 'erro no código', 'bug', 'corrija esse codigo', 'corrija esse código',
        'analise esse codigo', 'analise esse código', 'review do codigo', 'review do código', 'por que quebrou',
        'nao compila', 'não compila', 'exception', 'syntaxerror', 'importerror', 'modulenotfounderror'
    )
    if _has_any(n, code_markers):
        return ResponseContract(
            kind='code_debug', label='debug/código', detail_allowed=True, needs_search=False, max_tokens_key='code',
            instruction=(
                'CONTRATO DE RESPOSTA - DEBUG/CÓDIGO: comece pela causa provável. Depois mostre a correção mínima. '
                'Não reescreva o projeto inteiro. Se faltar informação, diga exatamente qual arquivo/log falta. '
                'Use passos curtos e evite teoria que não ajuda a corrigir.'
            ),
        )

    comparison_markers = ('compare ', 'comparar ', 'diferença entre', 'diferenca entre', 'qual e melhor', 'qual é melhor', 'versus', ' vs ')
    if _has_any(n, comparison_markers):
        return ResponseContract(
            kind='comparison', label='comparação', detail_allowed=True, needs_search=_has_any(n, ('2026','atual','hoje','recente','melhor')),
            max_tokens_key='comparison',
            instruction=(
                'CONTRATO DE RESPOSTA - COMPARAÇÃO: compare somente os itens pedidos. Use critérios objetivos. '
                'Feche com uma recomendação direta. Não adicione alternativas que o usuário não pediu, a menos que sejam essenciais.'
            ),
        )

    how_to_markers = ('como faço', 'como fazer', 'como configurar', 'como instalo', 'como instalar', 'passo a passo', 'tutorial')
    if _has_any(n, how_to_markers):
        return ResponseContract(
            kind='how_to', label='passo a passo', detail_allowed=True, needs_search=_has_any(n, ('2026','atual','versao','versão','download')),
            max_tokens_key='how_to',
            instruction=(
                'CONTRATO DE RESPOSTA - PASSO A PASSO: entregue ações numeradas na ordem certa. '
                'Comece pelo primeiro passo prático. Não dê introdução longa. Não misture opções demais.'
            ),
        )

    list_markers = (
        'top ', 'top10', 'ranking', 'lista de', 'liste ', 'listar ', 'me de uma lista', 'me dê uma lista',
        'quais sao os', 'quais são os', 'melhores ', 'maiores ', 'piores ', 'recomende ', 'indique '
    )
    if (count is not None or _has_any(n, list_markers)) and not asks_detail:
        c = count or 10
        return ResponseContract(
            kind='list_only', label='lista direta', detail_allowed=False,
            needs_search=_has_any(n, ('2026','2025','atual','hoje','recente','melhor','top','ranking','lançamento','lancamento')),
            requested_count=c, max_tokens_key='list',
            instruction=(
                f'CONTRATO DE RESPOSTA - LISTA: entregue exatamente {c} itens numerados, um por linha. '
                'Não escreva resumo, sinopse, motivo, nota, histórico ou parágrafo de cada item. '
                'Não transforme os itens em mini-review. Se quiser oferecer continuidade, use no máximo uma linha final curta: '
                '"Se quiser, eu explico qualquer número da lista." Fontes, quando houver, devem ficar compactas no final.'
            ),
        )

    if asks_detail:
        return ResponseContract(
            kind='detail_requested', label='detalhe pedido', detail_allowed=True,
            needs_search=_has_any(n, ('2026','2025','atual','hoje','recente','palmeiras','corinthians')),
            max_tokens_key='detail',
            instruction=(
                'CONTRATO DE RESPOSTA - DETALHE: explique somente o item ou tema pedido. '
                'Se o usuário citar "número 4" ou "item 4", não refaça a lista inteira. '
                'Pode ser completo, mas permaneça dentro do escopo.'
            ),
        )

    if n.startswith('quando ') or ' foi fundado' in n or ' foi fundada' in n or 'data de fundacao' in n or 'data de fundação' in n:
        return ResponseContract(
            kind='date_fact', label='data direta', detail_allowed=False, needs_search=True, max_tokens_key='fact',
            instruction=(
                'CONTRATO DE RESPOSTA - DATA: comece pela data exata ou pelo ano, sem introdução. '
                'Depois dê no máximo uma frase de contexto. Não conte a história completa a menos que o usuário peça.'
            ),
        )

    yes_no_patterns = [
        r'\b(ganhou|tem|possui|foi campea|foi campeão|e campeao|é campeão|existe|e verdade|é verdade|conseguiu|vence|venceu)\b',
        r'^(palmeiras|corinthians|sao paulo|são paulo|flamengo|santos|gremio|grêmio|vasco)\b.*\?',
    ]
    if raw.strip().endswith('?') and any(re.search(p, n) for p in yes_no_patterns):
        return ResponseContract(
            kind='yes_no_fact', label='sim/não direto', detail_allowed=False, needs_search=True, max_tokens_key='fact',
            instruction=(
                'CONTRATO DE RESPOSTA - SIM/NÃO: comece com "Sim", "Não" ou "Depende". '
                'Depois use só 1 ou 2 frases para ressalva de critério/polêmica. '
                'Não faça linha do tempo, lista de títulos ou aula se o usuário não pediu.'
            ),
        )

    if n.startswith(('quem ', 'qual ', 'quais ', 'onde ', 'o que ')):
        return ResponseContract(
            kind='short_fact', label='fato curto', detail_allowed=False,
            needs_search=_has_any(n, ('2026','2025','atual','hoje','recente','ultimo','último','palmeiras','corinthians','mundial')),
            max_tokens_key='fact',
            instruction=(
                'CONTRATO DE RESPOSTA - FATO CURTO: responda primeiro somente o que foi perguntado. '
                'Contexto só se for necessário para não enganar. Não adicione história, curiosidades ou lista extra.'
            ),
        )

    return ResponseContract(
        kind='direct', label='direto', detail_allowed=False, needs_search=False, max_tokens_key='default',
        instruction=(
            'CONTRATO DE RESPOSTA - DIRETO: responda exatamente o que foi pedido. '
            'Não expanda para resumo, histórico, explicação longa, curiosidades ou tópicos extras sem pedido claro.'
        ),
    )


def build_contract_instruction(text: str, config: Dict[str, Any] | None = None) -> str:
    if config is not None:
        runtime = config.get('runtime', {}) or {}
        contracts = config.get('contracts', {}) or {}
        if not runtime.get('answer_scope_enabled', True) or not contracts.get('enabled', True):
            return ''
        mode = str(contracts.get('mode', 'normal')).lower()
    else:
        mode = 'normal'
    c = classify_contract(text)
    suffix = ''
    if mode in {'rigido', 'rígido', 'strict'}:
        suffix = '\nMODO RÍGIDO: não acrescente seções extras; se a resposta já estiver completa, pare.'
    return c.instruction + suffix


def max_tokens_for_contract(text: str, config: Dict[str, Any], model_key: str = 'think') -> int | None:
    if model_key != 'think':
        return None
    rt = config.get('runtime', {}) or {}
    c = classify_contract(text)
    key = c.max_tokens_key
    if key == 'list':
        return int(rt.get('think_max_tokens_scope_list', 260))
    if key == 'fact':
        return int(rt.get('think_max_tokens_scope_fact', 180))
    if key == 'detail':
        return int(rt.get('think_max_tokens_scope_detail', 420))
    if key == 'code':
        return int(rt.get('think_max_tokens_scope_code', 520))
    if key in {'comparison', 'how_to'}:
        return int(rt.get('think_max_tokens_scope_detail', 420))
    return int(rt.get('think_max_tokens_scope_default', 320))


def contracts_status(config: Dict[str, Any]) -> str:
    rt = config.get('runtime', {}) or {}
    cc = config.get('contracts', {}) or {}
    return '\n'.join([
        '=== ContractsCore 1.8.39 ===',
        f"enabled={cc.get('enabled', True)} | mode={cc.get('mode', 'normal')} | scope={rt.get('answer_scope_enabled', True)} | debug={cc.get('debug', False) or rt.get('scope_debug', False)}",
        'Contratos ativos: list_only, yes_no_fact, date_fact, detail_requested, comparison, how_to, code_debug, short_fact, direct.',
        'Regra central: resposta completa quando pedida, mas só dentro do escopo do pedido.',
        'Comandos: /contratos status | /contratos exemplos | /contratos testar texto | /contratos modo rigido|normal | /contratos on|off | /contratos debug on|off',
    ])


def contracts_examples() -> str:
    return (
        'Exemplos de contratos:\n'
        '- top 10 animes de 2026 -> list_only: 10 nomes numerados, sem resumo de cada anime.\n'
        '- me fale mais do número 4 -> detail_requested: explica só o item 4.\n'
        '- Palmeiras ganhou mundial? -> yes_no_fact: começa com Não/Depende e ressalva curta.\n'
        '- quando Corinthians foi fundado? -> date_fact: começa pela data.\n'
        '- compare pygame e sounddevice -> comparison: compara só os dois e recomenda.\n'
        '- como configurar o TTS -> how_to: passos práticos.\n'
        '- analise esse traceback -> code_debug: causa provável, risco e correção mínima.'
    )


def handle_contracts_command(raw: str, config: Dict[str, Any], save_cb=None) -> str | None:
    n = normalize(raw)
    if not (n == '/contratos' or n.startswith('/contratos ')):
        return None
    cc = config.setdefault('contracts', {})
    rt = config.setdefault('runtime', {})
    if n in {'/contratos', '/contratos status'}:
        return contracts_status(config)
    if n == '/contratos exemplos':
        return contracts_examples()
    if n == '/contratos on':
        cc['enabled'] = True
        rt['answer_scope_enabled'] = True
        if save_cb: save_cb(config)
        return '[OK] ContractsCore ligado.'
    if n == '/contratos off':
        cc['enabled'] = False
        if save_cb: save_cb(config)
        return '[OK] ContractsCore desligado. ScopeCore pode continuar se estiver ligado, mas os contratos novos ficam inativos.'
    if n in {'/contratos modo rigido', '/contratos modo rígido', '/contratos strict'}:
        cc['mode'] = 'rigido'
        if save_cb: save_cb(config)
        return '[OK] ContractsCore em modo rígido: menos extras e menos seções não pedidas.'
    if n in {'/contratos modo normal', '/contratos normal'}:
        cc['mode'] = 'normal'
        if save_cb: save_cb(config)
        return '[OK] ContractsCore em modo normal.'
    if n == '/contratos debug on':
        cc['debug'] = True
        rt['scope_debug'] = True
        if save_cb: save_cb(config)
        return '[OK] Debug de contratos ligado.'
    if n == '/contratos debug off':
        cc['debug'] = False
        rt['scope_debug'] = False
        if save_cb: save_cb(config)
        return '[OK] Debug de contratos desligado.'
    if n.startswith('/contratos testar '):
        original = raw.split(' ', 2)[2].strip() if len(raw.split(' ', 2)) >= 3 else ''
        c = classify_contract(original)
        return '\n'.join([
            '=== Teste de contrato ===',
            f'texto: {original}',
            f'tipo: {c.kind}',
            f'label: {c.label}',
            f'detalhe_permitido: {c.detail_allowed}',
            f'precisa_web: {c.needs_search}',
            f'quantidade: {c.requested_count}',
            'regra:',
            c.instruction,
        ])
    return 'Comando ContractsCore inválido. Use /contratos status, /contratos exemplos, /contratos testar texto, /contratos on/off, /contratos modo rigido/normal ou /contratos debug on/off.'
