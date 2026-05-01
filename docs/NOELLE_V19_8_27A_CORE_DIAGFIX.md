# Noelle/Yoru V19.8.27a — Core diagfix

Corrige o erro:

```txt
[ERRO] módulo core contém observer ou remoção de DOM
```

## Causa

O módulo core usava `classList.remove(...)` para remover classes CSS, como `show`, `ok`, `bad` e temas.

Isso **não remove elementos do DOM**, mas o diagnóstico V19.8.27 procurava `.remove(` de forma ampla e acusava falso positivo.

## Correção

- troca `classList.remove(...)` por `classList.toggle(..., false)`;
- atualiza diagnóstico para procurar remoção real:
  - `.remove(`
  - `removeChild(`
  - `new MutationObserver(`
- não mexe em Avatar, Chat, Room, main, preload ou renderer_dist.

## Como aplicar

```bat
node scripts\apply_v19_8_27a_auto_2026.cjs
```

Ou pelo `iniciar.bat` incluído.
