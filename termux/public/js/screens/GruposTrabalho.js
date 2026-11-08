// ============================================================
// GRUPOSTRABALHO.JS — CRUD de cores/grupos de trabalho do caixa
// ============================================================

console.log('✔ GruposTrabalho.js carregado');

// ============================================================
// RENDER
// ============================================================
window.renderGruposTrabalho = function() {
    setTimeout(carregarGruposTrabalho, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'configuracoes\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Grupos de Trabalho</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',

        '<div style="padding:12px 16px;background:#e8f5e9;border-bottom:1px solid #c8e6c9;">',
        '    <div style="font-size:0.85rem;color:#2e7d32;line-height:1.5;">',
        '        <i class="fas fa-info-circle"></i>',
        '        Cada grupo de trabalho tem uma cor única que aparece no <b>Caixa</b> e nas <b>Comandas</b>. Use para separar turnos (Manhã, Tarde, Noite).',
        '    </div>',
        '</div>',

        '<div class="content-area" id="grupostrab-lista" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoGrupoTrabalho()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarGruposTrabalho() {
    const lista = document.getElementById('grupostrab-lista');
    if (!lista) return;

    try {
        // Carrega das configurações
        const configArr = window.normalizarArray(await apiGet('configuracoes'));
        const config = configArr[0] || {};

        // Se não tiver, usa o padrão
        if (!Array.isArray(config.coresCaixa) || config.coresCaixa.length === 0) {
            config.coresCaixa = [
                { id: 'amarelo',  hex: '#fbc02d', label: 'Amarelo' },
                { id: 'laranja',  hex: '#ff9800', label: 'Laranja' },
                { id: 'azul',     hex: '#1976d2', label: 'Azul' },
                { id: 'vermelho', hex: '#c62828', label: 'Vermelho' }
            ];
        }

        window.CORES_CAIXA = config.coresCaixa;
        lista.innerHTML = renderListaGruposTrabalho();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.carregarGruposTrabalho = carregarGruposTrabalho;

// ============================================================
// LISTA
// ============================================================
function renderListaGruposTrabalho() {
    const cores = window.CORES_CAIXA || [];

    if (cores.length === 0) {
        return '<p class="empty-state">Nenhum grupo cadastrado.<br>Adicione o primeiro clicando em +</p>';
    }

    return cores.map((cor, idx) => {
        return '<div class="card" style="margin-bottom:12px;padding:0;overflow:hidden;border-left:5px solid ' + cor.hex + ';">' +
            '<div style="display:flex;align-items:center;padding:14px;">' +
            '    <div style="width:50px;height:50px;border-radius:50%;background:' + cor.hex + ';margin-right:14px;flex-shrink:0;box-shadow:0 2px 8px ' + cor.hex + '60;"></div>' +
            '    <div style="flex:1;min-width:0;">' +
            '        <div style="font-weight:700;font-size:1.05rem;color:#333;">' + cor.label + '</div>' +
            '        <div style="font-size:0.75rem;color:#888;">ID: ' + cor.id + ' · ' + cor.hex + '</div>' +
            '    </div>' +
            '    <button class="btn-limpar" onclick="editarGrupoTrabalho(' + idx + ')" title="Editar" style="margin-right:6px;">' +
            '        <i class="fas fa-pen" style="color:#1976d2;font-size:1rem;"></i>' +
            '    </button>' +
            '    <button class="btn-limpar" onclick="excluirGrupoTrabalho(' + idx + ')" title="Excluir">' +
            '        <i class="fas fa-trash" style="color:#c62828;font-size:1rem;"></i>' +
            '    </button>' +
            '</div>' +
            '</div>';
    }).join('');
}

// ============================================================
// MODAL — NOVO / EDITAR
// ============================================================
window.novoGrupoTrabalho = function() {
    abrirModalGrupoTrabalho(-1);
};

window.editarGrupoTrabalho = function(idx) {
    abrirModalGrupoTrabalho(idx);
};

function abrirModalGrupoTrabalho(idx) {
    const cores = window.CORES_CAIXA || [];
    const editando = idx >= 0;
    const cor = editando ? cores[idx] : { id: '', hex: '#C2185B', label: '' };

    const anterior = document.getElementById('modal-grupo-trabalho');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-grupo-trabalho';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = e => { if (e.target === modal) fecharModalGrupoTrabalho(); };

    modal.innerHTML =
        '<div class="modal-content" style="max-width:420px;">' +
        '    <div class="modal-header" style="background:#C2185B;color:#fff;">' +
        '        <strong>' + (editando ? 'Editar Grupo' : 'Novo Grupo de Trabalho') + '</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalGrupoTrabalho()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +
        '        <div class="field">' +
        '            <label>Nome do grupo *</label>' +
        '            <input type="text" id="gt-nome" maxlength="20" placeholder="Ex: Manhã, Tarde, Noite" value="' + (cor.label || '') + '">' +
        '        </div>' +
        '        <div class="field">' +
        '            <label>Cor</label>' +
        '            <div style="display:flex;align-items:center;gap:12px;">' +
        '                <input type="color" id="gt-cor" value="' + cor.hex + '" style="width:70px;height:50px;border:2px solid #ddd;border-radius:8px;cursor:pointer;">' +
        '                <input type="text" id="gt-cor-hex" value="' + cor.hex + '" maxlength="7" style="flex:1;padding:10px;border:1.5px solid #ccc;border-radius:8px;font-family:monospace;" oninput="document.getElementById(\'gt-cor\').value=this.value">' +
        '            </div>' +
        '        </div>' +
        '        <div style="padding:14px;background:#f5f5f5;border-radius:8px;text-align:center;">' +
        '            <div style="font-size:0.75rem;color:#888;margin-bottom:8px;">PRÉVIA</div>' +
        '            <div id="gt-preview" style="display:inline-flex;align-items:center;gap:10px;background:#fff;padding:10px 16px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.08);">' +
        '                <div id="gt-preview-bola" style="width:32px;height:32px;border-radius:50%;background:' + cor.hex + ';"></div>' +
        '                <div id="gt-preview-nome" style="font-weight:600;">' + (cor.label || 'Nome') + '</div>' +
        '            </div>' +
        '        </div>' +
        '        <button class="btn-primary" style="background:#C2185B;margin-top:15px;" onclick="salvarGrupoTrabalho(' + idx + ')">' +
        '            <i class="fas fa-check"></i> ' + (editando ? 'Salvar' : 'Adicionar') +
        '        </button>' +
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalGrupoTrabalho()">Cancelar</button>' +
        '    </div>' +
        '</div>';

    document.body.appendChild(modal);

    // Atualiza preview ao vivo
    const inputNome = document.getElementById('gt-nome');
    const inputCor = document.getElementById('gt-cor');
    const previewBola = document.getElementById('gt-preview-bola');
    const previewNome = document.getElementById('gt-preview-nome');

    inputNome.oninput = () => previewNome.textContent = inputNome.value || 'Nome';
    inputCor.oninput = () => {
        previewBola.style.background = inputCor.value;
        document.getElementById('gt-cor-hex').value = inputCor.value;
    };

    setTimeout(() => inputNome.focus(), 150);
}

window.fecharModalGrupoTrabalho = function() {
    const m = document.getElementById('modal-grupo-trabalho');
    if (m) m.remove();
};

// ============================================================
// SALVAR
// ============================================================
window.salvarGrupoTrabalho = async function(idx) {
    const nome = (document.getElementById('gt-nome').value || '').trim();
    const hex = (document.getElementById('gt-cor').value || '').trim();

    if (!nome) {
        alert('Informe o nome do grupo');
        return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        alert('Cor inválida');
        return;
    }

    const cores = window.CORES_CAIXA || [];

    // Verifica duplicidade de nome (ignorando o próprio em edição)
    const duplicado = cores.some((c, i) => i !== idx && c.label.toLowerCase() === nome.toLowerCase());
    if (duplicado) {
        alert('Já existe um grupo com esse nome');
        return;
    }

    if (idx >= 0) {
        // Editar
        cores[idx].label = nome;
        cores[idx].hex = hex;
    } else {
        // Adicionar
        const novoId = 'grupo_' + Date.now();
        cores.push({ id: novoId, hex, label: nome });
    }

    await gravarGruposTrabalho(cores);
    fecharModalGrupoTrabalho();
    carregarGruposTrabalho();

    if (typeof window.mostrarToast === 'function') {
        window.mostrarToast('✅ Grupo salvo');
    }
};

// ============================================================
// EXCLUIR
// ============================================================
window.excluirGrupoTrabalho = async function(idx) {
    const cores = window.CORES_CAIXA || [];
    if (!cores[idx]) return;

    if (cores.length <= 1) {
        alert('É necessário manter pelo menos um grupo');
        return;
    }

    if (!await window.confirmar('Excluir o grupo "' + cores[idx].label + '"?')) return;

    cores.splice(idx, 1);
    await gravarGruposTrabalho(cores);
    carregarGruposTrabalho();
};

// ============================================================
// PERSISTÊNCIA
// ============================================================
async function gravarGruposTrabalho(cores) {
    const configArr = window.normalizarArray(await apiGet('configuracoes'));
    const config = configArr[0] || { id: 1 };

    config.coresCaixa = cores;
    config.ultimaAtualizacao = new Date().toLocaleString('pt-BR');

    await apiSave('configuracoes', [config]);
    window.CORES_CAIXA = cores;
}