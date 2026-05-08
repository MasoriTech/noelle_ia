# Yoru Bridge Modern 1.8.29 - MissingSkills

Completa as skills que ficaram faltando depois da 1.8.29 MissingSkills.

## Adicionado

- OCR opcional em `/tela ocr` e `/tela ler erro`.
- Controle seguro de janelas: `/janela list`, `/janela focar nome`, `/janela minimizar tudo`, `/janela fechar nome --confirmar`.
- Abertura de arquivo por nome: `/arquivos abrir nome`.
- Organização confirmável de Downloads: `/arquivos organizar downloads --confirmar`.
- Limpeza confirmável de cache antigo da Yoru: `/arquivos limpar cache yoru --confirmar`.
- Escrita no clipboard: `/clip copiar texto`.
- `/modelo api` testa `/v1/models` do FAST/THINK.
- Diagnóstico de GPU/vídeo em `/pc gpu`.

## Segurança

- Sem `--confirmar`, ações que movem/fecham/limpam só explicam o que fariam.
- Executáveis em Downloads não são movidos pela organização automática.
- Processos críticos são bloqueados no fechamento de janelas.

## Ainda pendente

- Widget real com janela/tray.
- Player TTS interno/controlado.
- Visão completa com VLM local; OCR lê texto, não entende imagem inteira.
