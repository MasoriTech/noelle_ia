# Stream IA — V19.8.30a Diagnostic fix

Corrige falso positivo do diagnóstico V19.8.30.

## Problema

O diagnóstico acusava:

```txt
[ERRO] Fase 2 contém STT/Ollama/TTS indevido
```

Mas essas palavras estavam apenas em comentários do módulo, não em código executável.

## Correção

- o diagnóstico V19.8.30a remove comentários e strings antes de procurar chamadas indevidas;
- limpa comentários do módulo de microfone;
- mantém a Fase 2 apenas como microfone por botão + medidor de volume.

## Como aplicar

```bat
node scripts\apply_v19_8_30a_auto_2026.cjs
```
