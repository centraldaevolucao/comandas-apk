// public/js/screens/CadastroMesas.js

window.mesasCache = [];
window.mesaEditando = null;

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderMesas = function() {
    carregarMesas().then(function() {
        const lista = document.getElementById('mesas-lista');
        if (lista) lista.innerHTML = renderLista();
    });

    return line(
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Mesas</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;">',
        '    <div class="input-busca" style="margin:0 0 10px;">',
        '        <input type="text" placeholder="Pesquisar mesa" id="busca-mesa" oninput="filtrarMesas()">',
        '        <button class="btn-limpar" onclick="limparBuscaMesas()"><i class="fas fa-xmark"></i></button>',
        '    </div>',
        '    <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;color:#666;font-size:0.8rem;" id="mesas-contador"></div>',
        '</div>',

        '<div class="content-area" id="mesas-lista">',
        '    <p class="empty-state">Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novaMesa()">+</button>'
    );
};

// ============================================================
// CARREGA
// ============================================================
async function carregarMesas() {
    window.mesasCache = await apiGet('mesas');
}

// ============================================================
// RENDER LISTA
// ============================================================
function renderLista() {
    let lista = window.mesasCache.slice();

    // Filtro busca
    const termo = (document.getElementById('busca-mesa') || {}).value || '';
    if (termo) {
        const t = termo.toLowerCase();
        lista = lista.filter(function(m) {
            return String(m.nome || '').toLowerCase().indexOf(t) >= 0 ||
                   String(m.numero || '').toLowerCase().indexOf(t) >= 0;
        });
    }

    // Ordena: mesas numéricas primeiro (por número), depois especiais
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
        contador.innerHTML = '<span>' + lista.length + ' de ' + total + '</span>' +
                             '<span style="color:#388e3c;">🟢 ' + ativas + ' ativas</span>';
    }

    if (lista.length === 0) {
        if (termo) return '<p class="empty-state">Nenhuma mesa encontrada</p>';
        return '<p class="empty-state">Nenhuma mesa cadastrada</p>';
    }

    // Renderiza agrupado por tipo
    const mesas = lista.filter(function(m) { return m.tipo === 'mesa'; });
    const especiais = lista.filter(function(m) { return m.tipo !== 'mesa'; });

    let html = '';

    if (mesas.length > 0) {
        html += '<div style="padding:8px 20px;color:#888;font-size:0.75rem;font-weight:500;text-transform:uppercase;">Mesas</div>';
        html += mesas.map(renderItem).join('');
    }

    if (especiais.length > 0) {
        html += '<div style="padding:12px 20px 8px;color:#888;font-size:0.75rem;font-weight:500;text-transform:uppercase;">Especiais</div>';
        html += especiais.map(renderItem).join('');
    }

    return html;
}

function renderItem(m) {
    const ativa = m.ativa !== false;
    const bg = ativa ? '#fff' : '#f5f5f5';
    const corTexto = ativa ? '#333' : '#999';
    const badgeInativo = ativa ? '' : '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:10px;margin-left:6px;">Inativa</span>';

    return '<div class="lista-item" style="background:' + bg + ';" onclick="editarMesa(' + m.id + ')">' +
           '<div class="lista-item-info">' +
           '    <div class="lista-item-titulo" style="color:' + corTexto + ';">' +
           '        <i class="fas ' + (m.tipo === 'mesa' ? 'fa-chair' : 'fa-star') + '" style="color:var(--primary-color);font-size:0.8rem;margin-right:6px;"></i>' +
                    m.nome + badgeInativo +
           '    </div>' +
           '    <div class="lista-item-sub">Número: ' + m.numero + '</div>' +
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
    const m = window.mesasCache.find(function(x) { return String(x.id) === String(id); });
    if (!m) return;
    window.mesaEditando = m;
    navigateTo('cadastro-mesa');
};

window.excluirMesa = async function(id) {
    const m = window.mesasCache.find(function(x) { return String(x.id) === String(id); });
    if (!m) return;

    // Verifica se a mesa está em uso
    const comandas = await apiGet('comandas');
    const emUso = comandas.some(function(c) {
        return String(c.mesa) === String(m.numero) &&
               (c.status === 'aberta' || c.status === 'delivery');
    });

    if (emUso) {
        alert('Não é possível excluir: a mesa "' + m.nome + '" está em uso por uma comanda aberta.');
        return;
    }

    if (!await window.confirmar('Excluir a mesa "' + m.nome + '"?')) return;

    const lista = await apiGet('mesas');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('mesas', novaLista);

    document.getElementById('app').innerHTML = renderMesas();
};

window.filtrarMesas = function() {
    const lista = document.getElementById('mesas-lista');
    if (lista) lista.innerHTML = renderLista();
};

window.limparBuscaMesas = function() {
    const input = document.getElementById('busca-mesa');
    if (input) input.value = '';
    const lista = document.getElementById('mesas-lista');
    if (lista) lista.innerHTML = renderLista();
};

function line() { return Array.prototype.slice.call(arguments).join("\n"); }

console.log('✔ CadastroMesas.js carregado');