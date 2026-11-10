// ============================================================
// CADASTRONIVEL.JS — Formulário de nível de acesso
// ============================================================

console.log('✔ CadastroNivel.js carregado');

// ============================================================
// RENDER
// ============================================================
window.renderCadastroNivel = function() {
    const n = window.nivelEditando || {};
    const editando = !!n.id;
    const corAtual = n.cor || '#C2185B';
    const iconAtual = n.icon || 'fa-user';

    // Preenche as paletas após injetar no DOM
    setTimeout(function() {
        renderPaletaCores();
        renderPaletaIcones();
        renderPermissoesNivel();
    }, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Nível' : 'Novo Nível') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // Nome
        '        <div class="field">',
        '            <label>Nome do nível *</label>',
        '            <input type="text" id="niv-nome" maxlength="30" placeholder="Ex: Supervisor" value="' + (n.nome || '') + '">',
        '        </div>',

        // Descrição
        '        <div class="field">',
        '            <label>Descrição</label>',
        '            <input type="text" id="niv-desc" maxlength="60" placeholder="Ex: Pode ver relatórios e gerenciar estoque" value="' + (n.descricao || '') + '">',
        '        </div>',

        // Telas e funções liberadas
        '        <div class="field">',
        '            <label>Telas e funções deste nível</label>',
        '            <div id="niv-perms"></div>',
        '        </div>',

        // Cor
        '        <div class="field">',
        '            <label>Cor</label>',
        '            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="niv-cores"></div>',
        '        </div>',

        // Ícone
        '        <div class="field">',
        '            <label>Ícone</label>',
        '            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="niv-icones"></div>',
        '        </div>',

        // Preview
        '        <div class="card" style="background:#f5f5f5;padding:15px;text-align:center;">',
        '            <div style="font-size:0.75rem;color:#888;margin-bottom:10px;">PRÉVIA</div>',
        '            <div style="display:inline-flex;align-items:center;gap:12px;background:#fff;padding:10px 16px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.08);">',
        '                <div id="niv-preview-bola" style="width:40px;height:40px;border-radius:50%;background:' + corAtual + ';display:flex;align-items:center;justify-content:center;">',
        '                    <i class="fas ' + iconAtual + '" style="color:#fff;font-size:1rem;" id="niv-preview-icon"></i>',
        '                </div>',
        '                <div style="text-align:left;">',
        '                    <div id="niv-preview-nome" style="font-weight:600;">' + (n.nome || 'Nome do nível') + '</div>',
        '                    <div id="niv-preview-desc" style="font-size:0.75rem;color:#888;">' + (n.descricao || 'Sem descrição') + '</div>',
        '                </div>',
        '            </div>',
        '        </div>',

        // Aviso se protegido
        n.protegido ? '        <div class="card" style="background:#fff3e0;padding:12px;font-size:0.8rem;color:#e65100;margin-top:15px;"><i class="fas fa-lock"></i> Este nível é <strong>protegido</strong> pelo sistema. Você pode editar cor/ícone/nome, mas não pode excluir.</div>' : '',

        // Botões
        '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarNivel()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        (editando && !n.protegido) ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirNivelAtual()"><i class="fas fa-trash"></i> Excluir</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'niveis-acesso\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// TELAS E FUNÇÕES POR NÍVEL
// ============================================================
function renderPermissoesNivel() {
    const box = document.getElementById('niv-perms'); if (!box) return;
    const n = window.nivelEditando || {};
    const admin = n.id === 'admin';
    let marcadas = Array.isArray(n.permissoes) ? n.permissoes : (window.PERMISSOES_PADRAO_NIVEL[n.id] || []);
    const todas = marcadas.indexOf('*') >= 0;
    let h = admin ? '<div class="card" style="background:#fff3e0;padding:10px;font-size:0.8rem;color:#e65100;margin-bottom:8px;"><i class="fas fa-crown"></i> Administrador sempre tem acesso total.</div>' : '';
    window.PERMISSOES_CATALOGO.forEach(function (g, gi) {
        h += '<div class="card" style="background:#fff;padding:10px 12px;margin-bottom:8px;">' +
             '<div style="display:flex;justify-content:space-between;align-items:center;"><b style="font-size:0.85rem;">' + g.grupo + '</b>' +
             (admin ? '' : '<button type="button" class="btn-limpar" style="font-size:0.7rem;color:#C2185B;" onclick="marcarGrupoNivel(' + gi + ')">marcar/desmarcar</button>') + '</div>';
        g.itens.forEach(function (it) {
            h += '<label style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;font-size:0.85rem;border-top:1px solid #f3f3f3;">' +
                 '<span>' + it[1] + '</span><input type="checkbox" class="niv-perm" data-g="' + gi + '" value="' + it[0] + '" style="width:20px;height:20px;accent-color:#C2185B;" ' +
                 ((todas || marcadas.indexOf(it[0]) >= 0) ? 'checked ' : '') + (admin ? 'disabled' : '') + '></label>';
        });
        h += '</div>';
    });
    box.innerHTML = h;
}

window.marcarGrupoNivel = function (gi) {
    const bs = Array.prototype.filter.call(document.querySelectorAll('.niv-perm'), function (b) { return b.getAttribute('data-g') === String(gi); });
    const todas = bs.every(function (b) { return b.checked; });
    bs.forEach(function (b) { b.checked = !todas; });
};

// ============================================================
// PALETAS
// ============================================================
function renderPaletaCores() {
    const container = document.getElementById('niv-cores');
    if (!container) return;
    const n = window.nivelEditando || {};
    const corAtual = n.cor || '#C2185B';

    const html = [];
    for (let i = 0; i < window.CORES_NIVEL.length; i++) {
        const c = window.CORES_NIVEL[i];
        const ativo = c.hex === corAtual;
        html.push(
            '<button onclick="selecionarCorNivel(\'' + c.hex + '\')" ' +
            'title="' + c.id + '" ' +
            'style="width:38px;height:38px;background:' + c.hex + ';border:none;border-radius:50%;' +
            'cursor:pointer;transition:transform 0.15s;' +
            (ativo ? 'box-shadow:0 0 0 3px rgba(0,0,0,0.3);transform:scale(1.15);' : '') + '">' +
            (ativo ? '<i class="fas fa-check" style="color:#fff;font-size:0.85rem;"></i>' : '') +
            '</button>'
        );
    }
    container.innerHTML = html.join('');
}

function renderPaletaIcones() {
    const container = document.getElementById('niv-icones');
    if (!container) return;
    const n = window.nivelEditando || {};
    const iconAtual = n.icon || 'fa-user';

    const html = [];
    for (let i = 0; i < window.ICONES_NIVEL.length; i++) {
        const ic = window.ICONES_NIVEL[i];
        const ativo = ic.id === iconAtual;
        html.push(
            '<button onclick="selecionarIconeNivel(\'' + ic.id + '\')" ' +
            'title="' + ic.label + '" ' +
            'style="width:44px;height:44px;background:' + (ativo ? '#C2185B' : '#f5f5f5') + ';' +
            'color:' + (ativo ? '#fff' : '#666') + ';border:1.5px solid ' + (ativo ? '#C2185B' : '#e0e0e0') + ';' +
            'border-radius:10px;cursor:pointer;font-size:1.1rem;' +
            'transition:all 0.15s;' +
            (ativo ? 'transform:scale(1.05);' : '') + '">' +
            '<i class="fas ' + ic.id + '"></i>' +
            '</button>'
        );
    }
    container.innerHTML = html.join('');
}

window.selecionarCorNivel = function(hex) {
    const n = window.nivelEditando || {};
    n.cor = hex;
    window.nivelEditando = n;
    renderPaletaCores();
    const bola = document.getElementById('niv-preview-bola');
    if (bola) bola.style.background = hex;
};

window.selecionarIconeNivel = function(icon) {
    const n = window.nivelEditando || {};
    n.icon = icon;
    window.nivelEditando = n;
    renderPaletaIcones();
    const i = document.getElementById('niv-preview-icon');
    if (i) i.className = 'fas ' + icon;
};

// ============================================================
// SALVAR
// ============================================================
window.salvarNivel = async function() {
    const nome = (document.getElementById('niv-nome').value || '').trim();
    const descricao = (document.getElementById('niv-desc').value || '').trim();
    const n = window.nivelEditando || {};
    const cor = n.cor || '#C2185B';
    const icon = n.icon || 'fa-user';

    if (!nome) {
        alert('Informe o nome do nível');
        return;
    }

    const lista = await apiGet('niveisAcesso');

    // Duplicidade por nome
    const duplicado = lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() &&
               String(x.id) !== String(n.id);
    });
    if (duplicado) {
        alert('Já existe um nível com esse nome');
        return;
    }

    const dados = {
        id: n.id || ('nivel_' + Date.now()),
        nome: nome,
        descricao: descricao,
        cor: cor,
        icon: icon,
        protegido: n.protegido === true,
        permissoes: n.id === 'admin' ? ['*'] : Array.prototype.map.call(document.querySelectorAll('.niv-perm:checked'), function (b) { return b.value; })
    };

    let atualizado = false;
    for (let i = 0; i < lista.length; i++) {
        if (String(lista[i].id) === String(dados.id)) {
            lista[i] = dados;
            atualizado = true;
            break;
        }
    }
    if (!atualizado) lista.push(dados);

    await apiSave('niveisAcesso', lista);
    window.__niveisCache = lista;
    if (window.carregarPerfisDinamicos) window.carregarPerfisDinamicos();
    window.nivelEditando = null;

    // Se veio do "cadastrar nível inline", volta para o colaborador
    if (window._voltarParaColaborador) {
        window._voltarParaColaborador = false;
        navigateTo('cadastro-colaborador');
    } else {
        navigateTo('niveis-acesso');
    }
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirNivelAtual = async function() {
    const n = window.nivelEditando;
    if (!n || !n.id) return;

    if (n.protegido) {
        alert('Este nível é protegido e não pode ser excluído.');
        return;
    }

    const colaboradores = await apiGet('colaboradores');
    const emUso = colaboradores.filter(function(c) {
        return c.nivelAcesso === n.id;
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' colaborador(es) usam este nível.');
        return;
    }

    if (!await window.confirmar('Excluir o nível "' + n.nome + '"?')) return;

    const lista = await apiGet('niveisAcesso');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(n.id); });
    await apiSave('niveisAcesso', novaLista);

    window.nivelEditando = null;
    navigateTo('niveis-acesso');
};