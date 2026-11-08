// ============================================================
// MESAS.JS — Lista de mesas do estabelecimento
// ============================================================

console.log('✔ Mesas.js carregado');

window.mesasCache = [];
window.mesaTermoBusca = '';

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderMesas = function() {
    console.log('🎬 renderMesas chamado');

    setTimeout(atualizarListaMesas, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Mesas</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Cadastre as mesas do seu estabelecimento. Cada mesa recebe um QR Code para autoatendimento.',
        '    </div>',
        '</div>',

        // Busca
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar mesa" id="busca-mesa" oninput="filtrarMesas()" value="' + (window.mesaTermoBusca || '') + '">',
        '    <button class="btn-limpar" onclick="limparBuscaMesas()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // Ação rápida
        '<div style="padding:0 16px 10px;">',
        '    <button class="btn-outline" style="width:100%;font-size:0.8rem;padding:8px;" onclick="navigateTo(\'qrcodes\')">',
        '        <i class="fas fa-qrcode"></i> Ver QR Codes das Mesas',
        '    </button>',
        '</div>',

        // Contador
        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;display:flex;justify-content:space-between;" id="mesas-contador"></div>',

        // Lista
        '<div class="content-area" id="mesas-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        // FAB
        '<button class="fab" onclick="novaMesa()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA MESAS
// ============================================================
async function atualizarListaMesas() {
    const lista = document.getElementById('mesas-lista');
    if (!lista) return;

    try {
        let dados = await apiGet('mesas');

        // Se vazio, cria as 23 mesas padrão
        if (!Array.isArray(dados) || dados.length === 0) {
            dados = [];
            for (let i = 1; i <= 20; i++) {
                dados.push({ id: i, numero: String(i), nome: 'Mesa ' + i, tipo: 'mesa', ativa: true });
            }
            dados.push({ id: 21, numero: 'balcao',   nome: 'Balcão',       tipo: 'especial', ativa: true });
            dados.push({ id: 22, numero: 'delivery', nome: 'Delivery',     tipo: 'especial', ativa: true });
            dados.push({ id: 23, numero: 'viagem',   nome: 'Para Viagem',  tipo: 'especial', ativa: true });
            await apiSave('mesas', dados);
        }

        window.mesasCache = dados;
        console.log('🔍 Mesas carregadas:', window.mesasCache.length);
        lista.innerHTML = renderListaMesas();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar mesas: ' + e.message + '</p>';
    }
}

window.atualizarListaMesas = atualizarListaMesas;

// ============================================================
// RENDER LISTA
// ============================================================
function renderListaMesas() {
    let lista = window.mesasCache.slice();

    // Filtro por busca
    const busca = String(window.mesaTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(m) {
            return String(m.nome || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(m.numero || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    // Ordena: mesas numeradas primeiro (por número), depois especiais
    lista.sort(function(a, b) {
        if (a.tipo !== b.tipo) return a.tipo === 'mesa' ? -1 : 1;
        const na = parseInt(a.numero);
        const nb = parseInt(b.numero);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a.nome).localeCompare(String(b.nome));
    });

    // Contador
    const contador = document.getElementById('mesas-contador');
    if (contador) {
        const total = window.mesasCache.length;
        const ativas = window.mesasCache.filter(function(m) { return m.ativa !== false; }).length;
        contador.innerHTML =
            '<span>' + lista.length + ' de ' + total + ' mesas</span>' +
            '<span style="color:#388e3c;">🟢 ' + ativas + ' ativas</span>';
    }

    // Vazio
    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhuma mesa encontrada.</p>';
        return '<p class="empty-state">Nenhuma mesa cadastrada</p>';
    }

    // Agrupa por tipo
    const mesas = lista.filter(function(m) { return m.tipo === 'mesa'; });
    const especiais = lista.filter(function(m) { return m.tipo !== 'mesa'; });

    let html = '';

    if (mesas.length > 0) {
        html += '<div style="padding:8px 20px;color:#888;font-size:0.75rem;font-weight:600;text-transform:uppercase;">Mesas (' + mesas.length + ')</div>';
        html += mesas.map(renderItemMesa).join('');
    }

    if (especiais.length > 0) {
        html += '<div style="padding:12px 20px 8px;color:#888;font-size:0.75rem;font-weight:600;text-transform:uppercase;">Especiais (' + especiais.length + ')</div>';
        html += especiais.map(renderItemMesa).join('');
    }

    return html;
}

function renderItemMesa(m) {
    const ativa = m.ativa !== false;
    const bg = ativa ? '#fff' : '#f5f5f5';
    const corTexto = ativa ? '#333' : '#999';

    let badges = '';
    if (!ativa) {
        badges += '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:6px;">Inativa</span>';
    }

    const icone = m.tipo === 'mesa' ? 'fa-chair' : 'fa-star';

    return '<div class="lista-item" style="background:' + bg + ';" onclick="editarMesa(' + m.id + ')">' +
           '<div class="lista-item-info">' +
           '    <div class="lista-item-titulo" style="color:' + corTexto + ';">' +
           '        <i class="fas ' + icone + '" style="color:var(--primary-color);font-size:0.8rem;margin-right:6px;"></i>' +
                    m.nome + badges +
           '    </div>' +
           '    <div class="lista-item-sub">' +
           '        <i class="fas fa-tag" style="font-size:0.65rem;margin-right:3px;"></i> ' + m.numero +
           '    </div>' +
           '</div>' +
           '<button class="btn-limpar" onclick="event.stopPropagation(); excluirMesa(' + m.id + ')" title="Excluir" style="margin-right:4px;">' +
           '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
           '</button>' +
           '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
           '</div>';
}

// ============================================================
// AÇÕES
// ============================================================
window.novaMesa = function() {
    window.mesaEditando = null;
    navigateTo('cadastro-mesa');
};

window.editarMesa = function(id) {
    for (let i = 0; i < window.mesasCache.length; i++) {
        if (String(window.mesasCache[i].id) === String(id)) {
            window.mesaEditando = window.mesasCache[i];
            navigateTo('cadastro-mesa');
            return;
        }
    }
};

window.excluirMesa = async function(id) {
    let mesa = null;
    for (let i = 0; i < window.mesasCache.length; i++) {
        if (String(window.mesasCache[i].id) === String(id)) {
            mesa = window.mesasCache[i];
            break;
        }
    }
    if (!mesa) return;

    // Verifica se a mesa está em uso
    const comandas = await apiGet('comandas');
    const emUso = comandas.some(function(c) {
        return String(c.mesa) === String(mesa.numero) &&
               (c.status === 'aberta' || c.status === 'delivery');
    });

    if (emUso) {
        alert('Não é possível excluir: a mesa "' + mesa.nome + '" está em uso por uma comanda aberta.');
        return;
    }

    if (!await window.confirmar('Excluir a mesa "' + mesa.nome + '"?')) return;

    const lista = await apiGet('mesas');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('mesas', novaLista);

    document.getElementById('app').innerHTML = renderMesas();
};

window.filtrarMesas = function() {
    window.mesaTermoBusca = (document.getElementById('busca-mesa') || {}).value || '';
    const lista = document.getElementById('mesas-lista');
    if (lista) lista.innerHTML = renderListaMesas();
};

window.limparBuscaMesas = function() {
    window.mesaTermoBusca = '';
    const input = document.getElementById('busca-mesa');
    if (input) input.value = '';
    const lista = document.getElementById('mesas-lista');
    if (lista) lista.innerHTML = renderListaMesas();
};