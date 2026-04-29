# Noelle/Yoru V19.7.3 — Fix Build Regex do Avatar Preview

Corrige o erro:

```txt
SyntaxError: Invalid regular expression: missing /
scripts/build_avatar_lab_v19_6_2026.cjs:14
  return /(^|
```

## Causa

O script de build foi gerado com regex literal dentro de template. O `\n` virou quebra de linha real dentro da regex, quebrando o `node --check`.

## Correção

- Reescreve `scripts/build_avatar_lab_v19_6_2026.cjs` usando `new RegExp("(^|\\n)...")`.
- Atualiza o aplicador V19.7.2 para não recriar o erro se ele rodar de novo.
- Adiciona diagnóstico V19.7.3.
- Inclui `iniciar.bat` atualizado.

## Como aplicar

1. Copie o conteúdo deste pack para a raiz do projeto `noelle_ia`.
2. Rode:

```bat
APLICAR_FIX_BUILD_REGEX_V19_7_3.bat
```

Depois use sempre:

```bat
iniciar.bat
```
