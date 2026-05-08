Stream V19.8.39 — STT Backend Setup Existing Only

O erro que você viu:
STT backend não configurado.

Isso significa:
- a Stream capturou o trecho;
- a ponte STT existe;
- mas ainda não existe executável/modelo STT configurado para transcrever.

Esse pack resolve a parte de configuração:
- adiciona bridge STT v19.8.39 com mensagem melhor;
- adiciona painel “Backend STT” na Stream;
- adiciona CONFIGURAR_STT.bat;
- procura whisper-cli.exe/main.exe automaticamente;
- gera config/stream_stt_v19_8_39.json;
- faz o pipeline v19.8.38 preferir a bridge v19.8.39;
- salva o áudio temporário mesmo quando não há backend, para diagnóstico;
- não mexe em Avatar;
- não mexe em Loadfile;
- não mexe em viewers 3D.

Uso:
1. Coloque whisper-cli.exe em:
   tools\whisper\whisper-cli.exe

2. Rode:
   CONFIGURAR_STT.bat

3. Rode:
   iniciar.bat

Se o whisper estiver em outro lugar:
CONFIGURAR_STT.bat "C:\caminho\para\whisper-cli.exe"
