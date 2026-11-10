// ============================================================
// CADASTROFUNCAO.JS — Formulário de função/cargo
// ============================================================

console.log('✔ CadastroFuncao.js carregado');

// ============================================================
// RENDER
// ============================================================
window.renderCadastroFuncao = function() {
    console.log('🎬 renderCadastroFuncao chamado');

    const f = window.funcaoEditando || {};
    const editando = !!f.id;
    setTimeout(window.funcaoPreencherNiveis, 30);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Função' : 'Nova Função') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        '        <div class="field">',
        '            <label>Nome da função *</label>',
        '            <input type="text" id="func-nome" maxlength="30" placeholder="Ex: Garçom, Caixa, Cozinheiro" value="' + (f.nome || '') + '">',
        '        </div>',

        '        <div class="field">',
        '            <label>Nível de acesso</label>',
        '            <select id="func-nivel"></select>',
        '            <small style="display:block;margin-top:4px;color:#888;">O nível define as telas e funções liberadas (edite em Níveis de acesso).</small>',
        '        </div>',
        '        <div class="card" style="background:#fff;padding:12px 15px;display:flex;justify-content:space-between;align-items:center;gap:10px;">',
        '            <div><div style="font-weight:600;font-size:0.95rem;">Aparece no modo cliente</div><div style="font-size:0.75rem;color:#666;margin-top:3px;line-height:1.4;">Mostra esta função na escolha "Qual a função deste aparelho?" dos aparelhos clientes.</div></div>',
        '            <label class="toggle"><input type="checkbox" id="func-modo-cliente" ' + (f.modoCliente === false ? '' : 'checked') + '><span class="slider"></span></label>',
        '        </div>',

        '        <div class="card" style="background:#FCE4EC;padding:15px;font-size:0.8rem;">',
        '            <strong style="color:var(--primary-color);">💡 Sugestões</strong>',
        '            <div style="margin-top:8px;line-height:1.6;color:#555;">',
        '                Garçom, Atendente, Caixa, Cozinheiro, Barman, Gerente, Recepcionista, Chapeiro, Barista, Estoquista',
        '            </div>',
        '        </div>',

        '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarFuncao()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirFuncaoAtual()"><i class="fas fa-trash"></i> Excluir</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'funcoes\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

window.funcaoPreencherNiveis = async function () {
    const sel = document.getElementById('func-nivel'); if (!sel) return;
    let niveis = [];
    try { niveis = window.normalizarArray(await apiGet('niveisAcesso')); } catch (e) {}
    if (!niveis.length) niveis = [{ id: 'admin', nome: 'Administrador' }, { id: 'gerente', nome: 'Gerente' }, { id: 'atendente', nome: 'Atendente' }, { id: 'caixa', nome: 'Caixa' }, { id: 'cozinha', nome: 'Cozinha' }];
    const f = window.funcaoEditando || {};
    const atual = f.nivelAcesso || 'atendente';
    sel.innerHTML = niveis.map(function (n) { return '<option value="' + String(n.id).replace(/"/g, '') + '"' + (String(n.id) === String(atual) ? ' selected' : '') + '>' + String(n.nome).replace(/</g, '&lt;') + '</option>'; }).join('');
};

// ============================================================
// SALVAR
// ============================================================
window.salvarFuncao = async function() {
    const nome = (document.getElementById('func-nome').value || '').trim();

    if (!nome) {
        alert('Informe o nome da função');
        return;
    }

    const lista = await apiGet('funcoes');
    const f = window.funcaoEditando || {};

    // Duplicidade
    const duplicado = lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() &&
               String(x.id) !== String(f.id);
    });

    if (duplicado) {
        alert('Já existe uma função com esse nome');
        return;
    }

    const dados = Object.assign({}, f, {
        id: f.id || Date.now(),
        nome: nome,
        nivelAcesso: (document.getElementById('func-nivel') || {}).value || f.nivelAcesso || 'atendente',
        modoCliente: !!(document.getElementById('func-modo-cliente') || {}).checked
    });

    let atualizado = false;
    for (let i = 0; i < lista.length; i++) {
        if (String(lista[i].id) === String(dados.id)) {
            lista[i] = dados;
            atualizado = true;
            break;
        }
    }
    if (!atualizado) lista.push(dados);

    await apiSave('funcoes', lista);
    window.funcaoEditando = null;

    // Se veio do "cadastrar função inline", volta para o colaborador
    if (window._voltarParaColaborador) {
        window._voltarParaColaborador = false;
        navigateTo('cadastro-colaborador');
    } else {
        navigateTo('funcoes');
    }
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirFuncaoAtual = async function() {
    const f = window.funcaoEditando;
    if (!f || !f.id) return;

    const colaboradores = await apiGet('colaboradores');
    const emUso = colaboradores.filter(function(c) {
        return String(c.funcaoId) === String(f.id) || c.funcao === f.nome;
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' colaborador(es) usam esta função.');
        return;
    }

    if (!await window.confirmar('Excluir a função "' + f.nome + '"?')) return;

    const lista = await apiGet('funcoes');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(f.id); });
    await apiSave('funcoes', novaLista);

    window.funcaoEditando = null;
    navigateTo('funcoes');
};