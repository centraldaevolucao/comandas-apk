// ============================================================
// CADASTROGRUPO.JS — Formulário de grupo (Corrigido)
// ============================================================

console.log('✔ CadastroGrupo.js carregado');

window.renderCadastroGrupo = function() {
    const g = window.grupoEditando || {};
    const editando = !!g.id;

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'grupos\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Grupo' : 'Novo Grupo') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // Favorito + Inativo
        '        <div style="display:flex;gap:20px;margin-bottom:15px;flex-wrap:wrap;">',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="g-fav" ' + (g.favorito ? 'checked' : '') + '>',
        '                <i class="fas fa-star" style="color:#fbc02d;"></i> Favorito',
        '            </label>',
        '            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">',
        '                <input type="checkbox" id="g-inativo" ' + (g.inativo ? 'checked' : '') + '>',
        '                Inativo',
        '            </label>',
        '        </div>',

        // Nome
        '        <div class="field">',
        '            <label>Nome do grupo *</label>',
        '            <input type="text" id="g-nome" maxlength="25" placeholder="Ex: Bebidas" value="' + (g.nome || '') + '">',
        '        </div>',

        // Descrição
        '        <div class="field">',
        '            <label>Descrição</label>',
        '            <input type="text" id="g-desc" maxlength="50" placeholder="Ex: Refrigerantes, sucos e água" value="' + (g.descricao || '') + '">',
        '            <small style="color:#888;font-size:0.75rem;">Aparece no cardápio do cliente</small>',
        '        </div>',

        // Sugestões
        '        <div class="card" style="background:#FCE4EC;padding:15px;font-size:0.8rem;">',
        '            <strong style="color:var(--primary-color);">💡 Sugestões</strong>',
        '            <div style="margin-top:8px;line-height:1.6;color:#555;">',
        '                Bebidas, Pratos Principais, Entradas, Sobremesas, Petiscos, Saladas, Massas, Carnes, Bebidas Alcoólicas',
        '            </div>',
        '        </div>',

        '        <button class="btn-primary" style="margin-top:15px;" onclick="salvarGrupo()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirGrupoAtual()"><i class="fas fa-trash"></i> Excluir</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'grupos\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// SALVAR (CORRIGIDO)
// ============================================================
window.salvarGrupo = async function() {
    const nome = (document.getElementById('g-nome').value || '').trim();
    const descricao = (document.getElementById('g-desc').value || '').trim();
    const favorito = document.getElementById('g-fav').checked;
    const inativo = document.getElementById('g-inativo').checked;

    if (!nome) {
        alert('Informe o nome do grupo');
        return;
    }

    try {
        // 🔥 BUSCA OS DADOS FRESCOS DO SERVIDOR (evita cache)
        const lista = await apiGet('grupos');
        const gruposReais = Array.isArray(lista) ? lista : [];
        const g = window.grupoEditando || {};
        
        // 🔥 PROTEÇÃO: O ID do grupo atual (se estiver editando)
        // Se for novo, o ID será 0 para não bater com nenhum existente
        const idAtual = g.id ? String(g.id) : '0';

        // Verifica duplicidade (ignorando o próprio grupo)
        const duplicado = gruposReais.some(x => 
            String(x.nome).toLowerCase() === nome.toLowerCase() &&
            String(x.id) !== idAtual
        );

        if (duplicado) {
            alert('Já existe um grupo com esse nome');
            return;
        }

        // Monta o objeto
        const dados = {
            id: g.id || (Date.now() + Math.floor(Math.random() * 1000)), // ID único
            nome,
            descricao,
            favorito,
            inativo
        };

        // Se estiver editando, substitui na lista. Se não, adiciona.
        const idx = gruposReais.findIndex(x => String(x.id) === String(dados.id));
        if (idx >= 0) {
            gruposReais[idx] = dados;
        } else {
            gruposReais.push(dados);
        }

        // Salva no servidor
        await apiSave('grupos', gruposReais);
        
        // Limpa o cache do app
        window.grupoEditando = null;
        window.gruposCache = gruposReais;

        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Grupo salvo com sucesso');
        }

        // Volta para a lista
        navigateTo('grupos');
        
    } catch (e) {
        console.error('Erro ao salvar grupo:', e);
        alert('Erro ao salvar: ' + e.message);
    }
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirGrupoAtual = async function() {
    const g = window.grupoEditando;
    if (!g || !g.id) return;

    // Busca produtos frescos do servidor
    const produtos = await apiGet('produtos');
    const emUso = produtos.filter(p => String(p.grupo) === String(g.id)).length;

    if (emUso > 0) {
        alert('Não é possível excluir: ' + emUso + ' produto(s) usam este grupo.');
        return;
    }

    if (!await window.confirmar('Excluir o grupo "' + g.nome + '"?')) return;

    try {
        // Busca a lista fresca
        const lista = await apiGet('grupos');
        const gruposReais = Array.isArray(lista) ? lista : [];
        
        // Remove
        const novaLista = gruposReais.filter(x => String(x.id) !== String(g.id));
        
        await apiSave('grupos', novaLista);
        
        window.grupoEditando = null;
        window.gruposCache = novaLista;
        
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('🗑️ Grupo excluído');
        }
        
        navigateTo('grupos');
    } catch (e) {
        alert('Erro ao excluir: ' + e.message);
    }
};