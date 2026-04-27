NOELLE CHAT IA - CORRECAO V2

Este pack corrige o problema mostrado na imagem onde:
- a caixa de texto ficou por cima das mensagens;
- o botao Enviar ficou gigante;
- o botao de microfone ficou deslocado;
- apareceu ECONNREFUSED 127.0.0.1:11434.

IMPORTANTE:
ECONNREFUSED 127.0.0.1:11434 nao e bug de layout. Significa que o Ollama esta fechado/offline ou nao esta aceitando conexao.

COMO APLICAR:
1. Extraia este ZIP dentro da raiz do repo noelle_ia.
2. Feche todas as janelas da Noelle.
3. Rode APLICAR_CORRECAO_CHAT_V2.bat.
4. Rode RODAR_DIAGNOSTICO_CHAT_V2.bat.
5. Abra o app principal normalmente.

PARA TESTAR CHAT LIMPO SEPARADO:
- Rode ABRIR_CHAT_IA_LIMPO.bat.

SE O OLLAMA ESTIVER FECHADO:
- Rode INICIAR_OLLAMA_E_CHAT_LIMPO.bat.

O QUE O PATCH FAZ:
- remove a injecao noelle_chat_focus_patch do hotfix v1;
- adiciona src/styles/noelle_chat_safe_repair.css;
- corrige ensureDir no main.js se estiver faltando;
- adiciona uma janela separada tools/noelle_chat_clean;
- cria backups em backups/chat_ia_v2_<data>.

COMMIT SUGERIDO:
git add .
git commit -m "Corrige layout do Chat IA e adiciona janela limpa"
git push origin main
