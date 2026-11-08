// ============================================================
// CADASTROUSUARIOSISTEMA.JS — Cadastro/edição de usuário + permissões
// Sessão em memória (window.SESSION)
// ============================================================

console.log('✔ CadastroUsuarioSistema.js carregado');

window.renderCadastroUsuarioSistema = function() {
    const u = window.usuarioEditando || {};
    const editando = !!u.id;
    const perms = Array.isArray(u.permissoes) ? u.permissoes.slice() : [];

    setTimeout(function() { preencherPermissoesUI(perms, u.nivel); }, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'usuarios\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Usuário' : 'Novo Usuário') + '</h1>',
        '    <button class="icon-btn" onclick="salvarUsuarioSistema()" title="Salvar"><i class="fas fa-save"></i></button>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        '        <div class="card" style="background:#FCE4EC;">',
        '            <div class="card-title">👤 Dados do usuário</div>',

        '            <div class="field">',
        '                <label>Nome completo *</label>',
        '                <input type="text" id="usr-nome" maxlength="60" placeholder="Ex: João da Silva" value="' + (u.nome || '') + '">',
        '            </div>',

        '            <div class="field">',
        '                <label>E-mail *</label>',
        '                <input type="email" id="usr-email" maxlength="80" placeholder="usuario@email.com" value="' + (u.email || '') + '">',
        '            </div>',

        '            <div class="field">',
        '                <label>' + (editando ? 'Nova senha (deixe em branco para manter)' : 'Senha *') + '</label>',
        '                <input type="password" id="usr-senha" placeholder="' + (editando ? 'Manter senha atual' : 'Mínimo 4 caracteres') + '" minlength="4">',
        '            </div>',

        '            <div class="field">',
        '                <label>Confirmar senha</label>',
        '                <input type="password" id="usr-senha-conf" placeholder="Repita a senha" minlength="4">',
        '            </div>',

        '            <div class="field" style="margin-bottom:0;">',
        '                <label>Nível de acesso</label>',
        '                <select id="usr-nivel" onchange="aoMudarNivelUsuario()">',
        '                    <option value="admin"     ' + (u.nivel === 'admin'     ? 'selected' : '') + '>👑 Administrador</option>',
        '                    <option value="gerente"   ' + (u.nivel === 'gerente'   ? 'selected' : '') + '>🛡️ Gerente</option>',
        '                    <option value="atendente" ' + (u.nivel === 'atendente' ? 'selected' : '') + '>🧑 Atendente</option>',
        '                    <option value="caixa"     ' + (u.nivel === 'caixa'     ? 'selected' : '') + '>💰 Caixa</option>',
        '                    <option value="cozinha"   ' + (u.nivel === 'cozinha'   ? 'selected' : '') + '>🍳 Cozinha</option>',
        '                </select>',
        '            </div>',
        '        </div>',

        '        <div class="card" style="background:#fff;">',
        '            <div style="display:flex;justify-content:space-between;align-items:center;">',
        '                <div>',
        '                    <div style="font-weight:600;font-size:0.95rem;">Usuário ativo</div>',
        '                    <div style="font-size:0.75rem;color:#888;">Usuários inativos não podem fazer login</div>',
        '                </div>',
        '                <label class="toggle">',
        '                    <input type="checkbox" id="usr-ativo" ' + (u.ativo !== false ? 'checked' : '') + '>',
        '                    <span class="slider"></span>',
        '                </label>',
        '            </div>',
        '        </div>',

        '        <div class="card" style="background:#fff;">',
        '            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">',
        '                <div class="card-title" style="margin:0;">🔐 Permissões de acesso</div>',
        '                <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;" onclick="toggleTodasPermissoes()">',
        '                    <i class="fas fa-check-double"></i> Marcar/desmarcar',
        '                </button>',
        '            </div>',
        '            <p style="font-size:0.75rem;color:#888;margin-bottom:12px;">',
        '                Selecione o que este usuário pode fazer. Administradores têm todas as permissões automaticamente.',
        '            </p>',
        '            <div id="usr-permissoes-lista" style="max-height:400px;overflow-y:auto;"></div>',
        '        </div>',

        '        <button class="btn-primary" style="margin-top:10px;" onclick="salvarUsuarioSistema()">',
        '            <i class="fas fa-check"></i> ' + (editando ? 'Salvar Alterações' : 'Cadastrar Usuário') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirUsuarioAtual()"><i class="fas fa-trash"></i> Excluir Usuário</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'usuarios\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

function preencherPermissoesUI(permissoesAtuais, nivel) {
    const container = document.getElementById('usr-permissoes-lista');
    if (!container) return;

    const todas = window.PERMISSOES_SISTEMA || [];
    const grupos = {};
    todas.forEach(function(p) {
        if (!grupos[p.grupo]) grupos[p.grupo] = [];
        grupos[p.grupo].push(p);
    });

    const ehAdmin = nivel === 'admin';

    let html = '';
    Object.keys(grupos).forEach(function(grupoNome) {
        html += '<div style="margin-bottom:12px;">';
        html += '    <div style="font-size:0.8rem;font-weight:700;color:#C2185B;text-transform:uppercase;padding:6px 0;border-bottom:1px solid #eee;">' + grupoNome + '</div>';
        grupos[grupoNome].forEach(function(p) {
            const checked = ehAdmin || permissoesAtuais.indexOf(p.id) >= 0;
            html += '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:' + (ehAdmin ? 'not-allowed' : 'pointer') + ';opacity:' + (ehAdmin ? '0.5' : '1') + ';">' +
                    '    <input type="checkbox" class="usr-perm-check" value="' + p.id + '" ' + (checked ? 'checked' : '') + ' ' + (ehAdmin ? 'disabled' : '') + ' style="width:18px;height:18px;accent-color:#C2185B;">' +
                    '    <i class="fas ' + p.icon + '" style="color:#C2185B;width:16px;font-size:0.85rem;"></i>' +
                    '    <span style="font-size:0.85rem;">' + p.label + '</span>' +
                    '</label>';
        });
        html += '</div>';
    });

    container.innerHTML = html;
}

window.aoMudarNivelUsuario = function() {
    const nivel = document.getElementById('usr-nivel').value;
    const checks = document.querySelectorAll('.usr-perm-check');
    if (nivel === 'admin') {
        checks.forEach(function(c) { c.checked = true; c.disabled = true; });
    } else {
        const padrao = (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[nivel]) ? window.PERMISSOES_PADRAO[nivel] : [];
        checks.forEach(function(c) {
            c.disabled = false;
            c.checked = padrao.indexOf(c.value) >= 0;
        });
    }
};

window.toggleTodasPermissoes = function() {
    const nivel = document.getElementById('usr-nivel').value;
    if (nivel === 'admin') { alert('Administrador tem todas as permissões automaticamente.'); return; }
    const checks = document.querySelectorAll('.usr-perm-check');
    const todosMarcados = Array.from(checks).every(function(c) { return c.checked; });
    checks.forEach(function(c) { c.checked = !todosMarcados; });
};

// ============================================================
// SALVAR
// ============================================================
window.salvarUsuarioSistema = async function() {
    const nome = (document.getElementById('usr-nome').value || '').trim();
    const email = (document.getElementById('usr-email').value || '').trim().toLowerCase();
    const senha = document.getElementById('usr-senha').value;
    const senhaConf = document.getElementById('usr-senha-conf').value;
    const nivel = document.getElementById('usr-nivel').value;
    const ativo = document.getElementById('usr-ativo').checked;

    if (!nome) { alert('Informe o nome'); return; }
    if (!email || email.indexOf('@') < 0) { alert('Informe um e-mail válido'); return; }

    const u = window.usuarioEditando || {};
    const editando = !!u.id;

    if (!editando && (!senha || senha.length < 4)) {
        alert('Informe uma senha com pelo menos 4 caracteres');
        return;
    }
    if (senha && senha.length < 4) { alert('A senha deve ter pelo menos 4 caracteres'); return; }
    if (senha && senha !== senhaConf) { alert('As senhas não coincidem'); return; }

    const lista = await apiGet('usuarios');
    const listaArr = Array.isArray(lista) ? lista : [];

    if (listaArr.some(function(x) {
        return String(x.email).toLowerCase() === email && String(x.id) !== String(u.id);
    })) {
        alert('Já existe um usuário com este e-mail');
        return;
    }

    let permissoes = [];
    if (nivel === 'admin') {
        permissoes = (window.PERMISSOES_SISTEMA || []).map(function(p) { return p.id; });
    } else {
        document.querySelectorAll('.usr-perm-check:checked').forEach(function(c) {
            permissoes.push(c.value);
        });
    }

    const dados = {
        id: u.id || Date.now(),
        nome: nome,
        email: email,
        nivel: nivel,
        ativo: ativo,
        permissoes: permissoes,
        perguntaSeguranca: u.perguntaSeguranca || '',
        respostaSeguranca: u.respostaSeguranca || '',
        criadoEm: u.criadoEm || new Date().toISOString(),
        atualizadoEm: new Date().toISOString()
    };

    if (senha) {
        dados.senha = btoa(senha);
    } else if (u.senha) {
        dados.senha = u.senha;
    }

    if (u.nivel === 'admin' && nivel !== 'admin') {
        const adminsAtivos = listaArr.filter(function(x) {
            return x.nivel === 'admin' && x.ativo !== false && String(x.id) !== String(u.id);
        });
        if (adminsAtivos.length === 0) {
            alert('Não é possível rebaixar: este é o único administrador ativo.');
            return;
        }
    }

    const idx = listaArr.findIndex(function(x) { return String(x.id) === String(dados.id); });
    if (idx >= 0) listaArr[idx] = dados;
    else listaArr.push(dados);

    await apiSave('usuarios', listaArr);

    // ⬇️ Atualiza a sessão em memória (sem localStorage)
    try {
        const logado = window.obterUsuarioLogado ? window.obterUsuarioLogado() : null;
        if (logado && String(logado.id) === String(dados.id)) {
            window.SESSION.usuario = Object.assign({}, window.SESSION.usuario, {
                nome: dados.nome,
                email: dados.email,
                nivel: dados.nivel,
                permissoes: dados.permissoes
            });
        }
    } catch (e) {}

    window.usuarioEditando = null;
    if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Usuário ' + (editando ? 'atualizado' : 'cadastrado'));
    navigateTo('usuarios');
};

window.excluirUsuarioAtual = async function() {
    const u = window.usuarioEditando;
    if (!u || !u.id) return;
    await window.excluirUsuario(u.id);
};