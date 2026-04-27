Noelle V16.1 - correção npm no Windows

Problema corrigido:
- O bootstrap antigo parava em "npm não encontrado" mesmo quando node_modules/electron já estava instalado.

Nova regra:
- Se node_modules/electron existir, o INICIAR.bat pula npm install e abre usando Electron local.
- npm só é obrigatório quando node_modules/electron está ausente e precisa instalar dependências.

Como aplicar:
1. Extraia este pack na raiz do projeto Noelle.
2. Substitua o INICIAR.bat quando pedir.
3. Rode INICIAR.bat.
4. Use [1] Iniciar Noelle.

Se aparecer npm ausente e electron também ausente:
- Reinstale Node.js com a opção "npm package manager" marcada.
- Ou adicione C:\Program Files\nodejs ao PATH.
