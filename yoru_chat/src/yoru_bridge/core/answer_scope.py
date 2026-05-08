from __future__ import annotations

from typing import Any, Dict

from .contracts import (
    ResponseContract as AnswerScope,
    classify_contract,
    build_contract_instruction,
    max_tokens_for_contract,
    contracts_examples,
    contracts_status,
)
from ..utils.text import normalize


def classify_answer_scope(text: str) -> AnswerScope:
    return classify_contract(text)


def build_scope_instruction(text: str, config: Dict[str, Any] | None = None) -> str:
    return build_contract_instruction(text, config)


def max_tokens_for_scope(text: str, config: Dict[str, Any], model_key: str = 'think') -> int | None:
    return max_tokens_for_contract(text, config, model_key=model_key)


def scope_status(config: Dict[str, Any]) -> str:
    # Mantém o comando /scope como alias amigável do ContractsCore.
    base = contracts_status(config)
    return base.replace('=== ContractsCore 1.8.42 ===', '=== ScopeCore / ContractsCore 1.8.42 ===')


def handle_scope_command(raw: str, config: Dict[str, Any], save_cb=None) -> str | None:
    n = normalize(raw)
    if not (n == '/scope' or n.startswith('/scope ')):
        return None
    rt = config.setdefault('runtime', {})
    if n in {'/scope', '/scope status'}:
        return scope_status(config)
    if n == '/scope on':
        rt['answer_scope_enabled'] = True
        config.setdefault('contracts', {})['enabled'] = True
        if save_cb: save_cb(config)
        return '[OK] ScopeCore/ContractsCore ligado.'
    if n == '/scope off':
        rt['answer_scope_enabled'] = False
        if save_cb: save_cb(config)
        return '[OK] ScopeCore desligado. A Yoru volta a responder com mais liberdade.'
    if n == '/scope debug on':
        rt['scope_debug'] = True
        config.setdefault('contracts', {})['debug'] = True
        if save_cb: save_cb(config)
        return '[OK] Debug de escopo/contratos ligado.'
    if n == '/scope debug off':
        rt['scope_debug'] = False
        config.setdefault('contracts', {})['debug'] = False
        if save_cb: save_cb(config)
        return '[OK] Debug de escopo/contratos desligado.'
    if n == '/scope exemplos':
        return contracts_examples()
    return 'Comando ScopeCore inválido. Use /scope status, /scope on, /scope off, /scope debug on/off ou /scope exemplos.'
