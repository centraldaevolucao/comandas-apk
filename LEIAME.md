# Comandas — APK autônomo (Android)

O app **leva o servidor dentro dele**: o `server.py` roda no próprio celular/tablet (Python embutido via Chaquopy)
e o sistema abre em tela cheia. Não precisa de PC. Os dados ficam no aparelho (`files/comandas/data/database.sqlite`).

## Gerar o APK (escolha um)
**A) Android Studio** — abra esta pasta, aguarde o sync, *Build > Build APK(s)*.
Saída: `app/build/outputs/apk/debug/app-debug.apk`.
**B) Terminal** (JDK 17 + Android SDK) — `gradle assembleDebug`.
**C) GitHub, sem instalar nada** — suba a pasta num repositório → *Actions > Gerar APK > Run workflow* → baixe `comandas-apk`.
(O primeiro build baixa o Android SDK/Chaquopy da internet; leva alguns minutos.)

## Usar
- Instale o APK (permita "apps desconhecidos"). O sistema abre sozinho.
- **Mantenha o app aberto**: o servidor só roda enquanto ele está na tela (a tela não apaga).
- **Outros aparelhos** (cozinha, QR Code das mesas): aperte *Voltar* na tela inicial → "Permitir outros aparelhos na rede",
  reinicie o app e acesse `http://IP-DO-APARELHO:3000` do outro dispositivo. Padrão = desligado.
  ⚠️ O `server.py` não exige login nas rotas de dados; ative só em Wi-Fi de confiança.
- **Seus dados atuais**: copie o `database.sqlite` para `app/src/main/assets/seed.sqlite` antes de compilar
  (usado só na primeira abertura, se ainda não houver banco). Pare o servidor antigo antes para o arquivo estar completo.

## O que veio do seu zip
`server.py` (3 linhas ajustadas: pasta, host e porta por variável de ambiente) e `public/` só com arquivos **sem número** (empacotado em `app/src/main/assets/public.zip`).
Corrigi no `public`: `NovaComanda.js` (no zip era um trecho solto sem a tela; usei a versão `NovaComanda2` do zip anterior),
`permissions.js` (movido para `js/`, como o `index.html` o chama), rota `avaliacao` (sem tela) removida,
ícones criados e service worker "rede primeiro".

## Versão 2.2.0
- **Atualizar sem desinstalar**: o APK agora é assinado sempre com a mesma chave (`comandas.keystore`, na raiz) e o `versionCode` sobe a cada build do GitHub. **Guarde esse arquivo e não o troque.**
  ⚠ Quem tem a 2.1.0 ou anterior instalada precisa desinstalar **uma última vez** (a chave antiga era diferente). Antes disso: Configurações > Backup > "Fazer backup agora" e guarde o arquivo `.comandas`.
- **Não perder dados**: o app salva uma cópia do banco em `/Comandas/backup` (libere "Acesso a todos os arquivos" quando o app pedir). Ao reinstalar, restaura sozinho.
- **Backup real** (`.comandas`): Configurações > Backup. Gera/restaura de verdade (antes era simulação), guarda cópia de segurança antes de restaurar, e "Zerar" só apaga movimentações.
- **Servidor**: ids únicos (listas mostravam só o primeiro item cadastrado quando vários eram salvos juntos).
- **Caixa/PDV/Cozinha** só mostram comandas do caixa aberto; numeração com opção "recomeçar do 1 a cada caixa"; relatórios com filtros em título, total geral, Imprimir/PDF/CSV; QR Code com link externo temporário (Cloudflare).

## Versão 2.1.0 — o que mudou
- **Rolagem**: o `Cardapio.js` forçava `height:auto` em todas as telas e quebrava a rolagem; agora só vale no cardápio do cliente (QR Code). Novo `css/responsive.css` (roda do mouse e barra fina no computador; arrastar com o dedo, sem seleção acidental e alvos de 44px em celular/tablet). Cozinha agora rola no celular/tablet.
- **Telas**: abas do PDV/Cozinha com rótulo e rolagem horizontal, filtros de relatório em uma linha rolável, botão (+) no canto, menu em gaveta com botão X no celular/tablet.
- **Botões**: `js/acoes.js` agora é carregado (filtros de relatório, sangria/suprimento, fechar caixa, gaveta da cozinha). No APK, `alert/confirm` não funcionavam (faltava `WebChromeClient`), por isso excluir/cancelar/fechar pareciam mortos. O botão Voltar do histórico não descia; corrigido.
- **Offline**: ícones (Font Awesome) e QR Codes agora são locais, sem depender da internet.
- **Android**: pede permissões na 1ª abertura (Wi-Fi/rede, armazenamento, Bluetooth, notificações); ponte para imprimir/PDF, salvar em Downloads/Comandas, compartilhar e escolher arquivo (restaurar backup).

## Não verificado
O APK **não foi compilado nem executado** (versão 2.1.0 também não; o frontend foi testado no Chromium em 390, 820 e 1366 px) (o ambiente onde preparei este projeto não alcança o Android SDK).
O `server.py` + `android_boot.py` e o frontend foram testados em Python/Node; a parte Android (Java/Gradle/Chaquopy) não.
Se o build acusar erro de versão do Chaquopy/AGP, ajuste as versões em `build.gradle`.
