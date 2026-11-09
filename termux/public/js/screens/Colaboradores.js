// ============================================================
// COLABORADORES.JS — Lista + Filtros por Cargo/Função
// ============================================================

console.log('✔ Colaboradores.js carregado');

window.colaboradoresCache = [];
window.funcoesListaCache = [];
window.niveisListaCache = [];
window.usuariosListaCache = [];
window.colaboradorTermoBusca = '';
window.colaboradorFiltroNivel = ''; // Vazio = Todos

// ============================================================
// RENDER
// ============================================================
window.renderColaboradores = function() {
    setTimeout(atualizarListaColaboradores, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Colaboradores</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por nome ou função" id="busca-colaborador" oninput="filtrarColaboradores()">',
        '    <button class="btn-limpar" onclick="limparBuscaColaboradores()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // 🔥 BARRA DE CHIPS DE FILTRO
        '<div style="padding:0 16px 10px;overflow-x:auto;white-space:nowrap;display:flex;gap:8px;" id="colaboradores-chips"></div>',

        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="colaboradores-contador"></div>',

        '<div class="content-area" id="colaboradores-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoColaborador()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaColaboradores() {
    const lista = document.getElementById('colaboradores-lista');
    if (!lista) return;

    try {
        const [colab, funcoes, niveis, usuarios] = await Promise.all([
            apiGet('colaboradores').catch(function() { return []; }),
            apiGet('funcoes').catch(function() { return []; }),
            apiGet('niveisAcesso').catch(function() { return []; }),
            apiGet('usuarios').catch(function() { return []; })
        ]);

        window.colaboradoresCache = Array.isArray(colab) ? colab : [];
        window.funcoesListaCache = Array.isArray(funcoes) ? funcoes : [];
        window.niveisListaCache = Array.isArray(niveis) ? niveis : [];
        window.usuariosListaCache = Array.isArray(usuarios) ? usuarios : [];

        if (window.niveisListaCache.length === 0) {
            window.niveisListaCache = [
                { id: 'admin',     nome: 'Administrador', icon: 'fa-crown',       cor: '#c62828' },
                { id: 'gerente',   nome: 'Gerente',       icon: 'fa-user-shield', cor: '#C2185B' },
                { id: 'atendente', nome: 'Atendente',     icon: 'fa-user-tie',    cor: '#1976d2' },
                { id: 'caixa',     nome: 'Caixa',         icon: 'fa-cash-register',cor: '#388e3c' },
                { id: 'cozinha',   nome: 'Cozinha',       icon: 'fa-utensils',    cor: '#ff9800' }
            ];
        }

        renderChipsColaboradores();
        lista.innerHTML = renderListaColaboradores();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaColaboradores = atualizarListaColaboradores;

// ============================================================
// HELPERS
// ============================================================
function obterNomeFuncaoAtual(colab) {
    if (colab.funcaoId) {
        for (let i = 0; i < window.funcoesListaCache.length; i++) {
            if (String(window.funcoesListaCache[i].id) === String(colab.funcaoId)) {
                return window.funcoesListaCache[i].nome;
            }
        }
    }
    return colab.funcao || '';
}

function obterNivel(id) {
    for (let i = 0; i < window.niveisListaCache.length; i++) {
        if (String(window.niveisListaCache[i].id) === String(id)) return window.niveisListaCache[i];
    }
    return { id: 'atendente', nome: 'Atendente', icon: 'fa-user-tie', cor: '#1976d2' };
}

function usuarioDoColaborador(colabId) {
    for (let i = 0; i < window.usuariosListaCache.length; i++) {
        if (String(window.usuariosListaCache[i].colaboradorId) === String(colabId)) {
            return window.usuariosListaCache[i];
        }
    }
    return null;
}

// ============================================================
// RENDER CHIPS DE FILTRO
// ============================================================
function renderChipsColaboradores() {
    const container = document.getElementById('colaboradores-chips');
    if (!container) return;

    // Filtros fixos + níveis do sistema
    const filtros = [
        { id: '', label: 'Todos', icon: 'fa-users' },
        { id: 'garcom', label: 'Garçons', icon: 'fa-user-tie', custom: true },
        { id: 'cozinha', label: 'Cozinha', icon: 'fa-utensils' },
        { id: 'caixa', label: 'Caixa', icon: 'fa-cash-register' }
    ];

    let html = filtros.map(f => {
        const ativo = window.colaboradorFiltroNivel === f.id ? 'ativo' : '';
        let count = 0;
        
        if (f.id === '') count = window.colaboradoresCache.length;
        else if (f.id === 'garcom') {
            count = window.colaboradoresCache.filter(c => {
                const func = String(c.funcao || '').toLowerCase();
                const nivel = String(c.nivelAcesso || '').toLowerCase();
                return func.includes('garçom') || func.includes('garcom') || nivel === 'atendente';
            }).length;
        } else {
            count = window.colaboradoresCache.filter(c => {
                const func = String(c.funcao || '').toLowerCase();
                const nivel = String(c.nivelAcesso || '').toLowerCase();
                return nivel === f.id || func.includes(f.id);
            }).length;
        }

        const style = ativo ? 'background:var(--primary-color);border-color:var(--primary-color);color:#fff;' : '';
        
        return '<button class="chip-grupo ' + ativo + '" style="' + style + '" onclick="filtrarPorNivelColaborador(\'' + f.id + '\')">' +
               '<i class="fas ' + f.icon + '"></i> ' + f.label + ' (' + count + ')' +
               '</button>';
    }).join('');

    container.innerHTML = html;
}

window.filtrarPorNivelColaborador = function(nivel) {
    window.colaboradorFiltroNivel = nivel;
    renderChipsColaboradores();
    const lista = document.getElementById('colaboradores-lista');
    if (lista) lista.innerHTML = renderListaColaboradores();
};

// ============================================================
// LISTA DE COLABORADORES
// ============================================================
function renderListaColaboradores() {
    let lista = window.colaboradoresCache.slice();

    // 🔥 Aplica o filtro de chips
    if (window.colaboradorFiltroNivel) {
        if (window.colaboradorFiltroNivel === 'garcom') {
            lista = lista.filter(c => {
                const func = String(c.funcao || '').toLowerCase();
                const nivel = String(c.nivelAcesso || '').toLowerCase();
                return func.includes('garçom') || func.includes('garcom') || func.includes('atendente') || nivel === 'atendente' || nivel === 'garcom';
            });
        } else {
            lista = lista.filter(c => {
                const func = String(c.funcao || '').toLowerCase();
                const nivel = String(c.nivelAcesso || '').toLowerCase();
                return nivel === window.colaboradorFiltroNivel || func.includes(window.colaboradorFiltroNivel);
            });
        }
    }

    // Filtro de busca por texto
    const busca = String(window.colaboradorTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(c) {
            const nomeFuncao = obterNomeFuncaoAtual(c).toLowerCase();
            return String(c.nome || '').toLowerCase().indexOf(busca) >= 0 ||
                   nomeFuncao.indexOf(busca) >= 0;
        });
    }

    // Ordena A-Z
    lista.sort(function(a, b) { return String(a.nome || '').localeCompare(String(b.nome || '')); });

    const contador = document.getElementById('colaboradores-contador');
    if (contador) contador.textContent = lista.length + ' colaborador(es)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhum colaborador encontrado.</p>';
        return '<p class="empty-state">Nenhum colaborador cadastrado</p>';
    }

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const c = lista[i];
        const nomeFuncao = obterNomeFuncaoAtual(c);
        const nivel = obterNivel(c.nivelAcesso || 'atendente');
        const usuario = usuarioDoColaborador(c.id);

        let linhaSub = '';
        if (nomeFuncao) {
            linhaSub = '<i class="fas fa-briefcase" style="font-size:0.7rem;margin-right:4px;"></i>' + nomeFuncao;
        }

        const badgeNivel =
            '<span style="display:inline-block;background:' + nivel.cor + ';color:#fff;' +
            'font-size:0.6rem;padding:2px 6px;border-radius:8px;margin-left:6px;' +
            'font-weight:600;text-transform:uppercase;letter-spacing:0.3px;">' +
            '<i class="fas ' + nivel.icon + '" style="font-size:0.6rem;margin-right:3px;"></i>' +
            nivel.nome + '</span>';

        let badgeAcesso = '';
        if (usuario) {
            const inativo = usuario.ativo === false;
            const bg = inativo ? '#eee' : '#4caf50';
            const cor = inativo ? '#666' : '#fff';
            badgeAcesso = '<div style="margin-top:4px;font-size:0.7rem;color:' + (inativo ? '#666' : '#2e7d32') + ';">' +
                '<i class="fas fa-key" style="color:' + (inativo ? '#999' : '#4caf50') + ';"></i> ' +
                '<b>' + usuario.email + '</b>' +
                (inativo ? ' (inativo)' : '') +
                '</div>';
        } else {
            badgeAcesso = '<div style="margin-top:4px;font-size:0.7rem;color:#999;">' +
                '<i class="fas fa-key"></i> Sem acesso ao sistema' +
                '</div>';
        }

        const btnReset = usuario
            ? '<button class="btn-limpar" onclick="event.stopPropagation(); resetarSenhaColaborador(' + c.id + ')" title="Resetar senha" style="margin-right:4px;">' +
              '    <i class="fas fa-key" style="color:#1976d2;font-size:0.9rem;"></i>' +
              '</button>'
            : '';

        html.push(
            '<div class="lista-item" onclick="editarColaborador(' + c.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' + c.nome + badgeNivel + '</div>' +
            (linhaSub ? '    <div class="lista-item-sub">' + linhaSub + '</div>' : '') +
            badgeAcesso +
            '</div>' +
            btnReset +
            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirColaborador(' + c.id + ')" title="Excluir" style="margin-right:4px;">' +
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
window.novoColaborador = function() {
    window.colaboradorEditando = null;
    window.usuarioDoColaborador = null;
    navigateTo('cadastro-colaborador');
};

window.editarColaborador = function(id) {
    for (let i = 0; i < window.colaboradoresCache.length; i++) {
        if (String(window.colaboradoresCache[i].id) === String(id)) {
            window.colaboradorEditando = window.colaboradoresCache[i];
            window.usuarioDoColaborador = usuarioDoColaborador(id);
            navigateTo('cadastro-colaborador');
            return;
        }
    }
};

window.excluirColaborador = async function(id) {
    let colab = null;
    for (let i = 0; i < window.colaboradoresCache.length; i++) {
        if (String(window.colaboradoresCache[i].id) === String(id)) {
            colab = window.colaboradoresCache[i];
            break;
        }
    }
    if (!colab) return;

    if (colab.nivelAcesso === 'admin') {
        const admins = window.colaboradoresCache.filter(function(c) { return c.nivelAcesso === 'admin'; });
        if (admins.length <= 1) {
            alert('Não é possível excluir: é o único administrador.');
            return;
        }
    }

    const comandas = await apiGet('comandas');
    const emUso = comandas.some(function(c) {
        return String(c.colaborador) === String(id) &&
               (c.status === 'aberta' || c.status === 'delivery');
    });
    if (emUso) {
        alert('Não é possível excluir: o colaborador está vinculado a uma comanda aberta.');
        return;
    }

    if (!await window.confirmar('Excluir o colaborador "' + colab.nome + '"?\n\nO acesso ao sistema também será removido.')) return;

    const lista = await apiGet('colaboradores');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('colaboradores', novaLista);

    try {
        const usuarios = await apiGet('usuarios');
        const listaU = Array.isArray(usuarios) ? usuarios : [];
        const novaU = listaU.filter(function(u) { return String(u.colaboradorId) !== String(id); });
        if (novaU.length !== listaU.length) await apiSave('usuarios', novaU);
    } catch (e) {}

    document.getElementById('app').innerHTML = renderColaboradores();
};

window.resetarSenhaColaborador = async function(colaboradorId) {
    const usuarios = await apiGet('usuarios');
    const lista = Array.isArray(usuarios) ? usuarios : [];
    const idx = lista.findIndex(function(u) { return String(u.colaboradorId) === String(colaboradorId); });
    if (idx < 0) { alert('Este colaborador não tem acesso ao sistema.'); return; }

    const novaSenha = await window.perguntar('Nova senha para "' + lista[idx].nome + '":');
    if (!novaSenha) return;
    if (novaSenha.length < 4) { alert('A senha deve ter pelo menos 4 caracteres.'); return; }

    const conf = await window.perguntar('Confirme a nova senha:');
    if (conf !== novaSenha) { alert('As senhas não coincidem.'); return; }

    try {
        const base = (typeof window.getApiBase === 'function') ? window.getApiBase() : '';
        const res = await fetch(base + '/api/alterar-senha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: lista[idx].id, novaSenha: novaSenha })
        });
        const data = await res.json();
        if (!data.ok) { alert(data.msg || 'Erro ao resetar senha'); return; }
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Senha resetada para ' + lista[idx].nome);
        } else {
            alert('Senha resetada.');
        }
    } catch (e) {
        alert('Erro: ' + e.message);
    }
};

window.filtrarColaboradores = function() {
    window.colaboradorTermoBusca = (document.getElementById('busca-colaborador') || {}).value || '';
    const lista = document.getElementById('colaboradores-lista');
    if (lista) lista.innerHTML = renderListaColaboradores();
};

window.limparBuscaColaboradores = function() {
    window.colaboradorTermoBusca = '';
    const input = document.getElementById('busca-colaborador');
    if (input) input.value = '';
    const lista = document.getElementById('colaboradores-lista');
    if (lista) lista.innerHTML = renderListaColaboradores();
};