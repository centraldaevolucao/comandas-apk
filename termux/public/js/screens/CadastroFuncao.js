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

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'funcoes\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Função' : 'Nova Função') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        '        <div class="field">',
        '            <label>Nome da função *</label>',
        '            <input type="text" id="func-nome" maxlength="30" placeholder="Ex: Garçom, Caixa, Cozinheiro" value="' + (f.nome || '') + '">',
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

    const dados = {
        id: f.id || Date.now(),
        nome: nome
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