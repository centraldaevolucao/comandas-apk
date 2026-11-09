// ============================================================
// CADASTROCOLABORADOR.JS — Colaborador + acesso ao sistema
// ============================================================

console.log('✔ CadastroColaborador.js carregado');

// ============================================================
// RENDER
// ============================================================
window.renderCadastroColaborador = function() {
    const c = window.colaboradorEditando || {};
    const editando = !!c.id;
    const u = window.usuarioDoColaborador || null;
    const acessoAtivo = !!(u && u.id);

    setTimeout(preencherSelectsColaborador, 30);
    setTimeout(window.colabMaquininhasPreencher, 40);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Colaborador' : 'Novo Colaborador') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // ---- Dados do colaborador ----
        '        <div class="card" style="background:#FCE4EC;">',
        '            <div class="card-title">👤 Dados do colaborador</div>',

        '            <div class="field">',
        '                <label>Nome *</label>',
        '                <input type="text" id="col-nome" maxlength="40" placeholder="Ex: Ana" value="' + (c.nome || '') + '">',
        '            </div>',

        '            <div class="field">',
        '                <label>Função / Cargo</label>',
        '                <select id="col-funcao"><option value="">Carregando...</option></select>',
        '                <small style="color:#888;font-size:0.75rem;">',
        '                    <i class="fas fa-plus-circle"></i> ',
        '                    <a href="#" onclick="event.preventDefault(); novoFuncaoInline()" style="color:var(--primary-color);text-decoration:none;">Cadastrar nova função</a>',
        '                </small>',
        '            </div>',

        '            <div class="field" style="margin-bottom:0;">',
        '                <label>Nível de acesso</label>',
        '                <select id="col-nivel" onchange="atualizarAvisoNivel()"><option value="">Carregando...</option></select>',
        '                <small style="color:#888;font-size:0.75rem;">',
        '                    <i class="fas fa-plus-circle"></i> ',
        '                    <a href="#" onclick="event.preventDefault(); novoNivelInline()" style="color:var(--primary-color);text-decoration:none;">Cadastrar novo nível</a>',
        '                </small>',
        '            </div>',
        '        </div>',

        // ---- Card de permissões ----
        '        <div class="card" style="background:#FCE4EC;padding:15px;font-size:0.8rem;" id="col-permissoes-card">',
        '            <strong style="color:var(--primary-color);">ℹ️ Permissões deste nível</strong>',
        '            <div style="margin-top:8px;line-height:1.6;" id="col-permissoes-texto">Carregando...</div>',
        '        </div>',

        // ---- Maquininhas do colaborador/garçom ----
        '        <div class="card" id="col-maq-card" style="background:#fff;border:2px solid #e0e0e0;display:none;">',
        '            <div style="font-weight:700;font-size:0.95rem;"><i class="fas fa-credit-card" style="color:#C2185B;"></i> Maquininhas deste garçom</div>',
        '            <div style="font-size:0.75rem;color:#888;margin:4px 0 8px;">Marque as maquininhas que ele usa. Sem marcação = todas as maquininhas ativas do caixa.</div>',
        '            <div id="col-maq-lista"></div>',
        '        </div>',

        // ---- ACESSO AO SISTEMA (toggle) ----
        '        <div class="card" style="background:#fff;border:2px solid ' + (acessoAtivo ? '#4caf50' : '#e0e0e0') + ';">',
        '            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">',
        '                <div style="flex:1;">',
        '                    <div style="font-weight:700;font-size:0.95rem;">',
        '                        <i class="fas fa-key" style="color:' + (acessoAtivo ? '#4caf50' : '#999') + ';"></i>',
        '                        Ativar acesso ao sistema',
        '                    </div>',
        '                    <div style="font-size:0.75rem;color:#888;margin-top:4px;">',
        '                        Permite que este colaborador faça login no app com e-mail e senha.',
        '                    </div>',
        '                </div>',
        '                <label class="toggle">',
        '                    <input type="checkbox" id="col-acesso-ativo" ' + (acessoAtivo ? 'checked' : '') + ' onchange="toggleAcessoColaborador()">',
        '                    <span class="slider"></span>',
        '                </label>',
        '            </div>',

        // Campos de acesso (mostrados só se ativo)
        '            <div id="col-campos-acesso" style="display:' + (acessoAtivo ? 'block' : 'none') + ';margin-top:16px;padding-top:16px;border-top:1px solid #eee;">',
        '                <div class="field">',
        '                    <label>E-mail (login) *</label>',
        '                    <input type="email" id="col-acesso-email" maxlength="80" placeholder="usuario@minimercado.com.br" value="' + (u && u.email ? u.email : '') + '">',
        '                    <small style="color:#888;font-size:0.75rem;">Este será o e-mail usado no login</small>',
        '                </div>',

        '                <div class="field">',
        '                    <label>' + (acessoAtivo ? 'Nova senha (deixe em branco para manter)' : 'Senha *') + '</label>',
        '                    <div style="position:relative;display:flex;align-items:center;">',
        '                        <input type="password" id="col-acesso-senha" placeholder="' + (acessoAtivo ? 'Manter senha atual' : 'Mínimo 4 caracteres') + '" minlength="4" style="flex:1;padding-right:40px;">',
        '                        <button type="button" class="btn-limpar" style="position:absolute;right:8px;" onclick="toggleSenhaVisivel(\'col-acesso-senha\')">',
        '                            <i class="fas fa-eye" style="color:#888;"></i>',
        '                        </button>',
        '                    </div>',
        '                </div>',

        '                <div class="field" style="margin-bottom:0;">',
        '                    <label>Confirmar senha</label>',
        '                    <input type="password" id="col-acesso-senha-conf" placeholder="Repita a senha" minlength="4">',
        '                </div>',

        '                <div style="margin-top:12px;padding:10px 12px;background:#e8f5e9;border-radius:8px;font-size:0.8rem;color:#2e7d32;">',
        '                    <i class="fas fa-info-circle"></i>',
        '                    O colaborador usará o e-mail <b>+ senha</b> para fazer login. As permissões dele serão as do <b>nível de acesso</b> escolhido acima.',
        '                </div>',
        '            </div>',
        '        </div>',

        // ---- Botões ----
        '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarColaborador()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirColaboradorAtual()"><i class="fas fa-trash"></i> Excluir Colaborador</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'colaboradores\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// MAQUININHAS DO COLABORADOR
// ============================================================
window.colabMaquininhasPreencher = async function () {
    const card = document.getElementById('col-maq-card'), box = document.getElementById('col-maq-lista');
    if (!card || !box || !window.maquininhasLista) return;
    const lista = await window.maquininhasLista();
    if (!lista.length) { card.style.display = 'none'; return; }
    const sel = ((window.colaboradorEditando || {}).maquininhas || []).map(String);
    box.innerHTML = lista.map(function (m) {
        return '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;"><input type="checkbox" class="col-maq-chk" value="' + String(m.id).replace(/"/g, '') + '"' + (sel.indexOf(String(m.id)) >= 0 ? ' checked' : '') + '> <span>' + String(m.nome || 'Maquininha').replace(/</g, '&lt;') + (m.ativa === false ? ' <small style="color:#c62828;">(inativa)</small>' : '') + '</span></label>';
    }).join('');
    card.style.display = 'block';
};

// ============================================================
// TOGGLE VISUAL DO CAMPO DE SENHA
// ============================================================
window.toggleSenhaVisivel = function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.type = el.type === 'password' ? 'text' : 'password';
    var btn = el.parentElement.querySelector('.btn-limpar i');
    if (btn) {
        btn.classList.toggle('fa-eye');
        btn.classList.toggle('fa-eye-slash');
    }
};

// ============================================================
// TOGGLE "ATIVAR ACESSO"
// ============================================================
window.toggleAcessoColaborador = function() {
    var chk = document.getElementById('col-acesso-ativo');
    var div = document.getElementById('col-campos-acesso');
    if (!chk || !div) return;
    div.style.display = chk.checked ? 'block' : 'none';
};

// ============================================================
// PREENCHE SELECTS
// ============================================================
async function preencherSelectsColaborador() {
    const c = window.colaboradorEditando || {};

    // ---------- FUNÇÕES ----------
    let funcoes = await apiGet('funcoes');
    if (!Array.isArray(funcoes) || funcoes.length === 0) {
        funcoes = [
            { id: 1, nome: 'Garçom' },
            { id: 2, nome: 'Atendente' },
            { id: 3, nome: 'Caixa' },
            { id: 4, nome: 'Cozinheiro' }
        ];
        await apiSave('funcoes', funcoes);
    }
    funcoes.sort(function(a, b) { return String(a.nome).localeCompare(String(b.nome)); });

    const selFuncao = document.getElementById('col-funcao');
    if (selFuncao) {
        selFuncao.innerHTML = '<option value="">-- Sem função --</option>';
        for (let i = 0; i < funcoes.length; i++) {
            const f = funcoes[i];
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.nome;
            if (String(c.funcaoId) === String(f.id) || c.funcao === f.nome) opt.selected = true;
            selFuncao.appendChild(opt);
        }
    }

    // ---------- NÍVEIS ----------
    let niveis = await apiGet('niveisAcesso');
    if (!Array.isArray(niveis) || niveis.length === 0) {
        niveis = [
            { id: 'admin',     nome: 'Administrador', icon: 'fa-crown',       cor: '#c62828', descricao: 'Acesso total' },
            { id: 'gerente',   nome: 'Gerente',       icon: 'fa-user-shield', cor: '#C2185B', descricao: 'Cadastros e relatórios' },
            { id: 'atendente', nome: 'Atendente',     icon: 'fa-user-tie',    cor: '#1976d2', descricao: 'Comandas e pedidos' },
            { id: 'caixa',     nome: 'Caixa',         icon: 'fa-cash-register',cor: '#388e3c', descricao: 'PDV e caixa' },
            { id: 'cozinha',   nome: 'Cozinha',       icon: 'fa-utensils',    cor: '#ff9800', descricao: 'Produção' }
        ];
        await apiSave('niveisAcesso', niveis);
    }

    const selNivel = document.getElementById('col-nivel');
    if (selNivel) {
        selNivel.innerHTML = '';
        for (let i = 0; i < niveis.length; i++) {
            const n = niveis[i];
            const opt = document.createElement('option');
            opt.value = n.id;
            opt.textContent = n.nome;
            if (c.nivelAcesso === n.id) opt.selected = true;
            selNivel.appendChild(opt);
        }
        if (!c.nivelAcesso && niveis.length > 0) selNivel.value = niveis[0].id;
    }

    atualizarAvisoNivel();

    // ---------- USUÁRIO VINCULADO ----------
    if (c.id) {
        try {
            const usuarios = await apiGet('usuarios');
            const lista = Array.isArray(usuarios) ? usuarios : [];
            const u = lista.find(function(x) { return String(x.colaboradorId) === String(c.id); });
            window.usuarioDoColaborador = u || null;

            // Se achou, preenche o toggle + e-mail
            if (u) {
                const chk = document.getElementById('col-acesso-ativo');
                const div = document.getElementById('col-campos-acesso');
                const emailEl = document.getElementById('col-acesso-email');
                if (chk) chk.checked = true;
                if (div) div.style.display = 'block';
                if (emailEl && u.email) emailEl.value = u.email;
            }
        } catch (e) {
            console.warn('Erro ao buscar usuário vinculado:', e);
        }
    }
}

// ============================================================
// AVISO DE PERMISSÕES
// ============================================================
window.atualizarAvisoNivel = async function() {
    const sel = document.getElementById('col-nivel');
    const nivelId = sel ? sel.value : '';
    const div = document.getElementById('col-permissoes-texto');
    if (!div) return;
    if (!nivelId) {
        div.innerHTML = '<em style="color:#888;">Selecione um nível para ver as permissões.</em>';
        return;
    }
    try {
        const niveis = await apiGet('niveisAcesso');
        const n = (niveis || []).find(function(x) { return String(x.id) === String(nivelId); });
        if (!n) {
            div.innerHTML = '<em style="color:#888;">Nível não encontrado.</em>';
            return;
        }
        div.innerHTML =
            '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">' +
            '    <div style="width:36px;height:36px;background:' + (n.cor || '#C2185B') + ';border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
            '        <i class="fas ' + (n.icon || 'fa-user') + '" style="color:#fff;font-size:0.9rem;"></i>' +
            '    </div>' +
            '    <strong style="color:' + (n.cor || '#C2185B') + ';font-size:0.95rem;">' + n.nome + '</strong>' +
            '</div>' +
            '<div style="color:#555;line-height:1.5;">' + (n.descricao || 'Sem descrição.') + '</div>';
    } catch (e) {
        div.innerHTML = '<em style="color:#888;">Erro ao carregar.</em>';
    }
};

// ============================================================
// ATALHOS INLINE
// ============================================================
window.novoFuncaoInline = function() {
    window.funcaoEditando = null;
    window._voltarParaColaborador = true;
    navigateTo('cadastro-funcao');
};

window.novoNivelInline = function() {
    window.nivelEditando = null;
    window._voltarParaColaborador = true;
    navigateTo('cadastro-nivel');
};

// ============================================================
// SALVAR
// ============================================================
window.salvarColaborador = async function() {
    const nome = (document.getElementById('col-nome').value || '').trim();
    const selFuncao = document.getElementById('col-funcao');
    const funcaoId = selFuncao ? (selFuncao.value || '') : '';
    const funcaoNome = (selFuncao && selFuncao.selectedOptions[0]) ? selFuncao.selectedOptions[0].textContent : '';
    const nivel = (document.getElementById('col-nivel') || {}).value || 'atendente';

    const acessoAtivo = document.getElementById('col-acesso-ativo').checked;
    const emailAcesso = (document.getElementById('col-acesso-email').value || '').trim().toLowerCase();
    const senhaAcesso = document.getElementById('col-acesso-senha').value || '';
    const senhaConf = document.getElementById('col-acesso-senha-conf').value || '';

    if (!nome) { alert('Informe o nome do colaborador'); return; }

    // ---------- Validações do acesso ----------
    if (acessoAtivo) {
        if (!emailAcesso || emailAcesso.indexOf('@') < 0) {
            alert('Informe um e-mail válido para o acesso');
            return;
        }
        const uAtual = window.usuarioDoColaborador;
        if (!uAtual && (!senhaAcesso || senhaAcesso.length < 4)) {
            alert('Informe uma senha com pelo menos 4 caracteres');
            return;
        }
        if (senhaAcesso && senhaAcesso.length < 4) {
            alert('A senha deve ter pelo menos 4 caracteres');
            return;
        }
        if (senhaAcesso && senhaAcesso !== senhaConf) {
            alert('As senhas não coincidem');
            return;
        }
    }

    const lista = await apiGet('colaboradores');
    const c = window.colaboradorEditando || {};

    // Duplicidade de nome
    if (lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() && String(x.id) !== String(c.id);
    })) {
        alert('Já existe um colaborador com esse nome');
        return;
    }

    // ---------- Salva colaborador ----------
    const dados = {
        id: c.id || Date.now(),
        nome: nome,
        funcaoId: funcaoId,
        funcao: funcaoId ? funcaoNome : '',
        nivelAcesso: nivel
    };
    if (document.getElementById('col-maq-card') && document.getElementById('col-maq-card').style.display !== 'none') {
        dados.maquininhas = Array.prototype.map.call(document.querySelectorAll('.col-maq-chk:checked'), function (e) { return e.value; });
    } else if (c.maquininhas) dados.maquininhas = c.maquininhas;

    let atualizado = false;
    for (let i = 0; i < lista.length; i++) {
        if (String(lista[i].id) === String(dados.id)) {
            lista[i] = dados;
            atualizado = true;
            break;
        }
    }
    if (!atualizado) lista.push(dados);
    await apiSave('colaboradores', lista);

    // ---------- Sincroniza usuário ----------
    try {
        await sincronizarUsuarioDoColaborador({
            colaboradorId: dados.id,
            nome: nome,
            nivel: nivel,
            acessoAtivo: acessoAtivo,
            email: emailAcesso,
            senha: senhaAcesso
        });
    } catch (e) {
        console.error('Erro ao sincronizar usuário:', e);
        alert('⚠️ Colaborador salvo, mas houve erro ao criar/atualizar o acesso:\n\n' + e.message);
    }

    window.colaboradorEditando = null;
    window.usuarioDoColaborador = null;

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('✅ Colaborador salvo');
    }

    if (window._voltarParaColaborador) {
        window._voltarParaColaborador = false;
        navigateTo('cadastro-colaborador');
    } else {
        navigateTo('colaboradores');
    }
};

// ============================================================
// SINCRONIZA USUÁRIO (cria / atualiza / remove)
// ============================================================
async function sincronizarUsuarioDoColaborador(opts) {
    const usuarios = await apiGet('usuarios');
    const lista = Array.isArray(usuarios) ? usuarios : [];

    const idx = lista.findIndex(function(u) {
        return String(u.colaboradorId) === String(opts.colaboradorId);
    });

    // ---------- Desativar acesso ----------
    if (!opts.acessoAtivo) {
        if (idx >= 0) {
            // Remove o usuário vinculado
            lista.splice(idx, 1);
            await apiSave('usuarios', lista);
        }
        return;
    }

    // ---------- Validar e-mail único ----------
    const email = String(opts.email || '').trim().toLowerCase();
    const conflito = lista.some(function(u) {
        return String(u.email || '').toLowerCase() === email && String(u.colaboradorId) !== String(opts.colaboradorId);
    });
    if (conflito) {
        throw new Error('Já existe um usuário com este e-mail. Use outro e-mail.');
    }

    // ---------- Cria ou atualiza ----------
    const senhaHash = opts.senha ? btoa(opts.senha) : null;

    if (idx >= 0) {
        // Atualiza
        lista[idx].nome = opts.nome;
        lista[idx].email = email;
        lista[idx].nivel = opts.nivel;
        lista[idx].ativo = true;
        lista[idx].atualizadoEm = new Date().toISOString();
        if (senhaHash) lista[idx].senha = senhaHash;
        // Permissões padrão do nível (se não tiver)
        if (!Array.isArray(lista[idx].permissoes) || lista[idx].permissoes.length === 0) {
            lista[idx].permissoes = (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[opts.nivel]) || [];
        }
    } else {
        // Cria
        if (!senhaHash) throw new Error('Senha obrigatória para criar acesso');
        lista.push({
            id: Date.now(),
            colaboradorId: opts.colaboradorId,
            nome: opts.nome,
            email: email,
            senha: senhaHash,
            nivel: opts.nivel,
            ativo: true,
            permissoes: (window.PERMISSOES_PADRAO && window.PERMISSOES_PADRAO[opts.nivel]) || [],
            perguntaSeguranca: '',
            respostaSeguranca: '',
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        });
    }

    await apiSave('usuarios', lista);
}

// ============================================================
// EXCLUIR COLABORADOR
// ============================================================
window.excluirColaboradorAtual = async function() {
    const c = window.colaboradorEditando;
    if (!c || !c.id) return;

    if (c.nivelAcesso === 'admin') {
        const lista = await apiGet('colaboradores');
        const admins = lista.filter(function(x) { return x.nivelAcesso === 'admin'; });
        if (admins.length <= 1) {
            alert('Não é possível excluir: é o único administrador.');
            return;
        }
    }

    if (!await window.confirmar('Excluir o colaborador "' + c.nome + '"?\n\nO acesso ao sistema também será removido.')) return;

    // Remove colaborador
    const lista = await apiGet('colaboradores');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(c.id); });
    await apiSave('colaboradores', novaLista);

    // Remove usuário vinculado
    try {
        const usuarios = await apiGet('usuarios');
        const listaU = Array.isArray(usuarios) ? usuarios : [];
        const novaU = listaU.filter(function(u) { return String(u.colaboradorId) !== String(c.id); });
        if (novaU.length !== listaU.length) await apiSave('usuarios', novaU);
    } catch (e) {
        console.warn('Erro ao remover usuário vinculado:', e);
    }

    window.colaboradorEditando = null;
    window.usuarioDoColaborador = null;
    navigateTo('colaboradores');
};