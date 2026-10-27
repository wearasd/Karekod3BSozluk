# TeknoSöz 3B

MEB proje çalışması için hazırlanan mobil öncelikli, QR kodlu ve 3B teknoloji sözlüğü.

## Özellikler

- Sekiz teknolojik araç için Türkçe sözlük maddeleri
- Sekiz adet web için optimize edilmiş gerçek GLB model
- Android Scene Viewer, WebXR ve iOS Quick Look destekli gerçek AR modu
- QR kod okuyucu ve her maddeye özel indirilebilir QR kod
- Sesli okuma, paylaşma ve yazdırma
- PWA olarak telefona kurulabilme ve çevrimdışı kullanım
- Capacitor yapılandırmasıyla Android APK'ye dönüştürmeye hazır yapı

3B modeller 3DAssets.dev üzerinden alınan CC0 1.0 varlıklardır ve uygulamayla birlikte yerel olarak sunulur. Ayrıntılı kaynak listesi `MODEL-LICENSES.md` dosyasındadır.

## Yerel çalıştırma

Statik bir sunucu ile `dist` klasörünü yayınlayın:

```powershell
npx.cmd serve dist
```

Kamera özellikleri `localhost` veya HTTPS üzerinde çalışır.

## QR kodları

Bağımlılıkları yükledikten sonra hedef site adresini vererek QR kodlarını yeniden oluşturabilirsiniz:

```powershell
$env:TEKNO_BASE_URL="https://ornek-site.com/"
npm.cmd run qr
```

## Android APK

İkinci aşamada Capacitor paketleri eklenerek aynı `dist` klasörü Android projesine aktarılabilir. `capacitor.config.json` hazırdır.
