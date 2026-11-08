// ============================================================
// PEDIDOSPENDENTES.JS — Aprovação de Pedidos (Cozinha/Garçom)
// ============================================================

console.log('✔ PedidosPendentes.js carregado');

if (!window.renderPedidosPendentes) {
    window.renderPedidosPendentes = function () {
        setTimeout(carregarPedidosPendentes, 50);
        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltar()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Pedidos Pendentes</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="pedidos-pendentes-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando pedidos...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarPedidosPendentes() {
        const container = document.getElementById('pedidos-pendentes-conteudo');
        if (!container) return;

        try {
            const pedidosBrutos = await apiGet('pedidosPendentes').catch(function() { return []; });
            const todosPedidos = window.normalizarArray(pedidosBrutos);
            const pendentes = todosPedidos.filter(function(p) { return p.status === 'pendente'; });

            if (pendentes.length === 0) {
                container.innerHTML = `
                    <div class="card" style="text-align:center; padding: 30px; background:#fff;">
                        <i class="fas fa-check-circle" style="font-size:3rem; color:#4caf50; margin-bottom:10px;"></i>
                        <h3 style="color:#333; margin-bottom:5px;">Tudo limpo!</h3>
                        <p class="empty-state" style="margin-top:0;">Nenhum pedido aguardando aprovação no momento.</p>
                    </div>
                `;
                return;
            }

            let html = '';
            pendentes.forEach(function(p) {
                const itens = window.normalizarArray(p.itens);
                const dataStr = p.dataAbertura || p.data || new Date().toLocaleString('pt-BR');
                
                html += '<div class="card" style="background:#fff; border-left:4px solid #ff9800; margin-bottom:12px; padding:15px;">';
                html += '    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">';
                html += '        <div>';
                html += '            <div style="font-weight:700; font-size:1.1rem; color:#333;">Comanda: ' + (p.numero || '—') + '</div>';
                html += '            <div style="font-size:0.8rem; color:#666;"><i class="fas fa-chair"></i> ' + (p.mesa || '—') + '</div>';
                html += '            <div style="font-size:0.8rem; color:#666;"><i class="fas fa-user"></i> ' + (p.cliente || 'Sem nome') + '</div>';
                html += '        </div>';
                html += '        <div style="text-align:right;">';
                html += '            <div style="font-size:0.75rem; color:#888;">' + dataStr + '</div>';
                html += '            <div style="font-weight:700; color:#2e7d32; font-size:1.1rem;">' + formatMoney(p.total || 0) + '</div>';
                html += '        </div>';
                html += '    </div>';

                if (itens.length > 0) {
                    html += '<div style="background:#f9f9f9; padding:10px; border-radius:8px; margin-bottom:15px; font-size:0.85rem; color:#555;">';
                    itens.forEach(function(it) {
                        html += '<div style="display:flex; justify-content:space-between; padding:3px 0;"><span>' + (it.quantidade || 1) + 'x ' + (it.nome || 'Item') + '</span><span>' + formatMoney((it.preco || 0) * (it.quantidade || 1)) + '</span></div>';
                    });
                    html += '</div>';
                }

                html += '<div style="display:flex; gap:8px;">';
                html += '    <button class="btn-primary" style="flex:1; padding:10px; background:#4caf50;" onclick="aprovarPedido(' + p.id + ')"><i class="fas fa-check"></i> Aprovar</button>';
                html += '    <button class="btn-outline" style="flex:1; padding:10px; border-color:#c62828; color:#c62828;" onclick="recusarPedido(' + p.id + ')"><i class="fas fa-times"></i> Recusar</button>';
                html += '</div>';
                html += '</div>';
            });

            container.innerHTML = html;
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar pedidos: ' + e.message + '</p>';
        }
    }

    window.aprovarPedido = async function(id) {
        if (!await window.confirmar('Aprovar este pedido e enviar para a cozinha?')) return;
        try {
            const lista = window.normalizarArray(await apiGet('pedidosPendentes'));
            const idx = lista.findIndex(function(p) { return String(p.id) === String(id); });
            if (idx >= 0) {
                lista[idx].status = 'aprovado';
                await apiSave('pedidosPendentes', lista);
                
                // Opcional: Aqui você pode mover os itens para a tabela `comandas` ou `itensProducao`
                // para que apareçam na tela da Cozinha, se o seu fluxo for assim.

                if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Pedido aprovado!');
                carregarPedidosPendentes();
            }
        } catch(e) {
            alert('Erro ao aprovar: ' + e.message);
        }
    };

    window.recusarPedido = async function(id) {
        if (!await window.confirmar('Recusar e excluir este pedido?')) return;
        try {
            const lista = window.normalizarArray(await apiGet('pedidosPendentes'));
            const novaLista = lista.filter(function(p) { return String(p.id) !== String(id); });
            await apiSave('pedidosPendentes', novaLista);
            if (typeof window.mostrarToast === 'function') window.mostrarToast('⚠️ Pedido recusado');
            carregarPedidosPendentes();
        } catch(e) {
            alert('Erro ao recusar: ' + e.message);
        }
    };
}