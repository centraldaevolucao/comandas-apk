// ============================================================
// RELATORIOS.JS — v2.6
// ============================================================

console.log('✔ Relatorios.js v2.6 carregado');

if (!window.renderRelatorios) {
    
    window.relatoriosState = window.relatoriosState || {
        tipoRelatorio: 'vendas',
        filtroDataTipo: 'hoje',
        dataInicio: '',
        dataFim: '',
        filtroCaixa: 'todos',
        filtroCliente: '',
        filtroProduto: '',
        filtroEspecie: 'todas',
        ordem: 'padrao'
    };

    // Ordenação escolhida pelo usuário (padrão = a ordem natural de cada relatório).
    function ordenarRel(arr, nome, valor, qtd) {
        const o = (window.relatoriosState || {}).ordem || 'padrao';
        const cmpN = (a, b) => String(nome(a) || '').localeCompare(String(nome(b) || ''), 'pt-BR', { sensitivity: 'base', numeric: true });
        const f = {
            az: cmpN, za: (a, b) => cmpN(b, a),
            maior: (a, b) => valor(b) - valor(a), menor: (a, b) => valor(a) - valor(b),
            'qtd-maior': (a, b) => qtd(b) - qtd(a), 'qtd-menor': (a, b) => qtd(a) - qtd(b)
        }[o];
        return f ? arr.slice().sort(f) : arr;
    }
    window.relatorioMudarOrdem = function (v) { window.relatoriosState.ordem = v; window.carregarDadosRelatorios(); };

    window.renderRelatorios = function () {
        if (!window.relatoriosState.tipoRelatorio) {
            window.relatoriosState.tipoRelatorio = 'vendas';
        }

        setTimeout(() => {
            carregarDadosRelatorios();
        }, 100);

        // 🔙 BOTÃO VOLTAR AJUSTADO PARA CHAMAR A FUNÇÃO GLOBAL
        return `
            <div class="app-bar">
                <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>
                <h1>Relatórios</h1>
                <div style="display:flex;gap:2px;">
                    <button class="icon-btn" onclick="abrirBarraFiltros()" title="Mostrar Filtros">
                        <i class="fas fa-filter"></i>
                    </button>
                </div>
            </div>
            <div class="content-area" id="relatorios-resultado" style="padding:15px;">
                <p class="empty-state">🔄 Carregando dados...</p>
            </div>
        `;
    };

    // Opções para os filtros Cliente/Produto: só o que existe nas comandas dos DEMAIS filtros (período, caixa, espécie e o outro filtro)
    window.relOpcoesFiltro = async function (campo) {
        let comandas = window.normalizarArray(await apiGet('comandas'));
        comandas = filtrarComandasPorPeriodo(comandas);
        comandas = filtrarComandasPorCaixa(comandas);
        if (campo !== 'cliente') comandas = filtrarComandasPorCliente(comandas);
        if (campo !== 'produto') comandas = filtrarComandasPorProduto(comandas);
        comandas = filtrarComandasPorEspecie(comandas);
        const mapa = {};
        if (campo === 'cliente') {
            comandas.forEach(function (c) {
                const nome = String(c.cliente || '').trim() || '(sem nome)';
                const m = mapa[nome] || (mapa[nome] = { nome: nome, qtd: 0, total: 0 });
                m.qtd += 1; m.total += Number(c.total || 0);
            });
        } else {
            comandas.forEach(function (c) {
                window.normalizarArray(c.itens).forEach(function (i) {
                    const nome = String(i.nome || '').trim(); if (!nome) return;
                    const m = mapa[nome] || (mapa[nome] = { nome: nome, qtd: 0, total: 0 });
                    m.qtd += Number(i.quantidade || 0); m.total += Number(i.preco || 0) * Number(i.quantidade || 0);
                });
            });
        }
        return Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (x, y) {
            if (x.nome === '(sem nome)') return -1; if (y.nome === '(sem nome)') return 1;
            return x.nome.localeCompare(y.nome, 'pt-BR');
        });
    };

    window.carregarDadosRelatorios = async function() {
        const container = document.getElementById('relatorios-resultado');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">🔄 Buscando dados...</p>';

        try {
            let comandas = window.normalizarArray(await apiGet('comandas'));
            
            comandas = filtrarComandasPorPeriodo(comandas);
            comandas = filtrarComandasPorCaixa(comandas);
            comandas = filtrarComandasPorCliente(comandas);
            comandas = filtrarComandasPorProduto(comandas);
            comandas = filtrarComandasPorEspecie(comandas);

            const st = window.relatoriosState;
            if (st.tipoRelatorio === 'vendas' || st.tipoRelatorio === 'caixa') {
                comandas = ordenarRel(comandas, c => c.cliente || '', c => totalDaComanda(c), c => window.normalizarArray(c.itens).reduce((a, i) => a + Number(i.quantidade || 0), 0));
            }
            const dados = montarDadosRelatorio(comandas);
            window.relatorioAtual = dados;

            let corpo = '';
            if (st.tipoRelatorio === 'vendas') {
                corpo = renderRelatorioVendas(comandas, dados);
            } else if (st.tipoRelatorio === 'produtos') {
                corpo = renderRelatorioProdutos(comandas);
            } else if (st.tipoRelatorio === 'clientes') {
                corpo = renderRelatorioClientes(comandas);
            } else if (st.tipoRelatorio === 'caixa') {
                corpo = renderRelatorioCaixa(comandas);
            }
            container.innerHTML = renderBarraRelatorio(dados) + corpo;

        } catch (e) {
            container.innerHTML = `<p class="empty-state" style="color:#c62828;">Erro: ${e.message}</p>`;
        }
    };

    function filtrarComandasPorPeriodo(comandas) {
        const st = window.relatoriosState;
        const hoje = new Date();
        hoje.setHours(0,0,0,0);

        return comandas.filter(c => {
            const dataC = window.parseDataBR(c.dataAbertura);
            if (!dataC) return false;
            
            if (st.tipoRelatorio !== 'caixa' && !window.comandaEstaFechada(c)) return false;

            dataC.setHours(0,0,0,0);
            const diffDias = Math.floor((hoje - dataC) / (1000 * 60 * 60 * 24));

            if (st.filtroDataTipo === 'hoje') return diffDias === 0;
            if (st.filtroDataTipo === 'ontem') return diffDias === 1;
            if (st.filtroDataTipo === '7dias') return diffDias >= 0 && diffDias <= 7;
            if (st.filtroDataTipo === 'mes') return dataC.getMonth() === hoje.getMonth() && dataC.getFullYear() === hoje.getFullYear();
            
            if (st.filtroDataTipo === 'periodo') {
                if (!st.dataInicio || !st.dataFim) return true;
                const ini = window.parseDataBR(st.dataInicio + ' 00:00');
                const fim = window.parseDataBR(st.dataFim + ' 23:59');
                return dataC >= ini && dataC <= fim;
            }
            return true;
        });
    }

    function filtrarComandasPorCaixa(comandas) {
        const cor = window.relatoriosState.filtroCaixa;
        if (cor === 'todos') return comandas;
        return comandas.filter(c => String(c.corGrupo) === String(cor));
    }

    function filtrarComandasPorCliente(comandas) {
        const termo = window.relatoriosState.filtroCliente.trim().toLowerCase();
        if (!termo) return comandas;
        if (termo === '(sem nome)') return comandas.filter(c => !String(c.cliente || '').trim());
        return comandas.filter(c => String(c.cliente || '').toLowerCase().includes(termo));
    }

    function filtrarComandasPorProduto(comandas) {
        const termo = window.relatoriosState.filtroProduto.trim().toLowerCase();
        if (!termo) return comandas;

        return comandas.map(c => {
            const itensFiltrados = window.normalizarArray(c.itens).filter(i => String(i.nome || '').toLowerCase().includes(termo));
            if (itensFiltrados.length === 0) return null;
            
            const clone = { ...c, itens: itensFiltrados };
            let sub = 0;
            itensFiltrados.forEach(i => sub += Number(i.preco) * Number(i.quantidade));
            clone.total = sub;
            return clone;
        }).filter(c => c !== null);
    }


    // ---------- Espécie (forma de pagamento) ----------
    const ROTULO_ESPECIE = { todas: 'Todas', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'PIX' };
    const ROTULO_TIPO = { vendas: 'Vendas', produtos: 'Produtos', clientes: 'Clientes', caixa: 'Caixa (auditoria)' };
    const ROTULO_PERIODO = { hoje: 'Hoje', ontem: 'Ontem', '7dias': 'Últimos 7 dias', mes: 'Este mês', periodo: 'Período personalizado' };

    function valorNaEspecie(c, especie) {
        let v = 0;
        window.pagamentosLiquidos(c).forEach(p => { if (p.forma === especie) v += Number(p.valor || 0); });
        return v;
    }

    function filtrarComandasPorEspecie(comandas) {
        const esp = window.relatoriosState.filtroEspecie;
        if (!esp || esp === 'todas') return comandas;
        return comandas.filter(c => valorNaEspecie(c, esp) > 0);
    }

    function totalDaComanda(c) {
        const esp = window.relatoriosState.filtroEspecie;
        return (esp && esp !== 'todas') ? valorNaEspecie(c, esp) : Number(c.total || 0);
    }

    function formasDaComanda(c) {
        const set = [];
        window.pagamentosLiquidos(c).forEach(p => {
            const r = ROTULO_ESPECIE[p.forma] || p.forma;
            if (r && set.indexOf(r) < 0) set.push(r);
        });
        return set.join(' + ') || '-';
    }

    function descricaoFiltros() {
        const st = window.relatoriosState;
        let periodo = ROTULO_PERIODO[st.filtroDataTipo] || st.filtroDataTipo;
        if (st.filtroDataTipo === 'periodo' && st.dataInicio && st.dataFim) periodo = st.dataInicio + ' a ' + st.dataFim;
        const cor = (window.CORES_CAIXA || []).find(c => c.id === st.filtroCaixa);
        return [
            ['Tipo', ROTULO_TIPO[st.tipoRelatorio] || st.tipoRelatorio],
            ['Período', periodo],
            ['Caixa', st.filtroCaixa === 'todos' ? 'Todos' : (cor ? cor.label : st.filtroCaixa)],
            ['Espécie', ROTULO_ESPECIE[st.filtroEspecie] || 'Todas'],
            ['Cliente', st.filtroCliente ? st.filtroCliente : 'Todos'],
            ['Produto', st.filtroProduto ? st.filtroProduto : 'Todos']
        ];
    }

    // Dados "neutros" do relatório atual: servem para a tela, a impressão, o CSV e o PDF.
    function montarDadosRelatorio(comandas) {
        const st = window.relatoriosState;
        const filtros = descricaoFiltros();
        const d = { titulo: 'Relatório de ' + (ROTULO_TIPO[st.tipoRelatorio] || 'Vendas'), filtros: filtros, subtitulo: '', colunas: [], alinhar: [], linhas: [], totais: [], totalGeral: 0 };
        const dinheiro = formatMoney;

        if (st.tipoRelatorio === 'produtos') {
            const mapa = {};
            comandas.forEach(c => window.normalizarArray(c.itens).forEach(i => {
                const nome = i.nome || 'Desconhecido';
                if (!mapa[nome]) mapa[nome] = { qtd: 0, total: 0 };
                mapa[nome].qtd += Number(i.quantidade);
                mapa[nome].total += Number(i.preco) * Number(i.quantidade);
            }));
            let lista = Object.keys(mapa).map(n => ({ nome: n, qtd: mapa[n].qtd, total: mapa[n].total })).sort((a, b) => b.qtd - a.qtd);
            lista = ordenarRel(lista, x => x.nome, x => x.total, x => x.qtd);
            d.colunas = ['#', 'Produto', 'Quantidade', 'Total']; d.alinhar = ['l', 'l', 'r', 'r'];
            d.linhas = lista.map((p, i) => [String(i + 1), p.nome, String(p.qtd), dinheiro(p.total)]);
            d.totalGeral = lista.reduce((a, p) => a + p.total, 0);
            d.totais = [['Total de unidades', String(lista.reduce((a, p) => a + p.qtd, 0))], ['Total geral', dinheiro(d.totalGeral)]];
        } else if (st.tipoRelatorio === 'clientes') {
            const mapa = {};
            comandas.forEach(c => {
                const nome = c.cliente || 'Sem nome';
                if (!mapa[nome]) mapa[nome] = { qtd: 0, total: 0 };
                mapa[nome].qtd += 1; mapa[nome].total += totalDaComanda(c);
            });
            let lista = Object.keys(mapa).map(n => ({ nome: n, qtd: mapa[n].qtd, total: mapa[n].total })).sort((a, b) => b.total - a.total);
            lista = ordenarRel(lista, x => x.nome, x => x.total, x => x.qtd);
            d.colunas = ['Cliente', 'Comandas', 'Total']; d.alinhar = ['l', 'r', 'r'];
            d.linhas = lista.map(c => [c.nome, String(c.qtd), dinheiro(c.total)]);
            d.totalGeral = lista.reduce((a, c) => a + c.total, 0);
            d.totais = [['Total de comandas', String(comandas.length)], ['Total geral', dinheiro(d.totalGeral)]];
        } else if (st.tipoRelatorio === 'caixa') {
            d.colunas = ['Comanda', 'Cliente', 'Situação', 'Total']; d.alinhar = ['l', 'l', 'l', 'r'];
            let fechado = 0, aberto = 0, nF = 0, nA = 0, nC = 0;
            d.linhas = comandas.map(c => {
                const status = window.statusComandaNormalizado(c);
                if (status === 'fechada') { fechado += Number(c.total || 0); nF++; }
                else if (status === 'cancelada') nC++;
                else { aberto += Number(c.total || 0); nA++; }
                return ['#' + c.numero, c.cliente || 'Sem nome', status, dinheiro(totalDaComanda(c))];
            });
            d.totalGeral = fechado + aberto;
            d.totais = [['Fechadas (' + nF + ')', dinheiro(fechado)], ['Em aberto (' + nA + ')', dinheiro(aberto)], ['Canceladas', String(nC)], ['Total geral', dinheiro(d.totalGeral)]];
        } else {
            d.colunas = ['Comanda', 'Cliente', 'Data', 'Pagamento', 'Total']; d.alinhar = ['l', 'l', 'l', 'l', 'r'];
            const porForma = { dinheiro: 0, debito: 0, credito: 0, pix: 0 };
            d.linhas = comandas.map(c => {
                window.pagamentosLiquidos(c).forEach(p => {
                    if (st.filtroEspecie !== 'todas' && p.forma !== st.filtroEspecie) return;
                    if (porForma[p.forma] !== undefined) porForma[p.forma] += Number(p.valor || 0);
                });
                return ['#' + c.numero, c.cliente || 'Sem nome', c.dataFechamento || c.dataAbertura || '', formasDaComanda(c), dinheiro(totalDaComanda(c))];
            });
            d.totalGeral = comandas.reduce((a, c) => a + totalDaComanda(c), 0);
            d.porForma = porForma;
            d.totais = [['Comandas', String(comandas.length)]];
            if (st.filtroEspecie === 'todas') {
                d.totais.push(['Dinheiro', dinheiro(porForma.dinheiro)], ['Débito', dinheiro(porForma.debito)], ['Crédito', dinheiro(porForma.credito)], ['PIX', dinheiro(porForma.pix)]);
            }
            d.totais.push(['Total geral', dinheiro(d.totalGeral)]);
        }
        return d;
    }

    // Chips dos filtros: os aplicados (diferentes de Todos) em destaque, os demais esmaecidos
    function chipsFiltros(filtros) {
        const def = function (v) { return /^(todos|todas)$/i.test(String(v).trim()); };
        const ativos = filtros.filter(function (f) { return !def(f[1]); }).length;
        const chip = function (f) {
            const on = !def(f[1]) || f[0] === 'Período' || f[0] === 'Tipo';
            const forte = !def(f[1]) && f[0] !== 'Período' && f[0] !== 'Tipo';
            return '<span style="display:inline-block;border-radius:14px;padding:4px 10px;margin:0 6px 6px 0;font-size:0.78rem;' +
                (forte ? 'background:#C2185B;color:#fff;border:1px solid #C2185B;' : 'background:#fff;border:1px solid ' + (on ? '#f0c4d4' : '#e5e5e5') + ';' + (on ? '' : 'opacity:.7;')) + '">' +
                '<span style="' + (forte ? 'opacity:.85;' : 'color:#888;') + '">' + f[0] + ':</span> <b style="' + (forte ? '' : 'color:#C2185B;') + '">' + String(f[1]).replace(/</g, '&lt;') + '</b></span>';
        };
        return filtros.map(chip).join('') + '';
    }
    window.__chipsFiltros = chipsFiltros;

    // Faixa com os filtros aplicados + botões de imprimir / PDF / CSV
    function renderBarraRelatorio(d) {
        const chips = chipsFiltros(d.filtros);
        const btn = (acao, icone, texto, cor) =>
            '<button type="button" onclick="exportarRelatorio(\'' + acao + '\')" class="btn-outline" style="flex:1 1 90px;display:inline-flex;align-items:center;justify-content:center;gap:6px;border-color:' + cor + ';color:' + cor + ';">' +
            '<i class="fas ' + icone + '"></i> ' + texto + '</button>';
        const totalCard = (d.tipo === 'vendas' || window.relatoriosState.tipoRelatorio === 'vendas') ? '' :
            '<div class="card" style="background:linear-gradient(135deg,#C2185B,#880E4F);color:#fff;margin:0 0 12px;">' +
            '<div style="font-size:0.85rem;opacity:0.9;">Total geral</div><div style="font-size:1.9rem;font-weight:800;">' + formatMoney(d.totalGeral) + '</div></div>';
        const ordOps = [['padrao', 'Padrão'], ['az', 'A → Z'], ['za', 'Z → A'], ['maior', 'Maior valor'], ['menor', 'Menor valor'], ['qtd-maior', 'Maior quantidade'], ['qtd-menor', 'Menor quantidade']];
        const ordSel = '<div style="display:flex;align-items:center;gap:8px;margin:6px 0;"><label style="font-size:0.8rem;color:#666;"><i class="fas fa-arrow-down-a-z"></i> Ordenar</label>' +
            '<select onchange="relatorioMudarOrdem(this.value)" style="flex:1;padding:8px;border:1.5px solid #ccc;border-radius:8px;font-family:var(--font-family);">' +
            ordOps.map(o => '<option value="' + o[0] + '"' + ((window.relatoriosState.ordem || 'padrao') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>';
        return '<div style="margin-bottom:12px;">' +
            '<div style="font-weight:700;color:#C2185B;margin-bottom:6px;"><i class="fas fa-filter"></i> Filtros aplicados</div>' +
            '<div>' + chips + '</div>' + ordSel +
            '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">' +
            btn('print', 'fa-print', 'Imprimir', '#455a64') + btn('pdf', 'fa-file-pdf', 'PDF', '#c62828') + btn('csv', 'fa-file-csv', 'CSV', '#2e7d32') +
            '</div></div>' + totalCard;
    }

    function renderRelatorioVendas(comandas, dados) {
        const st = window.relatoriosState;
        let totalGeral = 0;
        let dinheiro = 0, debito = 0, credito = 0, pix = 0;

        comandas.forEach(c => {
            totalGeral += totalDaComanda(c);
            const pagamentos = window.pagamentosLiquidos(c);
            pagamentos.forEach(p => {
                if (st.filtroEspecie !== 'todas' && p.forma !== st.filtroEspecie) return;
                const val = Number(p.valor || 0);
                if (p.forma === 'dinheiro') dinheiro += val;
                else if (p.forma === 'debito') debito += val;
                else if (p.forma === 'credito') credito += val;
                else if (p.forma === 'pix') pix += val;
            });
        });

        const totalFiltradoEspecie = dinheiro + debito + credito + pix;

        return `
            <div class="card" style="background:linear-gradient(135deg, #C2185B 0%, #880E4F 100%); color:#fff; margin-bottom:15px;">
                <div style="font-size:0.85rem; opacity:0.9;">Total geral${st.filtroEspecie !== 'todas' ? ' em ' + (ROTULO_ESPECIE[st.filtroEspecie] || st.filtroEspecie) : ' no período'}</div>
                <div style="font-size:2.2rem; font-weight:800; margin-top:5px;">${formatMoney(totalGeral)}</div>
                <div style="font-size:0.8rem; opacity:0.8; margin-top:5px;">Baseado em ${comandas.length} comandas</div>
                ${(function () { const a = dados.filtros.filter(f => !/^(todos|todas)$/i.test(String(f[1]).trim()) && f[0] !== 'Tipo'); return a.length ? '<div style="font-size:0.78rem;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.3);"><i class="fas fa-filter"></i> ' + a.map(f => f[0] + ': <b>' + String(f[1]).replace(/</g, '&lt;') + '</b>').join(' · ') + '</div>' : ''; })()}
            </div>

            <div class="card">
                <div class="card-title">💳 Resumo por Forma de Pagamento</div>
                ${st.filtroEspecie === 'todas' ? `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;"><span>💵 Dinheiro</span><b>${formatMoney(dinheiro)}</b></div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;"><span>💳 Débito</span><b>${formatMoney(debito)}</b></div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #eee;"><span>💳 Crédito</span><b>${formatMoney(credito)}</b></div>
                    <div style="display:flex; justify-content:space-between; padding:8px 0;"><span>📱 PIX</span><b>${formatMoney(pix)}</b></div>
                ` : `
                    <div style="display:flex; justify-content:space-between; padding:8px 0;">
                        <span>Total em ${st.filtroEspecie.toUpperCase()}</span>
                        <b style="color:var(--primary-color); font-size:1.2rem;">${formatMoney(totalFiltradoEspecie)}</b>
                    </div>
                `}
            </div>

            <div class="card">
                <div class="card-title">📋 Lista de Comandas</div>
                ${comandas.length === 0 ? '<p class="empty-state">Nenhuma comanda encontrada.</p>' : 
                  comandas.map(c => `
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee; cursor:pointer;" onclick="abrirComandaRelatorio(${c.id})">
                        <div>
                            <div style="font-weight:bold;">#${c.numero} - ${c.cliente || 'Sem nome'}</div>
                            <div style="font-size:0.75rem; color:#888;">${c.dataFechamento || c.dataAbertura}</div>
                        </div>
                        <div style="font-weight:bold; color:var(--primary-color);">${formatMoney(totalDaComanda(c))}</div>
                    </div>
                  `).join('')
                }
            </div>
        `;
    }

    function renderRelatorioProdutos(comandas) {
        const mapaProdutos = {};
        comandas.forEach(c => {
            window.normalizarArray(c.itens).forEach(i => {
                const nome = i.nome || 'Desconhecido';
                if (!mapaProdutos[nome]) mapaProdutos[nome] = { qtd: 0, total: 0 };
                mapaProdutos[nome].qtd += Number(i.quantidade);
                mapaProdutos[nome].total += Number(i.preco) * Number(i.quantidade);
            });
        });

        let lista = Object.keys(mapaProdutos).map(nome => ({
            nome: nome, qtd: mapaProdutos[nome].qtd, total: mapaProdutos[nome].total
        })).sort((a, b) => b.qtd - a.qtd);
        lista = ordenarRel(lista, x => x.nome, x => x.total, x => x.qtd);

        if (lista.length === 0) return '<p class="empty-state">Nenhum produto vendido.</p>';

        return `
            <div class="card">
                <div class="card-title">🍔 Produtos Mais Vendidos</div>
                ${lista.map((p, idx) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:24px; height:24px; background:#f0f0f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:bold;">${idx+1}</div>
                            <div>
                                <div style="font-weight:bold;">${p.nome}</div>
                                <div style="font-size:0.75rem; color:#888;">${p.qtd} unidades</div>
                            </div>
                        </div>
                        <div style="font-weight:bold; color:#2e7d32;">${formatMoney(p.total)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderRelatorioClientes(comandas) {
        const mapaClientes = {};
        comandas.forEach(c => {
            const nome = c.cliente || 'Sem nome';
            if (!mapaClientes[nome]) mapaClientes[nome] = { qtd: 0, total: 0 };
            mapaClientes[nome].qtd += 1;
            mapaClientes[nome].total += Number(c.total || 0);
        });

        let lista = Object.keys(mapaClientes).map(nome => ({
            nome: nome, qtd: mapaClientes[nome].qtd, total: mapaClientes[nome].total
        })).sort((a, b) => b.total - a.total);
        lista = ordenarRel(lista, x => x.nome, x => x.total, x => x.qtd);

        if (lista.length === 0) return '<p class="empty-state">Nenhum cliente encontrado.</p>';

        return `
            <div class="card">
                <div class="card-title">👥 Consumo por Cliente</div>
                ${lista.map(cli => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                        <div>
                            <div style="font-weight:bold;">${cli.nome}</div>
                            <div style="font-size:0.75rem; color:#888;">${cli.qtd} comanda(s)</div>
                        </div>
                        <div style="font-weight:bold; color:#2e7d32;">${formatMoney(cli.total)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderRelatorioCaixa(comandas) {
        let abertas = 0, fechadas = 0, canceladas = 0;
        let valorAberto = 0, valorFechado = 0;

        comandas.forEach(c => {
            const status = window.statusComandaNormalizado(c);
            if (status === 'aberta' || status === 'delivery') {
                abertas++; valorAberto += Number(c.total || 0);
            } else if (status === 'fechada') {
                fechadas++; valorFechado += Number(c.total || 0);
            } else if (status === 'cancelada') {
                canceladas++;
            }
        });

        return `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:15px;">
                <div class="card" style="margin:0; border-left:4px solid #4caf50;">
                    <div style="font-size:0.75rem; color:#666;">Fechadas</div>
                    <div style="font-size:1.5rem; font-weight:bold;">${fechadas}</div>
                    <div style="font-size:0.8rem; color:#2e7d32;">${formatMoney(valorFechado)}</div>
                </div>
                <div class="card" style="margin:0; border-left:4px solid #ff9800;">
                    <div style="font-size:0.75rem; color:#666;">Em Aberto</div>
                    <div style="font-size:1.5rem; font-weight:bold;">${abertas}</div>
                    <div style="font-size:0.8rem; color:#e65100;">${formatMoney(valorAberto)}</div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">📋 Comandas do Período (Auditoria)</div>
                ${comandas.length === 0 ? '<p class="empty-state">Nenhuma comanda.</p>' : 
                  comandas.map(c => {
                    const status = window.statusComandaNormalizado(c);
                    const cor = status === 'fechada' ? '#4caf50' : status === 'cancelada' ? '#c62828' : '#ff9800';
                    return `
                    <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #eee;">
                        <div>
                            <div style="font-weight:bold;">#${c.numero} - ${c.cliente || 'Sem nome'}</div>
                            <div style="font-size:0.75rem; color:${cor}; text-transform:uppercase; font-weight:bold;">${status}</div>
                        </div>
                        <div style="font-weight:bold; color:#333;">${formatMoney(c.total)}</div>
                    </div>
                  `}).join('')
                }
            </div>
        `;
    }

    window.abrirComandaRelatorio = function(id) {
        window.comandaIdAtual = id;
        window.comandaOrigem = 'relatorios';
        window.rotaOrigem = 'relatorios';
        navigateTo('detalhe-comanda');
    };
}