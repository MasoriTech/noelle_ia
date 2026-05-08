# Yoru Bridge Modern 1.8.39 - BrowserIntentPlus

## Novo

- `/baixar status`: verifica se FAST, THINK, KoboldCpp e dependências já estão baixados/instalados.
- `/baixar tudo`: instala dependências Python e baixa o que faltar de uma vez.
- `/baixar modelos`: baixa FAST + THINK.
- `/baixar deps`: instala dependências Python do Mega Pack.
- `/baixar kobold`: baixa KoboldCpp pelo release mais recente do GitHub.
- Menu novo: Download Center / baixar tudo.

## Correção

- `Ctrl+C` no Stream/Menu volta ao menu sem traceback feio do subprocess.

## Observação

O Download Center pula arquivos já existentes quando o tamanho parece válido. Arquivos parciais ficam como `.part` e podem ser retomados em outra tentativa.
