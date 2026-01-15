
---

# **🎯 SINAV DEĞERLENDİRME UYGULAMASI – GELİŞTİRME PROMPTU**

## **Genel Amaç**

**Daha önce geliştirilen ****optik form kodlama uygulaması** ile **aynı teknoloji yığını** kullanılarak,

optik okuyucudan gelen TXT verileri, yoklama listesi ve cevap anahtarlarını birleştirip **doğru–yanlış–boş analizli sınav sonuç raporu** üreten **masaüstü uygulama** geliştirilecektir.

📌 Referans proje (incelenecek):

👉 https://github.com/BeNKaYS/optik-form-app

---

## **Kullanılacak Teknolojiler**

* Electron (Windows + macOS derleme)
* React (sekmeli arayüz)
* Node.js
* Excel okuma/yazma (**xlsx**)
* TXT parsing (sabit kolon mantığı)
* Aynı state ve dosya yönetim mimarisi

---

## **Uygulama Arayüzü (Sekmeli Yapı)**

### **🟦 Sekme 1 – Yoklama Listesi (Excel)**

* **Kullanıcı ****ilk olarak bu dosyayı yüklemek zorunda**
* **Bu liste ****esas referans veri**
* Optik okuma hatalı olsa bile raporlama **mutlaka bu liste üzerinden** yapılacak

**Excel sütunları (örnek):**

* Ad Soyad
* TC No
* Salon No
* Belge Türü (**src**, **üdy**)
* Kitapçık Türü (varsa)
* Diğer idari alanlar

📌 TC No **primary key** olarak kullanılacak

---

### **🟦 Sekme 2 – Optik Okuyucu (TXT)**

* Optik okuyucudan gelen **.txt** dosyası yüklenir
* Sabit kolon mantığı ile parse edilir

**TXT Formatı (Sabit Alanlar):**

| **Karakter Aralığı** | **Açıklama**                    |
| ----------------------------- | --------------------------------------- |
| 0–22                         | Ad Soyad                                |
| 22–33                        | TC No                                   |
| 33–35                        | Salon No                                |
| 35–37                        | **G**→ Girmedi                   |
| 37–38                        | Kitapçık Türü (A / B)               |
| 38+                           | Aday cevapları (soru sayısına göre) |

**📌 Eşleştirme ****TC No üzerinden**

📌 Yoklama listesinde olup optikte olmayanlar → *Girmedi / Okunamadı*

---

### **🟦 Sekme 3 – Cevap Anahtarı (Excel)**

* Bakanlık tarafından verilen cevap anahtarı
* **Dinamik yapı** **:**
* Kitapçık türü sayısı artabilir
* Soru sayısı değişebilir

**Örnek Yapı:**

* Kitapçık Türü (A, B, C…)
* Soru No
* Doğru Cevap

Program:

* Adayın kitapçık türüne göre doğru anahtarı otomatik seçer

---

### **🟦 Sekme 4 – Değerlendirme & Sonuç**

* Tüm veriler yüklendikten sonra **“Değerlendir”** butonu aktif olur
* İşlem sırası:
  1. Yoklama listesi baz alınır
  2. TC No ile optik veriler eşleştirilir
  3. Kitapçık türüne göre cevap anahtarı seçilir
  4. Doğru / Yanlış / Boş hesaplanır
  5. Girmedi (G) olanlar ayrı işaretlenir

---

## **Değerlendirme Kuralları**

* **G** işareti varsa:
  * Aday sınava girmedi
  * Tüm sorular boş kabul edilir
* Optik verisi yok ama yoklama listesinde varsa:
  * “Okunamadı” olarak raporlanır
* Belge Türü (**src**, **üdy**):
  * Yoklama listesinden alınır
  * TC No’ya göre sonuçlara eklenir

---

## **📊 Çıktı Dosyası**

### **SonuçListesi.xlsx**

**Sütunlar:**

* Ad Soyad
* TC No
* Salon No
* Belge Türü
* Kitapçık Türü
* Doğru Sayısı
* Yanlış Sayısı
* Boş Sayısı
* Girdi / Girmedi
* Ham Cevaplar (isteğe bağlı)
* Değerlendirme Durumu (Normal / Okunamadı)

📌 Excel formatı dışa aktarılır

📌 Windows & macOS uyumlu

---

## **Ek Teknik Notlar**

* Uygulama modüler olacak (ileride optik form modülü ile birleştirilebilir)
* Dosya yüklenmeden değerlendirme başlatılamaz
* Hatalı dosya formatlarında kullanıcı uyarılır
* State yönetimi sade ve izlenebilir olacak

---

## **Hedef**

* Okullarda ve kurumlarda **gerçek kullanım**
* Manuel Excel işlemine gerek kalmadan **tek tuşla değerlendirme**
* Optik okuma hatalarına dayanıklı sistem

---

İstersen bir sonraki adımda:

* **🔹 ****UI wireframe**
* **🔹 ****React component ağacı**
* **🔹 ****TXT parse fonksiyonu**
* **🔹 ****Excel şablon örnekleri**
* **🔹 ****Değerlendirme algoritmasının pseudo-code’u**

hangisinden devam edeceğimizi söyle, gazı kökleyelim 🚀
