ORGANIZAR_GITHUB.bat

Use este arquivo dentro da pasta principal do repositorio noelle_ia.

Ele serve para:
- reforcar .gitignore
- apagar node_modules/logs/release/cache/modelos temporarios da COPIA do repo
- ver git status
- opcionalmente criar commit e dar push

Uso recomendado:
1. Copie ORGANIZAR_GITHUB.bat para a raiz do repo.
2. Rode a opcao 6: fazer tudo recomendado sem commit automatico.
3. Confira no GitHub Desktop se nao apareceu node_modules/modelos/cache.
4. Se estiver tudo certo, faca Commit e Push pelo GitHub Desktop.

Cuidado:
- Rode na COPIA do GitHub, nao na pasta original se voce nao quiser apagar node_modules dela.
- O script nao apaga src, scripts, tools, main.js, preload.js nem package.json.
