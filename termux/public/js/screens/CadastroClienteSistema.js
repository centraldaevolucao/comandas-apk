// ============================================================
// CADASTROCLIENTESISTEMA.JS — Cadastro público (multi-tenant)
// ============================================================

console.log('✔ CadastroClienteSistema.js carregado');

window.renderCadastroClienteSistema = function() {
    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="navigateTo(\'pdv\')"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Criar Conta</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="content-area" style="padding:16px;">',
        '    <div style="text-align:center;margin-bottom:24px;">',
        '        <div style="width:80px;height:80px;background:#FCE4EC;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto;">',
        '            <i class="fas fa-store" style="font-size:2.5rem;color:#C2185B;"></i>',
        '        </div>',
        '        <h2 style="margin-top:16px;color:var(--primary-color);font-size:1.3rem;">Crie sua conta</h2>',
        '        <p style="color:#666;margin-top:8px;line-height:1.5;font-size:0.9rem;">',
        '            Você terá uma <b>base de dados independente</b> com seu próprio ID de acesso.<br>',
        '            Poderá acessar de qualquer lugar pela internet.',
        '        </p>',
        '    </div>',
        '    <div class="card" style="background:#fff;">',
        '        <div class="card-title">📋 Dados do responsável</div>',
        '        <div class="field"><label>Seu nome *</label><input type="text" id="cad-nome" maxlength="60" placeholder="Ex: João Silva"></div>',
        '        <div class="field"><label>Nome do estabelecimento</label><input type="text" id="cad-empresa" maxlength="60" placeholder="Ex: Mini Mercado do João"></div>',
        '        <div class="field"><label>E-mail *</label><input type="email" id="cad-email" maxlength="80" placeholder="voce@email.com"></div>',
        '        <div class="field" style="margin-bottom:0;"><label>Senha * (mínimo 4 caracteres)</label><input type="password" id="cad-senha" minlength="4" placeholder="••••••••"></div>',
        '    </div>',
        '    <div class="card" style="background:#fff3e0;border-left:4px solid #ff9800;">',
        '        <div style="font-size:0.85rem;color:#e65100;line-height:1.5;">',
        '            <i class="fas fa-info-circle"></i>',
        '            <b>Como funciona:</b>',
        '            <ul style="margin:8px 0 0 18px;padding:0;">',
        '                <li>Sua base é separada dos outros clientes</li>',
        '                <li>Você recebe um ID de acesso (ex: <code>ABCD-1234</code>)</li>',
        '                <li>Use o ID para entrar de qualquer dispositivo</li>',
        '                <li>Ou use o IP se estiver na mesma rede</li>',
        '            </ul>',
        '        </div>',
        '    </div>',
        '    <button class="btn-primary" style="margin-top:16px;padding:14px;font-size:1rem;" onclick="criarContaCliente()">',
        '        <i class="fas fa-check"></i> Criar minha conta',
        '    </button>',
        '    <div style="text-align:center;margin-top:14px;">',
        '        <a href="#" onclick="event.preventDefault(); navigateTo(\'pdv\')" style="font-size:0.85rem;color:#666;text-decoration:none;">',
        '            Continuar sem conta (modo local)',
        '        </a>',
        '    </div>',
        '</div>'
    ].join('\n');
};

window.criarContaCliente = async function() {
    const nome = (document.getElementById('cad-nome').value || '').trim();
    const empresa = (document.getElementById('cad-empresa').value || '').trim();
    const email = (document.getElementById('cad-email').value || '').trim().toLowerCase();
    const senha = document.getElementById('cad-senha').value || '';

    if (!nome) { alert('Informe seu nome'); return; }
    if (!email || email.indexOf('@') < 0) { alert('Informe um e-mail válido'); return; }
    if (senha.length < 4) { alert('Senha deve ter ao menos 4 caracteres'); return; }

    try {
        const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
        const res = await fetch(base + '/api/cadastro-cliente', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, nomeEmpresa: empresa })
        });
        const data = await res.json();

        if (!data.ok) { alert(data.msg || 'Erro ao cadastrar'); return; }

        const id = data.idAcesso;
        const msg = '✅ CONTA CRIADA COM SUCESSO!\n\nSeu ID de acesso é:\n    ' + id +
                    '\n\nGuarde este ID. Você vai usá-lo para entrar de outros dispositivos.\n\n' +
                    'Copiar agora para a área de transferência?';

        if (await window.confirmar(msg)) {
            try { await navigator.clipboard.writeText(id); } catch (e) {}
        }

        if (window.MT) {
            window.MT.tipoDispositivo = 'cliente';
            window.MT.ipServidor = window.MT.ipServidor || location.hostname;
            window.MT.portaServidor = window.MT.portaServidor || location.port || 3000;
            window.MT.idAcesso = id;
            window.MT.clienteId = data.clienteId;
            window.MT.basePadrao = false;
            await window.MT.salvar();
        }

        // Login automático (cookie via servidor — sem localStorage)
        try {
            const baseApi = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
            await fetch(baseApi + '/api/c/' + data.clienteId + '/login', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });
        } catch (e) {}

        await window.avisar('ID de acesso: ' + id + '\n\nVocê está conectado à sua base!');
        window.location.reload();
    } catch (e) {
        alert('Erro ao cadastrar: ' + e.message);
    }
};