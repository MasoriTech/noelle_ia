# Noelle V19.8.1a — Preload Forçado

Este patch é uma correção controlada da Fase 3: limpeza do `preload.js`.

## Problema corrigido

O diagnóstico V19.8.1 ainda encontrou o identificador legado:

```txt
noelle-v19-5-avatar-panel-script
```

Isso significa que o `preload.js` ainda continha a injeção visual antiga do Avatar V19.5 ou um resto dela. Enquanto esse identificador existir no preload, a tela antiga pode voltar.

## O que o patch faz

- Cria backup automático.
- Reescreve `preload.js` como ponte canônica limpa.
- Preserva:
  - `window.noelleAPI`
  - `window.desktopWidget`
  - `window.noelleRoom`
  - `window.noelleRoomV19`
- Remove injeções visuais automáticas V19.3/V19.5.
- Remove script tags legadas de `src/controls.html` se existirem.
- Mantém `iniciar.bat` como único inicializador.

## O que este patch não faz

Ele não redesenha a aba Avatar. Isso fica para a próxima fase: V19.8.2 Aba Avatar Real.

## Como aplicar

1. Copie o conteúdo do pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Reparar projeto / aplicar V19.8.1a Preload Forcado`.
4. Escolha `[2] Rodar diagnostico V19.8.1a`.
5. Escolha `[1] Iniciar programa agora`.
