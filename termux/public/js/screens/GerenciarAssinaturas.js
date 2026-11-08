// ============================================================
// GERENCIARASSINATURAS.JS — Painel do Desenvolvedor
// Inclui: Gestão de Assinaturas, Financeiro e Gerenciador SQL
// ============================================================

(function () {
    'use strict';
    console.log('✔ GerenciarAssinaturas.js carregado');

    window.adminTab = window.adminTab || 'assinantes';
    window.adminAssinaturas = window.adminAssinaturas || [];
    window._chavePixDev = '';

    // ============================================================
    // HELPERS BÁSICOS
    // ============================================================
    function statusEhAtivo(a) { return a.status === 'ativa' || (typeof a.status === 'string' && a.status.startsWith('aviso_')); }
    function statusEhPendente(a) { return a.status === 'pendente'; }
    function parseVencimento(v) {
        if (!v) return null;
        const p = String(v).split('/');
        if (p.length === 3) return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    }
    function estaVencido(a) {
        const v = parseVencimento(a.vencimento);
        if (!v) return false;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        return v < hoje;
    }
    function diasParaVencer(a) {
        const v = parseVencimento(a.vencimento);
        if (!v) return null;
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        return Math.ceil((v - hoje) / (1000 * 60 * 60 * 24));
    }
    function formatarMoeda(n) { return 'R$ ' + Number(n || 0).toFixed(2).replace('.', ','); }
    function corStatus(s) {
        if (s === 'pendente') return '#ff9800';
        if (s === 'inativo' || s === 'nao_assinante') return '#c62828';
        if (typeof s === 'string' && s.startsWith('aviso_')) return '#e65100';
        return '#4caf50';
    }
    function labelStatus(s) {
        if (s === 'pendente') return 'PENDENTE';
        if (s === 'inativo' || s === 'nao_assinante') return 'INATIVO';
        if (typeof s === 'string' && s.startsWith('aviso_')) return 'AVISO ' + s.replace('aviso_', '') + '/3';
        return 'ATIVO';
    }

    // ============================================================
    // RENDER PRINCIPAL (PAINEL)
    // ============================================================
    function renderPainel() {
        return [
            '<div style="display:flex; flex-direction:column; height:100%; min-height:100vh; grid-column: 2 / -1; grid-row: 1 / span 2; z-index: 10; background: #f5f5f5;">',
            '    <div class="app-bar" style="background:#111; color:#fff; padding:12px 16px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">',
            '        <button class="icon-btn" onclick="voltarTela()" style="color:#fff;"><i class="fas fa-arrow-left"></i></button>',
            '        <h1 style="font-size:1.1rem; font-weight:600;">Painel do Desenvolvedor</h1>',
            '        <div style="display:flex; gap:4px;">',
            '            <button class="icon-btn" onclick="abrirAlterarSenhaAdmin()" title="Alterar senha" style="color:#ffd54f;"><i class="fas fa-key"></i></button>',
            '            <button class="icon-btn" onclick="sairDoPainelAdmin()" title="Sair" style="color:#ffcdd2;"><i class="fas fa-sign-out-alt"></i></button>',
            '        </div>',
            '    </div>',
            '    <div id="admin-tabs" style="display:flex; background:#222; border-bottom:1px solid #444; overflow-x:auto; white-space:nowrap; scrollbar-width:none; flex-shrink:0;">',
            '        <button class="nav-tab" data-tab="assinantes" onclick="mudarAbaAdmin(\'assinantes\')" style="flex:1; min-width:100px; padding:14px 12px; border:none; background:none; font-weight:600; color:#aaa; border-bottom:3px solid transparent; font-size:0.85rem; cursor:pointer;">Assinantes</button>',
            '        <button class="nav-tab" data-tab="financeiro" onclick="mudarAbaAdmin(\'financeiro\')" style="flex:1; min-width:100px; padding:14px 12px; border:none; background:none; font-weight:600; color:#aaa; border-bottom:3px solid transparent; font-size:0.85rem; cursor:pointer;">Financeiro</button>',
            '        <button class="nav-tab" data-tab="contabilidade" onclick="mudarAbaAdmin(\'contabilidade\')" style="flex:1; min-width:100px; padding:14px 12px; border:none; background:none; font-weight:600; color:#aaa; border-bottom:3px solid transparent; font-size:0.85rem; cursor:pointer;">Contabilidade</button>',
            '        <button class="nav-tab" data-tab="relatorios" onclick="mudarAbaAdmin(\'relatorios\')" style="flex:1; min-width:100px; padding:14px 12px; border:none; background:none; font-weight:600; color:#aaa; border-bottom:3px solid transparent; font-size:0.85rem; cursor:pointer;">Relatórios</button>',
            '        <button class="nav-tab" data-tab="banco" onclick="mudarAbaAdmin(\'banco\')" style="flex:1; min-width:100px; padding:14px 12px; border:none; background:none; font-weight:600; color:#aaa; border-bottom:3px solid transparent; font-size:0.85rem; cursor:pointer;"><i class="fas fa-database"></i> Banco</button>',
            '    </div>',
            '    <div class="content-area" id="admin-conteudo" style="padding:16px; background:#f5f5f5; flex: 1; overflow-y: auto;">',
            '        <p class="empty-state">🔄 Carregando dados...</p>',
            '    </div>',
            '</div>'
        ].join('\n');
    }

    window.renderGerenciarAssinaturas = renderPainel;
    if (window.rotas && typeof window.rotas === 'object') window.rotas['admin-assinaturas'] = renderPainel;
    if (typeof window.registrarRota === 'function') { try { window.registrarRota('admin-assinaturas', renderPainel); } catch (e) {} }

    window.mudarAbaAdmin = function (aba) {
        window.adminTab = aba;
        atualizarEstiloAbas();
        carregarAba();
    };

    function atualizarEstiloAbas() {
        document.querySelectorAll('#admin-tabs .nav-tab').forEach(function (btn) {
            const t = btn.getAttribute('data-tab');
            if (t === window.adminTab) {
                btn.style.color = '#fff';
                btn.style.borderBottomColor = 'var(--primary-color, #C2185B)';
                btn.style.background = '#333';
            } else {
                btn.style.color = '#aaa';
                btn.style.borderBottomColor = 'transparent';
                btn.style.background = 'none';
            }
        });
    }

    window.sairDoPainelAdmin = function () { window.navigateTo('assinatura'); };
    window.fazerLogoutAdmin = window.sairDoPainelAdmin;

    // ============================================================
    // CARREGAMENTO GERAL
    // ============================================================
    async function carregarAba() {
        const container = document.getElementById('admin-conteudo');
        if (!container) return;

        container.innerHTML = '<p class="empty-state">🔄 Carregando dados...</p>';

        // Para a aba de banco, a renderização é diferente
        if (window.adminTab === 'banco') {
            try {
                container.innerHTML = await renderAbaBanco();
            } catch (e) {
                container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao carregar banco: ' + e.message + '</p>';
            }
            return;
        }

        // Para as outras abas, puxa assinaturas
        let dados = [];
        try {
            const bruto = await apiGet('assinaturas');
            dados = window.normalizarArray ? window.normalizarArray(bruto) : (bruto || []);
            if (!Array.isArray(dados)) dados = [];
        } catch (e) {}

        window.adminAssinaturas = dados;

        try {
            let html = '';
            if (window.adminTab === 'assinantes')    html = renderAbaAssinantes(dados);
            else if (window.adminTab === 'financeiro')     html = await renderAbaFinanceiro(dados);
            else if (window.adminTab === 'contabilidade')  html = renderAbaContabilidade(dados);
            else if (window.adminTab === 'relatorios')     html = renderAbaRelatorios();

            container.innerHTML = html;

            if (window.adminTab === 'relatorios') setTimeout(filtrarRelatorioAdmin, 30);
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao renderizar: ' + (e.message || e) + '</p>';
        }
    }

    function aguardarContainer() {
        const tentar = function () {
            if (document.getElementById('admin-conteudo')) {
                atualizarEstiloAbas();
                if (!window.__adminCarregado) {
                    window.__adminCarregado = true;
                    carregarAba();
                }
            } else {
                window.__adminCarregado = false;
                requestAnimationFrame(tentar);
            }
        };
        requestAnimationFrame(tentar);
    }

    const observer = new MutationObserver(function () {
        if (document.getElementById('admin-conteudo')) {
            atualizarEstiloAbas();
            if (!window.__adminCarregado) {
                window.__adminCarregado = true;
                carregarAba();
            }
        } else {
            window.__adminCarregado = false;
        }
    });
    document.addEventListener('DOMContentLoaded', function () {
        const app = document.getElementById('app');
        if (app) observer.observe(app, { childList: true, subtree: true });
        aguardarContainer();
    });

    // ============================================================
    // ABA 1: ASSINANTES
    // ============================================================
    function cardTotal(titulo, valor, corBorda, corNum) {
        return '<div style="background:#fff; padding:10px 6px; border-radius:12px; border-bottom:3px solid ' + corBorda + '; box-shadow:0 2px 5px rgba(0,0,0,0.05);">' +
            '<div style="font-size:0.65rem; color:#666;">' + titulo + '</div>' +
            '<div style="font-size:1.3rem; font-weight:800; color:' + corNum + ';">' + valor + '</div>' +
            '</div>';
    }

    function renderAbaAssinantes(dados) {
        const pendentes = dados.filter(statusEhPendente).length;
        const ativas    = dados.filter(statusEhAtivo).length;
        const inativas  = dados.filter(function (a) { return a.status === 'inativo' || a.status === 'nao_assinante'; }).length;
        const avisos    = dados.filter(function (a) { return typeof a.status === 'string' && a.status.startsWith('aviso_'); }).length;

        let html = '';
        html += '<div style="display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:20px; text-align:center;">';
        html += cardTotal('ATIVAS', ativas, '#4caf50', '#2e7d32');
        html += cardTotal('PENDENTES', pendentes, '#ff9800', '#e65100');
        html += cardTotal('AVISOS', avisos, '#ff5722', '#bf360c');
        html += cardTotal('INATIVAS', inativas, '#c62828', '#c62828');
        html += '</div>';

        const lista = dados.filter(function (a) { return statusEhPendente(a) || statusEhAtivo(a); });

        if (lista.length === 0) {
            html += '<div class="card" style="text-align:center; padding: 30px; background:#fff;">' +
                '<i class="fas fa-user-plus" style="font-size:2.5rem; color:#ccc; margin-bottom:10px;"></i>' +
                '<p class="empty-state" style="margin-top:0;">Nenhum assinante ativo ou pendente no momento.</p>' +
                '<p style="font-size:0.8rem; color:#888; margin-top:8px;">Assim que um cliente pagar via PIX, ele aparecerá aqui.</p>' +
                '</div>';
            return html;
        }

        const ordem = function (a) {
            if (a.status === 'pendente') return 0;
            if (typeof a.status === 'string' && a.status.startsWith('aviso_')) return 1;
            return 2;
        };
        lista.sort(function (a, b) { return ordem(a) - ordem(b); });

        lista.forEach(function (a) {
            const isPendente = statusEhPendente(a);
            const isAviso    = typeof a.status === 'string' && a.status.startsWith('aviso_');
            const cor = corStatus(a.status);
            const dias = diasParaVencer(a);

            html += '<div class="card" style="background:#fff; border-left:4px solid ' + cor + '; margin-bottom:12px; padding:16px;">';
            html += '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">';
            html += '<div><div style="font-weight:700; font-size:1.05rem; color:#333;">ID: ' + (a.idAcesso || '—') + '</div>';
            html += '<div style="font-size:0.85rem; color:#666;">' + (a.usuarioEmail || 'Cliente') + '</div></div>';
            html += '<div style="background:' + (isPendente ? '#fff3e0' : (isAviso ? '#fbe9e7' : '#e8f5e9')) + '; color:' + cor + '; font-size:0.7rem; font-weight:700; padding:4px 8px; border-radius:8px; white-space:nowrap;">' + labelStatus(a.status) + '</div>';
            html += '</div>';

            html += '<div style="font-size:0.75rem; color:#888; margin-bottom:12px; display:flex; gap:12px; flex-wrap:wrap;">';
            if (isPendente) {
                html += '<span><i class="far fa-clock"></i> Solicitado: ' + (a.solicitadoEm ? new Date(a.solicitadoEm).toLocaleString('pt-BR') : '—') + '</span>';
            } else {
                html += '<span><i class="far fa-calendar"></i> Venc.: ' + (a.vencimento || '—') + '</span>';
                if (dias !== null) {
                    if (dias < 0)        html += '<span style="color:#c62828; font-weight:600;"><i class="fas fa-exclamation-circle"></i> Atrasado ' + Math.abs(dias) + 'd</span>';
                    else if (dias === 0) html += '<span style="color:#e65100; font-weight:600;"><i class="fas fa-bell"></i> Vence hoje</span>';
                    else                 html += '<span style="color:#2e7d32; font-weight:600;"><i class="fas fa-check"></i> Em dia (' + dias + 'd)</span>';
                }
            }
            html += '</div>';

            html += '<div style="display:flex; gap:8px; flex-wrap:wrap; border-top:1px solid #eee; padding-top:12px;">';
            if (isPendente) {
                html += '<button class="btn-primary" style="flex:1; padding:10px; background:#4caf50; font-size:0.85rem;" onclick="ativarAssinaturaAdmin(' + a.id + ')"><i class="fas fa-check"></i> Ativar</button>';
            } else {
                html += '<button class="btn-primary" style="flex:1; padding:10px; background:#1976d2; font-size:0.85rem;" onclick="renovarAssinaturaAdmin(' + a.id + ')"><i class="fas fa-sync-alt"></i> Renovar +30d</button>';
                html += '<button class="btn-outline" style="padding:10px; font-size:0.85rem;" onclick="enviarAvisoAdmin(' + a.id + ')" title="Enviar Aviso"><i class="fas fa-bell"></i></button>';
                html += '<button class="btn-outline" style="padding:10px; border-color:#c62828; color:#c62828; font-size:0.85rem;" onclick="inativarAssinaturaAdmin(' + a.id + ')" title="Inativar"><i class="fas fa-ban"></i></button>';
            }
            html += '<button class="btn-outline" style="padding:10px; font-size:0.85rem;" onclick="copiarIdAdmin(\'' + (a.idAcesso || '') + '\')" title="Copiar ID"><i class="fas fa-copy"></i></button>';
            html += '</div></div>';
        });

        return html;
    }

    // ============================================================
    // ABA 2: FINANCEIRO
    // ============================================================
    function blocoFinanceiro(titulo, lista, total, cor, icone, bgHeader) {
        let h = '<div class="card" style="background:#fff; padding:0; overflow:hidden; margin-bottom:12px; border-left:4px solid ' + cor + ';">';
        h += '<div style="padding:14px 16px; background:' + bgHeader + '; display:flex; justify-content:space-between; align-items:center;">';
        h += '<div style="display:flex; align-items:center; gap:8px;"><i class="fas ' + icone + '" style="color:' + cor + ';"></i>';
        h += '<strong style="color:' + cor + '; font-size:0.95rem;">' + titulo + ' (' + lista.length + ')</strong></div>';
        h += '<strong style="color:' + cor + ';">' + formatarMoeda(total) + '</strong></div>';

        if (lista.length === 0) {
            h += '<div style="padding:16px; text-align:center; color:#999; font-size:0.85rem;">Nenhum registro.</div>';
        } else {
            lista.forEach(function (a) {
                const dias = diasParaVencer(a);
                h += '<div style="padding:10px 16px; border-bottom:1px solid #f5f5f5; display:flex; justify-content:space-between; align-items:center; gap:8px;">';
                h += '<div style="min-width:0; flex:1;">';
                h += '<div style="font-weight:600; font-size:0.88rem; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (a.idAcesso || '—') + '</div>';
                h += '<div style="font-size:0.72rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (a.usuarioEmail || 'Cliente') + '</div></div>';
                h += '<div style="text-align:right; white-space:nowrap;">';
                h += '<div style="font-weight:700; font-size:0.9rem; color:' + cor + ';">' + formatarMoeda(a.valor || 13.99) + '</div>';
                if (statusEhPendente(a)) h += '<div style="font-size:0.68rem; color:#aaa;">aguardando</div>';
                else if (dias !== null) {
                    if (dias < 0)        h += '<div style="font-size:0.68rem; color:#c62828;">' + Math.abs(dias) + 'd atrás</div>';
                    else if (dias === 0) h += '<div style="font-size:0.68rem; color:#e65100;">hoje</div>';
                    else                 h += '<div style="font-size:0.68rem; color:#888;">em ' + dias + 'd</div>';
                }
                h += '</div></div>';
            });
        }
        h += '</div>';
        return h;
    }

    async function renderAbaFinanceiro(dados) {
        const emDia     = dados.filter(function (a) { return statusEhAtivo(a) && !estaVencido(a); });
        const atrasados = dados.filter(function (a) { return statusEhAtivo(a) && estaVencido(a); });
        const pendentes = dados.filter(statusEhPendente);

        const totalEmDia     = emDia.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const totalAtrasados = atrasados.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const totalPendentes = pendentes.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const aReceber = totalAtrasados + totalPendentes;

        let pixChave = '';
        let valorAssinatura = 13.99;
        try {
            const configArr = window.normalizarArray(await apiGet('configuracoes'));
            const config = configArr[0] || {};
            pixChave = config.pixAssinatura || '';
            if (config.valorAssinatura) valorAssinatura = Number(config.valorAssinatura);
        } catch (e) {}

        window._chavePixDev = pixChave;

        let html = '';

        html += '<div class="card" style="background:#fff; padding:0; overflow:hidden; margin-bottom:16px; border-left:4px solid #1976d2; box-shadow:0 4px 12px rgba(25,118,210,0.15);">';
        html += '    <div style="padding:16px; background:#e3f2fd; border-bottom:1px solid #bbdefb; display:flex; justify-content:space-between; align-items:center;">';
        html += '        <div style="display:flex; align-items:center; gap:10px;">';
        html += '            <i class="fas fa-shield-alt" style="color:#1976d2; font-size:1.4rem;"></i>';
        html += '            <strong style="color:#1976d2; font-size:1rem;">Receber Assinatura (PIX Desenvolvedor)</strong>';
        html += '        </div>';
        html += '    </div>';
        
        html += '    <div style="padding:20px;">';
        html += '        <div style="display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap;">';
        
        html += '            <div style="background:#f5f5f5; padding:10px; border-radius:12px; border:2px dashed #1976d2; text-align:center;">';
        if (pixChave) {
            const pixComValor = window.gerarPixComValor(pixChave, valorAssinatura);
            const qrCodeUrl = window.qrUrl(pixComValor, '200x200');
            html += '                <img id="img-qrcode-pix" src="' + qrCodeUrl + '" alt="QR Code PIX" style="width:140px; height:140px; display:block;">';
            html += '                <div id="txt-valor-pix" style="font-size:0.7rem; color:#666; margin-top:8px;">PIX: ' + valorAssinatura.toFixed(2).replace('.', ',') + '</div>';
        } else {
            html += '                <div style="width:140px; height:140px; display:flex; align-items:center; justify-content:center; color:#999; font-size:0.8rem; text-align:center;">Insira a chave<br>para gerar</div>';
        }
        html += '            </div>';

        html += '            <div style="flex:1; min-width:240px;">';
        
        html += '                <div class="field" style="margin-bottom:12px;">';
        html += '                    <label style="font-size:0.85rem; font-weight:600; color:#333;">Valor da Assinatura (R$)</label>';
        html += '                    <div style="position:relative;">';
        html += '                        <i class="fas fa-dollar-sign" style="position:absolute; left:14px; top:14px; color:#1976d2;"></i>';
        html += '                        <input type="number" step="0.01" id="adm-valor-assinatura" value="' + valorAssinatura + '" oninput="atualizarQRCodeAdmin()" style="width:100%; padding:12px 12px 12px 38px; border:1.5px solid #ccc; border-radius:8px; font-size:1rem; font-weight:600; color:#1976d2; outline:none;">';
        html += '                    </div>';
        html += '                </div>';

        html += '                <div class="field" style="margin-bottom:12px;">';
        html += '                    <label style="font-size:0.85rem; font-weight:600; color:#333;">Chave PIX (Desenvolvedor)</label>';
        html += '                    <button class="btn-outline" style="width:100%; justify-content:center; padding:12px; border-color:' + (pixChave ? '#1976d2' : '#c62828') + '; color:' + (pixChave ? '#1976d2' : '#c62828') + '; display:flex; align-items:center; gap:8px;" onclick="abrirModalPixD()">';
        if (pixChave) {
            html += '                        <i class="fas fa-check-circle"></i> Chave PIX Cadastrada <i class="fas fa-edit" style="margin-left:auto;"></i>';
        } else {
            html += '                        <i class="fas fa-plus-circle"></i> Cadastrar Chave PIX <i class="fas fa-edit" style="margin-left:auto;"></i>';
        }
        html += '                    </button>';
        html += '                </div>';

        html += '                <button class="btn-primary" style="background:#1976d2; width:auto; padding:12px 24px; font-size:0.9rem;" onclick="salvarConfigPixDevAdmin()">';
        html += '                    <i class="fas fa-save"></i> Salvar Alterações PIX';
        html += '                </button>';
        
        html += '            </div>';
        html += '        </div>';
        
        if (pixChave) {
            const pixFinalRender = window.gerarPixComValor(pixChave, valorAssinatura);
            html += '        <div style="margin-top:20px; border-top:1px solid #eee; padding-top:16px;">';
            html += '            <label style="font-size:0.8rem; font-weight:600; color:#333; margin-bottom:4px; display:block;">Pix Copia e Cola (Gerado com o valor)</label>';
            html += '            <textarea id="adm-pix-final" readonly style="width:100%; height:50px; padding:10px; border:1px solid #ddd; border-radius:8px; font-size:0.7rem; font-family:monospace; background:#f9f9f9; color:#555; resize:none;">' + pixFinalRender + '</textarea>';
            html += '        </div>';
        }

        html += '    </div>';
        html += '</div>';

        html += '<div style="background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%); color:#fff; border-radius:16px; padding:22px; text-align:center; margin-bottom:16px; box-shadow:0 6px 20px rgba(25,118,210,0.3);">';
        html += '<div style="font-size:0.75rem; opacity:0.9; text-transform:uppercase; letter-spacing:1px;">Recebido (em dia)</div>';
        html += '<div style="font-size:2.4rem; font-weight:800; margin-top:8px;">' + formatarMoeda(totalEmDia) + '</div>';
        html += '<div style="font-size:0.8rem; opacity:0.85; margin-top:6px;">A receber (atrasado + pendente): ' + formatarMoeda(aReceber) + '</div>';
        html += '</div>';

        html += blocoFinanceiro('Em dia', emDia, totalEmDia, '#4caf50', 'fa-check-circle', '#e8f5e9');
        html += blocoFinanceiro('Atrasados', atrasados, totalAtrasados, '#c62828', 'fa-exclamation-triangle', '#ffebee');
        html += blocoFinanceiro('Pendentes (PIX aguardando)', pendentes, totalPendentes, '#e65100', 'fa-clock', '#fff3e0');

        return html;
    }

    // ============================================================
    // MODAIS DO PIX DEV
    // ============================================================
    window.abrirModalPixD = function() {
        const anterior = document.getElementById('modal-pixd');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-pixd';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalPixD(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:480px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #1976d2; color:#fff; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px;">' +
            '        <strong style="font-size: 1.1rem;"><i class="fas fa-key"></i> PIX do Desenvolvedor</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalPixD()" style="color:#fff; background: transparent; border: none; cursor: pointer;"><i class="fas fa-xmark" style="font-size: 1.2rem; color: #fff;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 20px;">' +
            '        <p style="font-size:0.85rem; color:#666; margin-bottom:15px;">' +
            '            Cole a string completa do PIX (Copia e Cola) da sua conta pessoal/empresa.' +
            '        </p>' +
            '        <div class="field">' +
            '            <label>Chave PIX ou String Copia e Cola</label>' +
            '            <textarea id="input-modal-pixd" style="width:100%; height:100px; padding:10px; border:1.5px solid #ccc; border-radius:8px; font-size:0.8rem; font-family:monospace; resize:none;">' + window._chavePixDev + '</textarea>' +
            '        </div>' +
            '        <button class="btn-primary" style="background:#1976d2; width:100%; padding:14px; margin-top:10px;" onclick="salvarChavePixDev()">' +
            '            <i class="fas fa-check"></i> Confirmar Chave' +
            '        </button>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function() { const el = document.getElementById('input-modal-pixd'); if (el) el.focus(); }, 100);
    };

    window.fecharModalPixD = function() {
        const m = document.getElementById('modal-pixd');
        if (m) m.remove();
    };

    window.salvarChavePixDev = async function() {
        const input = document.getElementById('input-modal-pixd');
        if (!input) return;
        
        const novaChave = input.value.trim();
        
        try {
            let config = {};
            try {
                const arr = window.normalizarArray(await apiGet('configuracoes'));
                config = arr[0] || {};
            } catch(e) {}

            config.pixAssinatura = novaChave;
            await apiSave('configuracoes', [config]);
            
            window._chavePixDev = novaChave;
            fecharModalPixD();
            
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Chave PIX salva com sucesso!');
            else alert('✅ Chave PIX salva com sucesso!');
            
            carregarAba();
        } catch(e) {
            alert('Erro ao salvar Chave PIX: ' + e.message);
        }
    };

    window.atualizarQRCodeAdmin = function() {
        const valorInput = document.getElementById('adm-valor-assinatura');
        const imgQr = document.getElementById('img-qrcode-pix');
        const txtValor = document.getElementById('txt-valor-pix');
        const textareaFinal = document.getElementById('adm-pix-final');
        
        if (!valorInput) return;

        const chave = window._chavePixDev;
        const valor = parseFloat(valorInput.value) || 0;

        if (chave && valor > 0) {
            const pixComValor = window.gerarPixComValor(chave, valor);
            
            if (imgQr) {
                imgQr.src = window.qrUrl(pixComValor, '200x200');
            }
            if (txtValor) {
                txtValor.textContent = 'PIX: ' + valor.toFixed(2).replace('.', ',');
            }
            if (textareaFinal) {
                textareaFinal.value = pixComValor;
            }
        }
    };

    window.salvarConfigPixDevAdmin = async function() {
        const valorInput = document.getElementById('adm-valor-assinatura');
        if (!valorInput) return;

        const novoValor = parseFloat(valorInput.value) || 13.99;

        try {
            let config = {};
            try {
                const arr = window.normalizarArray(await apiGet('configuracoes'));
                config = arr[0] || {};
            } catch(e) {}

            config.valorAssinatura = novoValor;

            await apiSave('configuracoes', [config]);
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Valor da assinatura salvo!');
            
            carregarAba();
        } catch(e) {
            alert('Erro ao salvar valor: ' + e.message);
        }
    };

    // ============================================================
    // ABA 3: CONTABILIDADE
    // ============================================================
    function kpiCard(titulo, valor, cor, bg) {
        return '<div style="background:' + bg + '; border-radius:12px; padding:14px; border-left:4px solid ' + cor + ';">' +
            '<div style="font-size:0.72rem; color:#666; margin-bottom:4px;">' + titulo + '</div>' +
            '<div style="font-size:1.3rem; font-weight:800; color:' + cor + ';">' + valor + '</div></div>';
    }
    function linhaDre(label, valor, cor, destaque) {
        const peso = destaque ? '700' : '500';
        return '<div style="display:flex; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #f5f5f5;">' +
            '<span style="font-weight:' + peso + '; color:#444; font-size:0.88rem;">' + label + '</span>' +
            '<span style="font-weight:' + peso + '; color:' + cor + '; font-size:0.9rem;">' + formatarMoeda(valor) + '</span></div>';
    }
    function barraProporcao(label, valor, total, cor) {
        const pct = total > 0 ? (valor / total) * 100 : 0;
        return '<div style="margin-bottom:10px;">' +
            '<div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">' +
            '<span style="color:#444;">' + label + '</span>' +
            '<span style="color:' + cor + '; font-weight:700;">' + valor + ' (' + pct.toFixed(0) + '%)</span></div>' +
            '<div style="background:#eee; border-radius:6px; height:8px; overflow:hidden;">' +
            '<div style="width:' + pct + '%; background:' + cor + '; height:100%;"></div></div></div>';
    }

    function renderAbaContabilidade(dados) {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        const ativas = dados.filter(statusEhAtivo);
        const receitaReconhecida = ativas
            .filter(function (a) {
                const v = parseVencimento(a.vencimento);
                return v && v.getMonth() === mesAtual && v.getFullYear() === anoAtual;
            })
            .reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);

        const emDia     = ativas.filter(function (a) { return !estaVencido(a); });
        const atrasados = ativas.filter(estaVencido);
        const pendentes = dados.filter(statusEhPendente);

        const aReceber = atrasados.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0) +
                         pendentes.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const inadimplencia = atrasados.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const ticketMedio = emDia.length > 0
            ? emDia.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0) / emDia.length : 0;
        const taxaInadimplencia = (ativas.length + pendentes.length) > 0
            ? (atrasados.length / (ativas.length + pendentes.length)) * 100 : 0;

        const mrr = ativas.reduce(function (s, a) { return s + Number(a.valor || 13.99); }, 0);
        const arr = mrr * 12;

        let html = '';
        html += '<div style="background:linear-gradient(135deg,#0d47a1 0%,#1976d2 100%); color:#fff; border-radius:16px; padding:20px; margin-bottom:16px; box-shadow:0 6px 20px rgba(25,118,210,0.3);">';
        html += '<div style="font-size:0.75rem; opacity:0.9; text-transform:uppercase; letter-spacing:1px;">Receita Reconhecida — ' + hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) + '</div>';
        html += '<div style="font-size:2.2rem; font-weight:800; margin-top:8px;">' + formatarMoeda(receitaReconhecida) + '</div>';
        html += '<div style="font-size:0.8rem; opacity:0.85; margin-top:6px;">MRR: ' + formatarMoeda(mrr) + '  ·  ARR: ' + formatarMoeda(arr) + '</div>';
        html += '</div>';

        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">';
        html += kpiCard('A Receber', formatarMoeda(aReceber), '#1976d2', '#e3f2fd');
        html += kpiCard('Inadimplência', formatarMoeda(inadimplencia), '#c62828', '#ffebee');
        html += kpiCard('Ticket Médio', formatarMoeda(ticketMedio), '#2e7d32', '#e8f5e9');
        html += kpiCard('Taxa Inadimplência', taxaInadimplencia.toFixed(1) + '%', '#e65100', '#fff3e0');
        html += '</div>';

        html += '<div class="card" style="background:#fff; padding:0; overflow:hidden; margin-bottom:16px;">';
        html += '<div style="padding:14px 16px; border-bottom:1px solid #eee; font-weight:700; color:#333;">DRE Simplificado (mês corrente)</div>';
        html += linhaDre('(+) Receita reconhecida', receitaReconhecida, '#2e7d32', true);
        html += linhaDre('(+) A receber (atraso + pendente)', aReceber, '#1976d2', false);
        html += linhaDre('(−) Inadimplência (perda provável)', -inadimplencia, '#c62828', false);
        html += linhaDre('(=) Receita líquida estimada', receitaReconhecida + aReceber - inadimplencia, '#0d47a1', true);
        html += '</div>';

        html += '<div class="card" style="background:#fff; padding:16px; margin-bottom:16px;">';
        html += '<div style="font-weight:700; color:#333; margin-bottom:12px;">Composição da carteira</div>';
        html += barraProporcao('Em dia', emDia.length, ativas.length + pendentes.length, '#4caf50');
        html += barraProporcao('Atrasados', atrasados.length, ativas.length + pendentes.length, '#c62828');
        html += barraProporcao('Pendentes', pendentes.length, ativas.length + pendentes.length, '#e65100');
        html += '</div>';

        html += '<button class="btn-outline" style="width:100%; padding:14px; font-size:0.9rem;" onclick="exportarContabilidadeCSV()"><i class="fas fa-file-csv"></i> Exportar contabilidade (CSV)</button>';
        return html;
    }

    // ============================================================
    // ABA 4: RELATÓRIOS
    // ============================================================
    function renderAbaRelatorios() {
        let html = '';
        html += '<h3 style="font-size:1.05rem; margin-bottom:12px; color:#333;">Filtros do Relatório</h3>';
        html += '<div class="card" style="background:#fff; padding:16px; margin-bottom:16px;">';
        html += '<div class="field"><label>Período de cadastro</label>';
        html += '<select id="rel-filtro-periodo" onchange="filtrarRelatorioAdmin()" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px;">';
        html += '<option value="todos">Todo o período</option><option value="hoje">Hoje</option><option value="7dias">Últimos 7 dias</option><option value="30dias">Últimos 30 dias</option>';
        html += '</select></div>';
        html += '<div class="field"><label>Status</label>';
        html += '<select id="rel-filtro-status" onchange="filtrarRelatorioAdmin()" style="width:100%; padding:10px; border:1px solid #ccc; border-radius:8px;">';
        html += '<option value="todos">Todos os status</option><option value="pendente">Pendentes</option><option value="ativa">Ativas</option><option value="aviso">Com aviso</option><option value="inativo">Inativas</option>';
        html += '</select></div></div>';
        html += '<div id="rel-resultado"></div>';
        return html;
    }

    window.filtrarRelatorioAdmin = function () {
        const div = document.getElementById('rel-resultado');
        if (!div) return;

        const periodo = (document.getElementById('rel-filtro-periodo') || {}).value || 'todos';
        const statusFiltro = (document.getElementById('rel-filtro-status') || {}).value || 'todos';

        let dados = (window.adminAssinaturas || []).slice();
        const hoje = new Date();

        if (periodo !== 'todos') {
            dados = dados.filter(function (a) {
                if (!a.solicitadoEm) return false;
                const dt = new Date(a.solicitadoEm);
                if (isNaN(dt)) return false;
                if (periodo === 'hoje') return dt.getDate() === hoje.getDate() && dt.getMonth() === hoje.getMonth() && dt.getFullYear() === hoje.getFullYear();
                const diff = (hoje - dt) / (1000 * 60 * 60 * 24);
                if (periodo === '7dias') return diff <= 7;
                if (periodo === '30dias') return diff <= 30;
                return true;
            });
        }

        if (statusFiltro !== 'todos') {
            if (statusFiltro === 'ativa') dados = dados.filter(function (a) { return a.status === 'ativa'; });
            else if (statusFiltro === 'aviso') dados = dados.filter(function (a) { return typeof a.status === 'string' && a.status.startsWith('aviso_'); });
            else dados = dados.filter(function (a) { return a.status === statusFiltro; });
        }

        let receita = 0, ativos = 0, pendentes = 0, atrasados = 0, inativos = 0;
        dados.forEach(function (a) {
            if (statusEhAtivo(a)) {
                if (estaVencido(a)) atrasados++;
                else { ativos++; receita += Number(a.valor || 13.99); }
            } else if (statusEhPendente(a)) pendentes++;
            else inativos++;
        });

        let html = '';
        html += '<div class="card" style="background:#fff; padding:14px; margin-bottom:12px;">';
        html += '<div style="font-weight:700; color:#333; margin-bottom:10px;">Resumo (' + dados.length + ' registro' + (dados.length === 1 ? '' : 's') + ')</div>';
        html += '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem;">';
        html += '<div><span style="color:#2e7d32; font-weight:700;">' + ativos + '</span> em dia</div>';
        html += '<div><span style="color:#c62828; font-weight:700;">' + atrasados + '</span> atrasados</div>';
        html += '<div><span style="color:#e65100; font-weight:700;">' + pendentes + '</span> pendentes</div>';
        html += '<div><span style="color:#888; font-weight:700;">' + inativos + '</span> inativos</div>';
        html += '</div>';
        html += '<div style="margin-top:10px; padding-top:10px; border-top:1px solid #eee; font-weight:700; color:#1976d2;">Receita (em dia): ' + formatarMoeda(receita) + '</div>';
        html += '</div>';

        if (dados.length === 0) {
            html += '<p class="empty-state">Nenhum resultado para estes filtros.</p>';
            div.innerHTML = html;
            return;
        }

        html += '<div class="card" style="background:#fff; padding:0; overflow:hidden;">';
        dados.forEach(function (a) {
            const cor = corStatus(a.status);
            html += '<div style="display:flex; justify-content:space-between; padding:10px 16px; border-bottom:1px solid #f5f5f5;">';
            html += '<div style="min-width:0; flex:1;">';
            html += '<div style="font-weight:600; font-size:0.88rem; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (a.idAcesso || '—') + '</div>';
            html += '<div style="font-size:0.72rem; color:#888; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + (a.usuarioEmail || '—') + '</div>';
            html += '<div style="font-size:0.68rem; color:#aaa;">' + (a.solicitadoEm ? new Date(a.solicitadoEm).toLocaleDateString('pt-BR') : '—') + '</div>';
            html += '</div>';
            html += '<div style="text-align:right; white-space:nowrap;">';
            html += '<div style="font-size:0.72rem; font-weight:700; color:' + cor + ';">' + labelStatus(a.status) + '</div>';
            html += '<div style="font-size:0.78rem; color:#555; margin-top:2px;">' + formatarMoeda(a.valor || 13.99) + '</div>';
            html += '</div></div>';
        });
        html += '</div>';

        html += '<button class="btn-outline" style="width:100%; padding:14px; font-size:0.9rem; margin-top:12px;" onclick="exportarRelatorioCSV()"><i class="fas fa-file-csv"></i> Exportar resultados (CSV)</button>';
        div.innerHTML = html;
    };

    // ============================================================
    // ABA 5: BANCO DE DADOS (NOVA)
    // ============================================================
    async function renderAbaBanco() {
        // Lista de tabelas conhecidas do sistema (ajuste se houver mais)
        const tabelasConhecidas = [
            'assinaturas', 'caixaAtual', 'caixas', 'clientes', 'colaboradores',
            'comandas', 'configuracoes', 'grupos', 'mesas', 'produtos',
            'sangrias', 'usuarios', 'pedidosPendentes'
        ];

        let html = '';

        html += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">';
        html += '    <h3 style="font-size:1.05rem; color:#333; margin:0;"><i class="fas fa-database"></i> Gerenciador do Banco de Dados</h3>';
        html += '    <button class="btn-primary" style="background:#c62828; width:auto; padding:8px 16px; font-size:0.85rem;" onclick="abrirModalSQLAdmin()"><i class="fas fa-terminal"></i> Executar SQL Manual</button>';
        html += '</div>';

        html += '<div class="card" style="background:#fff; padding:16px; margin-bottom:16px;">';
        html += '<div style="font-size:0.85rem; color:#666; margin-bottom:12px;">Selecione uma tabela para visualizar os dados brutos (limite de 50 registros por padrão).</div>';
        
        // Select para escolher a tabela
        html += '<div style="display:flex; gap:10px; flex-wrap:wrap;">';
        html += '    <select id="db-tabela-select" style="flex:1; min-width:200px; padding:10px; border:1.5px solid #ccc; border-radius:8px; font-size:0.95rem;">';
        tabelasConhecidas.forEach(t => {
            html += '<option value="' + t + '">' + t + '</option>';
        });
        html += '    </select>';
        html += '    <button class="btn-primary" style="background:#1976d2; width:auto; padding:10px 20px;" onclick="carregarTabelaAdmin()"><i class="fas fa-search"></i> Visualizar</button>';
        html += '</div>';
        html += '</div>';

        html += '<div id="db-resultado-container" style="margin-bottom:20px;"></div>';

        return html;
    }

    window.carregarTabelaAdmin = async function() {
        const select = document.getElementById('db-tabela-select');
        const container = document.getElementById('db-resultado-container');
        if (!select || !container) return;

        const tabela = select.value;
        container.innerHTML = '<div class="empty-state">🔄 Buscando registros de <b>' + tabela + '</b>...</div>';

        try {
            // Chama a API (que já está preparada no multiTenant.js)
            const dadosBrutos = await apiGet(tabela);
            let dados = window.normalizarArray(dadosBrutos);

            if (dados.length === 0) {
                container.innerHTML = '<p class="empty-state">Nenhum registro encontrado na tabela <b>' + tabela + '</b>.</p>';
                return;
            }

            // Limita a 50 registros para não travar a tela
            const totalRegistros = dados.length;
            if (dados.length > 50) {
                dados = dados.slice(0, 50);
            }

            // Pega as chaves (colunas) do primeiro objeto para montar o cabeçalho
            const colunas = Object.keys(dados[0]);

            let html = '<div class="card" style="background:#fff; padding:0; overflow:hidden;">';
            html += '<div style="padding:12px 16px; background:#f0f7ff; border-bottom:1px solid #bbdefb; display:flex; justify-content:space-between; align-items:center;">';
            html += '    <strong style="color:#1976d2; font-size:0.9rem;">Tabela: ' + tabela + '</strong>';
            html += '    <span style="font-size:0.75rem; color:#666;">Mostrando ' + dados.length + ' de ' + totalRegistros + ' registros</span>';
            html += '</div>';
            
            // Tabela HTML
            html += '<div style="overflow-x:auto;">';
            html += '<table style="width:100%; border-collapse:collapse; font-size:0.75rem; white-space:nowrap;">';
            
            // Cabeçalho
            html += '<thead style="background:#f9f9f9; color:#333; text-align:left;">';
            html += '<tr>';
            colunas.forEach(col => {
                html += '<th style="padding:10px 12px; border-bottom:2px solid #eee; font-weight:700;">' + col + '</th>';
            });
            html += '</tr>';
            html += '</thead>';

            // Corpo
            html += '<tbody>';
            dados.forEach(row => {
                html += '<tr style="border-bottom:1px solid #eee;">';
                colunas.forEach(col => {
                    let val = row[col];
                    // Trata objetos/arrays e nulos para exibir de forma legível
                    if (val === null || val === undefined) val = '<span style="color:#ccc;">null</span>';
                    else if (typeof val === 'object') val = JSON.stringify(val);
                    else val = String(val);

                    // Trunca strings muito longas
                    if (val.length > 50) val = val.substring(0, 50) + '...';

                    html += '<td style="padding:8px 12px; border-bottom:1px solid #f5f5f5; max-width:200px; overflow:hidden; text-overflow:ellipsis;">' + val + '</td>';
                });
                html += '</tr>';
            });
            html += '</tbody></table></div>';
            html += '</div>';

            container.innerHTML = html;
        } catch (e) {
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Erro ao buscar dados: ' + e.message + '</p>';
        }
    };

    window.abrirModalSQLAdmin = function() {
        const anterior = document.getElementById('modal-sql-admin');
        if (anterior) anterior.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-sql-admin';
        modal.className = 'modal-overlay';
        modal.style.zIndex = '99999';
        modal.onclick = function (e) { if (e.target === modal) fecharModalSQLAdmin(); };

        modal.innerHTML =
            '<div class="modal-content" style="max-width:600px; border-radius: 16px;">' +
            '    <div class="modal-header" style="background: #111; color:#fff; border-radius: 16px 16px 0 0; display: flex; justify-content: space-between; align-items: center; padding: 15px 20px;">' +
            '        <strong style="font-size: 1.1rem;"><i class="fas fa-terminal"></i> Executar SQL Manual</strong>' +
            '        <button class="btn-limpar" onclick="fecharModalSQLAdmin()" style="color:#fff; background: transparent; border: none; cursor: pointer;"><i class="fas fa-xmark" style="font-size: 1.2rem; color: #fff;"></i></button>' +
            '    </div>' +
            '    <div class="modal-body" style="padding: 20px;">' +
            '        <div style="background:#ffebee; color:#c62828; padding:10px; border-radius:8px; font-size:0.8rem; margin-bottom:15px; font-weight:600;">' +
            '            <i class="fas fa-exclamation-triangle"></i> Atenção: Comandos UPDATE e DELETE são irreversíveis. Use com cautela.' +
            '        </div>' +
            '        <div class="field">' +
            '            <label>Comando SQL</label>' +
            '            <textarea id="input-sql-admin" placeholder="Ex: SELECT * FROM comandas WHERE status = \'aberta\' LIMIT 10;" style="width:100%; height:120px; padding:10px; border:1.5px solid #ccc; border-radius:8px; font-size:0.85rem; font-family:monospace; resize:vertical;"></textarea>' +
            '        </div>' +
            '        <button class="btn-primary" style="background:#111; width:100%; padding:14px; margin-top:10px;" onclick="executarSQLAdmin()">' +
            '            <i class="fas fa-play"></i> Executar Comando' +
            '        </button>' +
            '        <div id="sql-resultado-admin" style="margin-top:20px; max-height:200px; overflow-y:auto;"></div>' +
            '    </div>' +
            '</div>';

        document.body.appendChild(modal);
        setTimeout(function() { const el = document.getElementById('input-sql-admin'); if (el) el.focus(); }, 100);
    };

    window.fecharModalSQLAdmin = function() {
        const m = document.getElementById('modal-sql-admin');
        if (m) m.remove();
    };

    window.executarSQLAdmin = async function() {
        const input = document.getElementById('input-sql-admin');
        const resultadoDiv = document.getElementById('sql-resultado-admin');
        if (!input || !resultadoDiv) return;

        const sql = input.value.trim();
        if (!sql) {
            alert('Digite um comando SQL.');
            return;
        }

        resultadoDiv.innerHTML = '<p style="text-align:center; color:#666; font-size:0.85rem;">Executando...</p>';

        try {
            // Envia o comando para o endpoint do banco (requer adaptação no backend)
            const url = window.MT ? window.MT.apiUrl('executeSql') : '/api/executeSql';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql })
            });

            if (!res.ok) throw new Error('Falha na execução. Verifique se o endpoint /executeSql está implementado.');

            const resultado = await res.json();
            
            if (resultado.error) {
                throw new Error(resultado.error);
            }

            if (resultado.rows && resultado.rows.length > 0) {
                // Se for um SELECT e retornou linhas, exibe tabela
                const colunas = Object.keys(resultado.rows[0]);
                let html = '<table style="width:100%; border-collapse:collapse; font-size:0.75rem;"><thead style="background:#f0f0f0;"><tr>';
                colunas.forEach(c => html += '<th style="padding:8px; border:1px solid #ddd; text-align:left;">' + c + '</th>');
                html += '</tr></thead><tbody>';
                
                resultado.rows.forEach(row => {
                    html += '<tr>';
                    colunas.forEach(c => {
                        let val = row[c] !== null ? String(row[c]) : '<span style="color:#ccc;">null</span>';
                        if (val.length > 50) val = val.substring(0, 50) + '...';
                        html += '<td style="padding:8px; border:1px solid #ddd;">' + val + '</td>';
                    });
                    html += '</tr>';
                });
                html += '</tbody></table>';
                resultadoDiv.innerHTML = html;
            } else if (resultado.changes !== undefined) {
                // Se foi INSERT/UPDATE/DELETE
                resultadoDiv.innerHTML = '<div style="padding:10px; background:#e8f5e9; color:#2e7d32; border-radius:8px; font-size:0.85rem; font-weight:600; text-align:center;"><i class="fas fa-check-circle"></i> Comando executado com sucesso. Linhas afetadas: ' + resultado.changes + '</div>';
            } else {
                resultadoDiv.innerHTML = '<div style="padding:10px; background:#e3f2fd; color:#1976d2; border-radius:8px; font-size:0.85rem; text-align:center;">Comando executado. Nenhum dado retornado.</div>';
            }
        } catch (e) {
            resultadoDiv.innerHTML = '<div style="padding:10px; background:#ffebee; color:#c62828; border-radius:8px; font-size:0.85rem; font-weight:600; text-align:center;"><i class="fas fa-times-circle"></i> Erro: ' + e.message + '</div>';
        }
    };

    // ============================================================
    // CSV
    // ============================================================
    function baixarCSV(nomeArquivo, linhas) {
        const csv = linhas.map(function (l) {
            return l.map(function (c) {
                const s = String(c == null ? '' : c);
                return '"' + s.replace(/"/g, '""') + '"';
            }).join(';');
        }).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.exportarContabilidadeCSV = function () {
        const dados = window.adminAssinaturas || [];
        const linhas = [['ID Acesso', 'Email', 'Status', 'Valor', 'Vencimento', 'Situação', 'Solicitado em']];
        dados.forEach(function (a) {
            let situacao = 'Inativo';
            if (statusEhPendente(a)) situacao = 'Pendente';
            else if (statusEhAtivo(a)) situacao = estaVencido(a) ? 'Atrasado' : 'Em dia';
            linhas.push([
                a.idAcesso || '', a.usuarioEmail || '', labelStatus(a.status),
                Number(a.valor || 13.99).toFixed(2), a.vencimento || '',
                situacao, a.solicitadoEm ? new Date(a.solicitadoEm).toLocaleString('pt-BR') : ''
            ]);
        });
        baixarCSV('contabilidade_' + new Date().toISOString().slice(0, 10) + '.csv', linhas);
        if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ CSV exportado');
    };
    window.exportarRelatorioCSV = function () { window.exportarContabilidadeCSV(); };

    // ============================================================
    // AÇÕES DO ADMINISTRADOR
    // ============================================================
    window.copiarIdAdmin = function (id) {
        if (!id) return;
        navigator.clipboard.writeText(id).then(function () {
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ ID ' + id + ' copiado!');
            else alert('ID copiado: ' + id);
        });
    };

    window.ativarAssinaturaAdmin = async function (id) {
        if (!await window.confirmar('Confirmar que o PIX foi recebido e ativar a assinatura?')) return;
        try {
            const assinaturas = window.normalizarArray(await apiGet('assinaturas'));
            const a = assinaturas.find(function (x) { return x.id === id; });
            if (a) {
                const hoje = new Date();
                const venc = new Date(hoje); venc.setDate(venc.getDate() + 30);
                a.status = 'ativa';
                a.dataAtivacao = hoje.toISOString();
                a.vencimento = venc.toLocaleDateString('pt-BR');
                await apiSave('assinaturas', assinaturas);
                if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Assinatura ativada!');
                carregarAba();
            }
        } catch (e) { alert('Erro ao ativar: ' + e.message); }
    };

    window.renovarAssinaturaAdmin = async function (id) {
        if (!await window.confirmar('Renovar esta assinatura por mais 30 dias?')) return;
        try {
            const assinaturas = window.normalizarArray(await apiGet('assinaturas'));
            const a = assinaturas.find(function (x) { return x.id === id; });
            if (a) {
                const hoje = new Date();
                let base = hoje;
                if (a.vencimento) {
                    const partes = String(a.vencimento).split('/');
                    if (partes.length === 3) {
                        const dataVenc = new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]));
                        if (dataVenc > hoje) base = dataVenc;
                    }
                }
                const novoVenc = new Date(base); novoVenc.setDate(novoVenc.getDate() + 30);
                a.status = 'ativa'; a.vencimento = novoVenc.toLocaleDateString('pt-BR');
                await apiSave('assinaturas', assinaturas);
                if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Renovado até ' + a.vencimento);
                carregarAba();
            }
        } catch (e) { alert('Erro ao renovar: ' + e.message); }
    };

    window.enviarAvisoAdmin = async function (id) {
        try {
            const assinaturas = window.normalizarArray(await apiGet('assinaturas'));
            const a = assinaturas.find(function (x) { return x.id === id; });
            if (a) {
                let aviso = 1;
                if (a.status === 'aviso_1') aviso = 2;
                if (a.status === 'aviso_2') aviso = 3;
                if (aviso === 3 && a.status === 'aviso_3') {
                    if (!await window.confirmar('Este cliente já recebeu 3 avisos. Deseja inativar a conta?')) return;
                    a.status = 'inativo';
                } else {
                    a.status = 'aviso_' + aviso;
                }
                await apiSave('assinaturas', assinaturas);
                if (typeof window.mostrarToast === 'function') window.mostrarToast('🔔 Status atualizado!');
                carregarAba();
            }
        } catch (e) { alert('Erro ao avisar: ' + e.message); }
    };

    window.inativarAssinaturaAdmin = async function (id) {
        if (!await window.confirmar('Cancelar e inativar esta assinatura?')) return;
        try {
            const assinaturas = window.normalizarArray(await apiGet('assinaturas'));
            const a = assinaturas.find(function (x) { return x.id === id; });
            if (a) {
                a.status = 'inativo';
                await apiSave('assinaturas', assinaturas);
                if (typeof window.mostrarToast === 'function') window.mostrarToast('⚠️ Assinatura inativada.');
                carregarAba();
            }
        } catch (e) { alert('Erro ao inativar: ' + e.message); }
    };

})();