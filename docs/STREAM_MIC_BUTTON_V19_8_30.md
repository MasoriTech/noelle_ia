# Stream IA — V19.8.30 Microfone por botão

## Objetivo

Adicionar microfone real na aba Stream, mas somente quando o usuário apertar **Iniciar escuta**.

## Regras

- O microfone nunca liga automaticamente.
- O microfone só liga pelo botão **Iniciar escuta**.
- O botão **Parar escuta** desliga todas as tracks.
- Ao ocultar a janela, o microfone desliga.
- Ao fechar a janela, o microfone desliga.
- Nesta fase não existe STT.
- Nesta fase não existe resposta da IA.
- Nesta fase não existe TTS.

## O que testar

1. Abrir o app.
2. Entrar na aba Stream.
3. Apertar **Iniciar escuta**.
4. Permitir microfone.
5. Ver a barra de volume mexer.
6. Apertar **Parar escuta**.
7. Ver a barra parar.

## Próxima fase

V19.8.31:
- VAD simples;
- detectar fala/silêncio;
- fechar trecho depois de 800ms a 1200ms de silêncio.
