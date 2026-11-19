// ============================================================
// AVALIACAO.JS — "Avalie o Comandas": nota, o que gostou e o que melhorar, enviados ao desenvolvedor
// (WhatsApp ou e-mail, com um código CMDA1 que o app Licenças lê e conta por edição).
// A avaliação fica guardada no aparelho (coleção "avaliacoes") só para mostrar a última enviada.
// ============================================================
(function () {
    'use strict';
    const COR = '#C2185B';
    const esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
    const ROTULOS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];
    const GOSTEI = ['Fácil de usar', 'Rápido', 'Impressão', 'Caixa e relatórios', 'Estoque', 'Suporte'];
    const EDNOME = { gratis: 'Grátis', essencial: 'Essencial', gestao: 'Gestão', completo: 'Completo' };
    const ST = window.avaliacaoState = { nota: 0, gostou: [], melhorar: '', nome: '', contato: false, ultima: null };

    function estrela(cheia, i) {
        return '<button type="button" onclick="avaliacaoNota(' + i + ')" aria-label="' + i + ' estrela' + (i > 1 ? 's' : '') + '" style="border:0;background:none;padding:2px;cursor:pointer;">' +
            '<svg width="38" height="38" viewBox="0 0 24 24" ' + (cheia ? 'fill="#F9A825"' : 'fill="none" stroke="#B9A9B0" stroke-width="1.6"') + ' aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg></button>';
    }

    function corpo() {
        const u = ST.ultima;
        let h = '<div class="card" style="padding:14px;text-align:center;margin-bottom:12px;">' +
            '<div style="font-weight:700;">Como você avalia o app?</div>' +
            '<div style="display:flex;justify-content:center;gap:4px;margin-top:8px;">' + [1, 2, 3, 4, 5].map(function (i) { return estrela(i <= ST.nota, i); }).join('') + '</div>' +
            '<div style="font-size:.85rem;font-weight:700;color:#A5144B;margin-top:6px;min-height:1.2em;">' + ROTULOS[ST.nota] + '</div></div>';
        h += '<div class="card" style="padding:14px;margin-bottom:12px;"><div style="font-weight:700;margin-bottom:8px;">O que você mais gostou?</div><div style="display:flex;flex-wrap:wrap;gap:8px;">' +
            GOSTEI.map(function (g, i) {
                const on = ST.gostou.indexOf(g) >= 0;
                return '<button type="button" onclick="avaliacaoChip(' + i + ')" style="border:1px solid ' + (on ? COR : '#F3C3D6') + ';background:' + (on ? COR : '#FDECF2') + ';color:' + (on ? '#fff' : '#A5144B') + ';font-size:.82rem;font-weight:600;padding:8px 12px;border-radius:99px;cursor:pointer;">' + esc(g) + '</button>';
            }).join('') + '</div></div>';
        h += '<div class="card" style="padding:14px;margin-bottom:12px;">' +
            '<label for="av-mel" style="font-weight:700;display:block;margin-bottom:6px;">O que podemos melhorar?</label>' +
            '<textarea id="av-mel" rows="3" maxlength="600" placeholder="Conte o que faltou ou o que atrapalhou" oninput="avaliacaoTexto(\'melhorar\',this.value)" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #EBD9E0;border-radius:10px;font:inherit;">' + esc(ST.melhorar) + '</textarea>' +
            '<label for="av-nome" style="display:block;font-size:.78rem;color:#6B5A62;margin:10px 0 4px;">Seu nome ou estabelecimento (opcional)</label>' +
            '<input id="av-nome" value="' + esc(ST.nome) + '" maxlength="80" oninput="avaliacaoTexto(\'nome\',this.value)" style="width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #EBD9E0;border-radius:10px;font:inherit;">' +
            '<label style="display:flex;gap:8px;align-items:center;font-size:.85rem;margin-top:10px;cursor:pointer;"><input type="checkbox" ' + (ST.contato ? 'checked ' : '') + 'onchange="avaliacaoTexto(\'contato\',this.checked)" style="width:auto;"> Autorizo a Central da Evolução a me responder por WhatsApp sobre esta avaliação <small style="color:#6b6b6b;">(opcional)</small></label></div>';
        h += '<div style="font-size:.78rem;color:#6B5A62;line-height:1.5;margin:0 4px 12px;">Vão junto com a mensagem a versão do app, a edição e o ID do equipamento, só para o suporte te ajudar melhor.' +
            (u ? '<br>Última avaliação enviada: ' + '★'.repeat(u.nota) + ' em ' + esc(u.data) + '.' : '') + '</div>';
        h += '<button class="btn-primary" style="width:100%;" onclick="avaliacaoEnviar(\'whats\')"><i class="fab fa-whatsapp"></i> Enviar pelo WhatsApp</button>' +
            '<button class="btn-outline" style="width:100%;margin-top:10px;" onclick="avaliacaoEnviar(\'email\')"><i class="fas fa-envelope"></i> Enviar por e-mail</button>';
        return h;
    }
    function desenhar() { const b = document.getElementById('avaliacao-corpo'); if (b) b.innerHTML = corpo(); }

    window.renderAvaliacao = function () {
        ST.nota = 0; ST.gostou = []; ST.melhorar = ''; ST.contato = false;
        setTimeout(async function () {
            try {
                const cfg = window.normalizarArray(await window.apiGet('configuracoes'))[0] || {};
                ST.nome = cfg.nomeImpressao || '';
                const lista = window.normalizarArray(await window.apiGet('avaliacoes'));
                ST.ultima = lista.length ? lista[lista.length - 1] : null;
            } catch (e) {}
            desenhar();
        }, 30);
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Avalie o Comandas</h1></div>' +
            '<div class="content-area" style="padding:12px;"><div style="font-size:.85rem;color:#6B5A62;margin:0 4px 12px;">Sua opinião chega direto ao desenvolvedor.</div><div id="avaliacao-corpo">' + corpo() + '</div></div>';
    };

    window.avaliacaoNota = function (n) { ST.nota = n; desenhar(); };
    window.avaliacaoChip = function (i) { const g = GOSTEI[i], k = ST.gostou.indexOf(g); if (k >= 0) ST.gostou.splice(k, 1); else ST.gostou.push(g); desenhar(); };
    window.avaliacaoTexto = function (campo, v) { ST[campo] = v; };

    window.avaliacaoEnviar = async function (via) {
        if (!ST.nota) { if (window.avisar) await window.avisar('Toque nas estrelas para dar uma nota.'); return; }
        const s = window.LICENCA && window.LICENCA.status || (window.licencaCarregar ? await window.licencaCarregar() : null) || {};
        const edicao = s.limitado ? 'gratis' : (s.edicao || 'essencial');
        const agora = new Date();
        const dados = { app: 'Comandas', tipo: 'avaliacao', nota: ST.nota, gostou: ST.gostou.slice(), melhorar: String(ST.melhorar || '').trim().slice(0, 600),
            cliente: String(ST.nome || '').trim().slice(0, 80), contato: !!ST.contato, versao: window.APP_VERSAO || '', edicao: edicao, equipamento: s.instalacaoId || '', em: agora.toISOString() };
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(dados)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const texto = 'Avaliação do Comandas\nNota: ' + ST.nota + ' de 5 (' + ROTULOS[ST.nota] + ')' +
            (dados.gostou.length ? '\nGostei de: ' + dados.gostou.join(', ') : '') + (dados.melhorar ? '\nMelhorar: ' + dados.melhorar : '') +
            (dados.cliente ? '\nCliente: ' + dados.cliente + (dados.contato ? ' (pode responder por aqui)' : '') : '') +
            '\nApp ' + dados.versao + ' · Edição ' + EDNOME[edicao] + (dados.equipamento ? ' · ID ' + dados.equipamento : '') + '\n\nCMDA1.' + b64;
        try {
            const reg = { id: Date.now(), nota: ST.nota, gostou: dados.gostou, melhorar: dados.melhorar, edicao: edicao, data: agora.toLocaleDateString('pt-BR'), via: via };
            const lista = window.normalizarArray(await window.apiGet('avaliacoes'));
            lista.push(reg); await window.apiSave('avaliacoes', lista.slice(-20));
            ST.ultima = reg;
        } catch (e) {}
        if (via === 'email') window.abrirLinkExterno(window.contatoEmailUrl('Avaliação do Comandas — ' + ST.nota + ' estrela(s)', texto));
        else window.abrirLinkExterno(window.contatoWhatsAppUrl(texto));
        agradecer();
    };

    function agradecer() {
        const old = document.getElementById('avaliacao-obrigado'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'avaliacao-obrigado'; m.className = 'modal-overlay'; m.style.zIndex = '200000';
        m.innerHTML = '<div class="modal-content" style="max-width:380px;">' +
            '<div class="modal-header" style="background:' + COR + ';color:#fff;"><strong>Obrigado pela avaliação!</strong></div>' +
            '<div class="modal-body" style="text-align:center;padding:20px 18px;">' +
            '<svg width="56" height="56" viewBox="0 0 24 24" fill="#F9A825" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>' +
            '<div style="font-weight:700;margin-top:8px;">Sua opinião ajuda a melhorar o Comandas.</div>' +
            '<div style="font-size:.85rem;color:#6B5A62;margin-top:8px;line-height:1.5;">A mensagem já está escrita no WhatsApp (ou no e-mail). Toque em enviar lá para ela chegar ao desenvolvedor.</div>' +
            '<button class="btn-primary" style="width:100%;margin-top:16px;" id="av-ok">Fechar</button></div></div>';
        document.body.appendChild(m);
        m.querySelector('#av-ok').onclick = function () { m.remove(); if (window.voltarTela) window.voltarTela(); };
    }
})();
