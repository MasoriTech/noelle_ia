from __future__ import annotations
from ..utils.text import (
    is_greeting,
    is_date_question,
    is_time_question,
    is_identity_question,
    normalize,
)
from ..utils.datetime_pt import date_text, time_text
from .capabilities import build_capabilities_text, is_skills_question


VOICE_HINT = "A voz usa Edge TTS com fallback Windows. Use /voz status, /testarvoz ou /pararvoz."

MODEL_HINT = (
    "FAST 5001 é para conversa leve. THINK 5002 é para análise/projeto. "
    "Use /fast para forçar o rápido ou /think para forçar o forte."
)


def is_voice_status_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['voz funcionando', 'tts funcionando', 'testar voz', 'status da voz', 'voz ta', 'voz esta'])

def is_model_status_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['modelo rapido', 'modelo forte', 'fast think', 'fast/think', 'dual model', 'dual modelo'])


SEARCH_HINT = (
    "Modo pesquisa: use /pesquisa on, /pesquisa off, ou diga 'pesquisa gatos no youtube' ou 'veja no google ...'. "
    "Para abrir sites: 'abra youtube', 'abra google', 'abra whatsapp'."
)

FASTLANE_HINT = (
    "Modo velocidade ativo: respostas simples são locais; FAST usa pouco contexto; THINK fica para análise. "
    "Use /turbo, /normal, /perf, /warmup ou /cache clear."
)

def is_search_status_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['modo pesquisa', 'pesquisa esta', 'pesquisa ta', 'como pesquisar', 'google funcionando'])

def is_speed_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['esta lento', 'ta lento', 'velocidade', 'modo turbo', 'deixar rapido', 'ficar rapido'])

def is_latency_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['melhorar desempenho','melhorar velocidade','otimizar desempenho','performance','lag','demorando muito','resposta lenta'])

def is_open_command_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ['como abro site','como abrir site','abrir navegador','abrir youtube','abrir google'])

def local_response(text: str) -> str | None:
    n = normalize(text)
    if is_greeting(text):
        return "Oi, tô aqui. Vamos continuar de onde paramos?"
    if is_identity_question(text):
        return "Eu sou a Yoru, companion de projeto do Noelle/Yoru. Minha função é ajudar em texto, voz, memória e navegador."
    if is_skills_question(text):
        return build_capabilities_text()
    if is_date_question(text):
        return date_text()
    if is_time_question(text):
        return time_text()
    if is_voice_status_question(text):
        return VOICE_HINT
    if is_model_status_question(text):
        return MODEL_HINT
    if is_search_status_question(text):
        return SEARCH_HINT
    if is_speed_question(text) or is_latency_question(text):
        return FASTLANE_HINT + ' Para máximo desempenho: /turbo, /streamout on, /cache e desligar fala do FAST.'
    if is_open_command_question(text):
        return "Use comandos naturais: 'abra youtube', 'abra google', 'abra youtube e pesquise anime' ou /sites para listar sites."
    if 'manda uma imagem' in n or 'gerar imagem' in n or 'enviar imagem' in n:
        return "Eu ainda não gero imagens por aqui. Posso abrir um site de imagem ou ajudar a montar um prompt."
    if 'controla meu pc' in n or 'controle meu pc' in n:
        return "Controle livre do PC ainda não existe. Eu só executo skills seguras, como abrir sites permitidos."
    if 'voce tem voz' in n or 'você tem voz' in text.lower():
        return "Tenho TTS via Bridge se estiver ligado. Use /voz status ou /testarvoz."
    return None
