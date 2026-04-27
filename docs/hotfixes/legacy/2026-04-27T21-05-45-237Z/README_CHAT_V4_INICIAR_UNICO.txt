NOELLE CHAT IA V4 - INICIAR.BAT UNICO

Objetivo:
- Deixar o pack com apenas 1 arquivo .bat: INICIAR.bat.
- Concentrar aplicacao, diagnostico, abertura do chat limpo, Ollama e limpeza de .bat no mesmo menu.

Como aplicar:
1. Extraia este ZIP na raiz do repositorio noelle_ia, onde fica package.json.
2. Rode INICIAR.bat.
3. Use a opcao [2] Aplicar/Reparar Chat IA.
4. Use a opcao [3] Diagnostico.
5. Use a opcao [4] Abrir Chat IA limpo.

Menu do INICIAR.bat:
[1] Iniciar Noelle principal
[2] Aplicar/Reparar Chat IA
[3] Diagnostico
[4] Abrir Chat IA limpo
[5] Iniciar Ollama e abrir Chat IA limpo
[6] Limpar outros .bat da raiz
[0] Sair

Sobre a limpeza de .bat:
- A opcao [6] nao apaga definitivamente.
- Ela move todos os .bat da raiz, exceto INICIAR.bat, para backups\bats_limpos_DATA_HORA.
- Isso ajuda a remover atalhos duplicados de packs antigos.

Erros comuns:
- ECONNREFUSED 127.0.0.1:11434 = Ollama fechado/offline.
- Rode a opcao [5] ou abra o Ollama manualmente.

Arquivos principais:
- INICIAR.bat
- scripts\aplicar_correcao_chat_v4.cjs
- scripts\diagnostico_chat_v4.cjs
- src\styles\noelle_chat_safe_repair.css
- tools\noelle_chat_clean\*
