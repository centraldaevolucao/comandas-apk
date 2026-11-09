// ============================================================
// ADICIONAIS.JS — Lista de adicionais
// ============================================================

console.log('✔ Adicionais.js carregado');

window.adicionaisCache = [];
window.adicionalTermoBusca = '';

// ============================================================
// RENDER
// ============================================================
window.renderAdicionais = function() {
    console.log('🎬 renderAdicionais chamado');
    setTimeout(atualizarListaAdicionais, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Adicionais</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Complementos que podem ser adicionados aos produtos (ex: Bacon extra, Queijo, Cebola caramelizada).',
        '    </div>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar adicional" id="busca-adicional" oninput="filtrarAdicionais()">',
        '    <button class="btn-limpar" onclick="limparBuscaAdicionais()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="adicionais-contador"></div>',

        '<div class="content-area" id="adicionais-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoAdicional()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaAdicionais() {
    const lista = document.getElementById('adicionais-lista');
    if (!lista) return;

    try {
        const dados = await apiGet('adicionais');
        window.adicionaisCache = Array.isArray(dados) ? dados : [];
        console.log('🔍 Adicionais:', window.adicionaisCache.length);
        lista.innerHTML = renderListaAdicionais();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaAdicionais = atualizarListaAdicionais;

// ============================================================
// LISTA
// ============================================================
function renderListaAdicionais() {
    let lista = window.adicionaisCache.slice();

    const busca = String(window.adicionalTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(a) {
            return String(a.nome || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    // Ordena: favoritos primeiro, depois A-Z
    lista.sort(function(a, b) {
        if (a.favorito && !b.favorito) return -1;
        if (!a.favorito && b.favorito) return 1;
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    });

    const contador = document.getElementById('adicionais-contador');
    if (contador) contador.textContent = lista.length + ' adicional(is)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhum adicional encontrado.</p>';
        return '<p class="empty-state">Nenhum adicional cadastrado</p>';
    }

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const a = lista[i];

        // Conta quantos produtos usam esse adicional
        const emUso = (window.produtosCache || []).filter(function(p) {
            return Array.isArray(p.adicionais) && p.adicionais.some(function(id) {
                return String(id) === String(a.id);
            });
        }).length;

        let badges = '';
        if (a.favorito) badges += '<i class="fas fa-star" style="color:#fbc02d;font-size:0.75rem;margin-right:4px;"></i>';
        if (a.inativo) badges += '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:4px;">Inativo</span>';

        const infoUso = emUso > 0 ? ' • usado em ' + emUso + ' produto(s)' : '';

        html.push(
            '<div class="lista-item" onclick="editarAdicional(' + a.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' + badges + a.nome + '</div>' +
            '    <div class="lista-item-sub">' +
            '        <span style="color:var(--primary-color);font-weight:600;">' + formatMoney(a.preco) + '</span>' +
                     infoUso +
            '    </div>' +
            '</div>' +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirAdicional(' + a.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>'
        );
    }
    return html.join('');
}

// ============================================================
// AÇÕES
// ============================================================
window.novoAdicional = function() {
    window.adicionalEditando = null;
    navigateTo('cadastro-adicional');
};

window.editarAdicional = function(id) {
    for (let i = 0; i < window.adicionaisCache.length; i++) {
        if (String(window.adicionaisCache[i].id) === String(id)) {
            window.adicionalEditando = window.adicionaisCache[i];
            navigateTo('cadastro-adicional');
            return;
        }
    }
};

window.excluirAdicional = async function(id) {
    let adicional = null;
    for (let i = 0; i < window.adicionaisCache.length; i++) {
        if (String(window.adicionaisCache[i].id) === String(id)) {
            adicional = window.adicionaisCache[i];
            break;
        }
    }
    if (!adicional) return;

    // Verifica se há produtos usando esse adicional
    const produtos = await apiGet('produtos');
    const emUso = produtos.filter(function(p) {
        return Array.isArray(p.adicionais) && p.adicionais.some(function(x) {
            return String(x) === String(id);
        });
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' produto(s) usam este adicional.');
        return;
    }

    if (!await window.confirmar('Excluir o adicional "' + adicional.nome + '"?')) return;

    const lista = await apiGet('adicionais');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('adicionais', novaLista);

    document.getElementById('app').innerHTML = renderAdicionais();
};

window.filtrarAdicionais = function() {
    window.adicionalTermoBusca = (document.getElementById('busca-adicional') || {}).value || '';
    const lista = document.getElementById('adicionais-lista');
    if (lista) lista.innerHTML = renderListaAdicionais();
};

window.limparBuscaAdicionais = function() {
    window.adicionalTermoBusca = '';
    const input = document.getElementById('busca-adicional');
    if (input) input.value = '';
    const lista = document.getElementById('adicionais-lista');
    if (lista) lista.innerHTML = renderListaAdicionais();
};