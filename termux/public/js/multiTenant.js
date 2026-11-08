// ============================================================
// MULTITENANT.JS — Config do dispositivo via /api/device
// Sem localStorage para dados de negócio
// ============================================================

console.log('✔ multiTenant.js carregado');

window.MT = {
    tipoDispositivo: 'unico',
    ipServidor: '',
    portaServidor: 3000,
    idAcesso: '',
    clienteId: null,
    basePadrao: true,
    isVisitante: true,
    idTerminal: '',
    assinaturaAtiva: false,
    enderecos: [],           // [{url,tipo}] endereços do servidor (modo cliente)
    funcaoDispositivo: '',   // garcom | cozinha | caixa | cardapio (só vale em modo cliente)
    _carregado: false
};

// ------------------------------------------------------------
// CARREGAR / SALVAR (via servidor)
// ------------------------------------------------------------
window.MT.carregar = async function () {
    try {
        let dev = null;
        try {
            dev = await fetch('/api/device', { credentials: 'include' }).then(r => r.ok ? r.json() : null);
        } catch (e) {}

        if (dev && (dev.idTerminal || dev.tipoDispositivo)) {
            window.MT.idTerminal = dev.idTerminal || '';
            window.MT.tipoDispositivo = dev.tipoDispositivo || 'unico';
            window.MT.ipServidor = dev.ipServidor || '';
            window.MT.portaServidor = parseInt(dev.portaServidor, 10) || 3000;
            window.MT.idAcesso = dev.idAcesso || '';
            window.MT.clienteId = dev.clienteId || null;
            window.MT.basePadrao = (window.MT.tipoDispositivo !== 'cliente');
            window.MT.assinaturaAtiva = !!dev.assinaturaAtiva;
            window.MT.funcaoDispositivo = dev.funcaoDispositivo || '';
            window.MT.enderecos = Array.isArray(dev.enderecos) ? dev.enderecos : [];
        }

        const logado = typeof window.estaLogado === 'function' ? window.estaLogado() : false;
        window.MT.isVisitante = !logado;

        if (window.MT.isVisitante && (!window.MT.idAcesso || window.MT.idAcesso.indexOf('TEMP-') !== 0)) {
            window.MT.idAcesso = 'TEMP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
            await window.MT.salvar();
        }

        window.MT._carregado = true;
    } catch (e) {
        console.error('Erro ao carregar MT:', e);
        window.MT._carregado = true;
    }
};

window.MT.salvar = async function () {
    // Navegador de cliente (/caixa, /cozinha, /garcom, QR) nunca grava a configuração do servidor.
    if (window.__semConfigLocal) return;
    try {
        await fetch('/api/device', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                idTerminal: window.MT.idTerminal,
                tipoDispositivo: window.MT.tipoDispositivo,
                ipServidor: window.MT.ipServidor,
                portaServidor: window.MT.portaServidor,
                idAcesso: window.MT.idAcesso,
                clienteId: window.MT.clienteId,
                assinaturaAtiva: window.MT.assinaturaAtiva,
                funcaoDispositivo: window.MT.funcaoDispositivo,
                enderecos: window.MT.enderecos || []
            })
        });
    } catch (e) {
        console.error('Erro ao salvar MT:', e);
    }
};

// ------------------------------------------------------------
// URL DA API
// ------------------------------------------------------------
window.MT.apiBase = function () {
    if (window.MT.tipoDispositivo === 'cliente' && window.CX && window.CX.base) return window.CX.base();
    if (window.MT.tipoDispositivo === 'cliente' && window.MT.ipServidor) {
        let ip = window.MT.ipServidor.trim();
        if (ip.indexOf('http') === 0) return ip.replace(/\/$/, '');
        return 'http://' + ip + ':' + window.MT.portaServidor;
    }
    return '';
};

window.MT.apiPath = function (recurso) {
    if (window.MT.clienteId && !window.MT.isVisitante) {
        return '/api/c/' + window.MT.clienteId + '/' + recurso;
    }
    return '/api/' + recurso;
};

window.MT.apiUrl = function (recurso) {
    return window.MT.apiBase() + window.MT.apiPath(recurso);
};

// ------------------------------------------------------------
// CONEXÃO
// ------------------------------------------------------------
window.MT.conectarViaIP = async function (ip, porta) {
    porta = porta || 3000;
    try {
        let urlBase = ip.indexOf('http') === 0 ? ip : 'http://' + ip + ':' + porta;
        urlBase = urlBase.replace(/\/$/, '');

        const res = await fetch(urlBase + '/api/info-servidor', { mode: 'cors' });
        const data = await res.json();
        if (!data.ok) throw new Error('Servidor não respondeu');

        window.MT.tipoDispositivo = 'cliente';
        window.MT.ipServidor = ip;
        window.MT.portaServidor = porta;
        window.MT.clienteId = null;
        window.MT.basePadrao = false;
        await window.MT.salvar();

        return { ok: true, info: data };
    } catch (e) {
        return { ok: false, msg: 'Falha ao conectar: ' + e.message };
    }
};

window.MT.conectarViaId = async function (idAcesso, ip, porta) {
    ip = ip || window.MT.ipServidor || 'localhost';
    porta = porta || 3000;
    try {
        let urlBase = ip.indexOf('http') === 0 ? ip : 'http://' + ip + ':' + porta;
        urlBase = urlBase.replace(/\/$/, '');

        const res = await fetch(urlBase + '/api/info-servidor');
        const data = await res.json();

        if (!data.ok || data.idServidor !== idAcesso) throw new Error('ID do servidor não confere');

        window.MT.tipoDispositivo = 'cliente';
        window.MT.ipServidor = ip;
        window.MT.portaServidor = porta;
        window.MT.idAcesso = data.idServidor;
        window.MT.assinaturaAtiva = (data.assinaturaStatus === 'ativa' || data.assinaturaStatus === 'premium');
        await window.MT.salvar();

        return { ok: true, assinaturaStatus: data.assinaturaStatus };
    } catch (e) {
        return { ok: false, msg: 'Falha ao conectar: ' + e.message };
    }
};

// ------------------------------------------------------------
// REGISTRO DO TERMINAL
// ------------------------------------------------------------
window.MT.registrarTerminal = async function () {
    if (window.MT.idTerminal) return;

    let nome = 'Terminal';
    if (window.location.pathname === '/') nome = 'Gerente / Admin';
    else if (window.location.pathname === '/garcom') nome = 'Garçom';
    else if (window.location.pathname === '/caixa') nome = 'Caixa';
    else if (window.location.pathname.indexOf('/mesa/') === 0) nome = 'Cardápio (Mesa)';
    else nome = 'Atendente / Balcão';

    try {
        const base = window.MT.apiBase();
        const res = await fetch(base + '/api/registrar-terminal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome })
        });
        const data = await res.json();
        if (data.ok) {
            window.MT.idTerminal = data.idTerminal;
            await window.MT.salvar();
            console.log('✅ Terminal registrado:', data.idTerminal);
        }
    } catch (e) {
        console.warn('Erro ao registrar terminal:', e);
    }
};

// ------------------------------------------------------------
// DESCONECTAR
// ------------------------------------------------------------
window.MT.desconectar = async function () {
    window.MT.tipoDispositivo = 'unico';
    window.MT.ipServidor = '';
    window.MT.clienteId = null;
    window.MT.idAcesso = 'TEMP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    window.MT.basePadrao = true;
    window.MT.assinaturaAtiva = false;
    await window.MT.salvar();
};

// ------------------------------------------------------------
// INICIALIZAÇÃO
// ------------------------------------------------------------
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.MT.carregar());
} else {
    window.MT.carregar();
}