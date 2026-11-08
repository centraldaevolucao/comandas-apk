// ============================================================
// RELATORIOESTOQUE.JS — Relatório de estoque
// ============================================================

console.log('✔ RelatorioEstoque.js carregado');

window.renderRelatorioEstoque = function() {
    console.log('🎬 renderRelatorioEstoque chamado');

    setTimeout(carregarRelatorioEstoque, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Estoque</h1>',
        '    <button class="icon-btn" onclick="imprimirRelatorioEstoque()" title="Imprimir"><i class="fas fa-print"></i></button>',
        '</div>',
        '<div class="content-area" id="relatorio-estoque-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

async function carregarRelatorioEstoque() {
    const container = document.getElementById('relatorio-estoque-conteudo');
    if (!container) return;

    try {
        const produtos = await apiGet('produtos');
        const produtosAtivos = (Array.isArray(produtos) ? produtos : []).filter(function(p) { return p.inativo !== true; });

        // Separa por status
        const zerados = produtosAtivos.filter(function(p) { return Number(p.estoque || 0) <= 0; });
        const criticos = produtosAtivos.filter(function(p) {
            const est = Number(p.estoque || 0);
            const min = Number(p.estoqueMinimo || 0);
            return est > 0 && est <= min;
        });
        const ok = produtosAtivos.filter(function(p) {
            const est = Number(p.estoque || 0);
            const min = Number(p.estoqueMinimo || 0);
            return est > min;
        });

        // Valor total em estoque
        let valorTotal = 0;
        produtosAtivos.forEach(function(p) {
            valorTotal += Number(p.estoque || 0) * Number(p.valorCusto || 0);
        });

        let html = '';

        // Resumo
        html += '<div style="padding:12px 16px;background:linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
        html += '    <div style="font-size:0.75rem;opacity:0.9;">Valor investido em estoque</div>';
        html += '    <div style="font-size:2rem;font-weight:700;margin-top:6px;">' + formatMoney(valorTotal) + '</div>';
        html += '    <div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">' + produtosAtivos.length + ' produtos ativos</div>';
        html += '</div>';

        // Cards
        html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
        html += cardResumoEstoque('OK', ok.length, '#4caf50');
        html += cardResumoEstoque('Crítico', criticos.length, '#ff9800');
        html += cardResumoEstoque('Zerado', zerados.length, '#c62828');
        html += '</div>';

        // Zerados
        if (zerados.length > 0) {
            html += '<div class="card" style="background:#ffebee;border-left:4px solid #c62828;">';
            html += '    <div class="card-title" style="color:#c62828;">🚫 Produtos zerados (' + zerados.length + ')</div>';
            zerados.forEach(function(p) {
                html += linhaProdutoEstoque(p, '#c62828');
            });
            html += '</div>';
        }

        // Críticos
        if (criticos.length > 0) {
            html += '<div class="card" style="background:#fff3e0;border-left:4px solid #ff9800;">';
            html += '    <div class="card-title" style="color:#e65100;">⚠️ Estoque crítico (' + criticos.length + ')</div>';
            criticos.forEach(function(p) {
                html += linhaProdutoEstoque(p, '#e65100');
            });
            html += '</div>';
        }

        // OK
        if (ok.length > 0) {
            html += '<div class="card" style="background:#e8f5e9;border-left:4px solid #4caf50;">';
            html += '    <div class="card-title" style="color:#2e7d32;">✅ Estoque OK (' + ok.length + ')</div>';
            ok.forEach(function(p) {
                html += linhaProdutoEstoque(p, '#2e7d32');
            });
            html += '</div>';
        }

        if (produtosAtivos.length === 0) {
            html += '<p class="empty-state">Nenhum produto cadastrado.</p>';
        }

        container.innerHTML = html;
    } catch (e) {
        console.error('❌ Erro:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar.</p>';
    }
}

window.carregarRelatorioEstoque = carregarRelatorioEstoque;

function cardResumoEstoque(label, valor, cor) {
    return '<div class="card" style="margin:0;text-align:center;padding:12px;background:' + cor + '20;border-left:3px solid ' + cor + ';">' +
           '    <div style="font-size:0.7rem;color:#666;">' + label + '</div>' +
           '    <div style="font-size:1.3rem;font-weight:700;color:' + cor + ';margin-top:4px;">' + valor + '</div>' +
           '</div>';
}

function linhaProdutoEstoque(p, cor) {
    const estoque = Number(p.estoque || 0);
    const min = Number(p.estoqueMinimo || 0);
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee;">' +
           '    <div style="flex:1;min-width:0;">' +
           '        <div style="font-weight:500;font-size:0.9rem;">' + p.nome + '</div>' +
           '        <div style="font-size:0.72rem;color:#888;">Mín: ' + min + ' un</div>' +
           '    </div>' +
           '    <div style="font-weight:700;color:' + cor + ';font-size:1rem;">' + estoque + '</div>' +
           '</div>';
}

// ============================================================
// IMPRIMIR
// ============================================================
window.imprimirRelatorioEstoque = async function() {
    const produtos = await apiGet('produtos');
    const ativos = (Array.isArray(produtos) ? produtos : []).filter(function(p) { return p.inativo !== true; });

    let valorTotal = 0;
    ativos.forEach(function(p) { valorTotal += Number(p.estoque || 0) * Number(p.valorCusto || 0); });

    let html = '<html><head><title>Estoque</title>' +
        '<style>body{font-family:monospace;font-size:12px;padding:15px;max-width:500px;margin:0 auto;}' +
        'h1{font-size:16px;text-align:center;}' +
        'hr{border:none;border-top:1px dashed #000;margin:10px 0;}' +
        '.linha{display:flex;justify-content:space-between;padding:3px 0;}' +
        '.destaque{font-weight:bold;font-size:14px;}</style></head><body>' +
        '<h1>RELATÓRIO DE ESTOQUE</h1>' +
        '<hr>' +
        '<div class="linha destaque"><span>Valor total</span><span>' + formatMoney(valorTotal) + '</span></div>' +
        '<div class="linha"><span>Produtos ativos</span><span>' + ativos.length + '</span></div>' +
        '<hr>' +
        '<div class="destaque">Produtos:</div>';

    ativos.forEach(function(p) {
        const est = Number(p.estoque || 0);
        const min = Number(p.estoqueMinimo || 0);
        let status = 'OK';
        if (est <= 0) status = 'ZERADO';
        else if (est <= min) status = 'CRITICO';
        html += '<div class="linha"><span>' + p.nome + ' (min ' + min + ')</span><span>' + est + ' [' + status + ']</span></div>';
    });

    html += '<hr><div style="text-align:center;font-size:10px;">' + new Date().toLocaleString('pt-BR') + '</div>' +
        '<script>window.onload=function(){setTimeout(function(){window.print();},300);}</script></body></html>';

    const janela = window.open('', '', 'width=500,height=700');
    janela.document.write(html);
    janela.document.close();
};