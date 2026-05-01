Avatar Megapack Design V39.2 Robust

Este pack melhora e reforça o código do v39.1 sem mudar a base funcional.

Inclui:
- owner único mais robusto
- fallback de iframe
- debounce no MutationObserver
- bind seguro dos botões
- diagnóstico mais confiável
- backup automático
- rollback
- separação clara entre layout externo e renderer interno

Não mexe em:
- Three.js
- WebGL
- câmera
- renderer interno Loadfile v19.8.3

Arquivo principal:
src/renderer/pages/avatar/avatar_design_owner_v39_2.js

Como aplicar:
1. Extraia na raiz do projeto noelle_ia/
2. Sobrescreva iniciar.bat
3. Rode iniciar.bat

Rollback:
node scripts\rollback_avatar_megapack_design_v39_2.js