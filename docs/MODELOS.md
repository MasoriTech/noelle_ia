# Modelos usados pela Noelle

## Ollama

Modelo padrão recomendado:

```bash
ollama pull qwen3:0.6b
```

Outros modelos podem ser usados, mas devem ser baixados pelo usuário.

## faster-whisper

O projeto usa faster-whisper para STT local.

Configuração atual recomendada:

```txt
modelo: medium
compute: int8
idioma: pt
```

Para PCs fracos, considere trocar para:

```txt
small
base
tiny
```

Os modelos são baixados/cacheados no primeiro uso. Não envie modelos para o GitHub.
