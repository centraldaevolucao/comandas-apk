// ============================================================
// RELATORIOEXPORT.JS — imprimir, exportar CSV e PDF de qualquer relatório
// Entrada (window.relatorioAtual):
//   { titulo, subtitulo, filtros: [[nome, valor], ...],
//     colunas: ['A','B',...], alinhar: ['l','l','r'], linhas: [[...], ...],
//     totais: [[rotulo, valorTexto], ...] }
// Não depende de biblioteca: o PDF é gerado aqui mesmo (texto + tabela).
// ============================================================
console.log('✔ relatorioExport.js carregado');

(function () {
    'use strict';

    const esc = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    function nomeArquivo(d, ext) {
        const base = String(d.titulo || 'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const hoje = new Date();
        const p = (n) => String(n).padStart(2, '0');
        return base + '_' + hoje.getFullYear() + '-' + p(hoje.getMonth() + 1) + '-' + p(hoje.getDate()) + '.' + ext;
    }

    function blobB64(blob) {
        return new Promise(function (ok, erro) {
            const fr = new FileReader();
            fr.onload = function () { ok(String(fr.result).split(',')[1] || ''); };
            fr.onerror = function () { erro(fr.error); };
            fr.readAsDataURL(blob);
        });
    }

    function baixarArquivo(blob, nome) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = nome;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();               // no app Android o acoes.js intercepta e salva em Downloads/Comandas
        setTimeout(function () { a.remove(); }, 1000);
    }

    // Exportar → abre o menu COMPARTILHAR com o arquivo gerado (app: nativo do Android; navegador: Web Share; senão baixa)
    async function baixar(blob, nome) {
        const mime = blob.type || 'application/octet-stream';
        try {
            if (window.AndroidApp && window.AndroidApp.compartilharArquivo) {
                window.AndroidApp.compartilharArquivo(nome, mime, await blobB64(blob));
                return;
            }
            if (navigator.canShare && typeof File === 'function') {
                const f = new File([blob], nome, { type: mime });
                if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nome }); return; }
            }
        } catch (e) {
            if (e && e.name === 'AbortError') return;   // usuário fechou o menu
        }
        baixarArquivo(blob, nome);
    }

    // ---------------- CSV (separador ";", abre direto no Excel em pt-BR) ----------------
    function celulaCsv(v) {
        const t = String(v == null ? '' : v).replace(/\r?\n/g, ' ');
        return /[;"\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
    }
    function gerarCSV(d) {
        const linhas = [];
        linhas.push([d.titulo]);
        if (d.subtitulo) linhas.push([d.subtitulo]);
        (d.filtros || []).forEach(function (f) { linhas.push([f[0], f[1]]); });
        linhas.push(['Gerado em', new Date().toLocaleString('pt-BR')]);
        linhas.push([]);
        linhas.push(d.colunas);
        d.linhas.forEach(function (l) { linhas.push(l); });
        if ((d.totais || []).length) {
            linhas.push([]);
            d.totais.forEach(function (t) { linhas.push([t[0], t[1]]); });
        }
        const texto = linhas.map(function (l) { return l.map(celulaCsv).join(';'); }).join('\r\n');
        return new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' });
    }

    // ---------------- HTML para imprimir ----------------
    function gerarHTML(d) {
        const th = d.colunas.map(function (c, i) {
            return '<th style="text-align:' + (d.alinhar && d.alinhar[i] === 'r' ? 'right' : 'left') + '">' + esc(c) + '</th>';
        }).join('');
        const tr = d.linhas.map(function (l) {
            return '<tr>' + l.map(function (v, i) {
                return '<td style="text-align:' + (d.alinhar && d.alinhar[i] === 'r' ? 'right' : 'left') + '">' + esc(v) + '</td>';
            }).join('') + '</tr>';
        }).join('') || '<tr><td colspan="' + d.colunas.length + '" style="text-align:center;color:#888;padding:16px;">Nenhum registro</td></tr>';
        const filtros = (d.filtros || []).map(function (f) {
            return '<span class="chip"><b>' + esc(f[0]) + ':</b> ' + esc(f[1]) + '</span>';
        }).join(' ');
        const totais = (d.totais || []).map(function (t) {
            return '<tr><td>' + esc(t[0]) + '</td><td style="text-align:right"><b>' + esc(t[1]) + '</b></td></tr>';
        }).join('');
        return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
            '<title>' + esc(d.titulo) + '</title><style>' +
            '*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:16px;font-size:13px}' +
            'h1{font-size:20px;margin:0 0 4px;color:#C2185B}.sub{color:#666;margin-bottom:10px}' +
            '.chip{display:inline-block;background:#fce4ec;border-radius:12px;padding:3px 10px;margin:0 4px 6px 0;font-size:12px}' +
            'table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#C2185B;color:#fff;padding:7px 8px;font-size:12px}' +
            'td{padding:6px 8px;border-bottom:1px solid #e5e5e5}tr:nth-child(even) td{background:#fafafa}' +
            '.tot{width:auto;min-width:260px;margin:14px 0 0 auto}.tot td{border:0;padding:4px 8px;font-size:14px}' +
            '.rod{margin-top:18px;color:#888;font-size:11px}@media print{body{margin:0}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}' +
            '</style></head><body><h1>' + esc(d.titulo) + '</h1>' +
            (d.subtitulo ? '<div class="sub">' + esc(d.subtitulo) + '</div>' : '') +
            '<div>' + filtros + '</div>' +
            '<table><thead><tr>' + th + '</tr></thead><tbody>' + tr + '</tbody></table>' +
            (totais ? '<table class="tot">' + totais + '</table>' : '') +
            '<div class="rod">Gerado em ' + esc(new Date().toLocaleString('pt-BR')) + '</div>' +
            '<script>window.onload=function(){setTimeout(function(){window.print();},300);}<\/script>' +
            '</body></html>';
    }

    // ---------------- PDF simples (Helvetica, A4) ----------------
    function latin1(s) {
        let t = String(s == null ? '' : s)
            .replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"')
            .replace(/\u2022/g, '-').replace(/\u2026/g, '...');
        let o = '';
        for (let i = 0; i < t.length; i++) {
            const c = t.charCodeAt(i);
            o += (c < 256) ? t.charAt(i) : '?';
        }
        return o;
    }
    const pdfEsc = (s) => latin1(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
    const larg = (s, tam) => latin1(s).length * tam * 0.52; // largura média aproximada (Helvetica)

    function cortar(s, max, tam) {
        let t = latin1(s);
        if (larg(t, tam) <= max) return t;
        while (t.length > 1 && larg(t + '...', tam) > max) t = t.slice(0, -1);
        return t + '...';
    }

    function gerarPDF(d) {
        const W = 595, H = 842, M = 36, LH = 15;
        const colunas = d.colunas, n = colunas.length;
        // largura de cada coluna proporcional ao maior texto (com mínimo)
        const pesos = colunas.map(function (c, i) {
            let m = latin1(c).length;
            d.linhas.forEach(function (l) { m = Math.max(m, Math.min(40, latin1(l[i]).length)); });
            return Math.max(6, m);
        });
        const soma = pesos.reduce(function (a, b) { return a + b; }, 0);
        const util = W - 2 * M;
        const ws = pesos.map(function (p) { return util * p / soma; });
        const dir = (i) => d.alinhar && d.alinhar[i] === 'r';

        const paginas = [];
        let cont = [], y = H - M;
        const novaPagina = function () { cont = []; paginas.push(cont); y = H - M; };
        const texto = function (x, yy, s, tam, bold, cor) {
            cont.push((cor || '0 g') + ' BT /' + (bold ? 'F2' : 'F1') + ' ' + tam + ' Tf ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td (' + pdfEsc(s) + ') Tj ET');
        };
        const retangulo = function (x, yy, w, h, rgb) {
            cont.push(rgb + ' rg ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' ' + w.toFixed(1) + ' ' + h.toFixed(1) + ' re f');
        };
        const cabecalhoTabela = function () {
            retangulo(M, y - 4, util, LH + 2, '0.76 0.09 0.36');
            let x = M;
            colunas.forEach(function (c, i) {
                const t = cortar(c, ws[i] - 8, 9);
                texto(dir(i) ? x + ws[i] - 4 - larg(t, 9) : x + 4, y, t, 9, true, '1 g');
                x += ws[i];
            });
            y -= LH + 2;
        };

        novaPagina();
        texto(M, y - 10, d.titulo, 17, true, '0.76 0.09 0.36 rg');
        y -= 28;
        if (d.subtitulo) { texto(M, y, d.subtitulo, 10, false, '0.35 g'); y -= 14; }
        (d.filtros || []).forEach(function (f) {
            texto(M, y, cortar(f[0] + ': ' + f[1], util, 9), 9, false, '0.2 g'); y -= 12;
        });
        texto(M, y, 'Gerado em ' + new Date().toLocaleString('pt-BR'), 8, false, '0.5 g');
        y -= 20;
        cabecalhoTabela();

        d.linhas.forEach(function (l, r) {
            if (y < M + 40) { novaPagina(); cabecalhoTabela(); }
            if (r % 2 === 1) retangulo(M, y - 4, util, LH, '0.96 0.96 0.96');
            let x = M;
            l.forEach(function (v, i) {
                const t = cortar(v, ws[i] - 8, 9);
                texto(dir(i) ? x + ws[i] - 4 - larg(t, 9) : x + 4, y, t, 9, false, '0.1 g');
                x += ws[i];
            });
            y -= LH;
        });
        if (!d.linhas.length) { texto(M + 4, y, 'Nenhum registro', 9, false, '0.5 g'); y -= LH; }

        y -= 8;
        (d.totais || []).forEach(function (t) {
            if (y < M + 30) { novaPagina(); }
            const v = latin1(t[1]), r = latin1(t[0]);
            texto(W - M - 4 - larg(v, 11), y, v, 11, true, '0.1 g');
            texto(W - M - 4 - larg(v, 11) - 14 - larg(r, 10), y, r, 10, false, '0.3 g');
            y -= 16;
        });

        // rodapé com numeração
        paginas.forEach(function (pg, i) {
            const t = 'Página ' + (i + 1) + ' de ' + paginas.length;
            pg.push('0.5 g BT /F1 8 Tf ' + (W - M - larg(t, 8)).toFixed(1) + ' 20 Td (' + pdfEsc(t) + ') Tj ET');
        });

        // ---- monta o arquivo ----
        const objs = [];            // índice 0 = objeto 1
        const add = function (s) { objs.push(s); return objs.length; };
        add('<< /Type /Catalog /Pages 2 0 R >>');                 // 1
        add('PAGES');                                             // 2 (preenchido depois)
        add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');       // 3
        add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');   // 4
        const ids = [];
        paginas.forEach(function (pg) {
            const fluxo = pg.join('\n');
            const c = add('<< /Length ' + fluxo.length + ' >>\nstream\n' + fluxo + '\nendstream');
            const p = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + H + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + c + ' 0 R >>');
            ids.push(p);
        });
        objs[1] = '<< /Type /Pages /Kids [' + ids.map(function (i) { return i + ' 0 R'; }).join(' ') + '] /Count ' + ids.length + ' >>';

        let out = '%PDF-1.4\n';
        const offs = [];
        objs.forEach(function (o, i) { offs.push(out.length); out += (i + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
        const xref = out.length;
        out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n';
        offs.forEach(function (o) { out += String(o).padStart(10, '0') + ' 00000 n \n'; });
        out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';

        const bytes = new Uint8Array(out.length);
        for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
        return new Blob([bytes], { type: 'application/pdf' });
    }

    // ---------------- ações ----------------
    window.exportarRelatorio = function (formato, dados) {
        const d = dados || window.relatorioAtual;
        if (!d) { alert('Abra um relatório primeiro.'); return; }
        try {
            if (formato === 'csv') baixar(gerarCSV(d), nomeArquivo(d, 'csv'));
            else if (formato === 'pdf') baixar(gerarPDF(d), nomeArquivo(d, 'pdf'));
            else {
                const w = window.open('', '_blank');
                if (!w) { alert('Permita pop-ups para imprimir.'); return; }
                w.document.open(); w.document.write(gerarHTML(d)); w.document.close();
            }
        } catch (e) {
            console.error(e);
            alert('Não foi possível gerar o arquivo: ' + e.message);
        }
    };
    window.__gerarPDFRelatorio = gerarPDF;
    window.__gerarCSVRelatorio = gerarCSV;
})();
