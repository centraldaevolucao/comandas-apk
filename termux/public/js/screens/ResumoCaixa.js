// ============================================================
// RESUMOCAIXA.JS — Resumo detalhado do caixa (atual ou histórico)
//
// Modos:
//   • SEM window.resumoCaixaId → mostra o caixa ABERTO atual
//   • COM window.resumoCaixaId → mostra um caixa FECHADO específico
//     (usado pelo Histórico no botão "Ver detalhes")
// ============================================================

console.log('✔ ResumoCaixa.js carregado');

window.resumoCaixaId = window.resumoCaixaId || null;
window.resumoCaixaOrigem = window.resumoCaixaOrigem || null;

// ============================================================
// RENDER
// ============================================================
window.renderResumoCaixa = function() {
    setTimeout(carregarResumoCaixa, 50);

    const veioDoHistorico = !!window.resumoCaixaId;

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarResumoCaixa()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (veioDoHistorico ? 'Detalhes do Caixa' : 'Resumo do Caixa') + '</h1>',
        '    <button class="icon-btn" onclick="carregarResumoCaixa()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>',
        '</div>',
        '<div class="content-area" id="resumo-caixa-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

window.voltarResumoCaixa = function() {
    const origem = window.resumoCaixaOrigem;
    window.resumoCaixaId = null;
    window.resumoCaixaOrigem = null;

    if (origem === 'historico') {
        navigateTo('historico-caixa');
    } else {
        navigateTo('caixa');
    }
};

// ============================================================
// CARREGA
// ============================================================
async function carregarResumoCaixa() {
    const container = document.getElementById('resumo-caixa-conteudo');
    if (!container) return;

    try {
        // --------------------------------------------
        // 1. Descobre QUAL caixa mostrar
        // --------------------------------------------
        let caixa = null;

        if (window.resumoCaixaId) {
            const caixas = await apiGet('caixas') || [];
            caixa = caixas.find(function(c) {
                return String(c.id) === String(window.resumoCaixaId);
            });
        } else {
            const caixaArr = await apiGet('caixaAtual');
            caixa = (Array.isArray(caixaArr) && caixaArr.length > 0 && caixaArr[0].status === 'aberto')
                ? caixaArr[0]
                : null;
        }

        if (!caixa) {
            container.innerHTML =
                '<div class="card" style="text-align:center;padding:30px;">' +
                '    <i class="fas fa-lock" style="font-size:3rem;color:#c62828;"></i>' +
                '    <p style="margin-top:15px;color:#888;">Caixa não encontrado.</p>' +
                '    <button class="btn-outline" style="margin-top:15px;" onclick="voltarResumoCaixa()">' +
                '        <i class="fas fa-arrow-left"></i> Voltar' +
                '    </button>' +
                '</div>';
            return;
        }

        // --------------------------------------------
        // 2. Carrega dados auxiliares
        // --------------------------------------------
        const comandas = await apiGet('comandas') || [];
        const sangrias = await apiGet('sangrias') || [];

        const cor = window.CORES_CAIXA.find(function(c) { return c.id === caixa.cor; });
        const corHex = cor ? cor.hex : '#C2185B';

        // --------------------------------------------
        // 3. Filtra comandas deste caixa
        // --------------------------------------------
        const comandasDoCaixa = comandas.filter(function(c) {
            return String(c.caixaId) === String(caixa.id);
        });
        const fechadas   = comandasDoCaixa.filter(window.comandaEstaFechada);
        const ativas     = comandasDoCaixa.filter(window.comandaEstaAtiva);
        const canceladas = comandasDoCaixa.filter(window.comandaEstaCancelada);

        // --------------------------------------------
        // 4. Calcula totais financeiros
        // --------------------------------------------
        let totalVendas = 0;
        let totalDinheiro = 0;
        let totalDebito = 0;
        let totalCredito = 0;
        let totalPix = 0;

        fechadas.forEach(function(c) {
            totalVendas += Number(c.total || 0);
            window.pagamentosLiquidos(c).forEach(function(p) {
                if (p.forma === 'dinheiro') totalDinheiro += Number(p.valor || 0);
                else if (p.forma === 'debito') totalDebito += Number(p.valor || 0);
                else if (p.forma === 'credito') totalCredito += Number(p.valor || 0);
                else if (p.forma === 'pix') totalPix += Number(p.valor || 0);
            });
        });

        // --------------------------------------------
        // 5. Sangrias/suprimentos
        // --------------------------------------------
        const sangriasCaixa = sangrias.filter(function(s) {
            return String(s.caixaId) === String(caixa.id);
        });

        let totalSangrias = 0;
        let totalSuprimentos = 0;
        sangriasCaixa.forEach(function(s) {
            if (s.tipo === 'sangria') totalSangrias += Number(s.valor || 0);
            else if (s.tipo === 'suprimento') totalSuprimentos += Number(s.valor || 0);
        });

        const valorInicial = Number(caixa.valorInicial || 0);
        const saldoDinheiroEsperado = valorInicial + totalDinheiro - totalSangrias + totalSuprimentos;

        const isFechado = caixa.status === 'fechado';
        const diferenca = Number(caixa.diferenca || 0);
        const difCor = Math.abs(diferenca) < 0.01
            ? '#4caf50'
            : (diferenca > 0 ? '#2e7d32' : '#c62828');
        const difTexto = Math.abs(diferenca) < 0.01
            ? 'OK'
            : ((diferenca > 0 ? '+' : '') + formatMoney(diferenca));

        // ============================================================
        // HTML
        // ============================================================
        let html = '';

        // --------------------------------------------
        // CABEÇALHO
        // --------------------------------------------
        html += '<div style="padding:16px;background:linear-gradient(135deg, ' + corHex + ' 0%, ' + ajustarTomHexResumo(corHex, -25) + ' 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
        html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;">';
        html += '        <div>';
        html += '            <div style="font-size:0.75rem;opacity:0.85;">' + (isFechado ? 'CAIXA FECHADO' : 'CAIXA ABERTO') + '</div>';
        html += '            <div style="font-size:1.4rem;font-weight:700;margin-top:2px;">' + (cor ? cor.label : '—') + '</div>';
        html += '            <div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">';
        html += '                <i class="fas fa-unlock"></i> ' + (caixa.dataAbertura || '—');
        html += '            </div>';
        if (isFechado) {
            html += '            <div style="font-size:0.8rem;opacity:0.9;">';
            html += '                <i class="fas fa-lock"></i> ' + (caixa.dataFechamento || '—');
            html += '            </div>';
        }
        html += '            <div style="font-size:0.75rem;opacity:0.8;">Por: ' + (caixa.usuario || 'Operador') + '</div>';
        html += '        </div>';
        html += '        <i class="fas fa-' + (isFechado ? 'lock' : 'unlock') + '" style="font-size:2rem;opacity:0.8;"></i>';
        html += '    </div>';
        html += '</div>';

        // --------------------------------------------
        // TOTAL DE VENDAS (destaque)
        // --------------------------------------------
        html += '<div class="card" style="background:linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%);text-align:center;">';
        html += '    <div style="font-size:0.85rem;color:#C2185B;">Total de vendas</div>';
        html += '    <div style="font-size:2rem;font-weight:700;color:var(--primary-color);margin-top:4px;">' + formatMoney(totalVendas) + '</div>';
        html += '    <div style="font-size:0.75rem;color:#666;margin-top:4px;">' + fechadas.length + ' comanda(s) fechada(s)</div>';
        html += '</div>';

        // --------------------------------------------
        // CONFERÊNCIA (se fechado)
        // --------------------------------------------
        if (isFechado) {
            html += '<div class="card" style="background:#fff;">';
            html += '    <div class="card-title">⚖️ Conferência</div>';
            html += linhaResumo('Valor esperado', caixa.valorEsperado || 0);
            html += linhaResumo('Valor contado', caixa.valorContado || 0);
            html += '<div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:6px;border-top:2px solid #eee;">';
            html += '    <strong>Diferença</strong>';
            html += '    <strong style="color:' + difCor + ';font-size:1.2rem;">' + difTexto + '</strong>';
            html += '</div>';
            if (caixa.observacaoFechamento) {
                html += '<div style="margin-top:10px;padding:10px;background:#f5f5f5;border-radius:6px;font-size:0.85rem;color:#666;">';
                html += '    <i class="fas fa-comment"></i> ' + caixa.observacaoFechamento;
                html += '</div>';
            }
            html += '</div>';
        }

        // --------------------------------------------
        // SALDO EM DINHEIRO
        // --------------------------------------------
        html += '<div class="card" style="background:#fff;">';
        html += '    <div class="card-title">💵 Saldo em dinheiro</div>';
        html += linhaResumo('Fundo inicial', valorInicial);
        html += linhaResumo('Vendas em dinheiro', totalDinheiro);
        html += linhaResumo('Suprimentos', totalSuprimentos, '#2e7d32');
        html += linhaResumo('Sangrias', -totalSangrias, '#c62828');
        html += '<div style="display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid #eee;">';
        html += '    <strong>Saldo esperado</strong>';
        html += '    <strong style="color:var(--primary-color);font-size:1.2rem;">' + formatMoney(saldoDinheiroEsperado) + '</strong>';
        html += '</div>';
        html += '</div>';

        // --------------------------------------------
        // FORMAS DE PAGAMENTO
        // --------------------------------------------
        html += '<div class="card" style="background:#fff;">';
        html += '    <div class="card-title">📊 Vendas por forma de pagamento</div>';
        html += linhaResumo('💵 Dinheiro', totalDinheiro);
        html += linhaResumo('💳 Débito', totalDebito);
        html += linhaResumo('💳 Crédito', totalCredito);
        html += linhaResumo('📱 PIX', totalPix);
        html += '<div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:6px;border-top:1px solid #eee;">';
        html += '    <strong>Total</strong>';
        html += '    <strong style="color:var(--primary-color);">' + formatMoney(totalVendas) + '</strong>';
        html += '</div>';
        html += '</div>';

        // --------------------------------------------
        // CONTADORES — SEMPRE INTEIROS
        // --------------------------------------------
        html += '<div class="card" style="background:#fff;">';
        html += '    <div class="card-title">📋 Comandas</div>';

        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;">';
        html += '    <span style="color:#666;">🟢 Em aberto</span>';
        html += '    <span style="font-weight:600;color:#ff9800;">' + parseInt(ativas.length, 10) + '</span>';
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;">';
        html += '    <span style="color:#666;">✅ Fechadas</span>';
        html += '    <span style="font-weight:600;color:#2e7d32;">' + parseInt(fechadas.length, 10) + '</span>';
        html += '</div>';

        html += '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;">';
        html += '    <span style="color:#666;">❌ Canceladas</span>';
        html += '    <span style="font-weight:600;color:#c62828;">' + parseInt(canceladas.length, 10) + '</span>';
        html += '</div>';

        html += '</div>';

        // --------------------------------------------
        // MOVIMENTAÇÕES
        // --------------------------------------------
        if (sangriasCaixa.length > 0) {
            html += '<div class="card" style="background:#fff;">';
            html += '    <div class="card-title">📝 Movimentações</div>';
            sangriasCaixa.slice().reverse().forEach(function(s) {
                const isSangria = s.tipo === 'sangria';
                const corTxt = isSangria ? '#c62828' : '#2e7d32';
                const icone = isSangria ? 'fa-arrow-up' : 'fa-arrow-down';
                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f0f0f0;">';
                html += '    <div style="flex:1;">';
                html += '        <div style="font-weight:500;font-size:0.9rem;color:' + corTxt + ';">';
                html += '            <i class="fas ' + icone + '"></i> ' + (isSangria ? 'Sangria' : 'Suprimento');
                html += '        </div>';
                html += '        <div style="font-size:0.75rem;color:#888;">' + (s.motivo || 'Sem motivo') + '</div>';
                html += '        <div style="font-size:0.7rem;color:#aaa;">' + (s.data || '') + '</div>';
                html += '    </div>';
                html += '    <div style="font-weight:700;color:' + corTxt + ';">' + (isSangria ? '-' : '+') + formatMoney(s.valor) + '</div>';
                html += '</div>';
            });
            html += '</div>';
        }

        // --------------------------------------------
        // AÇÕES (só se aberto)
        // --------------------------------------------
        if (!isFechado) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">';
            html += '    <button class="btn-outline" style="background:#fff3e0;border-color:#ff9800;color:#e65100;padding:12px;" onclick="irParaSangriaDoResumo()">';
            html += '        <i class="fas fa-arrow-up"></i> Sangria</button>';
            html += '    <button class="btn-outline" style="background:#e8f5e9;border-color:#4caf50;color:#2e7d32;padding:12px;" onclick="irParaSuprimentoDoResumo()">';
            html += '        <i class="fas fa-arrow-down"></i> Suprimento</button>';
            html += '</div>';
        }

        // --------------------------------------------
        // BOTÃO VOLTAR
        // --------------------------------------------
        html += '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="voltarResumoCaixa()">';
        html += '    <i class="fas fa-arrow-left"></i> Voltar';
        html += '</button>';

        container.innerHTML = html;

    } catch (e) {
        console.error('❌ Erro ResumoCaixa:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar resumo: ' + e.message + '</p>';
    }
}

window.carregarResumoCaixa = carregarResumoCaixa;

// ============================================================
// NAVEGAÇÃO AUXILIAR
// ============================================================
window.irParaSangriaDoResumo = function() {
    navigateTo('caixa');
    setTimeout(function() {
        if (typeof abrirModalSangria === 'function') abrirModalSangria();
    }, 300);
};

window.irParaSuprimentoDoResumo = function() {
    navigateTo('caixa');
    setTimeout(function() {
        if (typeof abrirModalSuprimento === 'function') abrirModalSuprimento();
    }, 300);
};

// ============================================================
// HELPERS
// ============================================================
/**
 * Linha de resumo.
 * - Se isContador=true → inteiro puro (sem R$).
 * - Senão → formata como moeda.
 * - Fallback: se o label for claramente de contador, força inteiro
 *   mesmo que isContador não seja passado.
 */
function linhaResumo(label, valor, cor, isContador) {
    const corTexto = cor || '#333';
    const labelLower = String(label || '').toLowerCase();

    const labelEhContador =
        labelLower.indexOf('em aberto') >= 0 ||
        labelLower.indexOf('fechadas') >= 0 ||
        labelLower.indexOf('canceladas') >= 0 ||
        labelLower.indexOf('comandas') >= 0 ||
        labelLower.indexOf('sangrias') >= 0 ||
        labelLower.indexOf('suprimentos') >= 0 ||
        labelLower.indexOf('quantidade') >= 0;

    let valorTexto;
    if (isContador === true || (isContador !== false && labelEhContador)) {
        valorTexto = String(parseInt(Number(valor) || 0, 10));
    } else {
        valorTexto = formatMoney(valor);
    }

    return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.9rem;">' +
           '    <span style="color:#666;">' + label + '</span>' +
           '    <span style="font-weight:600;color:' + corTexto + ';">' + valorTexto + '</span>' +
           '</div>';
}

function ajustarTomHexResumo(hex, delta) {
    const n = parseInt(hex.replace('#', ''), 16);
    let r = Math.max(0, Math.min(255, (n >> 16) + delta));
    let g = Math.max(0, Math.min(255, ((n >> 8) & 0x00FF) + delta));
    let b = Math.max(0, Math.min(255, (n & 0x0000FF) + delta));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}