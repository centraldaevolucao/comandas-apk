// ============================================================
// PLATAFORMA.JS — única porta entre o sistema e o aparelho/computador onde ele roda.
// Android: delega para a ponte nativa (window.AndroidApp, injetada pelo app).
// Navegador/Desktop (Windows e Linux): usa as funções registradas com Plataforma.registrar();
// o que não existir cai nos recursos web que as telas já têm (nada muda no comportamento).
//
//   Plataforma.nome            'android' | 'web'
//   Plataforma.tem('imprimir') true se esta plataforma sabe fazer isso
//   Plataforma.imprimir(...)   chama a função (qualquer nome da ponte)
//   Plataforma.nativo()        objeto com as funções (ponte do Android ou registro do desktop) ou null
//   Plataforma.registrar('compartilhar', fn)   implementação para desktop/web
// ============================================================
(function () {
    'use strict';
    const registro = {};
    const ponte = function () { return window.AndroidApp || null; };
    const base = {
        get nome() { return ponte() ? 'android' : 'web'; },
        get ehAndroid() { return !!ponte(); },
        nativo: function () { return ponte() || (Object.keys(registro).length ? registro : null); },
        tem: function (fn) {
            const a = ponte();
            if (a) return typeof a[fn] === 'function';
            return typeof registro[fn] === 'function';
        },
        registrar: function (fn, impl) { if (typeof impl === 'function') registro[fn] = impl; },
        chamar: function (fn) {
            const args = Array.prototype.slice.call(arguments, 1);
            const alvo = ponte() || registro;
            if (typeof alvo[fn] !== 'function') throw new TypeError('Plataforma: "' + fn + '" não existe nesta plataforma (' + base.nome + ')');
            return alvo[fn].apply(alvo, args);
        }
    };
    // Plataforma.qualquerFuncao(...) == Plataforma.chamar('qualquerFuncao', ...)
    window.Plataforma = typeof Proxy === 'function'
        ? new Proxy(base, { get: function (t, k) { return k in t ? t[k] : function () { return base.chamar.apply(null, [String(k)].concat(Array.prototype.slice.call(arguments))); }; } })
        : base;
})();
