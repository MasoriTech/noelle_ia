# Noelle/Yoru V19.8.11c — Configurações Premium Robusta

Este patch reforça a aba **Configurações** sem mexer em Chat IA, Avatar, Room, Widget, VRM, VRMA, PNG ou GLB.

## Objetivo

Corrigir o estado em que a aba Configurações fica vazia ou incompleta, mantendo o tema **Yoru Ember** como principal e bloqueando overlays legados como **Avatar Lab** e **Room V19**.

## Reforços

- Runtime único `noelle_config_premium_v19_8_11c.js`.
- CSS único `noelle_config_premium_v19_8_11c.css`.
- Remove referências antigas de V19.8.10, V19.8.11, V19.8.11a e V19.8.11b do `controls.html`.
- Fallback robusto para encontrar a superfície da aba Configurações.
- Watchdog leve para re-renderizar a tela se o frontend trocar a rota.
- Hard-block para botões flutuantes legados.
- Dashboard com Temas, Aparência, IA/Ollama, Avatar, Áudio e Sistema.

## Aplicação

1. Copie o conteúdo do pack para a raiz do projeto.
2. Rode `iniciar.bat`.
3. Escolha `[3] Reparar/aplicar Configuracoes Premium Robusta V19.8.11c`.
4. Rode `[2] Diagnóstico`.
5. Use `[1] Iniciar programa agora`.

## Regra preservada

A opção `[1]` do `iniciar.bat` apenas inicia o programa. Ela não aplica patch, não roda build e não reescreve arquivos.
