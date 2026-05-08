from __future__ import annotations
import re
from datetime import date

MONTHS_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]

def normalize(text: str) -> str:
    text = (text or "").strip().lower()
    repl = str.maketrans("áàâãéêíóôõúç", "aaaaeeiooouc")
    return text.translate(repl)

def is_greeting(text: str) -> bool:
    n = normalize(text)
    greetings = {"oi", "ola", "olá", "opa", "e ai", "eai", "oi yoru", "oi gata", "bom dia", "boa tarde", "boa noite"}
    return n in {normalize(g) for g in greetings}

def is_date_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ["que dia e hoje", "qual a data", "data de hoje", "hoje e que dia"])

def is_time_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ["que horas", "qual horario", "qual hora", "hora agora"])

def is_identity_question(text: str) -> bool:
    n = normalize(text)
    return any(x in n for x in ["quem e voce", "quem voce e", "qual seu nome", "o que voce e"])


def pretty_date_for_speech(text: str) -> str:
    def repl(m: re.Match[str]) -> str:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12:
            return f"{d} de {MONTHS_PT[mo-1]} de {y}"
        return m.group(0).replace('/', ' ')
    return re.sub(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b", repl, text)


def strip_markdown_for_tts(text: str) -> str:
    """Remove Markdown/formatacao que o TTS costuma ler em voz alta.

    Ex.: **importante** vira "importante", `codigo` vira "codigo",
    links Markdown viram apenas o texto do link.
    """
    t = text or ""
    # blocos de codigo viram espaco; inline code fica sem crase
    t = re.sub(r"```.*?```", " ", t, flags=re.S)
    t = re.sub(r"`([^`]*)`", r"\1", t)
    # imagem/link markdown: ![alt](url) -> alt, [texto](url) -> texto
    t = re.sub(r"!\[([^\]]*)\]\([^)]*\)", r"\1", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", t)
    # cabecalhos e marcadores comuns
    t = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", t)
    t = re.sub(r"(?m)^\s*>\s?", "", t)
    t = re.sub(r"(?m)^\s*[-*+]\s+", "", t)
    # negrito/italico/riscado: remove marcadores, mantem palavras
    t = t.replace("**", "")
    t = t.replace("__", "")
    t = t.replace("~~", "")
    # asterisco/underscore soltos que o Edge pode ler como "asterisco"
    t = t.replace("*", "")
    t = t.replace("_", " ")
    # separadores markdown
    t = re.sub(r"(?m)^\s*-{3,}\s*$", " ", t)
    return t

def clean_for_tts(text: str, max_chars: int = 360) -> str:
    t = strip_markdown_for_tts(text or "")
    t = pretty_date_for_speech(t)
    t = re.sub(r"https?://\S+", " link ", t)
    # Barra em data ja foi tratada; barra comum vira espaco para o TTS nao falar "barra".
    t = t.replace("/", " ")
    # Remove caracteres soltos que o TTS costuma verbalizar.
    t = re.sub(r"[•◆●■□▪▫]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > max_chars:
        t = t[:max_chars].rsplit(" ", 1)[0] + "."
    return t
