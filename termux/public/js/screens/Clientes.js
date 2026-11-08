// ============================================================
// CLIENTES.JS — Lista com indicador de fiado em aberto
// ============================================================

console.log('✔ Clientes.js carregado');

window.clientesCache = [];
window.comandasCacheClientes = [];
window.clienteTermoBusca = '';
window.clienteFiltroFiado = 'todos'; // todos | com-fiado | sem-fiado

// ============================================================
// HELPERS
// ============================================================
function comandaTemFiado(c) {
    return c && c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0;
}

function clienteTemFiado(c, comandas) {
    if (!c || !Array.isArray(comandas)) return false;
    return comandas.some(function(cmd) {
        if (!comandaTemFiado(cmd)) return false;
        if (cmd.clienteId && c.id && String(cmd.clienteId) === String(c.id)) return true;
        if (cmd.cliente && c.nome && String(cmd.cliente).trim().toLowerCase() === String(c.nome).trim().toLowerCase()) return true;
        return false;
    });
}

function fiadoDoCliente(c, comandas) {
    let total = 0;
    let lista = [];
    comandas.forEach(function(cmd) {
        if (!comandaTemFiado(cmd)) return;
        const mesmoId = cmd.clienteId && c.id && String(cmd.clienteId) === String(c.id);
        const mesmoNome = cmd.cliente && c.nome && String(cmd.cliente).trim().toLowerCase() === String(c.nome).trim().toLowerCase();
        if (mesmoId || mesmoNome) {
            total += Number(cmd.valorPendente || 0);
            lista.push(cmd);
        }
    });
    return { total: total, comandas: lista };
}

// ============================================================
// RENDER
// ============================================================
window.renderClientes = function() {
    setTimeout(atualizarListaClientes, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'comandas\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Clientes</h1>',
        '    <button class="icon-btn" onclick="abrirMenu()"><i class="fas fa-bars"></i></button>',
        '</div>',

        '<div style="padding:10px 16px 0;"><button class="btn-outline" style="width:100%;border-color:#e65100;color:#e65100;" onclick="navigateTo(\'pendencias\')"><i class="fas fa-file-invoice-dollar"></i> Pendências (fiado) por cliente</button></div>',

        // Card de resumo de fiado
        '<div id="clientes-fiado-resumo" style="padding:12px 16px;background:linear-gradient(135deg, #e65100 0%, #bf360c 100%);color:#fff;display:none;">',
        '    <div style="display:flex;justify-content:space-between;align-items:center;">',
        '        <div>',
        '            <div style="font-size:0.75rem;opacity:0.9;">📝 Fiado em aberto</div>',
        '            <div id="clientes-fiado-total" style="font-size:1.6rem;font-weight:700;margin-top:4px;">R$ 0,00</div>',
        '            <div id="clientes-fiado-qtd" style="font-size:0.75rem;opacity:0.9;margin-top:2px;">0 cliente(s)</div>',
        '        </div>',
        '        <button onclick="navigateTo(\'pendencias\')" style="background:rgba(255,255,255,0.2);color:#fff;border:none;padding:10px 14px;border-radius:8px;font-weight:600;font-size:0.85rem;cursor:pointer;font-family:var(--font-family);">',
        '            <i class="fas fa-eye"></i> Ver todos',
        '        </button>',
        '    </div>',
        '</div>',

        // Busca
        '<div class="input-busca">',
        '    <input type="text" placeholder="Pesquisar por nome ou telefone" id="busca-cliente" oninput="filtrarClientes()">',
        '    <button class="btn-limpar" onclick="limparBuscaClientes()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        // Filtro fiado
        '<div style="padding:0 16px 10px;display:flex;gap:6px;">',
        '    <button id="filtro-todos" class="chip-grupo ativo" onclick="mudarFiltroFiado(\'todos\')" style="flex:1;">Todos</button>',
        '    <button id="filtro-com-fiado" class="chip-grupo" onclick="mudarFiltroFiado(\'com-fiado\')" style="flex:1;">📝 Com fiado</button>',
        '    <button id="filtro-sem-fiado" class="chip-grupo" onclick="mudarFiltroFiado(\'sem-fiado\')" style="flex:1;">✅ Sem fiado</button>',
        '</div>',

        // Contador
        '<div style="padding:0 16px 5px;color:#666;font-size:0.8rem;" id="clientes-contador"></div>',

        // Lista
        '<div class="content-area" id="clientes-lista">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="novoCliente()">+</button>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function atualizarListaClientes() {
    const lista = document.getElementById('clientes-lista');
    if (!lista) return;

    try {
        const clientes = await apiGet('clientes');
        window.clientesCache = Array.isArray(clientes) ? clientes : [];

        // Carrega comandas para detectar fiado
        try {
            const comandas = await apiGet('comandas');
            window.comandasCacheClientes = Array.isArray(comandas) ? comandas : [];
        } catch (e) {
            window.comandasCacheClientes = [];
        }

        atualizarResumoFiadoClientes();
        lista.innerHTML = renderListaClientes();
    } catch (e) {
        console.error('❌ Erro:', e);
        lista.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
    }
}

window.atualizarListaClientes = atualizarListaClientes;

// ============================================================
// RESUMO DE FIADO
// ============================================================
function atualizarResumoFiadoClientes() {
    const el = document.getElementById('clientes-fiado-resumo');
    const elTotal = document.getElementById('clientes-fiado-total');
    const elQtd = document.getElementById('clientes-fiado-qtd');
    if (!el) return;

    let total = 0;
    let clientesComFiado = 0;

    window.clientesCache.forEach(function(c) {
        const info = fiadoDoCliente(c, window.comandasCacheClientes);
        if (info.total > 0) {
            total += info.total;
            clientesComFiado++;
        }
    });

    if (total > 0) {
        el.style.display = 'block';
        if (elTotal) elTotal.textContent = formatMoney(total);
        if (elQtd) elQtd.textContent = clientesComFiado + ' cliente(s) devendo';
    } else {
        el.style.display = 'none';
    }
}

// ============================================================
// FILTRO FIADO
// ============================================================
window.mudarFiltroFiado = function(filtro) {
    window.clienteFiltroFiado = filtro;
    ['todos', 'com-fiado', 'sem-fiado'].forEach(function(id) {
        const el = document.getElementById('filtro-' + id);
        if (el) {
            if (id === filtro) el.classList.add('ativo');
            else el.classList.remove('ativo');
        }
    });
    const lista = document.getElementById('clientes-lista');
    if (lista) lista.innerHTML = renderListaClientes();
};

// ============================================================
// LISTA
// ============================================================
function renderListaClientes() {
    let lista = window.clientesCache.slice();

    // Busca
    const busca = String(window.clienteTermoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(c) {
            return String(c.nome || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.telefone || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    // Filtro fiado
    if (window.clienteFiltroFiado === 'com-fiado') {
        lista = lista.filter(function(c) {
            return clienteTemFiado(c, window.comandasCacheClientes);
        });
    } else if (window.clienteFiltroFiado === 'sem-fiado') {
        lista = lista.filter(function(c) {
            return !clienteTemFiado(c, window.comandasCacheClientes);
        });
    }

    // Ordena A-Z
    lista.sort(function(a, b) {
        return String(a.nome || '').localeCompare(String(b.nome || ''));
    });

    // Contador
    const contador = document.getElementById('clientes-contador');
    if (contador) contador.textContent = lista.length + ' cliente(s)';

    if (lista.length === 0) {
        if (busca) return '<p class="empty-state">Nenhum cliente encontrado.</p>';
        return '<p class="empty-state">Nenhum cliente cadastrado</p>';
    }

    const html = [];
    for (let i = 0; i < lista.length; i++) {
        const c = lista[i];
        const qtdEnderecos = Array.isArray(c.enderecos) ? c.enderecos.length : 0;
        const telefone = c.telefone || 'Sem telefone';
        const infoEnd = qtdEnderecos > 0 ? ' • ' + qtdEnderecos + ' endereço(s)' : '';

        // Fiado
        const infoFiado = fiadoDoCliente(c, window.comandasCacheClientes);
        const temFiado = infoFiado.total > 0;

        const badgeFiado = temFiado
            ? '<span style="display:inline-block;background:#ff9800;color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;margin-left:6px;font-weight:700;">' +
              '📝 ' + formatMoney(infoFiado.total) +
              '</span>'
            : '';

        html.push(
            '<div class="lista-item" onclick="editarCliente(' + c.id + ')">' +
            '<div class="lista-item-info">' +
            '    <div class="lista-item-titulo">' +
            '        <i class="fas fa-user" style="color:var(--primary-color);font-size:0.8rem;margin-right:6px;"></i>' +
                     c.nome + badgeFiado +
            '    </div>' +
            '    <div class="lista-item-sub">' +
            '        <i class="fas fa-phone" style="font-size:0.65rem;"></i> ' + telefone + infoEnd +
            (temFiado ? ' • <b style="color:#e65100;">' + infoFiado.comandas.length + ' fiado(s)</b>' : '') +
            '    </div>' +
            '</div>' +

            // Botão receber fiado (se tiver)
            (temFiado
                ? '<button class="btn-limpar" onclick="event.stopPropagation(); abrirFiadosCliente(' + c.id + ')" title="Ver fiados" style="margin-right:4px;">' +
                  '    <i class="fas fa-money-bill-wave" style="color:#ff9800;font-size:1rem;"></i>' +
                  '</button>'
                : '') +

            '<button class="btn-limpar" onclick="event.stopPropagation(); excluirCliente(' + c.id + ')" title="Excluir" style="margin-right:4px;">' +
            '    <i class="fas fa-trash" style="color:#c62828;font-size:0.9rem;"></i>' +
            '</button>' +
            '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
            '</div>'
        );
    }
    return html.join('');
}

// ============================================================
// AÇÕES DE FIADO
// ============================================================
window.abrirFiadosCliente = function(clienteId) {
    const c = window.clientesCache.find(function(x) { return String(x.id) === String(clienteId); });
    if (!c) return;

    const info = fiadoDoCliente(c, window.comandasCacheClientes);
    if (info.comandas.length === 0) {
        alert('Este cliente não tem fiado em aberto.');
        return;
    }

    const anterior = document.getElementById('modal-fiados-cliente');
    if (anterior) anterior.remove();

    let itensHTML = '';
    info.comandas.forEach(function(cmd) {
        itensHTML += '<div style="padding:10px;background:#fff;border-radius:8px;margin-bottom:8px;border-left:3px solid #ff9800;">' +
                     '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                     '    <div style="flex:1;">' +
                     '        <div style="font-weight:600;">Comanda ' + cmd.numero + '</div>' +
                     '        <div style="font-size:0.75rem;color:#666;">' + (cmd.dataFechamento || cmd.dataAbertura || '') + '</div>' +
                     (cmd.dataVencimento ? '        <div style="font-size:0.7rem;color:#c62828;">Venc: ' + cmd.dataVencimento + '</div>' : '') +
                     (cmd.observacaoFiado ? '        <div style="font-size:0.7rem;color:#888;"><i class="fas fa-comment"></i> ' + cmd.observacaoFiado + '</div>' : '') +
                     '    </div>' +
                     '    <div style="text-align:right;">' +
                     '        <div style="font-weight:700;color:#e65100;font-size:1rem;">' + formatMoney(cmd.valorPendente) + '</div>' +
                     '        <button class="btn-outline" style="padding:4px 10px;font-size:0.75rem;margin-top:4px;border-color:#4caf50;color:#2e7d32;" onclick="receberFiadoCliente(' + cmd.id + ')">' +
                     '            <i class="fas fa-money-bill-wave"></i> Receber' +
                     '        </button>' +
                     '    </div>' +
                     '</div>' +
                     '</div>';
    });

    const modal = document.createElement('div');
    modal.id = 'modal-fiados-cliente';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = function(e) { if (e.target === modal) fecharModalFiadosCliente(); };
    modal.innerHTML =
        '<div class="modal-content" style="max-width:440px;">' +
        '    <div class="modal-header" style="background:#ff9800;color:#fff;">' +
        '        <strong>📝 Fiados de ' + c.nome + '</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalFiadosCliente()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +
        '        <div style="padding:12px;background:#fff3e0;border-radius:8px;margin-bottom:15px;text-align:center;">' +
        '            <div style="font-size:0.75rem;color:#666;">Total em aberto</div>' +
        '            <div style="font-size:1.6rem;font-weight:700;color:#e65100;">' + formatMoney(info.total) + '</div>' +
        '            <div style="font-size:0.75rem;color:#666;margin-top:2px;">' + info.comandas.length + ' comanda(s)</div>' +
        '        </div>' +
        '        <div style="max-height:320px;overflow-y:auto;margin-bottom:15px;">' + itensHTML + '</div>' +
        '        <button class="btn-primary" style="background:#4caf50;width:100%;" onclick="receberTodosFiadosCliente(' + c.id + ')">' +
        '            <i class="fas fa-check-double"></i> Receber todos (' + formatMoney(info.total) + ')</button>' +
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalFiadosCliente()">Fechar</button>' +
        '    </div>' +
        '</div>';
    document.body.appendChild(modal);
};

window.fecharModalFiadosCliente = function() {
    const m = document.getElementById('modal-fiados-cliente');
    if (m) m.remove();
};

// Receber uma comanda fiado (abre modal de pagamento)
window.receberFiadoCliente = async function(comandaId) {
    const comandas = await apiGet('comandas');
    const cmd = comandas.find(function(c) { return String(c.id) === String(comandaId); });
    if (!cmd) return;
    if (!comandaTemFiado(cmd)) {
        alert('Esta comanda não tem fiado pendente.');
        return;
    }

    // Fecha o modal de fiados se estiver aberto
    const m = document.getElementById('modal-fiados-cliente');
    if (m) m.remove();

    // Reutiliza o modal de quitar fiado do DetalheComanda (se existir)
    window.comandaAtual = cmd;
    if (typeof window.quitarFiado === 'function') {
        window.quitarFiado();
        return;
    }

    // Fallback: modal simples
    abrirModalPagamentoFiadoSimples(cmd);
};

// Receber todos os fiados de um cliente
window.receberTodosFiadosCliente = async function(clienteId) {
    const c = window.clientesCache.find(function(x) { return String(x.id) === String(clienteId); });
    if (!c) return;

    const info = fiadoDoCliente(c, window.comandasCacheClientes);
    if (info.comandas.length === 0) {
        alert('Sem fiados em aberto.');
        return;
    }

    if (!await window.confirmar('Receber TODOS os fiados de ' + c.nome + '?\n\nTotal: ' + formatMoney(info.total))) return;

    const forma = await window.perguntar('Forma de pagamento (dinheiro, debito, credito, pix):', 'dinheiro');
    if (forma === null) return;
    const formaFinal = ['dinheiro', 'debito', 'credito', 'pix'].indexOf(forma.toLowerCase()) >= 0
        ? forma.toLowerCase() : 'dinheiro';

    try {
        const comandas = await apiGet('comandas');

        info.comandas.forEach(function(cmdRef) {
            const cmd = comandas.find(function(x) { return String(x.id) === String(cmdRef.id); });
            if (!cmd || !comandaTemFiado(cmd)) return;

            const valor = Number(cmd.valorPendente || 0);
            if (valor <= 0) return;

            if (!cmd.pagamentos) cmd.pagamentos = [];
            cmd.pagamentos.push({
                forma: formaFinal,
                valor: valor,
                valorBase: valor,
                parcelas: 1,
                dataPagamento: new Date().toLocaleString('pt-BR')
            });

            cmd.valorPendente = 0;
            cmd.pagamentoPendente = false;
            cmd.dataPagamentoFiado = new Date().toLocaleString('pt-BR');
        });

        await apiSave('comandas', comandas);
        fecharModalFiadosCliente();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Fiados recebidos: ' + formatMoney(info.total));
        } else {
            alert('✅ Fiados recebidos: ' + formatMoney(info.total));
        }

        // Recarrega
        atualizarListaClientes();
    } catch (e) {
        console.error('Erro ao receber fiados:', e);
        alert('Erro: ' + e.message);
    }
};

// Modal simples de pagamento (fallback)
function abrirModalPagamentoFiadoSimples(cmd) {
    const anterior = document.getElementById('modal-quitar-fiado');
    if (anterior) anterior.remove();

    const valor = Number(cmd.valorPendente || 0);
    const modal = document.createElement('div');
    modal.id = 'modal-quitar-fiado';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.innerHTML =
        '<div class="modal-content" style="max-width:420px;">' +
        '    <div class="modal-header" style="background:#4caf50;color:#fff;">' +
        '        <strong>Receber Fiado — Comanda ' + cmd.numero + '</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalQuitarFiadoSimples()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +
        '        <div style="padding:12px;background:#fff3e0;border-radius:8px;margin-bottom:15px;text-align:center;">' +
        '            <div style="font-size:0.75rem;color:#666;">Cliente</div>' +
        '            <div style="font-weight:700;color:#e65100;">' + (cmd.cliente || '—') + '</div>' +
        '            <div style="font-size:0.75rem;color:#666;margin-top:8px;">Valor pendente</div>' +
        '            <div style="font-weight:700;font-size:1.6rem;color:#e65100;">' + formatMoney(valor) + '</div>' +
        '        </div>' +
        '        <div class="field"><label>Forma de pagamento</label>' +
        '            <select id="quitar-forma">' +
        '                <option value="dinheiro">💵 Dinheiro</option>' +
        '                <option value="debito">💳 Débito</option>' +
        '                <option value="credito">💳 Crédito</option>' +
        '                <option value="pix">📱 PIX</option>' +
        '            </select></div>' +
        '        <div class="field"><label>Valor recebido (R$)</label>' +
        '            <input type="number" step="0.01" min="0" id="quitar-valor" value="' + valor.toFixed(2) + '"></div>' +
        '        <button class="btn-primary" style="background:#4caf50;" onclick="confirmarQuitarFiadoSimples(' + cmd.id + ')">' +
        '            <i class="fas fa-check"></i> Confirmar Recebimento</button>' +
        '        <button class="btn-outline" style="width:100%;margin-top:10px;" onclick="fecharModalQuitarFiadoSimples()">Cancelar</button>' +
        '    </div></div>';
    document.body.appendChild(modal);
}

window.fecharModalQuitarFiadoSimples = function() {
    const m = document.getElementById('modal-quitar-fiado');
    if (m) m.remove();
};

window.confirmarQuitarFiadoSimples = async function(comandaId) {
    const forma = document.getElementById('quitar-forma').value;
    const valor = parseFloat(document.getElementById('quitar-valor').value) || 0;
    if (valor <= 0) { alert('Informe um valor válido'); return; }

    try {
        const comandas = await apiGet('comandas');
        const cmd = comandas.find(function(c) { return String(c.id) === String(comandaId); });
        if (!cmd) return;

        if (!cmd.pagamentos) cmd.pagamentos = [];
        cmd.pagamentos.push({
            forma: forma,
            valor: valor,
            valorBase: valor,
            parcelas: 1,
            dataPagamento: new Date().toLocaleString('pt-BR')
        });

        cmd.valorPendente = Math.max(0, Number(cmd.valorPendente || 0) - valor);
        if (cmd.valorPendente <= 0.01) {
            cmd.pagamentoPendente = false;
            cmd.valorPendente = 0;
            cmd.dataPagamentoFiado = new Date().toLocaleString('pt-BR');
        }

        await apiSave('comandas', comandas);
        fecharModalQuitarFiadoSimples();
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('✅ Fiado recebido: ' + formatMoney(valor));
        }

        atualizarListaClientes();
    } catch (e) {
        console.error('Erro:', e);
        alert('Erro: ' + e.message);
    }
};

// Ver TODOS os fiados (botão "Ver todos" no resumo)
window.abrirFiadosTodos = function() {
    const todosFiados = [];

    window.clientesCache.forEach(function(c) {
        const info = fiadoDoCliente(c, window.comandasCacheClientes);
        if (info.total > 0) {
            info.comandas.forEach(function(cmd) {
                todosFiados.push({ cliente: c, comanda: cmd });
            });
        }
    });

    if (todosFiados.length === 0) {
        alert('Nenhum fiado em aberto.');
        return;
    }

    const anterior = document.getElementById('modal-fiados-todos');
    if (anterior) anterior.remove();

    let total = 0;
    let itensHTML = '';
    todosFiados.forEach(function(item) {
        total += Number(item.comanda.valorPendente || 0);
        itensHTML += '<div style="padding:10px;background:#fff;border-radius:8px;margin-bottom:8px;border-left:3px solid #ff9800;">' +
                     '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                     '    <div style="flex:1;">' +
                     '        <div style="font-weight:600;">' + item.cliente.nome + '</div>' +
                     '        <div style="font-size:0.75rem;color:#666;">Comanda ' + item.comanda.numero + ' · ' + (item.comanda.dataFechamento || '') + '</div>' +
                     (item.comanda.dataVencimento ? '        <div style="font-size:0.7rem;color:#c62828;">Venc: ' + item.comanda.dataVencimento + '</div>' : '') +
                     '    </div>' +
                     '    <div style="text-align:right;">' +
                     '        <div style="font-weight:700;color:#e65100;">' + formatMoney(item.comanda.valorPendente) + '</div>' +
                     '        <button class="btn-outline" style="padding:4px 10px;font-size:0.7rem;margin-top:4px;border-color:#4caf50;color:#2e7d32;" onclick="receberFiadoCliente(' + item.comanda.id + ')">' +
                     '            <i class="fas fa-money-bill-wave"></i> Receber' +
                     '        </button>' +
                     '    </div>' +
                     '</div>' +
                     '</div>';
    });

    const modal = document.createElement('div');
    modal.id = 'modal-fiados-todos';
    modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = function(e) { if (e.target === modal) fecharModalFiadosTodos(); };
    modal.innerHTML =
        '<div class="modal-content" style="max-width:460px;">' +
        '    <div class="modal-header" style="background:#ff9800;color:#fff;">' +
        '        <strong>📝 Todos os Fiados</strong>' +
        '        <button class="btn-limpar" onclick="fecharModalFiadosTodos()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body">' +
        '        <div style="padding:12px;background:#fff3e0;border-radius:8px;margin-bottom:15px;text-align:center;">' +
        '            <div style="font-size:0.75rem;color:#666;">Total em aberto</div>' +
        '            <div style="font-size:1.6rem;font-weight:700;color:#e65100;">' + formatMoney(total) + '</div>' +
        '            <div style="font-size:0.75rem;color:#666;margin-top:2px;">' + todosFiados.length + ' comanda(s)</div>' +
        '        </div>' +
        '        <div style="max-height:400px;overflow-y:auto;">' + itensHTML + '</div>' +
        '        <button class="btn-outline" style="width:100%;margin-top:15px;" onclick="fecharModalFiadosTodos()">Fechar</button>' +
        '    </div>' +
        '</div>';
    document.body.appendChild(modal);
};

window.fecharModalFiadosTodos = function() {
    const m = document.getElementById('modal-fiados-todos');
    if (m) m.remove();
};

// ============================================================
// AÇÕES EXISTENTES
// ============================================================
window.novoCliente = function() {
    window.clienteEditando = null;
    navigateTo('cadastro-cliente');
};

window.editarCliente = function(id) {
    for (let i = 0; i < window.clientesCache.length; i++) {
        if (String(window.clientesCache[i].id) === String(id)) {
            window.clienteEditando = window.clientesCache[i];
            navigateTo('cadastro-cliente');
            return;
        }
    }
};

window.excluirCliente = async function(id) {
    let cliente = null;
    for (let i = 0; i < window.clientesCache.length; i++) {
        if (String(window.clientesCache[i].id) === String(id)) {
            cliente = window.clientesCache[i];
            break;
        }
    }
    if (!cliente) return;

    // Verifica fiado em aberto
    const info = fiadoDoCliente(cliente, window.comandasCacheClientes);
    if (info.total > 0) {
        alert('Não é possível excluir: o cliente tem ' + formatMoney(info.total) + ' em fiado.\n\nReceba o fiado antes de excluir.');
        return;
    }

    // Verifica comandas abertas
    const comandas = await apiGet('comandas');
    const emUso = comandas.filter(function(c) {
        return String(c.cliente || '').toLowerCase() === String(cliente.nome).toLowerCase() &&
               window.comandaEstaAtiva(c);
    }).length;

    if (emUso > 0) {
        alert('Não é possível excluir: este cliente está vinculado a ' + emUso + ' comanda(s) aberta(s).');
        return;
    }

    if (!await window.confirmar('Excluir o cliente "' + cliente.nome + '"?')) return;

    const lista = await apiGet('clientes');
    const novaLista = lista.filter(function(x) { return String(x.id) !== String(id); });
    await apiSave('clientes', novaLista);

    document.getElementById('app').innerHTML = renderClientes();
};

window.filtrarClientes = function() {
    window.clienteTermoBusca = (document.getElementById('busca-cliente') || {}).value || '';
    const lista = document.getElementById('clientes-lista');
    if (lista) lista.innerHTML = renderListaClientes();
};

window.limparBuscaClientes = function() {
    window.clienteTermoBusca = '';
    const input = document.getElementById('busca-cliente');
    if (input) input.value = '';
    const lista = document.getElementById('clientes-lista');
    if (lista) lista.innerHTML = renderListaClientes();
};