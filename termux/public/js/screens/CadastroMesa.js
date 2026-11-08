// ============================================================
// CADASTROMESA.JS — Cadastro/edição de mesa
// ============================================================

console.log('✔ CadastroMesa.js carregado');

// ============================================================
// RENDER
// ============================================================
window.renderCadastroMesa = function() {
    console.log('🎬 renderCadastroMesa chamado');

    const m = window.mesaEditando || {};
    const editando = !!m.id;
    const tipo = m.tipo || 'mesa';
    const ativa = m.ativa !== false;

    // Ajusta campos após injetar no DOM
    setTimeout(ajustarCampoMesa, 30);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'mesas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>' + (editando ? 'Editar Mesa' : 'Nova Mesa') + '</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',

        // Tipo
        '        <div class="field">',
        '            <label>Tipo de mesa</label>',
        '            <select id="m-tipo" onchange="ajustarCampoMesa()">',
        '                <option value="mesa" ' + (tipo === 'mesa' ? 'selected' : '') + '>Mesa numerada</option>',
        '                <option value="especial" ' + (tipo === 'especial' ? 'selected' : '') + '>Especial (Balcão, Delivery, etc)</option>',
        '            </select>',
        '        </div>',

        // Número (para tipo "mesa")
        '        <div class="field" id="m-campo-numero">',
        '            <label>Número da mesa *</label>',
        '            <input type="number" min="1" id="m-numero" placeholder="Ex: 21" value="' + (m.numero || '') + '">',
        '            <small style="color:#888;font-size:0.75rem;">Número único que identifica a mesa nas comandas</small>',
        '        </div>',

        // Código (para tipo "especial")
        '        <div class="field" id="m-campo-codigo" style="display:none;">',
        '            <label>Código *</label>',
        '            <input type="text" id="m-codigo" maxlength="20" placeholder="Ex: vip, varanda" value="' + (tipo !== 'mesa' ? (m.numero || '') : '') + '">',
        '            <small style="color:#888;font-size:0.75rem;">Código único (letras minúsculas, números, "-" e "_")</small>',
        '        </div>',

        // Nome
        '        <div class="field">',
        '            <label>Nome de exibição *</label>',
        '            <input type="text" id="m-nome" maxlength="30" placeholder="Ex: Mesa 21, Varanda, Salão VIP" value="' + (m.nome || '') + '">',
        '        </div>',

        // Ativa
        '        <div class="card" style="margin:0 0 15px;">',
        '            <div class="card-row" style="padding:8px 0;">',
        '                <div>',
        '                    <strong>Mesa ativa</strong>',
        '                    <small>Mesas inativas não aparecem no cadastro de comandas</small>',
        '                </div>',
        '                <label class="toggle">',
        '                    <input type="checkbox" id="m-ativa" ' + (ativa ? 'checked' : '') + '>',
        '                    <span class="slider"></span>',
        '                </label>',
        '            </div>',
        '        </div>',

        // Botões
        '        <button class="btn-primary" onclick="salvarMesa()">' +
                 (editando ? 'Salvar Alterações' : 'Cadastrar') +
        '        </button>',
        editando ? '<button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirMesaAtual()"><i class="fas fa-trash"></i> Excluir</button>' : '',
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'mesas\')">Cancelar</button>',
        '    </div>',
        '</div>'
    ].join('\n');
};

// ============================================================
// AJUSTA CAMPOS CONFORME O TIPO
// ============================================================
window.ajustarCampoMesa = function() {
    const tipo = (document.getElementById('m-tipo') || {}).value || 'mesa';
    const campoNumero = document.getElementById('m-campo-numero');
    const campoCodigo = document.getElementById('m-campo-codigo');

    if (!campoNumero || !campoCodigo) return;

    if (tipo === 'mesa') {
        campoNumero.style.display = 'block';
        campoCodigo.style.display = 'none';
    } else {
        campoNumero.style.display = 'none';
        campoCodigo.style.display = 'block';
    }
};

// ============================================================
// SALVAR
// ============================================================
window.salvarMesa = async function() {
    const tipo = (document.getElementById('m-tipo') || {}).value || 'mesa';
    const nome = (document.getElementById('m-nome').value || '').trim();
    const ativa = document.getElementById('m-ativa').checked;

    if (!nome) {
        alert('Informe o nome de exibição');
        return;
    }

    let numero = '';

    if (tipo === 'mesa') {
        numero = (document.getElementById('m-numero').value || '').trim();
        if (!numero) {
            alert('Informe o número da mesa');
            return;
        }
        if (!/^\d+$/.test(numero)) {
            alert('O número deve conter apenas dígitos');
            return;
        }
    } else {
        numero = (document.getElementById('m-codigo').value || '').trim().toLowerCase();
        if (!numero) {
            alert('Informe o código');
            return;
        }
        if (!/^[a-z0-9_-]+$/.test(numero)) {
            alert('O código só pode conter letras minúsculas, números, "-" e "_"');
            return;
        }
    }

    const lista = await apiGet('mesas');
    const m = window.mesaEditando || {};

    // Duplicidade de número/código
    const duplicado = lista.some(function(x) {
        return String(x.numero) === String(numero) &&
               String(x.id) !== String(m.id);
    });
    if (duplicado) {
        alert('Já existe uma mesa com esse número/código');
        return;
    }

    const dados = {
        id: m.id || Date.now(),
        numero: numero,
        nome: nome,
        tipo: tipo,
        ativa: ativa
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

    await apiSave('mesas', lista);
    window.mesaEditando = null;
    navigateTo('mesas');
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirMesaAtual = async function() {
    const m = window.mesaEditando;
    if (!m || !m.id) return;

    // Verifica se está em uso
    const comandas = await apiGet('comandas');
    const emUso = comandas.some(function(c) {
        return String(c.mesa) === String(m.numero) &&
               (c.status === 'aberta' || c.status === 'delivery');
    });

    if (emUso) {
        alert('Não é possível excluir: a mesa está em uso por uma comanda aberta.');
        return;
    }

    if (!await window.confirmar('Excluir a mesa "' + m.nome + '"?')) return;

    const lista = await apiGet('mesas');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(m.id); });
    await apiSave('mesas', novaLista);

    window.mesaEditando = null;
    navigateTo('mesas');
};