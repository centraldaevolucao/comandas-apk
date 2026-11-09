// ============================================================
// SENHA.JS — Habilitar senha de acesso
// ============================================================

console.log('✔ Senha.js carregado');

if (window.renderSenha) {
    console.log('⚠️ Senha.js já carregado');
} else {
    window.renderSenha = function() {
        setTimeout(carregarSenha, 50);

        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Senha para acessos</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="senha-conteudo" style="padding:16px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarSenha() {
        const container = document.getElementById('senha-conteudo');
        if (!container) return;

        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            const senhaAtiva = config.senhaMestreAtiva || false;

            let html = '';
            html += '<div class="card" style="background:#FCE4EC;border-radius:12px;padding:16px;display:flex;justify-content:space-between;align-items:center;">';
            html += '    <div style="font-size:1rem;font-weight:500;">Habilitar senha mestre</div>';
            html += '    <label class="toggle"><input type="checkbox" id="chk-senha-mestre" ' + (senhaAtiva ? 'checked' : '') + ' onchange="toggleSenhaMestre()"><span class="slider"></span></label>';
            html += '</div>';

            html += '<div id="campos-senha" style="display:' + (senhaAtiva ? 'block' : 'none') + '; margin-top:16px;">';
            html += '    <div class="card" style="background:#fff;border:1px solid #ddd;padding:16px;">';
            html += '        <div class="field" style="margin-bottom:12px;">';
            html += '            <label>Nova Senha Mestre</label>';
            html += '            <input type="password" id="nova-senha" placeholder="Digite a senha">';
            html += '        </div>';
            html += '        <div class="field" style="margin-bottom:16px;">';
            html += '            <label>Confirmar Senha</label>';
            html += '            <input type="password" id="conf-senha" placeholder="Confirme a senha">';
            html += '        </div>';
            html += '        <button class="btn-primary" onclick="salvarSenha()">Salvar Senha</button>';
            html += '    </div>';
            html += '</div>';

            container.innerHTML = html;

        } catch (e) {
            console.error('Erro:', e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro: ' + e.message + '</p>';
        }
    }

    window.toggleSenhaMestre = function() {
        const isChecked = document.getElementById('chk-senha-mestre').checked;
        document.getElementById('campos-senha').style.display = isChecked ? 'block' : 'none';
        
        // Se desmarcou, já salva como desativado
        if (!isChecked) {
            salvarSenhaConfig(false, '');
        }
    };

    window.salvarSenha = function() {
        const novaSenha = document.getElementById('nova-senha').value;
        const confSenha = document.getElementById('conf-senha').value;

        if (!novaSenha || novaSenha.length < 4) {
            alert('A senha deve ter pelo menos 4 caracteres.');
            return;
        }
        if (novaSenha !== confSenha) {
            alert('As senhas não coincidem.');
            return;
        }

        salvarSenhaConfig(true, novaSenha);
    };

    async function salvarSenhaConfig(ativa, senha) {
        try {
            let config = {};
            try {
                const configArr = await apiGet('configuracoes');
                const arr = window.normalizarArray(configArr);
                config = arr[0] || {};
            } catch (e) {}

            config.senhaMestreAtiva = ativa;
            if (ativa) {
                config.senhaMestre = senha; // Em um sistema real, fazer hash!
            } else {
                delete config.senhaMestre;
            }

            await apiSave('configuracoes', [config]);

            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast(ativa ? '✅ Senha mestre ativada' : '✅ Senha mestre desativada');
            } else {
                alert(ativa ? 'Senha ativada' : 'Senha desativada');
            }
            
            if (ativa) {
                document.getElementById('nova-senha').value = '';
                document.getElementById('conf-senha').value = '';
            }

        } catch (e) {
            alert('Erro ao salvar senha: ' + e.message);
        }
    }

    console.log('✔ Senha.js carregado');
}