// ============================================================
// MOVIMENTACAOESTOQUE.JS — v5 (completo, idempotente)
// ============================================================

if (window.renderMovimentacaoEstoque) {
    console.log('⚠️ MovimentacaoEstoque.js já carregado — ignorando duplicata');
} else {
    console.log('✔ MovimentacaoEstoque.js v5 carregado');

    window.movEstoqueState = {
        movs: [],
        produtos: [],
        colaboradores: [],
        filtroPeriodo: '7dias',
        dataIni: '',
        dataFim: '',
        filtroTipo: 'todas',
        filtroProduto: '',
        termoBusca: '',
        novoTipo: 'entrada'
    };

    window.MOTIVOS_MOV_ESTOQUE = [
        { id: 'compra',        label: 'Compra / Reposição' },
        { id: 'devolucao',     label: 'Devolução de cliente' },
        { id: 'ajuste',        label: 'Ajuste de inventário' },
        { id: 'transferencia', label: 'Transferência' },
        { id: 'venda',         label: 'Venda' },
        { id: 'perda',         label: 'Perda / Quebra' },
        { id: 'uso_interno',   label: 'Uso interno' },
        { id: 'outro',         label: 'Outro' }
    ];

    // ============================================================
    // RENDER PRINCIPAL
    // ============================================================
    window.renderMovimentacaoEstoque = function() {
        setTimeout(carregarMovimentacaoEstoque, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Movimentação de Estoque</h1>',
            '    <div style="display:flex;gap:2px;">',
            '        <button class="icon-btn" onclick="imprimirMovimentacaoEstoque()" title="Imprimir"><i class="fas fa-print"></i></button>',
            '        <button class="icon-btn" onclick="abrirModalNovaMov()" title="Nova movimentação"><i class="fas fa-plus"></i></button>',
            '    </div>',
            '</div>',

            '<div style="padding:12px 16px;background:#e3f2fd;border-bottom:1px solid #bbdefb;">',
            '    <div style="font-size:0.85rem;color:#1565c0;line-height:1.5;">',
            '        <i class="fas fa-info-circle"></i>',
            '        Registre entradas (compras) e saídas (vendas, perdas, uso interno). O estoque é atualizado automaticamente.',
            '    </div>',
            '</div>',

            // Filtros
            '<div style="background:#fff;border-bottom:1px solid #eee;">',
            '    <details id="mov-filtros-details">',
            '        <summary style="padding:12px 16px;cursor:pointer;font-weight:600;color:var(--primary-color);font-size:0.9rem;">',
            '            <i class="fas fa-filter"></i> Filtros',
            '            <span id="mov-filtros-resumo" style="font-size:0.75rem;color:#888;font-weight:400;margin-left:6px;"></span>',
            '        </summary>',
            '        <div style="padding:0 16px 12px;">',
            '            <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
            '            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="mov-chips-data"></div>',
            '            <div id="mov-custom-date" style="display:none;margin-top:10px;">',
            '                <div style="display:flex;gap:8px;">',
            '                    <div style="flex:1;">',
            '                        <label style="font-size:0.7rem;color:#888;">Inicial</label>',
            '                        <input type="date" id="mov-data-ini" onchange="aplicarFiltrosMov()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
            '                    </div>',
            '                    <div style="flex:1;">',
            '                        <label style="font-size:0.7rem;color:#888;">Final</label>',
            '                        <input type="date" id="mov-data-fim" onchange="aplicarFiltrosMov()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
            '                    </div>',
            '                </div>',
            '            </div>',
            '        </div>',
            '        <div style="padding:0 16px 12px;">',
            '            <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Tipo</label>',
            '            <div style="display:flex;gap:6px;" id="mov-chips-tipo"></div>',
            '        </div>',
            '        <div style="padding:0 16px 12px;">',
            '            <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Produto</label>',
            '            <select id="mov-filtro-produto" onchange="aplicarFiltrosMov()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
            '                <option value="">Todos</option>',
            '            </select>',
            '        </div>',
            '        <div style="padding:0 16px 12px;">',
            '            <button class="btn-outline" style="width:100%;font-size:0.85rem;padding:8px;" onclick="limparFiltrosMov()">',
            '                <i class="fas fa-eraser"></i> Limpar filtros',
            '            </button>',
            '        </div>',
            '    </details>',
            '</div>',

            // Busca
            '<div class="input-busca">',
            '    <input type="text" placeholder="Pesquisar por produto ou motivo" id="mov-busca" oninput="filtrarMovTexto()">',
            '    <button class="btn-limpar" onclick="limparBuscaMov()"><i class="fas fa-xmark"></i></button>',
            '</div>',

            // Conteúdo
            '<div class="content-area" id="mov-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>',

            // FAB
            '<button class="fab" onclick="abrirModalNovaMov()" title="Nova movimentação">',
            '    <i class="fas fa-plus"></i>',
            '</button>'
        ].join('\n');
    };

    // ============================================================
    // CARREGA
    // ============================================================
    async function carregarMovimentacaoEstoque() {
        const container = document.getElementById('mov-conteudo');
        if (!container) return;

        try {
            const resultados = await Promise.all([
                apiGet('movimentacoes').catch(function() { return []; }),
                apiGet('produtos').catch(function() { return []; }),
                apiGet('colaboradores').catch(function() { return []; })
            ]);

            window.movEstoqueState.movs = window.normalizarArray(resultados[0]);
            window.movEstoqueState.produtos = window.normalizarArray(resultados[1]);
            window.movEstoqueState.colaboradores = window.normalizarArray(resultados[2]);

            renderChipsDataMov();
            renderChipsTipoMov();
            preencherSelectProdutoMov();
            atualizarResumoFiltrosMov();
            renderConteudoMov();
        } catch (e) {
            console.error('❌ Erro ao carregar movimentações:', e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    window.carregarMovimentacaoEstoque = carregarMovimentacaoEstoque;

    // ============================================================
    // CHIPS
    // ============================================================
    function renderChipsDataMov() {
        const container = document.getElementById('mov-chips-data');
        if (!container) return;

        const abas = [
            { id: 'hoje',   label: 'Hoje' },
            { id: '7dias',  label: '7 dias' },
            { id: '30dias', label: '30 dias' },
            { id: 'mes',    label: 'Mês atual' },
            { id: 'todas',  label: 'Todas' },
            { id: 'custom', label: '📅 Personalizado' }
        ];
        const ativa = window.movEstoqueState.filtroPeriodo;

        container.innerHTML = abas.map(function(a) {
            const isAtivo = a.id === ativa ? 'ativo' : '';
            return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroPeriodoMov(\'' + a.id + '\')" style="font-size:0.78rem;">' + a.label + '</button>';
        }).join('');

        const custom = document.getElementById('mov-custom-date');
        if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
    }

    window.mudarFiltroPeriodoMov = function(filtro) {
        window.movEstoqueState.filtroPeriodo = filtro;
        renderChipsDataMov();
        atualizarResumoFiltrosMov();
        renderConteudoMov();
    };

    function renderChipsTipoMov() {
        const container = document.getElementById('mov-chips-tipo');
        if (!container) return;

        const abas = [
            { id: 'todas',   label: 'Todas' },
            { id: 'entrada', label: '▲ Entradas' },
            { id: 'saida',   label: '▼ Saídas' }
        ];
        const ativa = window.movEstoqueState.filtroTipo;

        container.innerHTML = abas.map(function(a) {
            const isAtivo = a.id === ativa ? 'ativo' : '';
            return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroTipoMov(\'' + a.id + '\')" style="flex:1;font-size:0.8rem;">' + a.label + '</button>';
        }).join('');
    }

    window.mudarFiltroTipoMov = function(filtro) {
        window.movEstoqueState.filtroTipo = filtro;
        renderChipsTipoMov();
        atualizarResumoFiltrosMov();
        renderConteudoMov();
    };

    // ============================================================
    // SELECT PRODUTO
    // ============================================================
    function preencherSelectProdutoMov() {
        const sel = document.getElementById('mov-filtro-produto');
        if (!sel) return;

        sel.innerHTML = '<option value="">Todos</option>';
        const mapa = {};
        window.movEstoqueState.movs.forEach(function(m) {
            if (m.produtoId) mapa[m.produtoId] = m.produto;
        });
        Object.keys(mapa).sort(function(a, b) {
            return String(mapa[a]).localeCompare(String(mapa[b]));
        }).forEach(function(id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = mapa[id];
            sel.appendChild(opt);
        });
    }

    // ============================================================
    // FILTROS
    // ============================================================
    window.aplicarFiltrosMov = function() {
        const s = window.movEstoqueState;
        s.dataIni = (document.getElementById('mov-data-ini') || {}).value || '';
        s.dataFim = (document.getElementById('mov-data-fim') || {}).value || '';
        s.filtroProduto = (document.getElementById('mov-filtro-produto') || {}).value || '';
        atualizarResumoFiltrosMov();
        renderConteudoMov();
    };

    window.limparFiltrosMov = function() {
        const s = window.movEstoqueState;
        s.filtroPeriodo = '7dias';
        s.dataIni = '';
        s.dataFim = '';
        s.filtroTipo = 'todas';
        s.filtroProduto = '';
        s.termoBusca = '';

        const sel = document.getElementById('mov-filtro-produto');
        if (sel) sel.value = '';
        const busca = document.getElementById('mov-busca');
        if (busca) busca.value = '';

        renderChipsDataMov();
        renderChipsTipoMov();
        atualizarResumoFiltrosMov();
        renderConteudoMov();
    };

    function atualizarResumoFiltrosMov() {
        const el = document.getElementById('mov-filtros-resumo');
        if (!el) return;

        const s = window.movEstoqueState;
        const partes = [];
        const labels = { 'hoje': 'Hoje', '7dias': '7 dias', '30dias': '30 dias', 'mes': 'Mês atual', 'todas': 'Todas', 'custom': 'Personalizado' };
        partes.push(labels[s.filtroPeriodo] || s.filtroPeriodo);
        if (s.filtroTipo !== 'todas') partes.push(s.filtroTipo === 'entrada' ? 'Entradas' : 'Saídas');
        if (s.filtroProduto) partes.push('Produto');
        el.textContent = '(' + partes.join(' · ') + ')';
    }

    window.filtrarMovTexto = function() {
        window.movEstoqueState.termoBusca = (document.getElementById('mov-busca') || {}).value || '';
        renderConteudoMov();
    };

    window.limparBuscaMov = function() {
        window.movEstoqueState.termoBusca = '';
        const input = document.getElementById('mov-busca');
        if (input) input.value = '';
        renderConteudoMov();
    };

    // ============================================================
    // INTERVALO E FILTRO
    // ============================================================
    function calcularIntervaloMov() {
        const filtro = window.movEstoqueState.filtroPeriodo;
        const agora = new Date();
        let ini = null, fim = null;

        if (filtro === 'hoje') {
            ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
            fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
        } else if (filtro === '7dias') {
            ini = new Date(agora); ini.setDate(ini.getDate() - 7); fim = agora;
        } else if (filtro === '30dias') {
            ini = new Date(agora); ini.setDate(ini.getDate() - 30); fim = agora;
        } else if (filtro === 'mes') {
            ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
            fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
        } else if (filtro === 'custom') {
            const s = window.movEstoqueState;
            if (s.dataIni) ini = new Date(s.dataIni + 'T00:00:00');
            if (s.dataFim) fim = new Date(s.dataFim + 'T23:59:59');
        }
        return { ini: ini, fim: fim };
    }

    function filtrarMovs() {
        let lista = window.movEstoqueState.movs.slice();
        const s = window.movEstoqueState;

        const intervalo = calcularIntervaloMov();
        if (intervalo.ini || intervalo.fim) {
            lista = lista.filter(function(m) {
                const dataRef = m.dataHora || m.data || '';
                const data = window.parseDataBR(dataRef);
                if (!data) return false;
                if (intervalo.ini && data < intervalo.ini) return false;
                if (intervalo.fim && data > intervalo.fim) return false;
                return true;
            });
        }

        if (s.filtroTipo !== 'todas') {
            lista = lista.filter(function(m) { return m.tipo === s.filtroTipo; });
        }

        if (s.filtroProduto) {
            lista = lista.filter(function(m) { return String(m.produtoId) === String(s.filtroProduto); });
        }

        const busca = String(s.termoBusca || '').trim().toLowerCase();
        if (busca) {
            lista = lista.filter(function(m) {
                return String(m.produto || '').toLowerCase().indexOf(busca) >= 0 ||
                       String(m.motivo || '').toLowerCase().indexOf(busca) >= 0 ||
                       String(m.observacao || '').toLowerCase().indexOf(busca) >= 0;
            });
        }

        lista.sort(function(a, b) {
            const da = a.dataHora || a.data || '';
            const db = b.dataHora || b.data || '';
            return String(db).localeCompare(String(da));
        });

        return lista;
    }

    // ============================================================
    // RENDER CONTEÚDO
    // ============================================================
    function renderConteudoMov() {
        const container = document.getElementById('mov-conteudo');
        if (!container) return;

        try {
            const lista = filtrarMovs();

            let totalEntradas = 0, totalSaidas = 0, qtdEntradas = 0, qtdSaidas = 0;
            lista.forEach(function(m) {
                const q = Number(m.quantidade || 0);
                if (m.tipo === 'entrada') { totalEntradas += q; qtdEntradas++; }
                else if (m.tipo === 'saida') { totalSaidas += q; qtdSaidas++; }
            });

            let html = '';

            html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #00897b 0%, #004d40 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
            html += '    <div style="font-size:0.75rem;opacity:0.9;">' + getPeriodoTextoMov() + '</div>';
            html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">';
            html += '        <div>';
            html += '            <div style="font-size:0.7rem;opacity:0.85;">▲ ENTRADAS</div>';
            html += '            <div style="font-size:1.4rem;font-weight:700;">' + totalEntradas + '</div>';
            html += '            <div style="font-size:0.75rem;opacity:0.85;">' + qtdEntradas + ' registro(s)</div>';
            html += '        </div>';
            html += '        <div>';
            html += '            <div style="font-size:0.7rem;opacity:0.85;">▼ SAÍDAS</div>';
            html += '            <div style="font-size:1.4rem;font-weight:700;">' + totalSaidas + '</div>';
            html += '            <div style="font-size:0.75rem;opacity:0.85;">' + qtdSaidas + ' registro(s)</div>';
            html += '        </div>';
            html += '    </div>';
            html += '</div>';

            if (lista.length === 0) {
                html += '<div class="card" style="text-align:center;padding:30px;">';
                html += '    <i class="fas fa-boxes" style="font-size:3rem;color:#ccc;"></i>';
                html += '    <p style="margin-top:15px;color:#888;">Nenhuma movimentação no período</p>';
                html += '    <button class="btn-primary" style="margin-top:15px;" onclick="abrirModalNovaMov()">';
                html += '        <i class="fas fa-plus"></i> Registrar movimentação';
                html += '    </button>';
                html += '</div>';
            } else {
                html += '<div class="card">';
                html += '    <div class="card-title">📋 Movimentações (' + lista.length + ')</div>';
                lista.forEach(function(m) {
                    html += renderItemMov(m);
                });
                html += '</div>';
            }

            container.innerHTML = html;
        } catch (e) {
            console.error('❌ Erro ao renderizar movimentações:', e);
            container.innerHTML =
                '<div class="card" style="padding:20px;text-align:center;">' +
                '    <i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i>' +
                '    <p style="margin-top:10px;color:#c62828;font-weight:600;">Erro ao renderizar</p>' +
                '    <p style="font-size:0.8rem;color:#666;margin-top:6px;">' + e.message + '</p>' +
                '</div>';
        }
    }

    function renderItemMov(m) {
        const entrada = m.tipo === 'entrada';
        const cor = entrada ? '#2e7d32' : '#c62828';
        const icone = entrada ? 'fa-arrow-up' : 'fa-arrow-down';
        const label = entrada ? 'Entrada' : 'Saída';

        const dataTexto = m.dataHora || m.data || '—';
        const obsHTML = m.observacao ? '<div style="font-size:0.72rem;color:#888;margin-top:2px;"><i class="fas fa-comment"></i> ' + m.observacao + '</div>' : '';
        const colabHTML = m.colaboradorNome ? '<div style="font-size:0.72rem;color:#888;"><i class="fas fa-user"></i> ' + m.colaboradorNome + '</div>' : '';
        const motivoHTML = m.motivo ? '<div style="font-size:0.75rem;color:' + cor + ';margin-top:2px;"><i class="fas fa-tag"></i> ' + m.motivo + '</div>' : '';

        return '<div style="padding:12px 0;border-bottom:1px solid #f0f0f0;">' +
               '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
               '        <div style="display:flex;align-items:flex-start;gap:10px;flex:1;min-width:0;">' +
               '            <div style="width:32px;height:32px;border-radius:50%;background:' + cor + '20;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
               '                <i class="fas ' + icone + '" style="color:' + cor + ';"></i>' +
               '            </div>' +
               '            <div style="flex:1;min-width:0;">' +
               '                <div style="font-weight:600;font-size:0.9rem;">' + (m.produto || 'Produto') + '</div>' +
               '                <div style="font-size:0.75rem;color:' + cor + ';font-weight:600;">' + label + ' · ' + (m.quantidade || 0) + ' un</div>' +
               motivoHTML +
               '                <div style="font-size:0.72rem;color:#888;margin-top:2px;"><i class="fas fa-calendar"></i> ' + dataTexto + '</div>' +
               colabHTML +
               obsHTML +
               '            </div>' +
               '        </div>' +
               '        <div style="text-align:right;">' +
               '            <button class="btn-limpar" onclick="excluirMov(' + m.id + ')" title="Excluir" style="padding:4px;">' +
               '                <i class="fas fa-trash" style="color:#c62828;font-size:0.85rem;"></i>' +
               '            </button>' +
               '        </div>' +
               '    </div>' +
               '</div>';
    }

    // ============================================================
    // MODAL — NOVA MOVIMENTAÇÃO
    // ============================================================
    window.abrirModalNovaMov = async function() {
        try {
            const produtos = await apiGet('produtos');
            window.movEstoqueState.produtos = window.normalizarArray(produtos);
        } catch (e) {
            console.error('Erro ao buscar produtos:', e);
        }

        const ativos = window.movEstoqueState.produtos.filter(function(p) { return p.inativo !== true; });
        if (ativos.length === 0) {
            alert('Nenhum produto cadastrado');
            return;
        }

        let opcoesProdutos = '<option value="">-- Selecione --</option>';
        ativos.slice().sort(function(a, b) {
            return String(a.nome || '').localeCompare(String(b.nome || ''));
        }).forEach(function(p) {
            opcoesProdutos += '<option value="' + p.id + '" data-estoque="' + (p.estoque || 0) + '">' +
                p.nome + ' (estoque: ' + (p.estoque || 0) + ')' +
                '</option>';
        });

        let opcoesMotivosEntrada = '';
        let opcoesMotivosSaida = '';
        window.MOTIVOS_MOV_ESTOQUE.forEach(function(m) {
            const opt = '<option value="' + m.id + '">' + m.label + '</option>';
            if (['compra', 'devolucao', 'ajuste', 'transferencia'].indexOf(m.id) >= 0) {
                opcoesMotivosEntrada += opt;
            } else {
                opcoesMotivosSaida += opt;
            }
        });

        let opcoesColabs = '<option value="">-- Sem responsável --</option>';
        window.movEstoqueState.colaboradores.slice().sort(function(a, b) {
            return String(a.nome || '').localeCompare(String(b.nome || ''));
        }).forEach(function(c) {
            opcoesColabs += '<option value="' + c.id + '">' + c.nome + (c.funcao ? ' — ' + c.funcao : '') + '</option>';
        });

        const anterior = document.getElementById('modal-nova-mov');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-nova-mov';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function(e) { if (e.target === modal) fecharModalNovaMov(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:480px;">' +
            '    <div class="modal-header" style="background:#00897b;color:#fff;">' +
            '        <strong>Nova Movimentação</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalNovaMov()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
            '    </div>' +
            '    <div class="modal-body">' +
            '        <div class="field">' +
            '            <label>Tipo *</label>' +
            '            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
            '                <button type="button" class="btn-tipo-mov" data-tipo="entrada" onclick="selecionarTipoMov(\'entrada\')" style="padding:12px;border-radius:8px;border:2px solid #ccc;background:#fff;cursor:pointer;font-family:var(--font-family);font-weight:600;color:#2e7d32;"><i class="fas fa-arrow-up"></i> Entrada</button>' +
            '                <button type="button" class="btn-tipo-mov" data-tipo="saida" onclick="selecionarTipoMov(\'saida\')" style="padding:12px;border-radius:8px;border:2px solid #ccc;background:#fff;cursor:pointer;font-family:var(--font-family);font-weight:600;color:#c62828;"><i class="fas fa-arrow-down"></i> Saída</button>' +
            '            </div>' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>Produto *</label>' +
            '            <select id="mov-produto" onchange="atualizarInfoProdutoMov()">' + opcoesProdutos + '</select>' +
            '            <small id="mov-produto-info" style="color:#888;font-size:0.75rem;"></small>' +
            '        </div>' +
            '        <div class="field"><label>Quantidade *</label>' +
            '            <input type="number" min="1" id="mov-qtd" value="1"></div>' +
            '        <div class="field"><label>Motivo *</label>' +
            '            <select id="mov-motivo">' +
            '                <optgroup label="Entradas" id="mov-motivos-entrada">' + opcoesMotivosEntrada + '</optgroup>' +
            '                <optgroup label="Saídas" id="mov-motivos-saida">' + opcoesMotivosSaida + '</optgroup>' +
            '            </select></div>' +
            '        <div class="field"><label>Responsável</label>' +
            '            <select id="mov-colaborador">' + opcoesColabs + '</select></div>' +
            '        <div class="field"><label>Observação</label>' +
            '            <input type="text" id="mov-obs" maxlength="100" placeholder="Detalhes adicionais"></div>' +
            '        <button class="btn-primary" style="background:#00897b;margin-top:15px;" onclick="salvarNovaMov()">' +
            '            <i class="fas fa-check"></i> Registrar Movimentação</button>' +
            '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalNovaMov()">Cancelar</button>' +
            '    </div></div>';

        document.body.appendChild(modal);

        window.movEstoqueState.novoTipo = 'entrada';
        selecionarTipoMov('entrada');
        atualizarInfoProdutoMov();
    };

    window.fecharModalNovaMov = function() {
        const m = document.getElementById('modal-nova-mov');
        if (m) m.remove();
    };

    // ============================================================
    // TIPO
    // ============================================================
    window.selecionarTipoMov = function(tipo) {
        window.movEstoqueState.novoTipo = tipo;

        document.querySelectorAll('.btn-tipo-mov').forEach(function(btn) {
            const ativo = btn.getAttribute('data-tipo') === tipo;
            const cor = tipo === 'entrada' ? '#2e7d32' : '#c62828';
            btn.style.borderColor = ativo ? cor : '#ccc';
            btn.style.background = ativo ? (tipo === 'entrada' ? '#e8f5e9' : '#ffebee') : '#fff';
        });

        const optEntrada = document.getElementById('mov-motivos-entrada');
        const optSaida = document.getElementById('mov-motivos-saida');
        if (optEntrada && optSaida) {
            optEntrada.style.display = tipo === 'entrada' ? '' : 'none';
            optSaida.style.display = tipo === 'saida' ? '' : 'none';
            const sel = document.getElementById('mov-motivo');
            if (sel) {
                const opcoes = Array.from(sel.options).filter(function(o) {
                    return o.parentElement && o.parentElement.style.display !== 'none';
                });
                if (opcoes.length > 0) sel.value = opcoes[0].value;
            }
        }
    };

    // ============================================================
    // INFO DO PRODUTO
    // ============================================================
    window.atualizarInfoProdutoMov = function() {
        const sel = document.getElementById('mov-produto');
        const info = document.getElementById('mov-produto-info');
        if (!sel || !info) return;

        const opt = sel.options[sel.selectedIndex];
        if (opt && opt.value) {
            const estoque = opt.getAttribute('data-estoque') || '0';
            info.textContent = 'Estoque atual: ' + estoque + ' un';
        } else {
            info.textContent = '';
        }
    };

    // ============================================================
    // SALVAR (completo)
    // ============================================================
    window.salvarNovaMov = async function() {
        try {
            const tipo = window.movEstoqueState.novoTipo || 'entrada';
            const produtoId = document.getElementById('mov-produto').value;
            if (!produtoId) { alert('Selecione o produto'); return; }

            const qtd = parseInt(document.getElementById('mov-qtd').value) || 0;
            if (qtd <= 0) { alert('Informe uma quantidade válida'); return; }

            const motivoId = document.getElementById('mov-motivo').value;
            const motivoObj = window.MOTIVOS_MOV_ESTOQUE.find(function(m) { return m.id === motivoId; });
            const motivoTexto = motivoObj ? motivoObj.label : motivoId;

            const colaboradorId = document.getElementById('mov-colaborador').value;
            const colaborador = window.movEstoqueState.colaboradores.find(function(c) { return String(c.id) === String(colaboradorId); });

            const obs = (document.getElementById('mov-obs').value || '').trim();

            const produtos = window.normalizarArray(await apiGet('produtos'));
            const idxProduto = produtos.findIndex(function(p) { return String(p.id) === String(produtoId); });
            if (idxProduto < 0) { alert('Produto não encontrado'); return; }
            const produto = produtos[idxProduto];

            const estoqueAtual = Number(produto.estoque || 0);

            if (tipo === 'saida' && qtd > estoqueAtual) {
                if (!await window.confirmar('Quantidade (' + qtd + ') maior que o estoque (' + estoqueAtual + ').\n\nRegistrar mesmo assim?')) return;
            }

            // Atualiza estoque
            produto.estoque = tipo === 'entrada' ? (estoqueAtual + qtd) : Math.max(0, estoqueAtual - qtd);
            produtos[idxProduto] = produto;
            await apiSave('produtos', produtos);

            // Registra movimentação
            const agora = new Date();
            const dataHora = agora.toLocaleDateString('pt-BR') + ' ' +
                             String(agora.getHours()).padStart(2, '0') + ':' +
                             String(agora.getMinutes()).padStart(2, '0');

            const novaMov = {
                id: Date.now(),
                tipo: tipo,
                produtoId: produto.id,
                produto: produto.nome,
                quantidade: qtd,
                estoqueAntes: estoqueAtual,
                estoqueDepois: produto.estoque,
                motivoId: motivoId,
                motivo: motivoTexto,
                colaboradorId: colaborador ? colaborador.id : null,
                colaboradorNome: colaborador ? colaborador.nome : '',
                observacao: obs,
                dataHora: dataHora,
                data: agora.toLocaleDateString('pt-BR'),
                usuario: (function() { try { return localStorage.getItem('garcomAtual') || 'Operador'; } catch (e) { return 'Operador'; } })()
            };

            const movs = window.normalizarArray(await apiGet('movimentacoes'));
            movs.push(novaMov);
            await apiSave('movimentacoes', movs);

            fecharModalNovaMov();
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ ' + (tipo === 'entrada' ? 'Entrada' : 'Saída') + ' registrada: ' + qtd + ' un');
            } else {
                alert('✅ Movimentação registrada');
            }

            carregarMovimentacaoEstoque();
        } catch (e) {
            console.error('Erro ao salvar movimentação:', e);
            alert('Erro: ' + e.message);
        }
    };

    // ============================================================
    // EXCLUIR
    // ============================================================
    window.excluirMov = async function(id) {
        const mov = window.movEstoqueState.movs.find(function(m) { return String(m.id) === String(id); });
        if (!mov) return;

        const estorno = mov.tipo === 'entrada' ? 'remover do estoque' : 'devolver ao estoque';

        if (!await window.confirmar(
            'Excluir esta movimentação?\n\n' +
            'Produto: ' + mov.produto + '\n' +
            'Quantidade: ' + mov.quantidade + ' un (' + mov.tipo + ')\n\n' +
            'O estoque será ajustado (' + estorno + ').'
        )) return;

        try {
            const produtos = window.normalizarArray(await apiGet('produtos'));
            const idx = produtos.findIndex(function(p) { return String(p.id) === String(mov.produtoId); });
            if (idx >= 0) {
                const qtd = Number(mov.quantidade || 0);
                produtos[idx].estoque = mov.tipo === 'entrada'
                    ? Math.max(0, Number(produtos[idx].estoque || 0) - qtd)
                    : Number(produtos[idx].estoque || 0) + qtd;
                await apiSave('produtos', produtos);
            }

            const movs = window.normalizarArray(await apiGet('movimentacoes'));
            const novaLista = movs.filter(function(m) { return String(m.id) !== String(id); });
            await apiSave('movimentacoes', novaLista);

            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('✅ Movimentação excluída');
            }
            carregarMovimentacaoEstoque();
        } catch (e) {
            console.error('Erro ao excluir:', e);
            alert('Erro: ' + e.message);
        }
    };

    // ============================================================
    // HELPERS
    // ============================================================
    function getPeriodoTextoMov() {
        const f = window.movEstoqueState.filtroPeriodo;
        const map = {
            'hoje': '📅 Hoje', '7dias': '📅 Últimos 7 dias', '30dias': '📅 Últimos 30 dias',
            'mes': '📅 Mês atual', 'todas': '📅 Todas'
        };
        if (f === 'custom') {
            const s = window.movEstoqueState;
            if (s.dataIni && s.dataFim) return '📅 ' + s.dataIni + ' a ' + s.dataFim;
            if (s.dataIni) return '📅 De ' + s.dataIni;
            if (s.dataFim) return '📅 Até ' + s.dataFim;
            return '📅 Personalizado';
        }
        return map[f] || '';
    }

    // ============================================================
    // IMPRESSÃO
    // ============================================================
    window.imprimirMovimentacaoEstoque = function() {
        const lista = filtrarMovs();

        let totalEntradas = 0;
        let totalSaidas = 0;
        lista.forEach(function(m) {
            const q = Number(m.quantidade || 0);
            if (m.tipo === 'entrada') totalEntradas += q;
            else totalSaidas += q;
        });

        let itensHTML = '';
        lista.forEach(function(m) {
            itensHTML += '<tr>' +
                         '<td>' + (m.dataHora || m.data || '') + '</td>' +
                         '<td>' + (m.tipo === 'entrada' ? '▲' : '▼') + ' ' + (m.produto || '') + '</td>' +
                         '<td style="text-align:center;">' + (m.quantidade || 0) + '</td>' +
                         '<td>' + (m.motivo || '') + '</td>' +
                         '</tr>';
        });

        const agora = new Date();
        const dataTexto = agora.toLocaleDateString('pt-BR') + ' ' +
                          String(agora.getHours()).padStart(2, '0') + ':' +
                          String(agora.getMinutes()).padStart(2, '0');

        const janela = window.open('', '', 'width=700,height=800');
        janela.document.write(
            '<html><head><title>Movimentação de Estoque</title>' +
            '<style>' +
            'body{font-family:monospace;font-size:11px;padding:15px;}' +
            'h1{font-size:16px;text-align:center;}' +
            'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
            'th{border-bottom:1px solid #000;padding:4px;text-align:left;}' +
            'td{padding:3px 4px;border-bottom:1px dotted #ccc;}' +
            'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
            '</style></head><body>' +
            '<h1>MOVIMENTAÇÃO DE ESTOQUE</h1>' +
            '<div style="text-align:center;">' + getPeriodoTextoMov() + '</div>' +
            '<div style="text-align:center;font-size:10px;">Emitido em ' + dataTexto + '</div>' +
            '<hr>' +
            '<div>Total entradas: <b>' + totalEntradas + '</b> un</div>' +
            '<div>Total saídas: <b>' + totalSaidas + '</b> un</div>' +
            '<div>Registros: <b>' + lista.length + '</b></div>' +
            '<hr>' +
            '<table>' +
            '<thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Motivo</th></tr></thead>' +
            '<tbody>' + itensHTML + '</tbody>' +
            '</table>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>' +
            '</body></html>'
        );
        janela.document.close();
    };

    console.log('✔ MovimentacaoEstoque.js v5 — todas as funções expostas');
}