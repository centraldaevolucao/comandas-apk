// Guia completo — parte B: telas de atendimento (comandas, PDV, caixa, cozinha, garçom, cardápio)
(function () {
var O = window.FAQ_O, U = window.FAQ_U, DICA = window.FAQ_DICA;
window.FAQ_DADOS.push(
{ id: 'tel1', icone: 'fa-cash-register', titulo: 'Tela a tela — atendimento (passo a passo)', itens: [
 { p: 'Nova Comanda: o que cada campo significa?', k: 'nova comanda tela campos tipo comanda mesa balcao delivery para viagem cliente opcional garcom opcional abrir comanda',
   r: O('No PDV toque em <b>Nova comanda</b>.', 'Em <b>Tipo de Comanda</b> escolha a mesa numerada, <b>Balcão</b>, <b>Delivery</b> ou <b>Para Viagem</b>.', '<b>Cliente (Opcional)</b>: vincule para pendência, WhatsApp e histórico.', '<b>Garçom (Opcional)</b>: quem atende (se houver colaborador padrão, já vem preenchido).', 'Toque em <b>Abrir Comanda</b>.') },
 { p: 'PDV: como é a tela e o que faço em cada botão?', k: 'pdv tela botoes lista comandas abertas busca filtro nova comanda cards alerta cor tempo',
   r: 'O PDV lista as comandas com cartões coloridos (cor do grupo de trabalho, tempo parado e alerta).' + U('Toque em uma comanda para abrir os itens.', 'Use a busca e os filtros (abertas, fechadas, canceladas…) no topo.', '<b>Nova comanda</b> abre um atendimento.', 'Comandas paradas além dos "Minutos alertar comanda" ficam em alerta.') },
 { p: 'Passo a passo completo: do pedido ao recibo', k: 'passo a passo completo pedido recibo fluxo atendimento abrir adicionar enviar fechar imprimir tudo',
   r: O('<b>Nova comanda</b> (mesa/balcão/delivery).', '<b>Adicionar produto</b>, ajuste quantidade e extras (adicionais).', 'Envie à produção (a cozinha recebe e imprime se estiver configurado).', 'Quando o cliente pedir a conta, toque em <b>Fechar comanda</b>.', 'Lance o pagamento (uma ou várias formas) e confirme.', 'Imprima ou envie o <b>recibo</b> por WhatsApp/Compartilhar.') },
 { p: 'Detalhe da comanda: o que há na tela?', k: 'detalhe comanda tela itens total desconto garcom couvert editar fechar imprimir pendente transferir',
   r: 'Ao abrir uma comanda você vê os itens, valores, taxa de garçom e couvert, cliente e ações:' + U('<b>Adicionar produto</b> e editar/remover itens.', '<b>Desconto</b>.', '<b>Imprimir</b>/<b>Recibo</b> e WhatsApp.', '<b>Deixar pendente</b> (cliente cadastrado).', '<b>Fechar comanda</b> e pagamento.') },
 { p: 'Como edito uma comanda (cliente, mesa, garçom)?', k: 'editar comanda trocar cliente mesa garcom alterar dados comanda aberta',
   r: O('Abra a comanda no PDV.', 'Toque em <b>Editar</b>.', 'Altere cliente, garçom ou observação e confirme.') + 'Para trocar de mesa use a transferência (veja "Como transfiro uma comanda de mesa?").' },
 { p: 'Pedidos Pendentes: como aprovo ou recuso pedidos do cliente (QR)?', k: 'pedidos pendentes aprovar recusar aprovacao pedidos qr cliente caixa recusado pelo caixa',
   r: O('Quando o cliente pede pelo QR Code, o pedido aparece em <b>Aprovação de Pedidos</b> (Caixa/PDV).', 'Confira os itens.', 'Toque em <b>Aprovar</b> para enviar à comanda/cozinha, ou <b>Recusar</b> (confirme a pergunta).', 'Recusados ficam com o aviso "Recusado pelo caixa".') },
 { p: 'Caixa: o que cada parte da tela faz?', k: 'caixa tela abrir fechar caixa aberto operador abertas fechadas canceladas pendentes sangria suprimento receber pendencia reabrir',
   r: 'A tela <b>Caixa</b> mostra o estado (<b>CAIXA ABERTO</b> / <b>Caixa Fechado</b>), o operador e abas <b>Abertas, Fechadas, Canceladas e Pendentes</b>.' + U('<b>Sangria</b>: retirada de dinheiro; <b>Suprimento</b>: entrada.', 'Em cada comanda: <b>Fechar comanda</b>, <b>Cancelar</b>, <b>Excluir</b>, <b>Reativar</b>, <b>Reabrir no caixa atual</b>.', '<b>Receber pendência</b> quita pendências do cliente.', 'No cartão aparece "Pend:" quando há pendência.') },
 { p: 'Como abro o caixa escolhendo o Grupo de Trabalho?', k: 'abrir caixa grupo de trabalho cor escolha cor trabalhar hoje fundo inicial passo a passo',
   r: O('Abra <b>Caixa</b> (com o controle de caixa ligado).', 'Toque em abrir caixa e informe o <b>fundo inicial</b>.', 'Em <b>Escolha um grupo de trabalho</b> selecione a cor que vai trabalhar hoje.', 'Confirme. O status muda para <b>CAIXA ABERTO</b>.') },
 { p: 'Como faço Sangria e Suprimento passo a passo?', k: 'sangria suprimento passo a passo retirada entrada dinheiro caixa observacao motivo sem motivo',
   r: O('No <b>Caixa</b> aberto toque em <b>Sangria</b> (retirar) ou <b>Suprimento</b> (colocar).', 'Digite o valor.', 'Preencha a observação (opcional).', 'Confirme. O movimento entra no resumo e no histórico do caixa.') },
 { p: 'Resumo do Caixa e Histórico: o que mostram?', k: 'resumo caixa historico caixa vendas dinheiro pix cartao sangrias suprimentos total esperado auditoria fechamento',
   r: U('<b>Resumo do Caixa</b>: vendas por forma de pagamento, sangrias, suprimentos e saldo esperado do caixa atual.', '<b>Histórico</b>: caixas anteriores, com abertura, fechamento e valores.') + 'Acesse pela tela Caixa.' },
 { p: 'Cozinha: o que significa cada aba e botão?', k: 'cozinha tela pendentes preparando atendidos cancelados preparar servir acabou faltou cardapio de hoje marcar todos',
   r: U('<b>Pendentes</b>: itens novos. Toque em <b>Preparar</b> para iniciar.', '<b>Preparando</b>: em produção. Toque em <b>Servir</b> ao entregar.', '<b>Atendidos</b> e <b>Cancelados</b>: histórico.', '<b>ACABOU</b>: marca o produto como esgotado (só a Cozinha pode).', 'Você pode marcar <b>todos</b> os itens de uma comanda como atendidos de uma vez.', '<b>Cardápio de Hoje</b>: lista do dia.') },
 { p: 'Painel do Garçom: como uso passo a passo?', k: 'painel garcom identifique se meus pedidos abertas fechadas canceladas todas sair do painel selecionar nome',
   r: O('Abra <b>Garçom</b>.', 'Em <b>Identifique-se</b> selecione seu nome.', 'Veja <b>Meus Pedidos</b> nas abas Abertas, Fechadas, Canceladas ou Todas.', 'Toque em uma comanda para lançar itens.', 'Para sair toque em sair do painel e confirme.') },
 { p: 'Cardápio do Dia: como monto e uso?', k: 'cardapio do dia montar escolher produtos hoje disponivel esgotado cozinha pdv lista dia',
   r: O('Abra <b>Cardápio do Dia</b>.', 'Marque os produtos que estão disponíveis hoje.', 'Salve. Produtos esgotados saem da lista.') + 'Os QR Codes das mesas mostram esse cardápio ao cliente.' },
 { p: 'QR Codes: como gero e imprimo passo a passo?', k: 'qr codes mesas gerar imprimir passo a passo cardapio cliente pedir pelo celular',
   r: O('Abra <b>QR Codes</b> (menu).', 'Escolha as mesas (ou todas).', 'Gere e imprima/compartilhe.', 'Cole o QR em cada mesa. O cliente aponta o celular e faz o pedido, que cai em <b>Aprovação de Pedidos</b>.') },
 { p: 'Pendências: tela e passo a passo completo', k: 'pendencias tela completo passo a passo cliente deve receber unir whatsapp cobrar total em aberto vencimento',
   r: O('Abra <b>Pendências</b> (ou <b>Clientes</b> para ver por cliente).', 'Veja o <b>Total em aberto</b> e os cartões por comanda.', 'Selecione as comandas e toque em <b>Receber</b>.', 'Informe valor e forma de pagamento.', 'Se quiser cobrar, use WhatsApp na tela.') },
 { p: 'Pix: como cadastro a chave do restaurante?', k: 'pix cadastrar chave restaurante tipo chave cpf cnpj email celular aleatoria nome recebedor cidade copia e cola exibir qr recibo',
   r: O('Abra <b>Configurações › Ajustes Gerais › Cadastrar PIX do Restaurante</b>.', 'Escolha o <b>Tipo da chave</b> (CPF/CNPJ, e-mail, celular ou aleatória).', 'Digite a <b>Chave PIX</b>.', 'Preencha <b>Nome do recebedor</b> e <b>Cidade</b>.', 'Ative <b>Exibir QR Code no Recibo</b> se desejar e salve.') },
 { p: 'Parcelas do crédito: como cadastro cada parcela?', k: 'parcelas credito cadastrar parcela numero parcelas taxa juros percentual sem juros habilitar divisao igual 48x',
   r: O('Abra <b>Parcelas</b> (Configurações).', 'Toque em <b>Nova Parcela</b>.', 'Informe o <b>Número de parcelas</b> (1x a 48x) e a <b>Taxa de juros (%)</b> (0 = sem juros).', 'Deixe <b>Habilitar esta parcela</b> ligada e salve.') + 'No fechamento, aparece o total com o percentual aplicado.' },
 { p: 'Comandas Arquivadas: o que são e como uso?', k: 'comandas arquivadas arquivo antigas consultar historico reabrir procurar',
   r: 'Guardam comandas antigas já encerradas. Abra <b>Relatórios › Comandas Arquivadas</b>, filtre por período/cliente e toque na comanda para ver itens e pagamentos.' }
]}
);
})();
