// ============================================================
// DETALHECOMANDA.JS — Completo (Cardápio do Dia, Filtro e Impressão)
// ============================================================

console.log('✔ DetalheComanda.js carregado');

if (!window.renderDetalheComanda) {
    window.comandaAtual = null;
    window.produtosCache = [];
    window.clientesCache = [];
    window.gruposModalCache = [];
    window.filtroGrupoModalAtual = '';
    window.pagamentosTemp = [];
    window.comandaOrigem = window.comandaOrigem || 'comandas';

    window.modoDivisao = 'item';
    window.partesDivisao = [];

    function formatarMesa(mesa) {
        if (!mesa) return '—';
        if (mesa === 'balcao') return 'Balcão';
        if (mesa === 'delivery') return 'Delivery';
        if (mesa === 'viagem') return 'Para Viagem';
        return 'Mesa ' + mesa;
    }

    function calcularTotais(c) {
        let subtotal = 0;
        const itens = window.normalizarArray(c && c.itens);
        itens.forEach(i => { 
            // Ignora itens que a cozinha marcou como faltando
            if (i.statusProducao !== 'faltou') {
                subtotal += Number(i.preco) * Number(i.quantidade); 
            }
        });
        
        let desconto = 0;
        if (c && c.desconto && c.desconto.tipo === 'porcentagem') desconto = subtotal * (Number(c.desconto.valor) / 100);
        else if (c && c.desconto && c.desconto.tipo === 'valor') desconto = Number(c.desconto.valor);
        desconto = Math.max(0, Math.min(desconto, subtotal));
        
        return { subtotal: subtotal, desconto: desconto, total: subtotal - desconto };
    }

    function iconeFormaPagamento(forma) {
        const map = {
            'dinheiro': '<i class="fas fa-money-bill-wave" style="color:#2e7d32; font-size:1.1rem;"></i>',
            'debito':   '<i class="fas fa-credit-card" style="color:#1976d2; font-size:1.1rem;"></i>',
            'credito':  '<i class="fas fa-credit-card" style="color:#C2185B; font-size:1.1rem;"></i>',
            'pix':      '<i class="fas fa-qrcode" style="color:#ff9800; font-size:1.1rem;"></i>'
        };
        return map[forma] || '<i class="fas fa-coins" style="color:#666; font-size:1.1rem;"></i>';
    }

    function nomeFormaPagamento(forma) {
        const map = { 'dinheiro': 'Dinheiro', 'debito': 'Débito', 'credito': 'Crédito', 'pix': 'PIX' };
        return map[forma] || forma;
    }

    window.formatarMesa = formatarMesa;
    window.calcularTotais = calcularTotais;

    function montarFaixaCorCaixa(corCaixa) {
        if (!corCaixa) return '';
        const hex = corCaixa.hex || '#666';
        const label = corCaixa.label || corCaixa.id || '—';
        return '<div class="faixa-cor-caixa" style="background:' + hex + ';color:#fff;' +
               'text-align:center;font-size:10px;font-weight:700;letter-spacing:0.5px;' +
               'padding:5px 8px;border-radius:6px;margin:-8px 8px 12px 8px;text-transform:uppercase;">' +
               label +
               '</div>';
    }

    window.renderDetalheComanda = function () {
        const id = window.comandaIdAtual;
        if (!id) return '<div class="app-bar"><h1>Comanda</h1></div><div class="content-area"><p class="empty-state">Nenhuma comanda selecionada</p></div>';

        const renderizar = function () {
            carregarDados(id).then(function () {
                const div = document.getElementById('detalhe-corpo');
                if (!div) return;
                try {
                    div.innerHTML = renderCorpo();

                    if (window.acaoPosComanda) {
                        const acao = window.acaoPosComanda;
                        window.acaoPosComanda = null;

                        setTimeout(() => {
                            if (acao === 'fechar' && typeof window.abrirModalFechamento === 'function') window.abrirModalFechamento();
                            else if (acao === 'dividir' && typeof window.abrirModalDividir === 'function') window.abrirModalDividir();
                            else if (acao === 'unir' && typeof window.abrirModalUnir === 'function') window.abrirModalUnir();
                        }, 150);
                    }
                } catch (e) {
                    div.innerHTML = '<div class="card" style="padding:20px;text-align:center;"><i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i><p>' + e.message + '</p></div>';
                }
            });
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(renderizar);
        else setTimeout(renderizar, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1 id="detalhe-titulo">Comanda</h1>',
            '    <div style="display:flex;gap:2px;">',
            '        <button class="icon-btn" onclick="editarComanda()" title="Editar"><i class="fas fa-pen"></i></button>',
            '    </div>',
            '</div>',
            '<div class="content-area" id="detalhe-corpo">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>',
            '<button class="fab" onclick="abrirSeletorProdutos()">+</button>'
        ].join('\n');
    };

    async function carregarDados(id) {
        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const encontrada = lista.find(c => String(c.id) === String(id)) || null;
            window.comandaAtual = encontrada ? window.normalizarComanda(encontrada) : null;
        } catch (e) { window.comandaAtual = null; }
        
        try {
            const todosProdutos = window.normalizarArray(await apiGet('produtos'));
            let configCardapioDia = await apiGet('cardapioDia');
            let selecionados = {};
            
            if (Array.isArray(configCardapioDia) && configCardapioDia.length > 0) {
                selecionados = configCardapioDia[0].selecionados || {};
            } else if (configCardapioDia && typeof configCardapioDia === 'object') {
                selecionados = configCardapioDia.selecionados || {};
            }

            window.produtosCache = todosProdutos.filter(p => {
                if (p.inativo === true) return false;
                if (p.acabouCozinha === true) return false; 
                if (selecionados[p.id] === true) return true;
                return false;
            });

        } catch (e) { window.produtosCache = []; }

        try { window.clientesCache = window.normalizarArray(await apiGet('clientes')); } catch (e) { window.clientesCache = []; }
    }

    async function salvarComanda() {
        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const idx = lista.findIndex(c => String(c.id) === String(window.comandaAtual.id));
            if (idx >= 0) lista[idx] = window.comandaAtual;
            else lista.push(window.comandaAtual);
            await apiSave('comandas', lista);
        } catch (e) { alert('Erro ao salvar: ' + e.message); }
    }

    function recalcularTotal() {
        if (!window.comandaAtual) return;
        const totais = calcularTotais(window.comandaAtual);
        window.comandaAtual.subtotal = totais.subtotal;
        window.comandaAtual.total = totais.total;
    }

    function renderCorpo() {
        if (!window.comandaAtual) return '<p class="empty-state">Comanda não encontrada</p>';
        const c = window.normalizarComanda(window.comandaAtual);
        const titulo = document.getElementById('detalhe-titulo');
        if (titulo) titulo.textContent = 'Comanda ' + (c.numero || '—');

        const itens = c.itens;
        const pagamentos = c.pagamentos || [];
        const totalItens = itens.length;
        const qtdTotalItens = itens.reduce((acc, i) => acc + Number(i.quantidade), 0);
        const totais = calcularTotais(c);
        const origem = window.comandaOrigem || 'comandas';

        const statusNorm = window.statusComandaNormalizado(c);
        const podeEditarItens = statusNorm === 'aberta' || statusNorm === 'delivery';
        const podeFechar = podeEditarItens && (origem === 'pdv' || origem === 'caixa');
        const podeReabrir = statusNorm === 'fechada' || statusNorm === 'cancelada';
        const ehPendencia = statusNorm === 'pendente';
        const temFiado = window.comandaTemFiado ? window.comandaTemFiado(c) : false;

        let itensHTML = '';
        if (totalItens === 0) {
            itensHTML = '<p class="empty-state" style="margin-top:20px;">Nenhum item adicionado</p>';
        } else {
            itensHTML = itens.map((item, idx) => {
                const sub = Number(item.preco) * Number(item.quantidade);
                const controles = podeEditarItens ? '<button class="btn-qtd" onclick="alterarQuantidade(' + idx + ', -1)">−</button><span class="item-comanda-qtd">' + item.quantidade + '</span><button class="btn-qtd" onclick="alterarQuantidade(' + idx + ', 1)">+</button>' : '<span class="item-comanda-qtd">' + item.quantidade + 'x</span>';
                const btnRemover = podeEditarItens ? '<button class="btn-limpar" onclick="removerItem(' + idx + ')" style="margin-left:8px;"><i class="fas fa-trash" style="font-size:0.9rem;color:#c62828;"></i></button>' : '';
                let infoPreco = formatMoney(item.preco) + ' cada';
                const badgeStatus = item.statusProducao === 'servido' ? ' <span style="background:#4caf50;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:8px;vertical-align:middle;margin-left:4px;">✓ Servido</span>' : '';
                const badgeFaltou = item.statusProducao === 'faltou' ? ' <span style="background:#c62828;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:8px;vertical-align:middle;margin-left:4px;">❌ Faltou</span>' : '';
                
                return '<div class="item-comanda"><div class="item-comanda-info"><div class="item-comanda-nome">' + (item.nome || '—') + badgeStatus + badgeFaltou + '</div><div class="item-comanda-preco">' + infoPreco + '</div></div><div class="item-comanda-controles">' + controles + '<span class="item-comanda-subtotal">' + formatMoney(sub) + '</span>' + btnRemover + '</div></div>';
            }).join('');
        }

        let resumoHTML = '<div class="card" style="margin-top:20px;"><div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.9rem;color:#555;"><span>Subtotal</span><span>' + formatMoney(totais.subtotal) + '</span></div>';
        if (totais.desconto > 0) {
            const descLabel = c.desconto && c.desconto.tipo === 'porcentagem' ? 'Desconto (' + c.desconto.valor + '%)' : 'Desconto';
            resumoHTML += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:0.9rem;color:#2e7d32;"><span>' + descLabel + '</span><span>- ' + formatMoney(totais.desconto) + '</span></div>';
        }
        resumoHTML += '<div style="display:flex;justify-content:space-between;padding:8px 0 0;border-top:1px solid #eee;margin-top:6px;"><strong>Total</strong><strong style="color:var(--primary-color);font-size:1.4rem;">' + formatMoney(totais.total) + '</strong></div></div>';

        if ((c.status === 'fechada' || c.status === 'pendente') && temFiado) {
            resumoHTML += '<div class="card" style="margin-top:12px;background:#fff3e0;border-left:4px solid #ff9800;"><div class="card-title" style="color:#e65100;margin-bottom:6px;"><i class="fas fa-clock"></i> PAGAMENTO PENDENTE (FIADO)</div><div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.9rem;"><span>Cliente</span><span><b>' + (c.cliente || '—') + '</b></span></div><div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.9rem;color:#e65100;"><span>Valor pendente</span><span><b>' + formatMoney(c.valorPendente || 0) + '</b></span></div></div>';
        }

        if ((c.status === 'fechada' || c.status === 'pendente') && pagamentos.length > 0) {
            resumoHTML += '<div class="card" style="margin-top:12px;background:#e8f5e9;"><div class="card-title" style="color:#2e7d32;margin-bottom:6px;">💳 Pagamentos Registrados</div>';
            pagamentos.forEach(p => {
                let desc = nomeFormaPagamento(p.forma);
                resumoHTML += '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.9rem;"><span>' + iconeFormaPagamento(p.forma) + ' ' + desc + '</span><span>' + formatMoney(p.valor) + '</span></div>' + (window.maquininhaTexto && p.maquininha && window.maquininhaTexto(p.maquininha) ? '<div style="font-size:0.75rem;color:#2e7d32;padding-bottom:3px;">✔ ' + window.maquininhaTexto(p.maquininha) + '</div>' : '');
            });
            if (c.troco && Number(c.troco) > 0) resumoHTML += '<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:0.9rem;color:#e65100;"><span>Troco</span><span>' + formatMoney(c.troco) + '</span></div>';
            resumoHTML += '</div>';
        }

        const garcomHTML = c.garcom ? '<div><strong>Garçom:</strong> ' + c.garcom + '</div>' : '';

        let botoesAcao = '';
        if (podeEditarItens) {
            const btnRecibo = (statusNorm === 'fechada') 
                ? '<button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'recibo\')"><i class="fas fa-receipt"></i> Recibo</button>' 
                : '';

            botoesAcao = '<div style="display:flex;gap:8px;margin-top:15px;">' +
                         '    <button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'comanda\')"><i class="fas fa-print"></i> Comanda</button>' +
                              btnRecibo +
                         '</div>';

            botoesAcao += '<div style="display:flex;gap:8px;margin-top:10px;">';
            botoesAcao += '    <button class="btn-outline" style="flex:1; border-color:#1976d2; color:#1976d2;" onclick="abrirModalDividir()"><i class="fas fa-users"></i> Dividir</button>';
            botoesAcao += '    <button class="btn-outline" style="flex:1; border-color:#1976d2; color:#1976d2;" onclick="abrirModalUnir()"><i class="fas fa-object-group"></i> Unir</button>';
            botoesAcao += '</div>';

            if (podeFechar) botoesAcao += '<button class="btn-primary" style="margin-top:15px; background:#2e7d32;" onclick="abrirModalFechamento()"><i class="fas fa-cash-register"></i> ' + (window.comandaAtual.aguardandoRecebimento ? 'Retomar recebimento (recibo em aberto)' : 'Receber / Fechar Comanda') + '</button>';
            botoesAcao += '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="cancelarComanda()"><i class="fas fa-ban"></i> Cancelar Comanda</button>';
        } else if (ehPendencia) {
            botoesAcao = '<div style="margin-top:15px;padding:12px;background:#fff8e1;border-left:4px solid #fbc02d;border-radius:8px;font-size:.85rem;color:#8d6e00;">⏳ Comanda em <b>Pendência</b> (fiado) — ' + formatMoney(c.valorPendente || 0) + ' a receber.</div>' +
                '<div style="display:flex;gap:8px;margin-top:10px;">' +
                '    <button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'comanda\')"><i class="fas fa-print"></i> Imprimir / ver comanda</button>' +
                '    <button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'recibo\')"><i class="fas fa-receipt"></i> Recibo</button>' +
                '</div>' +
                '<button class="btn-primary" style="margin-top:10px;background:#6a1b9a;width:100%;" onclick="reabrirPendenciaDetalhe()"><i class="fas fa-lock-open"></i> Reabrir comanda no caixa atual</button>' +
                '<button class="btn-primary" style="margin-top:10px;background:#2e7d32;width:100%;" onclick="navigateTo(\'pendencias\')"><i class="fas fa-hand-holding-usd"></i> Receber / unir na tela Pendências</button>';
        } else if (podeReabrir) {
            const btnRecibo = (statusNorm === 'fechada') 
                ? '<button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'recibo\')"><i class="fas fa-receipt"></i> Recibo</button>' 
                : '';

            botoesAcao = '<div style="display:flex;gap:8px;margin-top:15px;">' +
                         '    <button class="btn-outline" style="flex:1;" onclick="abrirPreviewImpressao(\'comanda\')"><i class="fas fa-print"></i> Comanda</button>' +
                              btnRecibo +
                         '</div>';
            if (temFiado) botoesAcao += '<button class="btn-primary" style="width:100%;margin-top:15px;background:#4caf50;" onclick="navigateTo(\'pendencias\')"><i class="fas fa-money-bill-wave"></i> Receber pendência</button>';
            botoesAcao += '<button class="btn-primary" style="width:100%;margin-top:15px; background:#1976d2;" onclick="reativarComanda()"><i class="fas fa-redo"></i> Reativar Comanda</button>';
        }

        let infoClienteHTML = '';
        if (podeEditarItens) {
            infoClienteHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>Cliente:</strong> ${c.cliente || 'Não informado'}</div>
                    <button class="btn-limpar" onclick="abrirModalEditarCliente()" style="color:var(--primary-color);"><i class="fas fa-user-edit"></i> Editar</button>
                </div>
            `;
        } else {
            infoClienteHTML = `<div><strong>Cliente:</strong> ${c.cliente || 'Não informado'}</div>`;
        }

        let cabecalhoResumo = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background:#fff; padding:12px; border-radius:8px; border-left:4px solid var(--primary-color); box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; color:#888;">Comanda</div>
                    <div style="font-size:1.2rem; font-weight:800; color:#333;">#${c.numero}</div>
                </div>
                <div style="background:#fff; padding:12px; border-radius:8px; border-left:4px solid #1976d2; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; color:#888;">Cliente</div>
                    <div style="font-size:1rem; font-weight:700; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.cliente || '—'}">${c.cliente || '—'}</div>
                </div>
                <div style="background:#fff; padding:12px; border-radius:8px; border-left:4px solid #ff9800; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; color:#888;">Qtd. Itens</div>
                    <div style="font-size:1.2rem; font-weight:800; color:#333;">${qtdTotalItens}</div>
                </div>
                <div style="background:#fff; padding:12px; border-radius:8px; border-left:4px solid #2e7d32; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div style="font-size:0.75rem; color:#888;">Total</div>
                    <div style="font-size:1.2rem; font-weight:800; color:#2e7d32;">${formatMoney(totais.total)}</div>
                </div>
            </div>
        `;

        return [
            '<div style="padding:15px 16px;">',
            cabecalhoResumo,
            '    <div class="card">',
            (function () { const g = window.obterCorCaixaSincrona ? window.obterCorCaixaSincrona(c) : null; return g ? '<div style="background:' + g.hex + ';color:#fff;font-weight:700;border-radius:8px;padding:6px 10px;margin-bottom:8px;display:flex;align-items:center;gap:8px;"><i class="fas fa-users"></i> ' + (g.label || g.id) + '</div>' : ''; })(),
            '        <div><strong>Mesa:</strong> ' + formatarMesa(c.mesa) + '</div>',
            infoClienteHTML,
            garcomHTML,
            '        <div><strong>Aberta em:</strong> ' + (c.dataAbertura || '') + '</div>',
            '        <div><strong>Status:</strong> ' + c.status.toUpperCase() + '</div>',
            '    </div>',
            '    <h3 style="margin:15px 0 10px;">Itens (' + totalItens + ')</h3>',
            itensHTML,
            resumoHTML,
            botoesAcao,
            '</div>'
        ].join('\n');
    }

    // ============================================================
    // AÇÕES DE EDIÇÃO DE ITENS
    // ============================================================
    window.renderCorpo = renderCorpo;

    window.alterarQuantidade = async function (idx, delta) {
        if (!window.comandaAtual || !window.comandaAtual.itens[idx]) return;
        window.comandaAtual.itens[idx].quantidade += delta;
        if (window.comandaAtual.itens[idx].quantidade <= 0) window.comandaAtual.itens.splice(idx, 1);
        recalcularTotal(); await salvarComanda();
        const div = document.getElementById('detalhe-corpo');
        if (div) div.innerHTML = renderCorpo();
    };

    window.removerItem = async function (idx) {
        if (!window.comandaAtual || !window.comandaAtual.itens[idx]) return;
        if (!await window.confirmar('Remover este item da comanda?')) return;
        window.comandaAtual.itens.splice(idx, 1);
        recalcularTotal(); await salvarComanda();
        const div = document.getElementById('detalhe-corpo');
        if (div) div.innerHTML = renderCorpo();
    };

    // ============================================================
    // MODAL DE ADICIONAR ITEM (Com Filtro de Categoria e Busca)
    // ============================================================
    window.abrirSeletorProdutos = async function () {
        if (!window.comandaAtual) return;
        const st = window.statusComandaNormalizado(window.comandaAtual);
        if (st !== 'aberta' && st !== 'delivery') { alert('Comanda não está aberta.'); return; }
        if (!window.produtosCache || window.produtosCache.length === 0) { alert('Nenhum produto disponível no cardápio hoje.'); return; }

        const grupos = window.normalizarArray(await apiGet('grupos'));
        window.gruposModalCache = grupos.filter(g => g.inativo !== true);
        window.filtroGrupoModalAtual = '';

        const m = document.createElement("div");
        m.id = "modal-produtos"; 
        m.className = "modal-overlay"; 
        m.style.zIndex = '99999';
        
        let chipsGrupos = '<button class="chip-grupo ativo" onclick="filtrarPorGrupoModal(\'\', this)">Todos</button>';
        window.gruposModalCache.forEach(g => {
            chipsGrupos += `<button class="chip-grupo" onclick="filtrarPorGrupoModal('${g.id}', this)">${g.nome}</button>`;
        });

        m.innerHTML = `
            <div class="modal-content" style="max-width:500px; max-height:85vh; display:flex; flex-direction:column;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom:1px solid #eee;">
                    <strong>Adicionar Produto</strong>
                    <button class="btn-limpar" onclick="fecharModalProdutos()"><i class="fas fa-xmark"></i></button>
                </div>
                
                <div style="padding: 10px 15px; border-bottom: 1px solid #eee; background:#f9f9f9;">
                    <div class="input-busca" style="margin: 0 0 10px 0;">
                        <input type="text" placeholder="Pesquisar produto..." id="busca-produto-modal" oninput="filtrarProdutosModal()">
                        <button class="btn-limpar" onclick="document.getElementById('busca-produto-modal').value=''; filtrarProdutosModal();"><i class="fas fa-xmark"></i></button>
                    </div>
                    <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;" id="chips-grupos-modal">
                        ${chipsGrupos}
                    </div>
                </div>

                <div class="modal-body" id="lista-produtos-modal" style="overflow-y:auto; padding:0;">
                    ${renderizarItensProdutoModal(window.produtosCache)}
                </div>
            </div>
        `;
        document.body.appendChild(m);
    };

    window.fecharModalProdutos = function () { const m = document.getElementById("modal-produtos"); if (m) m.remove(); };

    window.filtrarPorGrupoModal = function(grupoId, btnClicado) {
        document.querySelectorAll('#chips-grupos-modal .chip-grupo').forEach(btn => btn.classList.remove('ativo'));
        if (btnClicado) btnClicado.classList.add('ativo');
        window.filtroGrupoModalAtual = grupoId;
        filtrarProdutosModal();
    };

    function renderizarItensProdutoModal(lista) {
        if (lista.length === 0) return '<p style="text-align:center; padding:20px; color:#999;">Nenhum produto encontrado.</p>';
        // Sempre A-Z na lista de escolha (cópia: não mexe no cache nem nos itens da comanda, que seguem a ordem de inserção)
        lista = lista.slice().sort(function (a, b) { return String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base', numeric: true }); });
        return lista.map(function (p) {
            const preco = p.promocaoAtiva && Number(p.precoPromocional) > 0 ? Number(p.precoPromocional) : Number(p.valorVenda || 0);
            return '<div class="lista-item" onclick="adicionarItem(\'' + p.id + '\')" style="border-bottom:1px solid #f0f0f0; padding:12px 15px;">' +
                   '<div class="lista-item-info"><div class="lista-item-titulo" style="font-weight:600;">' + p.nome + '</div>' +
                   '<div class="lista-item-sub" style="color:var(--primary-color); font-weight:bold;">' + formatMoney(preco) + '</div></div>' +
                   '<i class="fas fa-plus-circle" style="color:var(--primary-color); font-size:1.2rem;"></i></div>';
        }).join('');
    }

    window.filtrarProdutosModal = function() {
        const termo = (document.getElementById('busca-produto-modal') || {}).value || '';
        const grupoId = window.filtroGrupoModalAtual || '';
        
        let filtrados = window.produtosCache.filter(p => String(p.nome).toLowerCase().includes(termo.toLowerCase()));
        
        if (grupoId !== '') {
            filtrados = filtrados.filter(p => String(p.grupo) === String(grupoId));
        }
        
        const container = document.getElementById('lista-produtos-modal');
        if (container) container.innerHTML = renderizarItensProdutoModal(filtrados);
    };

    window.adicionarItem = async function (produtoId) {
        const produto = window.produtosCache.find(p => String(p.id) === String(produtoId));
        if (!produto) return;
        const temPromo = produto.promocaoAtiva && Number(produto.precoPromocional) > 0;
        const preco = temPromo ? Number(produto.precoPromocional) : Number(produto.valorVenda || 0);

        if (!window.comandaAtual.itens) window.comandaAtual.itens = [];
        const ex = window.comandaAtual.itens.find(i => String(i.produtoId) === String(produtoId) && Number(i.preco) === preco);

        if (ex) ex.quantidade++;
        else {
            window.comandaAtual.itens.push({
                produtoId: produto.id, nome: produto.nome, preco: preco, quantidade: 1,
                statusProducao: 'pendente', localProducao: produto.localProducao || 'cozinha',
                grupo: produto.grupo || ''
            });
        }
        recalcularTotal(); await salvarComanda();
        const div = document.getElementById('detalhe-corpo');
        if (div) div.innerHTML = renderCorpo();
        fecharModalProdutos();
    };

    // ============================================================
    // EDIÇÃO E CADASTRO DE CLIENTE
    // ============================================================
    window.abrirModalEditarCliente = function () {
        if (!window.comandaAtual) return;
        const c = window.comandaAtual;

        let opcoesClientes = '<option value="">-- Novo Cliente / Digitar nome --</option>';
        window.clientesCache.forEach(cli => {
            const sel = String(cli.id) === String(c.clienteId) ? ' selected' : '';
            opcoesClientes += `<option value="${cli.id}"${sel}>${cli.nome} ${cli.cpf ? ' - ' + cli.cpf : ''}</option>`;
        });

        const modal = document.createElement('div');
        modal.id = 'modal-editar-cliente';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalEditarCliente(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:400px;">' +
            '    <div class="modal-header" style="background:var(--primary-color);color:#fff;">' +
            '        <strong>Editar Cliente</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalEditarCliente()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body">' +
            '        <div class="field">' +
            '            <label style="display:flex; justify-content:space-between; align-items:center;">' +
            '                <span>Vincular cliente existente</span>' +
            '                <button class="btn-limpar" onclick="abrirModalNovoCliente()" style="font-size:0.75rem;color:var(--primary-color);font-weight:600;text-decoration:underline;"><i class="fas fa-plus"></i> Novo</button>' +
            '            </label>' +
            '            <input type="text" id="edit-cli-busca" placeholder="Toque na seta ou digite para buscar" value="' + String(c.clienteId ? (c.cliente || '') : '').replace(/"/g, '&quot;') + '">' +
            '            <input type="hidden" id="edit-cli-select" value="' + (c.clienteId || '') + '">' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>Nome do cliente</label>' +
            '            <input type="text" id="edit-cli-nome" value="' + (c.cliente || '') + '" placeholder="Digite o nome">' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>Telefone / WhatsApp</label>' +
            '            <input type="text" id="edit-cli-telefone" value="' + (c.clienteTelefone || '') + '" placeholder="(00) 00000-0000">' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>CPF/CNPJ</label>' +
            '            <input type="text" id="edit-cli-cpf" value="' + (c.clienteCpf || '') + '" placeholder="Opcional">' +
            '        </div>' +
            '        <button class="btn-primary" onclick="salvarClienteComanda()">Salvar Cliente</button>' +
            '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalEditarCliente()">Cancelar</button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        const busca = document.getElementById('edit-cli-busca');
        if (window.clientePicker && busca) {
            window.clientePicker.anexar(busca, { onSelect: function (cli) {
                document.getElementById('edit-cli-select').value = cli ? cli.id : '';
                if (cli) selecionarClienteEdicao();
            } });
        }
    };

    window.fecharModalEditarCliente = function () {
        const m = document.getElementById('modal-editar-cliente');
        if (m) m.remove();
    };

    window.selecionarClienteEdicao = function () {
        const sel = document.getElementById('edit-cli-select');
        if (!sel || !sel.value) return;
        const cli = window.clientesCache.find(x => String(x.id) === String(sel.value));
        if (cli) {
            document.getElementById('edit-cli-nome').value = cli.nome || '';
            document.getElementById('edit-cli-telefone').value = cli.telefone || '';
            document.getElementById('edit-cli-cpf').value = cli.cpf || '';
        }
    };

    window.salvarClienteComanda = async function () {
        const sel = document.getElementById('edit-cli-select');
        const nome = document.getElementById('edit-cli-nome').value.trim();
        const telefone = document.getElementById('edit-cli-telefone').value.trim();
        const cpf = document.getElementById('edit-cli-cpf').value.trim();

        if (!nome) { alert('Informe o nome do cliente'); return; }

        try {
            let cliId = sel ? sel.value : '';

            if (!cliId && nome !== '') {
                const novaLista = window.clientesCache;
                const novoCli = {
                    id: Date.now(),
                    nome: nome,
                    telefone: telefone,
                    cpf: cpf
                };
                novaLista.push(novoCli);
                await apiSave('clientes', novaLista);
                cliId = novoCli.id;
                window.clientesCache = novaLista;
            } else if (cliId) {
                const idx = window.clientesCache.findIndex(x => String(x.id) === String(cliId));
                if (idx >= 0) {
                    window.clientesCache[idx].nome = nome;
                    window.clientesCache[idx].telefone = telefone;
                    window.clientesCache[idx].cpf = cpf;
                    await apiSave('clientes', window.clientesCache);
                }
            }

            window.comandaAtual.cliente = nome;
            window.comandaAtual.clienteId = cliId || null;
            window.comandaAtual.clienteTelefone = telefone;
            window.comandaAtual.clienteCpf = cpf;

            await salvarComanda();
            fecharModalEditarCliente();
            document.getElementById('detalhe-corpo').innerHTML = renderCorpo();
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Cliente atualizado!');
        } catch (e) {
            alert('Erro ao salvar cliente: ' + e.message);
        }
    };

    window.abrirModalNovoCliente = function () {
        const modalAntigo = document.getElementById('modal-editar-cliente');
        if (modalAntigo) modalAntigo.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-novo-cliente';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalNovoCliente(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:400px;">' +
            '    <div class="modal-header" style="background:var(--primary-color);color:#fff;">' +
            '        <strong>Cadastrar Novo Cliente</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalNovoCliente()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body">' +
            '        <div class="field">' +
            '            <label>Nome do cliente *</label>' +
            '            <input type="text" id="novo-cli-nome" placeholder="Digite o nome completo">' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>Telefone / WhatsApp</label>' +
            '            <input type="text" id="novo-cli-telefone" placeholder="(00) 00000-0000">' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>CPF/CNPJ</label>' +
            '            <input type="text" id="novo-cli-cpf" placeholder="Opcional">' +
            '        </div>' +
            '        <button class="btn-primary" onclick="salvarNovoCliente()">Cadastrar e Vincular</button>' +
            '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalNovoCliente(); abrirModalEditarCliente();">Voltar</button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
    };

    window.fecharModalNovoCliente = function () {
        const m = document.getElementById('modal-novo-cliente');
        if (m) m.remove();
    };

    window.salvarNovoCliente = async function () {
        const nome = document.getElementById('novo-cli-nome').value.trim();
        const telefone = document.getElementById('novo-cli-telefone').value.trim();
        const cpf = document.getElementById('novo-cli-cpf').value.trim();

        if (!nome) { alert('Informe o nome do cliente'); return; }

        try {
            const novoCli = {
                id: Date.now(),
                nome: nome,
                telefone: telefone,
                cpf: cpf
            };
            
            window.clientesCache.push(novoCli);
            await apiSave('clientes', window.clientesCache);

            window.comandaAtual.cliente = nome;
            window.comandaAtual.clienteId = novoCli.id;
            window.comandaAtual.clienteTelefone = telefone;
            window.comandaAtual.clienteCpf = cpf;

            await salvarComanda();
            
            fecharModalNovoCliente();
            document.getElementById('detalhe-corpo').innerHTML = renderCorpo();
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Cliente cadastrado e vinculado!');
        } catch (e) {
            alert('Erro ao cadastrar cliente: ' + e.message);
        }
    };

    // ============================================================
    // UNIR COMANDAS
    // ============================================================
    window.abrirModalUnir = async function () {
        if (!window.comandaAtual) return;

        const lista = window.normalizarArray(await apiGet('comandas'));

        let caixaAtual = null;
        try {
            const caixaBruto = await apiGet('caixaAtual');
            caixaAtual = Array.isArray(caixaBruto)
                ? (caixaBruto[0] || null)
                : (caixaBruto && caixaBruto.status ? caixaBruto : null);
        } catch (e) { caixaAtual = null; }

        const c1 = window.comandaAtual;

        const candidatas = lista.filter(function (x) {
            if (String(x.id) === String(c1.id)) return false;
            if (!window.comandaEstaAtiva(x)) return false;
            if (!window.comandaPertenceAoCaixa(x, caixaAtual ? caixaAtual.id : c1.caixaId)) return false;
            if (!window.mesmoCliente(c1, x)) return false;
            return true;
        });

        if (candidatas.length === 0) {
            alert('Não há outras comandas ativas do mesmo cliente e do mesmo caixa aberto para unir.');
            return;
        }

        let listaHTML = '';
        candidatas.forEach(c => {
            const qtdItens = window.normalizarArray(c.itens).reduce((acc, i) => acc + Number(i.quantidade), 0);
            listaHTML += `
                <label style="display:flex; align-items:center; padding:12px; border-bottom:1px solid #eee; cursor:pointer;">
                    <input type="checkbox" class="unir-checkbox" value="${c.id}" style="width:20px; height:20px; margin-right:15px;">
                    <div style="flex:1;">
                        <div style="font-weight:bold; color:#333;">Comanda #${c.numero} <span style="font-weight:normal; font-size:0.85rem; color:#666;">(${c.cliente || 'Sem nome'})</span></div>
                        <div style="font-size:0.8rem; color:#666;">${formatarMesa(c.mesa)} | ${qtdItens} itens | ${formatMoney(c.total)}</div>
                    </div>
                </label>
            `;
        });

        const modal = document.createElement('div');
        modal.id = 'modal-unir-comanda';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalUnir(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:400px;">' +
            '    <div class="modal-header" style="background:#1976d2;color:#fff;">' +
            '        <strong>Unir Comandas</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalUnir()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding:0;">' +
            '        <div style="padding:15px; background:#f5f5f5; border-bottom:1px solid #ddd; font-size:0.85rem; color:#555;">' +
            '            Selecione abaixo as comandas que deseja unir à <b>Comanda #' + c1.numero + '</b>. Os itens serão somados na atual e a outra comanda será <b>excluída</b>.' +
            '        </div>' +
            '        <div style="max-height:300px; overflow-y:auto;">' + listaHTML + '</div>' +
            '        <div style="padding:15px;">' +
            '            <button class="btn-primary" style="background:#1976d2;" onclick="confirmarUniao()">Unir e Excluir</button>' +
            '            <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalUnir()">Cancelar</button>' +
            '        </div>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
    };

    window.fecharModalUnir = function () {
        const m = document.getElementById('modal-unir-comanda');
        if (m) m.remove();
    };

    window.confirmarUniao = async function () {
        const checkboxes = document.querySelectorAll('.unir-checkbox:checked');
        if (checkboxes.length === 0) {
            alert('Selecione pelo menos uma comanda para unir.');
            return;
        }

        if (!await window.confirmar('Confirmar a união das comandas selecionadas? A comanda atual receberá os itens e as selecionadas serão EXCLUÍDAS.')) return;

        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const idxPrincipal = lista.findIndex(x => String(x.id) === String(window.comandaAtual.id));
            if (idxPrincipal < 0) return;

            const principal = lista[idxPrincipal];
            const idsParaExcluir = [];

            checkboxes.forEach(chk => {
                const idSecundaria = chk.value;
                const idxSec = lista.findIndex(x => String(x.id) === String(idSecundaria));
                if (idxSec >= 0) {
                    const secundaria = lista[idxSec];
                    const novosItens = window.normalizarArray(secundaria.itens);

                    novosItens.forEach(item => {
                        const existente = principal.itens.find(i => i.produtoId === item.produtoId && Number(i.preco) === Number(item.preco));
                        if (existente) existente.quantidade += Number(item.quantidade);
                        else principal.itens.push(item);
                    });

                    idsParaExcluir.push(idSecundaria);
                }
            });

            let subtotal = 0;
            principal.itens.forEach(i => subtotal += Number(i.preco) * Number(i.quantidade));
            principal.subtotal = subtotal;
            principal.total = subtotal;

            const novaLista = lista
                .filter(x => idsParaExcluir.indexOf(String(x.id)) === -1)
                .map(x => String(x.id) === String(principal.id) ? principal : x);

            await apiSave('comandas', novaLista);

            window.comandaAtual = principal;
            fecharModalUnir();
            document.getElementById('detalhe-corpo').innerHTML = renderCorpo();
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Comandas unidas e a(s) outra(s) excluída(s)!');
        } catch (e) {
            alert('Erro ao unir: ' + e.message);
        }
    };

    // ============================================================
    // DIVIDIR COMANDAS
    // ============================================================
    window.abrirModalDividir = function () {
        if (!window.comandaAtual) return;

        window.partesDivisao = [];
        window.modoDivisao = 'item';

        const modal = document.createElement('div');
        modal.id = 'modal-dividir-comanda';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalDividir(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:600px; max-height:90vh; display:flex; flex-direction:column;">' +
            '    <div class="modal-header" style="background:#1976d2;color:#fff; flex-shrink:0;">' +
            '        <strong>Dividir Comanda</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalDividir()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="flex:1; overflow-y:auto;">' +
            '        <div style="display:flex; gap:8px; margin-bottom:20px;">' +
            '            <button class="btn-outline" style="flex:1; border-color:#1976d2; color:#1976d2;" onclick="mudarModoDivisao(\'item\')" id="btn-modo-item">Por Item</button>' +
            '            <button class="btn-outline" style="flex:1; border-color:#1976d2; color:#1976d2;" onclick="mudarModoDivisao(\'valor\')" id="btn-modo-valor">Por Valor</button>' +
            '            <button class="btn-outline" style="flex:1; border-color:#1976d2; color:#1976d2;" onclick="mudarModoDivisao(\'item_valor\')" id="btn-modo-item_valor">Item / Valor</button>' +
            '        </div>' +
            '        <div id="div-partes-container"></div>' +
            '    </div>' +
            '    <div style="padding:15px; background:#fff; border-top:1px solid #ddd; flex-shrink:0;">' +
            '        <button class="btn-primary" style="background:#1976d2;" onclick="confirmarDivisaoItens()">Criar Comandas</button>' +
            '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalDividir()">Cancelar</button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        mudarModoDivisao('item');
    };

    window.fecharModalDividir = function () {
        const m = document.getElementById('modal-dividir-comanda');
        if (m) m.remove();
        window.partesDivisao = [];
    };

    window.mudarModoDivisao = function (modo) {
        window.modoDivisao = modo;
        window.partesDivisao = [];

        const btnItem = document.getElementById('btn-modo-item');
        const btnValor = document.getElementById('btn-modo-valor');
        const btnItemValor = document.getElementById('btn-modo-item_valor');

        [btnItem, btnValor, btnItemValor].forEach(btn => {
            if (btn) {
                btn.style.background = 'transparent';
                btn.style.color = '#1976d2';
            }
        });

        if (modo === 'item') {
            if (btnItem) { btnItem.style.background = '#1976d2'; btnItem.style.color = '#fff'; }
            window.partesDivisao = [{ id: Date.now(), nome: 'Parte 1', itens: {} }];
        } else if (modo === 'valor') {
            if (btnValor) { btnValor.style.background = '#1976d2'; btnValor.style.color = '#fff'; }
        } else if (modo === 'item_valor') {
            if (btnItemValor) { btnItemValor.style.background = '#1976d2'; btnItemValor.style.color = '#fff'; }
            window.partesDivisao = [
                { id: Date.now(), nome: 'Parte 1', itens: [] },
                { id: Date.now() + 1, nome: 'Parte 2', itens: [] }
            ];
        }

        renderPartesDivisao();
    };

    window.adicionarParteDivisao = function () {
        const index = window.partesDivisao.length + 1;
        if (window.modoDivisao === 'item') {
            window.partesDivisao.push({ id: Date.now(), nome: 'Parte ' + index, itens: {} });
        } else if (window.modoDivisao === 'item_valor') {
            window.partesDivisao.push({ id: Date.now(), nome: 'Parte ' + index, itens: [] });
        }
        renderPartesDivisao();
    };

    window.removerParteDivisao = function (id) {
        window.partesDivisao = window.partesDivisao.filter(p => p.id !== id);
        renderPartesDivisao();
    };

    window.atualizarNomeParte = function (id, novoNome) {
        const parte = window.partesDivisao.find(p => p.id === id);
        if (parte) parte.nome = novoNome;
    };

    window.alterarQtdItemParte = function (parteId, itemIdx, delta) {
        const parte = window.partesDivisao.find(p => p.id === parteId);
        if (!parte) return;

        const itemOriginal = window.comandaAtual.itens[itemIdx];
        const maxQtd = itemOriginal.quantidade;

        let qtdAtual = parte.itens[itemIdx] || 0;
        let novaQtd = qtdAtual + delta;

        if (novaQtd < 0) novaQtd = 0;
        if (novaQtd > maxQtd) {
            alert('A quantidade não pode ser maior que o total de itens na comanda original.');
            return;
        }

        let somaOutrasPartes = 0;
        window.partesDivisao.forEach(p => {
            if (p.id !== parteId && p.itens) {
                somaOutrasPartes += (p.itens[itemIdx] || 0);
            }
        });

        if (somaOutrasPartes + novaQtd > maxQtd) {
            alert('Você já distribuiu todos os itens deste tipo para outras partes.');
            return;
        }

        if (novaQtd === 0) delete parte.itens[itemIdx];
        else parte.itens[itemIdx] = novaQtd;

        renderPartesDivisao();
    };

    window.adicionarItemParteValor = function (parteId) {
        const parte = window.partesDivisao.find(p => p.id === parteId);
        if (!parte) return;
        parte.itens.push({ itemIdx: 0, valor: 0 });
        renderPartesDivisao();
    };

    window.removerItemParteValor = function (parteId, index) {
        const parte = window.partesDivisao.find(p => p.id === parteId);
        if (!parte) return;
        parte.itens.splice(index, 1);
        renderPartesDivisao();
    };

    window.atualizarItemParteValor = function (parteId, index, campo, valor) {
        const parte = window.partesDivisao.find(p => p.id === parteId);
        if (!parte || !parte.itens[index]) return;

        if (campo === 'itemIdx') {
            parte.itens[index].itemIdx = parseInt(valor);
        } else if (campo === 'valor') {
            const novoValor = parseFloat(valor) || 0;
            parte.itens[index].valor = novoValor;

            const itemIdx = parte.itens[index].itemIdx;
            const itemOriginal = window.comandaAtual.itens[itemIdx];
            const valorTotalItem = Number(itemOriginal.preco) * Number(itemOriginal.quantidade);

            let valorDistribuidoOutras = 0;
            window.partesDivisao.forEach(p => {
                if (p.id !== parteId && p.itens) {
                    p.itens.forEach(linha => {
                        if (linha.itemIdx === itemIdx) {
                            valorDistribuidoOutras += Number(linha.valor || 0);
                        }
                    });
                }
            });

            const sobra = valorTotalItem - valorDistribuidoOutras - novoValor;

            if (sobra > 0.01) {
                const outraParte = window.partesDivisao.find(p => p.id !== parteId);
                if (outraParte) {
                    if (!outraParte.itens) outraParte.itens = [];

                    let linhaExistente = outraParte.itens.find(l => l.itemIdx === itemIdx);

                    if (linhaExistente) {
                        linhaExistente.valor = sobra;
                    } else {
                        outraParte.itens.push({ itemIdx: itemIdx, valor: sobra });
                    }
                }
            }

            renderPartesDivisao();
        }
    };

    window.renderPartesDivisao = function () {
        const container = document.getElementById('div-partes-container');
        if (!container) return;

        let html = '';

        if (window.modoDivisao === 'valor') {
            html += `
                <div style="text-align:center; padding:20px; background:#f9f9f9; border-radius:8px;">
                    <div style="font-weight:bold; color:#333; margin-bottom:10px;">Divisão Igualitária (Por Valor)</div>
                    <p style="font-size:0.85rem; color:#666; margin-bottom:15px;">Informe a quantidade de pessoas para dividir o total de <b>${formatMoney(window.comandaAtual.total)}</b>.</p>
                    <div class="field" style="max-width:200px; margin:0 auto 15px;">
                        <input type="number" id="div-pessoas-igual" value="2" min="2" oninput="prepararDivisaoIgualitaria()" style="text-align:center; font-size:1.2rem; padding:10px;">
                    </div>
                    <button class="btn-outline" style="border-color:#1976d2; color:#1976d2;" onclick="prepararDivisaoIgualitaria()">Gerar Partes</button>
                </div>
                <div id="lista-valores-iguais" style="margin-top:20px;"></div>
            `;
            container.innerHTML = html;
            if (window.partesDivisao.length > 0) prepararDivisaoIgualitaria();
            return;
        }

        if (window.modoDivisao === 'item') {
            window.partesDivisao.forEach((parte) => {
                let totalParte = 0;
                Object.keys(parte.itens).forEach(idx => {
                    const qtd = parte.itens[idx];
                    totalParte += qtd * Number(window.comandaAtual.itens[idx].preco);
                });

                html += `
                    <div class="card" style="margin-bottom:15px; border-left:4px solid #1976d2; background:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <input type="text" value="${parte.nome}" onchange="atualizarNomeParte(${parte.id}, this.value)" style="flex:1; border:1px solid #ccc; border-radius:6px; padding:8px; font-weight:bold; font-size:0.95rem;">
                            <button class="btn-limpar" onclick="removerParteDivisao(${parte.id})" style="color:#c62828; margin-left:10px;"><i class="fas fa-trash"></i></button>
                        </div>
                        <div style="font-size:0.85rem; color:#666; margin-bottom:10px;">Selecione os itens:</div>
                `;

                window.comandaAtual.itens.forEach((item, idx) => {
                    const qtdNaParte = parte.itens[idx] || 0;
                    const preco = Number(item.preco);

                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px dashed #eee;">
                            <div style="flex:1;">
                                <div style="font-size:0.9rem; color:#333;">${item.nome}</div>
                                <div style="font-size:0.75rem; color:#888;">${formatMoney(preco)} (Total Cmd: ${item.quantidade})</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px;">
                                <button class="btn-qtd" style="width:26px;height:26px;font-size:1rem;" onclick="alterarQtdItemParte(${parte.id}, ${idx}, -1)">−</button>
                                <span style="font-weight:bold; width:20px; text-align:center;">${qtdNaParte}</span>
                                <button class="btn-qtd" style="width:26px;height:26px;font-size:1rem;" onclick="alterarQtdItemParte(${parte.id}, ${idx}, 1)">+</button>
                            </div>
                        </div>
                    `;
                });

                html += `
                        <div style="text-align:right; margin-top:10px; font-weight:bold; color:#1976d2;">
                            Total da Parte: ${formatMoney(totalParte)}
                        </div>
                    </div>
                `;
            });

            html += `<button class="btn-outline" style="width:100%; margin-top:15px; border-color:#1976d2; color:#1976d2;" onclick="adicionarParteDivisao()"><i class="fas fa-plus"></i> Adicionar Nova Parte</button>`;
        } else if (window.modoDivisao === 'item_valor') {
            window.partesDivisao.forEach((parte) => {
                let totalParte = 0;
                if (parte.itens) {
                    parte.itens.forEach(linha => {
                        totalParte += Number(linha.valor || 0);
                    });
                }

                html += `
                    <div class="card" style="margin-bottom:15px; border-left:4px solid #1976d2; background:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <input type="text" value="${parte.nome}" onchange="atualizarNomeParte(${parte.id}, this.value)" style="flex:1; border:1px solid #ccc; border-radius:6px; padding:8px; font-weight:bold; font-size:0.95rem;">
                            <button class="btn-limpar" onclick="removerParteDivisao(${parte.id})" style="color:#c62828; margin-left:10px;"><i class="fas fa-trash"></i></button>
                        </div>
                `;

                if (!parte.itens || parte.itens.length === 0) {
                    html += `<div style="text-align:center; font-size:0.85rem; color:#999; padding:10px 0;">Nenhum item adicionado a esta parte.</div>`;
                } else {
                    parte.itens.forEach((linha, i) => {
                        let opcoesItens = '';
                        window.comandaAtual.itens.forEach((it, idx) => {
                            const sel = (linha.itemIdx === idx) ? ' selected' : '';
                            opcoesItens += `<option value="${idx}"${sel}>${it.nome} (Total: ${formatMoney(it.preco * it.quantidade)})</option>`;
                        });

                        html += `
                            <div style="display:flex; gap:8px; align-items:flex-end; margin-bottom:10px; padding-bottom:10px; border-bottom:1px dashed #eee;">
                                <div style="flex:1;">
                                    <label style="font-size:0.75rem; color:#666; display:block; margin-bottom:4px;">Item</label>
                                    <select onchange="atualizarItemParteValor(${parte.id}, ${i}, 'itemIdx', this.value)" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:0.85rem;">
                                        ${opcoesItens}
                                    </select>
                                </div>
                                <div style="width:100px;">
                                    <label style="font-size:0.75rem; color:#666; display:block; margin-bottom:4px;">Valor (R$)</label>
                                    <input type="number" step="0.01" value="${linha.valor || 0}" onchange="atualizarItemParteValor(${parte.id}, ${i}, 'valor', this.value)" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:0.85rem;">
                                </div>
                                <button class="btn-limpar" onclick="removerItemParteValor(${parte.id}, ${i})" style="color:#c62828; padding:8px; margin-bottom:2px;"><i class="fas fa-trash"></i></button>
                            </div>
                        `;
                    });
                }

                html += `
                        <button class="btn-outline" style="width:100%; padding:8px; font-size:0.85rem; border-color:#1976d2; color:#1976d2;" onclick="adicionarItemParteValor(${parte.id})"><i class="fas fa-plus"></i> Adicionar Item/Valor</button>
                        <div style="text-align:right; margin-top:10px; font-weight:bold; color:#1976d2;">
                            Total da Parte: ${formatMoney(totalParte)}
                        </div>
                    </div>
                `;
            });

            html += `<button class="btn-outline" style="width:100%; margin-top:15px; border-color:#1976d2; color:#1976d2;" onclick="adicionarParteDivisao()"><i class="fas fa-plus"></i> Adicionar Nova Parte</button>`;
        }

        container.innerHTML = html;
    };

    window.prepararDivisaoIgualitaria = function () {
        const input = document.getElementById('div-pessoas-igual');
        if (!input) return;
        const pessoas = parseInt(input.value) || 2;
        const total = window.comandaAtual.total || 0;
        const valorPorPessoa = total / pessoas;

        window.partesDivisao = [];
        for (let i = 1; i <= pessoas; i++) {
            window.partesDivisao.push({
                id: Date.now() + i,
                nome: 'Parte ' + i,
                valorManual: valorPorPessoa
            });
        }

        const listaDiv = document.getElementById('lista-valores-iguais');
        if (listaDiv) {
            let htmlLista = '';
            window.partesDivisao.forEach(p => {
                htmlLista += `
                    <div class="card" style="margin-bottom:10px; padding:12px; background:#fff; border-left:4px solid #1976d2;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <input type="text" value="${p.nome}" onchange="atualizarNomeParte(${p.id}, this.value)" style="flex:1; border:none; background:transparent; font-weight:bold; font-size:1rem; color:#333;">
                            <div style="font-weight:bold; color:#1976d2; font-size:1.1rem;">${formatMoney(p.valorManual)}</div>
                        </div>
                    </div>
                `;
            });
            listaDiv.innerHTML = htmlLista;
        }
    };

    window.confirmarDivisaoItens = async function () {
        if (window.modoDivisao === 'item') {
            for (let idx = 0; idx < window.comandaAtual.itens.length; idx++) {
                let totalDistribuido = 0;
                window.partesDivisao.forEach(p => {
                    totalDistribuido += (p.itens[idx] || 0);
                });
                if (totalDistribuido !== window.comandaAtual.itens[idx].quantidade) {
                    alert(`Atenção: O item "${window.comandaAtual.itens[idx].nome}" não foi totalmente distribuído. (Distribuído: ${totalDistribuido} de ${window.comandaAtual.itens[idx].quantidade})`);
                    return;
                }
            }
        } else if (window.modoDivisao === 'item_valor') {
            const valoresDistribuidosPorItem = {};
            window.comandaAtual.itens.forEach((_, idx) => { valoresDistribuidosPorItem[idx] = 0; });

            window.partesDivisao.forEach(p => {
                if (p.itens) {
                    p.itens.forEach(linha => {
                        valoresDistribuidosPorItem[linha.itemIdx] += Number(linha.valor || 0);
                    });
                }
            });

            for (let idx = 0; idx < window.comandaAtual.itens.length; idx++) {
                const item = window.comandaAtual.itens[idx];
                const valorTotalItem = Number(item.preco) * Number(item.quantidade);
                const distribuido = valoresDistribuidosPorItem[idx];

                if (Math.abs(distribuido - valorTotalItem) > 0.01) {
                    alert(`Atenção: O item "${item.nome}" não foi totalmente dividido em valores. (Distribuído: ${formatMoney(distribuido)} de ${formatMoney(valorTotalItem)})`);
                    return;
                }
            }
        }

        if (!await window.confirmar('Confirmar a divisão e criar as novas comandas?')) return;

        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const idxPrincipal = lista.findIndex(x => String(x.id) === String(window.comandaAtual.id));
            if (idxPrincipal < 0) return;

            const principal = lista[idxPrincipal];

            principal.status = 'cancelada';
            principal.dataFechamento = new Date().toLocaleString('pt-BR');
            principal.motivoCancelamento = 'Dividida em ' + window.partesDivisao.length + ' partes';

            window.partesDivisao.forEach((parte, index) => {
                const agora = new Date();
                const data = agora.toLocaleDateString('pt-BR') + ' ' + String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');

                let subtotalParte = 0;
                const itensParte = [];

                if (window.modoDivisao === 'item') {
                    Object.keys(parte.itens).forEach(idxStr => {
                        const idx = parseInt(idxStr);
                        const qtd = parte.itens[idx];
                        const itemOriginal = principal.itens[idx];
                        subtotalParte += qtd * Number(itemOriginal.preco);
                        itensParte.push({ ...itemOriginal, quantidade: qtd });
                    });
                } else if (window.modoDivisao === 'valor') {
                    subtotalParte = parte.valorManual;
                    itensParte.push({
                        produtoId: 'divisao',
                        nome: 'Divisão de Conta (Ref. Cmd ' + principal.numero + ')',
                        preco: parte.valorManual,
                        quantidade: 1,
                        statusProducao: 'servido'
                    });
                } else if (window.modoDivisao === 'item_valor') {
                    const itensAgrupados = {};

                    if (parte.itens) {
                        parte.itens.forEach(linha => {
                            if (linha.valor > 0) {
                                const itemOriginal = principal.itens[linha.itemIdx];
                                const chave = itemOriginal.nome;

                                if (!itensAgrupados[chave]) {
                                    itensAgrupados[chave] = {
                                        produtoId: itemOriginal.produtoId,
                                        nome: 'Fração: ' + itemOriginal.nome,
                                        preco: 0,
                                        quantidade: 1,
                                        statusProducao: 'servido'
                                    };
                                }
                                itensAgrupados[chave].preco += linha.valor;
                                subtotalParte += linha.valor;
                            }
                        });
                    }

                    Object.values(itensAgrupados).forEach(i => itensParte.push(i));
                }

                if (itensParte.length > 0 || subtotalParte > 0) {
                    const novaComanda = {
                        id: Date.now() + index,
                        numero: String(principal.numero) + '-' + (index + 1),
                        mesa: principal.mesa,
                        dataAbertura: data,
                        cliente: parte.nome,
                        clienteId: principal.clienteId,
                        status: 'aberta',
                        tipo: principal.tipo,
                        subtotal: subtotalParte,
                        total: subtotalParte,
                        itens: itensParte,
                        caixaId: principal.caixaId,
                        corGrupo: principal.corGrupo
                    };
                    lista.push(novaComanda);
                }
            });

            await apiSave('comandas', lista);
            fecharModalDividir();
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Comanda dividida com sucesso!');
            window.navigateTo('comandas');
        } catch (e) {
            alert('Erro ao dividir: ' + e.message);
        }
    };

    // ============================================================
    // MODAL DE PAGAMENTO MULTIPLO (FECHAMENTO)
    // ============================================================
    window.abrirModalFechamento = async function () {
        if (!window.comandaAtual) return;
        if (window.comandaAtual.aguardandoRecebimento && window.comandaAtual.recebimentoTemp) {   // retomar recibo em aberto
            window.pagamentosTemp = window.comandaAtual.recebimentoTemp.pagamentos || [];
            window.recebimentoAtual = window.comandaAtual.recebimentoTemp;
            return window.abrirPreviewImpressao('recibo', { aberto: true });
        }

        let config = {};
        try { const arr = window.normalizarArray(await apiGet('configuracoes')); config = arr[0] || {}; } catch (e) {}

        const formasAtivas = {
            dinheiro: config.pagDinheiro !== false,
            debito: config.pagDebito !== false,
            credito: config.pagCredito !== false,
            pix: config.pagPix !== false
        };

        const totais = calcularTotais(window.comandaAtual);
        const itens = window.comandaAtual.itens || [];

        window.pagamentosTemp = [];

        let formaInicial = 'dinheiro';
        if (!formasAtivas.dinheiro) {
            if (formasAtivas.debito) formaInicial = 'debito';
            else if (formasAtivas.credito) formaInicial = 'credito';
            else if (formasAtivas.pix) formaInicial = 'pix';
        }
        // Forma de pagamento padrão (Configurações › Fechamento): vem pré-selecionada, mas pode ser trocada à vontade
        const mapaPadrao = { 'dinheiro': 'dinheiro', 'débito': 'debito', 'debito': 'debito', 'crédito': 'credito', 'credito': 'credito', 'pix': 'pix' };
        const padrao = mapaPadrao[String(config.formaPagamentoPadrao || '').trim().toLowerCase()];
        if (padrao && formasAtivas[padrao]) formaInicial = padrao;

        // pagamentos parciais já recebidos (ex.: comanda de pendência reaberta) entram na conta
        window.pagamentosTemp = window.normalizarArray(window.comandaAtual.pagamentos).map(p => Object.assign({}, p, { anterior: true }));
        const jaPago = window.pagamentosTemp.reduce((a, p) => a + Number(p.valor || 0), 0);
        if (jaPago < totais.total - 0.009 || !window.pagamentosTemp.length) window.pagamentosTemp.push({ forma: formaInicial, valor: Math.round((totais.total - jaPago) * 100) / 100 });

        function renderPagamentosHTML() {
            let totalPago = window.pagamentosTemp.reduce((acc, p) => acc + Number(p.valor), 0);
            let falta = totais.total - totalPago;
            let troco = falta < 0 ? Math.abs(falta) : 0;

            let listaHTML = window.pagamentosTemp.map((p, idx) => {
                return '<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px dashed #eee;">' +
                       '<div style="display:flex; align-items:center; gap:8px;">' +
                       iconeFormaPagamento(p.forma) +
                       '<span style="font-weight:500; font-size:0.9rem;">' + nomeFormaPagamento(p.forma) + (p.maquininha && window.maquininhaTexto(p.maquininha) ? '<br><small style="color:#2e7d32;font-weight:400;">✔ ' + window.maquininhaTexto(p.maquininha) + '</small>' : '') + '</span>' +
                       '</div>' +
                       '<div style="display:flex; align-items:center; gap:12px;">' +
                       '<span style="font-weight:bold; color:#333;">' + formatMoney(p.valor) + '</span>' +
                       '<button class="btn-limpar" onclick="editarPagamentoTemp(' + idx + ')" style="color:#1976d2; padding:4px;" title="Editar valor"><i class="fas fa-edit" style="font-size:0.9rem;"></i></button>' +
                       '<button class="btn-limpar" onclick="removerPagamentoTemp(' + idx + ')" style="color:#c62828; padding:4px;" title="Excluir"><i class="fas fa-trash" style="font-size:0.9rem;"></i></button>' +
                       '</div></div>';
            }).join('');

            return '<div style="margin-bottom:15px;">' + (listaHTML || '<p style="text-align:center;color:#999;font-size:0.9rem;">Nenhum pagamento adicionado.</p>') + '</div>' +
                   '<div style="padding:12px; background:#f5f5f5; border-radius:8px;">' +
                   '<div style="display:flex;justify-content:space-between;font-size:0.9rem;color:#666;margin-bottom:4px;"><span>Total da Comanda:</span><span>' + formatMoney(totais.total) + '</span></div>' +
                   '<div style="display:flex;justify-content:space-between;font-size:0.9rem;color:#666;margin-bottom:4px;"><span>Total Pago:</span><span>' + formatMoney(totalPago) + '</span></div>' +
                   (falta > 0 ? '<div style="display:flex;justify-content:space-between;font-weight:bold;color:#c62828;margin-top:8px;font-size:1rem;"><span>Falta:</span><span>' + formatMoney(falta) + '</span></div>' : '') +
                   (troco > 0 ? '<div style="display:flex;justify-content:space-between;font-weight:bold;color:#2e7d32;margin-top:8px;font-size:1rem;"><span>Troco:</span><span>' + formatMoney(troco) + '</span></div>' : '') +
                   '</div>';
        }

        function atualizarDOM() {
            const div = document.getElementById('pagamentos-lista-container');
            if (div) div.innerHTML = renderPagamentosHTML();
        }

        window.atualizarListaPagamentos = atualizarDOM;

        const anterior = document.getElementById('modal-fechamento');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-fechamento';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';

        let optsFormas = '';
        if (formasAtivas.dinheiro) optsFormas += '<option value="dinheiro">💵 Dinheiro</option>';
        if (formasAtivas.debito)   optsFormas += '<option value="debito">💳 Débito</option>';
        if (formasAtivas.credito)  optsFormas += '<option value="credito">💳 Crédito</option>';
        if (formasAtivas.pix)      optsFormas += '<option value="pix">📱 PIX</option>';

        modal.innerHTML =
            '<div class="modal-content" style="max-width:450px;">' +
            '    <div class="modal-header" style="background:#2e7d32;color:#fff;">' +
            '        <strong>Fechamento de Comanda</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalFechamento()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body">' +
            '        <div style="margin-bottom:15px;">' +
            '            <div style="font-weight:bold; margin-bottom:8px; color:#333;">Resumo dos Itens:</div>' +
            '            <div style="max-height:100px; overflow-y:auto; background:#fafafa; padding:10px; border-radius:8px; font-size:0.85rem; color:#555;">' +
                         itens.map(i => '<div style="display:flex; justify-content:space-between; padding:2px 0;"><span>' + i.quantidade + 'x ' + i.nome + '</span><span>' + formatMoney(i.preco * i.quantidade) + '</span></div>').join('') +
            '            </div>' +
            '        </div>' +

            '        <div id="pagamentos-lista-container">' + renderPagamentosHTML() + '</div>' +

            '        <div style="margin-top:20px; padding-top:15px; border-top:1px dashed #ccc;">' +
            '            <div class="field">' +
            '                <label>Nova Forma de Pagamento</label>' +
            '                <select id="pg-forma" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px;">' + optsFormas + '</select>' +
            '            </div>' +
            '            <div class="field">' +
            '                <label>Valor (R$)</label>' +
            '                <input type="number" step="0.01" id="pg-valor" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:1.1rem;">' +
            '            </div>' +
            '            <button class="btn-outline" style="width:100%; border-color:#1976d2; color:#1976d2;" onclick="adicionarPagamentoTemp()"><i class="fas fa-plus"></i> Adicionar Pagamento</button>' +
            '        </div>' +

            '        <div style="margin-top:20px;">' +
            '            <label style="display:flex; justify-content:space-between; align-items:center; background:#fff3e0; padding:12px; border-radius:8px; cursor:pointer; border:1px solid #ffe0b2;">' +
            '                <div style="display:flex; align-items:center; gap:8px; color:#e65100;">' +
            '                    <i class="fas fa-clock"></i>' +
            '                    <div style="font-weight:bold;">Deixar Fiado (Pendente)</div>' +
            '                </div>' +
            '                <input type="checkbox" id="pg-fiado" onchange="fiadoMarcado(this.checked)" style="width:20px; height:20px; accent-color:#e65100;">' +
            '            </label>' +
            '        </div>' +

            '        <button class="btn-primary" style="background:#2e7d32; margin-top:20px; padding:14px;" onclick="confirmarFechamentoCompleto()">' +
            '            <i class="fas fa-receipt"></i> Confirmar e gerar recibo' +
            '        </button>' +
            '        <button class="btn-outline" style="width:100%; margin-top:10px;" onclick="fecharModalFechamento()">Cancelar</button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);

        const inputValor = document.getElementById('pg-valor');
        if (inputValor) inputValor.value = totais.total.toFixed(2);
        const selForma = document.getElementById('pg-forma');
        if (selForma && Array.prototype.some.call(selForma.options, function (o) { return o.value === formaInicial; })) selForma.value = formaInicial;

        // Fiado apenas para cliente cadastrado + pendências anteriores somadas ao total geral
        const pa = await window.pendenciasAnteriores(window.comandaAtual);
        window.__pendAnt = pa;
        const chk = document.getElementById('pg-fiado');
        const rotulo = chk && chk.closest('label');
        if (chk && !pa.cliente && rotulo) {
            rotulo.insertAdjacentHTML('afterend', '<div style="font-size:.75rem;color:#e65100;margin-top:6px;">Fiado exige cliente cadastrado — ao marcar, você escolhe ou cadastra o cliente.</div>');
        }
        if (pa.valor > 0 && rotulo) {
            rotulo.insertAdjacentHTML('beforebegin',
                '<div style="margin-bottom:10px;padding:10px 12px;background:#fff3e0;border-radius:8px;border:1px solid #ffe0b2;font-size:.85rem;">' +
                '<div style="display:flex;justify-content:space-between;"><span>Pendências anteriores (' + pa.qtd + ' comanda(s))</span><b style="color:#e65100;">' + formatMoney(pa.valor) + '</b></div>' +
                '<div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Esta comanda</span><b>' + formatMoney(totais.total) + '</b></div>' +
                '<div style="display:flex;justify-content:space-between;margin-top:6px;padding-top:6px;border-top:1px dashed #e0b080;font-weight:700;"><span>TOTAL GERAL com pendências</span><span style="color:#bf360c;">' + formatMoney(pa.valor + totais.total) + '</span></div></div>');
        }
    };

    window.fecharModalFechamento = function () {
        const m = document.getElementById('modal-fechamento');
        if (m) m.remove();
    };

    // Cobra na maquininha (se configurada) e devolve os dados do cartão; null = cancelado.
    window.cobrarCartaoSeNecessario = async function (forma, valor) {
        if ((forma !== 'debito' && forma !== 'credito' && forma !== 'pix') || !window.maquininhaCobrar) return {};
        const c = window.comandaAtual || {};
        // Com maquininhas cadastradas, pergunta em qual delas o valor será recebido (respeitando as do garçom)
        const maq = await window.maquininhaEscolher(forma, c.garcom);
        if (maq === null) return null;       // cancelou
        if (maq === false) return {};        // nenhuma cadastrada: comportamento simples
        const base = { maquinaId: maq.id, maquinaNome: maq.nome || '' };
        if (forma === 'pix') return { maquininha: Object.assign({ provider: maq.provider }, base) };   // PIX: só identifica a máquina
        const r = await window.maquininhaCobrar({ valor: valor, forma: forma, ref: String(c.id || ''), descricao: 'Comanda ' + (c.numero || c.nome || ''), maquina: maq });
        if (!r) return null;
        return { maquininha: Object.assign({ provider: r.provider, nsu: r.nsu, autorizacao: r.autorizacao, bandeira: r.bandeira, ultimos4: r.ultimos4, parcelas: r.parcelas, idTransacao: r.idTransacao }, base) };
    };

    window.adicionarPagamentoTemp = async function () {
        const forma = document.getElementById('pg-forma').value;
        const valor = parseFloat(document.getElementById('pg-valor').value) || 0;
        if (!forma || valor <= 0) { alert('Informe um valor válido maior que zero.'); return; }

        const extra = await window.cobrarCartaoSeNecessario(forma, valor);
        if (extra === null) return;
        window.pagamentosTemp.push(Object.assign({ forma: forma, valor: valor }, extra));
        document.getElementById('pg-valor').value = '';

        if (typeof window.atualizarListaPagamentos === 'function') {
            window.atualizarListaPagamentos();
        }
    };

    window.removerPagamentoTemp = function (idx) {
        window.pagamentosTemp.splice(idx, 1);
        if (typeof window.atualizarListaPagamentos === 'function') {
            window.atualizarListaPagamentos();
        }
    };

    window.editarPagamentoTemp = function (idx) {
        const p = window.pagamentosTemp[idx];
        if (!p) return;
        if (p.maquininha && (p.maquininha.nsu || p.maquininha.idTransacao || p.maquininha.autorizacao)) { window.avisar('Pagamento já aprovado na maquininha: não é possível alterar. Exclua e cobre novamente.'); return; }
        const antigo = document.getElementById('modal-edit-pag'); if (antigo) antigo.remove();

        const totais = calcularTotais(window.comandaAtual);
        const outros = window.pagamentosTemp.reduce(function (a, x, i) { return i === idx ? a : a + Number(x.valor); }, 0);
        const restante = Math.max(0, totais.total - outros);
        const formas = [['dinheiro', 'Dinheiro', 'fa-money-bill-wave'], ['debito', 'Débito', 'fa-credit-card'], ['credito', 'Crédito', 'fa-credit-card'], ['pix', 'PIX', 'fa-qrcode']];
        window._editPagForma = p.forma;

        const m = document.createElement('div');
        m.id = 'modal-edit-pag'; m.className = 'modal-overlay';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;padding:16px;';
        let chips = formas.map(function (f) {
            const ativo = f[0] === p.forma;
            return '<button type="button" class="ep-forma" data-forma="' + f[0] + '" style="flex:1 1 45%;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 8px;border-radius:12px;border:2px solid ' + (ativo ? 'var(--primary-color,#C2185B)' : '#e0e0e0') + ';background:' + (ativo ? '#fce4ec' : '#fff') + ';color:' + (ativo ? 'var(--primary-color,#C2185B)' : '#555') + ';font-weight:600;font-size:.95rem;">' +
                '<i class="fas ' + f[2] + '"></i>' + f[1] + '</button>';
        }).join('');
        m.innerHTML =
            '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '  <div style="background:var(--primary-color,#C2185B);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;">' +
            '     <strong><i class="fas fa-pen"></i> Editar pagamento</strong>' +
            '     <button type="button" id="ep-x" style="background:none;border:none;color:#fff;font-size:1.2rem;"><i class="fas fa-xmark"></i></button></div>' +
            '  <div style="padding:16px;">' +
            '     <div style="font-size:.75rem;color:#666;font-weight:600;margin-bottom:6px;">FORMA DE PAGAMENTO</div>' +
            '     <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">' + chips + '</div>' +
            '     <div style="font-size:.75rem;color:#666;font-weight:600;margin-bottom:6px;">VALOR (R$)</div>' +
            '     <input type="number" inputmode="decimal" step="0.01" min="0.01" id="ep-valor" value="' + Number(p.valor).toFixed(2) + '" style="width:100%;box-sizing:border-box;font-size:1.4rem;font-weight:700;padding:12px;border:2px solid #ccc;border-radius:12px;text-align:right;">' +
            '     <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:.8rem;color:#666;">' +
            '        <span>Total da comanda: <b>' + formatMoney(totais.total) + '</b></span>' +
            '        <button type="button" id="ep-resto" style="border:1px solid var(--primary-color,#C2185B);background:#fff;color:var(--primary-color,#C2185B);border-radius:16px;padding:4px 10px;font-weight:600;">Restante ' + formatMoney(restante) + '</button></div>' +
            '     <div id="ep-erro" style="color:#c62828;font-size:.85rem;min-height:18px;margin-top:6px;"></div>' +
            '     <div style="display:flex;gap:10px;margin-top:8px;">' +
            '        <button type="button" id="ep-cancel" class="btn-outline" style="flex:1;">Cancelar</button>' +
            '        <button type="button" id="ep-ok" class="btn-primary" style="flex:1;"><i class="fas fa-check"></i> Salvar</button></div>' +
            '  </div></div>';
        document.body.appendChild(m);

        const fechar = function () { m.remove(); };
        m.querySelectorAll('.ep-forma').forEach(function (b) {
            b.onclick = function () {
                window._editPagForma = b.getAttribute('data-forma');
                m.querySelectorAll('.ep-forma').forEach(function (x) {
                    const on = x === b;
                    x.style.borderColor = on ? 'var(--primary-color,#C2185B)' : '#e0e0e0';
                    x.style.background = on ? '#fce4ec' : '#fff';
                    x.style.color = on ? 'var(--primary-color,#C2185B)' : '#555';
                });
            };
        });
        document.getElementById('ep-x').onclick = fechar;
        document.getElementById('ep-cancel').onclick = fechar;
        document.getElementById('ep-resto').onclick = function () { document.getElementById('ep-valor').value = restante.toFixed(2); };
        const salvar = function () {
            const v = parseFloat(String(document.getElementById('ep-valor').value).replace(',', '.'));
            if (isNaN(v) || v <= 0) { document.getElementById('ep-erro').textContent = 'Informe um valor maior que zero.'; return; }
            if (window.pagamentosTemp[idx].forma !== window._editPagForma) delete window.pagamentosTemp[idx].maquininha;   // trocou a forma: escolhe a máquina de novo
            window.pagamentosTemp[idx].forma = window._editPagForma;
            window.pagamentosTemp[idx].valor = Math.round(v * 100) / 100;
            fechar();
            if (typeof window.atualizarListaPagamentos === 'function') window.atualizarListaPagamentos();
        };
        document.getElementById('ep-ok').onclick = salvar;
        document.getElementById('ep-valor').onkeydown = function (e) { if (e.key === 'Enter') salvar(); };
        setTimeout(function () { const i = document.getElementById('ep-valor'); if (i) { i.focus(); i.select(); } }, 50);
    };

    /** Cliente CADASTRADO ligado à comanda (por id ou nome), ou null. Fiado só vale para eles. */
    window.clienteCadastradoDaComanda = async function (c) {
        try {
            const clientes = window.normalizarArray(await apiGet('clientes'));
            const nome = String(c.cliente || '').trim().toLowerCase();
            return clientes.find(function (x) { return (c.clienteId && String(x.id) === String(c.clienteId)) || (nome && String(x.nome || '').trim().toLowerCase() === nome); }) || null;
        } catch (e) { return null; }
    };
    /** Soma das pendências anteriores (outras comandas, de qualquer caixa) do cliente da comanda. */
    window.pendenciasAnteriores = async function (c) {
        const cli = await window.clienteCadastradoDaComanda(c);
        if (!cli) return { cliente: null, valor: 0, qtd: 0 };
        let valor = 0, qtd = 0;
        try {
            window.normalizarArray(await apiGet('comandas')).forEach(function (o) {
                if (String(o.id) === String(c.id)) return;
                if (!(o.pagamentoPendente === true && Number(o.valorPendente || 0) > 0.009)) return;
                const mesmo = (o.clienteId && String(o.clienteId) === String(cli.id)) ||
                    (o.cliente && String(o.cliente).trim().toLowerCase() === String(cli.nome || '').trim().toLowerCase());
                if (mesmo) { valor += Number(o.valorPendente); qtd++; }
            });
        } catch (e) {}
        return { cliente: cli, valor: valor, qtd: qtd };
    };

    window.fiadoMarcado = async function (on) {
        if (!on) return;
        if (!(window.__pendAnt && window.__pendAnt.cliente)) {
            const chk = document.getElementById('pg-fiado'); if (chk) chk.checked = false;
            window.abrirVinculoClienteFiado(async function () {
                window.__pendAnt = await window.pendenciasAnteriores(window.comandaAtual);
                const c2 = document.getElementById('pg-fiado'); if (c2) c2.checked = !!window.__pendAnt.cliente;
                window.fiadoMarcado(true);
            });
            return;
        }
        const tot = calcularTotais(window.comandaAtual).total;
        const soma = window.pagamentosTemp.reduce((a, p) => a + Number(p.valor), 0);
        if (soma >= tot - 0.009) window.pagamentosTemp = window.pagamentosTemp.filter(function (p) { return p.anterior; });   // tudo vira pendência (mantém o já recebido)
        if (window.atualizarListaPagamentos) window.atualizarListaPagamentos();
    };

    /** Escolher um cliente cadastrado ou cadastrar um novo (obrigatório para fiado). */
    window.abrirVinculoClienteFiado = async function (depois) {
        const clientes = window.normalizarArray(await apiGet('clientes')).sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
        window.__vincDepois = depois; window.__vincClientes = clientes;
        const old = document.getElementById('modal-vinc-cli'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'modal-vinc-cli'; m.className = 'modal-overlay'; m.style.zIndex = '250000';
        m.innerHTML = '<div class="modal-content" style="max-width:380px;border-radius:16px;overflow:hidden;max-height:90vh;display:flex;flex-direction:column;">' +
            '<div class="modal-header" style="background:#e65100;color:#fff;display:flex;justify-content:space-between;align-items:center;"><strong><i class="fas fa-user-check"></i> Cliente do fiado</strong>' +
            '<button class="btn-limpar" onclick="document.getElementById(\'modal-vinc-cli\').remove()" style="color:#fff;"><i class="fas fa-xmark"></i></button></div>' +
            '<div class="modal-body" style="overflow-y:auto;"><div style="font-size:.82rem;color:#666;margin-bottom:8px;">Fiado só para cliente cadastrado. Escolha um cliente ou cadastre agora.</div>' +
            '<input type="text" id="vinc-busca" placeholder="Pesquisar cliente" oninput="vincFiltrar()" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;">' +
            '<div id="vinc-lista" style="margin:8px 0 14px;max-height:30vh;overflow-y:auto;"></div>' +
            '<div style="border-top:1px dashed #ddd;padding-top:12px;"><div style="font-weight:700;color:#C2185B;margin-bottom:6px;"><i class="fas fa-user-plus"></i> Cadastrar novo cliente</div>' +
            '<input type="text" id="vinc-nome" placeholder="Nome *" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:6px;">' +
            '<input type="tel" id="vinc-tel" placeholder="Telefone / WhatsApp com DDD" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:8px;margin-bottom:8px;">' +
            '<button class="btn-primary" style="width:100%;" onclick="vincCadastrar()"><i class="fas fa-save"></i> Cadastrar e usar</button></div></div></div>';
        document.body.appendChild(m);
        window.vincFiltrar();
    };
    window.vincFiltrar = function () {
        const t = (document.getElementById('vinc-busca') || {}).value || '';
        const q = t.trim().toLowerCase();
        const l = (window.__vincClientes || []).filter(function (c) { return !q || String(c.nome || '').toLowerCase().indexOf(q) >= 0 || String(c.telefone || '').indexOf(q) >= 0; }).slice(0, 40);
        document.getElementById('vinc-lista').innerHTML = l.length ? l.map(function (c) {
            return '<button type="button" class="btn-outline" style="width:100%;text-align:left;margin-bottom:6px;" onclick="vincEscolher(' + JSON.stringify(String(c.id)).replace(/"/g, '&quot;') + ')"><b>' + String(c.nome || '').replace(/</g, '&lt;') + '</b>' + (c.telefone ? ' · ' + String(c.telefone).replace(/</g, '&lt;') : '') + '</button>';
        }).join('') : '<div style="color:#999;font-size:.85rem;padding:6px;">Nenhum cliente encontrado.</div>';
    };
    async function vincAplicar(cli) {
        window.comandaAtual.cliente = cli.nome; window.comandaAtual.clienteId = cli.id;
        await salvarComanda();
        const m = document.getElementById('modal-vinc-cli'); if (m) m.remove();
        const cb = window.__vincDepois; window.__vincDepois = null;
        if (cb) cb();
    }
    window.vincEscolher = function (id) {
        const cli = (window.__vincClientes || []).find(function (c) { return String(c.id) === String(id); });
        if (cli) vincAplicar(cli);
    };
    window.vincCadastrar = async function () {
        const nome = (document.getElementById('vinc-nome').value || '').trim();
        const tel = (document.getElementById('vinc-tel').value || '').trim();
        if (!nome) { await window.avisar('Informe o nome do cliente.'); return; }
        const lista = window.normalizarArray(await apiGet('clientes'));
        const novo = { id: Date.now(), nome: nome, telefone: tel, enderecos: [], dataCadastro: new Date().toLocaleDateString('pt-BR') };
        lista.push(novo);
        await apiSave('clientes', lista);
        vincAplicar(novo);
    };

    // Etapa 1: confirma os pagamentos informados e gera o RECIBO EM ABERTO (consumo + QR/PIX).
    window.confirmarFechamentoCompleto = async function () {
        if (!window.comandaAtual) return;

        const totais = calcularTotais(window.comandaAtual);
        const isFiado = document.getElementById('pg-fiado').checked;
        if (!isFiado) {   // cartão pré-preenchido ainda sem cobrança na maquininha
            for (const pg of window.pagamentosTemp) {
                if ((pg.forma === 'debito' || pg.forma === 'credito' || pg.forma === 'pix') && !pg.maquininha && !pg.anterior) {
                    const ex = await window.cobrarCartaoSeNecessario(pg.forma, Number(pg.valor));
                    if (ex === null) return;
                    Object.assign(pg, ex);
                }
            }
            if (window.atualizarListaPagamentos) window.atualizarListaPagamentos();
        }
        // Fiado: se os pagamentos informados já cobrem tudo, não há o que deixar pendente → todo o valor fica pendente.
        if (isFiado && window.pagamentosTemp.reduce((acc, p) => acc + Number(p.valor), 0) >= totais.total - 0.009) window.pagamentosTemp = window.pagamentosTemp.filter(function (p) { return p.anterior; });
        const totalPago = window.pagamentosTemp.reduce((acc, p) => acc + Number(p.valor), 0);
        const falta = totais.total - totalPago;
        const troco = falta < 0 ? Math.abs(falta) : 0;

        if (isFiado && !(window.__pendAnt && window.__pendAnt.cliente)) { window.abrirVinculoClienteFiado(function () { window.confirmarFechamentoCompleto(); }); return; }
        if (isFiado) {
            const cli = window.__pendAnt.cliente;
            const pend = falta > 0 ? falta : totais.total;
            if (!await window.confirmar('Enviar ' + formatMoney(pend) + ' de ' + cli.nome + ' para PENDÊNCIAS?\n\nA venda não será fechada e nenhum recibo será gerado.', { titulo: 'Deixar fiado', ok: 'Enviar para pendências' })) return;
            const c = window.comandaAtual;
            c.status = 'pendente';
            c.clienteId = cli.id; c.cliente = cli.nome;
            c.pagamentos = window.pagamentosTemp;          // pagamentos parciais já recebidos
            c.troco = 0;
            c.pagamentoPendente = true;
            c.valorPendente = pend;
            c.dataPendencia = new Date().toLocaleString('pt-BR');
            delete c.aguardandoRecebimento; delete c.recebimentoTemp;
            recalcularTotal();
            await salvarComanda();
            fecharModalFechamento();
            if (typeof window.mostrarToast === 'function') window.mostrarToast('⏳ Enviado para Pendências');
            window.navigateTo(window.comandaOrigem === 'caixa' ? 'caixa' : (window.comandaOrigem || 'pdv'));
            return;
        }
        if (!isFiado && falta > 0.01) {
            alert('Ainda falta ' + formatMoney(falta) + ' para completar o pagamento. Adicione outro pagamento ou marque como Fiado.');
            return;
        }
        if (!await window.confirmar('Confirmar o recebimento de ' + formatMoney(totais.total) + (isFiado ? ' (com saldo pendente / fiado)' : '') + ' e gerar o recibo em aberto?', { titulo: 'Confirmar recebimento', ok: 'Gerar recibo' })) return;

        window.recebimentoAtual = { troco: troco, falta: falta > 0 ? falta : 0, fiado: isFiado };
        window.comandaAtual.aguardandoRecebimento = true;
        window.comandaAtual.recebimentoTemp = { pagamentos: window.pagamentosTemp, troco: troco, falta: falta > 0 ? falta : 0, fiado: isFiado };
        await salvarComanda();
        fecharModalFechamento();
        await window.abrirPreviewImpressao('recibo', { aberto: true });
    };

    // Etapa 2: pagamento recebido → fecha a comanda e libera o recibo final (pago / pendente).
    window.finalizarRecebimento = async function () {
        const c = window.comandaAtual;
        if (!c) return;
        const r = window.recebimentoAtual || c.recebimentoTemp;
        if (!r) return;
        if (!await window.confirmar('Confirma que o pagamento foi recebido? A comanda será fechada.', { titulo: 'Fechar comanda', ok: 'Fechar comanda' })) return;

        if (r.fiado) { const cli = await window.clienteCadastradoDaComanda(c); if (!cli) { await window.avisar('Fiado só é permitido para cliente cadastrado.'); return; } c.clienteId = cli.id; c.cliente = cli.nome; }
        c.status = 'fechada';
        c.dataFechamento = new Date().toLocaleString('pt-BR');
        c.pagamentos = window.pagamentosTemp && window.pagamentosTemp.length ? window.pagamentosTemp : (r.pagamentos || []);
        c.troco = r.troco || 0;
        c.pagamentoPendente = !!r.fiado;
        c.valorPendente = r.fiado ? (r.falta || 0) : 0;
        delete c.aguardandoRecebimento; delete c.recebimentoTemp;
        window.recebimentoAtual = null;

        recalcularTotal();
        await salvarComanda();
        const m = document.getElementById('modal-preview-impressao'); if (m) m.remove();
        if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Comanda fechada!');
        window.__irAposRecibo = true;
        await window.abrirPreviewImpressao('recibo');   // recibo final: agora liberado para imprimir / enviar
    };

    // Cancela o recebimento: nada é fechado, a comanda segue aberta.
    window.cancelarRecebimento = async function () {
        const c = window.comandaAtual;
        if (!c) return;
        if (!await window.confirmar('Cancelar o recebimento? A comanda continua aberta e nada será fechado.', { titulo: 'Cancelar recebimento', ok: 'Cancelar recebimento', perigo: true })) return;
        delete c.aguardandoRecebimento; delete c.recebimentoTemp;
        window.recebimentoAtual = null;
        await salvarComanda();
        const m = document.getElementById('modal-preview-impressao'); if (m) m.remove();
        if (typeof window.renderCorpo === 'function') window.renderCorpo(); else if (window.navigateTo) window.navigateTo('detalhe-comanda');
    };

    // ============================================================
    // AÇÕES DA COMANDA (Cancelar, Reativar, Editar)
    // ============================================================
    window.cancelarComanda = async function () {
        if (!window.comandaAtual) return;
        if (!await window.confirmar('Cancelar a comanda?')) return;
        window.comandaAtual.status = 'cancelada';
        window.comandaAtual.dataFechamento = new Date().toLocaleString('pt-BR');
        await salvarComanda();
        window.navigateTo(window.rotaOrigem || 'pdv');
    };

    window.reabrirPendenciaDetalhe = async function () {
        if (!window.comandaAtual) return;
        if (await window.reabrirPendencia(window.comandaAtual.id)) {
            try { window.comandaAtual = window.normalizarArray(await apiGet('comandas')).find(x => String(x.id) === String(window.comandaAtual.id)) || window.comandaAtual; } catch (e) {}
            const div = document.getElementById('detalhe-corpo'); if (div) div.innerHTML = renderCorpo();
        }
    };

    window.reativarComanda = async function () {
        if (!window.comandaAtual) return;
        if (!await window.confirmar('Reativar comanda?')) return;
        window.comandaAtual.status = 'aberta';
        delete window.comandaAtual.pagamentos;
        delete window.comandaAtual.troco;
        delete window.comandaAtual.pagamentoPendente;
        delete window.comandaAtual.valorPendente;
        await salvarComanda();
        const div = document.getElementById('detalhe-corpo'); if (div) div.innerHTML = renderCorpo();
    };

    window.editarComanda = function() {
        navigateTo('editar-comanda');
    };

    // ============================================================
    // IMPRESSÃO E PREVIEW
    // ============================================================
    /** Bloco do QR do PIX (valor da comanda). destino: 'impressao' | 'preview' (mostra se qualquer opção ligada). */
    window.blocoPixQR = function (config, valor, estilo, tipo) {
        if (!config.pixRestaurante) return '';
        valor = Number(valor) || 0;
        if (valor <= 0.004) return '';   // QR só existe se houver pagamento em PIX (e mostra só o valor do PIX)
        if (estilo === 'forcar') {
            const u = window.qrUrl(window.gerarPixComValor(config.pixRestaurante, valor), '150x150');
            return '<div data-pix-qr="1" style="text-align:center;margin-top:12px;"><hr style="border:none;border-top:1px dashed #000;margin:10px 0;"><div style="font-weight:bold;font-size:11px;">PAGUE COM PIX</div><img src="' + u + '" style="width:140px;height:140px;margin:5px auto;display:block;"><div style="font-size:10px;">Valor: ' + formatMoney(valor) + '</div>' + (config.pixChave ? '<div style="font-size:10px;">PIX: <b>' + window.pixFormatarChave(config.pixTipo, config.pixChave) + '</b></div>' : '') + '</div>';
        }
        const imp = window.pixQrAtivo(config, 'impressao', tipo), wa = window.pixQrAtivo(config, 'whatsapp', tipo) || window.pixQrAtivo(config, 'compartilhar', tipo);
        if (!imp && !wa) return '';
        const mostrar = estilo === 'impressao' ? imp : true;
        if (!mostrar) return '';
        const pixComValor = window.gerarPixComValor(config.pixRestaurante, valor);
        const url = window.qrUrl(pixComValor, '150x150');
        const oculto = (estilo === 'preview' && !imp) ? 'display:none;' : '';
        return '<div data-pix-qr="1" style="' + oculto + 'text-align:center;margin-top:12px;">' +
            '<hr style="border:none;border-top:1px dashed #000;margin:10px 0;">' +
            '<div style="font-weight:bold;font-size:11px;">PAGAMENTO VIA PIX</div>' +
            '<img src="' + url + '" style="width:120px;height:120px;margin:5px auto;display:block;">' +
            '<div style="font-size:9px;">Valor: ' + formatMoney(valor) + '</div>' +
            (config.pixChave ? '<div style="font-size:9px;">PIX: <b>' + window.pixFormatarChave(config.pixTipo, config.pixChave) + '</b></div>' : '') +
            '</div>';
    };

    window.abrirPreviewImpressao = async function (tipo, opts) {
        if (!window.comandaAtual) return;
        opts = opts || {};
        const aberto = !!opts.aberto;

        let config = {};
        try { const arr = window.normalizarArray(await apiGet('configuracoes')); config = arr[0] || {}; } catch (e) {}

        const nomeEmpresa = config.nomeImpressao || 'App Restaurante';
        const urlLogo = config.imprimirLogo === false ? '' : (config.urlLogo || '');
        const c = aberto ? Object.assign({}, window.comandaAtual, { pagamentos: window.pagamentosTemp, troco: (window.recebimentoAtual || {}).troco || 0 }) : window.comandaAtual;
        const totais = calcularTotais(c);
        const corCaixa = await window.obterCorCaixaDaComanda(c);
        const faixaCorPreview = montarFaixaCorCaixa(corCaixa);

        const logoHTML = urlLogo 
            ? `<img src="${urlLogo}" style="max-height: 50px; max-width: 100%; display: block; margin: 0 auto 5px auto;">` 
            : '';

        let tituloModal = tipo === 'comanda' ? 'Comanda' : 'Recibo';
        let htmlPreview = '';

        if (tipo === 'comanda') {
            let itensHTML = '';
            window.normalizarArray(c.itens).forEach(i => {
                itensHTML += '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:12px;"><span>' + i.quantidade + 'x ' + i.nome + '</span><span>' + formatMoney(i.preco * i.quantidade) + '</span></div>';
            });

            htmlPreview = `
                <div style="font-family:monospace; font-size:12px; padding:10px; max-width:300px; margin:0 auto; background:#fff; border:1px solid #ddd; border-radius:8px;">
                    ${logoHTML}
                    ${config.imprimirNome === false ? '' : '<div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:5px;">' + nomeEmpresa + '</div>'}
                    <div style="text-align:center; font-size:10px; margin-bottom:10px;">COMPROVANTE DE CONSUMO</div>
                    ${faixaCorPreview}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Comanda: ${c.numero}</span><span>Mesa: ${formatarMesa(c.mesa)}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Data: ${c.dataAbertura}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Cliente: ${c.cliente || '—'}</span></div>
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    ${itensHTML}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Subtotal:</span><span>${formatMoney(totais.subtotal)}</span></div>
                    ${totais.desconto > 0 ? `<div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Desconto:</span><span>-${formatMoney(totais.desconto)}</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:10px;"><span>TOTAL:</span><span>${formatMoney(totais.total)}</span></div>
                    ${window.blocoPixQR(config, window.pixValorPago(c), 'preview', 'comanda')}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="text-align:center; font-size:10px;">Obrigado pela preferência!</div>
                </div>
            `;
        } else {
            let pagamentosHTML = '';
            window.normalizarArray(c.pagamentos).forEach(p => {
                pagamentosHTML += '<div style="display:flex; justify-content:space-between; padding:3px 0; font-size:12px;"><span>' + nomeFormaPagamento(p.forma) + '</span><span>' + formatMoney(p.valor) + '</span></div>' + (window.maquininhaTexto && p.maquininha && window.maquininhaTexto(p.maquininha) ? '<div style="font-size:10px;color:#555;">' + window.maquininhaTexto(p.maquininha) + '</div>' : '');
            });

            let itensHTML = '';
            let totalItensCount = 0;
            window.normalizarArray(c.itens).forEach(i => {
                const qtd = Number(i.quantidade);
                const sub = Number(i.preco) * qtd;
                totalItensCount += qtd;
                itensHTML += `
                    <div style="margin-bottom: 4px;">
                        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
                            <span>${qtd}x ${i.nome}</span>
                            <span>${formatMoney(sub)}</span>
                        </div>
                        <div style="font-size: 9px; color: #555; padding-left: 10px;">- Unit: ${formatMoney(i.preco)}</div>
                    </div>
                `;
            });

            const pa2 = await window.pendenciasAnteriores(window.comandaAtual);
        const atualPend = aberto ? ((window.recebimentoAtual || {}).fiado ? Number((window.recebimentoAtual || {}).falta || 0) : 0) : Number(c.pagamentoPendente ? (c.valorPendente || 0) : 0);
        const blocoPendHTML = (pa2.valor > 0 || atualPend > 0)
            ? '<hr style="border:none; border-top:1px dashed #000; margin:10px 0;">' +
              '<div style="display:flex; justify-content:space-between; padding:2px 0;"><span>Pendências anteriores:</span><span>' + formatMoney(pa2.valor) + '</span></div>' +
              '<div style="display:flex; justify-content:space-between; padding:2px 0;"><span>Pendente desta comanda:</span><span>' + formatMoney(atualPend) + '</span></div>' +
              '<div style="display:flex; justify-content:space-between; font-weight:bold; padding:2px 0;"><span>TOTAL GERAL PENDENTE:</span><span>' + formatMoney(pa2.valor + atualPend) + '</span></div>'
            : '';
        const blocoPixHTML = aberto ? window.blocoPixQR(config, window.pixValorPago(c), 'forcar', 'recibo') : window.blocoPixQR(config, window.pixValorPago(c), 'preview', 'recibo');

            htmlPreview = `
                <div style="font-family:monospace; font-size:12px; padding:10px; max-width:300px; margin:0 auto; background:#fff; border:1px solid #ddd; border-radius:8px;">
                    ${logoHTML}
                    ${config.imprimirNome === false ? '' : '<div style="text-align:center; font-size:16px; font-weight:bold; margin-bottom:5px;">' + nomeEmpresa + '</div>'}
                    <div style="text-align:center; font-size:10px; margin-bottom:10px;">${aberto ? 'RECIBO EM ABERTO' : 'RECIBO DE PAGAMENTO'}</div>
                    <div style="text-align:center;font-weight:bold;font-size:12px;margin:0 0 6px;padding:4px;border-radius:4px;${aberto ? 'background:#fff3e0;color:#e65100;' : (c.pagamentoPendente ? 'background:#fff3e0;color:#e65100;' : 'background:#e8f5e9;color:#2e7d32;')}">${aberto ? '⏳ AGUARDANDO PAGAMENTO' : (c.pagamentoPendente ? '⚠ PENDENTE (FIADO): ' + formatMoney(c.valorPendente || 0) : '✔ PAGO')}</div>
                    ${faixaCorPreview}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Comanda: ${c.numero}</span><span>Mesa: ${formatarMesa(c.mesa)}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Data: ${c.dataFechamento || new Date().toLocaleString('pt-BR')}</span></div>
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Cliente: ${c.cliente || '—'}</span></div>
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="font-weight:bold; text-transform:uppercase; font-size:11px; margin-bottom:5px;">ITENS CONSUMIDOS (${totalItensCount}):</div>
                    ${itensHTML}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Subtotal:</span><span>${formatMoney(totais.subtotal)}</span></div>
                    ${totais.desconto > 0 ? `<div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Desconto:</span><span>-${formatMoney(totais.desconto)}</span></div>` : ''}
                    <div style="display:flex; justify-content:space-between; font-size:14px; font-weight:bold; margin-top:10px;"><span>TOTAL:</span><span>${formatMoney(totais.total)}</span></div>
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="font-weight:bold; text-transform:uppercase; font-size:11px; margin-bottom:5px;">FORMA DE PAGAMENTO:</div>
                    ${pagamentosHTML || '<div style="text-align:center;">Nenhum pagamento registrado.</div>'}
                    ${c.troco > 0 ? `<div style="display:flex; justify-content:space-between; padding:3px 0;"><span>Troco:</span><span>${formatMoney(c.troco)}</span></div>` : ''}
                    ${blocoPendHTML}
                    ${blocoPixHTML}
                    <hr style="border:none; border-top:1px dashed #000; margin:10px 0;">
                    <div style="text-align:center; font-size:10px;">Assinatura: ________________________</div>
                </div>
            `;
        }

        const anterior = document.getElementById('modal-preview-impressao');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-preview-impressao';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (aberto) return; if (e.target === modal) fecharPreviewImpressao(); };

        let btnWhatsapp = '';
        {
            btnWhatsapp = '<button class="btn-primary" style="background:#25d366; flex:1; font-size:0.9rem; padding:12px;" onclick="enviarWhatsApp(\'' + tipo + '\')"><i class="fab fa-whatsapp"></i> Enviar WhatsApp</button>';
        }

        const rodapeAberto =
            '    <div style="padding:15px; background:#fff; border-top:1px solid #ddd; border-radius:0 0 12px 12px;">' +
            '        <div style="font-size:.8rem;color:#666;text-align:center;margin-bottom:8px;">Receba o pagamento e depois feche a comanda. A impressão do recibo só é liberada após o fechamento.</div>' +
            '        <div style="display:flex;gap:8px;margin-bottom:8px;"><button class="btn-primary" style="background:#25d366;flex:1;padding:10px;" onclick="enviarWhatsApp(\'recibo\')"><i class="fab fa-whatsapp"></i> WhatsApp</button><button class="btn-outline" style="flex:1;padding:10px;" onclick="enviarWhatsApp(\'recibo\', \'outros\')"><i class="fas fa-share-nodes"></i> Compartilhar</button></div>' +
            '        <button class="btn-primary" style="width:100%;background:#2e7d32;padding:14px;" onclick="finalizarRecebimento()"><i class="fas fa-check-circle"></i> Fechar comanda (recebido)</button>' +
            '        <button class="btn-outline" style="width:100%;margin-top:8px;border-color:#c62828;color:#c62828;" onclick="cancelarRecebimento()"><i class="fas fa-times-circle"></i> Cancelar recebimento</button>' +
            '    </div>';

        modal.innerHTML =
            '<div class="modal-content" style="max-width:400px; background:#f5f5f5; border-radius:12px;">' +
            '    <div class="modal-header" style="background:#fff; border-bottom:1px solid #ddd; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; padding:15px 20px;">' +
            '        <strong style="font-size:1.1rem; color:#333; flex:1; margin:0;">' + tituloModal + '</strong>' +
            '        <button class="btn-limpar" onclick="fecharPreviewImpressao()" style="color:#333; background:transparent; border:none; cursor:pointer; flex-shrink:0;"><i class="fas fa-xmark" style="font-size:1.2rem;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding:20px; overflow-y:auto; max-height:70vh;">' +
                     '<div id="preview-captura" style="background:#fff;">' + htmlPreview + '</div>' +
            '    </div>' +
            '    <div style="padding:15px; background:#fff; border-top:1px solid #ddd; display:flex; gap:8px; border-radius:0 0 12px 12px;">' +
            '        <button class="btn-primary" style="flex:1; background:#1976d2; font-size:0.9rem; padding:12px;" onclick="executarImpressao(\'' + tipo + '\')"><i class="fas fa-print"></i> Imprimir</button>' +
                     btnWhatsapp +
            '        <button class="btn-outline" style="flex:0 0 auto; font-size:0.9rem; padding:12px;" title="Outros compartilhamentos" onclick="enviarWhatsApp(\'' + tipo + '\', \'outros\')"><i class="fas fa-share-nodes"></i></button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        if (aberto) {
            const mc = modal.querySelector('.modal-content');
            const rod = mc.lastElementChild;
            rod.outerHTML = rodapeAberto;
            const x = mc.querySelector('.modal-header button');
            if (x) x.setAttribute('onclick', 'cancelarRecebimento()');
        } else if (window.__irAposRecibo) {
            const x = modal.querySelector('.modal-header button');
            if (x) x.setAttribute('onclick', 'fecharPreviewImpressao()');
        }
    };

    window.fecharPreviewImpressao = function () {
        const m = document.getElementById('modal-preview-impressao');
        if (m) m.remove();
        if (window.__irAposRecibo) { window.__irAposRecibo = false; window.navigateTo(window.rotaOrigem || 'pdv'); }
    };

    window.executarImpressao = function (tipo) {
        window.__irAposRecibo = false;
        fecharPreviewImpressao();
        if (tipo === 'comanda') {
            imprimirComandaAtual();
        } else {
            imprimirReciboAtual();
        }
    };

    window.enviarWhatsApp = async function (tipo, modo) {
        if (!window.comandaAtual) return;
        const outros = modo === 'outros';   // menu Compartilhar do Android (e-mail, Drive, Telegram…)
        const telZap = outros ? '' : await window.telefoneWhatsApp(window.comandaAtual, true);
        // 1) tenta mandar a IMAGEM da comanda/recibo (como um print)
        try {
            const alvo = document.getElementById('preview-captura');
            if (alvo && window.elementoParaPng) {
                let cfgW = {};
                try { cfgW = window.normalizarArray(await apiGet('configuracoes'))[0] || {}; } catch (e) {}
                const bq = alvo.querySelector('[data-pix-qr]');
                const antes = bq ? bq.style.display : '';
                if (bq) bq.style.display = window.pixQrAtivo(cfgW, outros ? 'compartilhar' : 'whatsapp', tipo === 'recibo' ? 'recibo' : 'comanda') ? '' : 'none';   // QR no WhatsApp conforme a configuração
                let png;
                try { png = await window.elementoParaPng(alvo); } finally { if (bq) bq.style.display = antes; }
                const nome = (tipo === 'comanda' ? 'comanda-' : 'recibo-') + (window.comandaAtual.numero || '') + '.png';
                const txt = (tipo === 'comanda' ? 'Comanda ' : 'Recibo da comanda ') + (window.comandaAtual.numero || '');
                if (await window.compartilharImagem(png, nome, txt, telZap, outros ? 'outros' : '')) return;
            }
        } catch (e) { console.warn('Envio por imagem falhou, usando texto:', e); }
        // 2) reserva: texto no WhatsApp
        const c = window.comandaAtual;
        let config = {};
        try { const arr = window.normalizarArray(await apiGet('configuracoes')); config = arr[0] || {}; } catch (e) {}

        const nomeEmpresa = config.nomeImpressao || 'App Restaurante';
        const totais = calcularTotais(c);
        const corCaixa = await window.obterCorCaixaDaComanda(c);
        const emoji = corCaixa ? (window.EMOJI_COR_CAIXA[corCaixa.id] || '🟢') : '';
        
        const linhaCor = corCaixa ? `${emoji} *${corCaixa.label || corCaixa.id}*\n` : '';

        let texto = '';

        if (tipo === 'comanda') {
            if (config.imprimirNome !== false) texto += `*${nomeEmpresa}*\n`;
            texto += `COMPROVANTE DE CONSUMO\n`;
            texto += linhaCor + `\n`;
            texto += `Comanda: ${c.numero} | Mesa: ${formatarMesa(c.mesa)}\n`;
            texto += `Cliente: ${c.cliente || '—'}\n\n`;
            texto += `*ITENS:*\n`;
            window.normalizarArray(c.itens).forEach(i => {
                texto += `${i.quantidade}x ${i.nome} - ${formatMoney(i.preco * i.quantidade)}\n`;
            });
            texto += `\nSubtotal: ${formatMoney(totais.subtotal)}\n`;
            if (totais.desconto > 0) texto += `Desconto: -${formatMoney(totais.desconto)}\n`;
            texto += `*TOTAL: ${formatMoney(totais.total)}*\n\n`;
            texto += `Obrigado pela preferência!`;
        } else {
            if (config.imprimirNome !== false) texto += `*${nomeEmpresa}*\n`;
            texto += `RECIBO DE PAGAMENTO\n${c.pagamentoPendente ? 'PENDENTE (FIADO)' : 'PAGO'}\n`;
            texto += linhaCor + `\n`;
            texto += `Comanda: ${c.numero} | Mesa: ${formatarMesa(c.mesa)}\n`;
            texto += `Data: ${c.dataFechamento || new Date().toLocaleString('pt-BR')}\n`;
            texto += `Cliente: ${c.cliente || '—'}\n\n`;
            texto += `*ITENS CONSUMIDOS:*\n`;
            window.normalizarArray(c.itens).forEach(i => {
                texto += `${i.quantidade}x ${i.nome} - ${formatMoney(i.preco * i.quantidade)}\n`;
            });
            texto += `\n*TOTAL: ${formatMoney(totais.total)}*\n\n`;
            texto += `*PAGAMENTO:*\n`;
            window.normalizarArray(c.pagamentos).forEach(p => {
                texto += `${nomeFormaPagamento(p.forma)}: ${formatMoney(p.valor)}\n`;
                if (p.maquininha && window.maquininhaTexto) texto += `  ${window.maquininhaTexto(p.maquininha)}\n`;
            });
            if (c.troco > 0) texto += `Troco: ${formatMoney(c.troco)}\n`;
        }

        if (outros) {
            if (window.AndroidApp && window.AndroidApp.compartilhar) window.AndroidApp.compartilhar((tipo === 'comanda' ? 'Comanda ' : 'Recibo ') + (c.numero || ''), texto);
            else if (navigator.share) { try { await navigator.share({ text: texto }); } catch (e) {} }
            else { try { await navigator.clipboard.writeText(texto); if (window.mostrarToast) window.mostrarToast('📋 Texto copiado'); } catch (e) {} }
            return;
        }
        const telefone = telZap;

        const url = 'https://wa.me/' + (telefone ? telefone : '') + '?text=' + encodeURIComponent(texto);
        window.open(url, '_blank');
        if (!(c && c.aguardandoRecebimento)) fecharPreviewImpressao();   // recibo em aberto continua na tela
    };

    window.imprimirComandaAtual = async function () {
        if (!window.comandaAtual) return;
        if (window.btTentarImprimir && await window.btTentarImprimir('comanda')) { fecharPreviewImpressao(); return; }
        let config = {};
        try { const arr = window.normalizarArray(await apiGet('configuracoes')); config = arr[0] || {}; } catch (e) {}

        const nomeEmpresa = config.nomeImpressao || 'App Restaurante';
        const urlLogo = config.imprimirLogo === false ? '' : (config.urlLogo || '');
        const c = window.comandaAtual;
        const totais = calcularTotais(c);
        const corCaixa = await window.obterCorCaixaDaComanda(c);
        const faixaCorHTML = montarFaixaCorCaixa(corCaixa);

        const logoHTML = urlLogo 
            ? `<img src="${urlLogo}" style="max-height: 50px; max-width: 100%; display: block; margin: 0 auto 5px auto;">` 
            : '';

        let itensHTML = '';
        window.normalizarArray(c.itens).forEach(i => {
            itensHTML += '<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom: 1px dashed #eee; font-size: 12px;"><span style="font-weight:600;">' + i.quantidade + 'x ' + i.nome + '</span><span>' + formatMoney(i.preco * i.quantidade) + '</span></div>';
        });

        const html = `
            <html><head><title>Comanda ${c.numero}</title>
            <style>
                @page { margin: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; padding: 0; max-width: 300px; margin: 0 auto; color: #333; background: #fff; }
                .header { background: #C2185B; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; margin-bottom: 8px; }
                .header h2 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; }
                .header p { margin: 4px 0 0 0; font-size: 10px; opacity: 0.9; }
                .faixa-cor-caixa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .info-box { background: #f9f9f9; border-radius: 8px; padding: 10px; margin-bottom: 15px; border: 1px solid #eee; font-size: 11px; }
                .info-box div { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .info-box div:last-child { margin-bottom: 0; }
                .section-title { font-weight: 700; font-size: 12px; color: #C2185B; margin-bottom: 5px; text-transform: uppercase; }
                .total-box { margin-top: 15px; border-top: 2px solid #eee; padding-top: 10px; }
                .total-box div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #555; }
                .total-box .total-final { font-size: 16px; font-weight: 800; color: #C2185B; margin-top: 8px; }
                .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
            </style></head><body>
                <div class="header">
                    ${logoHTML}
                    ${config.imprimirNome === false ? '' : '<h2>' + nomeEmpresa + '</h2>'}
                    <p>COMPROVANTE DE CONSUMO</p>
                </div>
                ${faixaCorHTML}
                <div class="info-box">
                    <div><span><b>Comanda:</b> ${c.numero}</span><span><b>Mesa:</b> ${formatarMesa(c.mesa)}</span></div>
                    <div><span><b>Data:</b> ${c.dataAbertura}</span></div>
                    <div><span><b>Cliente:</b> ${c.cliente || '—'}</span></div>
                </div>
                <div class="section-title">Itens Consumidos</div>
                ${itensHTML}
                <div class="total-box">
                    <div><span>Subtotal:</span><span>${formatMoney(totais.subtotal)}</span></div>
                    ${totais.desconto > 0 ? `<div><span>Desconto:</span><span>-${formatMoney(totais.desconto)}</span></div>` : ''}
                    <div class="total-final"><span>TOTAL:</span><span>${formatMoney(totais.total)}</span></div>
                </div>
                ${window.blocoPixQR(config, window.pixValorPago(c), 'impressao', 'comanda')}
                <div class="footer">Obrigado pela preferência!</div>
                <br><br><br>
                <script>window.onload=function(){setTimeout(function(){window.print(); window.close();},300);}<\/script>
            </body></html>
        `;
        const janela = window.open('', '', 'width=400,height=600');
        janela.document.write(html);
        janela.document.close();
    };

    window.imprimirReciboAtual = async function () {
        if (!window.comandaAtual) return;
        if (window.btTentarImprimir && await window.btTentarImprimir('recibo')) { fecharPreviewImpressao(); return; }
        let config = {};
        try { const arr = window.normalizarArray(await apiGet('configuracoes')); config = arr[0] || {}; } catch (e) {}

        const nomeEmpresa = config.nomeImpressao || 'App Restaurante';
        const urlLogo = config.imprimirLogo === false ? '' : (config.urlLogo || '');
        const c = window.comandaAtual;
        const totais = calcularTotais(c);
        const corCaixa = await window.obterCorCaixaDaComanda(c);
        const faixaCorHTML = montarFaixaCorCaixa(corCaixa);

        const logoHTML = urlLogo 
            ? `<img src="${urlLogo}" style="max-height: 50px; max-width: 100%; display: block; margin: 0 auto 5px auto;">` 
            : '';

        let pagamentosHTML = '';
        window.normalizarArray(c.pagamentos).forEach(p => {
            pagamentosHTML += '<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom: 1px dashed #eee; font-size: 12px;"><span style="font-weight:600;">' + nomeFormaPagamento(p.forma) + '</span><span>' + formatMoney(p.valor) + '</span></div>' + (window.maquininhaTexto && p.maquininha && window.maquininhaTexto(p.maquininha) ? '<div style="font-size:10px;color:#555;">' + window.maquininhaTexto(p.maquininha) + '</div>' : '');
        });

        let itensHTML = '';
        let totalItensCount = 0;
        window.normalizarArray(c.itens).forEach(i => {
            const qtd = Number(i.quantidade);
            const sub = Number(i.preco) * qtd;
            totalItensCount += qtd;

            itensHTML += `
                <div style="padding: 6px 0; border-bottom: 1px dashed #eee;">
                    <div style="display:flex; justify-content:space-between; font-weight:600; font-size:12px;">
                        <span>${qtd}x ${i.nome}</span>
                        <span>${formatMoney(sub)}</span>
                    </div>
                    <div style="font-size: 10px; color: #888;">Unit: ${formatMoney(i.preco)}</div>
                </div>
            `;
        });

        const blocoPixHTML = window.blocoPixQR(config, window.pixValorPago(c), 'impressao', 'recibo');

        const html = `
            <html><head><title>Recibo ${c.numero}</title>
            <style>
                @page { margin: 0; }
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; padding: 0; max-width: 300px; margin: 0 auto; color: #333; background: #fff; }
                .header { background: #C2185B; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; margin-bottom: 8px; }
                .header h2 { margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; }
                .header p { margin: 4px 0 0 0; font-size: 10px; opacity: 0.9; }
                .faixa-cor-caixa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .info-box { background: #f9f9f9; border-radius: 8px; padding: 10px; margin-bottom: 15px; border: 1px solid #eee; font-size: 11px; }
                .info-box div { display: flex; justify-content: space-between; margin-bottom: 4px; }
                .info-box div:last-child { margin-bottom: 0; }
                .section-title { font-weight: 700; font-size: 12px; color: #C2185B; margin-bottom: 5px; text-transform: uppercase; margin-top: 15px; }
                .total-box { margin-top: 15px; border-top: 2px solid #eee; padding-top: 10px; }
                .total-box div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; color: #555; }
                .total-box .total-final { font-size: 16px; font-weight: 800; color: #C2185B; margin-top: 8px; }
                .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
            </style></head><body>
                <div class="header">
                    ${logoHTML}
                    ${config.imprimirNome === false ? '' : '<h2>' + nomeEmpresa + '</h2>'}
                    <p>RECIBO DE PAGAMENTO</p>
                    <p><b>${c.pagamentoPendente ? 'PENDENTE (FIADO)' : 'PAGO'}</b></p>
                </div>
                ${faixaCorHTML}
                <div class="info-box">
                    <div><span><b>Comanda:</b> ${c.numero}</span><span><b>Mesa:</b> ${formatarMesa(c.mesa)}</span></div>
                    <div><span><b>Data:</b> ${c.dataFechamento || new Date().toLocaleString('pt-BR')}</span></div>
                    <div><span><b>Cliente:</b> ${c.cliente || '—'}</span></div>
                </div>

                <div class="section-title">Itens Consumidos (${totalItensCount})</div>
                ${itensHTML}

                <div class="total-box">
                    <div><span>Subtotal:</span><span>${formatMoney(totais.subtotal)}</span></div>
                    ${totais.desconto > 0 ? `<div><span>Desconto:</span><span>-${formatMoney(totais.desconto)}</span></div>` : ''}
                    <div class="total-final"><span>TOTAL:</span><span>${formatMoney(totais.total)}</span></div>
                </div>

                <div class="section-title">Forma de Pagamento</div>
                ${pagamentosHTML || '<div style="text-align:center; font-size:12px; color:#888;">Nenhum pagamento registrado.</div>'}
                ${c.troco > 0 ? `<div style="display:flex; justify-content:space-between; padding:6px 0; font-size:12px; color:#2e7d32; font-weight:bold;"><span>Troco:</span><span>${formatMoney(c.troco)}</span></div>` : ''}

                ${blocoPixHTML}

                <div class="footer">Assinatura: ________________________</div>
                <br><br><br>
                <script>window.onload=function(){setTimeout(function(){window.print(); window.close();},500);}<\/script>
            </body></html>
        `;
        const janela = window.open('', '', 'width=400,height=700');
        janela.document.write(html);
        janela.document.close();
    };
}