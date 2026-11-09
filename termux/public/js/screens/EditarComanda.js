// ============================================================
// EDITARCOMANDA.JS — Editar dados da comanda
// ============================================================

console.log('✔ EditarComanda.js carregado');

window.renderEditarComanda = function() {
    console.log('🎬 renderEditarComanda chamado');

    setTimeout(preencherFormularioEdicao, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Editar Comanda</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        '        <div class="field">',
        '            <label>Número da comanda</label>',
        '            <input type="text" id="ec-numero" maxlength="10">',
        '        </div>',

        '        <div class="field">',
        '            <label>Tipo de atendimento</label>',
        '            <select id="ec-status" onchange="ajustarTipoComandaEdicao()">',
        '                <option value="balcao">Balcão</option>',
        '                <option value="delivery">Delivery</option>',
        '                <option value="viagem">Para Viagem</option>',
        '                <option value="aberta">Mesa (Aberta)</option>',
        '                <option value="fechada">Fechada</option>',
        '                <option value="cancelada">Cancelada</option>',
        '            </select>',
        '        </div>',

        '        <div class="field" id="ec-campo-mesa">',
        '            <label id="ec-mesa-label">Mesa</label>',
        '            <select id="ec-mesa"><option value="">Carregando...</option></select>',
        '            <small id="ec-mesa-info" style="color:#888;font-size:0.75rem;"></small>',
        '        </div>',

        '        <div class="field">',
        '            <label>Nome do cliente</label>',
        '            <input type="text" id="ec-cliente" maxlength="30">',
        '        </div>',

        '        <div class="field">',
        '            <label>Colaborador responsável</label>',
        '            <select id="ec-colaborador"><option value="">-- Selecione --</option></select>',
        '        </div>',

        '        <button class="btn-primary" onclick="salvarEdicaoComanda()">Salvar Alterações</button>',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'detalhe-comanda\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// AJUSTA CAMPOS CONFORME O TIPO
// ============================================================
window.ajustarTipoComandaEdicao = function() {
    const tipo = (document.getElementById('ec-status') || {}).value || 'balcao';
    const label = document.getElementById('ec-mesa-label');
    const sel = document.getElementById('ec-mesa');

    if (tipo === 'aberta') {
        if (label) label.innerHTML = 'Mesa *';
    } else {
        if (label) label.innerHTML = 'Mesa <span style="color:#888;font-weight:400;">(opcional)</span>';
        // NÃO força para o tipo — deixa o usuário escolher ou vazio
        if (sel) sel.value = '';
    }
};

// ============================================================
// PREENCHE
// ============================================================
async function preencherFormularioEdicao() {
    if (!window.comandaAtual) {
        navigateTo('comandas');
        return;
    }

    const c = window.comandaAtual;

    document.getElementById('ec-numero').value = c.numero || '';
    document.getElementById('ec-cliente').value = c.cliente || '';

    // Status
    const statusSelect = document.getElementById('ec-status');
    const tipo = c.tipo || (c.status === 'aberta' ? 'aberta' : c.status);
    statusSelect.value = tipo;

    // Mesas — passa mesa atual para pré-selecionar
    if (typeof window.atualizarSelectMesasComanda === 'function') {
        await window.atualizarSelectMesasComanda('ec-mesa', 'ec-mesa-info', c.mesa);
    }

    // Colaboradores
    const sel = document.getElementById('ec-colaborador');
    const cols = await apiGet('colaboradores');
    cols.forEach(function(col) {
        const opt = document.createElement('option');
        opt.value = col.id;
        opt.textContent = col.nome + (col.funcao ? ' - ' + col.funcao : '');
        if (String(col.id) === String(c.colaborador)) opt.selected = true;
        sel.appendChild(opt);
    });

    // Ajusta visual (mas mantém a mesa atual)
    const label = document.getElementById('ec-mesa-label');
    if (tipo === 'aberta') {
        if (label) label.innerHTML = 'Mesa *';
    } else {
        if (label) label.innerHTML = 'Mesa <span style="color:#888;font-weight:400;">(opcional)</span>';
    }
}

// ============================================================
// SALVAR EDIÇÃO
// ============================================================
window.salvarEdicaoComanda = async function() {
    if (!window.comandaAtual) return;

    const numero = (document.getElementById('ec-numero').value || '').trim();
    const tipo = document.getElementById('ec-status').value;
    const mesa = document.getElementById('ec-mesa').value || '';
    const cliente = (document.getElementById('ec-cliente').value || '').trim();
    const colaborador = document.getElementById('ec-colaborador').value || '';

    if (!numero) {
        alert('Informe o número da comanda');
        return;
    }

    const tipoEhMesa = (tipo === 'aberta');
    if (tipoEhMesa && !mesa) {
        alert('Selecione a mesa para comandas do tipo Mesa');
        return;
    }

    const lista = await apiGet('comandas');
    const estaAtiva = function(s) {
        return s === 'aberta' || s === 'delivery' || s === 'viagem' || s === 'balcao';
    };

    // Duplicidade de número (ignorando a atual)
    if (estaAtiva(tipo)) {
        if (lista.some(function(c) {
            return String(c.numero) === numero &&
                   estaAtiva(c.status) &&
                   String(c.id) !== String(window.comandaAtual.id);
        })) {
            alert('Já existe comanda ativa com esse número');
            return;
        }

        // Conflito de mesa (apenas se mesa foi escolhida)
        if (mesa) {
            if (lista.some(function(c) {
                return String(c.mesa).trim() === String(mesa).trim() &&
                       estaAtiva(c.status) &&
                       String(c.id) !== String(window.comandaAtual.id);
            })) {
                alert('Essa mesa já está ocupada');
                return;
            }
        }
    }

    // Aplica
    window.comandaAtual.numero = numero;
    window.comandaAtual.mesa = mesa || tipo;  // se vazio, usa o tipo como "mesa virtual"
    window.comandaAtual.tipo = tipo;
    window.comandaAtual.cliente = cliente;
    window.comandaAtual.colaborador = colaborador;
    window.comandaAtual.status = tipo;

    const idx = lista.findIndex(function(c) { return String(c.id) === String(window.comandaAtual.id); });
    if (idx >= 0) lista[idx] = window.comandaAtual;
    await apiSave('comandas', lista);

    navigateTo('detalhe-comanda');
};