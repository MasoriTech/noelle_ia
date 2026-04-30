# V19.8.21a — iniciar.bat seguro

Este pack corrige o iniciar.bat corrompido que estava perdendo a primeira letra dos comandos.

Sintoma:
- setlocal vira etlocal
- chcp vira hcp
- cd vira d
- cls vira ls
- echo vira cho

Como aplicar:
1. Extraia o ZIP.
2. Copie somente o arquivo iniciar.bat para a raiz do projeto noelle_ia.
3. Substitua o iniciar.bat antigo.
4. Rode o iniciar.bat novamente.

Este arquivo foi salvo em ASCII/ANSI com CRLF.
