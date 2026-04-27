# Noelle IA — V17 manutenção cirúrgica

Este pack organiza o projeto atual sem redesign total.

## O que ele faz

- Mantém a janela principal e o avatar/widget existentes.
- Mantém assets reais: VRM, VRMA, PNG e GLB.
- Corrige o INICIAR.bat para verificar dependências e iniciar tudo pela opção [1].
- Corrige .gitignore.
- Remove "latest" dos pacotes principais quando possível.
- Reconstrói manifests a partir dos assets reais.
- Move sobras de hotfix para docs/hotfixes/legacy com backup.

## O que ele não faz

- Não substitui src/avatar_view.html.
- Não substitui src/renderer/avatar_window_app.js.
- Não redesenha a UI inteira.
- Não apaga assets.

## Ordem recomendada

1. Rode INICIAR.bat.
2. Escolha [2] Diagnóstico completo.
3. Escolha [1] Iniciar Noelle.
4. Teste Chat, Avatar, Emotes, Expressions e Inventário.
