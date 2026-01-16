# 📖 Optik Değerlendirme Uygulaması - Kullanım Kılavuzu

Bu kılavuz, Optik Değerlendirme Uygulaması'nın tüm özelliklerini etkin bir şekilde kullanmanıza yardımcı olmak için hazırlanmıştır.

---

## 🚀 1. Başlangıç (Sınav Yönetimi)

Uygulamayı açtığınızda **Sınav Yönetimi** ekranı sizi karşılar.

### Yeni Sınav Başlatma
1.  **Sınav Adı** kutusuna sınavın ismini yazın (Örn: `SRC Sınavı Kızıltepe`).
2.  `BAŞLA` butonuna tıklayın.
3.  Uygulama otomatik olarak güncel tarihi (`_14_01_2024` gibi) isme ekler ve bir kayıt oluşturur.
4.  Sizi doğrudan veri giriş adımlarına yönlendirir.

### Kayıtlı Sınavları Yönetme
*   **Listeleme:** Daha önce kaydettiğiniz tüm sınavlar "Kayıtlı Sınavlar" listesinde görünür.
*   **Yükleme:** Yarım bıraktığınız veya incelemek istediğiniz bir sınava `📂 Yükle` butonu ile geri dönebilirsiniz.
*   **Silme:** `🗑️ Sil` butonu ile sınavı kalıcı olarak silebilirsiniz.
*   **Durum Rozetleri:** Listede hangi verilerin (Yoklama, Optik, Sonuç) yüklü olduğunu gösteren renkli rozetler bulunur.

---

## 📋 2. Yoklama Listesi Yükleme

Değerlendirme için ilk adım, sınava girecek adayların listesini yüklemektir.

1.  **Yoklama Listesi** sekmesine gidin.
2.  `Excel Seç` butonuna tıklayarak bilgisayarınızdaki `.xlsx` veya `.xls` dosyasını seçin.
3.  **Önemli:** Excel dosyanızda şu sütun başlıklarından en az biri bulunmalıdır:
    *   `TC Kimlik`, `TCNO`, `TC` (11 Haneli kimlik no için)
    *   `ADI SOYADI`, `AD SOYAD`
    *   `BELGE TÜRÜ` (Kitapçık türünü eşleştirmek için kritiktir: SRC1, ÜDY3 vb.)
    *   `SALON NO` (İsteğe bağlı, raporları gruplamak için)
4.  Yükleme başarılı olduğunda liste ekranda görüntülenir.

---

## 👁️ 3. Optik Veri Yükleme ve Ayarlama

Optik okuyucudan alınan ham metin verilerini işler.

1.  **Optik Veri** sekmesine gidin.
2.  `Dosya Seç` butonu ile `.txt` veya `.fmt` uzantılı dosyanızı yükleyin.
3.  **Parser Ayarları:** Sağ paneldeki ayarlar, metin dosyasındaki verilerin konumlarını belirler.
    *   **Başlangıç (Start):** Verinin kaçıncı karakterden başladığı (0'dan başlar).
    *   **Uzunluk (Length):** Verinin kaç karakter sürdüğü.
    *   *Örnek: TC No 0. karakterden başlayıp 11 karakter sürüyorsa -> Başlangıç: 0, Uzunluk: 11.*
4.  Ayarları değiştirdiğinizde `Uygula` butonuna basarak önizlemeyi güncelleyin.
5.  Ayarlarınızı `Ayarları Kaydet` butonu ile saklayabilir, daha sonra `Ayarları Yükle` ile geri çağırabilirsiniz.

---

## 🔑 4. Cevap Anahtarı (Excel)

Sistemin doğru/yanlış hesaplaması için cevap anahtarına ihtiyacı vardır.

1.  **Cevap Anahtarı** sekmesine gidin.
2.  `Excel Seç` butonu ile cevap anahtarı dosyasını yükleyin.
3.  **Dosya Formatı:**
    *   Excel dosyasının **Sayfa İsimleri (Sheet Names)** kitapçık türü olmalıdır (Örn: `A`, `B`).
    *   Sütun başlıkları belge türü olmalıdır (Örn: `SRC1`, `SRC2`).
    *   Altında `Soru No` ve `Cevap` verileri bulunmalıdır.

---

## ⚖️ 5. Değerlendirme ve Sonuç

Tüm veriler hazır olduğunda (Yoklama, Optik, Anahtar):

1.  **Değerlendirme** sekmesine gidin.
2.  Durum kartlarında tüm verilerin "Hazır" (Yeşil) olduğunu kontrol edin.
3.  `DEĞERLENDİR` butonuna tıklayın.
4.  Sistem saniyeler içinde sonuçları hesaplar.
    *   Doğru, Yanlış, Boş sayıları.
    *   Puan (Her soru 2.5 puan).
    *   Sonuç (70 ve üzeri Başarılı).
5.  **Filtreleme:** Sonuç tablosunun üzerindeki butonlardan **Salon** bazlı filtreleme yapabilirsiniz.

### Rapor Alma (Excel)
*   `📥 Excel Olarak İndir` butonuna tıklayın.
*   Sistem, resmi formatta, imzalı, renkli ve salonlara göre sayfalara ayrılmış profesyonel bir Excel raporu oluşturur.

---

## 📊 6. İstatistikler

Sınav sonuçlarının detaylı analizini sunar.

*   **Son Sınav Analizi:** Belge türlerine (SRC1, ÜDY vb.) göre başarı oranları, ortalamalar, en yüksek/düşük puanlar.
*   **Toplam Satırı:** Sınavın genel başarı tablosu.
*   **Geçmiş Karşılaştırması:** Kayıtlı son N sınavın başarı ve ortalama grafiklerini karşılaştırır. Trend takibi sağlar.
*   **Yazdırma:** Sağ üstteki `🖨️ PDF / Yazdır` butonu ile temiz bir çıktı alabilirsiniz.

---

## 👨‍💻 Geliştirici

**Designed & Developed by Sercan ÖZDEMİR (BeNKaYS)**

*Sorularınız ve destek için:* `sercanozdemir@yandex.com`
