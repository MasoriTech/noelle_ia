from __future__ import annotations
from datetime import datetime

DAYS = ["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"]
MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]

def date_text(now: datetime | None = None) -> str:
    now = now or datetime.now()
    return f"Hoje é {DAYS[now.weekday()]}, {now.day:02d}/{now.month:02d}/{now.year}."

def date_speech(now: datetime | None = None) -> str:
    now = now or datetime.now()
    return f"Hoje é {DAYS[now.weekday()]}, {now.day} de {MONTHS[now.month-1]} de {now.year}."

def time_text(now: datetime | None = None) -> str:
    now = now or datetime.now()
    return f"Agora são {now.hour:02d}:{now.minute:02d}."
