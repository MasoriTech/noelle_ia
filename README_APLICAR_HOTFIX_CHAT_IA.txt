NOELLE HOTFIX CHAT IA 2026
==========================

Este pack corrige a janela que voce mostrou no print e adiciona uma janela dedicada de Chat IA.

O que corrige:
1. Erro real: ensureDir is not defined.
   - O hotfix adiciona a funcao ensureDir no main.js.
   - Isso evita quebrar STT/transcricao quando o codigo tenta criar pastas temporarias/modelos.

2. Barra superior sobreposta no Windows.
   - O hotfix remove o titleBarOverlay/hidden titlebar do main.js.
   - A janela volta a usar titlebar normal, evitando a faixa preta em cima do botao Voltar.

3. Aba Chat IA poluida e espremida.
   - Injeta CSS/JS leve no src/controls.html para melhorar o foco do chat atual.
   - Adiciona uma janela dedicada em tools/noelle_chat_discord para chat limpo.

Como aplicar:
1. Extraia este ZIP dentro da raiz do repo noelle_ia.
   A pasta precisa ter package.json, main.js, preload.js e src/.
2. Feche a Noelle se ela estiver aberta.
3. Rode:
   APLICAR_HOTFIX_JANELA_CHAT.bat
4. Rode:
   RODAR_DIAGNOSTICO_CHAT_CORRIGIDO.bat
5. Abra o app normal com iniciar.bat para testar a janela principal.
6. Para testar o chat limpo separado, rode:
   ABRIR_CHAT_IA_CORRIGIDO.bat

Se o Ollama/modelo nao estiver pronto:
- Abra o Ollama.
- Rode no terminal:
  ollama pull qwen3:0.6b

Arquivos que o pack adiciona:
- APLICAR_HOTFIX_JANELA_CHAT.bat
- ABRIR_CHAT_IA_CORRIGIDO.bat
- RODAR_DIAGNOSTICO_CHAT_CORRIGIDO.bat
- scripts/aplicar_hotfix_janela_chat_2026.cjs
- scripts/diagnostico_noelle_chat_correcoes.cjs
- src/styles/noelle_chat_focus_patch.css
- src/renderer/noelle_chat_focus_patch.js
- tools/noelle_chat_discord/*

Backup:
O hotfix cria backup automatico em:
backups/hotfix_chat_ia_DATA/

Depois que testar e estiver ok:
git add .
git commit -m "Corrige janela Chat IA da Noelle"
git push origin main
