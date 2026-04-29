# Noelle V19.7.4 - Fix Avatar Preview string/build

Este pack corrige o erro:

```txt
ERROR: Unterminated string literal
src/renderer/avatar_lab_v19_6_app.js:44:50
```

Causa comum: algum patch gerou uma quebra de linha real dentro de string comum, por exemplo:

```js
line + "
" + texto
```

O correto para JavaScript é:

```js
line + "\n" + texto
```

## O que o pack faz

- Corrige quebras de linha reais dentro de strings com aspas simples/duplas.
- Mantém template literals intactos.
- Reforça o build do Avatar Preview para rodar auto-fix antes do esbuild.
- Garante que o Avatar Preview não volte para top-level await antigo com build IIFE.
- Inclui `iniciar.bat` atualizado.
- Cria backup automático em `backups/v19_7_4_avatar_preview_string_fix_2026_*`.

## Como aplicar

1. Copie todo o conteúdo do pack para a raiz do projeto `noelle_ia`.
2. Rode:

```bat
APLICAR_FIX_AVATAR_PREVIEW_STRING_V19_7_4.bat
```

Depois use sempre:

```bat
iniciar.bat
```
