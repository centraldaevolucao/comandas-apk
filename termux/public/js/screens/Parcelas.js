// ============================================================
// PARCELAS.JS — Lista com toggle direto no card
// ============================================================

console.log('✔ Parcelas.js carregado');

if (window.renderParcelas) {
    console.log('⚠️ Parcelas.js já carregado');
} else {
    window.parcelasCache = [];

    window.renderParcelas = function() {
        setTimeout(carregarParcelas, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Parcelas no Crédito</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div style="padding:15px 16px 8px;">',
            '    <p style="font-size:0.85rem;color:#666;">',
            '        Configure quais parcelas oferecem <strong>sem juros</strong>, a taxa aplicada e se estão <strong>ativas</strong>.',
            '    </p>',
            '</div>',
            '<div class="content-area" id="parcelas-lista" style="padding:0 12px 100px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>',
            '<button class="fab" onclick="novaParcela()">+</button>'
        ].join('\n');
    };

    async function carregarParcelas() {
        const div = document.getElementById('parcelas-lista');
        if (!div) return;

        try {
            const dados = await apiGet('parcelas');
            window.parcelasCache = window.normalizarArray(dados);

            if (window.parcelasCache.length === 0) {
                const padrao = [
                    { numero: 1, semJuros: true, taxaJuros: 0, ativo: true },
                    { numero: 2, semJuros: true, taxaJuros: 0, ativo: true },
                    { numero: 3, semJuros: true, taxaJuros: 0, ativo: true },
                    { numero: 4, semJuros: false, taxaJuros: 2.5, ativo: true },
                    { numero: 5, semJuros: false, taxaJuros: 3, ativo: true },
                    { numero: 6, semJuros: false, taxaJuros: 3.5, ativo: true }
                ];
                window.parcelasCache = padrao;
                await apiSave('parcelas', padrao);
            }

            window.parcelasCache.sort(function(a, b) { return (a.numero || 0) - (b.numero || 0); });

            if (window.parcelasCache.length === 0) {
                div.innerHTML = '<p class="empty-state">Nenhuma parcela configurada</p>';
                return;
            }

            div.innerHTML = window.parcelasCache.map(function(p) {
                const badge = p.semJuros
                    ? '<span class="badge-juros" style="background:#c8e6c9;color:#2e7d32;">SEM JUROS</span>'
                    : '<span class="badge-juros" style="background:#ffccbc;color:#e65100;">' + p.taxaJuros + '% JUROS</span>';

                const descricao = p.semJuros 
                    ? 'Divisão igual do total' 
                    : 'Total + ' + p.taxaJuros + '% dividido em ' + p.numero + 'x';

                const isAtivo = p.ativo !== false;

                // Se estiver inativo, deixa o card com opacidade menor
                const estiloCard = isAtivo ? '' : 'opacity: 0.6;';

                return '<div class="lista-item" style="' + estiloCard + ' display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #eee;">' +
                       '    <div style="display: flex; align-items: center; gap: 10px; flex: 1; cursor: pointer;" onclick="editarParcela(' + p.numero + ')">' +
                       '        <div>' +
                       '            <div style="font-weight: 600; font-size: 0.95rem; color: #333;">' + p.numero + 'x ' + badge + '</div>' +
                       '            <div style="font-size: 0.8rem; color: #888; margin-top: 2px;">' + descricao + '</div>' +
                       '        </div>' +
                       '    </div>' +
                       '    <div style="display: flex; align-items: center; gap: 12px;">' +
                       // O Toggle
                       '        <label class="toggle" style="margin: 0;" title="' + (isAtivo ? 'Desativar' : 'Ativar') + '">' +
                       '            <input type="checkbox" ' + (isAtivo ? 'checked' : '') + ' onchange="toggleAtivoParcela(' + p.numero + ', this.checked)">' +
                       '            <span class="slider"></span>' +
                       '        </label>' +
                       // Botão de Excluir
                       (p.numero !== 1 ?
                           '        <button class="btn-limpar" onclick="event.stopPropagation(); excluirParcela(' + p.numero + ')" title="Excluir" style="padding: 4px;">' +
                           '            <i class="fas fa-trash" style="color:#c62828;font-size:0.95rem;"></i>' +
                           '        </button>' : '') +
                       // Seta de edição
                       '        <i class="fas fa-chevron-right" style="color:#ccc; cursor: pointer;" onclick="editarParcela(' + p.numero + ')"></i>' +
                       '    </div>' +
                       '</div>';
            }).join('');
        } catch (e) {
            console.error('Erro ao carregar parcelas:', e);
            div.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    // Função chamada pelo Toggle para salvar direto no banco
    window.toggleAtivoParcela = async function(numero, isAtivo) {
        try {
            // Atualiza no cache local
            const p = window.parcelasCache.find(function(x) { return Number(x.numero) === Number(numero); });
            if (p) p.ativo = isAtivo;

            // Prepara a lista atualizada
            const listaAtualizada = window.parcelasCache.map(function(item) {
                return {
                    numero: item.numero,
                    semJuros: item.semJuros,
                    taxaJuros: item.taxaJuros,
                    ativo: item.ativo !== false
                };
            });

            // Salva no banco
            await apiSave('parcelas', listaAtualizada);
            
            // Atualiza a tela sem precisar recarregar a página inteira
            carregarParcelas();

        } catch (e) {
            console.error('Erro ao alterar status:', e);
            alert('Erro ao salvar alteração. Verifique a conexão.');
        }
    };

    window.novaParcela = function() {
        window.parcelaEditando = null;
        navigateTo('cadastro-parcela');
    };

    window.editarParcela = function(numero) {
        const p = window.parcelasCache.find(function(x) { return Number(x.numero) === Number(numero); });
        if (!p) return;
        window.parcelaEditando = p;
        navigateTo('cadastro-parcela');
    };

    window.excluirParcela = async function(numero) {
        if (Number(numero) === 1) {
            alert('A parcela "1x" não pode ser removida');
            return;
        }

        const p = window.parcelasCache.find(function(x) { return Number(x.numero) === Number(numero); });
        if (!p) return;

        if (!await window.confirmar('Excluir a opção "' + p.numero + 'x"?')) return;

        try {
            const lista = window.normalizarArray(await apiGet('parcelas'));
            const novaLista = lista.filter(function(x) { return Number(x.numero) !== Number(numero); });
            await apiSave('parcelas', novaLista);
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Parcela excluída');
            carregarParcelas();
        } catch (e) {
            alert('Erro: ' + e.message);
        }
    };
}