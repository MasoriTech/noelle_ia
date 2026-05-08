# 1.8.43 - NoelleKoboldReplace

- Remove a API HTTP do caminho principal.
- Prepara a Yoru para entrar no GitHub do Noelle como `yoru_chat/`.
- Adiciona patch Node para substituir `noelle:chat` por Yoru+KoboldCpp.
- Adiciona diagnóstico Node para confirmar Python/STDIO/build.files/patch.
- `embedded` agora devolve aliases `message`, `text` e `reply` para compatibilidade com renderer.
- `/noelle status` e `/kobold status` explicam a troca Ollama -> KoboldCpp/Yoru.
