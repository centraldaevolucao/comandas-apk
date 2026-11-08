// ============================================================
// GRUPOS.JS — Lista de grupos de produtos
// ============================================================

console.log('✔ Grupos.js carregado');

window.gruposCache = [];
window.grupoTermoBusca = '';

// ============================================================
// RENDER
// ============================================================
window.renderGrupos = function() {
    setTimeout(atualizarListaGrupos, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Grupos de Produtos</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Agrupe seus produtos (Bebidas, Pratos, Sobremesas...) para filtrar no cardápio e PDV.',
        '    </div>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar grupo" id="busca-grupo" oninput="filtrarGrupos()">',
        '    <button class="btn-limpar" onclick="limparBuscaGrupos()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="grupos-contador"></div>',

        '<div class="content-area" id="grupos-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoGrupo()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaGrupos() {
    const lista = document.getElementById('grupos-lista');
    if (!lista) return;

    try {
        const dados = await apiGet('grupos');
        window.gruposCache = Array.isArray(dados) ? dados : [];

        // Carrega produtos para contar quantos usam cada grupo
        try {
            const produtos = await apiGet('produtos');
            window.produtosCache = Array.isArray(produtos) ? produtos : [];
        } catch (e) {
            window.produtosCache = [];
        }

        lista.innerHTML = renderListaGrupos();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaGrupos = atualizarListaGrupos;

// ============================================================
// LISTA
// ============================================================
function renderListaGrupos() {
    let lista = window.gruposCache.slice();

    const busca = String(window.grupoTermoBusca || '').trim().toLowerCase();
    if (busca) {
        lista = lista.filter(g =>
            String(g.nome || '').toLowerCase().includes(busca) ||
            String(g.descricao || '').toLowerCase().includes(busca)
        );
    }

    lista.sort((a, b) => {
        if (a.favorito && !b.favorito) return -1;
        if (!a.favorito && b.favorito) return 1;
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    });

    const contador = document.getElementById('grupos-contador');
    if (contador) contador.textContent = lista.length + ' grupo(s)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhum grupo encontrado.</p>';
        return '<p class="empty-state">Nenhum grupo cadastrado</p>';
    }

    return lista.map(g => {
        const emUso = (window.produtosCache || []).filter(p => String(p.grupo) === String(g.id)).length;
        const badges = (g.favorito ? '<i class="fas fa-star" style="color:#fbc02d;font-size:0.75rem;margin-right:4px;"></i>' : '') +
                       (g.inativo ? '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;">Inativo</span>' : '');
        const descricao = g.descricao || 'Sem descrição';
        const infoUso = emUso > 0 ? ' • ' + emUso + ' produto(s)' : '';

        return '<div class="lista-item" onclick="editarGrupo(' + g.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' + badges + g.nome + '</div>' +
            '    <div class="lista-item-sub">' + descricao + infoUso + '</div>' +
            '</div>' +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirGrupo(' + g.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>';
    }).join('');
}

// ============================================================
// AÇÕES
// ============================================================
window.novoGrupo = function() {
    window.grupoEditando = null;
    navigateTo('cadastro-grupo');
};

window.editarGrupo = function(id) {
    const grupo = window.gruposCache.find(g => String(g.id) === String(id));
    if (!grupo) return;
    window.grupoEditando = grupo;
    navigateTo('cadastro-grupo');
};

window.excluirGrupo = async function(id) {
    const grupo = window.gruposCache.find(g => String(g.id) === String(id));
    if (!grupo) return;

    const produtos = await apiGet('produtos');
    const emUso = produtos.filter(p => String(p.grupo) === String(id)).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' produto(s) usam este grupo.');
        return;
    }

    if (!await window.confirmar('Excluir o grupo "' + grupo.nome + '"?')) return;

    const lista = await apiGet('grupos');
    const novaLista = lista.filter(x => String(x.id) !== String(id));
    await apiSave('grupos', novaLista);

    document.getElementById('app').innerHTML = renderGrupos();
};

window.filtrarGrupos = function() {
    window.grupoTermoBusca = (document.getElementById('busca-grupo') || {}).value || '';
    const lista = document.getElementById('grupos-lista');
    if (lista) lista.innerHTML = renderListaGrupos();
};

window.limparBuscaGrupos = function() {
    window.grupoTermoBusca = '';
    const input = document.getElementById('busca-grupo');
    if (input) input.value = '';
    const lista = document.getElementById('grupos-lista');
    if (lista) lista.innerHTML = renderListaGrupos();
};