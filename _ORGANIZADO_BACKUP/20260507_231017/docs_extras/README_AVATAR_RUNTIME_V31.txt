Avatar Runtime V31

Objetivo:
- criar estrutura limpa para a aba Avatar
- manter apenas o carousel com setas
- bloquear scripts legados
- criar avatar_state.json
- criar avatar_manifest.json
- criar diagnóstico específico
- documentar regras em docs/REGRAS_AVATAR.md

Como aplicar:
1. Extraia na raiz do projeto noelle_ia/
2. Sobrescreva iniciar.bat
3. Execute iniciar.bat

Este pack não apaga os arquivos antigos. Ele neutraliza referências antigas no controls.html e monta a aba Avatar por um runtime único:
src/renderer/pages/avatar/avatar_page_v31.js
