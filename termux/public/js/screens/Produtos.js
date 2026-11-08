// ============================================================
// PRODUTOS.JS
// Único arquivo responsável pela tela de Produtos
// ============================================================

console.log('✔ Produtos.js carregado');

// Cache global
window.produtosCache = [];
window.gruposCache = [];
window.produtoTermoBusca = "";
window.produtoFiltroGrupo = "";
window.produtoOrdem = window.produtoOrdem || 'padrao';
window.produtoPop = null;

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderProdutos = function() {
    console.log('🎬 renderProdutos chamado');

    setTimeout(atualizarListaProdutos, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Produtos</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por nome" id="busca-produto" oninput="filtrarProdutos()" value="' + window.produtoTermoBusca + '">',
        '    <button class="btn-limpar" onclick="limparBuscaProdutos()"><i class="fas fa-xmark"></i></button>',
        '</div>',
        '<div style="padding:0 16px 10px;">',
        '    <select id="filtro-grupo" onchange="filtrarProdutos()" style="width:100%;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-family:var(--font-family);">',
        '        <option value="">Todos os grupos</option>',
        '    </select>',
        '</div>',
        window.seletorOrdemProdutos(window.produtoOrdem, 'mudarOrdemProdutos'),
        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="produtos-contador">Carregando...</div>',
        '<div class="content-area" id="produtos-lista">',
        '    <p class="empty-state">🔄 Carregando produtos...</p>',
        '</div>',
        '<button class="fab" onclick="novoProduto()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA E RENDERIZA
// ============================================================
async function atualizarListaProdutos() {
    const lista = document.getElementById('produtos-lista');
    if (!lista) {
        console.error('❌ #produtos-lista não encontrado');
        return;
    }

    try {
        // Carrega produtos
        const produtos = await apiGet('produtos');
        window.produtosCache = Array.isArray(produtos) ? produtos : [];
        console.log('🔍 Produtos:', window.produtosCache.length);

        // Carrega grupos
        const grupos = await apiGet('grupos');
        window.gruposCache = Array.isArray(grupos) ? grupos : [];
        console.log('🔍 Grupos:', window.gruposCache.length);

        // Preenche select de grupos
        const selGrupo = document.getElementById('filtro-grupo');
        if (selGrupo) {
            while (selGrupo.options.length > 1) selGrupo.remove(1);
            for (let i = 0; i < window.gruposCache.length; i++) {
                const g = window.gruposCache[i];
                const opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.nome;
                if (String(g.id) === String(window.produtoFiltroGrupo)) opt.selected = true;
                selGrupo.appendChild(opt);
            }
        }

        window.produtoPop = await window.popularidadeProdutos();
        // Renderiza a lista
        lista.innerHTML = renderListaProdutos();
        console.log('✅ Lista renderizada');

    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaProdutos = atualizarListaProdutos;

// ============================================================
// MONTA A LISTA
// ============================================================
function renderListaProdutos() {
    let lista = window.produtosCache.slice();

    // Filtro por nome
    const busca = String(window.produtoTermoBusca || '').trim();
    if (busca !== '') {
        const t = busca.toLowerCase();
        lista = lista.filter(function(p) {
            return String(p.nome || '').toLowerCase().indexOf(t) >= 0;
        });
    }

    // Filtro por grupo
    const grupoFiltro = String(window.produtoFiltroGrupo || '').trim();
    if (grupoFiltro !== '') {
        lista = lista.filter(function(p) {
            return String(p.grupo || '') === grupoFiltro;
        });
    }

    lista = window.ordenarProdutos(lista, window.produtoOrdem, window.produtoPop, obterNomeGrupo);

    // Contador
    const contador = document.getElementById('produtos-contador');
    if (contador) {
        if (grupoFiltro !== '') {
            const nomeGrupo = obterNomeGrupo(grupoFiltro) || 'sem nome';
            contador.textContent = lista.length + ' produto(s) no grupo "' + nomeGrupo + '"';
        } else {
            contador.textContent = lista.length + ' produto(s) no total';
        }
    }

    // Vazio
    if (lista.length === 0) {
        if (busca || grupoFiltro) {
            return '<p class="empty-state">Nenhum produto encontrado com esses filtros.</p>';
        }
        return '<p class="empty-state">Nenhum produto cadastrado</p>';
    }

    // Monta cada item
    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const p = lista[i];
        const precoVenda = Number(p.valorVenda || p.preco || 0);
        const temPromo = p.promocaoAtiva && Number(p.precoPromocional) > 0;
        const precoFinal = temPromo ? Number(p.precoPromocional) : precoVenda;
        const estoque = Number(p.estoque || 0);
        const estoqueMin = Number(p.estoqueMinimo || 0);
        const corEstoque = estoque === 0 ? '#c62828' : (estoque <= estoqueMin ? '#f57c00' : '#388e3c');
        const nomeGrupo = obterNomeGrupo(p.grupo);

        let badges = '';
        if (p.favorito) badges += '<i class="fas fa-star" style="color:#fbc02d;font-size:0.75rem;margin-right:4px;"></i>';
        if (temPromo) badges += '<span style="background:#ff9800;color:#fff;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;font-weight:bold;">PROMO</span>';
        if (p.inativo) badges += '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;">Inativo</span>';
        if (p.produtoProducao) badges += '<span style="background:#F8BBD0;color:#C2185B;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;">Produção</span>';

        const infoGrupo = nomeGrupo ? '<span style="color:#888;"> • ' + nomeGrupo + '</span>' : '';

        let precoHTML;
        if (temPromo) {
            precoHTML = '<span style="text-decoration:line-through;color:#999;font-size:0.85rem;margin-right:6px;">' + formatMoney(precoVenda) + '</span>' +
                        '<span style="color:#e65100;font-weight:bold;">' + formatMoney(precoFinal) + '</span>';
        } else {
            precoHTML = '<span>' + formatMoney(precoFinal) + '</span>';
        }

        html.push(
            '<div class="lista-item" onclick="editarProduto(' + p.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' + badges + p.nome + '</div>' +
            '    <div class="lista-item-sub">' +
            '        ' + precoHTML + infoGrupo +
            '        • Estoque: <span style="color:' + corEstoque + ';font-weight:500;">' + estoque + '</span>' +
            '    </div>' +
            '</div>' +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirProduto(' + p.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>'
        );
    }

    return html.join('');
}

function obterNomeGrupo(grupoId) {
    if (!grupoId) return '';
    for (let i = 0; i < window.gruposCache.length; i++) {
        if (String(window.gruposCache[i].id) === String(grupoId)) return window.gruposCache[i].nome;
    }
    return '';
}

// ============================================================
// AÇÕES
// ============================================================
window.novoProduto = function() {
    window.produtoEditando = null;
    navigateTo('cadastro-produto');
};

window.editarProduto = function(id) {
    for (let i = 0; i < window.produtosCache.length; i++) {
        if (String(window.produtosCache[i].id) === String(id)) {
            window.produtoEditando = window.produtosCache[i];
            navigateTo('cadastro-produto');
            return;
        }
    }
};

window.excluirProduto = async function(id) {
    let produto = null;
    for (let i = 0; i < window.produtosCache.length; i++) {
        if (String(window.produtosCache[i].id) === String(id)) {
            produto = window.produtosCache[i];
            break;
        }
    }
    if (!produto) return;

    if (!await window.confirmar('Excluir o produto "' + produto.nome + '"?\n\nEssa ação não pode ser desfeita.')) return;

    const lista = await apiGet('produtos');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('produtos', novaLista);

    document.getElementById('app').innerHTML = renderProdutos();
};

window.mudarOrdemProdutos = async function(v) {
    window.produtoOrdem = v;
    if (v.indexOf('pedidos') >= 0) window.produtoPop = await window.popularidadeProdutos();
    const l = document.getElementById('produtos-lista');
    if (l) l.innerHTML = renderListaProdutos();
};

window.filtrarProdutos = function() {
    window.produtoTermoBusca = (document.getElementById('busca-produto') || {}).value || '';
    const sel = document.getElementById('filtro-grupo');
    window.produtoFiltroGrupo = sel ? String(sel.value).trim() : '';

    const lista = document.getElementById('produtos-lista');
    if (lista) lista.innerHTML = renderListaProdutos();
};

window.limparBuscaProdutos = function() {
    window.produtoTermoBusca = "";
    const input = document.getElementById('busca-produto');
    if (input) input.value = "";
    const lista = document.getElementById('produtos-lista');
    if (lista) lista.innerHTML = renderListaProdutos();
};