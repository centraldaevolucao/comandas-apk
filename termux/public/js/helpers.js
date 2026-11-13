// ============================================================
// HELPERS.JS — v26
// API + formatação + datas + status + som + PIX + Cores do Caixa
// ============================================================

console.log('✔ helpers.js v26 carregado');

// ---------- API ----------
window.getApiBase = function () {
    return window.MT ? window.MT.apiBase() : '';
};

window.apiGet = async function (recurso) {
    const caminho = window.MT ? window.MT.apiPath(recurso) : ('/api/' + recurso);
    const res = window.CX ? await window.CX.fetch(caminho) : await fetch(caminho);
    if (!res.ok) throw new Error('Erro ao buscar ' + recurso + ' (' + res.status + ')');
    return await res.json();
};

// Cada gravação leva um X-Op-Id: se a rede cair e a gravação for repetida, o servidor reconhece e não duplica.
window.novoOpId = function () {
    return (window.MT && window.MT.idTerminal ? window.MT.idTerminal : 'T') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
};

window.apiSave = async function (recurso, dados) {
    const caminho = window.MT ? window.MT.apiPath(recurso) : ('/api/' + recurso);
    const opcoes = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Op-Id': window.novoOpId() },
        body: JSON.stringify(dados)
    };
    const res = window.CX ? await window.CX.fetch(caminho, opcoes) : await fetch(caminho, opcoes);
    if (!res.ok) {
        if (res.status === 402) {   // assinatura: o servidor explica o motivo
            let msg = ''; try { msg = (await res.json()).error || ''; } catch (e) {}
            try { window.dispatchEvent(new CustomEvent('licenca:bloqueio', { detail: { msg: msg } })); } catch (e) {}
            throw new Error(msg || 'Recurso para assinantes');
        }
        throw new Error('Erro ao salvar ' + recurso + ' (' + res.status + ')');
    }
    return await res.json();
};

window.apiGetArray = async function (recurso) {
    try {
        const dados = await apiGet(recurso);
        return window.normalizarArray(dados);
    } catch (e) {
        console.warn('apiGetArray(' + recurso + ') falhou:', e.message);
        return [];
    }
};

// ============================================================
// NORMALIZADORES
// ============================================================
window.normalizarArray = function (valor) {
    if (Array.isArray(valor)) return valor;
    if (!valor || typeof valor !== 'object') return [];

    const chaves = Object.keys(valor);
    if (chaves.length > 0 && chaves.every(function (k) { return /^\d+$/.test(k); })) {
        return chaves.sort(function (a, b) { return Number(a) - Number(b); })
            .map(function (k) { return valor[k]; });
    }

    if (Array.isArray(valor.items))    return valor.items;
    if (Array.isArray(valor.itens))    return valor.itens;
    if (Array.isArray(valor.data))     return valor.data;
    if (Array.isArray(valor.rows))     return valor.rows;
    if (Array.isArray(valor.lista))    return valor.lista;
    if (Array.isArray(valor.comandas)) return valor.comandas;
    if (Array.isArray(valor.produtos)) return valor.produtos;
    if (Array.isArray(valor.clientes)) return valor.clientes;
    return [];
};

window.normalizarComanda = function (c) {
    if (!c || typeof c !== 'object') return c;
    c.itens = window.normalizarArray(c.itens);
    c.pagamentos = window.normalizarArray(c.pagamentos);
    return c;
};

// ============================================================
// FORMATAÇÃO
// ============================================================
window.formatMoney = function (valor) {
    return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
};

window.line = function () {
    return Array.prototype.slice.call(arguments).join('\n');
};

// ============================================================
// DATA
// ============================================================
window.hojeDate = function () {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

window.parseDataBR = function (str) {
    if (!str) return null;
    const partes = String(str).trim().split(' ');
    const data = partes[0] || '';
    const hora = partes[1] || '00:00';
    const d = data.split('/');
    if (d.length !== 3) return null;
    const h = hora.split(':');
    return new Date(
        parseInt(d[2], 10),
        parseInt(d[1], 10) - 1,
        parseInt(d[0], 10),
        parseInt(h[0] || 0, 10),
        parseInt(h[1] || 0, 10)
    );
};

window.isHoje = function (str) {
    const data = window.parseDataBR(str);
    if (!data) return false;
    const hoje = window.hojeDate();
    return data.getFullYear() === hoje.getFullYear() &&
           data.getMonth() === hoje.getMonth() &&
           data.getDate() === hoje.getDate();
};

window.isEntre = function (str, dataIni, dataFim) {
    const data = window.parseDataBR(str);
    if (!data) return false;
    if (dataIni) {
        const ini = new Date(dataIni.getFullYear(), dataIni.getMonth(), dataIni.getDate());
        if (data < ini) return false;
    }
    if (dataFim) {
        const fim = new Date(dataFim.getFullYear(), dataFim.getMonth(), dataFim.getDate(), 23, 59, 59);
        if (data > fim) return false;
    }
    return true;
};

// ============================================================
// STATUS DE COMANDA
// ============================================================
window.statusComandaNormalizado = function (c) {
    if (!c) return '';
    const st = String(c.status || '').toLowerCase();
    if (st === 'balcao' || st === 'viagem') return 'aberta';
    return st;
};

window.comandaEstaAtiva = function (c) {
    if (!c) return false;
    const st = window.statusComandaNormalizado(c);
    return st === 'aberta' || st === 'delivery';
};

window.comandaEstaFechada = function (c) {
    return !!c && window.statusComandaNormalizado(c) === 'fechada';
};

window.comandaEstaCancelada = function (c) {
    return !!c && window.statusComandaNormalizado(c) === 'cancelada';
};

// ============================================================
// CLIENTE / FIADO
// ============================================================
window.normalizarTexto = function (s) { return String(s || '').trim().toLowerCase(); };
window.normalizarCPF = function (cpf) { return String(cpf || '').replace(/\D/g, ''); };

window.temClienteIdentificado = function (c) {
    if (!c) return false;
    return !!(c.clienteId || window.normalizarCPF(c.clienteCpf) || window.normalizarTexto(c.cliente));
};

window.clienteEstaCadastrado = function (c) {
    if (!c) return false;
    return !!(c.clienteId || window.normalizarCPF(c.clienteCpf));
};

window.comandaTemFiado = function (c) {
    if (!c) return false;
    return c.pagamentoPendente === true && Number(c.valorPendente || 0) > 0;
};

window.mesmoCliente = function (c1, c2) {
    if (!c1 || !c2) return false;
    const id1 = c1.clienteId || null;
    const id2 = c2.clienteId || null;
    if (id1 && id2 && String(id1) === String(id2)) return true;
    const cpf1 = window.normalizarCPF(c1.clienteCpf);
    const cpf2 = window.normalizarCPF(c2.clienteCpf);
    if (cpf1 && cpf2 && cpf1 === cpf2) return true;
    const nome1 = window.normalizarTexto(c1.cliente);
    const nome2 = window.normalizarTexto(c2.cliente);
    if (nome1 && nome2 && nome1 === nome2) return true;
    return false;
};

// ============================================================
// CORES DO CAIXA
// ============================================================
window.CORES_CAIXA_PADRAO = [
    { id: 'amarelo',  hex: '#fbc02d', label: 'Amarelo' },
    { id: 'laranja',  hex: '#ff9800', label: 'Laranja' },
    { id: 'azul',     hex: '#1976d2', label: 'Azul' },
    { id: 'vermelho', hex: '#c62828', label: 'Vermelho' }
];

// Inicializa com o padrão por segurança
window.CORES_CAIXA = window.CORES_CAIXA_PADRAO;

// Função assíncrona para carregar as cores personalizadas do banco
window.carregarCoresCaixa = async function() {
    try {
        const config = window.normalizarArray(await apiGet('configuracoes'))[0] || {};
        if (config.coresCaixa && Array.isArray(config.coresCaixa) && config.coresCaixa.length > 0) {
            window.CORES_CAIXA = config.coresCaixa;
        } else {
            window.CORES_CAIXA = window.CORES_CAIXA_PADRAO;
        }
    } catch (e) {
        window.CORES_CAIXA = window.CORES_CAIXA_PADRAO;
    }
};

// Emoji por cor (para uso em WhatsApp / textos)
window.EMOJI_COR_CAIXA = {
    amarelo:  '🟡',
    laranja:  '🟠',
    azul:     '🔵',
    vermelho: '🔴',
    verde:    '🟢',
    roxo:     '🟣'
};

/**
 * Retorna a cor (objeto {id,hex,label}) de uma comanda
 */
window.obterCorCaixaDaComanda = async function (c) {
    if (!c) return null;
    // sempre usa os nomes atuais dos Grupos de Trabalho (ex.: "Cantina Vermelha"), não o padrão "Vermelho"
    try { await window.carregarCoresCaixa(); } catch (e) {}

    if (c.corGrupo) {
        const cor = (window.CORES_CAIXA || []).find(function (x) { return x.id === c.corGrupo; });
        if (cor) return cor;
        return {
            id: c.corGrupo,
            hex: '#666',
            label: String(c.corGrupo).charAt(0).toUpperCase() + String(c.corGrupo).slice(1)
        };
    }

    if (c.caixaId) {
        try {
            const caixaAtual = await apiGet('caixaAtual');
            const caixa = Array.isArray(caixaAtual)
                ? caixaAtual[0]
                : (caixaAtual && caixaAtual.status ? caixaAtual : null);
            if (caixa && String(caixa.id) === String(c.caixaId) && caixa.cor) {
                const cor = (window.CORES_CAIXA || []).find(function (x) { return x.id === caixa.cor; });
                if (cor) return cor;
                return {
                    id: caixa.cor,
                    hex: '#666',
                    label: String(caixa.cor).charAt(0).toUpperCase() + String(caixa.cor).slice(1)
                };
            }
        } catch (e) {}
    }

    return null;
};

window.obterCorCaixaSincrona = function (c) {
    if (!c || !c.corGrupo) return null;
    const cor = (window.CORES_CAIXA || []).find(function (x) { return x.id === c.corGrupo; });
    if (cor) return cor;
    return {
        id: c.corGrupo,
        hex: '#666',
        label: String(c.corGrupo).charAt(0).toUpperCase() + String(c.corGrupo).slice(1)
    };
};

window.comandaPertenceAoCaixa = function (c, caixaId) {
    if (!c || !caixaId) return false;
    const cid = String(c.caixaId == null ? '' : c.caixaId).trim();
    if (!cid || cid === 'null' || cid === 'undefined' || cid === '0') return false;
    return cid === String(caixaId);
};

// ============================================================
// TOAST
// ============================================================
window.mostrarToast = function (mensagem) {
    const anterior = document.querySelector('.toast-cliente');
    if (anterior) anterior.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-cliente';
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(function () {
        toast.style.opacity = '0';
        setTimeout(function () { toast.remove(); }, 300);
    }, 2000);
};

// ============================================================
// DETECÇÃO DE DISPOSITIVO
// ============================================================
window.detectarDispositivo = function () {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
    const isTablet = /ipad|tablet|playbook|silk/i.test(ua) || (isMobile && !/mobile/i.test(ua));
    if (isTablet) return { tipo: 'tablet',  icone: 'fa-tablet-alt', label: 'Tablet' };
    if (isMobile) return { tipo: 'celular', icone: 'fa-mobile-alt', label: 'Celular' };
    return { tipo: 'pc', icone: 'fa-desktop', label: 'Computador' };
};

// ============================================================
// SOM
// ============================================================
window.tocarSomNotificacao = function () {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
};

// ============================================================
// GERADOR DE PIX COM VALOR DINÂMICO
// ============================================================
window.gerarPixComValor = function (payloadEstatico, valor) {
    if (!valor || isNaN(valor) || valor <= 0) return payloadEstatico;

    const valorStr = Number(valor).toFixed(2);
    const valorLen = String(valorStr.length).padStart(2, '0');

    let base = String(payloadEstatico).trim();

    if (base.endsWith('6304' + base.slice(-4))) {
        base = base.slice(0, -8);
    } else if (base.endsWith('6304')) {
        base = base.slice(0, -4);
    } else {
        base = base.slice(0, -4);
    }

    base = base.replace(/54\d{2}\d+(\.\d{2})?/, '');

    const posPais = base.indexOf('5802BR');
    if (posPais !== -1) {
        base = base.slice(0, posPais) + '54' + valorLen + valorStr + base.slice(posPais);
    } else {
        base += '54' + valorLen + valorStr;
    }

    base += '6304';

    return base + calcularCRC16(base);
};

function calcularCRC16(str) {
    let crc = 0xFFFF;
    for (let c = 0; c < str.length; c++) {
        crc ^= str.charCodeAt(c) << 8;
        for (let i = 0; i < 8; i++) {
            if ((crc & 0x8000) > 0) crc = (crc << 1) ^ 0x1021;
            else crc = crc << 1;
        }
        crc &= 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

console.log('✔ helpers.js v26 — pronto');

// ============================================================
// CAIXA ATUAL + NUMERAÇÃO DE COMANDAS
// ============================================================
window.obterCaixaAbertoAtual = async function () {
    try {
        const bruto = await apiGet('caixaAtual');
        const c = Array.isArray(bruto) ? bruto[0] : bruto;
        return (c && c.status === 'aberto') ? c : null;
    } catch (e) { return null; }
};

/** Comanda faz parte do caixa atual? (mesmo caixaId; comandas de outro caixa/cor ou de dias anteriores ficam de fora) */
window.comandaDoCaixaAtual = function (c, caixa) {
    if (!c || !caixa) return false;
    return window.comandaPertenceAoCaixa(c, caixa.id);
};

/**
 * Sugere o número da próxima comanda:
 *  • "Reiniciar em 1 a cada abertura de caixa" ligado → maior número do caixa atual + 1 (caixa novo = 1)
 *  • numeração automática ligada → contador das Configurações (pulando números de comandas ativas)
 *  • desligada → maior número do dia + 1
 * Sem zero à esquerda ("1", "2", ...).
 */
window.sugerirNumeroComanda = async function () {
    const cfg = (window.normalizarArray(await apiGet('configuracoes').catch(function () { return []; }))[0]) || {};
    const comandas = window.normalizarArray(await apiGet('comandas').catch(function () { return []; }));
    const caixa = await window.obterCaixaAbertoAtual();
    const numeros = function (lista) {
        return lista.map(function (c) { return parseInt(String(c.numero).replace(/\D/g, ''), 10); })
            .filter(function (n) { return isFinite(n); });
    };
    const maior = function (lista) { const n = numeros(lista); return n.length ? Math.max.apply(null, n) : 0; };

    if (cfg.reiniciarNumeracaoNoCaixa === true && caixa) {
        return String(maior(comandas.filter(function (c) { return window.comandaDoCaixaAtual(c, caixa); })) + 1);
    }
    if (cfg.numeracaoAutomaticaComandas !== false) {
        let n = Math.max(1, parseInt(cfg.proximoNumeroComanda, 10) || 1);
        const ativos = {};
        comandas.filter(window.comandaEstaAtiva).forEach(function (c) { ativos[String(c.numero)] = true; });
        while (ativos[String(n)]) n++;
        return String(n);
    }
    return String(maior(comandas.filter(function (c) { return window.isHoje(c.dataAbertura); })) + 1);
};

/** Avança o contador das Configurações depois que uma comanda é criada com aquele número. */
window.registrarNumeroComanda = async function (numero) {
    try {
        const n = parseInt(String(numero).replace(/\D/g, ''), 10);
        if (!isFinite(n)) return;
        const arr = window.normalizarArray(await apiGet('configuracoes'));
        const cfg = arr[0] || {};
        if (cfg.numeracaoAutomaticaComandas === false || cfg.reiniciarNumeracaoNoCaixa === true) return;
        if (n >= (parseInt(cfg.proximoNumeroComanda, 10) || 1)) {
            cfg.proximoNumeroComanda = n + 1;
            await apiSave('configuracoes', [cfg]);
        }
    } catch (e) { console.warn('registrarNumeroComanda:', e); }
};


// ============================================================
// PAGAMENTOS LÍQUIDOS (desconta o TROCO do dinheiro)
// pagamentos[] guarda o valor ENTREGUE pelo cliente; o troco fica em c.troco.
// Somar p.valor direto inflava o dinheiro do caixa. Use esta função em qualquer soma por forma.
// ============================================================
window.pagamentosLiquidos = function (c) {
    const lista = window.normalizarArray(c && c.pagamentos).map(function (p) { return Object.assign({}, p, { valor: Number(p.valor || 0) }); });
    let troco = Number(c && c.troco || 0);
    if (troco > 0) {
        // o troco sai do dinheiro (é a única forma que devolve troco)
        lista.filter(function (p) { return p.forma === 'dinheiro'; }).forEach(function (p) {
            const d = Math.min(troco, p.valor);
            p.valor -= d; p.trocoDescontado = d; troco -= d;
        });
    }
    return lista;
};

/** Totais por forma de uma lista de comandas: { dinheiro:{total,qtd}, debito:..., credito:..., pix:..., outros:..., geral } */
window.totaisPorForma = function (comandas) {
    const t = { dinheiro: { total: 0, qtd: 0 }, debito: { total: 0, qtd: 0 }, credito: { total: 0, qtd: 0 }, pix: { total: 0, qtd: 0 }, outros: { total: 0, qtd: 0 }, geral: 0, troco: 0 };
    (comandas || []).forEach(function (c) {
        t.troco += Number(c.troco || 0);
        window.pagamentosLiquidos(c).forEach(function (p) {
            const k = t[p.forma] && typeof t[p.forma] === 'object' ? p.forma : 'outros';
            t[k].total += p.valor; t[k].qtd++; t.geral += p.valor;
        });
    });
    return t;
};

// ============================================================
// CHAVE PIX FIXA (CPF / CNPJ / Celular / E-mail / Aleatória) — validação e BR Code
// ============================================================
window.pixSoDigitos = function (v) { return String(v || '').replace(/\D/g, ''); };

window.pixValidarCPF = function (v) {
    const c = window.pixSoDigitos(v);
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (let t = 9; t < 11; t++) {
        let s = 0; for (let i = 0; i < t; i++) s += parseInt(c[i], 10) * (t + 1 - i);
        if (((s * 10) % 11) % 10 !== parseInt(c[t], 10)) return false;
    }
    return true;
};
window.pixValidarCNPJ = function (v) {
    const c = window.pixSoDigitos(v);
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const calc = function (n) {
        const pesos = n === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
        let s = 0; for (let i = 0; i < n; i++) s += parseInt(c[i], 10) * pesos[i];
        const r = s % 11; return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === parseInt(c[12], 10) && calc(13) === parseInt(c[13], 10);
};

/** Devolve {ok, chave (formato aceito pelo PIX), msg}. */
window.pixValidarChave = function (tipo, valor) {
    valor = String(valor || '').trim();
    if (!valor) return { ok: false, msg: 'Informe a chave PIX.' };
    if (tipo === 'cpf')  return window.pixValidarCPF(valor)  ? { ok: true, chave: window.pixSoDigitos(valor) } : { ok: false, msg: 'CPF inválido.' };
    if (tipo === 'cnpj') return window.pixValidarCNPJ(valor) ? { ok: true, chave: window.pixSoDigitos(valor) } : { ok: false, msg: 'CNPJ inválido.' };
    if (tipo === 'celular') {
        let d = window.pixSoDigitos(valor);
        if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
        if (!/^[1-9]\d9\d{8}$/.test(d) && !/^[1-9]\d[2-5]\d{7}$/.test(d)) return { ok: false, msg: 'Celular inválido. Use DDD + número (ex.: 11 91234-5678).' };
        return { ok: true, chave: '+55' + d };
    }
    if (tipo === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor) || valor.length > 77) return { ok: false, msg: 'E-mail inválido.' };
        return { ok: true, chave: valor.toLowerCase() };
    }
    if (tipo === 'aleatoria') {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor) ? { ok: true, chave: valor.toLowerCase() } : { ok: false, msg: 'Chave aleatória inválida (formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).' };
    }
    return { ok: false, msg: 'Escolha o tipo da chave.' };
};

window.pixFormatarChave = function (tipo, chave) {
    const d = window.pixSoDigitos(chave);
    if (tipo === 'cpf' && d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (tipo === 'cnpj' && d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (tipo === 'celular') { const n = d.replace(/^55/, ''); return n.length === 11 ? n.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : (n.length === 10 ? n.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3') : chave); }
    return chave;
};

/** Monta o PIX "copia e cola" estático (BR Code) a partir da chave. O valor é acrescentado depois por gerarPixComValor. */
window.pixMontarPayload = function (chave, nome, cidade) {
    const semAcento = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').trim().toUpperCase(); };
    const campo = function (id, v) { return id + String(v.length).padStart(2, '0') + v; };
    const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
    let p = campo('00', '01') + campo('26', conta) + campo('52', '0000') + campo('53', '986') + '5802BR' +
        campo('59', (semAcento(nome) || 'RESTAURANTE').slice(0, 25)) + campo('60', (semAcento(cidade) || 'BRASIL').slice(0, 15)) +
        campo('62', campo('05', '***'));
    p += '6304';
    return p + calcularCRC16(p);
};


// ============================================================
// IMAGEM DO DISPOSITIVO (logo / ícone): abre o seletor de arquivos, reduz e devolve um data URL
// ============================================================
window.escolherImagemDoDispositivo = function (maxLado, aoEscolher) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = function () {
        const f = inp.files && inp.files[0];
        inp.remove();
        if (!f) return;
        if (!/^image\//.test(f.type)) { alert('Escolha um arquivo de imagem (PNG, JPG, WebP ou SVG).'); return; }
        if (f.size > 8 * 1024 * 1024) { alert('Imagem muito grande (máximo 8 MB).'); return; }
        const leitor = new FileReader();
        leitor.onerror = function () { alert('Não foi possível ler a imagem.'); };
        leitor.onload = function () {
            if (f.type === 'image/svg+xml') { aoEscolher(leitor.result); return; }
            const img = new Image();
            img.onerror = function () { alert('Imagem inválida.'); };
            img.onload = function () {
                const esc = Math.min(1, maxLado / Math.max(img.width, img.height));
                const cv = document.createElement('canvas');
                cv.width = Math.max(1, Math.round(img.width * esc));
                cv.height = Math.max(1, Math.round(img.height * esc));
                cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                // PNG preserva transparência (logo); JPEG só se ficar bem menor
                let out = cv.toDataURL('image/png');
                if (out.length > 300000) out = cv.toDataURL('image/jpeg', 0.85);
                aoEscolher(out);
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(f);
    };
    inp.click();
};

// ícone do estabelecimento como favicon
window.aplicarIconeApp = function (url) {
    if (!url) return;
    try {
        let l = document.querySelector('link[rel="icon"]');
        if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
        l.href = url;
    } catch (e) {}
};
(function () {
    window.addEventListener('load', function () {
        setTimeout(function () {
            if (typeof window.apiGet !== 'function') return;
            window.apiGet('configuracoes').then(function (a) {
                const c = (window.normalizarArray ? window.normalizarArray(a) : a)[0] || {};
                if (c.urlIcone) window.aplicarIconeApp(c.urlIcone);
            }).catch(function () {});
        }, 1500);
    });
})();


// Lê um "copia e cola" PIX (BR Code) e devolve {chave, tipo, nome, cidade, valor} ou null.
window.pixLerPayload = function (txt) {
    txt = String(txt || '').trim();
    if (!/^000201/.test(txt)) return null;
    const tlv = function (str) {
        const o = {}; let i = 0;
        while (i + 4 <= str.length) {
            const id = str.substr(i, 2), n = parseInt(str.substr(i + 2, 2), 10);
            if (isNaN(n) || i + 4 + n > str.length) break;
            o[id] = str.substr(i + 4, n); i += 4 + n;
        }
        return o;
    };
    const t = tlv(txt);
    let chave = '';
    ['26', '27', '28', '29'].forEach(function (k) { if (!chave && t[k]) { const c = tlv(t[k]); if (/br\.gov\.bcb\.pix/i.test(c['00'] || '')) chave = c['01'] || ''; } });
    let tipo = '';
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(chave)) tipo = 'aleatoria';
    else if (/@/.test(chave)) tipo = 'email';
    else if (/^\+55\d{10,11}$/.test(chave)) tipo = 'celular';
    else if (/^\d{11}$/.test(chave)) tipo = window.pixValidarCPF(chave) ? 'cpf' : 'celular';
    else if (/^\d{14}$/.test(chave)) tipo = 'cnpj';
    return { chave: chave, tipo: tipo, nome: t['59'] || '', cidade: t['60'] || '', valor: t['54'] || '', payload: txt };
};

// Lê o QR Code de uma imagem escolhida no aparelho; devolve o texto (ou '' se não achou).
window.lerQrDeImagem = async function (dataUrl) {
    try { if (window.AndroidApp && window.AndroidApp.lerQr) { const r = String(window.AndroidApp.lerQr(dataUrl) || ''); if (r) return r; } } catch (e) {}
    try {
        if ('BarcodeDetector' in window) {
            const img = new Image(); img.src = dataUrl; await img.decode();
            const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(img);
            if (r && r[0]) return r[0].rawValue || '';
        }
    } catch (e) {}
    return '';
};


// ============================================================
// IMAGEM de um elemento (print do recibo/comanda) e compartilhamento
// ============================================================
window.elementoParaPng = async function (el) {
    const w = Math.ceil(el.scrollWidth || el.offsetWidth), h = Math.ceil(el.scrollHeight || el.offsetHeight);
    const clone = el.cloneNode(true);
    // imagens (QR, logo) viram data URL para entrarem no desenho
    const origs = el.querySelectorAll('img'), clones = clone.querySelectorAll('img');
    for (let i = 0; i < origs.length; i++) {
        try {
            const o = origs[i];
            if (!o.complete) await new Promise(function (r) { o.onload = o.onerror = r; });
            const cv = document.createElement('canvas');
            cv.width = o.naturalWidth || o.width; cv.height = o.naturalHeight || o.height;
            cv.getContext('2d').drawImage(o, 0, 0);
            clones[i].setAttribute('src', cv.toDataURL('image/png'));
        } catch (e) {}
    }
    clone.style.width = w + 'px';
    clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    const xml = new XMLSerializer().serializeToString(clone);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '"><foreignObject width="100%" height="100%">' + xml + '</foreignObject></svg>';
    const img = new Image();
    await new Promise(function (ok, err) { img.onload = ok; img.onerror = function () { err(new Error('render')); }; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const esc = 2, cv = document.createElement('canvas');
    cv.width = w * esc; cv.height = h * esc;
    const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.scale(esc, esc); g.drawImage(img, 0, 0);
    return cv.toDataURL('image/png');
};

/** Compartilha uma imagem (data URL PNG). No app abre o WhatsApp/lista de apps; no navegador usa o compartilhar do sistema ou baixa o arquivo. */
window.compartilharImagem = async function (dataUrl, nome, texto, telefone, modo) {
    const b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
    if (modo === 'outros' && window.AndroidApp && window.AndroidApp.compartilharImagemOutros) {
        window.AndroidApp.compartilharImagemOutros(nome, b64, texto || '');
        return true;
    }
    if (window.AndroidApp && window.AndroidApp.compartilharImagem) {
        // com telefone: abre direto a conversa desse número no WhatsApp (mesmo que não esteja na agenda)
        try { window.AndroidApp.compartilharImagem(nome, b64, texto || '', telefone || ''); }
        catch (e) { window.AndroidApp.compartilharImagem(nome, b64, texto || ''); }
        return true;
    }
    try {
        const blob = await (await fetch(dataUrl)).blob();
        const f = new File([blob], nome, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: texto || '' }); return true; }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); a.remove();
        return true;
    } catch (e) { return false; }
};


/** Soma dos pagamentos em PIX da comanda (o QR só aparece com PIX e leva só esse valor). */
window.pixValorPago = function (c) {
    const a = (window.normalizarArray ? window.normalizarArray(c && c.pagamentos) : ((c && c.pagamentos) || []));
    return Math.round(a.filter(function (p) { return p && p.forma === 'pix'; }).reduce(function (t, p) { return t + (Number(p.valor) || 0); }, 0) * 100) / 100;
};

/** Opções de QR do PIX: 'impressao' (recibo/comanda impressos) e 'whatsapp' (imagem enviada). */
window.pixQrAtivo = function (config, destino, tipo) {
    // destino: 'impressao' (visualização/Bluetooth) | 'whatsapp' (WhatsApp direto ao cliente cadastrado) | 'compartilhar' (terceiros)
    if (!config || !config.pixRestaurante) return false;
    const T = tipo === 'pendencia' ? 'Pendencia' : (tipo === 'recibo' ? 'Recibo' : 'Comanda');
    if (tipo === 'pendencia') {   // padrão: ligado
        const k = destino === 'impressao' ? 'Imp' : (destino === 'compartilhar' ? 'Compart' : 'Zap');
        return config['pixQr' + T + k] !== false;
    }
    if (tipo) {
        if (destino === 'impressao') { if (config['pixQr' + T + 'Imp'] !== undefined) return config['pixQr' + T + 'Imp'] === true; }
        else if (destino === 'compartilhar') { if (config['pixQr' + T + 'Compart'] !== undefined) return config['pixQr' + T + 'Compart'] === true; }
        else { // whatsapp direto: cai na opção de compartilhar se ainda não existir a própria
            if (config['pixQr' + T + 'Zap'] !== undefined) return config['pixQr' + T + 'Zap'] === true;
            if (config['pixQr' + T + 'Compart'] !== undefined) return config['pixQr' + T + 'Compart'] === true;
        }
    }
    if (destino === 'whatsapp' || destino === 'compartilhar') return config.pixQrWhatsapp === true;
    return (config.pixQrImpressao !== undefined ? config.pixQrImpressao : config.exibirPixRecibo) === true;
};

/** Telefone (só dígitos, com 55) do cliente da comanda; se não houver, pergunta (nova conversa no WhatsApp). */
window.telefoneWhatsApp = async function (c, perguntar) {
    let tel = '';
    try {
        const clientes = window.normalizarArray(await apiGet('clientes'));
        const nome = String(c.cliente || '').trim().toLowerCase();
        const cli = clientes.find(function (x) { return (c.clienteId && String(x.id) === String(c.clienteId)) || (nome && String(x.nome || '').trim().toLowerCase() === nome); });
        if (cli && cli.telefone) tel = String(cli.telefone);
    } catch (e) {}
    if (!tel && c.clienteTelefone) tel = String(c.clienteTelefone);   // telefone informado na própria comanda
    if (!tel && perguntar && window.perguntar) {
        const r = await window.perguntar('Cliente sem telefone cadastrado. Informe o número com DDD para iniciar uma nova conversa no WhatsApp (ou deixe em branco para escolher o contato):', '', { tipo: 'tel' });
        if (r) tel = String(r);
    }
    tel = tel.replace(/\D/g, '');
    if (tel && !tel.startsWith('55') && tel.length <= 11) tel = '55' + tel;
    return tel.length >= 12 ? tel : '';
};


// Fonte das impressões (tela, impressão comum e térmica Bluetooth)
window.IMP_FONTES = {
    padrao: { nome: 'Padrão (sem serifa)', css: "'Segoe UI',Tahoma,Geneva,Verdana,sans-serif" },
    mono: { nome: 'Cupom (monoespaçada)', css: "'Courier New',Courier,monospace" },
    serif: { nome: 'Serifada', css: "Georgia,'Times New Roman',serif" },
    condensada: { nome: 'Condensada', css: "'Arial Narrow','Roboto Condensed',Arial,sans-serif" }
};
window.impFonte = function (config) {
    config = config || {};
    const tipo = window.IMP_FONTES[config.impFonteTipo] ? config.impFonteTipo : 'padrao';
    let tam = parseInt(config.impFonteTam, 10);
    if (!(tam >= 70 && tam <= 200)) tam = config.fonteImpressaoGrande ? 125 : 100;   // compatível com o antigo "fonte grande"
    const k = tam / 100;
    return { tipo: tipo, tam: tam, family: window.IMP_FONTES[tipo].css,
        // CSS para o <body> de uma página de impressão de 300px: aumenta o texto e mantém a largura do papel
        css: 'body{font-family:' + window.IMP_FONTES[tipo].css + ' !important;zoom:' + k + ';max-width:' + Math.round(300 / k) + 'px !important;}',
        escAlto: tam >= 120, escFonteB: tipo === 'condensada' };
};
