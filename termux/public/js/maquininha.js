/* Integração com maquininha de cartão — camada única para vários provedores.
   Provedores: nenhuma | manual | simulado | mercadopago (API Point, via servidor) |
               cielolio | stone | sumup (deeplink Android; retorno por esquema "comandaspay://").
   window.maquininhaCobrar({valor, forma, ref, descricao}) → Promise<{ok, ...dados}|null>  (null = cancelado) */
(function () {
    'use strict';
    const COR = '#C2185B';
    const Z = 300000;
    const NOMES = { nenhuma: 'Nenhuma (informar valor apenas)', manual: 'Registro manual (qualquer maquininha)', mercadopago: 'Mercado Pago Point (API)', cielolio: 'Cielo LIO (app)', stone: 'Stone (app)', sumup: 'SumUp (app)', simulado: 'Simulado (somente testes)' };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const dinheiro = function (v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

    // Lista de maquininhas (config.maquininhas). A configuração antiga (uma só) é convertida automaticamente.
    function lerMaquinas(cfg) {
        cfg = cfg || {};
        if (Array.isArray(cfg.maquininhas)) return cfg.maquininhas.slice();
        const o = cfg.maquininha;
        if (o && o.provider && o.provider !== 'nenhuma') return [Object.assign({ id: 'mq-1', nome: NOMES[o.provider] ? NOMES[o.provider].split(' (')[0] : 'Maquininha', ativa: true }, o)];
        return [];
    }
    window.maquininhasLista = async function () {
        try { const a = window.normalizarArray(await apiGet('configuracoes')); return lerMaquinas(a[0]); } catch (e) { return []; }
    };
    window.maquininhaConfig = async function () { const l = await window.maquininhasLista(); return l[0] || {}; };
    window.maquininhaAtiva = async function () { const l = (await window.maquininhasLista()).filter(function (m) { return m.ativa !== false; }); return l.length ? l[0].provider : null; };

    // Quais máquinas podem receber: as ativas; se o garçom tem máquinas registradas, só as dele (ativas); senão todas as ativas do caixa.
    window.maquininhasDisponiveis = async function (garcomNome) {
        const ativas = (await window.maquininhasLista()).filter(function (m) { return m.ativa !== false; });
        if (!ativas.length || !garcomNome) return ativas;
        let col = null;
        try { const cs = window.normalizarArray(await apiGet('colaboradores')); const n = String(garcomNome).trim().toLowerCase(); col = cs.find(function (x) { return String(x.nome || '').trim().toLowerCase() === n; }); } catch (e) {}
        const ids = (col && Array.isArray(col.maquininhas)) ? col.maquininhas.map(String) : [];
        const dele = ativas.filter(function (m) { return ids.indexOf(String(m.id)) >= 0; });
        return dele.length ? dele : ativas;
    };

    // Pergunta em qual máquina o pagamento (débito/crédito/PIX) será recebido. null = cancelou; false = nenhuma máquina configurada.
    window.maquininhaEscolher = function (forma, garcomNome) {
        return window.maquininhasDisponiveis(garcomNome).then(function (lista) {
            if (!lista.length) return false;
            if (lista.length === 1) return lista[0];
            return new Promise(function (resolve) {
                const rot = { debito: 'Débito', credito: 'Crédito', pix: 'PIX' }[forma] || forma;
                const ov = overlay(topo('Receber em qual maquininha?') +
                    '<div style="padding:14px 16px;overflow-y:auto;"><div style="color:#555;font-size:.85rem;margin-bottom:8px;">Pagamento em <b>' + esc(rot) + '</b>. Escolha a maquininha:</div>' +
                    lista.map(function (m, i) { return '<button data-i="' + i + '" class="btn-outline" style="width:100%;text-align:left;margin-bottom:8px;padding:12px;"><i class="fas fa-credit-card" style="color:' + COR + ';"></i> <b>' + esc(m.nome || 'Maquininha') + '</b><br><small style="color:#777;">' + esc((NOMES[m.provider] || m.provider || '')) + '</small></button>'; }).join('') +
                    '</div><div style="padding:0 16px 16px;"><button data-can class="btn-outline" style="width:100%;">Cancelar</button></div>');
                ov.querySelectorAll('[data-i]').forEach(function (b) { b.onclick = function () { ov.remove(); resolve(lista[parseInt(b.dataset.i)]); }; });
                ov.querySelector('[data-can]').onclick = function () { ov.remove(); resolve(null); };
            });
        });
    };

    function overlay(html) {
        const ov = document.createElement('div');
        ov.className = 'maq-overlay';
        ov.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:' + Z + ';padding:16px;';
        ov.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);max-height:92vh;display:flex;flex-direction:column;">' + html + '</div>';
        document.body.appendChild(ov);
        return ov;
    }
    const topo = function (t) { return '<div style="background:' + COR + ';color:#fff;padding:14px 16px;font-weight:700;"><i class="fas fa-credit-card"></i> ' + esc(t) + '</div>'; };
    const campo = function (id, rot, val, tipo, ph) { return '<label style="display:block;font-size:.8rem;color:#666;margin-top:10px;">' + esc(rot) + '</label><input id="' + id + '" type="' + (tipo || 'text') + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" style="width:100%;box-sizing:border-box;padding:11px;border:2px solid #ddd;border-radius:10px;font-size:1rem;">'; };

    // ---------- Aguardando (com cancelar / informar manualmente) ----------
    function aguardar(titulo, msg, opts) {
        opts = opts || {};
        const ov = overlay(topo(titulo) +
            '<div style="padding:22px 16px;text-align:center;color:#333;"><i class="fas fa-spinner fa-spin" style="font-size:2rem;color:' + COR + ';"></i>' +
            '<div id="maq-msg" style="margin-top:14px;line-height:1.4;">' + msg + '</div></div>' +
            '<div style="display:flex;gap:10px;padding:0 16px 16px;">' +
            (opts.manual ? '<button data-man class="btn-outline" style="flex:1;">Informar manualmente</button>' : '') +
            '<button data-can class="btn-outline" style="flex:1;border-color:#c62828;color:#c62828;">Cancelar</button></div>');
        const h = { cancelado: false, manual: false, ov: ov, texto: function (t) { const m = ov.querySelector('#maq-msg'); if (m) m.innerHTML = t; }, fechar: function () { ov.remove(); } };
        ov.querySelector('[data-can]').onclick = function () { h.cancelado = true; if (h.onCancel) h.onCancel(); };
        const bm = ov.querySelector('[data-man]'); if (bm) bm.onclick = function () { h.manual = true; if (h.onCancel) h.onCancel(); };
        return h;
    }

    // ---------- Registro manual ----------
    function formManual(p) {
        return new Promise(function (resolve) {
            const cred = p.forma === 'credito';
            const ov = overlay(topo('Registrar cartão') +
                '<div style="padding:14px 16px;overflow-y:auto;"><div style="color:#333;">Valor: <b>' + dinheiro(p.valor) + '</b> — ' + (cred ? 'Crédito' : 'Débito') + '</div>' +
                '<div style="font-size:.8rem;color:#888;margin-top:4px;">Passe o cartão na maquininha e copie os dados do comprovante.</div>' +
                campo('mq-band', 'Bandeira', '', 'text', 'Visa, Master, Elo…') + campo('mq-nsu', 'NSU / Nº do comprovante', '', 'text') +
                campo('mq-aut', 'Código de autorização', '', 'text') + campo('mq-4', 'Últimos 4 dígitos', '', 'text', '1234') +
                (cred ? campo('mq-parc', 'Parcelas', 1, 'number') : '') + '</div>' +
                '<div style="display:flex;gap:10px;padding:0 16px 16px;"><button data-can class="btn-outline" style="flex:1;">Cancelar</button><button data-ok class="btn-primary" style="flex:1;">Registrar</button></div>');
            const v = function (id) { const e = ov.querySelector('#' + id); return e ? e.value.trim() : ''; };
            ov.querySelector('[data-can]').onclick = function () { ov.remove(); resolve(null); };
            ov.querySelector('[data-ok]').onclick = function () {
                ov.remove();
                resolve({ ok: true, provider: 'manual', bandeira: v('mq-band'), nsu: v('mq-nsu'), autorizacao: v('mq-aut'), ultimos4: v('mq-4').slice(-4), parcelas: cred ? Math.max(1, parseInt(v('mq-parc')) || 1) : 1 });
            };
        });
    }

    async function perguntarParcelas(p) {
        if (p.forma !== 'credito') return 1;
        const r = await window.perguntar('Em quantas parcelas? (1 = à vista)', '1', { tipo: 'number', titulo: 'Parcelas' });
        if (r === null) return null;
        return Math.min(24, Math.max(1, parseInt(r) || 1));
    }

    // ---------- Mercado Pago (via servidor) ----------
    let maqAtual = '';
    async function mp(metodo, caminho, corpo) {
        if (maqAtual) { if (metodo === 'GET') caminho += (caminho.indexOf('?') >= 0 ? '&' : '?') + 'maq=' + encodeURIComponent(maqAtual); else corpo = Object.assign({ maqId: maqAtual }, corpo || {}); }
        const r = await fetch('/api/maquininha/mp/' + caminho, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: corpo ? JSON.stringify(corpo) : undefined, cache: 'no-store' });
        let j = {}; try { j = await r.json(); } catch (e) {}
        if (!r.ok) throw new Error(j.message || j.error || ('Erro ' + r.status));
        return j;
    }
    async function cobrarMP(p, parcelas) {
        const h = aguardar('Mercado Pago Point', 'Enviando cobrança de <b>' + dinheiro(p.valor) + '</b> para a maquininha…', { manual: true });
        let intent = null;
        try {
            intent = await mp('POST', 'cobrar', { valor: p.valor, forma: p.forma, parcelas: parcelas, descricao: p.descricao, ref: p.ref });
            const id = intent.id;
            h.texto('Aguardando o cliente passar o cartão na maquininha…<br><b>' + dinheiro(p.valor) + '</b>');
            h.onCancel = function () { /* tratado no laço */ };
            for (let i = 0; i < 240; i++) {            // ~10 min
                if (h.cancelado || h.manual) break;
                await espera(2500);
                if (h.cancelado || h.manual) break;
                let s; try { s = await mp('GET', 'status?id=' + encodeURIComponent(id)); } catch (e) { continue; }
                const st = String(s.state || s.status || '').toUpperCase();
                if (st === 'FINISHED' || st === 'PROCESSED') {
                    h.fechar();
                    const pay = s.payment || {};
                    return { ok: true, provider: 'mercadopago', idTransacao: String(pay.id || id), nsu: String(pay.id || ''), autorizacao: '', bandeira: pay.card_brand || '', ultimos4: '', parcelas: parcelas };
                }
                if (st === 'CANCELED' || st === 'ERROR' || st === 'ABANDONED') { h.fechar(); await window.avisar('Cobrança não concluída na maquininha (' + st + ').'); return null; }
            }
            if (h.manual) {
                h.fechar();
                try { await mp('POST', 'cancelar', { id: id }); } catch (e) {}
                return formManual(p);
            }
            h.fechar();
            try { await mp('POST', 'cancelar', { id: id }); } catch (e) {}
            if (!h.cancelado) await window.avisar('Tempo esgotado aguardando a maquininha.');
            return null;
        } catch (e) {
            h.fechar();
            const fb = await window.confirmar('Não foi possível usar a maquininha:\n' + e.message + '\n\nDeseja registrar o cartão manualmente?', { perigo: false, ok: 'Registrar manual' });
            return fb ? formManual(p) : null;
        }
    }

    // ---------- Deeplinks (Android) ----------
    let pendente = null;
    function b64(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
    function deb64(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }

    function montarDeeplink(prov, p, parcelas, m) {
        const cents = Math.round(p.valor * 100);
        if (prov === 'cielolio') {
            const cred = p.forma === 'credito';
            const req = { accessToken: m.lioToken || '', clientID: m.lioClient || '', value: String(cents), paymentCode: cred ? (parcelas > 1 ? 'CREDITO_PARCELADO_LOJA' : 'CREDITO_AVISTA') : 'DEBITO_AVISTA', installments: cred ? parcelas : 0, reference: p.ref || '' };
            return 'lio://payment?request=' + encodeURIComponent(b64(req)) + '&urlCallback=' + encodeURIComponent('comandaspay://lio');
        }
        if (prov === 'stone') {   // ATENÇÃO: formato conforme documentação do Stone Pagamento App; confirme com o suporte Stone.
            return 'payment-app://pay?return_scheme=comandaspay&amount=' + cents + '&editable_amount=false&transaction_type=' + (p.forma === 'credito' ? 'credit' : 'debit') +
                '&installment_type=' + (parcelas > 1 ? 'merchant' : 'none') + '&installment_count=' + parcelas + '&order_id=' + encodeURIComponent(p.ref || '');
        }
        if (prov === 'sumup') {
            return 'sumupmerchant://pay/1.0?affiliate-key=' + encodeURIComponent(m.sumupKey || '') + '&app-id=br.com.comandas&total=' + p.valor.toFixed(2) + '&currency=BRL&title=' +
                encodeURIComponent(p.descricao || 'Comanda') + '&foreign-tx-id=' + encodeURIComponent(p.ref || '') + '&skip-screen-success=true&callback=' + encodeURIComponent('comandaspay://sumup');
        }
        return null;
    }

    function cobrarDeeplink(prov, p, parcelas, m) {
        return new Promise(async function (resolve) {
            if (!window.AndroidApp || !window.AndroidApp.abrirDeeplinkPagamento) {
                const fb = await window.confirmar('Este provedor só funciona no aplicativo Android instalado na maquininha/celular.\nRegistrar manualmente?', { perigo: false, ok: 'Registrar manual' });
                return resolve(fb ? await formManual(p) : null);
            }
            const h = aguardar(NOMES[prov], 'O app da maquininha foi aberto. Conclua o pagamento de <b>' + dinheiro(p.valor) + '</b> e volte para o Comandas.', { manual: true });
            const fim = function (v) { pendente = null; h.fechar(); resolve(v); };
            pendente = { prov: prov, p: p, parcelas: parcelas, fim: fim };
            h.onCancel = async function () { const man = h.manual; pendente = null; h.fechar(); resolve(man ? await formManual(p) : null); };
            let r = '';
            try { r = window.AndroidApp.abrirDeeplinkPagamento(montarDeeplink(prov, p, parcelas, m)); } catch (e) { r = 'ERRO ' + e; }
            if (r && String(r).indexOf('ERRO') === 0) {
                pendente = null; h.fechar();
                const fb = await window.confirmar('Não foi possível abrir o app da maquininha (' + prov + '). Ele está instalado?\n\nRegistrar manualmente?', { perigo: false, ok: 'Registrar manual' });
                resolve(fb ? await formManual(p) : null);
            }
        });
    }

    // Chamado pelo Android quando o app da maquininha devolve o controle: comandaspay://<host>?...
    window.__pagRetorno = async function (uri) {
        if (!pendente) return;
        const pd = pendente;
        let u; try { u = new URL(uri); } catch (e) { return; }
        const q = function (k) { return u.searchParams.get(k) || ''; };
        let res = null;
        if (pd.prov === 'cielolio') {
            const j = deb64(q('response')) || {};
            const pg = (j.payments && j.payments[0]) || {};
            const ok = String(j.code) === '0' || /paid|pago/i.test(j.status || '') || (pg && pg.authCode);
            res = ok ? { ok: true, provider: 'cielolio', nsu: String(pg.cieloCode || pg.terminal || ''), autorizacao: String(pg.authCode || ''), bandeira: pg.brand || '', ultimos4: String(pg.mask || '').slice(-4), parcelas: pd.parcelas, idTransacao: String(j.id || '') } : { ok: false, motivo: j.reason || 'Pagamento não concluído' };
        } else if (pd.prov === 'sumup') {
            const ok = q('smp-status') === 'success';
            res = ok ? { ok: true, provider: 'sumup', nsu: q('smp-tx-code'), autorizacao: q('smp-tx-code'), bandeira: q('smp-card-type'), ultimos4: q('smp-card-last4'), parcelas: pd.parcelas, idTransacao: q('smp-tx-code') } : { ok: false, motivo: q('smp-failure-cause') || 'Pagamento não concluído' };
        } else {   // stone (parâmetros genéricos)
            const ok = !!(q('atk') || q('authorization_code') || q('authorizationCode')) && !/fail|cancel|reject|error/i.test(q('status') + q('result'));
            res = ok ? { ok: true, provider: 'stone', nsu: q('atk') || q('itk'), autorizacao: q('authorization_code') || q('authorizationCode'), bandeira: q('brand'), ultimos4: q('pan').slice(-4), parcelas: parseInt(q('installment_count')) || pd.parcelas, idTransacao: q('itk') || q('atk') } : { ok: false, motivo: 'Pagamento não concluído' };
        }
        if (res.ok) pd.fim(res);
        else { pd.fim(null); await window.avisar(res.motivo); }
    };

    // ---------- API pública ----------
    window.maquininhaCobrar = async function (p) {
        const m = p.maquina || await window.maquininhaConfig();
        maqAtual = String(m.id || '');
        const prov = m.provider || 'nenhuma';
        if (prov === 'nenhuma') return { ok: true, provider: 'nenhuma' };
        if (prov === 'manual') { const parc = null; return formManual(p, parc); }
        const parcelas = await perguntarParcelas(p);
        if (parcelas === null) return null;
        if (prov === 'simulado') {
            const h = aguardar('Maquininha (simulada)', 'Aguardando cartão… <b>' + dinheiro(p.valor) + '</b>');
            await Promise.race([espera(1800), new Promise(function (r) { h.onCancel = r; })]);
            h.fechar(); if (h.cancelado) return null;
            const n = String(Math.floor(100000 + Math.random() * 899999));
            return { ok: true, provider: 'simulado', nsu: n, autorizacao: n.slice(0, 4) + 'A', bandeira: 'Visa', ultimos4: '4242', parcelas: parcelas, idTransacao: 'SIM' + n };
        }
        if (prov === 'mercadopago') return cobrarMP(p, parcelas);
        return cobrarDeeplink(prov, p, parcelas, m);
    };

    // Texto curto do cartão para recibo/impressão. Ex.: "Visa final 4242 · NSU 123456 · Aut ABC · 3x"
    window.maquininhaTexto = function (mq) {
        if (!mq || (mq.provider === 'nenhuma' && !mq.maquinaNome)) return '';
        const a = [];
        if (mq.maquinaNome) a.push('Maquininha: ' + mq.maquinaNome);
        if (mq.bandeira) a.push(mq.bandeira + (mq.ultimos4 ? ' final ' + mq.ultimos4 : '')); else if (mq.ultimos4) a.push('final ' + mq.ultimos4);
        if (mq.nsu) a.push('NSU ' + mq.nsu);
        if (mq.autorizacao) a.push('Aut ' + mq.autorizacao);
        if (mq.parcelas > 1) a.push(mq.parcelas + 'x');
        return a.join(' · ');
    };

    // ---------- Tela de configuração (várias maquininhas) ----------
    async function salvarLista(lista) {
        const arr = window.normalizarArray(await apiGet('configuracoes')); const cfg = arr[0] || {};
        cfg.maquininhas = lista;
        cfg.maquininha = lista[0] ? Object.assign({}, lista[0]) : { provider: 'nenhuma' };   // compatibilidade com versões antigas
        await apiSave('configuracoes', [cfg]);
    }
    const OPS = ['manual', 'mercadopago', 'cielolio', 'stone', 'sumup', 'simulado', 'nenhuma'];
    const AJ = {
        nenhuma: 'Só identifica em qual maquininha o valor foi recebido (sem cobrança automática).',
        manual: 'Funciona com qualquer maquininha (PagBank, Rede, GetNet…): ao receber, informa NSU, autorização e bandeira do comprovante.',
        mercadopago: 'Passo a passo:\n1) No site Mercado Pago Developers, crie uma aplicação (produto Point / pagamentos presenciais) e copie o Access Token de PRODUÇÃO.\n2) Cole o token abaixo e toque em "Buscar maquininhas da conta"; toque no ID da sua Point.\n3) Toque em "Testar conexão" (não cobra nada). Se aparecer que não está em modo PDV, toque em "Ativar modo PDV" e reinicie a Point.\nPrecisa de internet no aparelho servidor. O token fica gravado só neste aparelho.',
        cielolio: 'Passo a passo:\n1) No Cielo Developers, cadastre-se como desenvolvedor e obtenha o Client ID e o Access Token (LIO).\n2) Instale e abra o Comandas na própria Cielo LIO.\n3) Cole os dados abaixo, toque em "Verificar" e depois em "Testar cobrança de R$ 1,00" (cobra de verdade: faça com um cartão seu e cancele/estorne depois).\nEste modo só funciona no Android da LIO.',
        stone: 'Somente no Android com o aplicativo Stone instalado. Formato do link a confirmar com o suporte Stone.',
        sumup: 'Somente no Android com o app SumUp instalado e Affiliate Key.',
        simulado: 'Aprova automaticamente após 2 segundos. Apenas para testar o fluxo; não cobra nada.'
    };

    function formMaquina(m0) {
        return new Promise(function (resolve) {
            const m = Object.assign({ provider: 'manual', ativa: true }, m0 || {});
            const ops = OPS.map(function (k) { return '<option value="' + k + '"' + (m.provider === k ? ' selected' : '') + '>' + esc(NOMES[k]) + '</option>'; }).join('');
            const ov = overlay(topo(m0 && m0.id ? 'Editar maquininha' : 'Nova maquininha') +
                '<div style="padding:14px 16px;overflow-y:auto;">' + campo('mq-nome', 'Nome da maquininha', m.nome, 'text', 'Ex.: Caixa 1, Balcão, Mercado Pago') +
                '<label style="display:block;font-size:.8rem;color:#666;margin-top:10px;">Provedor</label><select id="mq-prov" style="width:100%;padding:11px;border:2px solid #ddd;border-radius:10px;font-size:1rem;">' + ops + '</select>' +
                '<div id="mq-ajuda" style="font-size:.8rem;color:#777;margin-top:8px;line-height:1.35;white-space:pre-line;"></div>' +
                '<div id="mq-mp" style="display:none;">' + campo('mq-mptoken', 'Access Token (Mercado Pago)', m.mpToken, 'password') + campo('mq-mpdev', 'ID da maquininha (Point)', m.mpDeviceId, 'text') +
                '<button id="mq-buscar" class="btn-outline" style="width:100%;margin-top:8px;">Buscar maquininhas da conta</button><div id="mq-devs" style="font-size:.85rem;margin-top:6px;"></div>' +
                '<button id="mq-testar" class="btn-primary" style="width:100%;margin-top:8px;">Testar conexão (não cobra)</button><div id="mq-diag" style="font-size:.85rem;margin-top:6px;line-height:1.4;"></div>' +
                '<button id="mq-cobt-mp" class="btn-outline" style="width:100%;margin-top:8px;">Testar cobrança de R$ 1,00 (cobra de verdade)</button></div>' +
                '<div id="mq-lio" style="display:none;">' + campo('mq-lioclient', 'Client ID (Cielo LIO)', m.lioClient) + campo('mq-liotoken', 'Access Token (Cielo LIO)', m.lioToken, 'password') +
                '<button id="mq-lio-ver" class="btn-primary" style="width:100%;margin-top:8px;">Verificar</button><div id="mq-lio-diag" style="font-size:.85rem;margin-top:6px;line-height:1.4;"></div>' +
                '<button id="mq-cobt-lio" class="btn-outline" style="width:100%;margin-top:8px;">Testar cobrança de R$ 1,00 (cobra de verdade)</button></div>' +
                '<div id="mq-sum" style="display:none;">' + campo('mq-sumkey', 'Affiliate Key (SumUp)', m.sumupKey, 'password') + '</div>' +
                '</div><div style="display:flex;gap:10px;padding:0 16px 16px;"><button data-can class="btn-outline" style="flex:1;">Cancelar</button><button data-ok class="btn-primary" style="flex:1;">Salvar</button></div>');
            const sel = ov.querySelector('#mq-prov');
            const val = function (id) { const e = ov.querySelector('#' + id); return e ? e.value.trim() : ''; };
            const atual = function () { const v = sel.value; ov.querySelector('#mq-mp').style.display = v === 'mercadopago' ? 'block' : 'none'; ov.querySelector('#mq-lio').style.display = v === 'cielolio' ? 'block' : 'none'; ov.querySelector('#mq-sum').style.display = v === 'sumup' ? 'block' : 'none'; ov.querySelector('#mq-ajuda').textContent = AJ[v] || ''; };
            sel.onchange = atual; atual();
            const montar = function () { return Object.assign({}, m, { id: m.id || ('mq-' + Date.now()), nome: val('mq-nome') || (NOMES[sel.value] || 'Maquininha').split(' (')[0], provider: sel.value, mpToken: val('mq-mptoken'), mpDeviceId: val('mq-mpdev'), lioClient: val('mq-lioclient'), lioToken: val('mq-liotoken'), sumupKey: val('mq-sumkey') }); };
            ov.querySelector('#mq-buscar').onclick = async function () {
                const box = ov.querySelector('#mq-devs'); box.textContent = 'Buscando…';
                try {
                    const nova = montar(); m.id = nova.id;
                    const lista = await window.maquininhasLista(); const k = lista.findIndex(function (x) { return x.id === nova.id; });
                    if (k >= 0) lista[k] = nova; else lista.push(nova);
                    await salvarLista(lista);       // o servidor lê o token da configuração
                    maqAtual = nova.id;
                    const j = await mp('GET', 'devices');
                    const dv = j.devices || [];
                    box.innerHTML = dv.length ? dv.map(function (d) { return '<div><a href="#" data-id="' + esc(d.id) + '" style="color:' + COR + ';">' + esc(d.id) + '</a> — ' + esc(d.operating_mode || '') + '</div>'; }).join('') : 'Nenhuma maquininha encontrada.';
                    box.querySelectorAll('a').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); ov.querySelector('#mq-mpdev').value = a.dataset.id; }; });
                } catch (e) { box.textContent = 'Erro: ' + e.message; }
            };
            const pintar = function (box, passos) { box.innerHTML = passos.map(function (x) { return '<div style="color:' + (x.ok ? '#2e7d32' : '#c62828') + ';">' + (x.ok ? '✔ ' : '✖ ') + '<b>' + esc(x.t) + ':</b> ' + esc(x.d) + (x.pdv ? ' <a href="#" data-pdv style="color:' + COR + ';">Ativar modo PDV</a>' : '') + '</div>'; }).join(''); const a = box.querySelector('[data-pdv]'); if (a) a.onclick = async function (e) { e.preventDefault(); try { await mp('POST', 'pdv', { token: val('mq-mptoken'), deviceId: val('mq-mpdev') }); box.insertAdjacentHTML('beforeend', '<div>Modo PDV solicitado. Reinicie a Point e teste de novo.</div>'); } catch (er) { box.insertAdjacentHTML('beforeend', '<div style="color:#c62828;">' + esc(er.message) + '</div>'); } }; };
            ov.querySelector('#mq-testar').onclick = async function () {
                const box = ov.querySelector('#mq-diag'); box.textContent = 'Testando…';
                try { const j = await mp('POST', 'testar', { token: val('mq-mptoken'), deviceId: val('mq-mpdev') }); pintar(box, j.passos || []); if (j.ok) box.insertAdjacentHTML('beforeend', '<div style="color:#2e7d32;margin-top:4px;"><b>Tudo certo. Salve a maquininha.</b></div>'); } catch (e) { box.textContent = 'Erro: ' + e.message; }
            };
            ov.querySelector('#mq-lio-ver').onclick = function () {
                const p = [], cid = val('mq-lioclient'), tk = val('mq-liotoken'), ok = !!(window.AndroidApp && window.AndroidApp.abrirDeeplinkPagamento);
                p.push({ ok: !!cid, t: 'Client ID', d: cid ? 'Preenchido.' : 'Falta preencher.' }); p.push({ ok: !!tk, t: 'Access Token', d: tk ? 'Preenchido.' : 'Falta preencher.' });
                p.push({ ok: ok, t: 'Aparelho', d: ok ? 'Aplicativo Android: pode abrir a tela de pagamento da LIO.' : 'Aqui não é o aplicativo Android. Faça isto no app instalado na LIO.' });
                pintar(ov.querySelector('#mq-lio-diag'), p);
            };
            const testarCobranca = async function () {
                if (!await window.confirmar('Isto fará uma cobrança REAL de R$ 1,00 (débito). Use um cartão seu e depois estorne/cancele na operadora. Continuar?', { perigo: true, ok: 'Cobrar R$ 1,00' })) return;
                const nova = montar(); m.id = nova.id;
                const lista = await window.maquininhasLista(); const k = lista.findIndex(function (x) { return x.id === nova.id; });
                if (k >= 0) lista[k] = nova; else lista.push(nova);
                await salvarLista(lista);
                const r = await window.maquininhaCobrar({ valor: 1, forma: 'debito', descricao: 'Teste de conexão', ref: 'TESTE', maquina: nova });
                await window.avisar(r && r.ok ? 'Aprovado. NSU ' + (r.nsu || '-') + ' · ' + (r.bandeira || '') + '. Lembre de estornar o R$ 1,00.' : 'Não concluído.');
            };
            ov.querySelector('#mq-cobt-mp').onclick = testarCobranca; ov.querySelector('#mq-cobt-lio').onclick = testarCobranca;
            ov.querySelector('[data-ok]').onclick = function () { const r = montar(); ov.remove(); resolve(r); };
            ov.querySelector('[data-can]').onclick = function () { ov.remove(); resolve(null); };
        });
    }

    window.maquininhaConfigurar = async function () {
        let lista = await window.maquininhasLista();
        const ov = overlay('<div id="mq-corpo"></div>');
        const desenhar = function () {
            const itens = lista.length ? lista.map(function (m, i) {
                return '<div style="border:1px solid #eee;border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">' +
                    '<div style="flex:1;min-width:0;"><div style="font-weight:700;">' + esc(m.nome || 'Maquininha') + (m.ativa === false ? ' <span style="font-size:.7rem;color:#c62828;">(inativa)</span>' : '') + '</div><div style="font-size:.75rem;color:#777;">' + esc(NOMES[m.provider] || m.provider || '') + '</div></div>' +
                    '<label class="toggle"><input type="checkbox" data-at="' + i + '"' + (m.ativa !== false ? ' checked' : '') + '><span class="slider"></span></label>' +
                    '<button data-ed="' + i + '" class="btn-outline" style="padding:6px 10px;"><i class="fas fa-pen"></i></button>' +
                    '<button data-ex="' + i + '" class="btn-outline" style="padding:6px 10px;border-color:#c62828;color:#c62828;"><i class="fas fa-trash"></i></button></div>';
            }).join('') : '<div style="color:#777;text-align:center;padding:14px 0;">Nenhuma maquininha cadastrada. Débito, crédito e PIX apenas registram o valor.</div>';
            ov.querySelector('#mq-corpo').innerHTML = topo('Maquininhas') +
                '<div style="padding:14px 16px;overflow-y:auto;max-height:70vh;"><div style="font-size:.8rem;color:#666;margin-bottom:10px;line-height:1.35;">Cadastre uma ou várias maquininhas. Ao receber em <b>débito, crédito ou PIX</b>, o sistema pergunta em qual delas. Para limitar por garçom, abra <b>Colaboradores</b> e marque as maquininhas dele (sem marcação = todas as ativas).</div>' + itens +
                '<button data-novo class="btn-primary" style="width:100%;margin-top:6px;"><i class="fas fa-plus"></i> Adicionar maquininha</button></div>' +
                '<div style="padding:0 16px 16px;"><button data-fim class="btn-outline" style="width:100%;">Fechar</button></div>';
            const c = ov.querySelector('#mq-corpo');
            c.querySelectorAll('[data-at]').forEach(function (e) { e.onchange = async function () { lista[+e.dataset.at].ativa = e.checked; await salvarLista(lista); desenhar(); }; });
            c.querySelectorAll('[data-ed]').forEach(function (b) { b.onclick = async function () { const r = await formMaquina(lista[+b.dataset.ed]); if (r) { lista[+b.dataset.ed] = r; await salvarLista(lista); } lista = await window.maquininhasLista(); desenhar(); }; });
            c.querySelectorAll('[data-ex]').forEach(function (b) { b.onclick = async function () { if (await window.confirmar('Excluir a maquininha "' + (lista[+b.dataset.ex].nome || '') + '"?', { perigo: true, ok: 'Excluir' })) { lista.splice(+b.dataset.ex, 1); await salvarLista(lista); } desenhar(); }; });
            c.querySelector('[data-novo]').onclick = async function () { const r = await formMaquina(null); if (r) { lista = await window.maquininhasLista(); const k = lista.findIndex(function (x) { return x.id === r.id; }); if (k >= 0) lista[k] = r; else lista.push(r); await salvarLista(lista); } desenhar(); };
            c.querySelector('[data-fim]').onclick = function () { ov.remove(); };
        };
        desenhar();
    };
})();
