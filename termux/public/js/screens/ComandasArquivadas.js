// ============================================================
// COMANDASARQUIVADAS.JS — Histórico de comandas fechadas/canceladas
// ============================================================
// - Lista comandas que não estão ativas (fechada / cancelada)
// - Filtros: período, status, cliente, garçom, busca
// - Reativar, excluir, imprimir
// - Resumo com totais
// ============================================================

console.log('✔ ComandasArquivadas.js carregado');

window.comandasArquivadasState = {
    comandas: [],
    clientes: [],
    colaboradores: [],
    filtroPeriodo: '7dias',      // hoje | 7dias | 30dias | mes | todas | custom
    dataIni: '',
    dataFim: '',
    filtroStatus: 'todas',        // todas | fechada | cancelada
    filtroCliente: '',
    filtroAtendente: '',
    termoBusca: ''
};

// ============================================================
// RENDER
// ============================================================
window.renderComandasArquivadas = function() {
    setTimeout(carregarComandasArquivadas, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Comandas Arquivadas</h1>',
        '    <button class="icon-btn" onclick="imprimirComandasArquivadas()" title="Imprimir"><i class="fas fa-print"></i></button>',
        '</div>',

        // Info
        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-archive"></i>',
        '        Comandas fechadas e canceladas. Use para consultar o histórico ou reativar.',
        '    </div>',
        '</div>',

        // Filtros
        '<div style="background:#fff;border-bottom:1px solid #eee;">',
        '    <details id="arquivadas-filtros-details">',
        '        <summary style="padding:12px 16px;cursor:pointer;font-weight:600;color:var(--primary-color);font-size:0.9rem;">',
        '            <i class="fas fa-filter"></i> Filtros',
        '            <span id="arquivadas-filtros-resumo" style="font-size:0.75rem;color:#888;font-weight:400;margin-left:6px;"></span>',
        '        </summary>',

        // Período
        '        <div style="padding:0 16px 12px;">',
        '            <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
        '            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="arquivadas-chips-data"></div>',
        '            <div id="arquivadas-custom-date" style="display:none;margin-top:10px;">',
        '                <div style="display:flex;gap:8px;">',
        '                    <div style="flex:1;">',
        '                        <label style="font-size:0.7rem;color:#888;">Inicial</label>',
        '                        <input type="date" id="arquivadas-data-ini" onchange="aplicarFiltrosArquivadas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '                    </div>',
        '                    <div style="flex:1;">',
        '                        <label style="font-size:0.7rem;color:#888;">Final</label>',
        '                        <input type="date" id="arquivadas-data-fim" onchange="aplicarFiltrosArquivadas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '                    </div>',
        '                </div>',
        '            </div>',
        '        </div>',

        // Status
        '        <div style="padding:0 16px 12px;">',
        '            <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Status</label>',
        '            <div style="display:flex;gap:6px;" id="arquivadas-chips-status"></div>',
        '        </div>',

        // Cliente + Atendente
        '        <div style="padding:0 16px 12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">',
        '            <div>',
        '                <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Cliente</label>',
        '                <select id="arquivadas-filtro-cliente" onchange="aplicarFiltrosArquivadas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '                    <option value="">Todos</option>',
        '                </select>',
        '            </div>',
        '            <div>',
        '                <label style="font-size:0.75rem;color:#666;font-weight:500;display:block;margin-bottom:4px;">Atendente</label>',
        '                <select id="arquivadas-filtro-atendente" onchange="aplicarFiltrosArquivadas()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;font-family:var(--font-family);">',
        '                    <option value="">Todos</option>',
        '                </select>',
        '            </div>',
        '        </div>',

        '        <div style="padding:0 16px 12px;">',
        '            <button class="btn-outline" style="width:100%;font-size:0.85rem;padding:8px;" onclick="limparFiltrosArquivadas()">',
        '                <i class="fas fa-eraser"></i> Limpar filtros',
        '            </button>',
        '        </div>',
        '    </details>',
        '</div>',

        // Busca
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por número, cliente ou garçom" id="arquivadas-busca" oninput="filtrarArquivadasTexto()">',
        '    <button class="btn-limpar" onclick="limparBuscaArquivadas()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // Conteúdo
        '<div class="content-area" id="arquivadas-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarComandasArquivadas() {
    const container = document.getElementById('arquivadas-conteudo');
    if (!container) return;

    try {
        const [comandas, clientes, colaboradores] = await Promise.all([
            apiGet('comandas').catch(function() { return []; }),
            apiGet('clientes').catch(function() { return []; }),
            apiGet('colaboradores').catch(function() { return []; })
        ]);

        window.comandasArquivadasState.comandas = window.normalizarArray(comandas);
        window.comandasArquivadasState.clientes = window.normalizarArray(clientes);
        window.comandasArquivadasState.colaboradores = window.normalizarArray(colaboradores);

        renderChipsDataArquivadas();
        renderChipsStatusArquivadas();
        preencherSelectsArquivadas();
        atualizarResumoFiltrosArquivadas();
        renderConteudoArquivadas();
    } catch (e) {
        console.error('❌ Erro ao carregar comandas arquivadas:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.carregarComandasArquivadas = carregarComandasArquivadas;

// ============================================================
// CHIPS PERÍODO
// ============================================================
function renderChipsDataArquivadas() {
    const container = document.getElementById('arquivadas-chips-data');
    if (!container) return;

    const abas = [
        { id: 'hoje',   label: 'Hoje' },
        { id: '7dias',  label: '7 dias' },
        { id: '30dias', label: '30 dias' },
        { id: 'mes',    label: 'Mês atual' },
        { id: 'todas',  label: 'Todas' },
        { id: 'custom', label: '📅 Personalizado' }
    ];
    const ativa = window.comandasArquivadasState.filtroPeriodo;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroPeriodoArquivadas(\'' + a.id + '\')" style="font-size:0.78rem;">' + a.label + '</button>';
    }).join('');

    const custom = document.getElementById('arquivadas-custom-date');
    if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
}

window.mudarFiltroPeriodoArquivadas = function(filtro) {
    window.comandasArquivadasState.filtroPeriodo = filtro;
    renderChipsDataArquivadas();
    atualizarResumoFiltrosArquivadas();
    renderConteudoArquivadas();
};

// ============================================================
// CHIPS STATUS
// ============================================================
function renderChipsStatusArquivadas() {
    const container = document.getElementById('arquivadas-chips-status');
    if (!container) return;

    const abas = [
        { id: 'todas',     label: 'Todas' },
        { id: 'fechada',   label: '✅ Fechadas' },
        { id: 'cancelada', label: '❌ Canceladas' }
    ];
    const ativa = window.comandasArquivadasState.filtroStatus;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroStatusArquivadas(\'' + a.id + '\')" style="flex:1;font-size:0.8rem;">' + a.label + '</button>';
    }).join('');
}

window.mudarFiltroStatusArquivadas = function(filtro) {
    window.comandasArquivadasState.filtroStatus = filtro;
    renderChipsStatusArquivadas();
    atualizarResumoFiltrosArquivadas();
    renderConteudoArquivadas();
};

// ============================================================
// SELECTS
// ============================================================
function preencherSelectsArquivadas() {
    // Clientes (só os que têm comanda arquivada)
    const selCli = document.getElementById('arquivadas-filtro-cliente');
    if (selCli) {
        selCli.innerHTML = '<option value="">Todos</option>';
        const mapa = {};
        window.comandasArquivadasState.comandas.forEach(function(c) {
            if (!window.comandaEstaFechada(c) && !window.comandaEstaCancelada(c)) return;
            const chave = c.clienteId ? 'id:' + c.clienteId : 'nome:' + (c.cliente || '');
            if (c.cliente && !mapa[chave]) {
                mapa[chave] = { id: c.clienteId || '', nome: c.cliente };
            }
        });
        Object.values(mapa).sort(function(a, b) {
            return String(a.nome).localeCompare(String(b.nome));
        }).forEach(function(x) {
            const opt = document.createElement('option');
            opt.value = x.id || x.nome;
            opt.textContent = x.nome;
            selCli.appendChild(opt);
        });
    }

    // Atendentes (só os que têm comanda arquivada)
    const selAten = document.getElementById('arquivadas-filtro-atendente');
    if (selAten) {
        selAten.innerHTML = '<option value="">Todos</option>';
        const nomes = {};
        window.comandasArquivadasState.comandas.forEach(function(c) {
            if (!window.comandaEstaFechada(c) && !window.comandaEstaCancelada(c)) return;
            if (c.garcom) nomes[c.garcom] = true;
        });
        Object.keys(nomes).sort().forEach(function(nome) {
            const opt = document.createElement('option');
            opt.value = nome;
            opt.textContent = nome;
            selAten.appendChild(opt);
        });
    }
}

// ============================================================
// APLICAR / LIMPAR FILTROS
// ============================================================
window.aplicarFiltrosArquivadas = function() {
    const s = window.comandasArquivadasState;
    s.dataIni = (document.getElementById('arquivadas-data-ini') || {}).value || '';
    s.dataFim = (document.getElementById('arquivadas-data-fim') || {}).value || '';
    s.filtroCliente = (document.getElementById('arquivadas-filtro-cliente') || {}).value || '';
    s.filtroAtendente = (document.getElementById('arquivadas-filtro-atendente') || {}).value || '';
    atualizarResumoFiltrosArquivadas();
    renderConteudoArquivadas();
};

window.limparFiltrosArquivadas = function() {
    const s = window.comandasArquivadasState;
    s.filtroPeriodo = '7dias';
    s.dataIni = '';
    s.dataFim = '';
    s.filtroStatus = 'todas';
    s.filtroCliente = '';
    s.filtroAtendente = '';
    s.termoBusca = '';

    ['arquivadas-filtro-cliente', 'arquivadas-filtro-atendente'].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const busca = document.getElementById('arquivadas-busca');
    if (busca) busca.value = '';

    renderChipsDataArquivadas();
    renderChipsStatusArquivadas();
    atualizarResumoFiltrosArquivadas();
    renderConteudoArquivadas();
};

function atualizarResumoFiltrosArquivadas() {
    const el = document.getElementById('arquivadas-filtros-resumo');
    if (!el) return;

    const s = window.comandasArquivadasState;
    const partes = [];
    const labels = { 'hoje': 'Hoje', '7dias': '7 dias', '30dias': '30 dias', 'mes': 'Mês atual', 'todas': 'Todas', 'custom': 'Personalizado' };
    partes.push(labels[s.filtroPeriodo] || s.filtroPeriodo);
    if (s.filtroStatus !== 'todas') partes.push(s.filtroStatus === 'fechada' ? 'Fechadas' : 'Canceladas');
    if (s.filtroCliente) partes.push('Cliente');
    if (s.filtroAtendente) partes.push('Atendente');
    el.textContent = '(' + partes.join(' · ') + ')';
}

// ============================================================
// BUSCA
// ============================================================
window.filtrarArquivadasTexto = function() {
    window.comandasArquivadasState.termoBusca = (document.getElementById('arquivadas-busca') || {}).value || '';
    renderConteudoArquivadas();
};

window.limparBuscaArquivadas = function() {
    window.comandasArquivadasState.termoBusca = '';
    const input = document.getElementById('arquivadas-busca');
    if (input) input.value = '';
    renderConteudoArquivadas();
};

// ============================================================
// INTERVALO
// ============================================================
function calcularIntervaloArquivadas() {
    const filtro = window.comandasArquivadasState.filtroPeriodo;
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
        const s = window.comandasArquivadasState;
        if (s.dataIni) ini = new Date(s.dataIni + 'T00:00:00');
        if (s.dataFim) fim = new Date(s.dataFim + 'T23:59:59');
    }
    return { ini, fim };
}

// ============================================================
// FILTRAR
// ============================================================
function filtrarArquivadas() {
    let lista = window.comandasArquivadasState.comandas.slice();
    const s = window.comandasArquivadasState;

    // Só fechadas e canceladas
    lista = lista.filter(function(c) {
        return window.comandaEstaFechada(c) || window.comandaEstaCancelada(c);
    });

    // Período
    const { ini, fim } = calcularIntervaloArquivadas();
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

    // Status
    if (s.filtroStatus !== 'todas') {
        lista = lista.filter(function(c) {
            return window.statusComandaNormalizado(c) === s.filtroStatus;
        });
    }

    // Cliente
    if (s.filtroCliente) {
        lista = lista.filter(function(c) {
            if (String(c.clienteId) === String(s.filtroCliente)) return true;
            if (c.cliente && String(c.cliente).toLowerCase() === String(s.filtroCliente).toLowerCase()) return true;
            return false;
        });
    }

    // Atendente
    if (s.filtroAtendente) {
        lista = lista.filter(function(c) {
            return String(c.garcom || '').toLowerCase() === String(s.filtroAtendente).toLowerCase();
        });
    }

    // Busca
    const busca = String(s.termoBusca || '').trim().toLowerCase();
    if (busca) {
        lista = lista.filter(function(c) {
            return String(c.numero || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.cliente || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.garcom || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.mesa || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    // Ordena: fechamento mais recente primeiro
    lista.sort(function(a, b) {
        const da = a.dataFechamento || a.dataAbertura || '';
        const db = b.dataFechamento || b.dataAbertura || '';
        return String(db).localeCompare(String(da));
    });

    return lista;
}

// ============================================================
// RENDER CONTEÚDO
// ============================================================
function renderConteudoArquivadas() {
    const container = document.getElementById('arquivadas-conteudo');
    if (!container) return;

    try {
        const lista = filtrarArquivadas();

        // Resumo
        let totalFechadas = 0;
        let totalCanceladas = 0;
        let valorFechadas = 0;
        let valorCanceladas = 0;

        lista.forEach(function(c) {
            if (window.comandaEstaFechada(c)) {
                totalFechadas++;
                valorFechadas += Number(c.total || 0);
            } else if (window.comandaEstaCancelada(c)) {
                totalCanceladas++;
                valorCanceladas += Number(c.total || 0);
            }
        });

        let html = '';

        // Cabeçalho
        html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #455a64 0%, #263238 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
        html += '    <div style="font-size:0.75rem;opacity:0.9;">' + getPeriodoTextoArquivadas() + '</div>';
        html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">';
        html += '        <div>';
        html += '            <div style="font-size:0.7rem;opacity:0.85;">✅ FECHADAS</div>';
        html += '            <div style="font-size:1.3rem;font-weight:700;">' + totalFechadas + '</div>';
        html += '            <div style="font-size:0.75rem;opacity:0.85;">' + formatMoney(valorFechadas) + '</div>';
        html += '        </div>';
        html += '        <div>';
        html += '            <div style="font-size:0.7rem;opacity:0.85;">❌ CANCELADAS</div>';
        html += '            <div style="font-size:1.3rem;font-weight:700;">' + totalCanceladas + '</div>';
        html += '            <div style="font-size:0.75rem;opacity:0.85;">' + formatMoney(valorCanceladas) + '</div>';
        html += '        </div>';
        html += '    </div>';
        html += '</div>';

        // Lista
        if (lista.length === 0) {
            html += '<div class="card" style="text-align:center;padding:30px;">';
            html += '    <i class="fas fa-archive" style="font-size:3rem;color:#ccc;"></i>';
            html += '    <p style="margin-top:15px;color:#888;">Nenhuma comanda arquivada no período</p>';
            html += '</div>';
        } else {
            html += '<div style="color:#666;font-size:0.8rem;margin-bottom:8px;">' + lista.length + ' comanda(s) encontrada(s)</div>';
            lista.forEach(function(c) {
                html += renderItemArquivada(c);
            });
        }

        container.innerHTML = html;
    } catch (e) {
        console.error('❌ Erro ao renderizar arquivadas:', e);
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
function renderItemArquivada(c) {
    const cancelada = window.comandaEstaCancelada(c);
    const bg = cancelada ? '#ffebee' : '#e8f5e9';
    const borda = cancelada ? '#c62828' : '#2e7d32';
    const label = cancelada ? 'Cancelada' : 'Fechada';
    const icone = cancelada ? 'fa-ban' : 'fa-check-circle';

    const total = Number(c.total || 0);
    const itens = window.normalizarArray(c.itens).length;

    const temClienteCadastrado = !!(c.clienteId && c.cliente);
    const nomeCliente = c.cliente ? String(c.cliente).trim() : '';
    const clienteHTML = nomeCliente
        ? (temClienteCadastrado
            ? '<span style="color:#880E4F;font-weight:600;"><i class="fas fa-user-circle"></i> ' + nomeCliente + '</span>'
            : '<span style="color:#666;"><i class="fas fa-user"></i> ' + nomeCliente + '</span>')
        : '<span style="color:#aaa;">Sem cliente</span>';

    // Fiado
    const temFiado = window.comandaTemFiado(c);
    const fiadoHTML = temFiado
        ? '<div style="font-size:0.72rem;color:#e65100;font-weight:600;margin-top:2px;">📝 FIADO: ' + formatMoney(c.valorPendente) + '</div>'
        : '';

    const dataTexto = c.dataFechamento || c.dataAbertura || '—';
    const origemLabel = c.origem === 'autoatendimento' ? ' (QR Code)' : '';

    return '<div style="background:' + bg + ';border-left:4px solid ' + borda + ';border-radius:10px;padding:12px;margin-bottom:10px;box-shadow:0 2px 4px rgba(0,0,0,0.05);">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
        '<div style="flex:1;min-width:0;">' +
        '    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '        <span style="font-size:1.2rem;font-weight:700;">Comanda ' + c.numero + '</span>' +
        '        <span style="background:' + borda + ';color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:uppercase;">' +
        '            <i class="fas ' + icone + '"></i> ' + label +
        '        </span>' +
        '    </div>' +
        '    <div style="font-size:0.8rem;color:#666;margin-top:4px;">' +
        '        <i class="fas fa-chair"></i> ' + (c.mesa || '—') + ' · ' + clienteHTML +
        '    </div>' +
        (c.garcom ? '    <div style="font-size:0.75rem;color:#888;"><i class="fas fa-user-tie"></i> ' + c.garcom + '</div>' : '') +
        '    <div style="font-size:0.72rem;color:#999;margin-top:2px;">' + dataTexto + origemLabel + '</div>' +
        fiadoHTML +
        '    <div style="font-size:0.75rem;color:#666;margin-top:2px;">' + itens + ' item(ns)</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
        '    <div style="font-size:1.2rem;font-weight:700;color:var(--primary-color);">' + formatMoney(total) + '</div>' +
        '    <div style="display:flex;gap:4px;justify-content:flex-end;margin-top:6px;">' +
        '        <button class="btn-limpar" onclick="verArquivada(' + c.id + ')" title="Ver detalhes" style="padding:4px;">' +
        '            <i class="fas fa-eye" style="color:#1976d2;font-size:0.9rem;"></i>' +
        '        </button>' +
        '        <button class="btn-limpar" onclick="reativarArquivada(' + c.id + ')" title="Reativar" style="padding:4px;">' +
        '            <i class="fas fa-redo" style="color:#2e7d32;font-size:0.9rem;"></i>' +
        '        </button>' +
        '        <button class="btn-limpar" onclick="excluirArquivada(' + c.id + ')" title="Excluir" style="padding:4px;">' +
        '            <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
        '        </button>' +
        '    </div>' +
        '</div>' +
        '</div>' +
        '</div>';
}

// ============================================================
// AÇÕES
// ============================================================
window.verArquivada = function(id) {
    window.comandaIdAtual = id;
    window.comandaOrigem = 'comandas';
    navigateTo('detalhe-comanda');
};

window.reativarArquivada = async function(id) {
    const c = window.comandasArquivadasState.comandas.find(function(x) { return String(x.id) === String(id); });
    if (!c) return;

    if (!await window.confirmar('Reativar a comanda ' + c.numero + '?\n\nEla voltará para "Abertas".')) return;

    try {
        const lista = window.normalizarArray(await apiGet('comandas'));
        const idx = lista.findIndex(function(x) { return String(x.id) === String(id); });
        if (idx >= 0) {
            // Verifica se a mesa está livre
            const mesaOcupada = lista.some(function(x) {
                if (String(x.id) === String(id)) return false;
                return window.comandaEstaAtiva(x) && String(x.mesa) === String(c.mesa);
            });
            if (mesaOcupada) {
                alert('Não é possível reativar: a mesa ' + c.mesa + ' já está ocupada.');
                return;
            }

            lista[idx].status = 'aberta';
            delete lista[idx].pagamentos;
            delete lista[idx].troco;
            delete lista[idx].desconto;
            delete lista[idx].dataFechamento;
            delete lista[idx].motivoCancelamento;
            delete lista[idx].pagamentoPendente;
            delete lista[idx].valorPendente;
        }
        await apiSave('comandas', lista);

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Comanda ' + c.numero + ' reativada');
        } else {
            alert('✅ Comanda reativada');
        }
        carregarComandasArquivadas();
    } catch (e) {
        console.error('Erro ao reativar:', e);
        alert('Erro: ' + e.message);
    }
};

window.excluirArquivada = async function(id) {
    const c = window.comandasArquivadasState.comandas.find(function(x) { return String(x.id) === String(id); });
    if (!c) return;

    if (!await window.confirmar('ATENÇÃO: Excluir a comanda ' + c.numero + ' definitivamente?\n\nEssa ação não pode ser desfeita.')) return;

    try {
        const lista = window.normalizarArray(await apiGet('comandas'));
        const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
        await apiSave('comandas', novaLista);

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Comanda excluída');
        }
        carregarComandasArquivadas();
    } catch (e) {
        console.error('Erro ao excluir:', e);
        alert('Erro: ' + e.message);
    }
};

// ============================================================
// HELPERS
// ============================================================
function getPeriodoTextoArquivadas() {
    const f = window.comandasArquivadasState.filtroPeriodo;
    const map = {
        'hoje': '📅 Hoje', '7dias': '📅 Últimos 7 dias', '30dias': '📅 Últimos 30 dias',
        'mes': '📅 Mês atual', 'todas': '📅 Todas'
    };
    if (f === 'custom') {
        const s = window.comandasArquivadasState;
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
window.imprimirComandasArquivadas = function() {
    const lista = filtrarArquivadas();

    let totalFechadas = 0;
    let totalCanceladas = 0;
    let valorFechadas = 0;
    let valorCanceladas = 0;

    lista.forEach(function(c) {
        if (window.comandaEstaFechada(c)) {
            totalFechadas++;
            valorFechadas += Number(c.total || 0);
        } else if (window.comandaEstaCancelada(c)) {
            totalCanceladas++;
            valorCanceladas += Number(c.total || 0);
        }
    });

    let itensHTML = '';
    lista.forEach(function(c) {
        const cancelada = window.comandaEstaCancelada(c);
        itensHTML += '<tr>' +
                     '<td>' + (c.dataFechamento || c.dataAbertura || '') + '</td>' +
                     '<td>' + c.numero + '</td>' +
                     '<td>' + (c.mesa || '—') + '</td>' +
                     '<td>' + (c.cliente || '—') + '</td>' +
                     '<td>' + (cancelada ? 'Cancelada' : 'Fechada') + '</td>' +
                     '<td style="text-align:right;">' + formatMoney(c.total || 0) + '</td>' +
                     '</tr>';
    });

    const agora = new Date();
    const dataTexto = agora.toLocaleDateString('pt-BR') + ' ' +
                      String(agora.getHours()).padStart(2, '0') + ':' +
                      String(agora.getMinutes()).padStart(2, '0');

    const janela = window.open('', '', 'width=800,height=800');
    janela.document.write(
        '<html><head><title>Comandas Arquivadas</title>' +
        '<style>' +
        'body{font-family:monospace;font-size:11px;padding:15px;}' +
        'h1{font-size:16px;text-align:center;}' +
        'table{width:100%;border-collapse:collapse;margin-top:8px;}' +
        'th{border-bottom:1px solid #000;padding:4px;text-align:left;}' +
        'td{padding:3px 4px;border-bottom:1px dotted #ccc;}' +
        'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
        '.total{font-size:14px;font-weight:bold;margin-top:10px;}' +
        '</style></head><body>' +
        '<h1>COMANDAS ARQUIVADAS</h1>' +
        '<div style="text-align:center;">' + getPeriodoTextoArquivadas() + '</div>' +
        '<div style="text-align:center;font-size:10px;">Emitido em ' + dataTexto + '</div>' +
        '<hr>' +
        '<div>Fechadas: <b>' + totalFechadas + '</b> · Valor: <b>' + formatMoney(valorFechadas) + '</b></div>' +
        '<div>Canceladas: <b>' + totalCanceladas + '</b> · Valor: <b>' + formatMoney(valorCanceladas) + '</b></div>' +
        '<hr>' +
        '<table>' +
        '<thead><tr><th>Data</th><th>Nº</th><th>Mesa</th><th>Cliente</th><th>Status</th><th>Total</th></tr></thead>' +
        '<tbody>' + itensHTML + '</tbody>' +
        '</table>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>' +
        '</body></html>'
    );
    janela.document.close();
};

console.log('✔ ComandasArquivadas.js — todas as funções expostas');