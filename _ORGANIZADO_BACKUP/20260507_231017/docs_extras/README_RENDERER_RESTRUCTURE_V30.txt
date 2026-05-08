PACK: Renderer Restructure V30

Objetivo:
- organizar src/renderer em pages/widgets/modules/services
- manter compatibilidade com o projeto atual
- preservar tabs runtime v20
- preservar Stream
- restaurar avatar carousel com setas sem reativar legacy

Como aplicar:
1. Extraia na raiz do projeto noelle_ia/
2. Sobrescreva iniciar.bat
3. Execute iniciar.bat

O pack NÃO apaga arquivos antigos.
Ele copia os scripts úteis para a nova árvore e injeta um boot limpo v30.

Nova estrutura:
src/renderer/
  pages/avatar/
  pages/stream/
  pages/chat/
  widgets/vrm_canvas/
  modules/avatar/
  modules/stt/
  modules/agent/
  services/ipc/
  services/config/
  services/runtime/

Scripts principais:
- scripts/apply_renderer_restructure_v30.js
- scripts/diagnose_renderer_structure_v30.js
- src/renderer/pages/avatar/avatar_page_v30.js
- src/renderer/pages/stream/stream_page_v30.js

Observação:
Este pack neutraliza o avatar legacy noelle_avatar_tab_v19_8_2.js e os restores v27/v28/v29 antigos.