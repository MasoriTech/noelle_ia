# Yoru Memory Core 2026

Este pack cria a estrutura pedida para a memória da Yoru:

```txt
yoru_memory/
  soul.md
  system.md
  constraints.md
  user.md
  state.md
  memory_short.md
  memory_long.md
  memory_rules.md
  reflection.md
  evaluation/
  goals.md
  tasks/
  tools.md
  connectors/
  skills/
  knowledge/
  logs/
  rag/
  metrics/
```

## Como aplicar

Copie o conteúdo do pack para a raiz do projeto da Yoru e rode:

```bat
iniciar.bat
```

O `iniciar.bat` atualizado prepara memória, roda diagnóstico e tenta iniciar a Yoru por entradas conhecidas.

Para escolher uma entrada manual:

```bat
set YORU_ENTRY=run_yoru_nicegui.py
iniciar.bat
```

## CLI

```bat
python scripts\yoru_memory_core_cli_2026.py remember-short "contexto recente"
python scripts\yoru_memory_core_cli_2026.py remember-long "preferência durável"
python scripts\yoru_memory_core_cli_2026.py log "servidor pronto"
python scripts\yoru_memory_core_cli_2026.py state "modo=widget"
python scripts\yoru_memory_core_cli_2026.py search "widget"
```

## Integração Python

```python
from src.yoru_memory_core import YoruMemoryCore

memory = YoruMemoryCore()
contexto = memory.read_context()
memory.log("Yoru iniciou")
```
