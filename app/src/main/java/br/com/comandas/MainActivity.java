package br.com.comandas;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.provider.Settings;
import android.text.format.Formatter;
import android.util.Base64;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

/**
 * Comandas autônomo: roda o server.py (Python embutido via Chaquopy) dentro do próprio app
 * e mostra o sistema em uma WebView. Os dados ficam em files/comandas/data/database.sqlite.
 *
 * Esta versão: pede as permissões na primeira abertura (Wi-Fi/rede, armazenamento, Bluetooth,
 * notificações), faz alert/confirm/prompt funcionarem (botões de excluir, fechar caixa etc.),
 * permite escolher arquivos (restaurar backup, fotos), salvar arquivos em Downloads/Comandas,
 * imprimir (cupons e relatórios) e compartilhar — via a ponte window.AndroidApp.
 */
public class MainActivity extends Activity {
    private static final int PORTA = 3000;
    private static final String PREFS = "comandas";
    private static final int REQ_PERMISSOES = 100;
    private static final int REQ_ARQUIVO = 101;
    private static final int MAX_PEDIDOS_PERMISSAO = 2; // não insiste mais que isso

    private WebView web;
    private WebView webImpressao; // mantém referência enquanto o Android imprime
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> seletorArquivo;
    private PyObject boot;                     // módulo Python android_boot
    private volatile boolean servidorPronto = false;
    private File raizApp;

    // link externo temporário (Cloudflare)
    private Process tunelProc;
    private volatile String tunelEstado = "parado"; // parado | iniciando | ativo | erro
    private volatile String tunelUrl = "";
    private volatile String tunelMsg = "";
    private static final Pattern URL_TUNEL = Pattern.compile("https://[a-z0-9-]+\\.trycloudflare\\.com");

    /** Retorno do app da maquininha: comandaspay://<provedor>?... → entrega ao JavaScript. */
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri d = intent == null ? null : intent.getData();
        if (d != null && "comandaspay".equals(d.getScheme()) && web != null) {
            final String js = "window.__pagRetorno && window.__pagRetorno(" + org.json.JSONObject.quote(d.toString()) + ")";
            web.post(() -> web.evaluateJavascript(js, null));
        }
    }

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); // servidor só vive com o app aberto

        web = new WebView(this);
        setContentView(web);
        configurarWebView();

        // Preparar arquivos e subir o servidor fora da thread de interface.
        new Thread(() -> {
            try {
                File raiz = new File(getFilesDir(), "comandas");
                raizApp = raiz;
                copiarFrontendSeNecessario(raiz);
                restaurarBackupSeNecessario(raiz);   // reinstalou? traz o banco de volta da pasta /Comandas
                if (!Python.isStarted()) Python.start(new AndroidPlatform(this));
                String host = prefs.getBoolean("rede", false) ? "0.0.0.0" : "127.0.0.1";
                boot = Python.getInstance().getModule("android_boot");
                boot.callAttr("iniciar", raiz.getAbsolutePath(), host, PORTA);
                aguardarPorta();
                servidorPronto = true;
                iniciarBackupPeriodico();
                runOnUiThread(() -> {
                    web.loadUrl("http://127.0.0.1:" + PORTA + "/");
                    pedirPermissoesSeNecessario();
                });
            } catch (Exception e) {
                runOnUiThread(() -> new AlertDialog.Builder(this)
                    .setTitle("Não foi possível iniciar o servidor")
                    .setMessage(String.valueOf(e)).setPositiveButton("OK", null).show());
            }
        }, "comandas-boot").start();
    }

    // =====================================================================
    // WEBVIEW
    // =====================================================================
    private void configurarWebView() {
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);          // respeita <meta viewport> (layout responsivo correto)
        s.setLoadWithOverviewMode(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(true);
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new Ponte(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String host = u.getHost() == null ? "" : u.getHost();
                boolean interno = "127.0.0.1".equals(host) || "localhost".equals(host);
                if (interno) return false;
                abrirExterno(u.toString());
                return true; // links externos (WhatsApp, telefone, sites) abrem fora do app
            }
        });

        // Sem WebChromeClient o WebView ignora alert()/confirm()/prompt(): confirm() devolvia sempre
        // "não" e os botões de excluir/fechar/cancelar pareciam não fazer nada.
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (seletorArquivo != null) seletorArquivo.onReceiveValue(null);
                seletorArquivo = cb;
                try {
                    startActivityForResult(p.createIntent(), REQ_ARQUIVO);
                } catch (ActivityNotFoundException e) {
                    seletorArquivo = null;
                    Toast.makeText(MainActivity.this, "Nenhum gerenciador de arquivos encontrado.", Toast.LENGTH_LONG).show();
                    return false;
                }
                return true;
            }
        });
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_ARQUIVO && seletorArquivo != null) {
            seletorArquivo.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            seletorArquivo = null;
        }
    }

    private void abrirExterno(String url) {
        try {
            Uri u = Uri.parse(url);
            String esq = u.getScheme() == null ? "" : u.getScheme().toLowerCase();
            if (!(esq.equals("http") || esq.equals("https") || esq.equals("tel") || esq.equals("mailto")
                    || esq.equals("whatsapp") || esq.equals("geo") || esq.equals("sms"))) return; // bloqueia o resto
            Intent i = new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "Não foi possível abrir o link.", Toast.LENGTH_SHORT).show();
        }
    }

    // =====================================================================
    // PERMISSÕES (pedidas ao abrir)
    // =====================================================================
    private List<String> permissoesQueFaltam() {
        List<String> l = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= 33) {
            l.add(Manifest.permission.NEARBY_WIFI_DEVICES);   // Wi-Fi / rede
            l.add(Manifest.permission.READ_MEDIA_IMAGES);     // armazenamento (fotos)
            l.add(Manifest.permission.POST_NOTIFICATIONS);    // avisos
        } else {
            l.add(Manifest.permission.ACCESS_FINE_LOCATION);  // Wi-Fi: nome da rede (Android 12 ou menor)
            l.add(Manifest.permission.READ_EXTERNAL_STORAGE); // armazenamento
            if (Build.VERSION.SDK_INT <= 28) l.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
        if (Build.VERSION.SDK_INT >= 31) l.add(Manifest.permission.BLUETOOTH_CONNECT); // impressora Bluetooth
        List<String> faltam = new ArrayList<>();
        for (String p : l) if (checkSelfPermission(p) != PackageManager.PERMISSION_GRANTED) faltam.add(p);
        return faltam;
    }

    private void pedirPermissoesSeNecessario() {
        final List<String> faltam = permissoesQueFaltam();
        if (faltam.isEmpty()) { perguntarAcessoArquivos(); return; }
        int vezes = prefs.getInt("pedidos_permissao", 0);
        if (vezes >= MAX_PEDIDOS_PERMISSAO) return;
        prefs.edit().putInt("pedidos_permissao", vezes + 1).apply();
        new AlertDialog.Builder(this)
            .setTitle("Permissões do Comandas")
            .setMessage("Para funcionar por completo, o app precisa de:\n\n"
                + "• Wi-Fi / rede — conectar a cozinha, garçons e QR Code das mesas ao mesmo Wi-Fi.\n"
                + "• Armazenamento — escolher fotos/backup e salvar relatórios e backups.\n"
                + "• Bluetooth — imprimir cupom em impressora térmica.\n"
                + "• Notificações — avisos de impressão e arquivos salvos.\n\n"
                + "Você pode negar e usar o app mesmo assim; as partes que dependem da permissão ficam limitadas.")
            .setCancelable(false)
            .setPositiveButton("Continuar", (d, w) -> requestPermissions(faltam.toArray(new String[0]), REQ_PERMISSOES))
            .setNegativeButton("Agora não", null)
            .show();
    }

    @Override public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        if (req != REQ_PERMISSOES) return;
        int negadas = 0;
        for (int r : res) if (r != PackageManager.PERMISSION_GRANTED) negadas++;
        if (negadas > 0) {
            Toast.makeText(this, "Algumas permissões foram negadas. Você pode liberar em Configurações > Apps > Comandas.", Toast.LENGTH_LONG).show();
        }
        perguntarAcessoArquivos();
    }

    /** Para os dados sobreviverem a desinstalar/reinstalar o app precisa gravar na pasta pública /Comandas. */
    private void perguntarAcessoArquivos() {
        if (temAcessoTotalArquivos() || Build.VERSION.SDK_INT < 30) return;
        int vezes = prefs.getInt("pedidos_arquivos", 0);
        if (vezes >= MAX_PEDIDOS_PERMISSAO) return;
        prefs.edit().putInt("pedidos_arquivos", vezes + 1).apply();
        new AlertDialog.Builder(this)
            .setTitle("Guardar seus dados com segurança")
            .setMessage("Para NÃO perder comandas, produtos e caixa ao reinstalar ou atualizar o app, o Comandas salva uma cópia na pasta \"Comandas\" do aparelho.\n\nNa próxima tela, ative \"Permitir acesso a todos os arquivos\" para o Comandas.")
            .setPositiveButton("Abrir configuração", (d, w) -> pedirAcessoTotalArquivos())
            .setNegativeButton("Agora não", null)
            .show();
    }

    // =====================================================================
    // PONTE JAVASCRIPT  (window.AndroidApp.*, usada por js/acoes.js)
    // =====================================================================
    public class Ponte {
        @JavascriptInterface public String ipLocal() { return ipWifi(); }

        @JavascriptInterface public String redeInfo() {
            return "{\"ip\":\"" + ipWifi() + "\",\"ssid\":\"" + ssidWifi().replace("\"", "") + "\",\"porta\":" + PORTA
                + ",\"aberta\":" + prefs.getBoolean("rede", false) + "}";
        }

        /** Lê um QR Code de uma imagem (data URL). Devolve o texto ou "" se não achou. */
        @JavascriptInterface public String lerQr(String dataUrl) {
            try {
                byte[] b = android.util.Base64.decode(dataUrl.substring(dataUrl.indexOf(',') + 1), android.util.Base64.DEFAULT);
                android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeByteArray(b, 0, b.length);
                if (bm == null) return "";
                int w = bm.getWidth(), h = bm.getHeight();
                int[] px = new int[w * h];
                bm.getPixels(px, 0, w, 0, 0, w, h);
                com.google.zxing.BinaryBitmap bb = new com.google.zxing.BinaryBitmap(new com.google.zxing.common.HybridBinarizer(new com.google.zxing.RGBLuminanceSource(w, h, px)));
                java.util.Map<com.google.zxing.DecodeHintType, Object> hints = new java.util.EnumMap<>(com.google.zxing.DecodeHintType.class);
                hints.put(com.google.zxing.DecodeHintType.TRY_HARDER, Boolean.TRUE);
                hints.put(com.google.zxing.DecodeHintType.POSSIBLE_FORMATS, java.util.Collections.singletonList(com.google.zxing.BarcodeFormat.QR_CODE));
                return new com.google.zxing.MultiFormatReader().decode(bb, hints).getText();
            } catch (Throwable e) { return ""; }
        }

        // ---------------- Impressora Bluetooth térmica (ESC/POS pela porta serial SPP) ----------------
        /** Dispositivos Bluetooth pareados: [{nome, mac, tipo}] (precisa da permissão Bluetooth). */
        @JavascriptInterface public String btListar() {
            org.json.JSONArray arr = new org.json.JSONArray();
            try {
                android.bluetooth.BluetoothAdapter ad = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                if (ad == null) return "{\"erro\":\"Este aparelho não tem Bluetooth\",\"lista\":[]}";
                if (!ad.isEnabled()) return "{\"erro\":\"Bluetooth desligado. Ligue o Bluetooth e toque em Atualizar.\",\"lista\":[]}";
                if (Build.VERSION.SDK_INT >= 31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                    runOnUiThread(() -> requestPermissions(new String[]{ Manifest.permission.BLUETOOTH_CONNECT }, 4321));
                    return "{\"erro\":\"Permita o acesso ao Bluetooth e toque em Atualizar.\",\"lista\":[]}";
                }
                for (android.bluetooth.BluetoothDevice d : ad.getBondedDevices()) {
                    org.json.JSONObject o = new org.json.JSONObject();
                    o.put("nome", d.getName() == null ? d.getAddress() : d.getName());
                    o.put("mac", d.getAddress());
                    int cls = d.getBluetoothClass() != null ? d.getBluetoothClass().getMajorDeviceClass() : -1;
                    o.put("impressora", cls == android.bluetooth.BluetoothClass.Device.Major.IMAGING);
                    arr.put(o);
                }
                org.json.JSONObject r = new org.json.JSONObject(); r.put("lista", arr);
                return r.toString();
            } catch (Exception e) { return "{\"erro\":\"" + String.valueOf(e.getMessage()).replace("\"", "'") + "\",\"lista\":[]}"; }
        }

        /** Envia bytes (base64) à impressora. O resultado volta por window.__btRes(id, ok, mensagem). */
        @JavascriptInterface public void btImprimir(final String mac, final String base64, final String id) {
            new Thread(() -> {
                boolean ok = false; String msg;
                android.bluetooth.BluetoothSocket sock = null;
                try {
                    android.bluetooth.BluetoothAdapter ad = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                    if (ad == null || !ad.isEnabled()) throw new IOException("Bluetooth desligado");
                    android.bluetooth.BluetoothDevice dev = ad.getRemoteDevice(mac);
                    try { ad.cancelDiscovery(); } catch (Exception ignore) {}
                    java.util.UUID spp = java.util.UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
                    try { sock = dev.createRfcommSocketToServiceRecord(spp); sock.connect(); }
                    catch (IOException e1) {   // alguns modelos só aceitam o método alternativo
                        try { if (sock != null) sock.close(); } catch (Exception ignore) {}
                        sock = (android.bluetooth.BluetoothSocket) dev.getClass().getMethod("createRfcommSocket", int.class).invoke(dev, 1);
                        sock.connect();
                    }
                    java.io.OutputStream os = sock.getOutputStream();
                    byte[] dados = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                    for (int i = 0; i < dados.length; i += 512) { os.write(dados, i, Math.min(512, dados.length - i)); os.flush(); Thread.sleep(40); }
                    Thread.sleep(400);
                    ok = true; msg = "Enviado";
                } catch (Exception e) {
                    msg = e.getMessage() == null ? e.toString() : e.getMessage();
                } finally { try { if (sock != null) sock.close(); } catch (Exception ignore) {} }
                final String js = "window.__btRes && window.__btRes(" + org.json.JSONObject.quote(id) + "," + ok + "," + org.json.JSONObject.quote(msg) + ")";
                runOnUiThread(() -> web.evaluateJavascript(js, null));
            }).start();
        }

        /** Liga/desliga a escuta na rede (0.0.0.0). Só vale após reiniciar o app. */
        @JavascriptInterface public boolean definirRede(final boolean aberta) {
            prefs.edit().putBoolean("rede", aberta).commit();
            return prefs.getBoolean("rede", false);
        }

        /** Reinicia o app de verdade (novo processo), para o servidor embutido subir com o host novo. */
        @JavascriptInterface public void reiniciarApp() { runOnUiThread(() -> reiniciarProcesso()); }

        @JavascriptInterface public void iniciarTunel() { iniciarTunelCloudflare(); }
        @JavascriptInterface public void pararTunel() { pararTunelCloudflare(); }
        @JavascriptInterface public String statusTunel() {
            return "{\"estado\":\"" + tunelEstado + "\",\"url\":\"" + tunelUrl + "\",\"msg\":\"" + tunelMsg.replace("\\", "/").replace("\"", "'").replace("\n", " ") + "\"}";
        }

        @JavascriptInterface public String backupInfo() {
            return "{\"permissao\":" + temAcessoTotalArquivos() + ",\"pasta\":\"" + pastaBackup().getAbsolutePath() + "\"}";
        }
        @JavascriptInterface public void backupAgora() { new Thread(() -> { boolean ok = salvarBackupAgora(); avisar(ok ? "Backup salvo em " + pastaBackup().getAbsolutePath() : "Não foi possível salvar o backup (permita o acesso aos arquivos)."); }).start(); }
        @JavascriptInterface public void pedirAcessoArquivos() { runOnUiThread(() -> pedirAcessoTotalArquivos()); }

        @JavascriptInterface public void abrirUrl(final String url) { runOnUiThread(() -> abrirExterno(url)); }

        /** Abre o app da maquininha (Cielo LIO / Stone / SumUp) por deeplink. Devolve "OK" ou "ERRO ...". */
        @JavascriptInterface public String abrirDeeplinkPagamento(final String uri) {
            try {
                Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
                return "OK";
            } catch (ActivityNotFoundException e) {
                return "ERRO app nao instalado";
            } catch (Exception e) {
                return "ERRO " + e.getMessage();
            }
        }

        @JavascriptInterface public void imprimir(final String html, final String titulo) {
            runOnUiThread(() -> imprimirHtml(html, titulo));
        }

        @JavascriptInterface public void compartilhar(final String titulo, final String texto) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_SUBJECT, titulo);
                i.putExtra(Intent.EXTRA_TEXT, texto);
                startActivity(Intent.createChooser(i, "Compartilhar"));
            });
        }

        /** Compartilha uma imagem PNG (base64): tenta o WhatsApp direto; senão abre a lista de apps. */
        @JavascriptInterface public void compartilharImagem(final String nome, final String base64, final String texto) { compartilharImagem(nome, base64, texto, ""); }

        /** Menu Compartilhar do Android (e-mail, Drive, Telegram, SMS…), sem forçar o WhatsApp. */
        @JavascriptInterface public void compartilharImagemOutros(final String nome, final String base64, final String texto) { enviarImagem(nome, base64, texto, "", true); }

        @JavascriptInterface public void compartilharImagem(final String nome, final String base64, final String texto, final String telefone) { enviarImagem(nome, base64, texto, telefone, false); }

        private void enviarImagem(final String nome, final String base64, final String texto, final String telefone, final boolean outros) {
            new Thread(() -> {
                try {
                    byte[] dados = Base64.decode(base64, Base64.DEFAULT);
                    android.graphics.Bitmap bm = android.graphics.BitmapFactory.decodeByteArray(dados, 0, dados.length);
                    if (bm == null) throw new IOException("imagem inválida");
                    String url = android.provider.MediaStore.Images.Media.insertImage(getContentResolver(), bm, nome, texto);
                    if (url == null) throw new IOException("não foi possível preparar a imagem");
                    final Uri uri = Uri.parse(url);
                    runOnUiThread(() -> {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType("image/png");
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.putExtra(Intent.EXTRA_TEXT, texto);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        if (outros) { startActivity(Intent.createChooser(i, "Compartilhar")); return; }
                        String tel = telefone == null ? "" : telefone.replaceAll("\\D", "");
                        String[] pacotes = { "com.whatsapp", "com.whatsapp.w4b" };   // WhatsApp e WhatsApp Business
                        for (String pk : pacotes) {
                            try {
                                Intent w = new Intent(i); w.setPackage(pk);
                                if (tel.length() >= 12) w.putExtra("jid", tel + "@s.whatsapp.net");   // abre a conversa do número, mesmo fora da agenda
                                startActivity(w);
                                return;
                            } catch (Exception e) { /* tenta o próximo */ }
                        }
                        startActivity(Intent.createChooser(i, "Enviar"));
                    });
                } catch (Exception e) {
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Não foi possível compartilhar: " + e.getMessage(), Toast.LENGTH_LONG).show());
                }
            }).start();
        }

        /** Abre o menu Compartilhar do Android com o arquivo gerado (CSV, PDF, backup...). */
        @JavascriptInterface public void compartilharArquivo(final String nome, final String mime, final String base64) {
            new Thread(() -> {
                try {
                    String seguro = nome.replaceAll("[\\\\/:*?\"<>|]", "_");
                    byte[] dados = Base64.decode(base64, Base64.DEFAULT);
                    File dir = new File(getCacheDir(), "compartilhar");
                    if (!dir.exists() && !dir.mkdirs()) throw new IOException("não foi possível preparar o arquivo");
                    File[] velhos = dir.listFiles();
                    if (velhos != null) for (File v : velhos) v.delete();   // não acumula arquivos temporários
                    File f = new File(dir, seguro);
                    try (FileOutputStream out = new FileOutputStream(f)) { out.write(dados); }
                    final Uri uri = androidx.core.content.FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", f);
                    final String tipo = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
                    runOnUiThread(() -> {
                        Intent i = new Intent(Intent.ACTION_SEND);
                        i.setType(tipo);
                        i.putExtra(Intent.EXTRA_STREAM, uri);
                        i.putExtra(Intent.EXTRA_SUBJECT, seguro);
                        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        startActivity(Intent.createChooser(i, "Compartilhar " + seguro));
                    });
                } catch (Exception e) {
                    avisar("Não foi possível compartilhar: " + e.getMessage());
                }
            }, "comandas-compartilhar").start();
        }

        @JavascriptInterface public void salvarArquivo(final String nome, final String mime, final String base64) {
            new Thread(() -> {
                try {
                    String seguro = nome.replaceAll("[\\\\/:*?\"<>|]", "_");
                    byte[] dados = Base64.decode(base64, Base64.DEFAULT);
                    if (Build.VERSION.SDK_INT >= 29) {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, seguro);
                        cv.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Comandas");
                        Uri uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        if (uri == null) throw new IOException("sem acesso a Downloads");
                        try (OutputStream out = getContentResolver().openOutputStream(uri)) { out.write(dados); }
                    } else {
                        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Comandas");
                        if (!dir.exists() && !dir.mkdirs()) throw new IOException("não foi possível criar a pasta");
                        try (FileOutputStream out = new FileOutputStream(new File(dir, seguro))) { out.write(dados); }
                    }
                    avisar("Salvo em Downloads/Comandas/" + seguro);
                } catch (Exception e) {
                    avisar("Não foi possível salvar: " + e.getMessage());
                }
            }, "comandas-salvar").start();
        }
    }

    private void avisar(final String msg) {
        runOnUiThread(() -> Toast.makeText(this, msg, Toast.LENGTH_LONG).show());
    }

    /** Imprime/gera PDF pelo serviço de impressão do Android (inclui "Salvar como PDF"). */
    private void imprimirHtml(String html, final String titulo) {
        final WebView w = new WebView(this);
        w.getSettings().setJavaScriptEnabled(false);
        w.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (pm == null) { avisar("Impressão indisponível neste aparelho."); return; }
                PrintDocumentAdapter ad = v.createPrintDocumentAdapter(titulo == null || titulo.isEmpty() ? "Comandas" : titulo);
                pm.print(titulo == null || titulo.isEmpty() ? "Comandas" : titulo, ad, new PrintAttributes.Builder().build());
            }
        });
        webImpressao = w;
        w.loadDataWithBaseURL("http://127.0.0.1:" + PORTA + "/", html, "text/html", "UTF-8", null);
    }

    // =====================================================================
    // LINK EXTERNO TEMPORÁRIO (Cloudflare Quick Tunnel)
    // =====================================================================
    private synchronized void iniciarTunelCloudflare() {
        if (tunelProc != null && ("ativo".equals(tunelEstado) || "iniciando".equals(tunelEstado))) return;
        final File bin = new File(getApplicationInfo().nativeLibraryDir, "libcloudflared.so");
        if (!bin.exists()) {
            tunelEstado = "erro";
            tunelMsg = "Este APK não trouxe o cloudflared. Use o Termux (cloudflared tunnel --url http://127.0.0.1:3000) e cole o link abaixo.";
            return;
        }
        tunelEstado = "iniciando"; tunelUrl = ""; tunelMsg = "";
        new Thread(() -> {
            try {
                ProcessBuilder pb = new ProcessBuilder(bin.getAbsolutePath(), "tunnel", "--no-autoupdate",
                    "--url", "http://127.0.0.1:" + PORTA);
                pb.environment().put("HOME", getFilesDir().getAbsolutePath());
                pb.environment().put("TMPDIR", getCacheDir().getAbsolutePath());
                // O cloudflared (Go) não enxerga os certificados do Android: leva um pacote de CAs junto (corrige "x509: certificate signed by unknown authority").
                try {
                    File ca = new File(getFilesDir(), "cacert.pem");
                    if (!ca.exists() || ca.length() < 1000) {
                        try (InputStream in = getAssets().open("cacert.pem")) { copiarFluxo(in, ca); }
                    }
                    pb.environment().put("SSL_CERT_FILE", ca.getAbsolutePath());
                    pb.environment().put("SSL_CERT_DIR", "/system/etc/security/cacerts:/apex/com.android.conscrypt/cacerts");
                } catch (Exception e) { /* segue sem o pacote */ }
                pb.redirectErrorStream(true);
                Process proc = pb.start();
                tunelProc = proc;
                StringBuilder ultimas = new StringBuilder();
                try (BufferedReader r = new BufferedReader(new InputStreamReader(proc.getInputStream()))) {
                    String linha;
                    while ((linha = r.readLine()) != null) {
                        if (ultimas.length() > 600) ultimas.delete(0, 300);
                        ultimas.append(linha).append(' ');
                        Matcher m = URL_TUNEL.matcher(linha);
                        if (m.find() && !"ativo".equals(tunelEstado)) {
                            tunelUrl = m.group();
                            tunelEstado = "ativo";
                            gravarArquivoTunel(tunelUrl);
                        }
                    }
                }
                proc.waitFor();
                if (!"parado".equals(tunelEstado)) {
                    tunelEstado = "erro";
                    String fim = ultimas.toString();
                    tunelMsg = fim.contains("lookup") || fim.contains("dial") || fim.contains("resolv")
                        ? "Sem acesso à Cloudflare (internet ou DNS). Tente pelo Termux e cole o link abaixo."
                        : "O túnel foi encerrado. " + (fim.length() > 120 ? fim.substring(fim.length() - 120) : fim);
                }
            } catch (Exception e) {
                tunelEstado = "erro"; tunelMsg = "Falha ao iniciar o túnel: " + e.getMessage();
            } finally {
                tunelProc = null; tunelUrl = ""; gravarArquivoTunel("");
            }
        }, "comandas-tunel").start();
    }

    private synchronized void pararTunelCloudflare() {
        tunelEstado = "parado"; tunelUrl = ""; tunelMsg = "";
        if (tunelProc != null) { tunelProc.destroy(); tunelProc = null; }
        gravarArquivoTunel("");
    }

    private void gravarArquivoTunel(String url) {
        try {
            if (raizApp == null) return;
            File f = new File(raizApp, "tunnel_url.txt");
            try (FileOutputStream out = new FileOutputStream(f)) { out.write(url.getBytes("UTF-8")); }
        } catch (Exception ignorado) { }
    }

    // =====================================================================
    // BANCO DE DADOS: cópia fora do app (sobrevive a desinstalar/reinstalar)
    // =====================================================================
    /** Pasta pública /Comandas no armazenamento do aparelho (não é apagada ao desinstalar o app). */
    private File pastaBackup() { return new File(Environment.getExternalStorageDirectory(), "Comandas/backup"); }

    private boolean temAcessoTotalArquivos() {
        if (Build.VERSION.SDK_INT >= 30) return Environment.isExternalStorageManager();
        return checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED;
    }

    private void pedirAcessoTotalArquivos() {
        try {
            if (Build.VERSION.SDK_INT >= 30) {
                Intent i = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION, Uri.parse("package:" + getPackageName()));
                startActivity(i);
            } else {
                requestPermissions(new String[]{ Manifest.permission.WRITE_EXTERNAL_STORAGE, Manifest.permission.READ_EXTERNAL_STORAGE }, REQ_PERMISSOES);
            }
        } catch (Exception e) {
            try { startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)); } catch (Exception ignorado) { }
        }
    }

    /** Primeira abertura depois de reinstalar: se não há banco no app mas há cópia na pasta /Comandas, restaura. */
    private void restaurarBackupSeNecessario(File raiz) {
        try {
            File db = new File(raiz, "data/database.sqlite");
            if (db.exists() && db.length() > 0) return;
            if (!temAcessoTotalArquivos()) return;
            File copia = new File(pastaBackup(), "comandas.sqlite");
            if (!copia.exists() || copia.length() == 0) return;
            db.getParentFile().mkdirs();
            try (InputStream in = new java.io.FileInputStream(copia)) { copiarFluxo(in, db); }
            avisar("Dados restaurados do backup em /Comandas");
        } catch (Exception e) { /* sem backup: começa vazio */ }
    }

    private boolean salvarBackupAgora() {
        try {
            if (!servidorPronto || boot == null || !temAcessoTotalArquivos()) return false;
            File dir = pastaBackup();
            if (!dir.exists() && !dir.mkdirs()) return false;
            synchronized (this) { boot.callAttr("salvar_backup", dir.getAbsolutePath()); }
            return true;
        } catch (Exception e) { return false; }
    }

    private void iniciarBackupPeriodico() {
        Thread t = new Thread(() -> {
            while (true) {
                try { Thread.sleep(3 * 60 * 1000L); } catch (InterruptedException e) { return; }
                salvarBackupAgora();
            }
        }, "comandas-backup");
        t.setDaemon(true);
        t.start();
    }

    // =====================================================================
    // ARQUIVOS DO FRONTEND
    // =====================================================================
    /** Copia assets/public para files/comandas/public quando a versão do app muda (preserva data/). */
    private void copiarFrontendSeNecessario(File raiz) throws IOException {
        int versao;
        try {
            android.content.pm.PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
            versao = Build.VERSION.SDK_INT >= 28 ? (int) pi.getLongVersionCode() : pi.versionCode;
        }
        catch (Exception e) { versao = 0; }
        if (prefs.getInt("frontend_versao", -1) == versao && new File(raiz, "public/index.html").exists()) return;
        // Atualização: antes de trocar o frontend, guarda uma cópia do banco (cadastros nunca são substituídos; só o frontend é trocado).
        try {
            File dbAtual = new File(raiz, "data/database.sqlite");
            if (dbAtual.exists() && prefs.getInt("frontend_versao", -1) != -1) {
                File cop = new File(raiz, "data/pre-atualizacao-" + versao + ".sqlite");
                if (!cop.exists()) copiarFluxo(new java.io.FileInputStream(dbAtual), cop);
                File[] antigas = new File(raiz, "data").listFiles((d, n) -> n.startsWith("pre-atualizacao-"));
                if (antigas != null && antigas.length > 3) {
                    java.util.Arrays.sort(antigas, (x, y) -> Long.compare(x.lastModified(), y.lastModified()));
                    for (int k = 0; k < antigas.length - 3; k++) antigas[k].delete();
                }
            }
        } catch (Exception ignorado) { /* cópia é extra; não impede a atualização */ }
        apagar(new File(raiz, "public"));
        descompactarPublic(new File(raiz, "public"));
        // Banco inicial opcional: coloque app/src/main/assets/seed.sqlite antes de compilar.
        File db = new File(raiz, "data/database.sqlite");
        if (!db.exists()) {
            try (InputStream in = getAssets().open("seed.sqlite")) {
                db.getParentFile().mkdirs();
                copiarFluxo(in, db);
            } catch (IOException semSeed) { /* sem banco inicial: começa vazio */ }
        }
        prefs.edit().putInt("frontend_versao", versao).apply();
    }

    /** O frontend vai empacotado em assets/public.zip (poucos arquivos no repositório). */
    private void descompactarPublic(File destino) throws IOException {
        destino.mkdirs();
        String raizCanonica = destino.getCanonicalPath() + File.separator;
        try (java.util.zip.ZipInputStream zin = new java.util.zip.ZipInputStream(getAssets().open("public.zip"))) {
            java.util.zip.ZipEntry e;
            while ((e = zin.getNextEntry()) != null) {
                File alvo = new File(destino, e.getName());
                if (!alvo.getCanonicalPath().startsWith(raizCanonica)) continue; // proteção contra caminhos maliciosos
                if (e.isDirectory()) { alvo.mkdirs(); continue; }
                alvo.getParentFile().mkdirs();
                copiarFluxo(zin, alvo);
            }
        }
    }

    private static void copiarFluxo(InputStream in, File destino) throws IOException {
        try (FileOutputStream out = new FileOutputStream(destino)) {
            byte[] buf = new byte[16384]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
    }

    private static void apagar(File f) {
        File[] filhos = f.listFiles();
        if (filhos != null) for (File c : filhos) apagar(c);
        f.delete();
    }

    private void aguardarPorta() throws IOException, InterruptedException {
        for (int i = 0; i < 100; i++) {
            try (Socket sk = new Socket()) {
                sk.connect(new InetSocketAddress("127.0.0.1", PORTA), 200);
                return;
            } catch (IOException ainda) { Thread.sleep(100); }
        }
        throw new IOException("O servidor não respondeu na porta " + PORTA);
    }

    // =====================================================================
    // REDE
    // =====================================================================
    /** IP deste aparelho na rede local: Wi-Fi comum ou, se ele É o hotspot (roteador), o IP da interface do hotspot. */
    @SuppressWarnings("deprecation")
    private String ipWifi() {
        try {
            WifiManager w = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            if (w != null) {
                int ip = w.getConnectionInfo().getIpAddress();
                if (ip != 0) return Formatter.formatIpAddress(ip);
            }
        } catch (Exception e) { /* tenta as interfaces de rede */ }
        try {
            // Hotspot ligado: o celular é o roteador (normalmente 192.168.x.1) e o Wi-Fi "cliente" fica sem IP.
            for (java.net.NetworkInterface ni : java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                String n = ni.getName().toLowerCase();
                if (!(n.startsWith("ap") || n.startsWith("wlan") || n.startsWith("swlan") || n.startsWith("eth")
                        || n.startsWith("rndis") || n.startsWith("bt-pan"))) continue; // ignora dados móveis (rmnet*)
                for (java.net.InetAddress a : java.util.Collections.list(ni.getInetAddresses())) {
                    if (a instanceof java.net.Inet4Address && !a.isLoopbackAddress()) return a.getHostAddress();
                }
            }
        } catch (Exception e) { /* sem IP */ }
        return "?";
    }

    @SuppressWarnings("deprecation")
    private String ssidWifi() {
        try {
            WifiManager w = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            if (w == null) return "";
            WifiInfo info = w.getConnectionInfo();
            String s = info == null ? "" : String.valueOf(info.getSSID());
            return "<unknown ssid>".equals(s) ? "" : s;
        } catch (Exception e) { return ""; }
    }

    private boolean temWifi() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            NetworkCapabilities c = n == null ? null : cm.getNetworkCapabilities(n);
            return c != null && c.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
        } catch (Exception e) { return false; }
    }

    // =====================================================================
    // BOTÃO VOLTAR / CICLO DE VIDA
    // =====================================================================
    @Override public void onBackPressed() {
        // 1) a página fecha primeiro o que estiver aberto por cima (modal, menu, filtros...)
        web.evaluateJavascript("(function(){return !!(window.__voltarAndroid && window.__voltarAndroid());})()", r -> {
            if ("true".equals(r)) return;
            // 2) a página decide: volta uma tela; sem mais histórico vai ao Menu Principal; no Menu Principal abre o menu de saída
            web.evaluateJavascript("(function(){return window.__voltarPasso ? window.__voltarPasso() : 'nativo';})()", r2 -> {
                if (r2 != null && r2.contains("voltou")) return;
                if (r2 != null && r2.contains("nativo") && web.canGoBack()) { web.goBack(); return; }
                if (r2 != null && r2.contains("mesa") && web.canGoBack()) { web.goBack(); return; }
                mostrarMenuSaida();
            });
        });
    }


    private void reiniciarProcesso() {
        try {
            android.content.Intent i = new android.content.Intent(this, MainActivity.class);
            i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
            int fl = android.app.PendingIntent.FLAG_CANCEL_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(this, 77, i, fl);
            android.app.AlarmManager am = (android.app.AlarmManager) getSystemService(ALARM_SERVICE);
            am.set(android.app.AlarmManager.RTC, System.currentTimeMillis() + 700, pi);
        } catch (Exception e) { /* se falhar, o usuário reabre o app manualmente */ }
        salvarBackupAgora();
        finishAffinity();
        android.os.Process.killProcess(android.os.Process.myPid());
    }

    private void mostrarMenuSaida() {
        boolean rede = prefs.getBoolean("rede", false);
        String[] itens = { rede ? "Desativar acesso por outros aparelhos" : "Permitir outros aparelhos na rede (cozinha, QR Code)", "Sair do app" };
        new AlertDialog.Builder(this).setTitle("Comandas").setItems(itens, (d, qual) -> {
            if (qual == 0) {
                prefs.edit().putBoolean("rede", !rede).apply();
                String wifi = temWifi() ? "" : "\n\n⚠ O aparelho não está conectado a uma rede Wi-Fi.";
                new AlertDialog.Builder(this).setMessage(!rede
                    ? "Reinicie o app para valer. Depois, outros aparelhos acessam http://" + ipWifi() + ":" + PORTA
                      + "\n\nAtenção: este servidor não exige login para os dados. Use só em Wi-Fi de confiança." + wifi
                    : "Reinicie o app para valer.")
                    .setPositiveButton("Sair agora", (x, y) -> finishAffinity())
                    .setNegativeButton("Depois", null).show();
            } else finishAffinity();
        }).setNegativeButton("Cancelar", null).show();
    }

    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onPause() { if (web != null) web.onPause(); new Thread(this::salvarBackupAgora).start(); super.onPause(); }

    @Override protected void onDestroy() { super.onDestroy(); if (isFinishing()) { pararTunelCloudflare(); android.os.Process.killProcess(android.os.Process.myPid()); } }
}
