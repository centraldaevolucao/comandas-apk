// ============================================================
// NOVACOMANDA.JS — Criação de comandas
// ============================================================

console.log('✔ NovaComanda.js carregado');

if (!window.renderNovaComanda) {
    window.renderNovaComanda = function(tipo) {
        // Se não vier tipo, o padrão é balcao
        const tipoComanda = tipo || 'balcao';
        
        setTimeout(() => {
            const container = document.getElementById('nova-comanda-conteudo');
            if (!container) return;
            
            let opcoes = '';
            if (tipoComanda === 'balcao') {
                opcoes = '<option value="balcao" selected>Balcão</option><option value="mesa">Mesa</option><option value="delivery">Delivery</option><option value="viagem">Para Viagem</option>';
            } else if (tipoComanda === 'delivery') {
                opcoes = '<option value="delivery" selected>Delivery</option><option value="mesa">Mesa</option><option value="balcao">Balcão</option><option value="viagem">Para Viagem</option>';
            } else {
                opcoes = '<option value="mesa" selected>Mesa</option><option value="balcao">Balcão</option><option value="delivery">Delivery</option><option value="viagem">Para Viagem</option>';
            }

            container.innerHTML = 
                '<div class="card" style="margin-top:15px;">' +
                '    <div class="field">' +
                '        <label>Tipo de Comanda</label>' +
                '        <select id="nc-tipo">' + opcoes + '</select>' +
                '    </div>' +
                '    <div class="field" id="nc-mesa-field" style="display:none;">' +
                '        <label>Mesa</label>' +
                '        <input type="text" id="nc-mesa" placeholder="Ex: 01" />' +
                '    </div>' +
                '    <div class="field">' +
                '        <label style="display:flex;justify-content:space-between;align-items:center;"><span>Cliente (Opcional)</span><button type="button" class="btn-limpar" onclick="novoClienteNaComanda(\'nc-cliente\')" style="font-size:0.75rem;color:var(--primary-color);font-weight:600;text-decoration:underline;"><i class="fas fa-plus"></i> Novo</button></label>' +
                '        <input type="text" id="nc-cliente" placeholder="Selecione ou digite o nome" />' +
                '    </div>' +
                '    <div class="field">' +
                '        <label>Garçom (Opcional)</label>' +
                '        <input type="text" id="nc-garcom" placeholder="Nome do garçom" />' +
                '    </div>' +
                '    <button class="btn-primary" onclick="criarComanda()">Abrir Comanda</button>' +
                '</div>';

            const selectTipo = document.getElementById('nc-tipo');
            selectTipo.addEventListener('change', function() {
                const mesaField = document.getElementById('nc-mesa-field');
                if (mesaField) mesaField.style.display = (this.value === 'mesa') ? 'block' : 'none';
            });
            // Dispara o evento para ajustar o campo visível inicial
            selectTipo.dispatchEvent(new Event('change'));
            if (window.clientePicker) window.clientePicker.anexar(document.getElementById('nc-cliente'), { limparAoDigitar: true });

        }, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Nova Comanda (' + (tipoComanda === 'balcao' ? 'Balcão' : tipoComanda === 'delivery' ? 'Delivery' : 'Mesa') + ')</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="nova-comanda-conteudo">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    window.criarComanda = async function() {
        if (window.licencaPodeCriarComanda && !(await window.licencaPodeCriarComanda())) return;
        const tipo = document.getElementById('nc-tipo').value;
        const mesa = document.getElementById('nc-mesa').value.trim();
        const cliEl = document.getElementById('nc-cliente');
        const cliente = cliEl.value.trim();
        const clienteId = cliente && cliEl.dataset.clienteId ? cliEl.dataset.clienteId : null;
        const garcom = document.getElementById('nc-garcom').value.trim();

        if (tipo === 'mesa' && !mesa) {
            alert('Por favor, informe o número da mesa.');
            return;
        }

        try {
            const lista = window.normalizarArray(await apiGet('comandas'));
            const configArr = window.normalizarArray(await apiGet('configuracoes'));
            const config = configArr[0] || {};
            
            const novoNumero = await window.sugerirNumeroComanda();
            const caixaAtual = await window.obterCaixaAbertoAtual();

            const nova = {
                id: Date.now(),
                numero: novoNumero,
                tipo: tipo, // balcao, mesa, delivery, viagem
                mesa: tipo === 'mesa' ? mesa : tipo, // mantém compatibilidade
                cliente: cliente,
                clienteId: clienteId,
                clienteTelefone: clienteId ? cliEl.dataset.telefone || '' : '',
                clienteCpf: clienteId ? cliEl.dataset.cpf || '' : '',
                garcom: garcom,
                status: 'aberta',
                dataAbertura: new Date().toLocaleString('pt-BR'),
                itens: [],
                pagamentos: [],
                subtotal: 0,
                total: 0,
                desconto: null,
                caixaId: caixaAtual ? caixaAtual.id : null,
                corGrupo: caixaAtual ? caixaAtual.cor : ''
            };

            lista.push(nova);
            await apiSave('comandas', lista);
            await window.registrarNumeroComanda(novoNumero);

            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Comanda aberta!');
            
            // Redireciona para o detalhe da comanda recém-criada
            window.comandaIdAtual = nova.id;
            window.comandaOrigem = 'pdv'; // Para permitir fechamento no caixa
            window.navigateTo('detalhe-comanda');

        } catch (e) {
            alert('Erro ao criar comanda: ' + e.message);
        }
    };
}