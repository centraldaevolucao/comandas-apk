// ============================================================
// TOTAISESPECIE.JS — Totais por forma de pagamento
// (Dinheiro, Débito, Crédito, PIX)
// Com filtro de período, resumo e detalhamento por dia
// ============================================================

console.log('✔ TotaisEspecie.js carregado');

window.totaisEspecieState = {
    comandas: [],
    filtroData: 'hoje',
    dataIni: '',
    dataFim: '',
    agrupar: 'total'  // total | dia
};

// ============================================================
// RENDER
// ============================================================
window.renderTotaisEspecie = function() {
    setTimeout(carregarTotaisEspecie, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Totais por Espécie</h1>',
        '    <button class="icon-btn" onclick="imprimirTotaisEspecie()" title="Imprimir"><i class="fas fa-print"></i></button>',
        '</div>',

        // Período
        '<div style="padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">',
        '    <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
        '    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="te-chips-data"></div>',
        '    <div id="te-custom-date" style="display:none;margin-top:10px;">',
        '        <div style="display:flex;gap:8px;">',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Inicial</label>',
        '                <input type="date" id="te-data-ini" onchange="aplicarFiltrosTE()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Final</label>',
        '                <input type="date" id="te-data-fim" onchange="aplicarFiltrosTE()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '        </div>',
        '    </div>',
        '</div>',

        // Agrupamento
        '<div style="padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">',
        '    <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Visão</label>',
        '    <div style="display:flex;gap:6px;" id="te-chips-visao"></div>',
        '</div>',

        // Conteúdo
        '<div class="content-area" id="te-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarTotaisEspecie() {
    const container = document.getElementById('te-conteudo');
    if (!container) return;

    try {
        const comandas = await apiGet('comandas');
        window.totaisEspecieState.comandas = window.normalizarArray(comandas);

        renderChipsDataTE();
        renderChipsVisaoTE();
        renderConteudoTE();
    } catch (e) {
        console.error('❌ Erro TE:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.carregarTotaisEspecie = carregarTotaisEspecie;

// ============================================================
// CHIPS PERÍODO
// ============================================================
function renderChipsDataTE() {
    const container = document.getElementById('te-chips-data');
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
    const ativa = window.totaisEspecieState.filtroData;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroDataTE(\'' + a.id + '\')" style="font-size:0.78rem;">' + a.label + '</button>';
    }).join('');

    const custom = document.getElementById('te-custom-date');
    if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
}

window.mudarFiltroDataTE = function(filtro) {
    window.totaisEspecieState.filtroData = filtro;
    renderChipsDataTE();
    renderConteudoTE();
};

// ============================================================
// CHIPS VISÃO
// ============================================================
function renderChipsVisaoTE() {
    const container = document.getElementById('te-chips-visao');
    if (!container) return;

    const abas = [
        { id: 'total', label: 'Total geral' },
        { id: 'dia',   label: 'Por dia' }
    ];
    const ativa = window.totaisEspecieState.agrupar;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarAgruparTE(\'' + a.id + '\')" style="flex:1;font-size:0.8rem;">' + a.label + '</button>';
    }).join('');
}

window.mudarAgruparTE = function(agrupar) {
    window.totaisEspecieState.agrupar = agrupar;
    renderChipsVisaoTE();
    renderConteudoTE();
};

// ============================================================
// APLICAR FILTROS
// ============================================================
window.aplicarFiltrosTE = function() {
    window.totaisEspecieState.dataIni = (document.getElementById('te-data-ini') || {}).value || '';
    window.totaisEspecieState.dataFim = (document.getElementById('te-data-fim') || {}).value || '';
    renderConteudoTE();
};

// ============================================================
// INTERVALO
// ============================================================
function calcularIntervaloTE() {
    const filtro = window.totaisEspecieState.filtroData;
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
        const s = window.totaisEspecieState;
        if (s.dataIni) ini = new Date(s.dataIni + 'T00:00:00');
        if (s.dataFim) fim = new Date(s.dataFim + 'T23:59:59');
    }
    return { ini, fim };
}

// ============================================================
// FILTRA
// ============================================================
function filtrarComandasTE() {
    let lista = window.totaisEspecieState.comandas.slice();

    lista = lista.filter(function(c) { return window.comandaEstaFechada(c); });

    const { ini, fim } = calcularIntervaloTE();
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
function renderConteudoTE() {
    const container = document.getElementById('te-conteudo');
    if (!container) return;

    try {
        const comandas = filtrarComandasTE();

        if (window.totaisEspecieState.agrupar === 'dia') {
            renderVisaoPorDiaTE(container, comandas);
        } else {
            renderVisaoTotalTE(container, comandas);
        }
    } catch (e) {
        console.error('❌ Erro ao renderizar TE:', e);
        container.innerHTML =
            '<div class="card" style="padding:20px;text-align:center;">' +
            '    <i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i>' +
            '    <p style="margin-top:10px;color:#c62828;">Erro: ' + e.message + '</p>' +
            '</div>';
    }
}

// ---------- VISÃO TOTAL ----------
function renderVisaoTotalTE(container, comandas) {
    const totais = {
        dinheiro: 0,
        debito: 0,
        credito: 0,
        pix: 0,
        outros: 0
    };
    let totalGeral = 0;
    let qtdComandas = 0;

    comandas.forEach(function(c) {
        qtdComandas++;
        window.pagamentosLiquidos(c).forEach(function(p) {
            const valor = Number(p.valor || 0);
            if (totais[p.forma] !== undefined) totais[p.forma] += valor;
            else totais.outros += valor;
            totalGeral += valor;
        });
    });

    const formas = [
        { id: 'dinheiro', label: '💵 Dinheiro',   cor: '#4caf50', valor: totais.dinheiro },
        { id: 'debito',   label: '💳 Débito',     cor: '#1976d2', valor: totais.debito },
        { id: 'credito',  label: '💳 Crédito',    cor: '#C2185B', valor: totais.credito },
        { id: 'pix',      label: '📱 PIX',        cor: '#ff9800', valor: totais.pix }
    ];
    if (totais.outros > 0) {
        formas.push({ id: 'outros', label: 'Outros', cor: '#888', valor: totais.outros });
    }

    let html = '';

    // Cabeçalho
    html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
    html += '    <div style="font-size:0.75rem;opacity:0.9;">' + getPeriodoTextoTE() + '</div>';
    html += '    <div style="font-size:2rem;font-weight:700;margin-top:6px;">' + formatMoney(totalGeral) + '</div>';
    html += '    <div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">' + qtdComandas + ' comanda(s) fechada(s)</div>';
    html += '</div>';

    // Pizza
    const formasComValor = formas.filter(function(f) { return f.valor > 0; });
    if (formasComValor.length > 0) {
        html += '<div class="card">';
        html += '    <div class="card-title">📊 Distribuição</div>';
        html += renderPizzaTE(formasComValor, totalGeral);
        html += '</div>';
    }

    // Detalhamento
    html += '<div class="card">';
    html += '    <div class="card-title">💰 Totais por forma</div>';
    formas.forEach(function(f) {
        const pct = totalGeral > 0 ? (f.valor / totalGeral * 100) : 0;
        html += '<div style="padding:10px 0;border-bottom:1px solid #f0f0f0;">';
        html += '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
        html += '        <div style="display:flex;align-items:center;gap:8px;">';
        html += '            <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + f.cor + ';"></span>';
        html += '            <span style="font-weight:600;">' + f.label + '</span>';
        html += '        </div>';
        html += '        <span style="font-weight:700;color:' + f.cor + ';">' + formatMoney(f.valor) + '</span>';
        html += '    </div>';
        html += '    <div style="background:#eee;height:6px;border-radius:3px;overflow:hidden;">';
        html += '        <div style="height:100%;width:' + pct + '%;background:' + f.cor + ';"></div>';
        html += '    </div>';
        html += '    <div style="font-size:0.7rem;color:#888;margin-top:2px;text-align:right;">' + pct.toFixed(1) + '%</div>';
        html += '</div>';
    });
    html += '<div style="margin-top:12px;padding-top:10px;border-top:2px solid #eee;display:flex;justify-content:space-between;">';
    html += '    <b>Total geral</b><b style="color:var(--primary-color);font-size:1.1rem;">' + formatMoney(totalGeral) + '</b>';
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
}

// ---------- VISÃO POR DIA ----------
function renderVisaoPorDiaTE(container, comandas) {
    const mapa = {};

    comandas.forEach(function(c) {
        const data = window.parseDataBR(c.dataFechamento || c.dataAbertura);
        if (!data) return;
        const chave = data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
        if (!mapa[chave]) mapa[chave] = { data: chave, dinheiro: 0, debito: 0, credito: 0, pix: 0, outros: 0, total: 0, qtd: 0 };
        mapa[chave].qtd++;
        window.pagamentosLiquidos(c).forEach(function(p) {
            const valor = Number(p.valor || 0);
            if (mapa[chave][p.forma] !== undefined) mapa[chave][p.forma] += valor;
            else mapa[chave].outros += valor;
            mapa[chave].total += valor;
        });
    });

    const arr = Object.values(mapa).sort(function(a, b) { return a.data.localeCompare(b.data); });

    let html = '';

    if (arr.length === 0) {
        html += '<div class="card" style="text-align:center;padding:30px;">';
        html += '    <i class="fas fa-calendar-times" style="font-size:3rem;color:#ccc;"></i>';
        html += '    <p style="margin-top:15px;color:#888;">Nenhum dado no período</p>';
        html += '</div>';
        container.innerHTML = html;
        return;
    }

    // Resumo geral
    let totalGeral = 0;
    let totalQtd = 0;
    arr.forEach(function(x) { totalGeral += x.total; totalQtd += x.qtd; });

    html += '<div style="padding:14px 16px;background:linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
    html += '    <div style="font-size:0.75rem;opacity:0.9;">' + getPeriodoTextoTE() + '</div>';
    html += '    <div style="font-size:2rem;font-weight:700;margin-top:6px;">' + formatMoney(totalGeral) + '</div>';
    html += '    <div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">' + arr.length + ' dia(s) · ' + totalQtd + ' comanda(s)</div>';
    html += '</div>';

    // Cards por dia
    arr.forEach(function(x) {
        const [ano, mes, dia] = x.data.split('-');
        const dataFormatada = dia + '/' + mes + '/' + ano;

        html += '<div class="card" style="margin-bottom:12px;">';
        html += '    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
        html += '        <div>';
        html += '            <div style="font-weight:700;font-size:1rem;"><i class="fas fa-calendar-day"></i> ' + dataFormatada + '</div>';
        html += '            <div style="font-size:0.75rem;color:#888;">' + x.qtd + ' comanda(s)</div>';
        html += '        </div>';
        html += '        <div style="font-weight:700;color:var(--primary-color);font-size:1.1rem;">' + formatMoney(x.total) + '</div>';
        html += '    </div>';
        html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:0.8rem;">';
        if (x.dinheiro > 0) html += '<div><span style="color:#4caf50;">💵</span> ' + formatMoney(x.dinheiro) + '</div>';
        if (x.debito > 0)   html += '<div><span style="color:#1976d2;">💳</span> Débito ' + formatMoney(x.debito) + '</div>';
        if (x.credito > 0)  html += '<div><span style="color:#C2185B;">💳</span> Crédito ' + formatMoney(x.credito) + '</div>';
        if (x.pix > 0)      html += '<div><span style="color:#ff9800;">📱</span> ' + formatMoney(x.pix) + '</div>';
        if (x.outros > 0)   html += '<div><span style="color:#888;">Outros</span> ' + formatMoney(x.outros) + '</div>';
        html += '    </div>';
        html += '</div>';
    });

    container.innerHTML = html;
}

// ============================================================
// HELPERS
// ============================================================
function getPeriodoTextoTE() {
    const f = window.totaisEspecieState.filtroData;
    const map = {
        'hoje': '📅 Hoje', 'ontem': '📅 Ontem', '7dias': '📅 Últimos 7 dias',
        '30dias': '📅 Últimos 30 dias', 'mes': '📅 Mês atual', 'todas': '📅 Todas'
    };
    if (f === 'custom') {
        const s = window.totaisEspecieState;
        if (s.dataIni && s.dataFim) return '📅 ' + s.dataIni + ' a ' + s.dataFim;
        if (s.dataIni) return '📅 De ' + s.dataIni;
        if (s.dataFim) return '📅 Até ' + s.dataFim;
        return '📅 Personalizado';
    }
    return map[f] || '';
}

function renderPizzaTE(formas, total) {
    if (total <= 0) return '';
    let acumulado = 0;
    const stops = [];
    formas.forEach(function(f) {
        const ini = acumulado / total * 360;
        acumulado += f.valor;
        const fim = acumulado / total * 360;
        stops.push(f.cor + ' ' + ini + 'deg ' + fim + 'deg');
    });

    return '<div style="display:flex;justify-content:center;margin:12px 0;">' +
           '    <div style="width:160px;height:160px;border-radius:50%;background:conic-gradient(' + stops.join(', ') + ');box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>' +
           '</div>';
}

// ============================================================
// IMPRESSÃO
// ============================================================
window.imprimirTotaisEspecie = function() {
    const comandas = filtrarComandasTE();
    const totais = { dinheiro: 0, debito: 0, credito: 0, pix: 0, outros: 0 };
    let totalGeral = 0;

    comandas.forEach(function(c) {
        window.pagamentosLiquidos(c).forEach(function(p) {
            const valor = Number(p.valor || 0);
            if (totais[p.forma] !== undefined) totais[p.forma] += valor;
            else totais.outros += valor;
            totalGeral += valor;
        });
    });

    const agora = new Date();
    const dataTexto = agora.toLocaleDateString('pt-BR') + ' ' +
                      String(agora.getHours()).padStart(2, '0') + ':' +
                      String(agora.getMinutes()).padStart(2, '0');

    const janela = window.open('', '', 'width=500,height=700');
    janela.document.write(
        '<html><head><title>Totais por Espécie</title>' +
        '<style>' +
        'body{font-family:monospace;font-size:12px;padding:15px;max-width:500px;margin:0 auto;}' +
        'h1{font-size:16px;text-align:center;}' +
        'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
        '.linha{display:flex;justify-content:space-between;padding:4px 0;}' +
        '.destaque{font-weight:bold;font-size:14px;border-top:1px solid #000;padding-top:6px;margin-top:6px;}' +
        '</style></head><body>' +
        '<h1>TOTAIS POR ESPÉCIE</h1>' +
        '<div style="text-align:center;">' + getPeriodoTextoTE() + '</div>' +
        '<div style="text-align:center;font-size:10px;">Emitido em ' + dataTexto + '</div>' +
        '<hr>' +
        '<div class="linha"><span>Comandas fechadas</span><span>' + comandas.length + '</span></div>' +
        '<hr>' +
        '<div class="linha"><span>💵 Dinheiro</span><span>' + formatMoney(totais.dinheiro) + '</span></div>' +
        '<div class="linha"><span>💳 Débito</span><span>' + formatMoney(totais.debito) + '</span></div>' +
        '<div class="linha"><span>💳 Crédito</span><span>' + formatMoney(totais.credito) + '</span></div>' +
        '<div class="linha"><span>📱 PIX</span><span>' + formatMoney(totais.pix) + '</span></div>' +
        (totais.outros > 0 ? '<div class="linha"><span>Outros</span><span>' + formatMoney(totais.outros) + '</span></div>' : '') +
        '<div class="linha destaque"><span>TOTAL</span><span>' + formatMoney(totalGeral) + '</span></div>' +
        '<hr>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script>' +
        '</body></html>'
    );
    janela.document.close();
};

console.log('✔ TotaisEspecie.js — todas as funções expostas');