// ============================================================
// LOGINFUNCAO.JS — Modo Cliente: escolha da função e login
//  • Garçom: entra sem cadastro (se tiver cadastro, pode logar em Rede e conexão).
//  • Cozinha / Caixa / Cardápio: exigem login (e-mail + senha de um colaborador com acesso).
// Aviso: é um bloqueio de TELA; o servidor ainda não filtra os dados por função.
// ============================================================
console.log('✔ loginFuncao.js carregado');
(function () {
    'use strict';
    const LIVRES = ['garcom'];

    window.sessaoToken = function () { try { return localStorage.getItem('sessToken') || ''; } catch (e) { return ''; } };
    window.sessaoGuardar = function (t) { try { t ? localStorage.setItem('sessToken', t) : localStorage.removeItem('sessToken'); } catch (e) {} };

    /** Pergunta a função do aparelho; devolve (via callback) o id escolhido ou null se cancelou.
     *  Lista as funções cadastradas (Colaboradores › Funções) marcadas para o modo cliente, mais "Cardápio do dia"
     *  e, se o administrador habilitou no modo servidor, "Modo Treinamento". */
    window.perguntarFuncao = async function (atual, aoEscolher) {
        const old = document.getElementById('modal-funcao'); if (old) old.remove();
        try { if (window.carregarPerfisDinamicos) await window.carregarPerfisDinamicos(); } catch (e) {}
        const itens = [];
        Object.keys(window.PERFIS).forEach(function (k) {
            const p = window.PERFIS[k];
            if (k.indexOf('f:') === 0) itens.push({ id: k, nome: p.nome, icone: p.icone, sub: p.livre ? 'Entra sem cadastro' : 'Nível: ' + nomeNivel(p.nivel) + (exigeLogin() ? ' · exige login' : '') });
        });
        if (!itens.length) ['garcom', 'cozinha', 'caixa'].forEach(function (k) { const p = window.PERFIS[k]; itens.push({ id: k, nome: p.nome, icone: p.icone, sub: LIVRES.indexOf(k) >= 0 ? 'Entra sem cadastro' : 'Exige login de colaborador' }); });
        itens.push({ id: 'cardapio', nome: window.PERFIS.cardapio.nome, icone: window.PERFIS.cardapio.icone, sub: 'Somente o cardápio do dia' });
        if ((window.__cfgLogin || {}).treinamento) itens.push({ id: 'treinamento', nome: 'Modo Treinamento', icone: 'fa-graduation-cap', sub: 'Administrador · acesso total às funções' });
        const m = document.createElement('div');
        m.id = 'modal-funcao'; m.className = 'modal-overlay';
        m.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;padding:16px;';
        let h = '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '<div style="background:#C2185B;color:#fff;padding:14px 16px;font-weight:700;">Qual a função deste aparelho?</div><div style="padding:14px 16px;overflow-y:auto;">';
        itens.forEach(function (p) {
            const ativo = p.id === atual;
            h += '<button type="button" data-f="' + p.id + '" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px;margin-bottom:8px;border:2px solid ' + (ativo ? '#C2185B' : '#e0e0e0') + ';background:' + (ativo ? '#FCE4EC' : '#fff') + ';border-radius:12px;cursor:pointer;">' +
                '<i class="fas ' + p.icone + '" style="color:#C2185B;width:24px;text-align:center;"></i><span style="flex:1;min-width:0;"><b>' + esc(p.nome) + '</b><br><small style="color:#666;">' + esc(p.sub) + '</small></span></button>';
        });
        h += '<button type="button" id="mf-cancelar" class="btn-outline" style="width:100%;">Cancelar</button></div></div>';
        m.innerHTML = h; document.body.appendChild(m);
        m.querySelectorAll('button[data-f]').forEach(function (b) { b.onclick = function () { m.remove(); aoEscolher(b.getAttribute('data-f')); }; });
        document.getElementById('mf-cancelar').onclick = function () { m.remove(); aoEscolher(null); };
    };
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function nomeNivel(id) { const n = (window.__niveisCache || []).find(function (x) { return String(x.id) === String(id); }); return n ? n.nome : String(id || ''); }
    function exigeLogin() { return (window.__cfgLogin || {}).exigir !== false; }

    function precisaLogin() {
        const mt = window.MT || {};
        if (window.__semConfigLocal) return false;
        if (mt.tipoDispositivo !== 'cliente') return false;
        const f = mt.funcaoDispositivo || 'garcom';
        if (f === 'treinamento') return true;                       // administrador: sempre exige login
        if (!exigeLogin()) return false;                            // Configurações › "Exigir login": desligado
        const p = window.PERFIS[f];
        if (p && p.livre) return false;
        return LIVRES.indexOf(f) < 0;
    }

    async function sessaoValida() {
        try {
            const r = await (window.CX ? window.CX.fetch('/api/sessao', { cache: 'no-store' }) : fetch('/api/sessao'));
            return r.ok;
        } catch (e) { return null; }   // null = servidor inalcançável (não bloqueia a tela de Rede)
    }

    window.verificarLoginFuncao = async function () {
        if (!precisaLogin()) { fecharOverlay(); return; }
        const rota = (location.hash || '').substring(1);
        if (rota === 'rede' || rota === 'tipo-dispositivo') return;   // sempre dá para corrigir conexão/modo
        const ok = await sessaoValida();
        if (ok === false) mostrarLogin();
        else fecharOverlay();
    };

    function fecharOverlay() { const o = document.getElementById('login-funcao'); if (o) o.remove(); }

    function mostrarLogin() {
        if (document.getElementById('login-funcao')) return;
        const nome = window.MT.funcaoDispositivo === 'treinamento' ? 'Modo Treinamento (administrador)' : ((window.PERFIS[window.MT.funcaoDispositivo] || {}).nome || 'esta função');
        const o = document.createElement('div');
        o.id = 'login-funcao';
        o.style.cssText = 'position:fixed;inset:0;background:rgba(60,0,30,.92);z-index:300000;display:flex;align-items:center;justify-content:center;padding:16px;';
        o.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:360px;width:100%;padding:20px;">' +
            '<div style="font-weight:700;font-size:1.1rem;color:#C2185B;margin-bottom:4px;"><i class="fas fa-lock"></i> Entrar — ' + nome + '</div>' +
            '<div style="font-size:.8rem;color:#666;margin-bottom:12px;">Use o e-mail e a senha do seu cadastro em Colaboradores.</div>' +
            '<div class="field"><label>E-mail</label><input type="email" id="lf-email" autocomplete="username"></div>' +
            '<div class="field"><label>Senha</label><input type="password" id="lf-senha" autocomplete="current-password"></div>' +
            '<div id="lf-erro" style="color:#c62828;font-size:.85rem;min-height:18px;"></div>' +
            '<button class="btn-primary" id="lf-entrar" style="width:100%;margin-top:6px;">Entrar</button>' +
            '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="document.getElementById(\'login-funcao\').remove();navigateTo(\'tipo-dispositivo\')">Trocar função / modo</button>' +
            '<button class="btn-outline" style="width:100%;margin-top:8px;" onclick="document.getElementById(\'login-funcao\').remove();navigateTo(\'rede\')">Rede e conexão</button></div>';
        document.body.appendChild(o);
        const entrar = async function () {
            const email = document.getElementById('lf-email').value.trim().toLowerCase();
            const senha = document.getElementById('lf-senha').value;
            const erro = document.getElementById('lf-erro');
            if (!email || !senha) { erro.textContent = 'Preencha e-mail e senha.'; return; }
            try {
                const r = await window.CX.fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email, senha: senha }) });
                const d = await r.json();
                if (!r.ok || !d.ok) { erro.textContent = d.msg || 'E-mail ou senha inválidos.'; return; }
                if (window.MT.funcaoDispositivo === 'treinamento' && !(d.usuario && (d.usuario.nivel === 'admin' || d.usuario.isDono))) {
                    erro.textContent = 'O Modo Treinamento é só para administrador.'; return;
                }
                window.sessaoGuardar(d.token || '');
                fecharOverlay();
                if (window.navigateTo) window.navigateTo(window.perfilRotaInicial ? window.perfilRotaInicial() : 'home');
            } catch (e) { erro.textContent = 'Servidor inacessível. Verifique Rede e conexão.'; }
        };
        document.getElementById('lf-entrar').onclick = entrar;
        document.getElementById('lf-senha').onkeydown = function (e) { if (e.key === 'Enter') entrar(); };
    }

    window.addEventListener('cx:status', function () { window.verificarLoginFuncao(); });
    window.addEventListener('hashchange', function () { window.verificarLoginFuncao(); });

    // ---------- trocar função / modo / "servidor não localizado" ----------
    window.trocarFuncaoAgora = function () {
        const fechar = function () { const o = document.getElementById('menu-conexao'); if (o) o.remove(); };
        fechar();
        window.perguntarFuncao(window.MT.funcaoDispositivo || 'garcom', async function (f) {
            if (!f) return;
            window.sessaoGuardar('');
            window.MT.funcaoDispositivo = f;
            try { await window.MT.salvar(); } catch (e) {}
            if (window.navigateTo) window.navigateTo('home');
            setTimeout(function () { window.verificarLoginFuncao && window.verificarLoginFuncao(); }, 150);
        });
    };

    /** Janela padrão do app com ações de conexão (usada pela pílula e quando o servidor não é encontrado). */
    window.menuConexao = function (semServidor) {
        const old = document.getElementById('menu-conexao'); if (old) old.remove();
        const o = document.createElement('div');
        o.id = 'menu-conexao';
        o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;display:flex;align-items:center;justify-content:center;padding:16px;';
        const cx = window.CX || {};
        const btn = function (id, ic, t, cls) { return '<button type="button" id="' + id + '" class="' + (cls || 'btn-outline') + '" style="width:100%;margin-top:8px;"><i class="fas ' + ic + '"></i> ' + t + '</button>'; };
        o.innerHTML = '<div style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);">' +
            '<div style="background:' + (semServidor ? '#c62828' : '#C2185B') + ';color:#fff;padding:14px 16px;font-weight:700;"><i class="fas ' + (semServidor ? 'fa-exclamation-triangle' : 'fa-server') + '"></i> ' +
            (semServidor ? 'Servidor não localizado' : 'Informações do servidor') + '</div>' +
            '<div style="padding:14px 16px;font-size:.9rem;color:#444;">' +
            (semServidor ? 'Não foi possível conectar. Tente novamente ou escolha outro modo de operação.' :
              'Estado: <b>' + (cx.estado || '—') + '</b>' + (cx.ativo ? '<br>Servidor: <b>' + cx.ativo + '</b>' : '')) +
            btn('mc-tentar', 'fa-bolt', 'Tentar novamente', 'btn-primary') +
            btn('mc-modo', 'fa-exchange-alt', 'Alterar modo (Único / Servidor / Cliente)') +
            btn('mc-funcao', 'fa-id-badge', 'Trocar função (Garçom, Caixa, Cozinha…)') +
            btn('mc-rede', 'fa-network-wired', 'Rede e conexão') +
            btn('mc-fechar', 'fa-times', 'Fechar') + '</div></div>';
        document.body.appendChild(o);
        const f = function () { o.remove(); };
        document.getElementById('mc-tentar').onclick = function () { f(); window.CX && window.CX.escolher && window.CX.escolher('manual'); };
        document.getElementById('mc-modo').onclick = function () { f(); window.navigateTo('tipo-dispositivo'); };
        document.getElementById('mc-funcao').onclick = function () { f(); window.trocarFuncaoAgora(); };
        document.getElementById('mc-rede').onclick = function () { f(); window.navigateTo('rede'); };
        document.getElementById('mc-fechar').onclick = f;
    };

    let avisouSemServidor = false;
    window.addEventListener('cx:status', function (ev) {
        const mt = window.MT || {}, cx = (ev && ev.detail) || window.CX || {};
        if (mt.tipoDispositivo !== 'cliente') { avisouSemServidor = false; return; }
        if (cx.estado === 'offline') {
            const rota = (location.hash || '').substring(1);
            if (!avisouSemServidor && rota !== 'rede' && rota !== 'tipo-dispositivo') {
                avisouSemServidor = true;
                setTimeout(function () { if ((window.CX || {}).estado === 'offline') window.menuConexao(true); }, 4000);
            }
        } else if (cx.estado === 'conectado') avisouSemServidor = false;
    });
})();
