// ============================================================
// GARCOM.JS — v7 (Apenas cargo "Garçom")
// ============================================================

console.log('✔ Garcom.js v7 carregado');

window.garcomState = {
    garcomAtual: '',
    comandas: [],
    filtroStatus: 'todas',
    termoBusca: '',
    timer: null
};

try {
    const salvo = localStorage.getItem('garcomAtual');
    if (salvo) window.garcomState.garcomAtual = salvo;
} catch (e) {}

// ============================================================
// RENDER PRINCIPAL
// ============================================================
window.renderGarcom = function() {
    if (!window.garcomState.garcomAtual) {
        setTimeout(carregarListaGarcons, 50);
        return renderSelecionarGarcom();
    }

    setTimeout(carregarGarcom, 50);

    if (window.garcomState.timer) clearInterval(window.garcomState.timer);
    window.garcomState.timer = setInterval(function() {
        if (document.getElementById('garcom-lista')) atualizarGarcom();
    }, 5000);

    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Meus Pedidos</h1>',
        '    <div style="display:flex;gap:2px;">',
        '        <button class="icon-btn" onclick="abrirModalNovaComandaGarcom()" title="Nova comanda"><i class="fas fa-plus"></i></button>',
        '        <button class="icon-btn" onclick="sairGarcom()" title="Sair"><i class="fas fa-sign-out-alt"></i></button>',
        '    </div>',
        '</div>',

        '<div style="padding:12px 16px;background:linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);color:#fff;">',
        '    <div style="display:flex;align-items:center;gap:10px;">',
        '        <div style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;">',
        '            <i class="fas fa-user-tie" style="font-size:1.4rem;"></i>',
        '        </div>',
        '        <div>',
        '            <div style="font-size:0.7rem;opacity:0.85;">GARÇOM</div>',
        '            <div style="font-size:1.1rem;font-weight:700;" id="garcom-nome-atual"></div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div style="padding:8px 16px;background:#e3f2fd;text-align:center;font-size:0.8rem;color:#1565c0;border-bottom:1px solid #bbdefb;">',
        '    <i class="fas fa-calendar-day"></i> Mostrando comandas de <b>hoje</b>',
        '</div>',

        '<div style="padding:12px 16px;background:#f5f5f5;border-bottom:1px solid #eee;">',
        '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:center;">',
        '        <div style="background:#fff;padding:10px;border-radius:8px;">',
        '            <div style="font-size:0.7rem;color:#888;">ABERTAS</div>',
        '            <div style="font-size:1.3rem;font-weight:700;color:#ff9800;" id="garcom-abertas">0</div>',
        '        </div>',
        '        <div style="background:#fff;padding:10px;border-radius:8px;">',
        '            <div style="font-size:0.7rem;color:#888;">FECHADAS</div>',
        '            <div style="font-size:1.3rem;font-weight:700;color:#4caf50;" id="garcom-fechadas">0</div>',
        '        </div>',
        '    </div>',
        '</div>',

        '<div style="padding:10px 16px;overflow-x:auto;white-space:nowrap;background:#fff;border-bottom:1px solid #eee;" id="garcom-chips"></div>',

        '<div class="input-busca">',
        '    <input type="text" placeholder="Buscar comanda" id="garcom-busca" oninput="filtrarGarcom()">',
        '    <button class="btn-limpar" onclick="limparBuscaGarcom()"><i class="fas fa-xmark"></i></button>',
        '</div>',

        '<div class="content-area" id="garcom-lista" style="padding:12px;">',
        '    <p class="empty-state">🔄 Carregando...</p>',
        '</div>',

        '<button class="fab" onclick="abrirModalNovaComandaGarcom()" title="Nova comanda">',
        '    <i class="fas fa-plus"></i>',
        '</button>'
    ].join('\n');
};

// ============================================================
// TELA: SELECIONAR GARÇOM (Filtro Exclusivo)
// ============================================================
function renderSelecionarGarcom() {
    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Painel do Garçom</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area">',
        '    <div style="padding:15px 16px;">',
        '        <div style="text-align:center;margin:30px 0;">',
        '            <div style="width:90px;height:90px;background:#e3f2fd;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;">',
        '                <i class="fas fa-user-tie" style="font-size:3rem;color:#1976d2;"></i>',
        '            </div>',
        '            <h2 style="margin-top:20px;color:#1976d2;">Identifique-se</h2>',
        '            <p style="color:#666;margin-top:10px;">Selecione seu nome para ver seus pedidos</p>',
        '        </div>',
        '        <div id="garcom-lista-nomes">',
        '            <p class="empty-state">🔄 Carregando...</p>',
        '        </div>',
        '    </div>',
        '</div>'
    ].join('\n');
}

async function carregarListaGarcons() {
    const container = document.getElementById('garcom-lista-nomes');
    if (!container) return;

    try {
        const bruto = await apiGet('colaboradores');
        const lista = window.normalizarArray(bruto);

        // 🔥 FILTRO EXCLUSIVO: Apenas "Garçom" ou "Garcom"
        const garcons = lista.filter(function(c) {
            const funcao = String(c.funcao || '').toLowerCase().trim();
            
            // Aceita apenas se a função contiver a palavra "garçom" ou "garcom"
            const isGarcom = funcao.includes('garçom') || funcao.includes('garcom');

            return isGarcom;
        });

        if (garcons.length === 0) {
            container.innerHTML = `
                <div class="card" style="padding:20px;text-align:center;">
                    <i class="fas fa-user-slash" style="font-size:2.5rem;color:#ccc; margin-bottom:10px;"></i>
                    <p style="color:#666;font-weight:600;">Nenhum garçom cadastrado.</p>
                    <p style="font-size:0.8rem;color:#888;margin-top:5px;">
                        Para aparecer aqui, o colaborador precisa ter a função exata <b>"Garçom"</b>.
                    </p>
                    <button class="btn-primary" style="margin-top:15px; background:#1976d2;" onclick="navigateTo('cadastro-colaborador')">
                        <i class="fas fa-plus"></i> Cadastrar Garçom
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = garcons.map(function(c) {
            const nomeEscapado = String(c.nome || '').replace(/'/g, "\\'");
            return '<div class="lista-item" onclick="selecionarGarcom(\'' + nomeEscapado + '\')">' +
                '<div style="display:flex;align-items:center;gap:12px;flex:1;">' +
                '    <div style="width:40px;height:40px;background:#e3f2fd;border-radius:50%;display:flex;align-items:center;justify-content:center;">' +
                '        <i class="fas fa-user-tie" style="color:#1976d2;font-size:1.1rem;"></i>' +
                '    </div>' +
                '    <div>' +
                '        <div style="font-weight:600;">' + c.nome + '</div>' +
                '        <div style="font-size:0.75rem;color:#888;">' + (c.funcao || 'Garçom') + '</div>' +
                '    </div>' +
                '</div>' +
                '<i class="fas fa-chevron-right" style="color:#ccc;"></i>' +
                '</div>';
        }).join('');
    } catch (e) {
        console.error('Erro:', e);
        container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar.</p>';
    }
}

window.selecionarGarcom = function(nome) {
    window.garcomState.garcomAtual = nome;
    try { localStorage.setItem('garcomAtual', nome); } catch (e) {}
    document.getElementById('app').innerHTML = renderGarcom();
};

window.sairGarcom = async function() {
    if (!await window.confirmar('Sair do painel do garçom?')) return;
    window.garcomState.garcomAtual = '';
    try { localStorage.removeItem('garcomAtual'); } catch (e) {}
    document.getElementById('app').innerHTML = renderGarcom();
};

// ============================================================
// CARREGA COMANDAS DO GARÇOM
// ============================================================
async function carregarGarcom() {
    await atualizarGarcom();
}

window.atualizarGarcom = async function() {
    const lista = document.getElementById('garcom-lista');
    if (!lista) return;

    try {
        const comandasBrutas = await apiGet('comandas');
        const todas = window.normalizarArray(comandasBrutas);
        const nome = window.garcomState.garcomAtual;

        window.garcomState.comandas = todas.filter(function(c) {
            if (!window.isHoje(c.dataAbertura)) return false;
            return String(c.garcom || '').toLowerCase() === String(nome).toLowerCase();
        });

        atualizarResumoGarcom();
        renderChipsGarcom();
        lista.innerHTML = renderListaGarcom();
    } catch (e) {
        console.error('❌ Erro Garcom:', e);
        lista.innerHTML =
            '<div class="card" style="padding:20px;text-align:center;">' +
            '    <i class="fas fa-bug" style="font-size:2rem;color:#c62828;"></i>' +
            '    <p style="margin-top:10px;color:#c62828;font-weight:600;">Erro ao carregar</p>' +
            '    <p style="font-size:0.8rem;color:#666;margin-top:6px;">' + (e && e.message ? e.message : e) + '</p>' +
            '    <button class="btn-outline" style="margin-top:15px;" onclick="atualizarGarcom()">' +
            '        <i class="fas fa-sync-alt"></i> Tentar de novo' +
            '    </button>' +
            '</div>';
    }
};

window.carregarGarcom = carregarGarcom;

// ============================================================
// RESUMO E CHIPS
// ============================================================
function atualizarResumoGarcom() {
    const comandas = window.garcomState.comandas;
    const abertas = comandas.filter(function(c) { return window.comandaEstaAtiva(c); });
    const fechadas = comandas.filter(function(c) { return window.comandaEstaFechada(c); });

    const elA = document.getElementById('garcom-abertas');
    const elF = document.getElementById('garcom-fechadas');
    const elN = document.getElementById('garcom-nome-atual');
    if (elA) elA.textContent = abertas.length;
    if (elF) elF.textContent = fechadas.length;
    if (elN) elN.textContent = window.garcomState.garcomAtual;
}

function renderChipsGarcom() {
    const container = document.getElementById('garcom-chips');
    if (!container) return;

    const abas = [
        { id: 'todas',     label: 'Todas' },
        { id: 'aberta',    label: 'Abertas' },
        { id: 'delivery',  label: 'Delivery' },
        { id: 'fechada',   label: 'Fechadas' },
        { id: 'cancelada', label: 'Canceladas' }
    ];
    const ativa = window.garcomState.filtroStatus;

    container.innerHTML = abas.map(function(a) {
        const total = window.garcomState.comandas.filter(function(c) {
            return a.id === 'todas' ? true : window.statusComandaNormalizado(c) === a.id;
        }).length;
        const isAtivo = a.id === ativa ? 'ativo' : '';
        return '<button class="chip-grupo ' + isAtivo + '" onclick="mudarFiltroGarcom(\'' + a.id + '\')">' +
               a.label + ' <span style="opacity:0.7;">(' + total + ')</span></button>';
    }).join('');
}

window.mudarFiltroGarcom = function(filtro) {
    window.garcomState.filtroStatus = filtro;
    renderChipsGarcom();
    const lista = document.getElementById('garcom-lista');
    if (lista) lista.innerHTML = renderListaGarcom();
};

// ============================================================
// LISTA
// ============================================================
function renderListaGarcom() {
    let lista = window.garcomState.comandas.slice();

    const filtro = window.garcomState.filtroStatus;
    if (filtro !== 'todas') {
        lista = lista.filter(function(c) { return window.statusComandaNormalizado(c) === filtro; });
    }

    const busca = String(window.garcomState.termoBusca || '').trim().toLowerCase();
    if (busca !== '') {
        lista = lista.filter(function(c) {
            return String(c.numero || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.cliente || '').toLowerCase().indexOf(busca) >= 0 ||
                   String(c.mesa || '').toLowerCase().indexOf(busca) >= 0;
        });
    }

    const ordem = { 'aberta': 1, 'delivery': 2, 'fechada': 3, 'cancelada': 4 };
    lista.sort(function(a, b) {
        const oa = ordem[window.statusComandaNormalizado(a)] || 9;
        const ob = ordem[window.statusComandaNormalizado(b)] || 9;
        if (oa !== ob) return oa - ob;
        return String(a.numero || '').localeCompare(String(b.numero || ''));
    });

    if (lista.length === 0) return '<p class="empty-state">Você ainda não atendeu nenhuma comanda hoje.</p>';

    return lista.map(renderCardGarcom).join('');
}

function renderCardGarcom(c) {
    const statusInfo = {
        'aberta':    { bg: '#fff3e0', borda: '#ff9800', label: 'Aberta',    icone: 'fa-chair' },
        'delivery':  { bg: '#e3f2fd', borda: '#2196f3', label: 'Delivery',  icone: 'fa-motorcycle' },
        'fechada':   { bg: '#e8f5e9', borda: '#4caf50', label: 'Fechada',   icone: 'fa-check' },
        'cancelada': { bg: '#ffebee', borda: '#f44336', label: 'Cancelada', icone: 'fa-ban' }
    };
    const info = statusInfo[window.statusComandaNormalizado(c)] || statusInfo.aberta;

    const total = Number(c.total || 0);
    const qtd = window.normalizarArray(c.itens).length;

    const temClienteCadastrado = !!(c.clienteId && c.cliente);
    const nomeCliente = c.cliente ? String(c.cliente).trim() : '';
    const clienteHTML = nomeCliente
        ? (temClienteCadastrado
            ? '<div style="font-size:0.8rem;color:#880E4F;font-weight:600;margin-top:2px;"><i class="fas fa-user-circle"></i> ' + nomeCliente + '</div>'
            : '<div style="font-size:0.8rem;color:#666;margin-top:2px;"><i class="fas fa-user"></i> ' + nomeCliente + '</div>')
        : '';

    return '<div style="background:' + info.bg + ';border-left:4px solid ' + info.borda + ';border-radius:10px;padding:14px;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,0.06);cursor:pointer;" onclick="abrirComandaGarcom(' + c.id + ')">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;">' +
        '<div style="flex:1;">' +
        '    <div style="display:flex;align-items:center;gap:8px;">' +
        '        <span style="font-size:1.4rem;font-weight:700;">' + c.numero + '</span>' +
        '        <span style="background:' + info.borda + ';color:#fff;font-size:0.65rem;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:uppercase;">' +
        '            <i class="fas ' + info.icone + '"></i> ' + info.label +
        '        </span>' +
        '    </div>' +
        '    <div style="font-size:0.8rem;color:#666;margin-top:4px;"><i class="fas fa-chair" style="font-size:0.7rem;"></i> ' + (c.mesa || '—') + '</div>' +
        clienteHTML +
        '    <div style="font-size:0.7rem;color:#999;margin-top:4px;">' + (c.dataAbertura || '') + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
        '    <div style="font-size:0.7rem;color:#888;">' + qtd + ' itens</div>' +
        '    <div style="font-size:1.3rem;font-weight:700;color:var(--primary-color);">' + formatMoney(total) + '</div>' +
        '</div>' +
        '</div>' +
        '</div>';
}

window.abrirComandaGarcom = function(id) {
    window.comandaIdAtual = id;
    window.comandaOrigem = 'pdv';
    navigateTo('detalhe-comanda');
};

window.filtrarGarcom = function() {
    window.garcomState.termoBusca = (document.getElementById('garcom-busca') || {}).value || '';
    const lista = document.getElementById('garcom-lista');
    if (lista) lista.innerHTML = renderListaGarcom();
};

window.limparBuscaGarcom = function() {
    window.garcomState.termoBusca = '';
    const input = document.getElementById('garcom-busca');
    if (input) input.value = '';
    const lista = document.getElementById('garcom-lista');
    if (lista) lista.innerHTML = renderListaGarcom();
};

// ============================================================
// NOVA COMANDA
// ============================================================
window.abrirModalNovaComandaGarcom = function() {
    if (typeof window.abrirModalNovaComandaPDV !== 'function') {
        alert('Modal de nova comanda indisponível.\n\nAbra o PDV uma vez para carregar o módulo.');
        return;
    }

    const nomeGarcom = window.garcomState.garcomAtual;
    const resultado = window.abrirModalNovaComandaPDV();

    if (resultado && typeof resultado.then === 'function') {
        resultado.then(function() {
            setTimeout(function() {
                const sel = document.getElementById('nc-pdv-colaborador');
                if (!sel) return;
                for (let i = 0; i < sel.options.length; i++) {
                    if (sel.options[i].text.toLowerCase().indexOf(String(nomeGarcom).toLowerCase()) >= 0) {
                        sel.selectedIndex = i;
                        break;
                    }
                }
            }, 250);
        });
    }
};

console.log('✔ Garcom.js v7 — Apenas cargo "Garçom"');