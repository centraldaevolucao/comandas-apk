// public/js/screens/CadastroProduto.js

window.gruposCacheCadastro = [];
window.adicionaisCacheCadastro = [];

// ============================================================
// RENDER
// ============================================================
window.renderCadastroProduto = function() {
    const p = window.produtoEditando || {};
    const editando = !!p.id;
    const temPromo = !!p.precoPromocional && Number(p.precoPromocional) > 0;

    setTimeout(function() { carregarDadosAuxiliares(p); }, 0);

    return line(
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Produto' : 'Novo Produto') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // Favorito / Inativo
        '        <div style="display:flex;gap:20px;margin-bottom:15px;">',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="p-fav" ' + (p.favorito ? 'checked' : '') + '>',
        '                <i class="fas fa-star" style="color:#fbc02d;"></i> Favorito',
        '            </label>',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="p-inativo" ' + (p.inativo ? 'checked' : '') + '>',
        '                Inativo',
        '            </label>',
        '        </div>',

        // Card: produto de produção
        '        <div class="card">',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="p-producao" ' + (p.produtoProducao ? 'checked' : '') + ' onchange="toggleLocalProducao()">',
        '                <strong>Produto de produção?</strong>',
        '            </label>',
        '            <p style="font-size:0.8rem;color:#666;margin:8px 0;">',
        '                Essa opção faz com que o produto ao ser incluído em uma comanda entre para a fila de pedidos.',
        '            </p>',
        '            <div id="p-locais" style="display:' + (p.produtoProducao ? 'flex' : 'none') + ';flex-direction:column;gap:8px;margin-top:10px;">',
        '                <label style="display:flex;align-items:center;gap:8px;">',
        '                    <input type="radio" name="p-local" value="cozinha" ' + (p.localProducao === 'cozinha' || !p.localProducao ? 'checked' : '') + '>',
        '                    <i class="fas fa-utensils"></i> Cozinha',
        '                </label>',
        '                <label style="display:flex;align-items:center;gap:8px;">',
        '                    <input type="radio" name="p-local" value="bar" ' + (p.localProducao === 'bar' ? 'checked' : '') + '>',
        '                    <i class="fas fa-wine-glass"></i> Bar',
        '                </label>',
        '                <label style="display:flex;align-items:center;gap:8px;">',
        '                    <input type="radio" name="p-local" value="outros" ' + (p.localProducao === 'outros' ? 'checked' : '') + '>',
        '                    <i class="fas fa-map-marker-alt"></i> Outros',
        '                </label>',
        '            </div>',
        '        </div>',

        // Grupo
        '        <div class="field">',
        '            <label>Grupo</label>',
        '            <select id="p-grupo">',
        '                <option value="">-- Sem grupo --</option>',
        '            </select>',
        '        </div>',

        // Nome
        '        <div class="field">',
        '            <label>Nome do produto *</label>',
        '            <input type="text" id="p-nome" maxlength="35" placeholder="Ex: Coca-Cola" value="' + (p.nome || '') + '">',
        '        </div>',

        // Valores
        '        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
        '            <div class="field">',
        '                <label>Valor de venda *</label>',
        '                <input type="number" step="0.01" min="0" id="p-venda" placeholder="0,00" value="' + (p.valorVenda || '') + '">',
        '            </div>',
        '            <div class="field">',
        '                <label>Valor de custo</label>',
        '                <input type="number" step="0.01" min="0" id="p-custo" placeholder="0,00" value="' + (p.valorCusto || '') + '">',
        '            </div>',
        '        </div>',

        // ============ PREÇO PROMOCIONAL ============
        '        <div class="card">',
        '            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">',
        '                <div>',
        '                    <strong><i class="fas fa-tag" style="color:#e65100;"></i> Preço promocional</strong>',
        '                    <p style="font-size:0.75rem;color:#666;margin-top:4px;">Habilitar desconto temporário</p>',
        '                </div>',
        '                <label class="toggle">',
        '                    <input type="checkbox" id="p-promo-toggle" ' + (temPromo ? 'checked' : '') + ' onchange="togglePrecoPromocional()">',
        '                    <span class="slider"></span>',
        '                </label>',
        '            </div>',
        '            <div id="p-promo-campo" style="display:' + (temPromo ? 'block' : 'none') + ';margin-top:10px;">',
        '                <div class="field" style="margin-bottom:0;">',
        '                    <label>Preço promocional (R$)</label>',
        '                    <input type="number" step="0.01" min="0" id="p-promo" placeholder="0,00" value="' + (p.precoPromocional || '') + '">',
        '                </div>',
        '                <small style="color:#888;font-size:0.75rem;display:block;margin-top:6px;">',
        '                    Enquanto estiver ativo, este preço será usado no lugar do valor de venda.',
        '                </small>',
        '            </div>',
        '        </div>',
        // ============ FIM PREÇO PROMOCIONAL ============

        // Estoque
        '        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">',
        '            <div class="field">',
        '                <label>Quantidade estoque</label>',
        '                <input type="number" min="0" id="p-estoque" value="' + (p.estoque || 0) + '">',
        '            </div>',
        '            <div class="field">',
        '                <label>Estoque mínimo ideal</label>',
        '                <input type="number" min="0" id="p-minimo" value="' + (p.estoqueMinimo || 0) + '">',
        '            </div>',
        '        </div>',

        // Adicionais vinculados
        '        <div class="card">',
        '            <div class="card-title">Adicionais vinculados</div>',
        '            <p style="font-size:0.8rem;color:#666;margin-bottom:10px;">Selecione os adicionais disponíveis para este produto.</p>',
        '            <div id="p-adicionais-lista" style="display:flex;flex-direction:column;gap:8px;">',
        '                <small style="color:#888;">Carregando...</small>',
        '            </div>',
        '        </div>',

        // Observação
        '        <div class="field">',
        '            <label>Observação / Descrição</label>',
        '            <textarea id="p-obs" maxlength="200" placeholder="Detalhes do produto...">' + (p.observacao || '') + '</textarea>',
        '        </div>',

        // Botões
        '        <button class="btn-primary" onclick="salvarProduto()">' + (editando ? 'Salvar Alterações' : 'Cadastrar Produto') + '</button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirProdutoAtual()"><i class="fas fa-trash"></i> Excluir Produto</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'produtos\')">Cancelar</button>',
        '    </div>',
        '</div>'
    );
};

// ============================================================
// TOGGLE PREÇO PROMOCIONAL
// ============================================================
window.togglePrecoPromocional = function() {
    const check = document.getElementById('p-promo-toggle');
    const div = document.getElementById('p-promo-campo');
    if (!check || !div) return;

    if (check.checked) {
        div.style.display = 'block';
        const input = document.getElementById('p-promo');
        if (input) setTimeout(function() { input.focus(); }, 100);
    } else {
        div.style.display = 'none';
        const input = document.getElementById('p-promo');
        if (input) input.value = '';
    }
};

// ============================================================
// TOGGLE LOCAL DE PRODUÇÃO
// ============================================================
window.toggleLocalProducao = function() {
    const check = document.getElementById('p-producao');
    const div = document.getElementById('p-locais');
    if (!check || !div) return;
    div.style.display = check.checked ? 'flex' : 'none';
};

// ============================================================
// CARREGA GRUPOS E ADICIONAIS
// ============================================================
async function carregarDadosAuxiliares(p) {
    // Grupos
    window.gruposCacheCadastro = await apiGet('grupos');
    const selGrupo = document.getElementById('p-grupo');
    if (selGrupo) {
        window.gruposCacheCadastro.forEach(function(g) {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.nome;
            if (String(g.id) === String(p.grupo)) opt.selected = true;
            selGrupo.appendChild(opt);
        });
    }

    // Adicionais
    window.adicionaisCacheCadastro = await apiGet('adicionais');
    const divAdic = document.getElementById('p-adicionais-lista');
    if (!divAdic) return;

    if (window.adicionaisCacheCadastro.length === 0) {
        divAdic.innerHTML = '<small style="color:#888;">Nenhum adicional cadastrado.</small>';
        return;
    }

    const vinculados = Array.isArray(p.adicionais) ? p.adicionais : [];

    divAdic.innerHTML = window.adicionaisCacheCadastro.map(function(a) {
        const checked = vinculados.some(function(x) { return String(x) === String(a.id); });
        return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 0;">' +
               '    <input type="checkbox" class="p-adicional-check" value="' + a.id + '" ' + (checked ? 'checked' : '') + '>' +
               '    <span>' + a.nome + ' <small style="color:#888;">(' + formatMoney(a.preco) + ')</small></span>' +
               '</label>';
    }).join('');
}

// ============================================================
// SALVAR
// ============================================================
window.salvarProduto = async function() {
    const nome = document.getElementById('p-nome').value.trim();
    if (!nome) { alert('Informe o nome do produto'); return; }

    const valorVenda = parseFloat(document.getElementById('p-venda').value);
    if (isNaN(valorVenda) || valorVenda < 0) { alert('Informe um valor de venda válido'); return; }

    // Preço promocional
    const promoCheck = document.getElementById('p-promo-toggle');
    const promoAtiva = promoCheck ? promoCheck.checked : false;
    let precoPromocional = 0;

    if (promoAtiva) {
        precoPromocional = parseFloat(document.getElementById('p-promo').value);
        if (isNaN(precoPromocional) || precoPromocional <= 0) {
            alert('Informe um preço promocional válido ou desabilite a promoção');
            return;
        }
        if (precoPromocional >= valorVenda) {
            alert('O preço promocional deve ser menor que o valor de venda');
            return;
        }
    }

    const p = window.produtoEditando || {};

    // Verifica duplicidade de nome (ignorando o próprio)
    const lista = await apiGet('produtos');
    if (lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() &&
               String(x.id) !== String(p.id);
    })) {
        alert('Já existe um produto com esse nome');
        return;
    }

    // Adicionais selecionados
    const adicionaisSelecionados = [];
    document.querySelectorAll('.p-adicional-check:checked').forEach(function(c) {
        adicionaisSelecionados.push(c.value);
    });

    // Local de produção
    const producaoCheck = document.getElementById('p-producao');
    const produtoProducao = producaoCheck ? producaoCheck.checked : false;
    let localProducao = '';
    if (produtoProducao) {
        const localSel = document.querySelector('input[name="p-local"]:checked');
        localProducao = localSel ? localSel.value : 'cozinha';
    }

    const dados = {
        id: p.id || Date.now(),
        nome: nome,
        valorVenda: valorVenda,
        valorCusto: parseFloat(document.getElementById('p-custo').value) || 0,
        precoPromocional: promoAtiva ? precoPromocional : 0,
        promocaoAtiva: promoAtiva,
        estoque: parseInt(document.getElementById('p-estoque').value) || 0,
        estoqueMinimo: parseInt(document.getElementById('p-minimo').value) || 0,
        grupo: document.getElementById('p-grupo').value || '',
        adicionais: adicionaisSelecionados,
        favorito: document.getElementById('p-fav').checked,
        inativo: document.getElementById('p-inativo').checked,
        produtoProducao: produtoProducao,
        localProducao: localProducao,
        observacao: document.getElementById('p-obs').value.trim(),
        dataCriacao: p.dataCriacao || new Date().toISOString()
    };

    const idx = lista.findIndex(function(x) { return String(x.id) === String(dados.id); });
    if (idx >= 0) lista[idx] = dados;
    else lista.push(dados);

    await apiSave('produtos', lista);
    window.produtoEditando = null;
    navigateTo('produtos');
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirProdutoAtual = async function() {
    const p = window.produtoEditando;
    if (!p || !p.id) return;

    if (!await window.confirmar('Excluir o produto "' + p.nome + '"?\n\nEssa ação não pode ser desfeita.')) return;

    const lista = await apiGet('produtos');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(p.id); });
    await apiSave('produtos', novaLista);

    window.produtoEditando = null;
    navigateTo('produtos');
};

console.log('✔ CadastroProduto.js carregado');