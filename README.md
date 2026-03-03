# 🎓 SARA - Sınav Analiz ve Raporlama Uygulaması

<p align="center">
    <img src="https://img.shields.io/badge/version-1.6.4-blue.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge" />
  <img src="https://img.shields.io/badge/status-active-success.svg?style=for-the-badge" />
</p>

Modern, kullanıcı dostu ve kapsamlı bir sınav analiz, değerlendirme ve raporlama yazılımı. Öğretmenler ve okul idarecileri için özel olarak geliştirilmiştir. **Electron** ve **React** teknolojileri ile masaüstü performansı sunar.

---

## 📋 İçindekiler

- [Öne Çıkan Özellikler](#-öne-çıkan-özellikler)
- [Teknoloji Yığını](#-teknoloji-yığını)
- [Kurulum ve Çalıştırma](#-kurulum-ve-çalıştırma)
- [Proje Yapısı](#-proje-yapısı)
- [Kullanım Akışı](#-kullanım-akışı)
- [Sürüm Geçmişi](#-sürüm-geçmişi)
- [Geliştirici](#-geliştirici-kartı)
- [Lisans](#-lisans)

---

## 🌟 Öne Çıkan Özellikler

### 📊 Değerlendirme ve Analiz
- **Akıllı Optik Okuma:** `.txt` ve `.fmt` formatındaki ham optik verileri otomatik işler.
- **Dinamik Parser:** Veri başlangıç ve uzunluk ayarları (Start/Length) kullanıcı arayüzünden sürükle-bırak hassasiyetinde ayarlanabilir.
- **Karakter Seti Filtreleme:** Kirli verileri (TR karakter sorunları vb.) otomatik temizler ve düzeltir.
- **Detaylı Sonuç:** Soru bazlı analiz, net hesaplama ve 100 üzerinden puanlama.

### 🕵️‍♂️ Kopya ve İhlal Analizi
- **Çapraz Kontrol:** Sınıf içindeki tüm öğrencilerin cevaplarını birbirleriyle karşılaştırır.
- **Benzerlik Skoru:** Şüpheli derecede benzer kağıtları (örn: %90+ eşleşme) tespit eder.
- **Görsel Rapor:** Kopya ihtimali olan kağıtları yan yana gösterir.

### 📈 Raporlama ve Çıktı
- **Excel Export:** Sonuçları resmi formatta, imzalı ve salonlara ayrılmış Excel dosyası olarak indirir.
- **PDF Desteği:** İstatistik sayfalarını ve grafiklerini tek tıkla PDF'e dönüştürür.
- **İstatistik Grafikleri:** Başarı trendleri, ortalama puanlar ve belge türü dağılımları.

### 🧩 Cevap Anahtarı ve Manuel Giriş
- **Manuel Cevap Girişi:** Excel dosyası olmadan belge türü bazlı A/B kitapçığı cevapları tek satır metin kutularından girilebilir.
- **Canlı Sayaç:** Her kutuda `Cevap: X/N` ve `CEVAP: Y` (imleç bazlı pozisyon) bilgisi gösterilir.
- **Esnek Parse:** `A-E` veya `1-5` formatı otomatik tanınır ve standart cevap anahtarına dönüştürülür.

### 🎨 Kullanıcı Deneyimi
- **Koyu/Açık Tema:** Göz yormayan koyu mod desteği.
- **Güvenli Depolama:** Sınav verileri kullanıcının `AppData` klasöründe güvenli şekilde saklanır.
- **Kalıcı Veri:** Optik veri ve sınav ayarları aktif sınava otomatik kaydedilir; uygulama yeniden başlatıldığında korunur.
- **Hızlı Erişim:** Kısayollar (F1 Yardım, Ctrl+R Yenile, Ctrl+Shift+R Zorla Yenile).

---

## 💻 Teknoloji Yığını

| Alan | Teknoloji | Açıklama |
|------|-----------|----------|
| **Core** | ![Electron](https://img.shields.io/badge/Electron-Latest-blue) | Masaüstü uygulama çatısı |
| **Frontend** | ![React](https://img.shields.io/badge/React-19-61DAFB) | Kullanıcı arayüzü kütüphanesi |
| **Build** | ![Vite](https://img.shields.io/badge/Vite-5.0-purple) | Hızlı geliştirme ve derleme aracı |
| **Data** | ![XLSX](https://img.shields.io/badge/SheetJS-XLSX-green) | Excel okuma/yazma işlemleri |
| **Styling** | ![CSS3](https://img.shields.io/badge/CSS3-Modern-blue) | CSS Grid/Flexbox ve Değişkenler |

---

## 🛠 Kurulum ve Çalıştırma

Geliştirme ortamını kurmak için aşağıdaki adımları izleyin.

### Gereksinimler
- **Node.js**: v18.0.0 veya üzeri önerilir.
- **Git**: Versiyon kontrolü için.

### Adım Adım Kurulum

1.  **Repoyu Klonlayın:**
    ```bash
    git clone https://github.com/BeNKaYS/sara-sinav-analiz-ve-raporlama-uygulamasi.git
    cd sara-sinav-analiz-ve-raporlama-uygulamasi
    ```

2.  **Bağımlılıkları Yükleyin:**
    ```bash
    npm install
    ```

3.  **Uygulamayı Başlatın (Dev Mode):**
    ```bash
    npm run dev
    ```
    *Bu komut hem Vite sunucusunu hem de Electron pencresini eş zamanlı başlatır.*

4.  **Uygulamayı Derleyin (Build):**
    ```bash
    npm run build
    ```
    *`dist` klasörüne setup dosyasını oluşturur.*

---

## 📁 Proje Yapısı

```
optik-degerlendirme-app/
├── electron/               # Electron ana süreç dosyaları
│   ├── main.cjs            # Main Process (Pencere, IO, IPC)
│   └── preload.cjs         # Preload Script (Güvenli Köprü)
├── src/                    # React Kaynak Kodları
│   ├── components/         # UI Bileşenleri (Tablar, Modallar)
│   ├── utils/              # Yardımcı Fonksiyonlar (Parser, Hesaplama)
│   ├── App.jsx             # Ana Uygulama Mantığı
│   └── main.jsx            # React Giriş Noktası
├── public/                 # Statik Dosyalar (İkonlar)
├── KULLANIM_KILAVUZU.md    # Detaylı Yardım Dokümanı
└── package.json            # Proje Konfigürasyonu
```

---

## 🚀 Kullanım Akışı

1.  **Sınav Oluşturma:** Yeni bir isim vererek sınava başlayın.
2.  **Yoklama Listesi:** Excel formatındaki öğrenci listesini yükleyin.
3.  **Optik Veri:** Okuyucudan gelen TXT dosyasını yükleyin ve parser ayarlarını yapın.
4.  **Cevap Anahtarı:** Doğru cevapları içeren Excel dosyasını sisteme tanıtın.
5.  **Değerlendirme:** Tek tıkla sınavı okuyun, analiz edin ve sonuçları görün.
6.  **Raporlama:** İster Excel olarak indirin, ister istatistik ekranından grafiklerin çıktısını alın.

---

## 📜 Sürüm Geçmişi

### v1.6.4 (Güncel)
- ✨ **Yeni:** Cevap anahtarında manuel giriş paneli (belge türü bazlı A/B metin kutuları).
- ✨ **Yeni:** Manuel girişte canlı sayaç ve imleç bazlı cevap pozisyon göstergesi.
- ✨ **Yeni:** Durum çubuğuna lisans süresi, aktif sınav geçme notu ve değerlendirme belgeleri kontrolü eklendi.
- 🔄 **İyileştirme:** Optik satır haritası hizalama ve seçim görünürlüğü geliştirildi.
- 🛡️ **Teknik:** Menü kapalı modda `Ctrl+R` / `Ctrl+Shift+R` global kısayolları eklendi.

### v1.6.0
- ✨ **Yeni:** FMT Düzenleyici entegrasyonu (Görsel editör ve ASCII önizleme).
- 🐛 **Düzeltme:** Başarı oranı hesaplama mantığı güncellendi (Sınava girenler -> Okunan veri).
- 🎨 **Geliştirme:** Ruler ve Grid hizalaması optimize edildi (130 karakter sabitleme).

### v1.5.0
- ✨ **Yeni:** Zengin içerikli Yardım Menüsü ve Kullanım Kılavuzu entegrasyonu.
- 🐛 **Düzeltme:** İstatistik tablosundaki veri eşleştirme hatası giderildi.
- 🎨 **Geliştirme:** Tablo görünümleri ve ikon setleri yenilendi.

### v1.4.0

### v1.3.0
- ✨ **Yeni:** Kopya analiz algoritması eklendi.
- ✨ **Yeni:** Koyu tema (Dark Mode) desteği.

---

## 👨‍💻 Geliştirici Kartı

<div align="center">

```
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
```

# Sercan ÖZDEMİR
**`BeNKaYS`**

*Bilişim Teknolojileri Öğretmeni · Makine Öğrenmesi · C++*

<br>

[![Mail](https://img.shields.io/badge/sercanozdemir@yandex.com-000000?style=flat-square&logo=mail.ru&logoColor=white)](mailto:sercanozdemir@yandex.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=flat-square&logo=whatsapp&logoColor=white)](https://wa.me/905068858585?text=Merhaba%20bilgi%20almak%20istiyorum)

```
▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀
```

</div>

<br>

## Hakkımda

Yazılım geliştirmede iki yönü birlikte taşıyorum: bir yanda **analitik düşünce** ve mühendislik disiplini, diğer yanda **yaratıcı tasarım** ve öğretici anlatım. Özellikle **C++**, **algoritmalar** ve **Makine Öğrenmesi** odaklı projelerde; karmaşık problemleri sade, anlaşılır ve uygulanabilir çözümlere dönüştürmeyi hedefliyorum.

> *"Analiz ederim, sadeleştiririm, öğretirim."*

<br>

## Teknoloji Yığını

<div align="center">

| Alan | Teknolojiler |
|------|-------------|
| **Diller** | C++ · Python |
| **Makine Öğrenmesi** | Temel modeller · Veri işleme · OpenCV |
| **Araçlar** | Git · Linux · VSCode |

</div>

<br>

## Odak Alanlarım

```
┌─────────────────────────────────────────────────┐
│  🧠  Makine Öğrenmesi  ───────────── [ ████░ ]  │
│  ⚙️  C++ & OOP         ───────────── [ █████ ]  │
│  📐  Algoritma Tasarımı ──────────── [ ████░ ]  │
│  📚  Eğitim Odaklı Dev  ──────────── [ █████ ]  │
└─────────────────────────────────────────────────┘
```

<br>

## İletişim

Proje iş birlikleri veya sorularınız için:

- 📧 [sercanozdemir@yandex.com](mailto:sercanozdemir@yandex.com)
- 💬 [WhatsApp'tan hızlı ulaşın](https://wa.me/905068858585?text=Merhaba%20bilgi%20almak%20istiyorum)

<br>

<div align="center">

*Gündüz sınıf, gece terminal.*

![](https://komarev.com/ghpvc/?username=BeNKaYS&style=flat-square&color=555555)

</div>

---

## 📝 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Eğitim ve kişisel gelişim amaçlı kullanıma açıktır.

Copyright © 2026 - [Sercan ÖZDEMİR](https://github.com/BeNKaYS)
