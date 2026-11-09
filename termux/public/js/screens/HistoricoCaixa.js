// ============================================================
// HISTORICOCAIXA.JS — Histórico de caixas fechados
// + nome do cliente nas comandas listadas
// ============================================================

console.log('✔ HistoricoCaixa.js carregado');

window.historicoState = {
    caixas: [],
    comandas: [],
    filtro: 'todos',
    dataIni: '',
    dataFim: ''
};

// ============================================================
// RENDER
// ============================================================
window.renderHistoricoCaixa = function() {
    setTimeout(carregarHistoricoCaixa, 50);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Histórico de Caixas</h1>',
        '    <button class="icon-btn" onclick="carregarHistoricoCaixa()" title="Atualizar"><i class="fas fa-sync-alt"></i></button>',
        '</div>',

        '<div style="padding:12px 16px;background:#fff;border-bottom:1px solid #eee;">',
        '    <label style="font-size:0.8rem;color:#666;font-weight:500;display:block;margin-bottom:6px;">Período</label>',
        '    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" id="historico-chips"></div>',
        '    <div id="historico-custom" style="display:none;margin-top:10px;">',
        '        <div style="display:flex;gap:8px;">',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Inicial</label>',
        '                <input type="date" id="hist-data-ini" onchange="aplicarFiltroHistorico()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '            <div style="flex:1;">',
        '                <label style="font-size:0.7rem;color:#888;">Final</label>',
        '                <input type="date" id="hist-data-fim" onchange="aplicarFiltroHistorico()" style="width:100%;padding:8px;border:1.5px solid #ccc;border-radius:6px;font-size:0.85rem;">',
        '            </div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div class="content-area" id="historico-conteudo" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>'
    ].join('\n');
};

// ============================================================
// CARREGA
// ============================================================
async function carregarHistoricoCaixa() {
    const container = document.getElementById('historico-conteudo');
    if (!container) return;

    try {
        const dados = await apiGet('caixas');
        window.historicoState.caixas = Array.isArray(dados) ? dados : [];

        try {
            const comandas = await apiGet('comandas');
            window.historicoState.comandas = Array.isArray(comandas) ? comandas : [];
        } catch (e) {
            window.historicoState.comandas = [];
        }

        renderChipsHistorico();
        renderConteudoHistorico();
    } catch (e) {
        console.error('Erro:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar.</p>';
    }
}

window.carregarHistoricoCaixa = carregarHistoricoCaixa;

// ============================================================
// CHIPS
// ============================================================
function renderChipsHistorico() {
    const container = document.getElementById('historico-chips');
    if (!container) return;

    const abas = [
        { id: 'todos',   label: 'Todos' },
        { id: 'hoje',    label: 'Hoje' },
        { id: 'ontem',   label: 'Ontem' },
        { id: 'semana',  label: '7 dias' },
        { id: 'mes',     label: '30 dias' },
        { id: 'custom',  label: '📅 Personalizado' }
    ];
    const ativa = window.historicoState.filtro;

    container.innerHTML = abas.map(function(a) {
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroHistorico(\'' + a.id + '\')">' + a.label + '</button>';
    }).join('');

    const custom = document.getElementById('historico-custom');
    if (custom) custom.style.display = ativa === 'custom' ? 'block' : 'none';
}

window.mudarFiltroHistorico = function(filtro) {
    window.historicoState.filtro = filtro;
    renderChipsHistorico();
    renderConteudoHistorico();
};

window.aplicarFiltroHistorico = function() {
    window.historicoState.dataIni = (document.getElementById('hist-data-ini') || {}).value || '';
    window.historicoState.dataFim = (document.getElementById('hist-data-fim') || {}).value || '';
    renderConteudoHistorico();
};

// ============================================================
// FILTRA
// ============================================================
function filtrarCaixas() {
    let lista = window.historicoState.caixas.filter(function (c) { return !c.excluido; });
    const filtro = window.historicoState.filtro;

    let ini = null, fim = null;
    const agora = new Date();

    if (filtro === 'hoje') {
        ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
        fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59);
    } else if (filtro === 'ontem') {
        const ontem = new Date(agora);
        ontem.setDate(ontem.getDate() - 1);
        ini = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate());
        fim = new Date(ontem.getFullYear(), ontem.getMonth(), ontem.getDate(), 23, 59, 59);
    } else if (filtro === 'semana') {
        ini = new Date(agora);
        ini.setDate(ini.getDate() - 7);
        fim = agora;
    } else if (filtro === 'mes') {
        ini = new Date(agora);
        ini.setDate(ini.getDate() - 30);
        fim = agora;
    } else if (filtro === 'custom') {
        if (window.historicoState.dataIni) ini = new Date(window.historicoState.dataIni + 'T00:00:00');
        if (window.historicoState.dataFim) fim = new Date(window.historicoState.dataFim + 'T23:59:59');
    }

    if (ini || fim) {
        lista = lista.filter(function(c) {
            return window.isEntre(c.dataFechamento || c.dataAbertura, ini, fim);
        });
    }

    return lista;
}

function comandasDoCaixa(caixaId) {
    return window.historicoState.comandas.filter(function(c) {
        return String(c.caixaId) === String(caixaId);
    });
}

// ============================================================
// CONTEÚDO
// ============================================================
function renderConteudoHistorico() {
    const container = document.getElementById('historico-conteudo');
    if (!container) return;

    const lista = filtrarCaixas();

    if (lista.length === 0) {
        container.innerHTML =
            '<div class="card" style="text-align:center;padding:30px;">' +
            '    <i class="fas fa-history" style="font-size:3rem;color:#ccc;"></i>' +
            '    <p style="margin-top:15px;color:#888;">Nenhum caixa fechado neste período</p>' +
            '</div>';
        return;
    }

    lista.sort(function(a, b) {
        return String(b.dataFechamento || '').localeCompare(String(a.dataFechamento || ''));
    });

    let html = '';

    let totalDiferenca = 0;
    let totalValorContado = 0;
    lista.forEach(function(c) {
        totalDiferenca += Number(c.diferenca || 0);
        totalValorContado += Number(c.valorContado || 0);
    });

    html += '<div style="padding:12px 16px;background:linear-gradient(135deg, #C2185B 0%, #D81B60 100%);color:#fff;border-radius:12px;margin-bottom:12px;">';
    html += '    <div style="font-size:0.75rem;opacity:0.9;">' + lista.length + ' caixa(s) no período</div>';
    html += '    <div style="font-size:1.8rem;font-weight:700;margin-top:6px;">' + formatMoney(totalValorContado) + '</div>';
    html += '    <div style="font-size:0.8rem;opacity:0.9;margin-top:4px;">Total conferido</div>';
    html += '    <div style="margin-top:8px;font-size:0.8rem;opacity:0.9;">';
    html += '        Diferença acumulada: <b>' + (totalDiferenca >= 0 ? '+' : '') + formatMoney(totalDiferenca) + '</b>';
    html += '    </div>';
    html += '</div>';

    lista.forEach(function(c) {
        const cor = (window.CORES_CAIXA || []).find(function(x) { return x.id === c.cor; });
        const corHex = cor ? cor.hex : '#C2185B';
        const dif = Number(c.diferenca || 0);
        const difCor = Math.abs(dif) < 0.01 ? '#4caf50' : (dif > 0 ? '#2e7d32' : '#c62828');
        const difTexto = Math.abs(dif) < 0.01 ? 'OK' : ((dif > 0 ? '+' : '') + formatMoney(dif));

        const comandas = comandasDoCaixa(c.id);
        const fechadas = comandas.filter(window.comandaEstaFechada);
        const fiados = fechadas.filter(function(cmd) { return cmd.pagamentoPendente === true && Number(cmd.valorPendente || 0) > 0; });

        let totalDinheiro = 0;
        fechadas.forEach(function(cmd) {
            window.pagamentosLiquidos(cmd).forEach(function(p) {
                if (p.forma === 'dinheiro') totalDinheiro += Number(p.valor || 0);
            });
        });

        html += '<div class="card" style="background:#fff;border-left:4px solid ' + corHex + ';">';
        html += '    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">';
        html += '        <div>';
        html += '            <div style="font-weight:700;font-size:1.05rem;color:' + corHex + ';">' + (cor ? cor.label : '—') + '</div>';
        html += '            <div style="font-size:0.75rem;color:#888;margin-top:2px;">';
        html += '                <i class="fas fa-unlock"></i> ' + (c.dataAbertura || '—');
        html += '            </div>';
        html += '            <div style="font-size:0.75rem;color:#888;">';
        html += '                <i class="fas fa-lock"></i> ' + (c.dataFechamento || '—');
        html += '            </div>';
        html += '        </div>';
        html += '        <div style="text-align:right;">';
        html += '            <div style="font-size:0.7rem;color:#888;">Diferença</div>';
        html += '            <div style="font-weight:700;font-size:1rem;color:' + difCor + ';">' + difTexto + '</div>';
        html += '        </div>';
        html += '    </div>';

        html += '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 0;border-top:1px solid #f0f0f0;font-size:0.8rem;">';
        html += '        <div><span style="color:#888;">Fundo:</span> ' + formatMoney(c.valorInicial || 0) + '</div>';
        html += '        <div><span style="color:#888;">Esperado:</span> ' + formatMoney(c.valorEsperado || 0) + '</div>';
        html += '        <div><span style="color:#888;">Contado:</span> ' + formatMoney(c.valorContado || 0) + '</div>';
        html += '        <div><span style="color:#888;">Operador:</span> ' + (c.usuario || '—') + '</div>';
        html += '    </div>';

        // Comandas do caixa
        if (fechadas.length > 0) {
            html += '    <details style="margin-top:8px;">';
            html += '        <summary style="cursor:pointer;font-size:0.85rem;color:var(--primary-color);font-weight:600;padding:6px 0;">';
            html += '            📋 ' + fechadas.length + ' comanda(s) fechada(s) — ver lista';
            html += '        </summary>';
            html += '        <div style="max-height:220px;overflow-y:auto;margin-top:6px;">';

            fechadas.forEach(function(cmd) {
                const temFiado = cmd.pagamentoPendente === true && Number(cmd.valorPendente || 0) > 0;
                const temClienteCad = !!(cmd.clienteId && cmd.cliente);
                const nomeCliente = cmd.cliente ? String(cmd.cliente).trim() : '';

                let clienteHTML = '';
                if (nomeCliente) {
                    clienteHTML = temClienteCad
                        ? '<span style="font-weight:600;color:#880E4F;">👤 ' + nomeCliente + '</span>'
                        : '<span style="color:#666;">' + nomeCliente + '</span>';
                } else {
                    clienteHTML = '<span style="color:#aaa;">Sem cliente</span>';
                }

                html += '<div style="padding:6px 0;border-bottom:1px dashed #eee;font-size:0.8rem;">' +
                        '<div style="display:flex;justify-content:space-between;">' +
                        '    <div style="flex:1;">' +
                        '        <div>Comanda ' + cmd.numero + ' · ' + (cmd.mesa || '—') + '</div>' +
                        '        <div style="font-size:0.72rem;">' + clienteHTML + '</div>' +
                        '    </div>' +
                        '    <div style="text-align:right;">' +
                        '        <div style="font-weight:600;color:var(--primary-color);">' + formatMoney(cmd.total || 0) + '</div>' +
                        (temFiado ? '<div style="font-size:0.65rem;color:#e65100;font-weight:600;">FIADO ' + formatMoney(cmd.valorPendente) + '</div>' : '') +
                        '    </div>' +
                        '</div>' +
                        '</div>';
            });

            html += '        </div>';
            html += '    </details>';
        }

        if (c.observacaoFechamento) {
            html += '<div style="font-size:0.75rem;color:#666;padding-top:8px;border-top:1px dashed #eee;margin-top:6px;">';
            html += '    <i class="fas fa-comment"></i> ' + c.observacaoFechamento;
            html += '</div>';
        }

        // Botão ver detalhes
        html += '    <div style="display:flex;gap:8px;margin-top:10px;">' +
                '    <button class="btn-outline" style="flex:1;font-size:0.85rem;padding:8px;" ' +
                'onclick="verDetalhesCaixaHistorico(\'' + c.id + '\')">' +
                '        <i class="fas fa-eye"></i> Ver detalhes completos' +
                '    </button>' +
                '    <button class="btn-danger" style="font-size:0.85rem;padding:8px 14px;" title="Excluir do histórico" ' +
                'onclick="excluirCaixaHistorico(\'' + c.id + '\')"><i class="fas fa-trash"></i></button>' +
                '    </div>';

        html += '</div>';
    });

    container.innerHTML = html;
}

// ============================================================
// VER DETALHES
// ============================================================
window.verDetalhesCaixaHistorico = function(id) {
    window.resumoCaixaId = id;
    window.resumoCaixaOrigem = 'historico';
    navigateTo('resumo-caixa');
};

// ============================================================
// EXCLUIR DO HISTÓRICO (com confirmação, permissão e trilha de auditoria)
// Não apaga o registro financeiro: marca como excluído (some da lista, continua no banco e no log).
// ============================================================
window.excluirCaixaHistorico = async function (id) {
    if (typeof window.podeAcessar === 'function' && !window.podeAcessar('caixa.historico')) {
        alert('Você não tem permissão para excluir do histórico.'); return;
    }
    const c = window.historicoState.caixas.find(function (x) { return String(x.id) === String(id); });
    if (!c) return;
    if (!await window.confirmar('Excluir do histórico o caixa aberto em ' + (c.dataAbertura || '?') + ' (fechado em ' + (c.dataFechamento || '?') + ')?\n\nO registro financeiro fica guardado na auditoria.')) return;
    const motivo = await window.perguntar('Motivo da exclusão (obrigatório):');
    if (motivo == null) return;
    if (!String(motivo).trim()) { alert('Informe o motivo.'); return; }
    try {
        const u = (typeof window.obterUsuarioLogado === 'function' && window.obterUsuarioLogado()) || {};
        const agora = new Date().toLocaleString('pt-BR');
        const lista = window.normalizarArray(await apiGet('caixas'));
        const i = lista.findIndex(function (x) { return String(x.id) === String(id); });
        if (i < 0) { alert('Registro não encontrado.'); return; }
        lista[i].excluido = true; lista[i].excluidoEm = agora; lista[i].excluidoPor = u.nome || 'Operador'; lista[i].motivoExclusao = String(motivo).trim();
        await apiSave('caixas', lista);
        const log = window.normalizarArray(await apiGet('auditoria').catch(function () { return []; }));
        log.push({ id: String(Date.now()), acao: 'excluir-caixa-historico', alvo: String(id), usuario: u.nome || 'Operador', data: agora, motivo: String(motivo).trim(),
                   resumo: { dataAbertura: c.dataAbertura, dataFechamento: c.dataFechamento, totalVendas: c.totalVendas, valorContado: c.valorContado } });
        await apiSave('auditoria', log);
        if (typeof window.mostrarToast === 'function') window.mostrarToast('Caixa removido do histórico (registrado na auditoria)');
        carregarHistoricoCaixa();
    } catch (e) { alert('Não foi possível excluir: ' + e.message); }
};
