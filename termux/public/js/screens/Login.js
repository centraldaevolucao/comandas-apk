// public/js/screens/Login.js
window.abrirLoginModal = function() {
    const anterior = document.getElementById('modal-login');
    if (anterior) anterior.remove();

    const modal = document.createElement('div');
    modal.id = 'modal-login'; modal.className = 'modal-overlay';
    modal.style.zIndex = '99999';
    modal.onclick = function(e) { if (e.target === modal) fecharLoginModal(); };

    modal.innerHTML =
        '<div class="modal-content" style="max-width:420px; border-radius: 16px;">' +
        '    <div class="modal-header" style="background: linear-gradient(135deg, #C2185B, #880E4F); border-radius: 16px 16px 0 0;">' +
        '        <strong style="font-size: 1.1rem;"><i class="fas fa-sign-in-alt"></i> Acessar Conta</strong>' +
        '        <button class="btn-limpar" onclick="fecharLoginModal()" style="color:#fff;"><i class="fas fa-xmark"></i></button>' +
        '    </div>' +
        '    <div class="modal-body" style="padding: 24px;">' +
        '        <form onsubmit="event.preventDefault(); fazerLoginModal();">' +
        '            <div class="field"><label>E-mail</label><input type="email" id="modal-login-email" placeholder="usuario@email.com" required></div>' +
        '            <div class="field"><label>Senha</label><input type="password" id="modal-login-senha" placeholder="••••••••" required></div>' +
        '            <button type="submit" id="modal-login-btn" class="btn-primary" style="width:100%;padding:14px;font-size:1rem; margin-top: 10px;">' +
        '                <i class="fas fa-sign-in-alt"></i> Entrar' +
        '            </button>' +
        '        </form>' +
        '    </div>' +
        '</div>';

    document.body.appendChild(modal);
};

window.fecharLoginModal = function() { const m = document.getElementById('modal-login'); if (m) m.remove(); };

window.fazerLoginModal = async function() {
    const email = document.getElementById('modal-login-email').value.trim().toLowerCase();
    const senha = document.getElementById('modal-login-senha').value;
    const btn = document.getElementById('modal-login-btn');

    if (!email || !senha) { alert('Preencha todos os campos.'); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = 'Entrando...'; }

    try {
        const base = (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
        let urlLogin = base + '/api/login';
        if (window.MT && window.MT.clienteId) urlLogin = base + '/api/c/' + window.MT.clienteId + '/login';

        const res = await fetch(urlLogin, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha }),
            // Importante: o navegador precisa aceitar o cookie
            credentials: 'include' 
        });
        
        const data = await res.json();

        if (!res.ok || !data.ok) {
            alert(data.msg || 'E-mail ou senha incorretos.');
            if (btn) { btn.disabled = false; btn.innerHTML = 'Entrar'; }
            return;
        }

        // O servidor definiu o Cookie. Apenas recarregamos a tela.
        window.location.reload();

    } catch (e) {
        console.error(e);
        alert('Erro ao conectar com o servidor.');
        if (btn) { btn.disabled = false; btn.innerHTML = 'Entrar'; }
    }
};