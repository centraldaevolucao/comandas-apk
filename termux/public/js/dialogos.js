// ============================================================
// DIALOGOS.JS — caixas de diálogo no padrão visual do app
// (substitui alert / confirm / prompt do navegador)
//   await confirmar('Texto', {titulo, ok, perigo})  -> true/false
//   await perguntar('Texto', 'valor inicial', {tipo}) -> texto ou null
//   alert('Texto') continua funcionando (aviso não bloqueante)
// ============================================================
console.log('✔ dialogos.js carregado');
(function () {
    'use strict';
    const COR = 'var(--primary-color,#C2185B)';
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
    function fmtTexto(t) { return esc(t).replace(/\n/g, '<br>'); }
    function tituloAuto(msg, perigo) {
        const m = String(msg);
        if (/^[✅✔]/.test(m)) return 'Pronto';
        if (/^[❌⛔🚫]/.test(m)) return 'Atenção';
        if (/^⚠/.test(m)) return 'Atenção';
        return perigo ? 'Confirmar' : 'Aviso';
    }

    function montar(opts) {
        const ov = document.createElement('div');
        ov.className = 'modal-overlay dlg-app';
        ov.style.cssText = 'display:flex;align-items:center;justify-content:center;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:300000;padding:16px;';
        const corTopo = opts.perigo ? '#c62828' : COR;
        ov.innerHTML =
            '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.35);max-height:90vh;display:flex;flex-direction:column;">' +
            '  <div style="background:' + corTopo + ';color:#fff;padding:14px 16px;font-weight:700;display:flex;align-items:center;gap:10px;">' +
            '     <i class="fas ' + (opts.icone || 'fa-circle-info') + '"></i><span style="flex:1;">' + esc(opts.titulo) + '</span></div>' +
            '  <div style="padding:16px;overflow-y:auto;color:#333;font-size:.95rem;line-height:1.4;">' + opts.corpo + '</div>' +
            '  <div style="display:flex;gap:10px;padding:0 16px 16px;">' + opts.botoes + '</div></div>';
        document.body.appendChild(ov);
        return ov;
    }
    const BTN_OK = function (txt, perigo) { return '<button type="button" data-ok class="btn-primary" style="flex:1;' + (perigo ? 'background:#c62828;' : '') + '">' + esc(txt) + '</button>'; };
    const BTN_CANCEL = '<button type="button" data-cancel class="btn-outline" style="flex:1;">Cancelar</button>';

    window.confirmar = function (msg, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const perigo = opts.perigo !== undefined ? opts.perigo : /exclu|apag|remov|zerar|delet|revog|cancel|limpar|substitu|restaur/i.test(String(msg));
            const ov = montar({ titulo: opts.titulo || tituloAuto(msg, true), icone: perigo ? 'fa-triangle-exclamation' : 'fa-circle-question', perigo: perigo, corpo: fmtTexto(msg), botoes: BTN_CANCEL + BTN_OK(opts.ok || (perigo ? 'Confirmar' : 'OK'), perigo) });
            const fim = function (v) { ov.remove(); document.removeEventListener('keydown', tecla, true); resolve(v); };
            const tecla = function (e) { if (e.key === 'Escape') fim(false); };
            document.addEventListener('keydown', tecla, true);
            ov.querySelector('[data-ok]').onclick = function () { fim(true); };
            ov.querySelector('[data-cancel]').onclick = function () { fim(false); };
            ov.querySelector('[data-ok]').focus();
        });
    };

    window.perguntar = function (msg, padrao, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            const tipo = opts.tipo || 'text';
            const ov = montar({ titulo: opts.titulo || 'Informe', icone: 'fa-pen', corpo: '<div style="margin-bottom:10px;">' + fmtTexto(msg) + '</div>' +
                '<input type="' + tipo + '" ' + (tipo === 'number' ? 'inputmode="decimal" step="0.01"' : '') + ' id="dlg-input" value="' + esc(padrao == null ? '' : padrao) + '" style="width:100%;box-sizing:border-box;font-size:1.1rem;padding:12px;border:2px solid #ccc;border-radius:12px;">',
                botoes: BTN_CANCEL + BTN_OK('OK') });
            const inp = ov.querySelector('#dlg-input');
            const fim = function (v) { ov.remove(); resolve(v); };
            ov.querySelector('[data-ok]').onclick = function () { fim(inp.value); };
            ov.querySelector('[data-cancel]').onclick = function () { fim(null); };
            inp.onkeydown = function (e) { if (e.key === 'Enter') fim(inp.value); if (e.key === 'Escape') fim(null); };
            setTimeout(function () { inp.focus(); inp.select(); }, 60);
        });
    };

    // aviso não bloqueante (fila: mostra um por vez)
    const fila = []; let aberto = false;
    function proximo() {
        if (aberto || !fila.length) return;
        aberto = true;
        const item = fila.shift();
        const msg = typeof item === 'string' ? item : item.msg;
        const erro = /^[❌⛔🚫]|erro|falha|n[ãa]o foi poss/i.test(msg);
        const ov = montar({ titulo: tituloAuto(msg, false), icone: erro ? 'fa-circle-xmark' : (/^[✅✔]/.test(msg) ? 'fa-circle-check' : 'fa-circle-info'), perigo: erro, corpo: fmtTexto(String(msg).replace(/^[✅✔❌⛔🚫⚠️\s]+/, '')), botoes: BTN_OK('OK', erro) });
        const fim = function () { ov.remove(); aberto = false; if (item && item.fim) item.fim(); proximo(); };
        ov.querySelector('[data-ok]').onclick = fim;
        ov.querySelector('[data-ok]').focus();
        ov.onclick = function (e) { if (e.target === ov) fim(); };
    }
    window.avisar = function (msg) {   // aviso que espera o usuário tocar em OK
        return new Promise(function (resolve) { fila.push({ msg: String(msg), fim: resolve }); proximo(); });
    };
    window.__alertNativo = window.alert;
    window.alert = function (msg) { if (document.body) { fila.push(String(msg)); proximo(); } else window.__alertNativo(msg); };
})();
