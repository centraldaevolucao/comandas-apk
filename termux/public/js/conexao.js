// ============================================================
// CONEXAO.JS — Gerenciador de conexão (LAN / Hotspot / Cloudflare)
//  • Lista de endereços do servidor com ordem de preferência: LAN > Hotspot > Cloudflare > Manual
//  • Escolhe o endereço pelo teste REAL (/api/ping), não pelo formato do IP
//  • Troca automática quando o endereço ativo cai (e volta ao melhor quando ele reaparece)
//  • Tempo real (SSE /api/eventos) com reconexão automática
//  • Cada gravação leva X-Op-Id: se a rede cair no meio e a gravação for repetida, o servidor não duplica
// ============================================================
console.log('✔ conexao.js carregado');

(function () {
    'use strict';

    const RANK = { lan: 1, hotspot: 2, cloudflare: 3, manual: 4 };
    const NOME = { lan: 'Rede local (Wi-Fi/cabo)', hotspot: 'Hotspot', cloudflare: 'Cloudflare (internet)', manual: 'Manual' };

    const CX = window.CX = {
        ativo: '',            // base URL em uso ('' = este próprio aparelho)
        ativoTipo: '',
        estado: 'local',      // local | conectado | reconectando | offline
        latencia: null,
        ultimoErro: '',
        ultimaTroca: null,
        tempoReal: 'parado',  // parado | conectado | reconectando
        log: [],
        nomeTipo: function (t) { return NOME[t] || t; }
    };

    function registrar(msg) {
        const linha = new Date().toLocaleTimeString('pt-BR') + ' ' + msg;
        CX.log.push(linha);
        if (CX.log.length > 80) CX.log.shift();
        console.log('[CX]', msg);
    }
    CX.registrar = registrar;

    // ---------- endereços ----------
    function tipoPeloEndereco(url) {
        if (/^https:\/\//i.test(url) || /trycloudflare\.com|cloudflare/i.test(url)) return 'cloudflare';
        const m = url.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)/);
        if (m) {
            // Faixas usuais de hotspot Android (192.168.43.x / 192.168.42.x / 172.20.10.x iPhone / 10.x)
            if (/^192\.168\.(43|42|44|45)\./.test(m[0]) || /^172\.20\.10\./.test(m[0])) return 'hotspot';
            return 'lan';
        }
        return 'manual';
    }
    CX.tipoPeloEndereco = tipoPeloEndereco;

    function normalizar(entrada, tipo) {
        let u = String(entrada || '').trim();
        if (!u) return null;
        if (!/^https?:\/\//i.test(u)) {
            u = u.replace(/\/.*$/, '');
            if (!/:\d+$/.test(u)) u += ':' + (window.PORTA_PADRAO || 3000);
            u = 'http://' + u;
        }
        u = u.replace(/\/+$/, '');
        return { url: u, tipo: tipo || tipoPeloEndereco(u) };
    }
    CX.normalizar = normalizar;

    /** Lista ordenada por preferência; inclui o ipServidor antigo como primeiro candidato. */
    CX.enderecos = function () {
        const mt = window.MT || {};
        let lista = Array.isArray(mt.enderecos) ? mt.enderecos.slice() : [];
        if (mt.ipServidor) {
            const legado = normalizar(mt.ipServidor);
            if (legado && !lista.some(function (e) { return e.url === legado.url; })) lista.push(legado);
        }
        lista = lista.map(function (e) { return normalizar(e.url, e.tipo); }).filter(Boolean);
        lista.sort(function (a, b) { return (RANK[a.tipo] || 9) - (RANK[b.tipo] || 9); });
        return lista;
    };

    CX.adicionar = async function (entrada, tipo) {
        const n = normalizar(entrada, tipo);
        if (!n) return false;
        const mt = window.MT;
        mt.enderecos = (mt.enderecos || []).filter(function (e) { return e.url !== n.url; });
        mt.enderecos.push(n);
        await mt.salvar();
        registrar('Endereço adicionado: ' + n.url + ' (' + n.tipo + ')');
        return true;
    };

    CX.remover = async function (url) {
        const mt = window.MT;
        mt.enderecos = (mt.enderecos || []).filter(function (e) { return e.url !== url; });
        if (mt.ipServidor && normalizar(mt.ipServidor) && normalizar(mt.ipServidor).url === url) mt.ipServidor = '';
        await mt.salvar();
        registrar('Endereço removido: ' + url);
    };

    // ---------- teste real ----------
    CX.testar = async function (url, ms) {
        const ctl = new AbortController();
        const t0 = performance.now();
        const timer = setTimeout(function () { ctl.abort(); }, ms || 3000);
        try {
            const r = await fetch(url + '/api/ping', { signal: ctl.signal, cache: 'no-store' });
            const j = await r.json();
            return { ok: !!(r.ok && j && j.ok), ms: Math.round(performance.now() - t0) };
        } catch (e) {
            return { ok: false, ms: null, erro: e.name === 'AbortError' ? 'tempo esgotado' : (e.message || 'sem resposta') };
        } finally { clearTimeout(timer); }
    };

    CX.testarTodos = async function () {
        const lista = CX.enderecos();
        return Promise.all(lista.map(async function (e) {
            const r = await CX.testar(e.url);
            return Object.assign({}, e, r);
        }));
    };

    function emitir() { window.dispatchEvent(new CustomEvent('cx:status', { detail: CX })); desenharPilula(); }

    /** Escolhe o melhor endereço que responde de verdade (na ordem de preferência). */
    let escolhendo = null;
    CX.escolher = function (motivo) {
        if (!escolhendo) escolhendo = escolherReal(motivo).finally(function () { escolhendo = null; });
        return escolhendo;
    };
    async function escolherReal(motivo) {
        const mt = window.MT || {};
        if (mt.tipoDispositivo !== 'cliente') { CX.ativo = ''; CX.estado = 'local'; emitir(); return ''; }
        const lista = CX.enderecos();
        if (!lista.length) { CX.estado = 'offline'; CX.ultimoErro = 'Nenhum endereço de servidor configurado'; emitir(); return ''; }
        CX.estado = CX.ativo ? 'reconectando' : 'reconectando'; emitir();
        for (let i = 0; i < lista.length; i++) {
            const r = await CX.testar(lista[i].url);
            if (r.ok) {
                const mudou = CX.ativo !== lista[i].url;
                CX.ativo = lista[i].url; CX.ativoTipo = lista[i].tipo; CX.latencia = r.ms;
                CX.estado = 'conectado'; CX.ultimoErro = '';
                if (mudou) { CX.ultimaTroca = new Date(); registrar('Usando ' + lista[i].url + ' (' + NOME[lista[i].tipo] + ', ' + r.ms + ' ms)' + (motivo ? ' — ' + motivo : '')); iniciarTempoReal(true); }
                emitir();
                return CX.ativo;
            }
            registrar('Sem resposta: ' + lista[i].url + ' (' + (r.erro || '') + ')');
        }
        CX.estado = 'offline'; CX.ultimoErro = 'Nenhum servidor respondeu'; emitir();
        return '';
    }

    // ---------- base da API (usada por MT.apiBase) ----------
    CX.base = function () {
        const mt = window.MT || {};
        if (mt.tipoDispositivo !== 'cliente') return '';
        if (CX.ativo) return CX.ativo;
        const l = CX.enderecos();
        return l.length ? l[0].url : '';
    };

    // ---------- chamadas com troca automática ----------
    function ehFalhaDeRede(e) { return e && (e.name === 'TypeError' || e.name === 'AbortError' || /Failed to fetch|NetworkError|Load failed/i.test(e.message || '')); }

    CX.fetch = async function (caminho, opcoes) {
        opcoes = opcoes || {};
        const tok = window.sessaoToken ? window.sessaoToken() : '';
        if (tok && (window.MT || {}).tipoDispositivo === 'cliente') { opcoes = Object.assign({}, opcoes, { headers: Object.assign({}, opcoes.headers || {}, { 'X-Session': tok }) }); }
        const tentar = function () { return fetch(CX.base() + caminho, opcoes); };
        try { return await tentar(); }
        catch (e) {
            if (!ehFalhaDeRede(e) || (window.MT || {}).tipoDispositivo !== 'cliente') throw e;
            registrar('Falha de rede em ' + caminho + ' — procurando outro endereço');
            const novo = await CX.escolher('falha em ' + caminho);
            if (!novo) throw e;
            return await fetch(CX.base() + caminho, opcoes);   // mesma X-Op-Id: o servidor não duplica
        }
    };

    // ---------- batimento (heartbeat) ----------
    let batimento = null;
    CX.iniciar = async function () {
        const mt = window.MT || {};
        if (batimento) { clearInterval(batimento); batimento = null; }
        if (mt.tipoDispositivo === 'cliente') {
            await CX.escolher('início');
            batimento = setInterval(async function () {
                if (CX.estado === 'offline' || !CX.ativo) { await CX.escolher('reconexão'); return; }
                const r = await CX.testar(CX.ativo, 2500);
                if (r.ok) {
                    CX.latencia = r.ms;
                    // Voltou um endereço melhor (ex.: saiu do hotspot e entrou na LAN)? Troca de volta.
                    const lista = CX.enderecos();
                    if (lista.length > 1 && lista[0].url !== CX.ativo) {
                        const m = await CX.testar(lista[0].url, 2000);
                        if (m.ok && (RANK[lista[0].tipo] || 9) < (RANK[CX.ativoTipo] || 9)) await CX.escolher('endereço preferido voltou');
                    }
                    if (CX.estado !== 'conectado') { CX.estado = 'conectado'; }
                    emitir();
                } else {
                    registrar('Endereço ativo parou de responder: ' + CX.ativo);
                    await CX.escolher('endereço ativo caiu');
                }
            }, 8000);
        } else {
            CX.estado = 'local'; emitir();
            // App Android em modo Servidor mas ainda escutando só em 127.0.0.1: corrige e reinicia (uma vez).
            try {
                const A = window.AndroidApp;
                if (A && A.redeInfo && !window.__semConfigLocal) {
                    const aberta = !!JSON.parse(A.redeInfo()).aberta, quer = mt.tipoDispositivo !== 'cliente';
                    if (quer !== aberta && !sessionStorage.getItem('cx-reinicio')) {
                        sessionStorage.setItem('cx-reinicio', '1');
                        registrar('Ajustando escuta de rede (' + (quer ? 'abrir' : 'fechar') + ') e reiniciando');
                        A.definirRede(quer); setTimeout(function () { A.reiniciarApp(); }, 600);
                        return;
                    }
                }
            } catch (e) { registrar('Ajuste de rede falhou: ' + e.message); }
            iniciarTempoReal(true);
        }
    };

    // ---------- tempo real (SSE) ----------
    let es = null, reTimer = null, debounce = null;
    function iniciarTempoReal(forcar) {
        if (typeof EventSource === 'undefined') return;
        if (window.__semConfigLocal && !(window.MT && window.MT.tipoDispositivo === 'cliente') && !forcar) { /* navegador web: também ouve */ }
        try { if (es) { es.close(); es = null; } } catch (e) {}
        const base = CX.base();
        try {
            es = new EventSource(base + '/api/eventos');
        } catch (e) { CX.tempoReal = 'parado'; return; }
        es.onopen = function () { CX.tempoReal = 'conectado'; emitir(); };
        es.onmessage = function (ev) {
            let d = {}; try { d = JSON.parse(ev.data); } catch (e) {}
            if (d.rev === undefined) return;
            window.dispatchEvent(new CustomEvent('dados:mudaram', { detail: d }));
            clearTimeout(debounce);
            debounce = setTimeout(function () { atualizarTelaViva(d); }, 500);
        };
        es.onerror = function () {
            CX.tempoReal = 'reconectando'; emitir();
            try { es.close(); } catch (e) {}
            clearTimeout(reTimer);
            reTimer = setTimeout(function () { iniciarTempoReal(true); }, 3000);   // reconexão automática
        };
    }
    CX.iniciarTempoReal = iniciarTempoReal;

    // Reserva: o túnel rápido da Cloudflare não passa SSE. Sem canal em tempo real, consulta a revisão a cada 4 s.
    let revVista = null;
    setInterval(async function () {
        if (CX.tempoReal === 'conectado' || document.hidden) return;
        const cli = window.MT && window.MT.tipoDispositivo === 'cliente';
        if (!((cli && CX.estado === 'conectado') || window.__semConfigLocal)) return;
        try {
            const j = await fetch(CX.base() + '/api/diagnostico', { cache: 'no-store' }).then(function (r) { return r.json(); });
            if (revVista !== null && j.rev !== revVista) {
                window.dispatchEvent(new CustomEvent('dados:mudaram', { detail: { rev: j.rev, recurso: j.ultimoRecurso } }));
                clearTimeout(debounce); debounce = setTimeout(function () { atualizarTelaViva(j); }, 300);
            }
            revVista = j.rev;
        } catch (e) {}
    }, 4000);

    const TELAS_VIVAS = ['cozinha', 'caixa', 'pdv', 'comandas', 'garcom', 'pedidos-pendentes', 'resumo-caixa'];
    function atualizarTelaViva(d) {
        const rota = (location.hash || '#pdv').substring(1);
        if (TELAS_VIVAS.indexOf(rota) < 0) return;
        if (document.querySelector('.modal-overlay')) return;                       // não atrapalha quem está num formulário
        const ae = document.activeElement;
        if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
        if (document.hidden) return;
        const alvo = document.querySelector('#app .content-area');
        const topo = alvo ? alvo.scrollTop : 0;
        if (typeof window.navigateTo === 'function') {
            window.__navPop = true;
            try { window.navigateTo(rota); } finally { window.__navPop = false; }
            const novo = document.querySelector('#app .content-area');
            if (novo) novo.scrollTop = topo;
        }
    }

    // ---------- indicador de conexão ----------
    function desenharPilula() {
        const mt = window.MT || {};
        let el = document.getElementById('cx-pilula');
        if (mt.tipoDispositivo !== 'cliente') { if (el) el.remove(); return; }
        if (!el) {
            el = document.createElement('div');
            el.id = 'cx-pilula';
            el.style.cssText = 'position:fixed;top:6px;right:8px;z-index:9998;padding:3px 9px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.3);';
            el.onclick = function () { if (window.menuConexao) window.menuConexao(CX.estado === 'offline'); else if (window.navigateTo) window.navigateTo('rede'); };
            document.body.appendChild(el);
        }
        const cor = { conectado: '#2e7d32', reconectando: '#f57c00', offline: '#c62828', local: '#546e7a' }[CX.estado] || '#546e7a';
        el.style.background = cor;
        el.textContent = CX.estado === 'conectado' ? ('● ' + (NOME[CX.ativoTipo] || 'Conectado')) :
                         CX.estado === 'reconectando' ? '● Reconectando…' : '● Sem servidor';
    }

    // inicia quando o MT terminar de carregar
    window.addEventListener('load', function () {
        let n = 0;
        const t = setInterval(function () {
            n++;
            if (window.MT && window.MT._carregado) { clearInterval(t); CX.iniciar(); }
            else if (n > 60) { clearInterval(t); CX.iniciar(); }
        }, 250);
    });
})();
