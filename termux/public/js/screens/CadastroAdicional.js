// ============================================================
// CADASTROADICIONAL.JS — Formulário de adicional
// ============================================================

console.log('✔ CadastroAdicional.js carregado');

window.renderCadastroAdicional = function() {
    console.log('🎬 renderCadastroAdicional chamado');

    const a = window.adicionalEditando || {};
    const editando = !!a.id;

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Adicional' : 'Novo Adicional') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // Favorito + Inativo
        '        <div style="display:flex;gap:20px;margin-bottom:15px;flex-wrap:wrap;">',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="a-fav" ' + (a.favorito ? 'checked' : '') + '>',
        '                <i class="fas fa-star" style="color:#fbc02d;"></i> Favorito',
        '            </label>',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="a-inativo" ' + (a.inativo ? 'checked' : '') + '>',
        '                Inativo',
        '            </label>',
        '        </div>',

        // Nome
        '        <div class="field">',
        '            <label>Nome do adicional *</label>',
        '            <input type="text" id="a-nome" maxlength="25" placeholder="Ex: Bacon extra" value="' + (a.nome || '') + '">',
        '        </div>',

        // Preço
        '        <div class="field">',
        '            <label>Preço (R$)</label>',
        '            <input type="number" step="0.01" min="0" id="a-preco" placeholder="0,00" value="' + (a.preco || '') + '">',
        '            <small style="color:#888;font-size:0.75rem;">Valor cobrado quando o cliente adiciona este item</small>',
        '        </div>',

        // Sugestões
        '        <div class="card" style="background:#FCE4EC;padding:15px;font-size:0.8rem;">',
        '            <strong style="color:var(--primary-color);">💡 Sugestões</strong>',
        '            <div style="margin-top:8px;line-height:1.6;color:#555;">',
        '                Bacon extra, Queijo extra, Cebola caramelizada, Ovo, Catupiry, Molho especial, Batata extra',
        '            </div>',
        '        </div>',

        '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarAdicional()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirAdicionalAtual()"><i class="fas fa-trash"></i> Excluir</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'adicionais\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// SALVAR
// ============================================================
window.salvarAdicional = async function() {
    const nome = (document.getElementById('a-nome').value || '').trim();
    const preco = parseFloat(document.getElementById('a-preco').value) || 0;
    const favorito = document.getElementById('a-fav').checked;
    const inativo = document.getElementById('a-inativo').checked;

    if (!nome) {
        alert('Informe o nome do adicional');
        return;
    }

    if (preco < 0) {
        alert('O preço não pode ser negativo');
        return;
    }

    const lista = await apiGet('adicionais');
    const a = window.adicionalEditando || {};

    // Duplicidade por nome
    const duplicado = lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() &&
               String(x.id) !== String(a.id);
    });
    if (duplicado) {
        alert('Já existe um adicional com esse nome');
        return;
    }

    const dados = {
        id: a.id || Date.now(),
        nome: nome,
        preco: preco,
        favorito: favorito,
        inativo: inativo
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

    await apiSave('adicionais', lista);
    window.adicionalEditando = null;
    navigateTo('adicionais');
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirAdicionalAtual = async function() {
    const a = window.adicionalEditando;
    if (!a || !a.id) return;

    // Verifica se há produtos usando
    const produtos = await apiGet('produtos');
    const emUso = produtos.filter(function(p) {
        return Array.isArray(p.adicionais) && p.adicionais.some(function(x) {
            return String(x) === String(a.id);
        });
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' produto(s) usam este adicional.');
        return;
    }

    if (!await window.confirmar('Excluir o adicional "' + a.nome + '"?')) return;

    const lista = await apiGet('adicionais');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(a.id); });
    await apiSave('adicionais', novaLista);

    window.adicionalEditando = null;
    navigateTo('adicionais');
};