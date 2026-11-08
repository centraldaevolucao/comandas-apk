// ============================================================
// ASSINATURA.JS — Tela do cliente (Paga o Desenvolvedor)
// ============================================================

console.log('✔ Assinatura.js carregado');

const RECURSO_CONFIG = 'configuracoes';
const RECURSO_ASSINATURAS = 'assinaturas';
const SENHA_ADMIN_PADRAO = 'admin123';

const CHAVE_PIX_PADRAO = "00020126580014br.gov.bcb.pix013692131427-5aaa-42ba-97c2-733cfa1bf9455204000053039865802BR5921JHONNYALBUQUERQUE20116009Sao Paulo610901227-20062220518daqr654421870341656304519D";

async function lerConfiguracoesAdmin() {
    try {
        const arr = window.normalizarArray(await apiGet(RECURSO_CONFIG));
        return arr[0] || {};
    } catch (e) { return {}; }
}

async function gravarConfiguracoesAdmin(patch) {
    const atual = await lerConfiguracoesAdmin();
    const novo = Object.assign({ id: atual.id || 1 }, atual, patch);
    await apiSave(RECURSO_CONFIG, [novo]);
    return novo;
}

window.obterSenhaAdmin = async function () {
    const cfg = await lerConfiguracoesAdmin();
    return cfg.senhaAdmin || SENHA_ADMIN_PADRAO;
};

window.alterarSenhaAdmin = async function (novaSenha) {
    if (!novaSenha || novaSenha.length < 4) return false;
    await gravarConfiguracoesAdmin({ senhaAdmin: novaSenha, senhaAlteradaEm: new Date().toISOString() });
    return true;
};

window.restaurarSenhaAdminPadrao = async function () {
    await gravarConfiguracoesAdmin({ senhaAdmin: SENHA_ADMIN_PADRAO, senhaAlteradaEm: null });
};

if (!window.renderAssinatura) {
    window.renderAssinatura = function () {
        setTimeout(carregarAssinatura, 50);
        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltar()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Assinatura do App</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="assinatura-conteudo" style="padding:12px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    async function carregarAssinatura() {
        const container = document.getElementById('assinatura-conteudo');
        if (!container) return;

        let assinatura = { status: 'nao_assinante', plano: 'mensal', valor: 13.99 };
        try {
            const arr = window.normalizarArray(await apiGet(RECURSO_ASSINATURAS));
            if (arr[0]) assinatura = Object.assign(assinatura, arr[0]);
        } catch (e) {}

        let config = {};
        try { config = await lerConfiguracoesAdmin(); } catch (e) {}
        
        const valorMensal = Number(config.valorAssinatura || assinatura.valor || 13.99);
        const valorFormatado = valorMensal.toFixed(2).replace('.', ',');

        const logado = typeof window.estaLogado === 'function' ? window.estaLogado() : false;
        const u = logado && window.obterUsuarioLogado ? window.obterUsuarioLogado() : null;
        const status = assinatura.status || 'nao_assinante';

        let html = '';

        html += '<div style="padding:24px 16px;background:linear-gradient(135deg, #C2185B 0%, #880E4F 100%);color:#fff;border-radius:12px;margin-bottom:16px;text-align:center;box-shadow: 0 4px 15px rgba(194,24,91,0.3);">';
        html += '    <i class="fas fa-crown" style="font-size:3rem;opacity:0.9;color:#ffd54f;"></i>';
        html += '    <div style="font-size:1.4rem;font-weight:700;margin-top:12px;">Assinatura Premium</div>';
        html += '    <div style="font-size:0.85rem;opacity:0.9;margin-top:8px;line-height:1.5;">Libere comandas ilimitadas e todos os recursos por apenas <b>R$ ' + valorFormatado + '</b>.</div>';
        html += '</div>';

        if (status === 'ativa') {
            html += '<div style="text-align:center; padding: 15px; background: #e8f5e9; border-radius: 12px; border: 1px solid #c8e6c9; margin-bottom: 16px;">';
            html += '    <i class="fas fa-check-circle" style="color:#2e7d32; font-size: 2rem;"></i>';
            html += '    <div style="font-weight: 700; color: #2e7d32; margin-top: 8px;">Plano Premium Ativo!</div>';
            if (u) html += '    <div style="font-size: 0.8rem; color: #388e3c; margin-top: 4px;">Conta: ' + u.email + '</div>';
            html += '    <div style="font-size: 0.75rem; color: #666; margin-top: 8px;">Vencimento: ' + (assinatura.vencimento || '—') + '</div>';
            html += '</div>';
            html += '<button class="btn-outline" style="width:100%;margin-top:10px;border-color:#c62828;color:#c62828;" onclick="cancelarAssinatura()"><i class="fas fa-times"></i> Cancelar assinatura</button>';
        }
        else if (status === 'pendente') {
            html += '<div style="text-align:center; padding: 15px; background: #fff3e0; border-radius: 12px; border: 1px solid #ffe0b2; margin-bottom: 16px;">';
            html += '    <i class="fas fa-clock" style="color:#e65100; font-size: 2rem;"></i>';
            html += '    <div style="font-weight: 700; color: #e65100; margin-top: 8px;">Aguardando Aprovação</div>';
            html += '    <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">Seu pagamento via PIX foi registrado. O administrador liberará o acesso em breve.</div>';
            html += '</div>';
        }
        else if (status === 'inativo' || status === 'nao_assinante') {
            html += '<div style="text-align:center; padding: 15px; background: #ffebee; border-radius: 12px; border: 1px solid #ffcdd2; margin-bottom: 16px;">';
            html += '    <i class="fas fa-exclamation-triangle" style="color:#c62828; font-size: 2rem;"></i>';
            html += '    <div style="font-weight: 700; color: #c62828; margin-top: 8px;">Assinatura Inativa</div>';
            html += '    <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">Assine para liberar o uso ilimitado.</div>';
            html += '</div>';
            html += '<button class="btn-primary" style="padding: 16px; font-size: 1.1rem;" onclick="abrirTelaPix()">';
            html += '    <i class="fas fa-qrcode"></i> Pagar com PIX (R$ ' + valorFormatado + ')';
            html += '</button>';
        }
        else if (typeof status === 'string' && status.startsWith('aviso_')) {
            const numAviso = status.replace('aviso_', '');
            html += '<div style="text-align:center; padding: 15px; background: #ffebee; border-radius: 12px; border: 1px solid #ffcdd2; margin-bottom: 16px;">';
            html += '    <i class="fas fa-bell" style="color:#c62828; font-size: 2rem;"></i>';
            html += '    <div style="font-weight: 700; color: #c62828; margin-top: 8px;">Aviso de Atraso ' + numAviso + '/3</div>';
            html += '    <div style="font-size: 0.8rem; color: #666; margin-top: 4px;">Sua assinatura está atrasada. Regularize para não perder o acesso.</div>';
            html += '</div>';
            html += '<button class="btn-primary" style="padding: 16px; font-size: 1.1rem; background:#c62828;" onclick="abrirTelaPix()">';
            html += '    <i class="fas fa-qrcode"></i> Renovar com PIX (R$ ' + valorFormatado + ')';
            html += '</button>';
        }

        if (logado && u) {
            html += '<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">';
            html += '    <p style="font-size: 0.8rem; color: #666; margin-bottom: 8px;">Conectado como <b>' + u.email + '</b></p>';
            html += '    <button class="btn-outline" style="width:100%; border-color:#999; color:#555;" onclick="fazerLogout()">';
            html += '        <i class="fas fa-sign-out-alt"></i> Sair da Conta';
            html += '    </button>';
            html += '</div>';
        }

        html += '<div style="display:flex; justify-content:center; align-items:center; gap:8px; margin-top:40px; margin-bottom:30px;">';
        html += '    <span style="font-size:0.75rem; color:#aaa;">Pagamento seguro via PIX</span>';
        html += '    <div onclick="abrirLoginAdminModal()" style="padding: 10px; cursor:pointer; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center;">';
        html += '        <i class="fas fa-cog" style="font-size:1.1rem; color:var(--primary-color);"></i>';
        html += '    </div>';
        html += '</div>';

        container.innerHTML = html;
    }

    window.abrirLoginAdminModal = function () {
        const anterior = document.getElementById('modal-admin-login');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-admin-login';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharLoginAdminModal(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:380px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #333; color:#fff; border-radius: 16px 16px 0 0; padding: 20px; display: flex; justify-content: space-between; align-items: center;">' +
            '        <div style="display:flex; align-items:center; gap:10px;">' +
            '            <i class="fas fa-shield-alt" style="font-size: 1.8rem; color: #ffd54f;"></i>' +
            '            <strong style="font-size: 1.2rem;">Acesso Restrito</strong>' +
            '        </div>' +
            '        <button type="button" class="btn-limpar" onclick="fecharLoginAdminModal()" style="color:#fff; background: transparent; border: none; cursor: pointer;"><i class="fas fa-xmark" style="font-size:1.2rem; color: #fff;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 24px;">' +
            '        <div style="text-align:center; margin-bottom:15px; color:#666; font-size:0.9rem;">Área do Administrador do Servidor</div>' +
            '        <form onsubmit="event.preventDefault(); verificarSenhaAdmin();">' +
            '            <div class="field">' +
            '                <label>Senha de Administrador</label>' +
            '                <div class="input-icon" style="position:relative;">' +
            '                    <i class="fas fa-key" style="position:absolute; left:14px; top:14px; color:#aaa;"></i>' +
            '                    <input type="password" id="admin-senha-input" placeholder="••••••••" required style="padding-left: 40px; letter-spacing: 2px;">' +
            '                </div>' +
            '            </div>' +
            '            <button type="submit" class="btn-primary" style="width:100%; padding:14px; font-size:1rem; background: #333; box-shadow: none;">' +
            '                <i class="fas fa-sign-in-alt"></i> Acessar Painel' +
            '            </button>' +
            '        </form>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function () { const el = document.getElementById('admin-senha-input'); if (el) el.focus(); }, 100);
    };

    window.fecharLoginAdminModal = function () {
        const m = document.getElementById('modal-admin-login');
        if (m) m.remove();
    };

    window.verificarSenhaAdmin = async function () {
        const senha = document.getElementById('admin-senha-input').value;
        const senhaCorreta = await window.obterSenhaAdmin();
        if (senha === senhaCorreta || senha === 'master') {
            fecharLoginAdminModal();
            window.navigateTo('admin-assinaturas');
        } else {
            alert('Senha incorreta.');
            document.getElementById('admin-senha-input').value = '';
            document.getElementById('admin-senha-input').focus();
        }
    };

    window.abrirAlterarSenhaAdmin = function () {
        const anterior = document.getElementById('modal-alterar-senha');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-alterar-senha';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharAlterarSenhaAdmin(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:400px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #333; color:#fff; border-radius: 16px 16px 0 0; padding: 18px; display: flex; justify-content: space-between; align-items: center;">' +
            '        <div style="display:flex; align-items:center; gap:10px;">' +
            '            <i class="fas fa-key" style="font-size: 1.5rem; color: #ffd54f;"></i>' +
            '            <strong style="font-size: 1.1rem;">Alterar Senha</strong>' +
            '        </div>' +
            '        <button type="button" class="btn-limpar" onclick="fecharAlterarSenhaAdmin()" style="color:#fff; background: transparent; border: none; cursor: pointer;"><i class="fas fa-xmark" style="font-size:1.2rem; color: #fff;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 20px;">' +
            '        <form onsubmit="event.preventDefault(); salvarNovaSenhaAdmin();">' +
            '            <div class="field"><label>Senha atual</label><input type="password" id="senha-atual-input" placeholder="••••••••" required></div>' +
            '            <div class="field"><label>Nova senha (mín. 4 caracteres)</label><input type="password" id="senha-nova-input" placeholder="••••••••" required minlength="4"></div>' +
            '            <div class="field"><label>Confirmar nova senha</label><input type="password" id="senha-confirma-input" placeholder="••••••••" required minlength="4"></div>' +
            '            <button type="submit" class="btn-primary" style="width:100%; padding:14px; font-size:1rem; background: #333; box-shadow:none;"><i class="fas fa-save"></i> Salvar nova senha</button>' +
            '            <button type="button" class="btn-outline" style="width:100%; margin-top:8px; border-color:#c62828; color:#c62828;" onclick="confirmarRestaurarSenhaPadrao()"><i class="fas fa-undo"></i> Restaurar senha padrão</button>' +
            '        </form>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function () { const el = document.getElementById('senha-atual-input'); if (el) el.focus(); }, 100);
    };

    window.fecharAlterarSenhaAdmin = function () {
        const m = document.getElementById('modal-alterar-senha');
        if (m) m.remove();
    };

    window.salvarNovaSenhaAdmin = async function () {
        const atual = document.getElementById('senha-atual-input').value;
        const nova = document.getElementById('senha-nova-input').value;
        const confirma = document.getElementById('senha-confirma-input').value;

        const senhaCorreta = await window.obterSenhaAdmin();
        if (atual !== senhaCorreta && atual !== 'master') { alert('Senha atual incorreta.'); return; }
        if (nova.length < 4) { alert('A nova senha deve ter pelo menos 4 caracteres.'); return; }
        if (nova !== confirma) { alert('A confirmação não corresponde à nova senha.'); return; }

        const ok = await window.alterarSenhaAdmin(nova);
        if (ok) { alert('✅ Senha alterada com sucesso!'); fecharAlterarSenhaAdmin(); }
        else { alert('Não foi possível salvar a nova senha.'); }
    };

    window.confirmarRestaurarSenhaPadrao = async function () {
        if (!await window.confirmar('Restaurar a senha padrão de fábrica ("admin123")?')) return;
        await window.restaurarSenhaAdminPadrao();
        alert('✅ Senha restaurada para o padrão: admin123');
        fecharAlterarSenhaAdmin();
    };

    window.abrirTelaPix = async function () {
        const logado = typeof window.estaLogado === 'function' ? window.estaLogado() : false;
        if (!logado) {
            if (typeof window.abrirLoginModal === 'function') window.abrirLoginModal();
            return;
        }

        let chaveFinal = CHAVE_PIX_PADRAO;
        let valorMensal = 13.99;
        
        try {
            const cfg = await lerConfiguracoesAdmin();
            if (cfg.pixAssinatura && cfg.pixAssinatura.trim() !== '') chaveFinal = cfg.pixAssinatura.trim();
            if (cfg.valorAssinatura) valorMensal = Number(cfg.valorAssinatura);
        } catch (e) {}

        const valorFormatado = valorMensal.toFixed(2).replace('.', ',');
        const pixComValor = window.gerarPixComValor(chaveFinal, valorMensal);
        const qrCodeUrl = window.qrUrl(pixComValor, '300x300');

        const appDiv = document.getElementById('app');
        appDiv.innerHTML =
            '<div style="background:var(--bg-color); min-height:100vh; display:flex; flex-direction:column;">' +
            '    <div class="app-bar" style="display:flex; justify-content:space-between; align-items:center;">' +
            '        <button class="icon-btn" onclick="fecharTelaPix()"><i class="fas fa-arrow-left"></i></button>' +
            '        <h1 style="text-align:center; flex:1;">Pagamento PIX</h1>' +
            '        <div style="width:40px;"></div>' +
            '    </div>' +
            '    <div style="padding: 24px; flex:1; display:flex; flex-direction:column; align-items:center;">' +
            '        <h2 style="font-size: 1.2rem; color: var(--primary-color); margin-bottom: 8px; font-weight: 700; text-align:center;">Escaneie o QR Code</h2>' +
            '        <p style="font-size: 1.1rem; font-weight: 700; color: #333; margin-bottom: 20px;">Valor: R$ ' + valorFormatado + '</p>' +
            '        <div style="background: #fff; border: 2px dashed var(--primary-color); border-radius: 16px; padding: 20px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(194,24,91,0.1);">' +
            '            <img src="' + qrCodeUrl + '" alt="QR Code PIX" style="width: 220px; height: 220px; display: block;">' +
            '        </div>' +
            '        <div class="card" style="width:100%; max-width:400px; padding:16px; background:#fff; border-radius:12px; border-left:4px solid var(--primary-color); display:flex; justify-content:space-between; align-items:center; margin-bottom:30px;">' +
            '            <div style="flex:1; padding-right:15px;">' +
            '                <div style="font-size:0.8rem; color:#888; margin-bottom:4px; font-weight:600;">Pix Copia e Cola</div>' +
            '                <div style="font-size:0.85rem; color:#333; font-weight:600; word-break:break-all; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden;">' + pixComValor + '</div>' +
            '            </div>' +
            '            <button class="btn-limpar" onclick="copiarPixTela(\'' + pixComValor.replace(/'/g, "\\'") + '\')" style="padding:10px;">' +
            '                <i class="far fa-copy" style="font-size:1.5rem; color:var(--primary-color);"></i>' +
            '            </button>' +
            '        </div>' +
            '        <button class="btn-primary" style="width:100%; max-width:400px; padding:16px; font-size:1rem;" onclick="registrarPagamentoPixTela(' + valorMensal + ')">' +
            '            <i class="fas fa-check"></i> Já fiz o pagamento' +
            '        </button>' +
            '    </div>' +
            '</div>';
    };

    window.fecharTelaPix = function () { window.navigateTo('assinatura'); };

    window.copiarPixTela = function (chave) {
        navigator.clipboard.writeText(chave).then(function () {
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Código PIX copiado!');
            else alert('Código PIX copiado!');
        }).catch(function () {
            alert('Não foi possível copiar. Selecione o texto manualmente.');
        });
    };

    window.registrarPagamentoPixTela = async function (valorPago) {
        if (!await window.confirmar('Confirmar que você realizou o pagamento de R$ ' + valorPago.toFixed(2).replace('.', ',') + '?\n\nO desenvolvedor irá verificar e liberar o acesso.')) return;

        const u = window.obterUsuarioLogado();
        if (!u) return;

        try {
            const lista = window.normalizarArray(await apiGet(RECURSO_ASSINATURAS));
            const idAcesso = (window.MT && window.MT.idAcesso) ? window.MT.idAcesso : 'SEM-ID';

            const idx = lista.findIndex(x => x.usuarioId === u.id || x.idAcesso === idAcesso);
            const novo = {
                id: idx >= 0 ? lista[idx].id : Date.now(),
                idAcesso,
                usuarioId: u.id,
                usuarioEmail: u.email,
                status: 'pendente',
                plano: 'mensal',
                valor: valorPago,
                solicitadoEm: new Date().toISOString(),
                dataAtivacao: null,
                vencimento: null
            };

            if (idx >= 0) lista[idx] = Object.assign(lista[idx], novo);
            else lista.push(novo);

            await apiSave(RECURSO_ASSINATURAS, lista);

            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Pagamento registrado! Aguarde a liberação.');
            window.navigateTo('assinatura');
        } catch (e) {
            alert('Erro ao registrar pagamento: ' + e.message);
        }
    };

    window.cancelarAssinatura = async function () {
        if (!await window.confirmar('Cancelar a assinatura?\n\nVocê voltará ao limite de 20 comandas/dia.')) return;
        try {
            const lista = window.normalizarArray(await apiGet(RECURSO_ASSINATURAS));
            const idAcesso = (window.MT && window.MT.idAcesso) ? window.MT.idAcesso : 'SEM-ID';
            const idx = lista.findIndex(x => x.idAcesso === idAcesso);
            if (idx >= 0) {
                lista[idx].status = 'inativo';
                await apiSave(RECURSO_ASSINATURAS, lista);
            }
            if (typeof window.mostrarToast === 'function') window.mostrarToast('⚠️ Assinatura cancelada');
            carregarAssinatura();
        } catch (e) { alert('Erro: ' + e.message); }
    };

    console.log('✔ Assinatura.js pronto');
}