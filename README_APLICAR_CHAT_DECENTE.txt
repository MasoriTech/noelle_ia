NOELLE CHAT IA DECENTE - PACK 2026
==================================

O que este pack faz:
- Adiciona uma janela de Chat IA separada, limpa e focada em conversa.
- Usa Ollama local em 127.0.0.1:11434.
- Mantém qwen3:0.6b como modelo principal para PC fraco.
- Usa visual Discord-like como referência de layout: coluna lateral, canais, área de conversa e composer fixo.
- Não copia código proprietário do Discord.
- Não mexe no main.js existente, para evitar quebrar o app principal.

Como aplicar:
1. Extraia este ZIP dentro da raiz do repositório noelle_ia.
   A pasta precisa ter package.json, main.js, preload.js e src/.
2. Rode RODAR_DIAGNOSTICO_CHAT.bat para ver problemas prováveis.
3. Rode ABRIR_CHAT_IA_DECENTE.bat.
4. Se o Ollama não estiver aberto, abra o Ollama.
5. Se o modelo não existir, rode:
   ollama pull qwen3:0.6b

Arquivos adicionados:
- ABRIR_CHAT_IA_DECENTE.bat
- RODAR_DIAGNOSTICO_CHAT.bat
- tools/noelle_chat_discord/main.cjs
- tools/noelle_chat_discord/preload.cjs
- tools/noelle_chat_discord/chat.html
- tools/noelle_chat_discord/chat.css
- tools/noelle_chat_discord/chat.js
- scripts/diagnostico_noelle_chat.cjs
- RELATORIO_BUGS_CHAT_IA.txt

Por que escolhi janela separada:
A janela de controles atual do projeto já acumula avatar, inventário, emotes, tema e Chat IA. Isso deixa a experiência poluída e aumenta a chance de bugs. A solução mais segura é separar o Chat IA em uma janela própria primeiro, sem alterar o core que já está funcionando.

Depois de testar:
git add ABRIR_CHAT_IA_DECENTE.bat RODAR_DIAGNOSTICO_CHAT.bat tools/noelle_chat_discord scripts/diagnostico_noelle_chat.cjs RELATORIO_BUGS_CHAT_IA.txt
git commit -m "Adiciona janela dedicada do Chat IA"
git push origin main
