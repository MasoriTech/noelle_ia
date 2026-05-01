# Avatar v31.2 - Correção de 'Nenhum avatar'

Causa:
- A UI do carousel e as setas estavam carregando.
- O renderer não recebia a lista de arquivos .vrm.
- Resultado: 'Nenhum avatar' e preview carregando para sempre.

Correção:
- Criar bridge no main process: `src/main/avatar_assets_bridge_v31_2.cjs`
- Expor `window.yoruAvatarAssets.list()` no preload.
- Criar bridge renderer: `avatar_assets_bridge_v31_2.js`
- Alimentar o carousel com uma lista normalizada de `.vrm`.
- Interceptar manifests de avatar com `fetch` quando necessário.