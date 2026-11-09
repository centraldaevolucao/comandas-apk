// ============================================================
// CADASTROCLIENTE.JS — Cadastro de cliente + endereços
// ============================================================

console.log('✔ CadastroCliente.js carregado');

window.enderecoEditandoIdx = null;

// ============================================================
// RENDER DA TELA DE CADASTRO
// ============================================================
window.renderCadastroCliente = function() {
    console.log('🎬 renderCadastroCliente chamado');

    var c = window.clienteEditando || {};
    var editando = !!c.id;
    var enderecos = Array.isArray(c.enderecos) ? c.enderecos : [];

    var html = '';
    html += '<div class="app-bar">';
    html += '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>';
    html += '    <h1>' + (editando ? 'Editar Cliente' : 'Novo Cliente') + '</h1>';
    html += '    <button class="icon-btn" onclick="salvarCliente()" title="Salvar"><i class="fas fa-save"></i></button>';
    html += '</div>';

    html += '<div class="content-area">';
    html += '    <div style="padding:15px 16px;">';

    // Nome
    html += '        <div class="field">';
    html += '            <label>Nome do cliente *</label>';
    html += '            <input type="text" id="c-nome" maxlength="40" placeholder="Ex: João Silva" value="' + (c.nome || '') + '">';
    html += '        </div>';

    // Telefone
    html += '        <div class="field">';
    html += '            <label>Telefone</label>';
    html += '            <input type="tel" id="c-telefone" maxlength="20" placeholder="(00) 00000-0000" value="' + (c.telefone || '') + '">';
    html += '        </div>';

    // Info
    html += '        <div class="field">';
    html += '            <label>Informações complementares</label>';
    html += '            <textarea id="c-info" maxlength="200" placeholder="Observações..." style="min-height:70px;">' + (c.info || '') + '</textarea>';
    html += '        </div>';

    // Título de endereços
    html += '        <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 10px;">';
    html += '            <strong style="font-size:0.95rem;">';
    html += '                <i class="fas fa-map-marker-alt" style="color:var(--primary-color);"></i>';
    html += '                Endereços';
    html += '            </strong>';
    html += '            <button type="button" class="btn-outline btn-add-redondo" aria-label="Adicionar endereço" title="Adicionar endereço" onclick="abrirModalEndereco()">';
    html += '                <i class="fas fa-plus"></i>';
    html += '            </button>';
    html += '        </div>';

    // Lista de endereços
    html += '        <div id="c-enderecos-lista">';
    html += renderEnderecosLista(enderecos);
    html += '        </div>';

    // Botões de ação
    html += '        <button class="btn-primary" style="margin-top:20px;" onclick="salvarCliente()">';
    html += '            <i class="fas fa-check"></i> ' + (editando ? 'Salvar Alterações' : 'Cadastrar');
    html += '        </button>';

    if (editando) {
        html += '        <button class="btn-danger" style="width:100%;margin-top:10px;" onclick="excluirClienteAtual()">';
        html += '            <i class="fas fa-trash"></i> Excluir';
        html += '        </button>';
    }

    html += '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="navigateTo(\'clientes\')">Cancelar</button>';
    html += '    </div>';
    html += '</div>';

    return html;
};

// ============================================================
// LISTA DE ENDEREÇOS (dentro da tela de cadastro)
// ============================================================
function renderEnderecosLista(enderecos) {
    if (!Array.isArray(enderecos) || enderecos.length === 0) {
        return '<div style="padding:25px;text-align:center;color:#888;border:2px dashed #ddd;border-radius:10px;">' +
               '    <i class="fas fa-map-marked-alt" style="font-size:2rem;color:#ccc;"></i>' +
               '    <p style="margin-top:10px;font-size:0.85rem;">Nenhum endereço cadastrado</p>' +
               '</div>';
    }

    var html = '';
    for (var i = 0; i < enderecos.length; i++) {
        var e = enderecos[i];
        var linha2 = [e.bairro, e.cidade].filter(Boolean).join(' • ');
        var compl = e.complemento ? ' (' + e.complemento + ')' : '';

        html += '<div style="border:1.5px solid #eee;border-radius:10px;padding:12px;margin-bottom:10px;background:#fff;">';
        html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">';
        html += '        <div style="flex:1;min-width:0;">';
        html += '            <div style="font-weight:600;font-size:0.9rem;">';
        html += '                <i class="fas fa-map-marker-alt" style="color:var(--primary-color);font-size:0.75rem;margin-right:4px;"></i>';
        html += (e.endereco || 'Endereço') + ', ' + (e.numero || 's/n') + compl;
        html += '            </div>';
        if (linha2) {
            html += '            <div style="font-size:0.75rem;color:#888;margin-top:3px;">';
            html += linha2 + (e.cep ? ' • CEP ' + e.cep : '');
            html += '            </div>';
        }
        html += '        </div>';
        html += '        <div style="display:flex;gap:4px;flex-shrink:0;">';
        html += '            <button type="button" class="btn-limpar" onclick="editarEndereco(' + i + ')" title="Editar" style="padding:5px;">';
        html += '                <i class="fas fa-pen" style="color:var(--primary-color);font-size:0.85rem;"></i>';
        html += '            </button>';
        html += '            <button type="button" class="btn-limpar" onclick="removerEndereco(' + i + ')" title="Remover" style="padding:5px;">';
        html += '                <i class="fas fa-trash" style="color:#c62828;font-size:0.85rem;"></i>';
        html += '            </button>';
        html += '        </div>';
        html += '    </div>';
        html += '</div>';
    }
    return html;
}

// ============================================================
// MODAL DE ENDEREÇO (montado com concatenação para não cortar)
// ============================================================
window.abrirModalEndereco = function(idx) {
    console.log('🎬 abrirModalEndereco chamado | idx:', idx);

    var end = { cep: '', endereco: '', numero: '', bairro: '', cidade: '', complemento: '' };

    if (idx !== undefined && idx !== null) {
        var c = window.clienteEditando || {};
        var enderecos = Array.isArray(c.enderecos) ? c.enderecos : [];
        if (enderecos[idx]) {
            end = Object.assign({}, enderecos[idx]);
            window.enderecoEditandoIdx = idx;
        }
    } else {
        window.enderecoEditandoIdx = null;
    }

    // Remove modal antigo se existir
    var anterior = document.getElementById('modal-endereco');
    if (anterior) anterior.remove();

    // Monta o HTML do modal com concatenação simples
    var html = '';
    html += '<div class="modal-content">';

    // Cabeçalho
    html += '    <div class="modal-header">';
    html += '        <strong>' + (window.enderecoEditandoIdx !== null ? 'Editar Endereço' : 'Novo Endereço') + '</strong>';
    html += '        <button type="button" class="btn-limpar" onclick="fecharModalEndereco()">';
    html += '            <i class="fas fa-xmark"></i>';
    html += '        </button>';
    html += '    </div>';

    // Corpo
    html += '    <div class="modal-body">';

    // Campo: CEP
    html += '        <div class="field">';
    html += '            <label>CEP</label>';
    html += '            <div style="display:flex;gap:8px;">';
    html += '                <input type="text" id="end-cep" maxlength="10" placeholder="00000-000" value="' + (end.cep || '') + '" style="flex:1;">';
    html += '                <button type="button" class="btn-outline" style="padding:10px 14px;" onclick="buscarCEPBotao()">';
    html += '                    <i class="fas fa-search"></i>';
    html += '                </button>';
    html += '            </div>';
    html += '            <small id="end-cep-info" style="color:#888;font-size:0.75rem;">Digite o CEP para buscar automaticamente</small>';
    html += '        </div>';

    // Campo: Endereço (Rua)
    html += '        <div class="field">';
    html += '            <label>Endereço (Rua / Avenida) *</label>';
    html += '            <input type="text" id="end-rua" maxlength="60" placeholder="Rua, Avenida..." value="' + (end.endereco || '') + '">';
    html += '        </div>';

    // Campos: Número + Bairro
    html += '        <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;">';
    html += '            <div class="field">';
    html += '                <label>Número</label>';
    html += '                <input type="text" id="end-numero" maxlength="10" placeholder="123" value="' + (end.numero || '') + '">';
    html += '            </div>';
    html += '            <div class="field">';
    html += '                <label>Bairro</label>';
    html += '                <input type="text" id="end-bairro" maxlength="40" placeholder="Centro" value="' + (end.bairro || '') + '">';
    html += '            </div>';
    html += '        </div>';

    // Campo: Cidade
    html += '        <div class="field">';
    html += '            <label>Cidade</label>';
    html += '            <input type="text" id="end-cidade" maxlength="40" placeholder="Campos" value="' + (end.cidade || '') + '">';
    html += '        </div>';

    // Campo: Complemento
    html += '        <div class="field">';
    html += '            <label>Complemento</label>';
    html += '            <input type="text" id="end-compl" maxlength="40" placeholder="Apto 201, Bloco B..." value="' + (end.complemento || '') + '">';
    html += '        </div>';

    // Botão Adicionar
    html += '        <button type="button" class="btn-primary" onclick="confirmarEndereco()">';
    html += '            <i class="fas fa-check"></i> ';
    html += (window.enderecoEditandoIdx !== null ? 'Salvar Alterações' : 'Adicionar');
    html += '        </button>';

    // Botão Cancelar
    html += '        <button type="button" class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalEndereco()">Cancelar</button>';

    html += '    </div>'; // fim modal-body
    html += '</div>';     // fim modal-content

    // Cria o overlay
    var modal = document.createElement('div');
    modal.id = 'modal-endereco';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.innerHTML = html;

    document.body.appendChild(modal);

    console.log('✅ Modal criado. Inputs presentes?',
                !!document.getElementById('end-cep'),
                !!document.getElementById('end-rua'),
                !!document.getElementById('end-numero'));

    setTimeout(function() {
        var el = document.getElementById('end-cep');
        if (el) el.focus();
    }, 100);
};

// ============================================================
// FECHAR MODAL
// ============================================================
window.fecharModalEndereco = function() {
    var m = document.getElementById('modal-endereco');
    if (m) m.remove();
    window.enderecoEditandoIdx = null;
};

// ============================================================
// BUSCAR CEP (ViaCEP)
// ============================================================
window.buscarCEPBotao = async function() {
    var cepEl = document.getElementById('end-cep');
    if (!cepEl) {
        alert('Modal não está aberto');
        return;
    }

    var cep = cepEl.value || '';
    var cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
        alert('Digite um CEP válido (8 dígitos)');
        return;
    }

    var info = document.getElementById('end-cep-info');
    if (info) {
        info.textContent = '🔄 Buscando...';
        info.style.color = '#C2185B';
    }

    try {
        var res = await fetch('https://viacep.com.br/ws/' + cepLimpo + '/json/');
        var data = await res.json();

        if (data.erro) {
            if (info) {
                info.textContent = '❌ CEP não encontrado';
                info.style.color = '#c62828';
            }
            return;
        }

        if (data.logradouro) {
            var ruaEl = document.getElementById('end-rua');
            if (ruaEl) ruaEl.value = data.logradouro;
        }
        if (data.bairro) {
            var bairroEl = document.getElementById('end-bairro');
            if (bairroEl) bairroEl.value = data.bairro;
        }
        if (data.localidade) {
            var cidadeEl = document.getElementById('end-cidade');
            if (cidadeEl) cidadeEl.value = data.localidade;
        }

        if (info) {
            info.textContent = '✅ Preenchido automaticamente';
            info.style.color = '#2e7d32';
        }

        var numEl = document.getElementById('end-numero');
        if (numEl) numEl.focus();

    } catch (e) {
        console.error('Erro ao buscar CEP:', e);
        if (info) {
            info.textContent = '❌ Erro ao buscar CEP';
            info.style.color = '#c62828';
        }
    }
};

// ============================================================
// CONFIRMAR ENDEREÇO
// ============================================================
window.confirmarEndereco = function() {
    console.log('🎬 confirmarEndereco chamado');

    var ruaEl = document.getElementById('end-rua');
    if (!ruaEl) {
        alert('Erro: campo de endereço não encontrado');
        return;
    }

    var rua = (ruaEl.value || '').trim();
    if (!rua) {
        alert('Informe o endereço (rua)');
        return;
    }

    var end = {
        cep: (document.getElementById('end-cep').value || '').trim(),
        endereco: rua,
        numero: (document.getElementById('end-numero').value || '').trim(),
        bairro: (document.getElementById('end-bairro').value || '').trim(),
        cidade: (document.getElementById('end-cidade').value || '').trim(),
        complemento: (document.getElementById('end-compl').value || '').trim()
    };

    if (!window.clienteEditando) window.clienteEditando = {};
    if (!Array.isArray(window.clienteEditando.enderecos)) {
        window.clienteEditando.enderecos = [];
    }

    var idx = window.enderecoEditandoIdx;

    if (idx !== null && idx !== undefined && window.clienteEditando.enderecos[idx]) {
        window.clienteEditando.enderecos[idx] = end;
        console.log('✏️ Endereço editado no índice', idx);
    } else {
        window.clienteEditando.enderecos.push(end);
        console.log('➕ Endereço adicionado');
    }

    var container = document.getElementById('c-enderecos-lista');
    if (container) {
        container.innerHTML = renderEnderecosLista(window.clienteEditando.enderecos);
    }

    fecharModalEndereco();
    console.log('✅ Total de endereços:', window.clienteEditando.enderecos.length);
};

// ============================================================
// EDITAR / REMOVER ENDEREÇO
// ============================================================
window.editarEndereco = function(idx) {
    abrirModalEndereco(idx);
};

window.removerEndereco = async function(idx) {
    if (!window.clienteEditando || !Array.isArray(window.clienteEditando.enderecos)) return;
    if (!window.clienteEditando.enderecos[idx]) return;
    if (!await window.confirmar('Remover este endereço?')) return;

    window.clienteEditando.enderecos.splice(idx, 1);
    var container = document.getElementById('c-enderecos-lista');
    if (container) {
        container.innerHTML = renderEnderecosLista(window.clienteEditando.enderecos);
    }
};

// ============================================================
// SALVAR CLIENTE
// ============================================================
window.salvarCliente = async function() {
    var nomeEl = document.getElementById('c-nome');
    if (!nomeEl) return;

    var nome = (nomeEl.value || '').trim();
    var telefone = (document.getElementById('c-telefone').value || '').trim();
    var info = (document.getElementById('c-info').value || '').trim();

    if (!nome) {
        alert('Informe o nome do cliente');
        return;
    }

    var lista = await apiGet('clientes');
    var c = window.clienteEditando || {};

    var duplicado = lista.some(function(x) {
        return String(x.nome).toLowerCase() === nome.toLowerCase() &&
               String(x.telefone || '') === telefone &&
               String(x.id) !== String(c.id);
    });
    if (duplicado) {
        alert('Já existe um cliente com esse nome e telefone');
        return;
    }

    var dados = {
        id: c.id || Date.now(),
        nome: nome,
        telefone: telefone,
        info: info,
        enderecos: Array.isArray(c.enderecos) ? c.enderecos : []
    };

    var atualizado = false;
    for (var i = 0; i < lista.length; i++) {
        if (String(lista[i].id) === String(dados.id)) {
            lista[i] = dados;
            atualizado = true;
            break;
        }
    }
    if (!atualizado) lista.push(dados);

    await apiSave('clientes', lista);
    window.clienteEditando = null;
    navigateTo('clientes');
};

// ============================================================
// EXCLUIR CLIENTE
// ============================================================
window.excluirClienteAtual = async function() {
    var c = window.clienteEditando;
    if (!c || !c.id) return;

    if (!await window.confirmar('Excluir o cliente "' + c.nome + '"?')) return;

    var lista = await apiGet('clientes');
    var novaLista = lista.filter(function(x) { return String(x.id) !== String(c.id); });
    await apiSave('clientes', novaLista);

    window.clienteEditando = null;
    navigateTo('clientes');
};