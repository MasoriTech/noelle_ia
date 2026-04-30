# Noelle V19.8.6 — Overlay Launcher Killer

Objetivo: remover o botão/pílula flutuante legado `Avatar Lab` / `Room V19` que ficava sobre a interface e impedir que a tela Avatar funcione como overlay global preso por cima de outras abas.

Esta fase não redesenha o Avatar. Ela mantém a aba Avatar real e adiciona um guard de limpeza específico para launchers legados.

## Regras preservadas

- `preload.js` continua sem injeção visual antiga.
- `window.noelleAPI`, `window.desktopWidget`, `window.noelleRoom` e `window.noelleRoomV19` são preservados.
- Chat IA, Room, Widget, VRM, VRMA, PNG e GLB não são removidos.
- `iniciar.bat` continua único; a opção 1 só inicia o programa.

## Teste manual

1. Iniciar pelo `iniciar.bat` opção 1.
2. Entrar na aba Avatar.
3. Confirmar que não existe pílula flutuante `Avatar Lab` sobre os botões.
4. Trocar para Principal, Chat IA, Configurações e Sobre.
5. Confirmar que o Avatar não fica por cima das outras abas.
6. Voltar para Avatar e testar `ESC` ou `Fechar Avatar`.
