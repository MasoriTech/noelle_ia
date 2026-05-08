# Noelle Embedded Chat Pack - 1.8.42

Esta versão prepara a Yoru para virar o novo chat do Noelle Companion **sem API HTTP**.

O Electron inicia a Yoru como processo filho e conversa por STDIO JSONL.

## Entrada

```bat
python -m yoru_bridge embedded
```

## Exemplo de entrada

```json
{"type":"chat","id":"1","message":"abra o youtube e pesquise roberto carlos","speak":false}
```

## Exemplo de saída

```json
{"ok":true,"id":"1","type":"chat_result","reply":"...","route":"browser"}
```

Use os arquivos em `noelle_embedded_chat/` para adaptar o `main.js` do Companion.

A pasta `legacy_noelle_api_integration/` ficou apenas como fallback antigo.
