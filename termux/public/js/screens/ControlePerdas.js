// ============================================================
// CONTROLEPERDAS.JS — v2 (completo e blindado)
// - Registra perdas de produtos (quebra, vencimento, etc.)
// - Baixa automática do estoque
// - Calcula prejuízo com base no custo
// - Filtros por período, motivo e produto
// - Resumo, detalhes e impressão
// ============================================================

console.log('✔ ControlePerdas.js v2 carregado');

window.perdasState = {
    perdas: [],
    produtos: [],
    colaboradores: [],
    filtroPeriodo: 'hoje',     // hoje | 7dias | 30dias | todas | custom
    dataIni: '',
    dataFim: '',
    filtroMotivo: '',
    filtroProduto: '',
    termoBusca: ''
};

// ============================================================
// MOTIVOS PADRÃO
// ============================================================
window.MOTIVOS_PERDA = [
    { id: 'quebra',      label: 'Quebra / Dano' },
    { id: 'vencimento',  label: 'Vencimento' },
    { id: 'preparo',     label: 'Erro de preparo' },
    { id: 'devolucao',   label: 'Devolução do cliente' },
    { id: 'derramamento', label: 'Derramamento' },
    { id: 'queimado',    label: 'Queimado' },
    { id: 'contaminacao', label: 'Contaminação' },
    { id: 'outro',       label: 'Outro' }
];

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderControlePerdas = function() {
    setTimeout(carregarPerdas, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Controle de Perdas</h1>',
        '    <div style="display:flex;gap:2px;">',
        '        <button class="icon-btn" onclick="imprimirRelatorioPerdas()" title="Imprimir"><i class="fas fa-print"></i></button>',
        '        <button class="icon-btn" onclick="abrirModalNovaPerda()" title="Nova perda"><i class="fas fa-plus"></i></button>',
        '    </div>',
        '</div>',

        // Info
        '<div style="padding:12px 16px;background:#fff3e0;border-bottom:1px solid #ffe0b2;">',
        '    <div style="font-size:0.85rem;color:#e65100;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Registre quebras, vencimentos e outros prejuízos. O estoque é baixado automaticamente.',
        '    </div>',
        '</div>',

        // Filtros
        '<div style="background:#fff;border-bottom:1px solid #eee;">',
        '    <details id="perdas-filtros-details">',
        '        <summary style="padding:12px 16px;cursor:pointer;font-weight:600;color:var(--primary-color);font-size:0.9rem;">',
        '            <i class="fas fa-filter"></i> Filtros',
        '            <span id="perdas-filtros-resumo" style="font-size:0.75rem;color:#888;font-weight:400;margin-left:6px;"></span>',
        '        </summary>',

        // Período
        '        <div style="padding:0 16px 12px;">',
        '            <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
        '            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="perdas-chips-data"></div>',
        '            <div id="perdas-custom-date" style="display:none;margin-top:10px;">',
        '                <div style="display:flex;gap:8px;">',
        '                    <div style="flex:1;">',
        '                        <label style="font-size:0.7rem;color:#888;">Inicial</label>',
        '                        <input type="date" id="perdas-data-ini" onchange="aplicarFiltrosPerdas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '                    </div>',
        '                    <div style="flex:1;">',
        '                        <label style="font-size:0.7rem;color:#888;">Final</label>',
        '                        <input type="date" id="perdas-data-fim" onchange="aplicarFiltrosPerdas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '                    </div>',
        '                </div>',
        '            </div>',
        '        </div>',

        // Motivo + Produto
        '        <div style="padding:0 16px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
        '            <div>',
        '                <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Motivo</label>',
        '                <select id="perdas-filtro-motivo" onchange="aplicarFiltrosPerdas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '                    <option value="">Todos</option>',
        '                </select>',
        '            </div>',
        '            <div>',
        '                <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Produto</label>',
        '                <select id="perdas-filtro-produto" onchange="aplicarFiltrosPerdas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '                    <option value="">Todos</option>',
        '                </select>',
        '            </div>',
        '        </div>',

        '        <div style="padding:0 16px 12px;">',
        '            <button class="btn-outline" style="width:100%;font-size:0.85rem;padding:8px;" onclick="limparFiltrosPerdas()">',
        '                <i class="fas fa-eraser"></i> Limpar filtros',
        '            </button>',
        '        </div>',
        '    </details>',
        '</div>',

        // Busca
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por produto, motivo ou observação" id="perdas-busca" oninput="filtrarPerdasTexto()">',
        '    <button class="btn-limpar" onclick="limparBuscaPerdas()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // Conteúdo
        '<div class="content-area" id="perdas-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        // FAB
        '<button class="fab" onclick="abrirModalNovaPerda()" title="Nova perda">',
        '    <i class="fas fa-plus"></i>',
        '</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarPerdas() {
    const container = document.getElementById('perdas-conteudo');
    if (!container) return;

    try {
        const [perdas, produtos, colaboradores] = await Promise.all([
            apiGet('perdas').catch(function() { return []; }),
            apiGet('produtos').catch(function() { return []; }),
            apiGet('colaboradores').catch(function() { return []; })
        ]);

        window.perdasState.perdas = window.normalizarArray(perdas);
        window.perdasState.produtos = window.normalizarArray(produtos);
        window.perdasState.colaboradores = window.normalizarArray(colaboradores);

        renderChipsDataPerdas();
        preencherSelectsPerdas();
        atualizarResumoFiltrosPerdas();
        renderConteudoPerdas();
    } catch (e) {
        console.error('❌ Erro ao carregar perdas:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.carregarPerdas = carregarPerdas;

// ============================================================
// CHIPS PERÍODO
// ============================================================
function renderChipsDataPerdas() {
    const container = document.getElementById('perdas-chips-data');
    if (!container) return;

    const abas = [
        { id: 'hoje',   label: 'Hoje' },
        { id: '7dias',  label: '7 dias' },
        { id: '30dias', label: '30 dias' },
        { id: 'todas',  label: 'Todas' },
        { id: 'custom', label: '📅 Personalizado' }
    ];
    const ativa = window.perdasState.filtroPeriodo;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroPeriodoPerdas(\'' + a.id + '\')" style="font-size:0.78rem;">' + a.label + '</button>';
    }).join('');

    const custom = document.getElementById('perdas-custom-date');
    if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
}

window.mudarFiltroPeriodoPerdas = function(filtro) {
    window.perdasState.filtroPeriodo = filtro;
    renderChipsDataPerdas();
    atualizarResumoFiltrosPerdas();
    renderConteudoPerdas();
};

// ============================================================
// SELECTS
// ============================================================
function preencherSelectsPerdas() {
    const selMotivo = document.getElementById('perdas-filtro-motivo');
    if (selMotivo) {
        selMotivo.innerHTML = '<option value="">Todos</option>';
        window.MOTIVOS_PERDA.forEach(function(m) {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = m.label;
            selMotivo.appendChild(opt);
        });
    }

    const selProduto = document.getElementById('perdas-filtro-produto');
    if (selProduto) {
        selProduto.innerHTML = '<option value="">Todos</option>';
        const mapaProdutos = {};
        window.perdasState.perdas.forEach(function(p) {
            if (p.produtoId) mapaProdutos[p.produtoId] = p.produto;
        });
        Object.keys(mapaProdutos).sort(function(a, b) {
            return String(mapaProdutos[a]).localeCompare(String(mapaProdutos[b]));
        }).forEach(function(id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = mapaProdutos[id];
            selProduto.appendChild(opt);
        });
    }
}

// ============================================================
// APLICAR / LIMPAR
// ============================================================
window.aplicarFiltrosPerdas = function() {
    window.perdasState.dataIni = (document.getElementById('perdas-data-ini') || {}).value || '';
    window.perdasState.dataFim = (document.getElementById('perdas-data-fim') || {}).value || '';
    window.perdasState.filtroMotivo = (document.getElementById('perdas-filtro-motivo') || {}).value || '';
    window.perdasState.filtroProduto = (document.getElementById('perdas-filtro-produto') || {}).value || '';
    atualizarResumoFiltrosPerdas();
    renderConteudoPerdas();
};

window.limparFiltrosPerdas = function() {
    window.perdasState.filtroPeriodo = 'hoje';
    window.perdasState.dataIni = '';
    window.perdasState.dataFim = '';
    window.perdasState.filtroMotivo = '';
    window.perdasState.filtroProduto = '';
    window.perdasState.termoBusca = '';

    ['perdas-filtro-motivo', 'perdas-filtro-produto'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const busca = document.getElementById('perdas-busca');
    if (busca) busca.value = '';

    renderChipsDataPerdas();
    atualizarResumoFiltrosPerdas();
    renderConteudoPerdas();
};

function atualizarResumoFiltrosPerdas() {
    const el = document.getElementById('perdas-filtros-resumo');
    if (!el) return;

    const s = window.perdasState;
    const partes = [];
    const labels = { 'hoje': 'Hoje', '7dias': '7 dias', '30dias': '30 dias', 'todas': 'Todas', 'custom': 'Personalizado' };
    partes.push(labels[s.filtroPeriodo] || s.filtroPeriodo);
    if (s.filtroMotivo) partes.push('Motivo');
    if (s.filtroProduto) partes.push('Produto');
    el.textContent = '(' + partes.join(' · ') + ')';
}

// ============================================================
// FILTRO DE PERDAS
// ============================================================
function calcularIntervaloPerdas() {
    const filtro = window.perdasState.filtroPeriodo;
    const agora = new Date();
    let ini = null, fim = null;

    if (filtro === 'hoje') {
        ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
    } else if (filtro === '7dias') {
        ini = new Date(agora); ini.setDate(ini.getDate() - 7); fim = agora;
    } else if (filtro === '30dias') {
        ini = new Date(agora); ini.setDate(ini.getDate() - 30); fim = agora;
    } else if (filtro === 'custom') {
        const s = window.perdasState;
        if (s.dataIni) ini = new Date(s.dataIni + 'T00:00:00');
        if (s.dataFim) fim = new Date(s.dataFim + 'T23:59:59');
    }
    return { ini, fim };
}

function filtrarPerdas() {
    let lista = window.perdasState.perdas.slice();
    const s = window.perdasState;

    const { ini, fim } = calcularIntervaloPerdas();
    if (ini || fim) {
        lista = lista.filter(function(p) {
            const dataRef = p.dataHora || p.data || '';
            const data = window.parseDataBR(dataRef);
            if (!data) return false;
            if (ini && data < ini) return false;
            if (fim && data > fim) return false;
            return true;
        });
    }

    if (s.filtroMotivo) {
        lista = lista.filter(function(p) { return p.motivoId === s.filtroMotivo; });
    }

    if (s.filtroProduto) {
        lista = lista.filter(function(p) { return String(p.produtoId) === String(s.filtroProduto); });
    }

    const busca = String(s.termoBusca || '').trim().toLowerCase();
    if (busca) {
        lista = lista.filter(function(p) {
            return String(p.produto || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(p.motivo || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(p.observacao || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    lista.sort(function(a, b) {
        const da = a.dataHora || a.data || '';
        const db = b.dataHora || b.data || '';
        return String(db).localeCompare(String(da));
    });

    return lista;
}

window.filtrarPerdasTexto = function() {
    window.perdasState.termoBusca = (document.getElementById('perdas-busca') || {}).value || '';
    renderConteudoPerdas();
};

window.limparBuscaPerdas = function() {
    window.perdasState.termoBusca = '';
    const input = document.getElementById('perdas-busca');
    if (input) input.value = '';
    renderConteudoPerdas();
};

// ============================================================
// RENDER CONTEÚDO
// ============================================================
function renderConteudoPerdas() {
    const container = document.getElementById('perdas-conteudo');
    if (!container) return;

    try {
        const lista = filtrarPerdas();

        // Totais
        let totalPrejuizo = 0;
        let totalItens = 0;
        lista.forEach(function(p) {
            totalPrejuizo += Number(p.prejuizo || 0);
            totalItens += Number(p.quantidade || 0);
        });

        let html = '';

        // Cabeçalho de resumo
        html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #c62828 0%, #b71c1c 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
        html += '    <div style="font-size:0.75rem;opacity:0.9;">Prejuízo total no período</div>';
        html += '    <div style="font-size:2rem;font-weight:700;margin-top:6px;">' + formatMoney(totalPrejuizo) + '</div>';
        html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;font-size:0.8rem;">';
        html += '        <div><i class="fas fa-clipboard-list"></i> ' + lista.length + ' registro(s)</div>';
        html += '        <div><i class="fas fa-box"></i> ' + totalItens + ' item(ns)</div>';
        html += '    </div>';
        html += '</div>';

        // Lista
        if (lista.length === 0) {
            html += '<div class="card" style="text-align:center;padding:30px;">';
            html += '    <i class="fas fa-check-circle" style="font-size:3rem;color:#4caf50;"></i>';
            html += '    <p style="margin-top:15px;color:#888;">Nenhuma perda registrada no período</p>';
            html += '    <button class="btn-primary" style="margin-top:15px;" onclick="abrirModalNovaPerda()">';
            html += '        <i class="fas fa-plus"></i> Registrar perda';
            html += '    </button>';
            html += '</div>';
        } else {
            html += '<div class="card">';
            html += '    <div class="card-title">📋 Registros (' + lista.length + ')</div>';
            lista.forEach(function(p) {
                html += renderItemPerda(p);
            });
            html += '</div>';
        }

        container.innerHTML = html;
    } catch (e) {
        console.error('❌ Erro ao renderizar perdas:', e);
        container.innerHTML =
            '<div class="card" style="padding:20px;text-align:center;">' +
            '    <i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i>' +
            '    <p style="margin-top:10px;color:#c62828;font-weight:600;">Erro ao renderizar</p>' +
            '    <p style="font-size:0.8rem;color:#666;margin-top:6px;">' + e.message + '</p>' +
            '</div>';
    }
}

// ============================================================
// ITEM DA LISTA
// ============================================================
function renderItemPerda(p) {
    const motivoLabel = window.MOTIVOS_PERDA.find(function(m) { return m.id === p.motivoId; });
    const motivoTexto = motivoLabel ? motivoLabel.label : (p.motivo || 'Sem motivo');

    const dataTexto = p.dataHora || p.data || '—';
    const obsHTML = p.observacao ? '<div style="font-size:0.72rem;color:#888;margin-top:2px;"><i class="fas fa-comment"></i> ' + p.observacao + '</div>' : '';
    const colabHTML = p.colaboradorNome ? '<div style="font-size:0.72rem;color:#888;"><i class="fas fa-user"></i> ' + p.colaboradorNome + '</div>' : '';

    return '<div style="padding:12px 0;border-bottom:1px solid #f0f0f0;">' +
           '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
           '        <div style="flex:1;min-width:0;">' +
           '            <div style="font-weight:600;font-size:0.9rem;">' + (p.produto || 'Produto') + ' <span style="color:#888;font-weight:400;">(' + (p.quantidade || 0) + 'x)</span></div>' +
           '            <div style="font-size:0.75rem;color:#c62828;margin-top:2px;"><i class="fas fa-tag"></i> ' + motivoTexto + '</div>' +
           '            <div style="font-size:0.72rem;color:#888;margin-top:2px;"><i class="fas fa-calendar"></i> ' + dataTexto + '</div>' +
           colabHTML +
           obsHTML +
           '        </div>' +
           '        <div style="text-align:right;">' +
           '            <div style="font-weight:700;color:#c62828;font-size:0.95rem;">' + formatMoney(p.prejuizo || 0) + '</div>' +
           '            <button class="btn-limpar" onclick="excluirPerda(' + p.id + ')" title="Excluir" style="margin-top:6px;">' +
           '                <i class="fas fa-trash" style="color:#c62828;font-size:0.85rem;"></i>' +
           '            </button>' +
           '        </div>' +
           '    </div>' +
           '</div>';
}

// ============================================================
// MODAL — NOVA PERDA
// ============================================================
window.abrirModalNovaPerda = async function() {
    // Recarrega produtos para pegar estoque atual
    try {
        const produtos = await apiGet('produtos');
        window.perdasState.produtos = window.normalizarArray(produtos);
    } catch (e) {
        console.error('Erro ao buscar produtos:', e);
    }

    const ativos = window.perdasState.produtos.filter(function(p) { return p.inativo !== true; });
    if (ativos.length === 0) {
        alert('Nenhum produto cadastrado');
        return;
    }

    let opcoesProdutos = '<option value="">-- Selecione --</option>';
    ativos.slice().sort(function(a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    }).forEach(function(p) {
        const estoque = Number(p.estoque || 0);
        const custo = Number(p.valorCusto || 0);
        opcoesProdutos += '<option value="' + p.id + '" data-estoque="' + estoque + '" data-custo="' + custo + '">' +
            p.nome + ' (estoque: ' + estoque + ' | custo: ' + formatMoney(custo) + ')' +
            '</option>';
    });

    let opcoesMotivos = '';
    window.MOTIVOS_PERDA.forEach(function(m) {
        opcoesMotivos += '<option value="' + m.id + '">' + m.label + '</option>';
    });

    let opcoesColabs = '<option value="">-- Sem responsável --</option>';
    window.perdasState.colaboradores.slice().sort(function(a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    }).forEach(function(c) {
        opcoesColabs += '<option value="' + c.id + '">' + c.nome + (c.funcao ? ' — ' + c.funcao : '') + '</option>';
    });

    const anterior = document.getElementById('modal-nova-perda');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-nova-perda';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = function(e) { if (e.target === modal) fecharModalNovaPerda(); };

    modal.innerHTML =
        '<div class="modal-content" style="max-width:480px;">' +
        '    <div class="modal-header" style="background:#c62828;color:#fff;">' +
        '        <strong>Registrar Perda</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalNovaPerda()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +

        '        <div class="field">' +
        '            <label>Produto *</label>' +
        '            <select id="perda-produto" onchange="atualizarPrejuizoPerda()">' + opcoesProdutos + '</select>' +
        '            <small id="perda-produto-info" style="color:#888;font-size:0.75rem;"></small>' +
        '        </div>' +

        '        <div class="field">' +
        '            <label>Quantidade *</label>' +
        '            <input type="number" min="1" id="perda-qtd" value="1" oninput="atualizarPrejuizoPerda()">' +
        '        </div>' +

        '        <div class="field">' +
        '            <label>Motivo *</label>' +
        '            <select id="perda-motivo">' + opcoesMotivos + '</select>' +
        '        </div>' +

        '        <div class="field">' +
        '            <label>Responsável</label>' +
        '            <select id="perda-colaborador">' + opcoesColabs + '</select>' +
        '        </div>' +

        '        <div class="field">' +
        '            <label>Observação</label>' +
        '            <input type="text" id="perda-obs" maxlength="100" placeholder="Detalhes adicionais">' +
        '        </div>' +

        '        <div style="padding:12px;background:#ffebee;border-radius:8px;margin-top:8px;text-align:center;">' +
        '            <div style="font-size:0.8rem;color:#666;">Prejuízo calculado</div>' +
        '            <div id="perda-prejuizo" style="font-size:1.6rem;font-weight:700;color:#c62828;">R$ 0,00</div>' +
        '        </div>' +

        '        <button class="btn-primary" style="background:#c62828;margin-top:15px;" onclick="salvarNovaPerda()">' +
        '            <i class="fas fa-check"></i> Registrar Perda' +
        '        </button>' +
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalNovaPerda()">Cancelar</button>' +
        '    </div>' +
        '</div>';

    document.body.appendChild(modal);
    atualizarPrejuizoPerda();
};

window.fecharModalNovaPerda = function() {
    const m = document.getElementById('modal-nova-perda');
    if (m) m.remove();
};

// ============================================================
// CÁLCULO DO PREJUÍZO
// ============================================================
window.atualizarPrejuizoPerda = function() {
    const selProduto = document.getElementById('perda-produto');
    const qtdEl = document.getElementById('perda-qtd');
    const infoEl = document.getElementById('perda-produto-info');
    const prejEl = document.getElementById('perda-prejuizo');
    if (!selProduto || !qtdEl || !prejEl) return;

    const opt = selProduto.options[selProduto.selectedIndex];
    const custo = opt ? parseFloat(opt.getAttribute('data-custo') || 0) : 0;
    const estoque = opt ? parseFloat(opt.getAttribute('data-estoque') || 0) : 0;
    const qtd = parseFloat(qtdEl.value) || 0;
    const prejuizo = custo * qtd;

    prejEl.textContent = formatMoney(prejuizo);

    if (infoEl) {
        if (opt && opt.value) {
            infoEl.textContent = 'Estoque disponível: ' + estoque + ' un | Custo unitário: ' + formatMoney(custo);
            infoEl.style.color = qtd > estoque ? '#c62828' : '#888';
        } else {
            infoEl.textContent = '';
        }
    }
};

// ============================================================
// SALVAR PERDA
// ============================================================
window.salvarNovaPerda = async function() {
    try {
        const selProduto = document.getElementById('perda-produto');
        const produtoId = selProduto.value;
        if (!produtoId) { alert('Selecione o produto'); return; }

        const qtd = parseInt(document.getElementById('perda-qtd').value) || 0;
        if (qtd <= 0) { alert('Informe uma quantidade válida'); return; }

        const motivoId = document.getElementById('perda-motivo').value;
        const motivoObj = window.MOTIVOS_PERDA.find(function(m) { return m.id === motivoId; });
        const motivoTexto = motivoObj ? motivoObj.label : motivoId;

        const colaboradorId = document.getElementById('perda-colaborador').value;
        const colaborador = window.perdasState.colaboradores.find(function(c) { return String(c.id) === String(colaboradorId); });

        const obs = (document.getElementById('perda-obs').value || '').trim();

        // Busca produto
        const produtos = window.normalizarArray(await apiGet('produtos'));
        const idxProduto = produtos.findIndex(function(p) { return String(p.id) === String(produtoId); });
        if (idxProduto < 0) { alert('Produto não encontrado'); return; }
        const produto = produtos[idxProduto];

        const estoqueAtual = Number(produto.estoque || 0);
        if (qtd > estoqueAtual) {
            if (!await window.confirmar('Quantidade (' + qtd + ') maior que o estoque (' + estoqueAtual + ').\n\nRegistrar mesmo assim?')) return;
        }

        const custo = Number(produto.valorCusto || 0);
        const prejuizo = custo * qtd;

        const agora = new Date();
        const dataHora = agora.toLocaleDateString('pt-BR') + ' ' +
                         String(agora.getHours()).padStart(2, '0') + ':' +
                         String(agora.getMinutes()).padStart(2, '0');

        const novaPerda = {
            id: Date.now(),
            produtoId: produto.id,
            produto: produto.nome,
            quantidade: qtd,
            motivoId: motivoId,
            motivo: motivoTexto,
            prejuizo: prejuizo,
            custoUnitario: custo,
            colaboradorId: colaborador ? colaborador.id : null,
            colaboradorNome: colaborador ? colaborador.nome : '',
            observacao: obs,
            dataHora: dataHora,
            data: agora.toLocaleDateString('pt-BR'),
            usuario: (function() { try { return localStorage.getItem('garcomAtual') || 'Operador'; } catch (e) { return 'Operador'; } })()
        };

        // Baixa de estoque
        produto.estoque = Math.max(0, estoqueAtual - qtd);
        produtos[idxProduto] = produto;
        await apiSave('produtos', produtos);

        // Registra movimentação de estoque (opcional — se o backend tiver)
        try {
            const movs = window.normalizarArray(await apiGet('movimentacoes').catch(function() { return []; }));
            movs.push({
                id: Date.now(),
                tipo: 'saida',
                produto: produto.nome,
                produtoId: produto.id,
                quantidade: qtd,
                motivo: 'Perda: ' + motivoTexto,
                data: agora.toLocaleDateString('pt-BR')
            });
            await apiSave('movimentacoes', movs);
        } catch (e) {}

        // Salva perda
        const perdas = window.normalizarArray(await apiGet('perdas'));
        perdas.push(novaPerda);
        await apiSave('perdas', perdas);

        fecharModalNovaPerda();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Perda registrada: ' + formatMoney(prejuizo));
        } else {
            alert('✅ Perda registrada: ' + formatMoney(prejuizo));
        }

        carregarPerdas();
    } catch (e) {
        console.error('Erro ao salvar perda:', e);
        alert('Erro ao salvar: ' + e.message);
    }
};

// ============================================================
// EXCLUIR PERDA
// ============================================================
window.excluirPerda = async function(id) {
    const perda = window.perdasState.perdas.find(function(p) { return String(p.id) === String(id); });
    if (!perda) return;

    const devolverEstoque = await window.confirmar(
        'Excluir esta perda?\n\n' +
        'Produto: ' + perda.produto + '\n' +
        'Quantidade: ' + perda.quantidade + 'x\n' +
        'Prejuízo: ' + formatMoney(perda.prejuizo || 0) + '\n\n' +
        'Clique OK para excluir E DEVOLVER ao estoque.\n' +
        'Clique Cancelar para NÃO excluir.'
    );

    if (!devolverEstoque) return;

    try {
        // Devolve ao estoque
        const produtos = window.normalizarArray(await apiGet('produtos'));
        const idx = produtos.findIndex(function(p) { return String(p.id) === String(perda.produtoId); });
        if (idx >= 0) {
            produtos[idx].estoque = Number(produtos[idx].estoque || 0) + Number(perda.quantidade || 0);
            await apiSave('produtos', produtos);
        }

        // Remove a perda
        const perdas = window.normalizarArray(await apiGet('perdas'));
        const novaLista = perdas.filter(function(p) { return String(p.id) !== String(id); });
        await apiSave('perdas', novaLista);

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Perda excluída e estoque devolvido');
        }
        carregarPerdas();
    } catch (e) {
        console.error('Erro ao excluir perda:', e);
        alert('Erro: ' + e.message);
    }
};

// ============================================================
// IMPRESSÃO
// ============================================================
window.imprimirRelatorioPerdas = function() {
    const lista = filtrarPerdas();
    let totalPrejuizo = 0;
    let totalItens = 0;
    lista.forEach(function(p) {
        totalPrejuizo += Number(p.prejuizo || 0);
        totalItens += Number(p.quantidade || 0);
    });

    const agora = new Date();
    const dataTexto = agora.toLocaleDateString('pt-BR') + ' ' +
                      String(agora.getHours()).padStart(2, '0') + ':' +
                      String(agora.getMinutes()).padStart(2, '0');

    let itensHTML = '';
    lista.forEach(function(p) {
        itensHTML += '<tr>' +
                     '<td>' + (p.dataHora || p.data || '') + '</td>' +
                     '<td>' + (p.produto || '') + '</td>' +
                     '<td style="text-align:center;">' + (p.quantidade || 0) + '</td>' +
                     '<td>' + (p.motivo || '') + '</td>' +
                     '<td style="text-align:right;">' + formatMoney(p.prejuizo || 0) + '</td>' +
                     '</tr>';
    });

    const janela = window.open('', '', 'width=700,height=800');
    janela.document.write(
        '<html><head><title>Controle de Perdas</title>' +
        '<style>' +
        'body{font-family:monospace;font-size:11px;padding:15px;}' +
        'h1{font-size:16px;text-align:center;}' +
        'h2{font-size:13px;margin-top:15px;}' +
        'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
        'th{border-bottom:1px solid #000;padding:4px;text-align:left;}' +
        'td{padding:3px 4px;border-bottom:1px dotted #ccc;}' +
        'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
        '.total{font-size:14px;font-weight:bold;margin-top:10px;text-align:right;}' +
        '</style></head><body>' +
        '<h1>CONTROLE DE PERDAS</h1>' +
        '<div style="text-align:center;">Emitido em ' + dataTexto + '</div>' +
        '<hr>' +
        '<h2>Resumo</h2>' +
        '<div>Registros: <b>' + lista.length + '</b></div>' +
        '<div>Itens perdidos: <b>' + totalItens + '</b></div>' +
        '<div class="total">Prejuízo total: ' + formatMoney(totalPrejuizo) + '</div>' +
        '<hr>' +
        '<h2>Detalhes</h2>' +
        '<table>' +
        '<thead><tr><th>Data</th><th>Produto</th><th>Qtd</th><th>Motivo</th><th>Prejuízo</th></tr></thead>' +
        '<tbody>' + itensHTML + '</tbody>' +
        '</table>' +
        '<hr>' +
        '<div style="text-align:center;font-size:9px;margin-top:20px;">' +
        '    <script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>' +
        '</div>' +
        '</body></html>'
    );
    janela.document.close();
};

console.log('✔ ControlePerdas.js v2 — todas as funções expostas');