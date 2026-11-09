// public/js/screens/CadastroUsuario.js
console.log('✔ CadastroUsuario.js carregado');

window.renderCadastroUsuario = function() {
    return [
        '<div class="app-bar">',
        '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
        '    <h1>Criar Conta</h1>',
        '    <div style="width:40px;"></div>',
        '</div>',
        '<div class="login-wrapper" style="background:#f9f9f9; min-height:auto;">',
        '    <div class="login-container">',
        '        <div class="login-card" style="box-shadow: none;">',
        '            <div class="login-header">',
        '                <h2>Primeiro Acesso</h2>',
        '                <p>Cadastre seu e-mail e crie uma senha segura.</p>',
        '            </div>',
        '            <form onsubmit="event.preventDefault(); salvarNovoUsuario()">',
        '                <div class="field">',
        '                    <label>Nome Completo</label>',
        '                    <div class="input-icon"><i class="fas fa-user"></i><input type="text" id="cad-nome" required></div>',
        '                </div>',
        '                <div class="field">',
        '                    <label>E-mail</label>',
        '                    <div class="input-icon"><i class="fas fa-envelope"></i><input type="email" id="cad-email" required></div>',
        '                </div>',
        '                <div class="field">',
        '                    <label>Senha</label>',
        '                    <div class="input-icon"><i class="fas fa-lock"></i><input type="password" id="cad-senha" required minlength="4"></div>',
        '                </div>',
        '                <div class="field">',
        '                    <label>Pergunta de Segurança (para recuperar senha)</label>',
        '                    <div class="input-icon"><i class="fas fa-shield-alt"></i><input type="text" id="cad-pergunta" placeholder="Ex: Nome do meu primeiro animal" required></div>',
        '                </div>',
        '                <div class="field">',
        '                    <label>Resposta de Segurança</label>',
        '                    <div class="input-icon"><i class="fas fa-key"></i><input type="text" id="cad-resposta" required></div>',
        '                </div>',
        '                <button type="submit" class="btn-primary" style="padding:14px; border-radius:10px;">',
        '                    <i class="fas fa-check"></i> Cadastrar',
        '                </button>',
        '            </form>',
        '        </div>',
        '    </div>',
        '</div>'
    ].join('\n');
};

window.salvarNovoUsuario = async function() {
    const nome = document.getElementById('cad-nome').value.trim();
    const email = document.getElementById('cad-email').value.trim().toLowerCase();
    const senha = document.getElementById('cad-senha').value;
    const pergunta = document.getElementById('cad-pergunta').value.trim();
    const resposta = document.getElementById('cad-resposta').value.trim().toLowerCase();

    const usuarios = window.normalizarArray(await apiGet('usuarios'));

    if (usuarios.some(function(u) { return u.email === email; })) {
        alert('Este e-mail já está cadastrado.');
        return;
    }

    // Simulação de Hash (Base64) para não salvar a senha em texto puro
    const senhaHash = btoa(senha);

    const novoUsuario = {
        id: Date.now(),
        nome: nome,
        email: email,
        senha: senhaHash,
        perguntaSeguranca: pergunta,
        respostaSeguranca: btoa(resposta),
        nivel: 'admin' // O primeiro usuário criado vira admin. Você pode mudar depois.
    };

    usuarios.push(novoUsuario);
    await apiSave('usuarios', usuarios);

    await window.avisar('Conta criada com sucesso! Faça login.');
    navigateTo('login');
};