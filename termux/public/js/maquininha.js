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

    window.maquininhaConfig = async function () {
        try { const a = window.normalizarArray(await apiGet('configuracoes')); return (a[0] && a[0].maquininha) || {}; } catch (e) { return {}; }
    };
    window.maquininhaAtiva = async function () {
        const m = await window.maquininhaConfig();
        return (m.provider && m.provider !== 'nenhuma') ? m.provider : null;
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
    async function mp(metodo, caminho, corpo) {
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
        const m = await window.maquininhaConfig();
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
        if (!mq || mq.provider === 'nenhuma') return '';
        const a = [];
        if (mq.bandeira) a.push(mq.bandeira + (mq.ultimos4 ? ' final ' + mq.ultimos4 : '')); else if (mq.ultimos4) a.push('final ' + mq.ultimos4);
        if (mq.nsu) a.push('NSU ' + mq.nsu);
        if (mq.autorizacao) a.push('Aut ' + mq.autorizacao);
        if (mq.parcelas > 1) a.push(mq.parcelas + 'x');
        return a.join(' · ');
    };

    // ---------- Tela de configuração ----------
    window.maquininhaConfigurar = async function () {
        const m = await window.maquininhaConfig();
        const ops = Object.keys(NOMES).map(function (k) { return '<option value="' + k + '"' + ((m.provider || 'nenhuma') === k ? ' selected' : '') + '>' + esc(NOMES[k]) + '</option>'; }).join('');
        const ov = overlay(topo('Maquininha de cartão') +
            '<div style="padding:14px 16px;overflow-y:auto;">' +
            '<label style="font-size:.8rem;color:#666;">Provedor</label><select id="mq-prov" style="width:100%;padding:11px;border:2px solid #ddd;border-radius:10px;font-size:1rem;">' + ops + '</select>' +
            '<div id="mq-ajuda" style="font-size:.8rem;color:#777;margin-top:8px;line-height:1.35;"></div>' +
            '<div id="mq-mp" style="display:none;">' + campo('mq-mptoken', 'Access Token (Mercado Pago)', m.mpToken, 'password') + campo('mq-mpdev', 'ID da maquininha (Point)', m.mpDeviceId, 'text') +
            '<button id="mq-buscar" class="btn-outline" style="width:100%;margin-top:8px;">Buscar maquininhas da conta</button><div id="mq-devs" style="font-size:.85rem;margin-top:6px;"></div></div>' +
            '<div id="mq-lio" style="display:none;">' + campo('mq-lioclient', 'Client ID (Cielo LIO)', m.lioClient) + campo('mq-liotoken', 'Access Token (Cielo LIO)', m.lioToken, 'password') + '</div>' +
            '<div id="mq-sum" style="display:none;">' + campo('mq-sumkey', 'Affiliate Key (SumUp)', m.sumupKey, 'password') + '</div>' +
            '</div><div style="display:flex;gap:10px;padding:0 16px 16px;"><button data-can class="btn-outline" style="flex:1;">Fechar</button><button data-ok class="btn-primary" style="flex:1;">Salvar</button></div>');
        const AJ = {
            nenhuma: 'Comportamento atual: débito/crédito apenas registram o valor.',
            manual: 'Funciona com qualquer maquininha (PagBank, Rede, GetNet…): ao receber, informa NSU, autorização e bandeira do comprovante.',
            mercadopago: 'Requer maquininha Point em modo PDV, com o Access Token da sua conta. Celular/servidor precisa de internet. O token fica gravado neste aparelho.',
            cielolio: 'Somente no Android da própria Cielo LIO, com credenciais do Cielo Developers.',
            stone: 'Somente no Android com o aplicativo Stone instalado. Formato do link a confirmar com o suporte Stone.',
            sumup: 'Somente no Android com o app SumUp instalado e Affiliate Key. Disponibilidade no Brasil a confirmar com a SumUp.',
            simulado: 'Aprova automaticamente após 2 segundos. Apenas para testar o fluxo; não cobra nada.'
        };
        const sel = ov.querySelector('#mq-prov');
        const atual = function () { const v = sel.value; ov.querySelector('#mq-mp').style.display = v === 'mercadopago' ? 'block' : 'none'; ov.querySelector('#mq-lio').style.display = v === 'cielolio' ? 'block' : 'none'; ov.querySelector('#mq-sum').style.display = v === 'sumup' ? 'block' : 'none'; ov.querySelector('#mq-ajuda').textContent = AJ[v] || ''; };
        sel.onchange = atual; atual();
        const val = function (id) { const e = ov.querySelector('#' + id); return e ? e.value.trim() : ''; };
        ov.querySelector('#mq-buscar').onclick = async function () {
            const box = ov.querySelector('#mq-devs'); box.textContent = 'Buscando…';
            try {
                // salva o token antes: o servidor lê da configuração
                await salvar(false);
                const j = await mp('GET', 'devices');
                const lista = j.devices || [];
                box.innerHTML = lista.length ? lista.map(function (d) { return '<div><a href="#" data-id="' + esc(d.id) + '" style="color:' + COR + ';">' + esc(d.id) + '</a> — ' + esc(d.operating_mode || '') + '</div>'; }).join('') : 'Nenhuma maquininha encontrada.';
                box.querySelectorAll('a').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); ov.querySelector('#mq-mpdev').value = a.dataset.id; }; });
            } catch (e) { box.textContent = 'Erro: ' + e.message; }
        };
        async function salvar(fechar) {
            const arr = window.normalizarArray(await apiGet('configuracoes')); const cfg = arr[0] || {};
            cfg.maquininha = { provider: sel.value, mpToken: val('mq-mptoken'), mpDeviceId: val('mq-mpdev'), lioClient: val('mq-lioclient'), lioToken: val('mq-liotoken'), sumupKey: val('mq-sumkey') };
            await apiSave('configuracoes', [cfg]);
            if (fechar) { ov.remove(); if (window.mostrarToast) window.mostrarToast('✅ Maquininha configurada'); }
        }
        ov.querySelector('[data-ok]').onclick = function () { salvar(true); };
        ov.querySelector('[data-can]').onclick = function () { ov.remove(); };
    };
})();
