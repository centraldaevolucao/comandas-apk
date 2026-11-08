# Atualizar o GitHub (controle de versão)

Repositório: https://github.com/centraldaevolucao/comandas-apk  (branch `main`)

## Cada nova versão
    git pull origin main --rebase
    git add .
    git commit -m "Atualiza para vX.Y.Z"
    git tag vX.Y.Z
    git push origin main --tags

Voltar a uma versão antiga: `git checkout vX.Y.Z` (ver tudo) ou `git revert <commit>`.
Ver histórico: `git log --oneline`.

## Primeira vez neste computador
    git config --global user.name "centraldaevolucao"
    git config --global user.email "centraldaevolucao@gmail.com"
No primeiro push use o usuário do GitHub e, como senha, um token (Fine-grained, só neste repositório, Contents: Read and write). Nunca compartilhe o token.
