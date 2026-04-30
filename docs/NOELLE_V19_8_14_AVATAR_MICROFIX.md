# Noelle/Yoru V19.8.14 — Avatar microfix

Microfix pequeno e localizado.

## Objetivo
- deixar os avatares em A-pose leve no preview/tab principal;
- remover o fundo branco do preview do avatar;
- não mexer nas outras abas.

## O que o reparo tenta fazer
- injeta CSS seguro para fundo transparente na área de avatar;
- procura renderers de avatar/preview/VRM em `src/renderer`;
- força `alpha: true` no `THREE.WebGLRenderer` quando encontrar o padrão;
- troca `renderer.setClearColor(...)` para `renderer.setClearColor(0x000000, 0)`;
- injeta helper `noelleApplyDefaultAPose(vrm, THREE)` e chama após carregar o VRM.

## Como aplicar
1. Copie o pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Aplicar microfix Avatar A-pose + fundo transparente`.
4. Rode `[2]` para diagnóstico.
5. Abra pela opção `[1]`.
