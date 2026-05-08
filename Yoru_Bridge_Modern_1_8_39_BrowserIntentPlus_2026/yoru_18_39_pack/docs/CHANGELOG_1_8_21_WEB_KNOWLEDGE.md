# Yoru Bridge 1.8.21 - Web Knowledge Fallback

## Novidades

- Adicionado `skills/web_knowledge.py`.
- Comando `/web pergunta` para pesquisar e responder.
- `/pesquisa pergunta` agora usa busca + THINK quando não for comando de site.
- Modo pesquisa persistente agora responde com internet, não só abre navegador.
- Auto fallback web para perguntas atuais/2026/ranking/notícias/versão recente.
- Cache em `data/web_knowledge_cache.json`.
- Resumos salvos no Obsidian em `05_MEMORIA/cache_pesquisas.md`.
- Submenu novo: `Web Knowledge / Pesquisa Automática`.

## Comportamento esperado

```txt
Você: qual melhor anime atual
Yoru: Vou pesquisar rápido e responder com base no que encontrar.
Yoru: ... resposta com fontes [1], [2]
```

## Filosofia

A Yoru não deve tentar guardar todo conhecimento no prompt. Ela deve usar:

1. memória fixa do Obsidian;
2. correções manuais;
3. cache de pesquisas;
4. web quando o assunto for atual ou incerto.
