// public/js/screens/CadastroParcela.js

console.log('✔ CadastroParcela.js carregado');

if (!window.renderCadastroParcela) {
    window.renderCadastroParcela = function() {
        const p = window.parcelaEditando || {};
        const editando = p.numero !== undefined;
        const semJuros = p.semJuros !== false;
        const ativo = p.ativo !== false;

        return line(
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="navigateTo(\'parcelas\')"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>' + (editando ? 'Editar Parcela' : 'Nova Parcela') + '</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area">',
            '    <div style="padding:15px 16px;">',

            '        <div class="card" style="margin:0 0 15px;">',
            '            <div class="card-row" style="padding:8px 0;">',
            '                <div>',
            '                    <strong>Habilitar esta parcela</strong>',
            '                    <small>Se desativada, não aparecerá nas opções de pagamento</small>',
            '                </div>',
            '                <label class="toggle">',
            '                    <input type="checkbox" id="pa-ativo" ' + (ativo ? 'checked' : '') + '>',
            '                    <span class="slider"></span>',
            '                </label>',
            '            </div>',
            '        </div>',

            '        <div class="field">',
            '            <label>Número de parcelas</label>',
            '            <input type="number" min="1" max="48" id="pa-numero" value="' + (p.numero || '') + '" placeholder="Ex: 4" ' + (editando ? 'readonly style="background:#f5f5f5;"' : '') + '>',
            '            <small>A quantidade de parcelas (1x a 48x)</small>',
            '        </div>',

            '        <div class="card" style="margin:0 0 15px;">',
            '            <div class="card-row" style="padding:8px 0;">',
            '                <div>',
            '                    <strong>Sem juros</strong>',
            '                    <small>Se ativo, o total é dividido igualmente entre as parcelas</small>',
            '                </div>',
            '                <label class="toggle">',
            '                    <input type="checkbox" id="pa-sem-juros" ' + (semJuros ? 'checked' : '') + ' onchange="toggleCampoTaxa()">',
            '                    <span class="slider"></span>',
            '                </label>',
            '            </div>',
            '        </div>',

            '        <div class="field" id="pa-taxa-field" style="display:' + (semJuros ? 'none' : 'block') + ';">',
            '            <label>Taxa de juros (%)</label>',
            '            <input type="number" step="0.01" min="0" id="pa-taxa" value="' + (p.taxaJuros || 0) + '" placeholder="Ex: 2.5">',
            '            <small>Percentual aplicado sobre o total da comanda</small>',
            '        </div>',

            '        <div class="card" style="background:#FCE4EC;padding:15px;font-size:0.85rem;">',
            '            <strong>💡 Exemplo com R$ 100,00:</strong>',
            '            <div id="pa-exemplo" style="margin-top:8px;color:#555;">',
            '                ' + gerarExemploParcela(semJuros, p.taxaJuros || 0, p.numero || 0) +
            '            </div>',
            '        </div>',

            '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarParcela()">' + (editando ? 'Salvar Alterações' : 'Cadastrar Parcela') + '</button>',
            editando && Number(p.numero) !== 1 ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirParcelaAtual()"><i class="fas fa-trash"></i> Excluir Parcela</button>' : '',
            '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'parcelas\')">Cancelar</button>',
            '    </div>',
            '</div>'
        );
    };

    function gerarExemploParcela(semJuros, taxa, numero) {
        if (!numero) return 'Informe o número de parcelas para ver o exemplo.';
        const total = 100;
        const totalComJuros = semJuros ? total : total * (1 + taxa / 100);
        const porParcela = totalComJuros / numero;
        return 'Total: R$ ' + totalComJuros.toFixed(2).replace('.', ',') +
               '<br>' + numero + 'x de R$ ' + porParcela.toFixed(2).replace('.', ',');
    }

    window.toggleCampoTaxa = function() {
        const semJuros = document.getElementById('pa-sem-juros').checked;
        const field = document.getElementById('pa-taxa-field');
        field.style.display = semJuros ? 'none' : 'block';
        atualizarExemploParcela();
    };

    function atualizarExemploParcela() {
        const semJuros = document.getElementById('pa-sem-juros').checked;
        const taxa = parseFloat(document.getElementById('pa-taxa').value) || 0;
        const numero = parseInt(document.getElementById('pa-numero').value) || 0;
        const div = document.getElementById('pa-exemplo');
        if (div) div.innerHTML = gerarExemploParcela(semJuros, taxa, numero);
    }

    document.addEventListener('input', function(e) {
        if (e.target && (e.target.id === 'pa-taxa' || e.target.id === 'pa-numero')) {
            atualizarExemploParcela();
        }
    });

    window.salvarParcela = async function() {
        const numero = parseInt(document.getElementById('pa-numero').value);
        const semJuros = document.getElementById('pa-sem-juros').checked;
        const ativo = document.getElementById('pa-ativo').checked;
        const taxa = semJuros ? 0 : (parseFloat(document.getElementById('pa-taxa').value) || 0);

        if (!numero || numero < 1 || numero > 48) {
            alert('Informe um número de parcelas válido (1 a 48)');
            return;
        }
        if (!semJuros && taxa <= 0) {
            alert('Informe a taxa de juros (maior que zero)');
            return;
        }

        const lista = await apiGet('parcelas');
        const p = window.parcelaEditando || {};

        if (lista.some(function(x) {
            return Number(x.numero) === numero && Number(x.numero) !== Number(p.numero);
        })) {
            alert('Já existe uma configuração para ' + numero + 'x');
            return;
        }

        const dados = {
            numero: numero,
            semJuros: semJuros,
            taxaJuros: taxa,
            ativo: ativo
        };

        const idx = lista.findIndex(function(x) { return Number(x.numero) === Number(p.numero); });
        if (idx >= 0) lista[idx] = dados;
        else lista.push(dados);

        await apiSave('parcelas', lista);
        window.parcelaEditando = null;
        navigateTo('parcelas');
    };

    window.excluirParcelaAtual = async function() {
        const p = window.parcelaEditando;
        if (!p || Number(p.numero) === 1) {
            alert('A parcela "1x" não pode ser removida');
            return;
        }
        if (!await window.confirmar('Excluir a opção "' + p.numero + 'x"?')) return;

        const lista = await apiGet('parcelas');
        const novaLista = lista.filter(function(x) { return Number(x.numero) !== Number(p.numero); });
        await apiSave('parcelas', novaLista);

        window.parcelaEditando = null;
        navigateTo('parcelas');
    };

    function line() { return Array.prototype.slice.call(arguments).join("\n"); }
}