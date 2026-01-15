# 🎓 Optik Form Değerlendirme Uygulaması

Modern, kullanıcı dostu ve kapsamlı bir sınav değerlendirme, analiz ve raporlama yazılımı. Öğretmenler ve okul idarecileri için özel olarak geliştirilmiştir.

![Versiyon](https://img.shields.io/badge/version-1.4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![Lisans](https://img.shields.io/badge/license-MIT-green.svg)

## 🌟 Öne Çıkan Özellikler

### 📊 Değerlendirme ve Analiz
- **Akıllı Optik Okuma:** `.txt` ve `.fmt` formatındaki ham optik verileri otomatik işler
- **Türkçe Karakter Desteği:** Windows-1254, ISO-8859-9 ve UTF-8 encoding otomatik algılama
- **TC Kimlik Doğrulama:** 11 haneli TC kontrolü ve tam eşleşme validasyonu
- **Esnek Ayrıştırma:** Ad, Soyad, TC, Salon ve Cevap pozisyonları özelleştirilebilir
- **Detaylı Sınav Sonuçları:**
  - Doğru/Yanlış/Boş/Net sayıları
  - Puan hesaplama (100 üzerinden)
  - Başarı durumu ve renklendirilmiş göstergeler

### 🕵️‍♂️ Kopya ve İhlal Analizi
- **İstatistiksel Algoritma:** Aynı sınıftaki öğrencilerin cevap kağıtlarını çapraz analiz eder
- **Şüpheli Durum Tespiti:** Yüksek benzerlik oranına sahip kağıtları otomatik belirler
- **Kanıt Sunumu:** "Benzer Doğru" ve "Benzer Yanlış" sayılarını detaylı raporlar

### 📈 İstatistik ve Raporlama
- **Excel Dışa Aktarım:** Salon listeleri, başarı listeleri, analiz raporları
- **Görsel Grafikler:** Sınav başarı trendleri ve belge türü dağılımları
- **Geçmiş Sınav Arşivi:** Güvenli AppData konumunda tarihçeli saklama

### 🎨 Modern Arayüz
- **Koyu ve Açık Tema:** Göz yormayan koyu mod ve baskı dostu açık mod
- **Kompakt Tasarım:** Optimize edilmiş padding ve alan kullanımı
- **Manuel Düzenleme:** Cevap anahtarı hücrelerini doğrudan düzenleme

---

## 🛠 Kurulum ve Çalıştırma

Bu proje **Electron** ve **React** kullanılarak geliştirilmiştir.

### Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn

### Geliştirme Modunda Çalıştırma

```bash
# Bağımlılıkları yükleyin
npm install

# Uygulamayı başlatın (Vite + Electron)
npm run dev
```

### Üretime Hazır Derleme (Build)

```bash
npm run build
```

---

## 👨‍💻 Geliştirici

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=24&pause=1000&color=25D366&center=true&vCenter=true&width=520&lines=Makine+%C3%96%C4%9Frenmesi+%26+C%2B%2B+Tutkunu;Bili%C5%9Fim+Teknolojileri+%C3%96%C4%9Fretmeni;Kod+Yazar%2C+Anlat%C4%B1r%2C+%C3%96%C4%9Fretirim" />
</p>

### Sercan ÖZDEMİR  
`BeNKaYS` | Bilişim Teknolojileri Öğretmeni  
**Makine Öğrenmesi & C++ Tutkunu**

> _"Kod sadece çalışmamalı, anlaşılmalı."_

### 🧩 Uzmanlık Alanları
- 🧠 Makine Öğrenmesi
- ⚙️ C++ (OOP, performans)
- 🖥️ Algoritma & Mantıksal Tasarım
- 📚 Eğitim Odaklı Yazılım

### 📲 İletişim
- 📧 **E-posta:** sercanozdemir@yandex.com  
- 💬 **WhatsApp:** [Hızlı Mesaj Gönder](https://wa.me/905068858585?text=Merhaba%20bilgi%20almak%20istiyorum)

<p align="left">
  <img src="https://skillicons.dev/icons?i=cpp,python,git,linux,opencv,vscode&theme=light" />
</p>

---

## 📁 Proje Seyir Defteri

Projenin gelişim sürecini takip etmek için [`seyir-defteri`](./seyir-defteri) klasörüne bakabilirsiniz.

**Son Güncelleme:** 2026-01-15
- [Değişiklik Geçmişi](./seyir-defteri/CHANGELOG.md)
- [UI İyileştirmeleri](./seyir-defteri/2026-01-14-ui-improvements.md)
- [Teknik Detaylar](./seyir-defteri/2026-01-14-technical-details.md)

---

## 🎨 v1.4.0 Güncellemeleri (2026-01-15)

### ✨ Yeni Özellikler
- 🔐 **TC Kimlik Doğrulama:** 11 hane kontrolü ve tam eşleşme
- 🇹🇷 **Türkçe Karakter Desteği:** TXT dosyalarında otomatik encoding algılama
- ✏️ **Manuel Düzenleme:** Cevap anahtarı hücrelerini düzenleme butonu
- 📁 **Güvenli Depolama:** Veriler AppData'da gizli konumda saklanıyor

### 🔧 Teknik İyileştirmeler
- Kompakt UI tasarımı (padding optimizasyonu)
- AnswerKeyTab tema uyumu
- İstatistik sayfası veri yükleme düzeltmesi

---

## 📝 Lisans

Bu proje MIT lisansı altında dağıtılmaktadır. Eğitim amaçlı kullanıma uygundur.

---

*v1.4.0 - 2026-01-15 - Tüm Hakları Saklıdır.*
