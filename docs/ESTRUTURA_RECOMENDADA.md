# Estrutura recomendada da Noelle IA

Arquivos principais que ficam na raiz:

```txt
main.js
preload.js
package.json
package-lock.json
iniciar.bat
PREPARAR_AUDIO_STT.bat
DIAGNOSTICO_AUDIO_STT.bat
BAIXAR_MODELOS_IA.bat
README.md
CHANGELOG.md
LICENSE
VERSION
```

Pastas principais:

```txt
src/       codigo da interface e renderer
scripts/   scripts auxiliares
tools/     ferramentas Python, STT e utilitarios
assets/    assets do app
docs/      documentacao, historico e relatorios
```

Nao versionar:

```txt
node_modules/
logs/
release/
build/
dist/
modelos/cache do faster-whisper
modelos/cache do Ollama
arquivos zip antigos
```
