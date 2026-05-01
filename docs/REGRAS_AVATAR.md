# Regras do Avatar Runtime

1. O avatar oficial da aba é o carousel com setas.
2. O mount oficial é `#avatarMount`.
3. Nenhum renderer pode montar fora de `#avatarMount`.
4. O loader legado `noelle_avatar_tab_v19_8_2.js` não deve ser reativado.
5. `src/assets/Noelle.vrm` não deve ser fallback fixo de UI.
6. O avatar ativo deve vir de `config/avatar_state.json`.
7. A lista de personagens deve vir de `config/avatar_manifest.json`.
8. Widget flutuante e aba Avatar são sistemas separados.
9. Patches antigos v27/v28/v29 não devem competir com v31.
10. Antes de alterar a aba Avatar, rode `node scripts\diagnose_avatar_runtime_v31.js`.
