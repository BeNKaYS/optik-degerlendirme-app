# 📝 Değişiklik Günlüğü (Changelog)

Projeye yapılan tüm önemli değişikliklerin kronolojik listesi.

---

## [1.4.0] - 2026-01-15 - TC Doğrulama ve Veri Güvenliği

### ✨ Yeni Özellikler
- **TC Kimlik Doğrulama:** Optik verilerde TC'nin tam 11 hane olması zorunlu
- **Tam Eşleşme Kontrolü:** Yoklama listesi karşılaştırmasında sadece birebir eşleşme kabul ediliyor
- **Manuel Cevap Anahtarı Düzenleme:** "Düzenle" butonu ile cevap anahtarı hücreleri manuel düzenlenebilir
- **Türkçe Karakter Desteği:** TXT dosyalarında Windows-1254 encoding otomatik algılama
- **Güvenli Veri Saklama:** Sınav verileri AppData klasöründe gizli konumda saklanıyor

### 🎨 UI İyileştirmeleri
- **Kompakt Tasarım:** Uygulama genelinde padding azaltıldı
- **AnswerKeyTab Yeniden Tasarım:** CSS değişkenleri ile tema uyumu sağlandı
- **Geçersiz TC Uyarısı:** Sarı/turuncu renkle vurgulanmış geçersiz TC gösterimi

### 🐛 Düzeltilen Hatalar
- StatsTab.jsx'teki merge conflict düzeltildi
- İstatistik sayfasında getExamById ile tam veri yükleme
- Cevap anahtarı per-exam bazlı doğru kaydediliyor

### 🔧 Teknik Değişiklikler
- `getExamsDir()` artık `app.getPath('userData')` kullanıyor
- `read-file-text` IPC handler'ı çoklu encoding desteği ile güncellendi
- `getStudentStatus()` tam eşleşme (===) kullanıyor

### 📁 Veri Depolama Konumu
- **Eski:** `<proje>/oldexams/` veya `<exe>/oldexams/`
- **Yeni:** `%APPDATA%\optik-degerlendirme-app\exams\`

---

## [1.3.0] - 2026-01-14 - UI Okunabilirlik ve Icon İyileştirmeleri

### ✨ Yeni Özellikler
- Uygulama için özel icon tasarlandı ve entegre edildi
- Modern gradient (mavi-cyan) tasarım
- Optik form temalı profesyonel icon

### 🎨 UI İyileştirmeleri
- **Kapsamlı Light Mode Renk Düzeltmeleri (11 Bileşen)**
  - AttendanceTab - Yoklama listesi tablosu
  - AnswerKeyTab - Cevap anahtarı grid sistemi
  - ExamsTab - Sınav yönetim ekranı
  - OpticalTab - Optik veri yükleme ve ayarlar
  - StatsTab - İstatistik grafikleri ve tabloları
  - EvaluationTab - Değerlendirme sonuç tablosu
  - CheatingReport - Kopya analiz raporu
  - CheatingModal - Kopya modal penceresi
  - ExamSelectionModal - Sınav seçim modalı
  - HelpModal - Kullanım kılavuzu
  - AboutTab - Hakkında bilgileri

### 🐛 Düzeltilen Hatalar
- Tüm tablo başlıklarının light mode'da okunabilir olması
- Input alanlarının beyaz arka planda görünür olması
- Modal pencerelerdeki metin kontrastı düzeltildi
- Grafik etiketlerinin okunabilirliği artırıldı

### 🔧 Teknik Değişiklikler
- `index.css` - Light mode CSS değişkenleri eklendi
- `App.jsx` - Varsayılan tema dark → light değiştirildi
- Her bileşene `.light-mode` CSS sınıfı stilleri eklendi
- `electron/main.cjs` - Uygulama icon yolu ayarlandı
- `public/icon.png` - Yeni uygulama ikonu eklendi

---

## [Önceki Geliştirmeler]

### Ana Uygulama Özellikleri
- Yoklama listesi yönetimi
- Cevap anahtarı editörü
- Optik okuyucu veri işleme
- Otomatik değerlendirme sistemi
- İstatistik ve trend analizi
- Kopya tespit algoritması
- Excel ve PDF dışa aktarma

---

**Güncelleme Tarihleri:**
- Son güncelleme: 2026-01-15
- Başlangıç: 2024
