// ============================================================
// USUARIOS.JS — Lista de usuários do sistema
// ============================================================

console.log('✔ Usuarios.js carregado');

window.usuariosCache = [];
window.usuariosTermoBusca = '';
window.usuariosFiltroNivel = '';

window.renderUsuarios = function() {
    setTimeout(atualizarListaUsuarios, 50);
    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Usuários do Sistema</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',
        '<div style="padding:12px 16px;background:#FCE4EC;border-bottom:1px solid #e0e0e0;">',
        '    <div style="font-size:0.85rem;color:#C2185B;line-height:1.5;">',
        '        <i class="fas fa-shield-alt"></i>',
        '        Gerencie quem pode acessar o sistema e quais permissões cada um tem.',
        '    </div>',
        '</div>',
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por nome ou e-mail" id="busca-usuario" oninput="filtrarUsuarios()">',
        '    <button class="btn-limpar" onclick="limparBuscaUsuarios()"><i class="fas fa-xmark"></i></button>',
        '</div>',
        '<div style="padding:0 16px 10px;overflow-x:auto;white-space:nowrap;" id="usuarios-chips"></div>',
        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="usuarios-contador"></div>',
        '<div class="content-area" id="usuarios-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',
        '<button class="fab" onclick="novoUsuario()">+</button>'
    ].join('\n');
};

async function atualizarListaUsuarios() {
    const lista = document.getElementById('usuarios-lista');
    if (!lista) return;
    try {
        const dados = await apiGet('usuarios');
        window.usuariosCache = Array.isArray(dados) ? dados : [];
        renderChipsUsuarios();
        lista.innerHTML = renderListaUsuarios();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}
window.atualizarListaUsuarios = atualizarListaUsuarios;

function renderChipsUsuarios() {
    const container = document.getElementById('usuarios-chips');
    if (!container) return;
    const niveis = [
        { id: '',          label: 'Todos' },
        { id: 'admin',     label: '👑 Admin' },
        { id: 'gerente',   label: '🛡️ Gerente' },
        { id: 'atendente', label: '🧑 Atendente' },
        { id: 'caixa',     label: '💰 Caixa' },
        { id: 'cozinha',   label: '🍳 Cozinha' }
    ];
    container.innerHTML = niveis.map(function(n) {
        const ativo = window.usuariosFiltroNivel === n.id ? 'ativo' : '';
        return '<button class="chip-grupo ' + ativo + '" onclick="filtrarPorNivelUsuario(\'' + n.id + '\')">' + n.label + '</button>';
    }).join('');
}

window.filtrarPorNivelUsuario = function(nivel) {
    window.usuariosFiltroNivel = nivel;
    renderChipsUsuarios();
    const lista = document.getElementById('usuarios-lista');
    if (lista) lista.innerHTML = renderListaUsuarios();
};

function renderListaUsuarios() {
    let lista = window.usuariosCache.slice();
    const busca = String(window.usuariosTermoBusca || '').trim().toLowerCase();
    if (busca) {
        lista = lista.filter(function(u) {
            return String(u.nome || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(u.email || '').toLowerCase().indexOf(busca) >= 0;
        });
    }
    if (window.usuariosFiltroNivel) {
        lista = lista.filter(function(u) { return u.nivel === window.usuariosFiltroNivel; });
    }
    lista.sort(function(a, b) { return String(a.nome || '').localeCompare(String(b.nome || '')); });

    const contador = document.getElementById('usuarios-contador');
    if (contador) contador.textContent = lista.length + ' usuário(s)';
    if (lista.length === 0) return '<p class="empty-state">Nenhum usuário encontrado</p>';

    return lista.map(function(u) {
        const nivelInfo = obterNivelInfoUsuario(u.nivel);
        const badgeAtivo = u.ativo === false
            ? '<span style="background:#eee;color:#666;font-size:0.65rem;padding:2px 6px;border-radius:8px;margin-left:6px;">Inativo</span>'
            : '<span style="background:#e8f5e9;color:#2e7d32;font-size:0.65rem;padding:2px 6px;border-radius:8px;margin-left:6px;">Ativo</span>';
        const qtdPerms = Array.isArray(u.permissoes) ? u.permissoes.length : 0;

        return '<div class="lista-item" onclick="editarUsuario(' + u.id + ')">' +
            '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">' +
            '    <div style="width:40px;height:40px;background:' + nivelInfo.cor + ';border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '        <i class="fas ' + nivelInfo.icon + '" style="color:#fff;font-size:1rem;"></i>' +
            '    </div>' +
            '    <div style="flex:1;min-width:0;">' +
            '        <div class="lista-item-titulo">' + u.nome + badgeAtivo + '</div>' +
            '        <div class="lista-item-sub">' + u.email + '</div>' +
            '        <div class="lista-item-sub" style="font-size:0.7rem;color:' + nivelInfo.cor + ';font-weight:600;">' +
            '            ' + nivelInfo.nome + (qtdPerms > 0 ? ' · ' + qtdPerms + ' permissões' : '') +
            '        </div>' +
            '    </div>' +
            '</div>' +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirUsuario(' + u.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>';
    }).join('');
}

function obterNivelInfoUsuario(nivel) {
    const map = {
        admin:     { nome: 'Administrador', cor: '#c62828', icon: 'fa-crown' },
        gerente:   { nome: 'Gerente',       cor: '#C2185B', icon: 'fa-user-shield' },
        atendente: { nome: 'Atendente',     cor: '#1976d2', icon: 'fa-user-tie' },
        caixa:     { nome: 'Caixa',         cor: '#388e3c', icon: 'fa-cash-register' },
        cozinha:   { nome: 'Cozinha',       cor: '#ff9800', icon: 'fa-utensils' }
    };
    return map[nivel] || { nome: nivel || 'Sem nível', cor: '#607d8b', icon: 'fa-user' };
}

window.novoUsuario = function() {
    window.usuarioEditando = null;
    navigateTo('cadastro-usuario-sistema');
};

window.editarUsuario = function(id) {
    for (let i = 0; i < window.usuariosCache.length; i++) {
        if (String(window.usuariosCache[i].id) === String(id)) {
            window.usuarioEditando = window.usuariosCache[i];
            navigateTo('cadastro-usuario-sistema');
            return;
        }
    }
};

window.excluirUsuario = async function(id) {
    // Não permite excluir o próprio usuário logado
    const logado = window.obterUsuarioLogado ? window.obterUsuarioLogado() : null;
    if (logado && String(logado.id) === String(id)) {
        alert('Você não pode excluir o próprio usuário logado.');
        return;
    }

    const u = window.usuariosCache.find(function(x) { return String(x.id) === String(id); });
    if (!u) return;

    if (u.nivel === 'admin') {
        const admins = window.usuariosCache.filter(function(x) { return x.nivel === 'admin' && x.ativo !== false; });
        if (admins.length <= 1) {
            alert('Não é possível excluir: é o único administrador ativo.');
            return;
        }
    }

    if (!await window.confirmar('Excluir o usuário "' + u.nome + '"?')) return;

    const lista = await apiGet('usuarios');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('usuarios', novaLista);

    document.getElementById('app').innerHTML = renderUsuarios();
};

window.filtrarUsuarios = function() {
    window.usuariosTermoBusca = (document.getElementById('busca-usuario') || {}).value || '';
    const lista = document.getElementById('usuarios-lista');
    if (lista) lista.innerHTML = renderListaUsuarios();
};

window.limparBuscaUsuarios = function() {
    window.usuariosTermoBusca = '';
    const input = document.getElementById('busca-usuario');
    if (input) input.value = '';
    const lista = document.getElementById('usuarios-lista');
    if (lista) lista.innerHTML = renderListaUsuarios();
};