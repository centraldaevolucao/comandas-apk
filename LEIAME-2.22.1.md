> **Versão atual do sistema: 2.17.0** — este arquivo é renomeado e atualizado a cada versão (seções numeradas abaixo, da mais antiga à mais nova).

# Comandas 2.3.0 — guia, relatório de correções, testes e pendências

## 1. Instalar / atualizar (APK)
- O APK é gerado pelo GitHub Actions (mesmo fluxo anterior). Todas as versões usam a mesma assinatura (`comandas.keystore`) e `versionCode` crescente: **instale por cima, sem desinstalar**.
- O banco é copiado para `/Comandas/backup` (pede "Acesso a todos os arquivos") e restaurado se o app for desinstalado e reinstalado.
- Antes de atualizar: Configurações > Backup > "Fazer backup agora" (gera arquivo `.comandas`).

## 2. Modos (Configurações > Tipo de dispositivo)
Trocar de modo pede confirmação, grava, confere o que ficou gravado, reinicia e mostra o modo em uso. A escolha fica no banco do aparelho (sobrevive a reiniciar/atualizar). Dados nunca são apagados na troca.
- **Único**: tudo liberado, banco local, sem rede.
- **Servidor**: o app atende outros aparelhos na porta 3000 (escuta 0.0.0.0).
- **Cliente**: usa o banco do servidor; escolha a **função** (Garçom=PDV, Cozinha=Cozinha, Caixa=Caixa+PDV, Cardápio=só Cardápio do Dia, sem menu) e informe o endereço do servidor.

## 3. Conexão — LAN, Hotspot, Cloudflare
Configurações > **Rede e conexão** (também abre ao tocar no selo colorido do cliente).
- **LAN**: servidor e clientes no mesmo roteador. No servidor, a tela mostra os IPs reais; no cliente, adicione `192.168.x.x`.
- **Hotspot (Android)**: ligue o Hotspot no celular servidor, abra o app em modo Servidor, veja o IP mostrado em Rede e conexão (não é sempre 192.168.43.1). Nos outros aparelhos conectados ao hotspot, adicione esse IP. Funciona sem internet.
  - Se não conectar: alguns celulares ativam "isolamento de AP/clientes"; desative nas opções do hotspot.
- **Cloudflare**: no servidor, ligue o túnel (link `https://….trycloudflare.com`). Cliente em outra rede adiciona esse link. Pelo túnel, só o cardápio do cliente (QR) é liberado; o resto é bloqueado no servidor.
- O cliente guarda vários endereços, testa **de verdade** (`/api/ping`) na ordem LAN › Hotspot › Cloudflare, usa o primeiro que responde, troca sozinho se cair e volta ao preferido quando ele reaparece.
- Atualização em tempo real por SSE (`/api/eventos`) com reconexão automática: o que um aparelho grava aparece nas telas Cozinha/Caixa/PDV dos outros.

## 4. Servidor no Termux
```
pkg install python
cd comandas-apk/termux   # pasta com server.py, public/ e iniciar-servidor.sh
bash iniciar-servidor.sh
```
O script lista os IPs; use o da interface do hotspot (ap0/wlan1) ou Wi-Fi. Dados ficam em `termux/data/`.

## 5. Corrigido nesta versão (e testado)
- **Persistência do modo**: o modo era descartado ao recarregar (só lia a config se existisse idTerminal). Corrigido; testado único→servidor→único com reload.
- **Caixa**: troco agora é descontado do dinheiro em todos os totais; fechamento separa Dinheiro/Débito/Crédito/PIX com quantidade, total e lista de transações. Testado: 50 pagos em dinheiro, total 30, troco 20 → dinheiro 30.
- **Histórico do caixa**: exclusão com confirmação, motivo obrigatório, permissão e registro em `auditoria` (exclusão lógica, não apaga o dado).
- **Servidor**: `/api/ping`, `/api/diagnostico` (IPs de todas as interfaces, banco, clientes em tempo real), `/api/eventos` (SSE), idempotência por `X-Op-Id` (reenvio não duplica — testado).
- **Cliente**: gerenciador de conexão, failover/retorno automático (testado derrubando e subindo o servidor), indicador de estado, tela de diagnóstico.
- **PIX fixo**: tipos CPF/CNPJ/Celular/E-mail/Aleatória com validação (dígitos verificadores), gera o BR Code e mostra a chave abaixo do QR no recibo e na comanda.
- **Ordem alfabética** (sem acento/caixa, só na exibição) em Cardápio (PDV) e Cardápio do Dia; números de comanda ordenados numericamente.
- Itens de versões anteriores mantidos: rolagem/toque, CRUDs, backup `.comandas`, QR, ícones estáveis, botões redondos, relatórios CSV/PDF/impressão.

## 6. Testes — o que foi executado de fato
Executado aqui (servidor Python real + Chromium/Playwright; dois servidores locais simulando servidor e cliente em portas diferentes):
troco/totais por forma; validação PIX/CRC; troca e persistência de modo; failover entre endereço morto e vivo; queda e retorno do servidor; SSE (evento recebido); idempotência; diagnóstico; navegação por 11 rotas sem erro de JS; servidor do pacote Termux responde e serve o frontend.

**NÃO foi possível testar neste ambiente (precisa de você, em aparelhos reais):** instalar/atualizar o APK, permissões do Android, hotspot real, Termux no celular, cloudflared/túnel real, dois celulares em rede real, impressão/PDF no Android. Eles foram implementados, mas **não estão validados**.

## 7. Pendências / limitações (honestas)
1. **Sem fila offline de gravações**: se a rede cair, a gravação falha com erro (e nada é duplicado ao repetir). Fila com reenvio automático não foi implementada.
2. **Permissões só nas telas**: a função do aparelho restringe menu/rotas, mas a API do servidor ainda aceita leituras/gravações sem login. Autorização no backend por função não foi feita; use Wi-Fi/hotspot com senha.
3. **Numeração de comanda centralizada no servidor** (reserva atômica) não implementada; no cliente a numeração é calculada a partir dos dados do servidor (risco de número repetido com duas comandas criadas no mesmo instante).
4. Perfil **Administrador** como função própria não existe: Único/Servidor têm acesso total.
5. Link externo temporário: validade/renovação/revogação do QR externo são os do túnel (muda ao reiniciar); controle de validade por link não implementado.
6. Fechamento por modalidade e exclusão no histórico foram só verificados por sintaxe + lógica de totais, não por clique na interface.
7. Domínio fixo Cloudflare (túnel nomeado) não configurado; usa túnel rápido temporário.
8. IPv6 não tratado.

## 8. v2.3.1 — correção "Failed to fetch" no cliente
Causa: no APK o servidor embutido só escutava em 127.0.0.1 (a opção de abrir para a rede ficava escondida no menu de saída), então nenhum outro aparelho conseguia conectar. Agora, escolher o modo **Servidor** liga a escuta em 0.0.0.0 e reinicia o app sozinho; os outros modos desligam. Ao abrir o app em modo Servidor ainda fechado para a rede, ele corrige e reinicia uma vez. (Corrigido no código; não testável aqui — validar no aparelho.)

## 9. v2.3.2 — voltar à seleção de modo
Aparelho Cliente (mesmo com função Garçom/Cozinha/Caixa/Cardápio e sem servidor) sempre alcança: selo de conexão (topo) → "Rede e conexão" → botão "Voltar à seleção de modo". Testado: cliente sem servidor → trocado para Único.

## 10. v2.3.3 — link Cloudflare (trycloudflare) no Termux
```
pkg install python cloudflared      # uma vez
bash iniciar-servidor.sh tunel      # sobe o servidor + gera o link
```
O script mostra `https://xxxx.trycloudflare.com` e grava em `tunnel_url.txt` (o app mostra em Rede e conexão e no QR). O link muda a cada vez e morre ao fechar o Termux. Sem instalar nada além do pacote: `pyflared` (pip) não é indicado no Android/Termux (binário embutido costuma ser x86). Observações do túnel rápido: não passa SSE (o cliente passa sozinho a consultar a cada 4 s), até 200 requisições simultâneas, sem garantia de uptime. Pelo túnel, o servidor só libera o cardápio do cliente (QR): clientes de PDV/Cozinha/Caixa devem usar LAN/Hotspot.

## 11. v2.4.0 — link externo para colaboradores
- **QR Code das mesas = só cardápio** (como antes: lista fixa de leitura e só cria pedidos/chamados).
- **Colaboradores** usam o mesmo túnel Cloudflare, mas com uma **chave**: Configurações > Rede e conexão > "Acesso dos colaboradores". Gere a chave e envie o link da função (`…/garcom?k=…`, `/caixa`, `/cozinha`, `/cardapio`). O link grava um cookie seguro (HTTPS, HttpOnly, 30 dias) e abre a tela da função.
- Com a chave: API completa liberada, **exceto** backup, configuração do aparelho e gestão da chave (só no aparelho servidor). Sem chave ou chave errada/revogada: só o cardápio. Renovar/revogar derruba quem usa a chave antiga.
- Testado (servidor real, cabeçalhos de túnel simulados): sem chave 403; chave válida (cabeçalho, cookie e link `?k=`) libera; backup/device 403 mesmo com chave; revogar bloqueia; gerar chave pelo externo 403.
- Limites: a chave é compartilhada (não identifica a pessoa); atualização em tempo real pelo túnel é por consulta a cada 4 s (túnel rápido não passa SSE); não testado com o túnel real.

## 12. v2.4.1 — Logo e ícone a partir do dispositivo
Configurações > Logo / Ícone do estabelecimento: botão "Escolher do dispositivo" (galeria/arquivos), com prévia e botão de remover. A imagem é reduzida (logo 600 px, ícone 192 px) e guardada no banco, entrando no backup `.comandas`. A logo aparece no Menu e nos recibos/comandas; o ícone vira o ícone da aba/página e substitui o talher quando não há logo. Ainda aceita URL. O ícone de instalação do app no Android (launcher) não muda em tempo de execução: só trocando o arquivo no projeto e gerando novo APK.

## 13. v2.5.0
- **Túnel Cloudflare no app**: o erro "x509: certificate signed by unknown authority" vinha do cloudflared não enxergar os certificados do Android. O APK agora leva um pacote de certificados (`assets/cacert.pem`) e o passa ao cloudflared. (Não testável aqui: confirmar no aparelho em QR Codes › Gerar link externo.)
- **Caixa**: só abre com fundo inicial maior que zero (troco garantido).
- **PDV**: faixa "Grupo de trabalho: <cor>" no topo e etiqueta de cor+nome em cada card. **Comanda e recibo** (tela, impressão e Bluetooth) trazem "Grupo de trabalho: <cor>".
- **Adicionar produto**: lista sempre A-Z. Itens da comanda mantêm a ordem em que foram inseridos.
- **Botão voltar do Android**: volta uma tela por vez; o último "voltar" cai no Menu Principal; no Menu Principal abre o menu de saída. O cardápio do cliente (QR) mantém o comportamento normal.
- **Modo Cliente**: ao escolher Cliente o app pergunta a função. **Garçom** entra sem cadastro; **Cozinha, Caixa e Cardápio** exigem login (e-mail e senha de um colaborador com acesso). Trocar função/modo e Rede ficam sempre acessíveis na tela de login. Bloqueio de tela: o servidor ainda não filtra os dados por função.
- **Editar pagamento**: janela própria no padrão do app (forma em botões, valor grande, atalho "Restante").
- **Impressora Bluetooth**: Impressoras › lista os aparelhos pareados, escolher uma testa a conexão ("Estamos testando…") e imprime um cupom de teste; comanda e recibo passam a sair nela (ESC/POS 32 colunas, PC860 ou "sem acentos"). "Resetar" esquece a impressora. Não testado em impressora real. O app lista **pareados** (parear antes nas configurações de Bluetooth do celular).
- **PIX**: botão "Ler QR Code do PIX (imagem do aparelho)" preenche chave, recebedor e cidade (usa ZXing no app; novo componente baixado no build). Também é possível digitar a chave. A câmera ao vivo não foi implementada.
- **Zerar**: o botão apaga só o financeiro (caixas/histórico, comandas, pedidos pendentes, chamados, sangrias, perdas, movimentações); cadastros ficam; backup de segurança antes.

## 14. v2.5.1
- Faixa colorida de comanda/recibo (tela, impressão e Bluetooth) mostra o **nome do grupo de trabalho** cadastrado (ex.: "Cantina Laranja") na cor do caixa. O nome é o editado em Grupos de Trabalho.
- Recibo: "PIX: chave" (sem "Chave PIX (tipo)"). Faixa de grupo também no PDV (topo e cards) e na tela da comanda.
- **WhatsApp**: o botão (agora em toda comanda/recibo, com ou sem cliente) envia a **imagem** (print) do documento; no app abre o WhatsApp direto (ou a lista de apps); no navegador usa o compartilhar do sistema ou baixa o PNG. PDF não foi feito. Escolha o contato dentro do WhatsApp (com imagem o app não consegue preencher o número). Se a imagem falhar, cai no envio por texto.

## 15. v2.6.0
- **QR do PIX não saía na impressão** — causa: ao salvar Configurações o campo "exibir PIX no recibo" era regravado como `false` (não havia checkbox). Corrigido.
- **Configurações**: dois novos botões liga/desliga — "QR Code do PIX na impressão (recibo e comanda, papel e Bluetooth)" e "QR Code do PIX no WhatsApp" (imagem enviada). Valem para recibo e comanda.
- **Bluetooth**: QR impresso com o comando nativo ESC/POS (GS ( k) + "PAGUE COM PIX", valor e "PIX: chave". Algumas impressoras genéricas não suportam o comando de QR — **não testado em impressora real**.
- **Modais padronizados**: todos os `confirm`/`prompt`/`alert` do sistema (84 pontos) agora usam janelas no layout do app (cabeçalho colorido, botões Cancelar/Confirmar; vermelho para ações de exclusão). Avisos que precedem recarga/navegação esperam o OK.
- **Logins dos colaboradores**: já existentes em Colaboradores › cadastro (e-mail + senha + nível de acesso; botão de resetar senha na lista) e usados no login do modo Cliente. Sem mudanças nesta versão.

## 16. v2.6.1
- **Cor fúcsia** (#C2185B) em todo o app: roxo/lilás restante (botões, títulos, modais, fundos de cartão) trocado pela paleta fúcsia.
- **Servidor não localizado** (modo Cliente): após ~4 s offline abre janela com *Tentar novamente*, *Alterar modo (Único/Servidor/Cliente)*, *Trocar função* e *Rede e conexão*. A pílula de conexão (topo) abre a mesma janela como "Informações do servidor".
- **Trocar função** (Garçom/Cozinha/Caixa/Cardápio) a qualquer momento: janela acima, tela Rede e login; encerra a sessão anterior.

## 17. v2.6.2
- **Editar pagamento (fechamento) não abria**: o modal abria *atrás* do modal de fechamento (z-index menor). Todos os modais/diálogos novos (editar pagamento, confirmar/avisar, função, conexão, login, Bluetooth) agora ficam por cima (z-index 300000). Isso também afetava os avisos/confirmações abertos de dentro de outros modais.
- **QR do cardápio / botão Teste**: desde a 2.5.0 o servidor embutido só escutava a rede no modo Servidor; em modo Único o link do QR (IP da rede) ficava inacessível. Agora a escuta de rede fica aberta em Único e Servidor e fechada só no Cliente (o app reinicia uma vez ao ajustar).
- **Listas com um item só**: dados gravados sob um "cliente" (`/api/c/<id>/…`, criado ao usar ID de acesso) ficavam separados da base comum, então só aparecia o que estava em cada base. Agora o servidor trata como base única e, ao iniciar, move esses registros para a base comum. Causa não reproduzida com certeza fora do aparelho — se ainda ocorrer, abra Rede › Diagnóstico e me envie o print.

## 18. v2.7.0 — Fechamento da comanda em etapas
1. **Receber / Fechar** → informar formas e valores (ou Fiado) → **Confirmar e gerar recibo** → pergunta de confirmação.
2. **Recibo em aberto** (tarja "AGUARDANDO PAGAMENTO"): itens consumidos, formas, total, **QR Code e chave PIX com o valor** (sempre exibidos, independente dos botões de Configurações). Sem impressão/WhatsApp nesta etapa. A comanda continua *aberta* e fica marcada como aguardando recebimento (botão passa a "Retomar recebimento").
3. **Fechar comanda (recebido)** → confirma, fecha e mostra o **recibo final** (✔ PAGO ou ⚠ PENDENTE (FIADO) + valor) — só agora liberados *Imprimir* e *Enviar WhatsApp*. A impressão (papel/Bluetooth) e o texto do WhatsApp trazem PAGO/PENDENTE.
4. **Cancelar recebimento** (botão ou X) em qualquer momento da etapa 2: nada é fechado, a comanda segue aberta.
Obs.: itens alterados depois de gerar o recibo em aberto não atualizam o valor já confirmado — cancele o recebimento e refaça.

## 19. v2.8.0 — Fiado/Pendências e WhatsApp
- **Fiado corrigido**: ao marcar "Deixar Fiado", os pagamentos pré-preenchidos que cobriam o total zeravam o valor pendente e a comanda nunca entrava em *Pendentes*. Agora marcar Fiado limpa o pagamento automático e **todo o valor (ou o que faltar) fica pendente**. A comanda fecha com "⚠ PENDENTE (FIADO)" e aparece no filtro Pendentes do PDV.
- **Nova tela Pendências** (Atalhos › Pendências, ou Clientes › "Pendências (fiado) por cliente"): clientes com pendência, total geral **somando todos os caixas**, busca, comandas de cada cliente, **Receber** por comanda ou **Receber/finalizar tudo** (forma de pagamento + valor; parcial permitido; abate das mais antigas). Zerou → a pendência é finalizada. Botão "Receber pendência" também na comanda fechada com fiado.
  - (Limitação da 2.8.0 resolvida na 2.10.0: ao quitar, a venda fecha no caixa aberto — ver seção 21.)
- **WhatsApp**: usa o telefone do cliente; se não houver, pergunta o número (DDD) e abre **nova conversa** com esse número, mesmo fora da agenda (imagem: abre a conversa direto via WhatsApp; texto: wa.me). Sem número, abre o seletor de contatos.

## 20. v2.9.0
- **Esgotado**: o app tratava estoque 0 (valor padrão do cadastro) como esgotado, na Cozinha e no cardápio do QR. Agora "esgotado/indisponível" vale **somente** para o que a Cozinha marcou como ACABOU (`acabouCozinha`); a marcação é bloqueada para garçom e para o cardápio de cliente (QR).
- **Fiado só para cliente cadastrado**: o botão "Deixar Fiado" fica desabilitado (com aviso) se a comanda não estiver ligada a um cliente cadastrado; ao fechar, a comanda recebe o `clienteId`.
- **Pendências anteriores somadas**: no fechamento aparecem as pendências anteriores do cliente (de qualquer caixa), o valor desta comanda e o **TOTAL GERAL com pendências**; o mesmo bloco sai no recibo (tela, WhatsApp-imagem, Bluetooth). Comanda fiada fecha com recibo "PENDENTE" e entra no filtro *Pendentes*.
- **Atualização não substitui cadastros**: a atualização só troca os arquivos do frontend; o banco (`data/database.sqlite`) é preservado. Novidade: antes de trocar, o app guarda `data/pre-atualizacao-<versão>.sqlite` (mantém as 3 últimas) além do backup periódico.

## 21. v2.10.0 — Fiado = pendência (sem fechar a venda)
- **Deixar Fiado**: ao marcar e confirmar, a comanda **não é fechada e nenhum recibo é gerado**. Ela vai para a área de **Pendências** com status `pendente` (libera a mesa e não bloqueia o fechamento do caixa) e aparece no filtro **Pendentes** (PDV e Caixa) como **card amarelo** com a tarja "Pendente: R$ …". Pagamentos parciais informados no fechamento são mantidos.
- **Somente cliente cadastrado**: se a comanda não tem cliente cadastrado, ao marcar Fiado abre a janela "Cliente do fiado": pesquisar/escolher um cliente **ou cadastrar na hora** (nome + telefone); sem isso o fiado não é confirmado.
- **Pendências por cliente** (Atalhos › Pendências): total geral somando todos os caixas; **Receber** em uma comanda individual (pagamento parcial permitido, antes de unir) ou **Receber/finalizar tudo**.
- **Unir pendências**: no menu Pendências (botão "Unir pendências deste cliente") ou no Caixa (banner de fiados › Unir). Junta todas as pendências do cliente em **uma só comanda** — a primeira recebe os itens (iguais são somados), os pagamentos parciais e o saldo pendente; **as demais são excluídas**. A união de comandas abertas comum não lista comandas pendentes.
- **Quitar**: ao zerar a pendência a venda **fecha agora, no caixa aberto** (a comanda passa para o caixa atual, guardando o de origem) e o **recibo final (PAGO)** é liberado para impressão/WhatsApp.
- Testado no navegador: fiado→pendência, união (3 pendências → 1: total e saldo somados, pagamento parcial preservado) e janela de cadastro. Cor do card amarelo verificada no código (não em tela do caixa aberto).

## 22. v2.10.1
- **Faixa do grupo de trabalho no recibo/comanda**: aparecia "VERMELHO" (nome padrão da cor) em vez do nome do grupo. A impressão (papel, Bluetooth, tela e WhatsApp) agora sempre carrega os nomes atuais de Configurações › Grupos de Trabalho e mostra, por exemplo, **"Cantina Vermelha"** na faixa colorida.

## 23. v2.11.0 — Exportar relatório abre o menu Compartilhar
- Em **Relatórios › Exportar (CSV / PDF)** o arquivo gerado agora abre direto o **menu Compartilhar do Android** (WhatsApp, e-mail, Drive, "Salvar em arquivos"…). Antes ele só era salvo em Downloads/Comandas, sem aviso claro.
- Técnico: nova ponte nativa `compartilharArquivo` (arquivo temporário em cache + `FileProvider`); novo `res/xml/file_paths.xml`, `<provider>` no manifesto e dependência `androidx.core:core:1.12.0` (baixada no build). No navegador usa Web Share (quando disponível) ou baixa o arquivo.
- **Atenção**: exige recompilar o APK; não testado em aparelho (a ponte foi validada no navegador com simulação; o Java não foi compilado aqui).

## 24. v2.12.0 — Integração com maquininha de cartão
- Novo atalho **Atalhos › Maquininha**: escolha o provedor. Padrão = *Nenhuma* (comportamento anterior: só registra o valor).
- Ao adicionar **Débito/Crédito** no fechamento (ou ao confirmar um cartão pré-preenchido) o app **cobra na maquininha**, pergunta as parcelas (crédito) e **registra NSU, autorização, bandeira, final do cartão e parcelas** no pagamento. Esses dados aparecem no fechamento, no recibo (tela, papel, Bluetooth e WhatsApp). Pagamento aprovado na máquina **não pode ter o valor editado** (exclua e cobre de novo).
- Provedores: **Registro manual** (qualquer maquininha: PagBank, Rede, GetNet… — você digita os dados do comprovante); **Mercado Pago Point** (API, via servidor; botão "Buscar maquininhas da conta"; só na rede local); **Cielo LIO**, **Stone** e **SumUp** (abrem o app da maquininha por link e recebem o retorno em `comandaspay://`; só no Android); **Simulado** (aprova sozinho, para testar o fluxo).
- Em qualquer falha existe o caminho **"Informar manualmente"**.
- **Testado**: Mercado Pago contra um servidor simulado (chamadas e parâmetros conferidos), manual, simulado, retorno de SumUp e Cielo LIO por link simulado, e o fechamento de comanda de ponta a ponta.
- **NÃO testado (precisa de máquina e credenciais reais)**: Mercado Pago real, Cielo LIO, Stone e SumUp em aparelho. O formato do link da **Stone** e os códigos de parcelamento da **Cielo LIO** foram montados pela documentação/memória e **precisam ser confirmados com o suporte de cada empresa**; SumUp no Brasil também precisa de confirmação. O Mercado Pago está migrando a API de Point (a atual pode mudar).
- Segurança: o Access Token do Mercado Pago fica gravado na configuração do aparelho servidor (visível a dispositivos da rede local que leem as configurações). Use token restrito.
- Técnico: `js/maquininha.js`, rotas `/api/maquininha/mp/*` (bloqueadas para acesso externo), ponte `abrirDeeplinkPagamento`, `launchMode=singleTop` + `onNewIntent`, `<intent-filter>` do esquema `comandaspay` e `<queries>` no manifesto.

## 25. v2.13.0 — Clientes, ordenação, pendências, QR e compartilhamento
- **Seletor de cliente pesquisável** (Editar Cliente e Nova Comanda do PDV/Nova Comanda): ao tocar no campo ou na seta mostra **todos os cadastros em ordem alfabética** e filtra enquanto digita (nome, telefone ou CPF). Opções fixas: **Sem cadastro (digitar nome)** e **Novo cliente** (+Novo, cadastro rápido que já seleciona). A comanda nova passa a guardar o vínculo (id, telefone, CPF) do cliente escolhido.
- **Listas sempre em A-Z**: mesas e colaboradores da Nova Comanda agora ordenados (as demais listas já eram).
- **Ordenação em Produtos e Cardápio**: Favoritos+A-Z (padrão), A→Z, Z→A, maior/menor preço, **mais/menos pedidos** (soma das vendas), promoções primeiro, por grupo. No cardápio do cliente (QR) "mais pedidos" só funciona se o aparelho do cliente puder ler as vendas; senão cai em A-Z.
- **Relatórios**: seletor **Ordenar** (A→Z, Z→A, maior/menor valor, maior/menor quantidade) em Vendas, Produtos, Clientes e Caixa; Produtos vendidos ganhou Z→A, menor valor e menor quantidade.
- **Pendências**: **Ver itens** de cada comanda e **de todas as pendências do cliente** (antes e depois de unir), com imprimir/visualizar, recibo pendente, WhatsApp, Outros, PDF e CSV. **Reabrir no caixa atual** (Pendências, Caixa, PDV e na tela da comanda pendente): a comanda volta a ficar aberta no caixa atual, **mantém os pagamentos parciais** (entram no fechamento como "já recebido") e guarda o caixa de origem. **Unir e quitar** permitem escolher o **grupo de trabalho/caixa** onde a comanda será lançada.
- **QR Code PIX — 4 opções independentes** (Configurações): imprimir comanda, imprimir recibo, compartilhar comanda, compartilhar recibo. Quem já usava as opções antigas mantém o mesmo comportamento até alterar. O QR "PAGUE COM PIX" do recibo em aberto continua na tela; ele só sai da imagem compartilhada/impressa conforme as opções.
- **WhatsApp direto no contato**: usa o telefone do cadastro **ou o informado na própria comanda**; no Android tenta WhatsApp e **WhatsApp Business**. Novo botão **Compartilhar** (menu do Android: e-mail, Drive, Telegram, SMS…) no preview da comanda/recibo e no recibo em aberto.
- **Testado no navegador**: seletor (ordem, filtro, seleção, +Novo), ordenação de produtos, ver itens, unir com grupo, reabrir (pagamento parcial mantido no fechamento), opções de QR na tela de configurações.
- **Não testado**: Java/Android (jid do WhatsApp Business, menu Compartilhar), exportação PDF/CSV em aparelho, e o efeito das 4 opções de QR na impressão física/Bluetooth.

## 26. v2.14.0 — Assinatura (controle de pagamento e plano gratuito)
**Como funciona (resumo):** o cliente paga por Pix → envia o comprovante + o **ID da instalação** → você emite um **código de ativação** com a ferramenta `ferramentas/licenca_admin.py` → o cliente cola o código na tela **Assinatura**. O código é assinado digitalmente (Ed25519, RFC 8032): o app só tem a chave **pública**, então não dá para fabricar códigos. Funciona **offline**; não precisa de servidor seu.

**Plano gratuito (sem assinatura, ou assinatura vencida):** PDV, comandas (até **30 por mês**), produtos e clientes. **Bloqueados:** Caixa (resumo, fechamento e histórico), Relatórios (todos) e Cardápio digital (cardápio do dia, QR Codes e o cardápio do cliente pelo link externo). O caixa abre sozinho para o PDV funcionar. O limite é aplicado **no servidor** (resposta 402) e também avisado na tela; a faixa no PDV mostra "12/30 comandas".

**Assinatura ativa:** tudo liberado. Faixa de aviso nos 7 dias antes de vencer. **Carência:** depois do vencimento tudo continua liberado por 3 dias (ajustável por cliente na emissão); depois volta ao gratuito (os dados não são apagados).

**Seu controle de pagamentos/recebimentos (no SEU computador):**
- `python3 ferramentas/licenca_admin.py chaves` — uma vez: cria `chave-privada.txt` e mostra a chave pública (já gerada e colocada em `licenca.py`; a chave privada foi entregue à parte).
- `python3 ferramentas/licenca_admin.py emitir --cliente "Bar do Zé" --id ABCD-EFGH --meses 1 --valor 13.99` — primeira assinatura. Mostra o código para enviar e anota no **livro** `ferramentas/livro-licencas.csv`.
- `python3 ferramentas/licenca_admin.py renovar --cliente "Bar do Zé" --meses 1 --valor 13.99` — renovação (continua do vencimento se ainda vigente; se já venceu, conta de hoje).
- `python3 ferramentas/licenca_admin.py listar [--vencendo]` — quem está ativo, vencendo, em carência ou vencido (cobrar) e o total recebido.
- `... verificar CODIGO` — confere um código.
- **Guarde `chave-privada.txt` e `livro-licencas.csv` com cópia de segurança; ambos estão no `.gitignore` e NÃO devem ir para o GitHub.** Perder a chave privada = não emitir mais códigos (e trocar a chave obriga a gerar um novo app, invalidando os códigos antigos). Quem tiver a chave consegue emitir códigos.
- Passos do dia a dia: (1) cliente paga o Pix; (2) você confere o recebimento no banco; (3) `emitir`/`renovar`; (4) envia o código por WhatsApp; (5) `listar` toda semana para cobrar quem venceu.

**Antes de publicar, ajuste:** `window.LICENCA_WHATSAPP` em `js/licenca.js` (seu número com 55+DDD; enquanto for o número de exemplo, o botão "Enviar comprovante" só compartilha/copia o texto), o valor (`valorAssinatura` nas configurações, padrão R$ 13,99) e a chave Pix da assinatura (`pixAssinatura`; o padrão é o do arquivo `Assinatura.js`).

**Limites (importante saber):**
- É controle por **honra + dificuldade**, não blindado: quem desmontar e alterar o APK pode burlar os bloqueios de tela. O limite de comandas e o bloqueio do caixa/cardápio são checados no servidor do próprio aparelho, que também está dentro do APK. Para a maioria dos clientes isso basta; para blindar de verdade seria preciso um servidor seu.
- Apagar os dados do app/reinstalar gera um **novo ID** e zera o contador do mês (a licença antiga não vale no ID novo — peça novo código e confira no livro).
- Voltar o relógio do celular não dá dias extras (o app lembra a maior data vista).
- A licença fica no aparelho **servidor**; os aparelhos "cliente" da rede usam o status dele.
- A antiga tela "Gerenciar assinaturas" (senha admin123) **não controla mais nada** — a liberação agora é só por código.
- **Testado:** emissão/verificação (vetores oficiais RFC 8032), ativação com código certo/errado/adulterado/de outro aparelho, limite de 30 no servidor, bloqueio de Caixa/Relatórios/Cardápio, carência, vencimento, relógio voltado, mudança de mês, tela Assinatura e Pix. **Não testado:** em aparelho Android e o fluxo real de pagamento Pix.

## 27. v2.15.0 — Licença em arquivo .lic, contador e vínculo ao equipamento
- **Cadastros 100% livres no plano gratuito:** produtos, clientes, grupos, mesas, colaboradores etc. Só ficam limitados: 30 comandas/mês, Caixa, Relatórios e Cardápio digital.
- **Arquivo `.lic`:** `licenca_admin.py emitir/renovar` agora grava `ferramentas/licencas/<cliente>_<ID>_<vencimento>.lic` (JSON com o código assinado). Envie esse arquivo ao cliente por WhatsApp/e-mail. Pasta no `.gitignore`.
- **Aplicar sem digitar:** (a) tocar no arquivo `.lic` e escolher **Comandas** (o app abre e aplica); ou (b) Assinatura › **Aplicar licença (arquivo .lic)** e escolher o arquivo. Colar o código à mão continua disponível, escondido em "Colar o código manualmente".
- **Contador de validade:** na tela Assinatura, `Nd hh:mm:ss` até o fim do dia do vencimento; em carência mostra o tempo até o bloqueio. Há também um selo "Assinatura ativa · N dia(s)" no PDV.
- **Vínculo ao equipamento:** o ID (8 caracteres) agora vem do **Android ID** do aparelho (ou machine-id no Linux/Termux), portanto **não muda ao limpar dados/reinstalar** o app no mesmo aparelho; basta reaplicar o `.lic`. Código de outro equipamento é recusado ("Este código é de outra instalação…"). `--id '*'` só com `--teste`.
- **1 licença = 1 equipamento servidor; clientes ilimitados:** celulares/tablets conectados ao servidor usam o status dele, sem limite de aparelhos.
- **Atenção:** os IDs e códigos da v2.14.0 (ID aleatório) deixam de valer — emita novos com o ID mostrado na tela Assinatura da v2.15.0. Trocar de aparelho exige nova licença.
- **Testado (navegador):** aplicar `.lic` pelo seletor de arquivo, recusa de licença de outro equipamento, contador correndo, mesmo equipamento → mesmo ID. **Não testado:** abrir `.lic` pelo Android (código Java sem compilar), aparelho real.

## 28. v2.16.0 — Administração separada: novo app "Comandas Licenças"
- **O Comandas não tem mais nenhum modo administrativo.** A emissão de licenças, o livro de recebimentos e a chave privada saíram deste projeto (a pasta `ferramentas/` e o script `licenca_admin.py` foram removidos). O dono usa o app separado **Comandas Licenças** (projeto `comandas-licencas`, id `br.com.comandas.licencas`, repositório próprio e privado). Não instale esse app nos clientes.
- **Pedido de licença (cliente):** Assinatura › **Solicitar licença (enviar pedido)** compartilha um arquivo `.pedido` (estabelecimento, telefone, ID do equipamento, valor) pelo WhatsApp/e-mail. O texto também leva o código `CMDP1.…`, que o app do dono entende mesmo colado.
- **Fluxo completo:** cliente paga o Pix → envia o `.pedido` → dono abre no Comandas Licenças › Atender › Gerar `.lic` › envia → cliente toca no `.lic` (ou Assinatura › Aplicar licença). Detalhes e abas no `LEIAME.md` do projeto `comandas-licencas`.
- **Chave:** a mesma chave privada de antes continua valendo (o app do dono importa o `chave-privada.txt`); códigos e `.lic` já emitidos seguem válidos. A chave NÃO fica mais neste repositório (`.gitignore` bloqueia `chave-privada.txt`, `*.lic`, `*.pedido`).
- As seções 26 e 27 acima citam `ferramentas/licenca_admin.py`: leia como "o app Comandas Licenças".
- **Testado:** pedido gerado pelo Comandas → importado no app do dono → `.lic` emitido → aplicado no Comandas (estado "ativa"). **Não testado:** compilação do Java e abertura de `.pedido`/`.lic` no Android.

## 29. v2.17.0 — Suporte (chatbot), contato da Central da Evolução e correção do APK sem `public.zip`
- **Correção importante:** o APK gerado no GitHub abria com *"Não foi possível iniciar o servidor — FileNotFoundException: public.zip"*. Causa: o `.gitignore` tinha `*.zip`, então `app/src/main/assets/public.zip` (o sistema empacotado) nunca ia para o GitHub. Agora o `.gitignore` abre exceção (`!app/src/main/assets/public.zip`) e o workflow **falha com mensagem clara** se o arquivo faltar. **No seu computador:** depois de extrair este zip, rode `git add -f app/src/main/assets/public.zip` uma vez (ou `git add .`, que já funciona com a exceção) e confira com `git ls-files | grep public.zip`.
- **Contato único** em `js/contato.js`: WhatsApp (91) 98138-5331 e e-mail centraldaevolucao@gmail.com. Usado em Solicitar licença e no Suporte. Para mudar, edite só esse arquivo.
- **Solicitar licença:** abre uma janela com **WhatsApp** (mensagem pronta com ID do equipamento e o pedido `CMDP1.…`, direto para o número acima), **E-mail** (mesmo texto) ou **Compartilhar arquivo .pedido**.
- **Suporte:** só WhatsApp e e-mail (telefone e horário removidos). Agora é um **assistente em formato de chatbot** com **101 perguntas detalhadas em 15 assuntos** (primeiros passos, rede, PDV, fechamento, fiado, caixa, cozinha, cardápio/QR, cadastros, estoque, relatórios, impressão, configurações/backup, assinatura/licença, problemas comuns). Menu por assunto, **busca por texto livre** e botão "ainda preciso de ajuda" que abre WhatsApp/e-mail já com o assunto. O conteúdo fica em `js/faq.js` (edite as respostas ali).
- **Rodapé:** "Comandas v2.17.0 · © 2026 Central da Evolução · Todos os direitos reservados" no Suporte, em Minha Assinatura e no fim do menu lateral. A versão vem de `APP_VERSAO` em `js/contato.js` — **atualizar a cada versão**.
- **Testado (navegador):** menu e perguntas do chat, busca livre (com e sem resultado), links de WhatsApp/e-mail, janela de Solicitar licença (3 caminhos), rodapés. **Não testado:** no Android (abrir WhatsApp/e-mail pelo app).

## 30. v2.18.0 — Licenças (.rlic, teste, 30/dia), correção do "código inválido", botões Voltar e FAQ ampliado
- **Limite grátis: 30 comandas por DIA** (antes por mês). A contagem fica em `data/licenca.json` (últimos 7 dias).
- **Licença de TESTE:** gerada no Comandas Licenças com prazo (1–365 dias) e **acesso total**; o app mostra "Licença de TESTE — N dia(s)". Sem ID de equipamento ela vale para qualquer aparelho, no máximo 30 dias; com ID, é só daquele aparelho. Teste vence sem carência.
- **Arquivo `.rlic`** ("Assinatura.rlic"): é o novo arquivo de licença. O seletor do app pede só `.rlic` (o Android não filtra por extensão de verdade; arquivos de outro tipo são recusados com aviso). Também dá para **salvar/enviar como TXT**, copiar/colar o código ou a mensagem completa do WhatsApp/e-mail — o app encontra o código `CMD1.…` no meio do texto, mesmo com quebras de linha.
- **"Código inválido ou adulterado":** quase sempre a licença foi assinada com **outra chave privada**. Agora a mensagem diz isso. O Comandas Licenças recusa emitir se a chave dele não for a do app. Para corrigir: em Comandas Licenças › Configurações › importe o `chave-privada.txt` original (pede confirmação para substituir) e emita de novo.
- **Botões Voltar:** pilha própria de navegação; todos os botões ← e o botão Voltar do Android voltam à tela anterior (antes alguns ficavam mortos em Caixa, Cozinha e Relatórios).
- **Suporte/FAQ:** 175 perguntas em 15 assuntos, respostas em passo a passo. **Confirme os horários** em `js/contato.js` (`horarios`): estão como Seg–Sex 8h–18h, Sáb 8h–12h.
- **Testado (navegador/Python):** todos os formatos de colagem, chave errada, outro equipamento, teste, limite diário, todos os botões Voltar. **Não testado:** compilação do Java, abrir `.rlic` no Android.

## 31. v2.18.0 — Várias maquininhas, maquininha por garçom e QR PIX só com PIX
- **Configurações › Maquininhas de cartão:** cadastre quantas quiser (nome, provedor, credenciais, ativa/inativa). Quem usava a configuração antiga de uma maquininha é migrado sozinho (vira "Maquininha 1"). O atalho em Atalhos continua abrindo a mesma tela.
- **Ao receber em Débito, Crédito ou PIX** (se há maquininha ativa), o app **pergunta em qual maquininha** foi recebido. Com apenas uma disponível ela é usada direto, sem perguntar. Débito/crédito seguem o fluxo do provedor (Mercado Pago, manual, etc. daquela máquina); **PIX só identifica** a máquina. O nome aparece no pagamento, no recibo, no WhatsApp e na impressão Bluetooth ("Maquininha: Balcão · NSU …"). Trocar a forma de um pagamento obriga a escolher a máquina de novo.
- **Maquininha por garçom:** Colaboradores › editar › "Maquininhas deste garçom". Sem marcação = **todas as ativas do caixa**. O garçom considerado é o da comanda.
- **QR Code do PIX na comanda e no recibo:** só aparece se houver **pagamento em PIX** na comanda e leva **apenas o valor pago em PIX** (os demais pagamentos continuam normais na lista). As chaves de exibição em Configurações continuam valendo. Vale para tela, impressão, Bluetooth e imagem compartilhada.
- Servidor: `maq_config(id)` e as rotas do Mercado Pago aceitam o id da maquininha (`maqId`/`?maq=`), cada uma com seu token.
- **Testado (navegador):** escolha da máquina (PIX/débito/crédito, cancelar), filtro por garçom, tela de lista/edição, QR com e sem PIX e valor, vínculo no colaborador. **Não testado:** maquininha real (Mercado Pago/Cielo/Stone/SumUp).

## 32. v2.18.1 — Valor da assinatura R$ 25,90
- O valor padrão mostrado no pedido de licença passou de R$ 13,99 para **R$ 25,90** (`VALOR_PADRAO` em `js/licenca.js`; pode ser sobrescrito por `valorAssinatura` nas configurações). As menções a 13.99 nas seções antigas (exemplos de linha de comando) são históricas.

## 33. v2.18.2 — Novo nome do app: Restaurante-app (e o app do dono: Licenca-app)
- O ícone/nome do app no Android passa a ser **Restaurante-app** (antes "Comandas"); o rodapé, o diálogo do app e o assunto do e-mail de suporte também. O app do dono passa a se chamar **Licenca-app** (antes "Comandas Licenças"); onde o texto dizia "Comandas Licenças", agora diz "Licenca-app".
- **O que NÃO mudou:** o id do pacote (`br.com.comandas` / `br.com.comandas.licencas`). Assim a atualização **instala por cima** sem perder dados, a licença, o ID do equipamento e a chave. Os nomes das pastas e dos repositórios também ficam iguais.
- O arquivo do APK no GitHub (Actions › Artifacts) agora se chama `Restaurante-app` e `Licenca-app`.
- Algumas respostas do FAQ ainda usam "o sistema Comandas" no sentido geral; se quiser trocar tudo, é só pedir.

## 34. v2.18.3 — Ícones próprios
- **Restaurante-app:** ícone rosa com prato, garfo e faca. **Licenca-app:** ícone azul com escudo e visto. Para trocar, substitua os `ic_launcher.png` em `app/src/main/res/mipmap-*` (48, 72, 96, 144 e 192 px). Depois de instalar, o Android pode demorar a atualizar o ícone na tela inicial; reinicie o launcher se precisar.

## 35. v2.18.4 — Forma de pagamento padrão no fechamento e layout das Configurações
- **Configurações › "Forma de pagamento padrão no fechamento"** agora é aplicada de verdade (antes era salva e ignorada): ao abrir o fechamento, o pagamento já vem lançado nessa forma (ex.: **PIX**, com o valor total) e o campo "Nova forma de pagamento" também começa nela. **Continua possível trocar** a forma, editar o valor e dividir em várias formas. Se a forma escolhida estiver desligada em "Formas de pagamento", usa a primeira ativa. Com PIX lançado, o QR Code aparece (valor = só o PIX, conforme a seção 31).
- **Layout:** campos "Próximo número" e demais campos das Configurações não passam mais da borda da tela (testado em tela de 360 px, nenhum elemento fora da área).

## 36. v2.18.5 — Salvamento automático nas Configurações
- Ao ligar/desligar qualquer **chave (toggle)** ou trocar a **forma de pagamento padrão** em Configurações, a alteração é **salva na hora** (aparece "Configurações salvas"), sem redesenhar a tela: a posição da rolagem é mantida. Os campos numéricos e de texto continuam com o botão de salvar (disquete). Salvamentos em sequência rápida são enfileirados para não se sobrepor.
- Testado no navegador: 3 toggles alterados = 3 gravações, valores mantidos após recarregar.

## 37. v2.19.0 — Colaboradores, funções do modo cliente, níveis de acesso, login, treinamento, impressão, abertura animada e hotspot
- **Colaboradores:** corrigido o erro "usuarioDoColaborador is not a function" (a lista não aparecia; era um conflito de nome). **Novos filtros** (chips): uma por **função cadastrada**, por **nível de acesso**, **Com acesso**, **Sem acesso** e **Acesso inativo**, cada um com contador; a busca por texto continua.
- **Funções (Colaboradores › Funções):** cada função tem **Nível de acesso** e o toggle **"Aparece no modo cliente"**. As funções padrão (Garçom, Atendente, Caixa, Cozinheiro, Barman, Gerente, Recepcionista) já vêm com nível; Gerente vem oculto no modo cliente.
- **Qual a função deste aparelho (modo cliente):** agora lista **todas as funções cadastradas e permitidas no modo cliente** (+ Cardápio do dia + Modo Treinamento, se habilitado). Cada função mostra o nível e se exige login. Garçom continua entrando sem cadastro. O aparelho passa a ver apenas as telas liberadas pelo nível da função.
- **Níveis de acesso (editar nível):** nova lista **"Telas e funções deste nível"** com caixas de marcação por grupo (Atendimento, Cozinha, Caixa, Cadastros, Equipe, Estoque, Relatórios, Sistema). O Administrador tem sempre acesso total. A permissão vale para o aparelho cliente (função) e para o usuário logado. Níveis antigos sem lista usam um padrão sensato (atendente: comandas; caixa: comandas + caixa; cozinha: cozinha).
- **Configurações › "Exigir login do usuário cadastrado":** desligado, as funções do modo cliente entram sem pedir e-mail/senha. O Modo Treinamento sempre exige administrador.
- **Modo Treinamento:** em **Modo de operação** (com o aparelho em modo **Servidor**) há o toggle "Modo Treinamento". Ligado, os clientes veem a opção na escolha da função; ela exige **login de administrador** e dá **acesso total**, com a faixa laranja "MODO TREINAMENTO" na tela. **Atenção:** os dados são os reais (não é uma base separada).
- **Wi-Fi do celular (modo Servidor):** toggle **"Roteador Wi-Fi do celular"** liga o *hotspot local* do Android e mostra nome da rede, senha e IP. Limitação do Android: apps só podem ligar o hotspot local (sem internet, com nome/senha gerados pelo sistema). Para o Roteador Wi-Fi comum (com internet) há o botão que abre a tela do sistema. **Não testado em aparelho real** (código Java não compilado aqui). Nova permissão `CHANGE_WIFI_STATE`.
- **Impressão:** toggles **"Nome nas impressões"** e **"Logo nas impressões"** (tela, impressão, Bluetooth e texto do WhatsApp).
- **Ícone do estabelecimento:** corrigido (a tela de Configurações não relia o ícone e o apagava no próximo salvamento). Ele aparece no cabeçalho do menu quando não há logo e como ícone da aba. O ícone do aplicativo na tela inicial do Android não muda por configuração.
- **QR Code do PIX:** agora são **6 toggles** — para **Comandas** e para **Recibos**: *Visualização e Bluetooth*, *WhatsApp direto* (cliente cadastrado) e *Compartilhar com terceiros* (WhatsApp escolhendo contato, e-mail, Bluetooth e outros). Continua valendo: só aparece com pagamento em PIX e com o valor do PIX.
- **Abertura animada:** barras crescendo com seta de crescimento, nome "Restaurante-app" e o slogan **"Aqui seu empreendimento cresce"** (escrevi "seu"; se o texto certo for outro, é `js/../index.html` e `assets/splash.html`). No Android a animação aparece já enquanto o servidor inicia. Dentro da mesma sessão ela não repete.
- **Antes (2.18.5):** toggles das Configurações salvam na hora; forma de pagamento padrão aplicada (2.18.4).
- **Testado (navegador):** lista/filtros de colaboradores, salvar função e nível, perfis e telas por nível, diálogo de função (com e sem treinamento), exigir login, toggles de QR/nome/logo, splash. **Não testado:** Java/Android (hotspot, splash nativa), login de administrador no cliente em rede real.

## 38. v2.19.1 — Maquininhas Mercado Pago e Cielo LIO: passo a passo e testes
- **Mercado Pago Point:** o cadastro agora mostra o passo a passo (criar aplicação no Mercado Pago Developers, token de PRODUÇÃO, buscar maquininhas, escolher o ID). Botão **"Testar conexão (não cobra)"** confere: token válido (mostra a conta), maquininhas da conta, se o ID existe nela e se está em **modo PDV**. Se não estiver, o link **"Ativar modo PDV"** pede a troca pela API (reinicie a Point depois). O teste usa o token digitado, sem precisar salvar antes.
- **Cielo LIO:** passo a passo + botão **"Verificar"** (Client ID, Access Token e se está no aplicativo Android da LIO).
- Ambas têm **"Testar cobrança de R$ 1,00"** (cobra de verdade, com confirmação; estorne depois).
- **Testado:** Mercado Pago contra uma API simulada (token inválido, válido, modo STANDALONE → PDV). **Não testado:** contas e maquininhas reais Mercado Pago/Cielo; o retorno da Cielo LIO só se confirma na própria LIO.

## 39. v2.19.2 — Fonte das impressões
- **Configurações › Fonte da impressão** (substitui o toggle "Fonte grande"): **tipo** (Padrão, Cupom/monoespaçada, Serifada, Condensada) e **tamanho** de 80% a 160%, com amostra ao vivo; salva na hora. Vale para a tela, a impressão comum e a Bluetooth. Quem usava "fonte grande" passa a ter 125%.
- **Térmica Bluetooth:** usa as fontes da própria impressora — "Condensada" usa a fonte B (menor) e tamanho a partir de 120% usa letra de altura dupla (a largura de 32 colunas é mantida). O título continua grande.
- Testado no navegador (salvar, amostra, conversão do "fonte grande", linhas da térmica). Impressão real não testada.
- A área de **layout de impressão** foi apenas desenhada (proposta); não implementada.

## 40. v2.20.0 — Layout de impressão configurável
- **Configurações › Layout de impressão**: edita **Comanda**, **Recibo** e **Cozinha** (nova via da cozinha, sem preços, com observação dos itens). Papel: **Térmica 58 mm** (32 colunas), **80 mm** (48) ou **A4**.
- **Blocos** que podem ser ligados/desligados e reordenados (▲ ▼): logo (com tamanho), nome (alinhar E/C/D), título (texto editável), faixa de cor do caixa, Comanda/Mesa/Data, cliente e garçom, itens, totais (e pagamentos no recibo), pendências, QR Code PIX, assinatura, mensagem final (texto editável) e **linhas de texto livre** (Instagram, Wi-Fi, horário…). Também: tipo de linha separadora (tracejada, sólida, pontos) e margem lateral (vale para tela/impressão comum).
- A **pré-visualização** muda a cada ajuste (exemplo fictício). Tudo salva sozinho; "Restaurar layout padrão" volta ao original.
- O mesmo layout vale para **tela, impressão comum, imagem do WhatsApp e Bluetooth**. Na Bluetooth o logo sai como imagem (se o endereço do logo bloquear a leitura, ele é omitido) e o QR é nativo. A **via da cozinha** é impressa por um botão no preview da comanda.
- Os modelos antigos (cabeçalho colorido) foram substituídos por este estilo de cupom. Padrão: 58 mm, como a Bluetooth já era.
- Testado no navegador (editor, ordem, ligar/desligar, texto livre, salvar, preview, linhas Bluetooth 58/80 e cozinha). **Não testado:** impressora real, logo na térmica, A4 em papel.

## 41. v2.20.1 — Fiado com comprovante, recibo aberto, maquininha opcional, layout totalmente editável e botões redondos
- **Botões redondos de Bluetooth/WhatsApp removidos:** o estilo do botão flutuante "+" (`.fab`) também pegava os ícones de marca do FontAwesome (`fab fa-whatsapp`, `fab fa-bluetooth-b`) e os transformava em bolhas. O estilo agora vale só para `button.fab`.
- **Recibo antes de fechar (aguardando pagamento):** novo botão **Imprimir** (tela/Bluetooth), ao lado de WhatsApp e Compartilhar. Sai como "RECIBO EM ABERTO".
- **Deixar fiado:** o aviso "Enviar para pendências?" agora tem **Visualizar, Imprimir, WhatsApp e Compartilhar** (comprovante da pendência, "PENDENTE (FIADO)") antes de enviar. Cancelar desfaz tudo.
- **Maquininha — dados opcionais:** em Configurações (aparece quando há maquininha selecionada) há três toggles: **Pedir dados no PIX / crédito / débito**. Ligado, abre o registro (bandeira, NSU, autorização, final) com todos os campos **opcionais** e o link "Continuar sem preencher". Desligado, só escolhe a maquininha e segue direto. Vale para maquininha em modo Manual (as integradas trazem os dados sozinhas).
- **Layout de impressão — estilo por bloco** (botão de ajustes em cada bloco): alinhamento, peso (padrão/normal/negrito), **tamanho da fonte** (70–200%), **fonte** e **cor do texto**. Na térmica Bluetooth a cor não existe; tamanho ≥120% = altura dupla, ≥150% = dupla altura e largura, ≤85% ou "Condensada" = fonte menor.
- Testado no navegador (fiado, impressão do recibo aberto, toggles e registro opcional, estilos do layout e linhas Bluetooth). Não testado em impressora real.

## 42. v2.20.2 — Pagamento parcial com restante em pendência
- No fechamento da comanda, qualquer forma (**dinheiro, débito, crédito ou PIX**) pode receber **valor parcial**. A tela avisa disso. Dica: a tela já vem com o total sugerido; edite o valor (lápis) ou exclua e adicione o valor parcial.
- Ao confirmar com pagamento menor que o total, o app pergunta **"Deixar o restante em pendência (fiado)?"** (antes só mostrava um alerta pedindo para marcar Fiado). Confirmando, pede o cliente cadastrado (se ainda não houver) e abre o aviso "Enviar para pendências" com **Visualizar, Imprimir, WhatsApp e Compartilhar**, mostrando "Recebido agora" e o valor que fica pendente. A comanda vai para Pendências com o valor recebido registrado.
- Testado no navegador (parcial em dinheiro → pendência de R$ 30,00 de R$ 50,00). Cartão/PIX parcial usam o mesmo caminho, com a maquininha cobrando só o valor parcial.

## 43. v2.21.0 — Desconto no fechamento da comanda
- No fechamento, entre **"+ Adicionar Pagamento"** e **"Deixar Fiado (Pendente)"**, há o toggle **Desconto**. Ligado, abre a área: seletor **R$ | %**, campo do valor, mini-resumo (Subtotal, Desconto, Total a pagar) e **Motivo (opcional)**. O toggle abre sempre desligado (aberto já ligado se a comanda tiver desconto).
- Limites: % até 100 e R$ até o subtotal. O quadro de totais mostra Subtotal / Desconto / Total; o pagamento sugerido acompanha o total descontado. Desligar o toggle remove o desconto.
- Cancelar o fechamento **desfaz** o desconto. O desconto aparece no **recibo (tela, impressão, Bluetooth), no WhatsApp** (com % e motivo) e funciona junto com pagamento parcial e fiado (o pendente é sobre o total já descontado).
- Qualquer usuário que fecha a comanda pode dar desconto (sem permissão específica). Os atalhos 5/10/15/20% do primeiro desenho foram removidos a pedido.
- Testado no navegador (%, R$, limites, motivo, recibo aberto). Não testado: fluxo completo com maquininha real.

## 44. v2.22.0 — Planos de assinatura, adicionar pagamento em janela e layout Pendência
- **Assinatura com planos:** a tela mostra 4 cartões — **Mensal R$ 25,99**, **Trimestral R$ 69,90** (⭐ Mais popular, -10%), **Semestral R$ 129,90** (-17%) e **Anual R$ 239,90** (🏆 Melhor valor, -23%, R$ 19,99/mês) —, com equivalente por mês, economia, frase de apoio, tabela comparativa e botões **Assinar mensal/trimestral/semestral/anual**.
- **Fluxo do pedido (mesmas regras):** o botão abre "Plano X — R$ …" com **1. Pagar com Pix** (valor do plano) e **2. enviar pedido** por WhatsApp, e-mail ou arquivo .pedido. O pedido agora leva **plano, meses e valor** além do ID do equipamento; depois o cliente aplica o **.rlic** como antes. Pagamento é por Pix, sem cobrança automática.
- O preço **mensal** continua vindo de `valorAssinatura` (padrão agora R$ 25,99); os demais preços estão em `planosCat()` em `js/licenca.js`. Se a chave Pix da assinatura (`pixAssinatura`) não estiver configurada, o botão Pix avisa para enviar o pedido.
- **Fechamento:** "Adicionar pagamento" agora abre uma **janela** (forma + valor, com o restante já sugerido) em vez dos campos soltos na tela.
- **Pendência:** o texto "(FIADO)" saiu do recibo/comanda pendente; o comprovante virou **COMPROVANTE DE PENDÊNCIA** e há um 4º layout editável, **Pendência**, em Layout de impressão (Comanda, Recibo, Cozinha, Pendência).
- Testado no navegador. Não testado: impressora real e Pix real.

## 45. v2.22.1 — Receber pendência no layout do fechamento, blocos iguais no layout e QR da pendência
- **Receber pendência** (laranja, mesmo layout do fechamento): lista de pagamentos (editar/excluir), **+ Adicionar Pagamento** (Dinheiro/Débito/Crédito/PIX, várias formas), **Desconto** (R$ ou %, motivo opcional), quadro Total pendente / Desconto / Total recebido / Continua pendente e seletor de caixa. Parcial continua valendo.
- **Fluxo em duas etapas, como no fechamento:** **Confirmar e gerar recibo** → abre o **Recibo em aberto (aguardando)** com Imprimir/WhatsApp/Compartilhar → só em **Confirmar recebimento (recebido)** os pagamentos são gravados (e a venda quitada fecha no caixa atual). **Cancelar recebimento** não grava nada.
- O desconto fica na comanda como **Desconto na pendência** (aparece no recibo) e não entra como pagamento.
- **Layout de impressão:** Comanda, Recibo, Cozinha e Pendência têm os **mesmos blocos** (liga/desliga cada um), incluindo QR Code PIX, totais, pendências e assinatura; layouts já salvos ganham os blocos novos na posição certa.
- **QR Code só para PIX:** em todos os documentos o QR sai apenas quando há pagamento em PIX, com o valor do PIX. Novo grupo em Configurações › Pix: **QR Code PIX nos recibos de pendência** (visualização/Bluetooth, WhatsApp direto, compartilhar).
- Testado no navegador. Não testado: impressora real e Pix real.
