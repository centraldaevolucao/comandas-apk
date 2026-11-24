/* Assinatura recorrente no cartão (crédito/débito) — tela dentro de Assinatura.
   Os dados do cartão são digitados só na página do Mercado Pago; o app guarda apenas o token de cancelamento.
   O Pix continua existindo (pagamento único, sem renovação). Cancelar remove a cobrança automática e dá para voltar a assinar por Pix. */
(function () {
    'use strict';
    const COR = '#C2185B';
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const R = function (v) { return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ','); };
    const dataBR = function (iso) { if (!iso) return '—'; const p = String(iso).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; };
    let ctx = { aba: 'essencial', planos: [], nomeEd: '' };
    let ultimo = null;

    async function chamar(metodo, caminho, corpo) {
        const url = window.MT ? window.MT.apiPath('licenca/' + caminho) : '/api/licenca/' + caminho;
        const op = { method: metodo, headers: { 'Content-Type': 'application/json' } };
        if (corpo) op.body = JSON.stringify(corpo);
        const res = window.CX ? await window.CX.fetch(url, op) : await fetch(url, op);
        return res.json().catch(function () { return {}; });
    }

    function marca(b) { return ({ visa: 'Visa', master: 'Mastercard', elo: 'Elo', amex: 'Amex', hipercard: 'Hipercard', debvisa: 'Visa Débito', debmaster: 'Mastercard Débito', debelo: 'Elo Débito' })[String(b || '').toLowerCase()] || (b ? String(b).toUpperCase() : 'Cartão'); }

    function html(s) {
        if (!s || !s.disponivel) return '';
        const caixa = function (inner) { return '<div style="background:#fff;border-radius:12px;padding:14px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);font-size:.85rem;color:#444;line-height:1.5;">' + inner + '</div>'; };
        const titulo = '<div style="font-weight:700;font-size:.95rem;margin-bottom:6px;"><i class="fas fa-credit-card" style="color:' + COR + ';"></i> Assinatura no cartão (cobrança automática)</div>';
        if (s.erro && !s.estado) return caixa(titulo + '<span style="color:#777;">' + esc(s.erro) + '</span>');
        if (s.estado === 'ativa' || s.estado === 'pausada' || s.estado === 'pendente') {
            const c = s.cartao || {};
            let h = titulo + '<div style="background:#e8f5e9;border-radius:10px;padding:10px;"><b>' + esc(s.plano || '') + '</b> — ' + R(s.valor) + ' a cada ' + (s.meses === 1 ? 'mês' : s.meses + ' meses') + '<br>' +
                (s.estado === 'pendente' ? '<span style="color:#e65100;">Aguardando você concluir o cadastro do cartão na página do Mercado Pago.</span>' :
                    (c.final ? esc(marca(c.bandeira)) + ' final <b>' + esc(c.final) + '</b><br>' : '') + (s.proxima ? 'Próxima cobrança: <b>' + dataBR(s.proxima) + '</b>' : '') + (s.estado === 'pausada' ? '<br><span style="color:#c62828;">Assinatura pausada pelo Mercado Pago (pagamento recusado).</span>' : '')) + '</div>' +
                '<div style="font-size:.76rem;color:#777;margin-top:8px;">Você pode cancelar quando quiser, aqui mesmo. O app continua liberado até o fim do período já pago.</div>';
            if (s.estado === 'pendente') h += '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="cartaoAtualizar()"><i class="fas fa-rotate"></i> Já concluí, verificar</button>';
            h += '<button class="btn-outline" style="width:100%;margin-top:8px;border-color:#c62828;color:#c62828;" onclick="cartaoCancelar()"><i class="fas fa-ban"></i> Cancelar assinatura e remover o cartão</button>';
            return caixa(h);
        }
        let h = titulo;
        if (s.estado === 'cancelada') h += '<div style="background:#fff3e0;border-radius:10px;padding:10px;margin-bottom:8px;">Assinatura no cartão <b>cancelada</b>. Nenhuma nova cobrança será feita.' + (s.fim ? '<br>Período pago vale até <b>' + dataBR(s.fim) + '</b>.' : '') + '<br>Para voltar a assinar, use o Pix (planos acima) ou assine no cartão de novo.</div>';
        h += '<div style="color:#555;">Pague no <b>cartão de crédito ou débito</b> e a renovação é automática, sem precisar pedir licença. Edição escolhida: <b>' + esc(ctx.nomeEd) + '</b>.</div>' +
            '<select id="cartao-plano" style="width:100%;margin-top:8px;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:.9rem;">' +
            ctx.planos.map(function (p) { return '<option value="' + p.meses + '">' + esc(p.nome) + ' — ' + R(p.preco) + (p.meses === 1 ? ' por mês' : ' a cada ' + p.meses + ' meses') + '</option>'; }).join('') + '</select>' +
            '<input id="cartao-email" type="email" placeholder="Seu e-mail (para o Mercado Pago)" autocomplete="email" style="width:100%;box-sizing:border-box;margin-top:8px;padding:10px;border:2px solid #ddd;border-radius:8px;font-size:.9rem;">' +
            '<button class="btn-primary" style="width:100%;margin-top:8px;" onclick="cartaoAssinar()"><i class="fas fa-lock"></i> Assinar no cartão</button>' +
            '<div style="font-size:.74rem;color:#777;margin-top:8px;">Você digita o cartão na página segura do <b>Mercado Pago</b>; o app não vê nem guarda os dados do cartão. A cobrança se repete no período escolhido até você cancelar. Cancelamento a qualquer momento, aqui no app. Arrependimento de 7 dias garantido.</div>';
        return caixa(h);
    }

    async function desenhar() {
        const el = document.getElementById('cartao-box'); if (!el) return;
        el.innerHTML = html(ultimo);
    }

    window.cartaoMontar = async function (aba, planos, nomeEd) {
        ctx = { aba: aba, planos: planos || [], nomeEd: nomeEd || '' };
        const el = document.getElementById('cartao-box'); if (!el) return;
        try { ultimo = await chamar('GET', 'cartao-status'); } catch (e) { ultimo = null; }
        if (ultimo && ultimo.ativou) { try { await window.licencaCarregar(); } catch (e) {} }
        desenhar();
    };
    window.cartaoAtualizar = async function () {
        try { ultimo = await chamar('GET', 'cartao-status'); } catch (e) {}
        if (ultimo && ultimo.ativou) { await window.licencaCarregar(); if (window.mostrarToast) window.mostrarToast(ultimo.ativou); if (window.navigateTo) window.navigateTo('assinatura'); return; }
        desenhar();
    };
    window.cartaoAssinar = async function () {
        const meses = Number((document.getElementById('cartao-plano') || {}).value || 0);
        const email = ((document.getElementById('cartao-email') || {}).value || '').trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { await window.avisar('Informe um e-mail válido. O Mercado Pago usa esse e-mail na assinatura.'); return; }
        const ok = await window.confirmar('Você será levado à página do Mercado Pago para cadastrar o cartão.\n\nA cobrança será automática a cada ' + (meses === 1 ? 'mês' : meses + ' meses') + ' até você cancelar em Assinatura › Cancelar.', { ok: 'Continuar', cancelar: 'Voltar' });
        if (!ok) return;
        const r = await chamar('POST', 'cartao-assinar', { edicao: ctx.aba, meses: meses, email: email });
        if (!r.ok) { await window.avisar(r.msg || r.error || 'Não foi possível iniciar a assinatura.'); return; }
        window.abrirLinkExterno(r.url);
        await window.avisar('Conclua o cadastro do cartão na página que abriu. Depois volte aqui: a licença é ativada sozinha (toque em "Já concluí, verificar" se demorar).');
        window.cartaoAtualizar();
    };
    window.cartaoCancelar = async function () {
        const ok = await window.confirmar('Cancelar a assinatura no cartão?\n\nNenhuma nova cobrança será feita e o vínculo do cartão com o Comandas é removido. O app continua liberado até o fim do período já pago. Depois você pode voltar a assinar por Pix ou de novo no cartão.', { ok: 'Cancelar assinatura', cancelar: 'Manter' });
        if (!ok) return;
        const r = await chamar('POST', 'cartao-cancelar');
        await window.avisar(r.msg || r.error || 'Não foi possível cancelar agora.');
        if (r.cartao) ultimo = r.cartao; else { try { ultimo = await chamar('GET', 'cartao-status'); } catch (e) {} }
        desenhar();
    };
})();
