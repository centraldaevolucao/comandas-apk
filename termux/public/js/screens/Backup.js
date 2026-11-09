// ============================================================
// BACKUP.JS — Backup e restauração REAIS (arquivo .comandas)
//  • Fazer backup  : o servidor gera um arquivo .comandas (cópia consistente do banco)
//  • Restaurar     : de um arquivo .comandas (ou de um da lista), com cópia de segurança automática
//  • Zerar dados   : apaga só movimentações (comandas, caixas...), mantém cadastros
// ============================================================

console.log('✔ Backup.js carregado');

if (!window.renderBackup) {
    window.backupList = [];
    const EXT = '.comandas';

    const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const base = () => (window.MT && window.MT.apiBase) ? window.MT.apiBase() : '';
    const tamanho = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

    async function api(caminho, opcoes) {
        const r = await fetch(base() + '/api/backup/' + caminho, Object.assign({ credentials: 'include' }, opcoes || {}));
        let j = null;
        try { j = await r.clone().json(); } catch (e) {}
        if (!r.ok || (j && j.ok === false)) throw new Error((j && (j.msg || j.error)) || ('Erro ' + r.status));
        return j || r;
    }

    window.renderBackup = function () {
        setTimeout(carregarBackups, 50);
        return [
            '<div class="app-bar">',
            '    <button class="icon-btn" onclick="voltarTela()"><i class="fas fa-arrow-left"></i></button>',
            '    <h1>Backup e restauração</h1>',
            '    <div style="width:40px;"></div>',
            '</div>',
            '<div class="content-area" id="backup-conteudo" style="padding:16px;">',
            '    <p class="empty-state">🔄 Carregando...</p>',
            '</div>'
        ].join('\n');
    };

    function botao(icone, cor, texto, acao) {
        return '<button class="btn-outline" style="width:100%;padding:14px;border-radius:25px;font-size:1rem;background:#fff;display:flex;justify-content:center;align-items:center;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1);" onclick="' + acao + '">' +
               '<i class="fas ' + icone + '" style="color:' + cor + ';"></i> ' + texto + '</button>';
    }

    async function carregarBackups() {
        const container = document.getElementById('backup-conteudo');
        if (!container) return;
        try {
            window.backupList = (await api('lista')).itens || [];
        } catch (e) {
            container.innerHTML = '<p class="empty-state" style="color:#c62828;">Não foi possível ler os backups: ' + esc(e.message) + '</p>';
            return;
        }

        let h = '';
        h += '<div style="text-align:center;margin-bottom:20px;">';
        h += '<p style="font-size:0.95rem;margin-bottom:12px;">Gerar um arquivo <b>' + EXT + '</b> com todos os dados (comandas, caixas, produtos, clientes, configurações).</p>';
        h += botao('fa-save', '#C2185B', 'Fazer backup agora', 'gerarBackup()');
        h += '</div>';

        h += '<div style="text-align:center;margin-bottom:24px;">';
        h += '<p style="font-size:0.95rem;margin-bottom:12px;">Restaurar de um arquivo <b>' + EXT + '</b>. Os dados atuais são substituídos (uma cópia de segurança é guardada antes).</p>';
        h += '<input type="file" id="file-restore" accept="' + EXT + ',.sqlite,application/octet-stream,application/zip" style="display:none;" onchange="restaurarBackup(event)">';
        h += botao('fa-history', '#C2185B', 'Selecionar arquivo', "document.getElementById('file-restore').click()");
        h += '</div>';

        // Cópia automática fora do app (Android)
        if (window.AndroidApp && window.AndroidApp.backupInfo) {
            let info = {};
            try { info = JSON.parse(window.AndroidApp.backupInfo()); } catch (e) {}
            h += '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:12px;padding:12px;margin-bottom:22px;font-size:0.82rem;line-height:1.5;">';
            h += '<div style="font-weight:700;margin-bottom:4px;"><i class="fas fa-shield-halved" style="color:#2e7d32;"></i> Cópia automática (sobrevive a reinstalar o app)</div>';
            if (info.permissao) {
                h += 'Ativa. Salva a cada poucos minutos em <b>' + esc(info.pasta) + '</b>. Ao reinstalar, o app traz os dados de volta sozinho.';
                h += '<div style="margin-top:8px;">' + botao('fa-rotate', '#2e7d32', 'Salvar cópia agora', 'window.AndroidApp.backupAgora()') + '</div>';
            } else {
                h += '<span style="color:#c62828;">Desativada: falta liberar o acesso aos arquivos.</span>';
                h += '<div style="margin-top:8px;">' + botao('fa-unlock', '#c62828', 'Liberar acesso', 'window.AndroidApp.pedirAcessoArquivos()') + '</div>';
            }
            h += '</div>';
        }

        h += '<div style="text-align:center;border-top:1px solid #C2185B;padding-top:12px;margin-bottom:16px;"><h3 style="font-size:1rem;font-weight:500;">Backups guardados neste aparelho</h3></div>';
        if (!window.backupList.length) {
            h += '<p style="text-align:center;color:#888;font-size:0.85rem;">Nenhum backup ainda.</p>';
        } else {
            window.backupList.forEach(function (b, i) {
                const d = new Date(b.data);
                const total = Object.keys(b.registros || {}).reduce((s, k) => s + (b.registros[k] || 0), 0);
                const quando = isNaN(d) ? esc(b.data) : d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
                const rotulo = b.motivo === 'antes-de-restaurar' ? 'Segurança (antes de restaurar)' : b.motivo === 'antes-de-zerar' ? 'Segurança (antes de zerar)' : 'Backup manual';
                h += '<div style="background:#FCE4EC;border-radius:12px;padding:14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:8px;">';
                h += '<div style="min-width:0;"><div style="font-size:0.95rem;">' + quando + '</div>';
                h += '<div style="font-size:0.8rem;font-weight:500;">' + rotulo + '</div>';
                h += '<div style="font-size:0.75rem;color:#666;">' + total + ' registros · ' + tamanho(b.tamanho) + '</div></div>';
                h += '<div style="display:flex;gap:4px;flex-shrink:0;">';
                h += '<button class="btn-limpar" onclick="restaurarDaLista(' + i + ')" title="Restaurar"><i class="fas fa-history" style="color:#C2185B;font-size:1.1rem;"></i></button>';
                h += '<button class="btn-limpar" onclick="baixarBackup(' + i + ')" title="Salvar / compartilhar"><i class="fas fa-share-alt" style="color:#2e7d32;font-size:1.1rem;"></i></button>';
                h += '<button class="btn-limpar" onclick="excluirDaLista(' + i + ')" title="Excluir"><i class="fas fa-trash" style="color:#c62828;font-size:1.1rem;"></i></button>';
                h += '</div></div>';
            });
        }

        h += '<div style="text-align:center;border-top:1px solid #C2185B;margin-top:30px;padding-top:12px;"><h3 style="font-size:1rem;font-weight:500;">Zerar informações financeiras</h3>';
        h += '<p style="font-size:0.75rem;color:#666;margin-top:4px;">Apaga só o financeiro: caixas (histórico), comandas, pedidos pendentes, chamados, sangrias, perdas e movimentações. Cadastros (produtos, grupos, clientes, mesas, colaboradores, configurações) ficam. Um backup de segurança é feito antes.</p></div>';
        h += '<div style="margin-top:12px;margin-bottom:30px;">' + botao('fa-triangle-exclamation', '#c62828', 'Zerar financeiro', 'zerarDados()') + '</div>';
        container.innerHTML = h;
    }

    // Entrega o arquivo ao usuário: no app grava em Downloads/Comandas; no navegador baixa.
    async function entregarArquivo(nome, compartilhar) {
        const r = await fetch(base() + '/api/backup/arquivo/' + encodeURIComponent(nome), { credentials: 'include' });
        if (!r.ok) throw new Error('Não foi possível ler o arquivo (' + r.status + ')');
        const blob = new Blob([await r.arrayBuffer()], { type: 'application/octet-stream' });
        if (compartilhar && !window.__noApp && navigator.canShare && typeof File === 'function') {
            try {
                const f = new File([blob], nome, { type: 'application/octet-stream' });
                if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Backup Comandas' }); return; }
            } catch (e) { if (e && e.name === 'AbortError') return; }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nome;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    window.gerarBackup = async function () {
        try {
            const j = await api('criar', { method: 'POST' });
            await entregarArquivo(j.nome, false);
            if (typeof window.mostrarToast === 'function') window.mostrarToast('✅ Backup criado: ' + j.nome);
            else alert('Backup criado: ' + j.nome + '\n\nO arquivo foi salvo em Downloads' + (window.__noApp ? '/Comandas' : '') + '.');
            carregarBackups();
        } catch (e) {
            alert('Erro ao gerar backup: ' + e.message);
        }
    };

    window.baixarBackup = async function (i) {
        const b = window.backupList[i];
        if (!b) return;
        try { await entregarArquivo(b.nome, true); } catch (e) { alert('Erro: ' + e.message); }
    };

    async function enviarRestauracao(promessaResposta) {
        try {
            const j = await promessaResposta;
            await window.avisar('Backup restaurado com sucesso!\n' + (j.registros != null ? j.registros + ' registros recuperados.\n' : '') +
                  (j.copiaDeSeguranca ? 'Cópia de segurança do estado anterior: ' + j.copiaDeSeguranca + '\n' : '') + '\nO sistema será reiniciado.');
            window.location.hash = '#home';
            window.location.reload();
        } catch (e) {
            alert('Não foi possível restaurar: ' + e.message);
        }
    }

    window.restaurarBackup = async function (event) {
        const input = event.target;
        const file = input.files && input.files[0];
        input.value = '';
        if (!file) return;
        const nome = String(file.name || '').toLowerCase();
        if (!(nome.endsWith(EXT) || nome.endsWith('.sqlite'))) {
            alert('Escolha um arquivo de backup do Comandas (' + EXT + ').');
            return;
        }
        if (!await window.confirmar('Restaurar "' + file.name + '"?\n\nTodos os dados atuais serão SUBSTITUÍDOS pelos do arquivo. Uma cópia de segurança do estado atual é guardada antes.')) return;
        const buf = await file.arrayBuffer();
        enviarRestauracao(api('restaurar', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf }));
    };

    window.restaurarDaLista = async function (i) {
        const b = window.backupList[i];
        if (!b) return;
        if (!await window.confirmar('Restaurar o backup de ' + new Date(b.data).toLocaleString('pt-BR') + '?\n\nOs dados atuais serão SUBSTITUÍDOS. Uma cópia de segurança do estado atual é guardada antes.')) return;
        enviarRestauracao(api('restaurar-lista', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: b.nome }) }));
    };

    window.excluirDaLista = async function (i) {
        const b = window.backupList[i];
        if (!b || !await window.confirmar('Excluir este backup do aparelho?')) return;
        try { await api('arquivo/' + encodeURIComponent(b.nome), { method: 'DELETE' }); carregarBackups(); }
        catch (e) { alert('Erro ao excluir: ' + e.message); }
    };

    // compatibilidade com chamadas antigas
    window.compartilharBackup = window.baixarBackup;

    window.zerarDados = async function () {
        const r = await window.perguntar('Isto apaga TODO o financeiro: caixas e histórico, comandas, pedidos pendentes, sangrias, perdas e movimentações.\nCadastros gerais ficam.\nUm backup de segurança é feito antes.\n\nPara confirmar, digite ZERAR:');
        if (r == null) return;
        try {
            const j = await api('zerar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmacao: r }) });
            await window.avisar('Movimentações apagadas (' + j.apagados + ' registros).\nBackup de segurança: ' + j.copiaDeSeguranca);
            window.location.reload();
        } catch (e) { alert('Não foi possível zerar: ' + e.message); }
    };
}
