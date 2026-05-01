# Noelle/Yoru V19.8.27d — Diagnostic regex fix

Corrige falso positivo do diagnóstico V19.8.27c.

## Situação

O `node --check src/renderer/controls_window_app.js` já estava passando, mas o diagnóstico ainda dizia:

```txt
[ERRO] Padrão quebrado de updateAssetSummary ainda existe
```

## Causa

A regex do diagnóstico era ampla demais e podia casar em texto válido.

## Correção

- troca a regex ampla por busca literal do padrão realmente quebrado;
- cria diagnóstico V19.8.27d;
- não mexe em Avatar, Chat, Room, main, preload ou renderer_dist.

## Como aplicar

```bat
node scripts\apply_v19_8_27d_auto_2026.cjs
```
