// ============================================================
// PRODUTOSVENDIDOS.JS — Relatório de produtos vendidos
// Filtros: hoje, ontem, 7 dias, 30 dias, mês, personalizado
// Agrupa por produto e mostra quantidade + valor total
// ============================================================

console.log('✔ ProdutosVendidos.js carregado');

window.produtosVendidosState = {
    comandas: [],
    produtos: [],
    filtroData: 'hoje',
    dataIni: '',
    dataFim: '',
    filtroGrupo: '',
    termoBusca: '',
    ordenar: 'valor'  // valor | quantidade | nome
};

// ============================================================
// RENDER
// ============================================================
window.renderProdutosVendidos = function() {
    setTimeout(carregarProdutosVendidos, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Produtos Vendidos</h1>',
        '    <button class="icon-btn" onclick="imprimirProdutosVendidos()" title="Imprimir"><i class="fas fa-print"></i></button>',
        '</div>',

        // Filtros de período
        '<div style="padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">',
        '    <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
        '    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="pv-chips-data"></div>',
        '    <div id="pv-custom-date" style="display:none;margin-top:10px;">',
        '        <div style="display:flex;gap:8px;">',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Inicial</label>',
        '                <input type="date" id="pv-data-ini" onchange="aplicarFiltrosPV()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Final</label>',
        '                <input type="date" id="pv-data-fim" onchange="aplicarFiltrosPV()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '        </div>',
        '    </div>',
        '</div>',

        // Filtros de grupo + ordenação
        '<div style="padding:12px 16px;background:#fff;border-bottom:1px solid #eee;display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
        '    <div>',
        '        <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Grupo</label>',
        '        <select id="pv-filtro-grupo" onchange="aplicarFiltrosPV()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '            <option value="">Todos</option>',
        '        </select>',
        '    </div>',
        '    <div>',
        '        <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Ordenar por</label>',
        '        <select id="pv-ordenar" onchange="aplicarFiltrosPV()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '            <option value="valor">Maior valor</option>',
        '            <option value="quantidade">Maior quantidade</option>',
        '            <option value="nome">Nome A-Z</option>',
        '            <option value="nome-za">Nome Z-A</option>',
        '            <option value="valor-menor">Menor valor</option>',
        '            <option value="quantidade-menor">Menor quantidade</option>',
        '        </select>',
        '    </div>',
        '</div>',

        // Busca
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar produto" id="pv-busca" oninput="aplicarFiltrosPV()">',
        '    <button class="btn-limpar" onclick="limparBuscaPV()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // Conteúdo
        '<div class="content-area" id="pv-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarProdutosVendidos() {
    const container = document.getElementById('pv-conteudo');
    if (!container) return;

    try {
        const [comandas, grupos] = await Promise.all([
            apiGet('comandas').catch(function() { return []; }),
            apiGet('grupos').catch(function() { return []; })
        ]);

        window.produtosVendidosState.comandas = window.normalizarArray(comandas);
        window.produtosVendidosState.grupos = window.normalizarArray(grupos);

        renderChipsDataPV();
        preencherSelectGrupoPV();
        renderConteudoPV();
    } catch (e) {
        console.error('❌ Erro PV:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.carregarProdutosVendidos = carregarProdutosVendidos;

// ============================================================
// CHIPS PERÍODO
// ============================================================
function renderChipsDataPV() {
    const container = document.getElementById('pv-chips-data');
    if (!container) return;

    const abas = [
        { id: 'hoje',   label: 'Hoje' },
        { id: 'ontem',  label: 'Ontem' },
        { id: '7dias',  label: '7 dias' },
        { id: '30dias', label: '30 dias' },
        { id: 'mes',    label: 'Mês atual' },
        { id: 'todas',  label: 'Todas' },
        { id: 'custom', label: '📅 Personalizado' }
    ];
    const ativa = window.produtosVendidosState.filtroData;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroDataPV(\'' + a.id + '\')" style="font-size:0.78rem;">' + a.label + '</button>';
    }).join('');

    const custom = document.getElementById('pv-custom-date');
    if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
}

window.mudarFiltroDataPV = function(filtro) {
    window.produtosVendidosState.filtroData = filtro;
    renderChipsDataPV();
    renderConteudoPV();
};

// ============================================================
// SELECT DE GRUPO
// ============================================================
function preencherSelectGrupoPV() {
    const sel = document.getElementById('pv-filtro-grupo');
    if (!sel) return;

    sel.innerHTML = '<option value="">Todos</option>';
    window.produtosVendidosState.grupos.forEach(function(g) {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.nome;
        sel.appendChild(opt);
    });
}

// ============================================================
// APLICAR FILTROS
// ============================================================
window.aplicarFiltrosPV = function() {
    window.produtosVendidosState.dataIni = (document.getElementById('pv-data-ini') || {}).value || '';
    window.produtosVendidosState.dataFim = (document.getElementById('pv-data-fim') || {}).value || '';
    window.produtosVendidosState.filtroGrupo = (document.getElementById('pv-filtro-grupo') || {}).value || '';
    window.produtosVendidosState.ordenar = (document.getElementById('pv-ordenar') || {}).value || 'valor';
    window.produtosVendidosState.termoBusca = (document.getElementById('pv-busca') || {}).value || '';
    renderConteudoPV();
};

window.limparBuscaPV = function() {
    window.produtosVendidosState.termoBusca = '';
    const input = document.getElementById('pv-busca');
    if (input) input.value = '';
    renderConteudoPV();
};

// ============================================================
// INTERVALO
// ============================================================
function calcularIntervaloPV() {
    const filtro = window.produtosVendidosState.filtroData;
    const agora = new Date();
    let ini = null, fim = null;

    if (filtro === 'hoje') {
        ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
    } else if (filtro === 'ontem') {
        const ontem = new Date(agora); ontem.setDate(ontem.getDate() - 1);
        ini = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
        fim = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59);
    } else if (filtro === '7dias') {
        ini = new Date(agora); ini.setDate(ini.getDate() - 7); fim = agora;
    } else if (filtro === '30dias') {
        ini = new Date(agora); ini.setDate(ini.getDate() - 30); fim = agora;
    } else if (filtro === 'mes') {
        ini = new Date(agora.getFullYear(), agora.getMonth(), 1);
        fim = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
    } else if (filtro === 'custom') {
        const s = window.produtosVendidosState;
        if (s.dataIni) ini = new Date(s.dataIni + 'T00:00:00');
        if (s.dataFim) fim = new Date(s.dataFim + 'T23:59:59');
    }
    return { ini, fim };
}

// ============================================================
// FILTRA COMANDAS
// ============================================================
function filtrarComandasPV() {
    let lista = window.produtosVendidosState.comandas.slice();
    const s = window.produtosVendidosState;

    // Só comandas fechadas (venda consumada)
    lista = lista.filter(function(c) { return window.comandaEstaFechada(c); });

    const { ini, fim } = calcularIntervaloPV();
    if (ini || fim) {
        lista = lista.filter(function(c) {
            const dataRef = c.dataFechamento || c.dataAbertura;
            const data = window.parseDataBR(dataRef);
            if (!data) return false;
            if (ini && data < ini) return false;
            if (fim && data > fim) return false;
            return true;
        });
    }

    return lista;
}

// ============================================================
// RENDER CONTEÚDO
// ============================================================
function renderConteudoPV() {
    const container = document.getElementById('pv-conteudo');
    if (!container) return;

    try {
        const comandas = filtrarComandasPV();
        const s = window.produtosVendidosState;

        // Agrupa por produto
        const mapa = {};

        comandas.forEach(function(c) {
            window.normalizarArray(c.itens).forEach(function(item) {
                const key = item.produtoId || item.nome;
                if (!mapa[key]) {
                    mapa[key] = {
                        produtoId: item.produtoId,
                        nome: item.nome,
                        grupo: item.grupo,
                        qtd: 0,
                        valor: 0
                    };
                }
                mapa[key].qtd += Number(item.quantidade || 0);
                mapa[key].valor += Number(item.preco || 0) * Number(item.quantidade || 0);
            });
        });

        // Filtro por grupo
        let arr = Object.values(mapa);
        if (s.filtroGrupo) {
            arr = arr.filter(function(x) { return String(x.grupo) === String(s.filtroGrupo); });
        }

        // Filtro busca
        const busca = String(s.termoBusca || '').trim().toLowerCase();
        if (busca) {
            arr = arr.filter(function(x) {
                return String(x.nome || '').toLowerCase().indexOf(busca) >= 0;
            });
        }

        // Ordena
        if (s.ordenar === 'quantidade') {
            arr.sort(function(a, b) { return b.qtd - a.qtd; });
        } else if (s.ordenar === 'nome') {
            arr.sort(function(a, b) { return String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' }); });
        } else if (s.ordenar === 'nome-za') {
            arr.sort(function(a, b) { return String(b.nome).localeCompare(String(a.nome), 'pt-BR', { sensitivity: 'base' }); });
        } else if (s.ordenar === 'valor-menor') {
            arr.sort(function(a, b) { return a.valor - b.valor; });
        } else if (s.ordenar === 'quantidade-menor') {
            arr.sort(function(a, b) { return a.qtd - b.qtd; });
        } else {
            arr.sort(function(a, b) { return b.valor - a.valor; });
        }

        // Totais
        let totalValor = 0;
        let totalQtd = 0;
        arr.forEach(function(x) {
            totalValor += x.valor;
            totalQtd += x.qtd;
        });

        // HTML
        let html = '';

        // Resumo
        html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #C2185B 0%, #D81B60 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
        html += '    <div style="font-size:0.75rem;opacity:0.9;">' + getPeriodoTextoPV() + '</div>';
        html += '    <div style="font-size:2rem;font-weight:700;margin-top:6px;">' + formatMoney(totalValor) + '</div>';
        html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;font-size:0.8rem;">';
        html += '        <div><i class="fas fa-box"></i> ' + totalQtd + ' itens vendidos</div>';
        html += '        <div><i class="fas fa-tag"></i> ' + arr.length + ' produto(s)</div>';
        html += '    </div>';
        html += '</div>';

        // Lista
        if (arr.length === 0) {
            html += '<div class="card" style="text-align:center;padding:30px;">';
            html += '    <i class="fas fa-chart-bar" style="font-size:3rem;color:#ccc;"></i>';
            html += '    <p style="margin-top:15px;color:#888;">Nenhuma venda no período</p>';
            html += '</div>';
        } else {
            html += '<div class="card">';
            html += '    <div class="card-title">🏆 Ranking (' + arr.length + ')</div>';

            const maxValor = arr[0] ? Math.max.apply(null, arr.map(function(x) { return x.valor; })) : 0;

            arr.forEach(function(x, idx) {
                const pct = maxValor > 0 ? (x.valor / maxValor * 100) : 0;
                const grupoNome = obterNomeGrupoPV(x.grupo);
                const posicao = idx + 1;
                const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : (posicao + '.');

                html += '<div style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f0f0f0;">';
                html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">';
                html += '        <div style="flex:1;">';
                html += '            <div style="font-weight:600;font-size:0.95rem;">';
                html += '                <span style="color:#C2185B;margin-right:4px;">' + medalha + '</span>' + x.nome;
                html += '            </div>';
                if (grupoNome) {
                    html += '            <div style="font-size:0.72rem;color:#888;margin-top:2px;"><i class="fas fa-layer-group"></i> ' + grupoNome + '</div>';
                }
                html += '        </div>';
                html += '        <div style="text-align:right;">';
                html += '            <div style="font-weight:700;color:#C2185B;font-size:1rem;">' + formatMoney(x.valor) + '</div>';
                html += '            <div style="font-size:0.75rem;color:#888;">' + x.qtd + ' un</div>';
                html += '        </div>';
                html += '    </div>';
                html += '    <div style="background:#eee;height:8px;border-radius:4px;overflow:hidden;">';
                html += '        <div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#C2185B,#F06292);"></div>';
                html += '    </div>';
                html += '</div>';
            });
            html += '</div>';
        }

        container.innerHTML = html;
    } catch (e) {
        console.error('❌ Erro ao renderizar PV:', e);
        container.innerHTML =
            '<div class="card" style="padding:20px;text-align:center;">' +
            '    <i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i>' +
            '    <p style="margin-top:10px;color:#c62828;font-weight:600;">Erro ao renderizar</p>' +
            '    <p style="font-size:0.8rem;color:#666;margin-top:6px;">' + e.message + '</p>' +
            '</div>';
    }
}

// ============================================================
// HELPERS
// ============================================================
function obterNomeGrupoPV(id) {
    if (!id) return '';
    const g = window.produtosVendidosState.grupos.find(function(x) { return String(x.id) === String(id); });
    return g ? g.nome : '';
}

function getPeriodoTextoPV() {
    const f = window.produtosVendidosState.filtroData;
    const map = {
        'hoje': '📅 Hoje', 'ontem': '📅 Ontem', '7dias': '📅 Últimos 7 dias',
        '30dias': '📅 Últimos 30 dias', 'mes': '📅 Mês atual', 'todas': '📅 Todas'
    };
    if (f === 'custom') {
        const s = window.produtosVendidosState;
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
window.imprimirProdutosVendidos = function() {
    const comandas = filtrarComandasPV();
    const mapa = {};

    comandas.forEach(function(c) {
        window.normalizarArray(c.itens).forEach(function(item) {
            const key = item.produtoId || item.nome;
            if (!mapa[key]) mapa[key] = { nome: item.nome, qtd: 0, valor: 0 };
            mapa[key].qtd += Number(item.quantidade || 0);
            mapa[key].valor += Number(item.preco || 0) * Number(item.quantidade || 0);
        });
    });

    const arr = Object.values(mapa).sort(function(a, b) { return b.valor - a.valor; });
    let totalValor = 0;
    let totalQtd = 0;
    arr.forEach(function(x) {
        totalValor += x.valor;
        totalQtd += x.qtd;
    });

    let itensHTML = '';
    arr.forEach(function(x, idx) {
        itensHTML += '<tr>' +
                     '<td>' + (idx + 1) + '</td>' +
                     '<td>' + x.nome + '</td>' +
                     '<td style="text-align:center;">' + x.qtd + '</td>' +
                     '<td style="text-align:right;">' + formatMoney(x.valor) + '</td>' +
                     '</tr>';
    });

    const janela = window.open('', '', 'width=600,height=800');
    janela.document.write(
        '<html><head><title>Produtos Vendidos</title>' +
        '<style>' +
        'body{font-family:monospace;font-size:11px;padding:15px;}' +
        'h1{font-size:16px;text-align:center;}' +
        'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
        'th{border-bottom:1px solid #000;padding:4px;text-align:left;}' +
        'td{padding:3px 4px;border-bottom:1px dotted #ccc;}' +
        'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
        '.total{font-size:14px;font-weight:bold;margin-top:10px;text-align:right;}' +
        '</style></head><body>' +
        '<h1>PRODUTOS VENDIDOS</h1>' +
        '<div style="text-align:center;">' + getPeriodoTextoPV() + '</div>' +
        '<hr>' +
        '<div>Itens vendidos: <b>' + totalQtd + '</b></div>' +
        '<div>Produtos distintos: <b>' + arr.length + '</b></div>' +
        '<div class="total">Faturamento: ' + formatMoney(totalValor) + '</div>' +
        '<hr>' +
        '<table>' +
        '<thead><tr><th>#</th><th>Produto</th><th>Qtd</th><th>Total</th></tr></thead>' +
        '<tbody>' + itensHTML + '</tbody>' +
        '</table>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>' +
        '</body></html>'
    );
    janela.document.close();
};

console.log('✔ ProdutosVendidos.js — todas as funções expostas');