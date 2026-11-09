// ============================================================
// SUPORTE.JS — Assistente (chatbot de perguntas frequentes) + contato: só WhatsApp e e-mail
// Conteúdo das respostas: js/faq.js · Contato/versão: js/contato.js
// ============================================================
(function () {
    'use strict';
    const COR = '#C2185B';
    const norm = function (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
    const esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    const semHtml = function (h) { return String(h || '').replace(/<[^>]+>/g, ' '); };
    const dados = function () { return window.FAQ_DADOS || []; };
    let indice = null;

    function montarIndice() {
        if (indice) return indice;
        indice = [];
        dados().forEach(function (c, ci) {
            c.itens.forEach(function (it, ii) { indice.push({ ci: ci, ii: ii, q: norm(it.p), k: norm(it.k), r: norm(semHtml(it.r)) }); });
        });
        return indice;
    }

    function buscar(texto) {
        const palavras = norm(texto).split(/[^a-z0-9]+/).filter(function (w) { return w.length > 2; });
        if (!palavras.length) return [];
        const res = [];
        montarIndice().forEach(function (x) {
            let pt = 0;
            palavras.forEach(function (w) {
                const raiz = w.length > 5 ? w.slice(0, w.length - 1) : w;            // tolera plural/feminino
                if (x.q.indexOf(raiz) >= 0) pt += 4;
                if (x.k.indexOf(raiz) >= 0) pt += 3;
                if (x.r.indexOf(raiz) >= 0) pt += 1;
            });
            if (pt >= 3) res.push({ x: x, pt: pt });
        });
        res.sort(function (a, b) { return b.pt - a.pt; });
        return res.slice(0, 5).map(function (r) { return r.x; });
    }

    // ---------- tela ----------
    window.renderSuporte = function () {
        setTimeout(iniciarChat, 30);
        const C = window.CONTATO;
        return '<div class="app-bar"><button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button><h1>Suporte</h1><div style="width:40px;"></div></div>' +
            '<div class="content-area" style="padding:10px;display:flex;flex-direction:column;">' +
            '<div style="display:flex;gap:8px;margin-bottom:10px;">' +
            '<button class="btn-outline" style="flex:1;border-color:#25d366;color:#1b8f4a;" onclick="suporteAbrirWhats()"><i class="fab fa-whatsapp"></i> WhatsApp<div style="font-size:.68rem;color:#666;font-weight:400;">' + esc(C.whatsappFmt) + '</div></button>' +
            '<button class="btn-outline" style="flex:1;border-color:#1976d2;color:#1976d2;" onclick="suporteAbrirEmail()"><i class="fas fa-envelope"></i> E-mail<div style="font-size:.68rem;color:#666;font-weight:400;overflow:hidden;text-overflow:ellipsis;">' + esc(C.email) + '</div></button></div>' +
            '<div id="chat-box" style="background:#f4f4f6;border-radius:14px;padding:10px;height:calc(100vh - 420px);min-height:260px;overflow-y:auto;"></div>' +
            '<div style="display:flex;gap:8px;margin-top:8px;"><input id="chat-entrada" type="text" placeholder="Digite sua dúvida (ex.: fiado, impressora, licença)" autocomplete="off" ' +
            'style="flex:1;padding:12px;border:2px solid #ddd;border-radius:24px;font-size:.95rem;" onkeydown="if(event.key===\'Enter\')suporteEnviar()">' +
            '<button class="btn-primary" style="width:48px;height:48px;border-radius:50%;padding:0;" onclick="suporteEnviar()" aria-label="Enviar"><i class="fas fa-paper-plane"></i></button></div>' +
            '<div style="background:#fff;border-radius:12px;padding:10px 12px;margin-top:10px;font-size:.8rem;color:#555;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.06);"><b><i class="far fa-clock"></i> Horário de atendimento</b><br>' + C.horarios.map(esc).join('<br>') + '</div>' +
            '<style>.chat-r ol,.chat-r ul{margin:6px 0 6px 0;padding-left:20px}.chat-r li{margin:5px 0}.chat-r .dica{background:#fff8e1;border-left:3px solid #ffb300;border-radius:6px;padding:7px 9px;margin-top:8px;font-size:.85rem}</style>' +
            window.rodapeVersaoHtml('padding:16px 0 4px;') +
            '</div>';
    };

    function caixa() { return document.getElementById('chat-box'); }
    function rolar() { const b = caixa(); if (b) b.scrollTop = b.scrollHeight; }

    function balaoBot(html) {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;gap:8px;margin:8px 0;align-items:flex-end;';
        d.innerHTML = '<div style="width:30px;height:30px;border-radius:50%;background:' + COR + ';color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fas fa-robot" style="font-size:.85rem;"></i></div>' +
            '<div class="chat-r" style="background:#fff;border-radius:14px 14px 14px 4px;padding:10px 12px;max-width:88%;font-size:.9rem;line-height:1.5;color:#333;box-shadow:0 1px 3px rgba(0,0,0,.08);">' + html + '</div>';
        caixa().appendChild(d); rolar();
    }
    function balaoUsuario(texto) {
        const d = document.createElement('div');
        d.style.cssText = 'display:flex;justify-content:flex-end;margin:8px 0;';
        d.innerHTML = '<div style="background:' + COR + ';color:#fff;border-radius:14px 14px 4px 14px;padding:10px 12px;max-width:80%;font-size:.9rem;line-height:1.4;">' + esc(texto) + '</div>';
        caixa().appendChild(d); rolar();
    }
    function opcoes(lista) {            // lista: [{ t: texto, f: funcao, cor }]
        const d = document.createElement('div');
        d.className = 'chat-opcoes';
        d.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 10px 38px;';
        lista.forEach(function (o) {
            const b = document.createElement('button');
            b.type = 'button';
            b.style.cssText = 'border:1.5px solid ' + (o.cor || COR) + ';background:#fff;color:' + (o.cor || COR) + ';border-radius:18px;padding:7px 12px;font-size:.82rem;cursor:pointer;text-align:left;';
            b.innerHTML = o.t;
            b.onclick = function () { d.querySelectorAll('button').forEach(function (x) { x.disabled = true; x.style.opacity = '.55'; }); o.f(); };
            d.appendChild(b);
        });
        caixa().appendChild(d); rolar();
    }

    // ---------- fluxo da conversa ----------
    function menuPrincipal(saudacao) {
        balaoBot(saudacao || 'Sobre qual assunto você quer ajuda? Toque em uma opção ou digite sua dúvida abaixo.');
        const ops = dados().map(function (c, ci) { return { t: '<i class="fas ' + c.icone + '"></i> ' + esc(c.titulo), f: function () { balaoUsuario(c.titulo); categoria(ci); } }; });
        ops.push({ t: '<i class="fas fa-headset"></i> Falar com a Central da Evolução', cor: '#1b8f4a', f: function () { balaoUsuario('Falar com a Central da Evolução'); contato(); } });
        opcoes(ops);
    }

    function categoria(ci) {
        const c = dados()[ci];
        balaoBot('<b>' + esc(c.titulo) + '</b> — escolha a pergunta:');
        const ops = c.itens.map(function (it, ii) { return { t: esc(it.p), f: function () { balaoUsuario(it.p); resposta(ci, ii); } }; });
        ops.push({ t: '← Voltar ao menu', cor: '#666', f: function () { menuPrincipal(); } });
        opcoes(ops);
    }

    function resposta(ci, ii) {
        const c = dados()[ci], it = c.itens[ii];
        balaoBot(it.r);
        setTimeout(function () {
            balaoBot('Isso resolveu?');
            opcoes([
                { t: '👍 Sim, obrigado', cor: '#2e7d32', f: function () { balaoUsuario('Sim, obrigado'); balaoBot('Que bom! Se precisar de mais alguma coisa, é só chamar. 😊'); opcoes([{ t: 'Voltar ao menu', f: function () { menuPrincipal(); } }]); } },
                { t: '📚 Mais perguntas de ' + esc(c.titulo), f: function () { balaoUsuario('Mais perguntas de ' + c.titulo); categoria(ci); } },
                { t: '💬 Ainda preciso de ajuda', cor: '#1b8f4a', f: function () { balaoUsuario('Ainda preciso de ajuda'); contato(it.p); } },
                { t: 'Menu principal', cor: '#666', f: function () { menuPrincipal(); } }
            ]);
        }, 250);
    }

    function contato(assunto) {
        const C = window.CONTATO;
        balaoBot('Fale direto com a <b>' + esc(C.empresa) + '</b>:<br>WhatsApp <b>' + esc(C.whatsappFmt) + '</b><br>E-mail <b>' + esc(C.email) + '</b><br><span style="color:#777;font-size:.8rem;">Conte o que aconteceu e, se puder, mande um print da tela.' +
            (assunto ? ' Já vou preencher o assunto para você.' : '') + '</span><br><span style="color:#777;font-size:.8rem;"><i class="far fa-clock"></i> ' + C.horarios.map(esc).join(' · ') + '</span>');
        opcoes([
            { t: '<i class="fab fa-whatsapp"></i> Abrir WhatsApp', cor: '#1b8f4a', f: function () { suporteAbrirWhats(assunto); menuPrincipal('Posso ajudar em mais alguma coisa?'); } },
            { t: '<i class="fas fa-envelope"></i> Enviar e-mail', cor: '#1976d2', f: function () { suporteAbrirEmail(assunto); menuPrincipal('Posso ajudar em mais alguma coisa?'); } },
            { t: 'Voltar ao menu', cor: '#666', f: function () { menuPrincipal(); } }
        ]);
    }

    function iniciarChat() {
        const b = caixa(); if (!b || b.dataset.ok) return;
        b.dataset.ok = '1';
        balaoBot('Olá! 👋 Sou o <b>assistente do Comandas</b>. Tenho respostas detalhadas sobre cada parte do sistema (' + dados().reduce(function (n, c) { return n + c.itens.length; }, 0) + ' perguntas).');
        menuPrincipal();
    }

    window.suporteEnviar = function () {
        const inp = document.getElementById('chat-entrada'); if (!inp) return;
        const t = inp.value.trim(); if (!t) return;
        inp.value = '';
        balaoUsuario(t);
        const achou = buscar(t);
        if (!achou.length) {
            balaoBot('Não encontrei uma resposta para isso. Tente outras palavras (ex.: <i>fiado, caixa, impressora, licença, backup</i>) ou fale com a gente.');
            opcoes([{ t: 'Ver o menu de assuntos', f: function () { menuPrincipal(); } }, { t: '<i class="fas fa-headset"></i> Falar com o suporte', cor: '#1b8f4a', f: function () { balaoUsuario('Falar com o suporte'); contato(t); } }]);
            return;
        }
        balaoBot('Encontrei ' + (achou.length === 1 ? 'esta resposta' : 'estas respostas') + ' — toque para abrir:');
        const ops = achou.map(function (x) { const it = dados()[x.ci].itens[x.ii]; return { t: esc(it.p), f: function () { balaoUsuario(it.p); resposta(x.ci, x.ii); } }; });
        ops.push({ t: '<i class="fas fa-headset"></i> Falar com o suporte', cor: '#1b8f4a', f: function () { balaoUsuario('Falar com o suporte'); contato(t); } });
        opcoes(ops);
    };

    window.suporteAbrirWhats = function (assunto) {
        window.abrirLinkExterno(window.contatoWhatsAppUrl('Olá, Central da Evolução! Preciso de ajuda com o Comandas (v' + window.APP_VERSAO + ').' + (assunto ? '\nAssunto: ' + assunto : '')));
    };
    window.suporteAbrirEmail = function (assunto) {
        window.abrirLinkExterno(window.contatoEmailUrl('Suporte Comandas v' + window.APP_VERSAO, 'Olá, preciso de ajuda com o Comandas.' + (assunto ? '\nAssunto: ' + assunto : '') + '\n\nDescreva o problema:\n'));
    };
})();
