---
# **?? SINAV DEÐERLENDÝRME UYGULAMASI – GELÝÞTÝRME PROMPTU**

## **Genel Amaç**

**Daha önce geliþtirilen ****optik form kodlama uygulamasý** ile **ayný teknoloji yýðýný** kullanýlarak,

optik okuyucudan gelen TXT verileri, yoklama listesi ve cevap anahtarlarýný birleþtirip **doðru–yanlýþ–boþ analizli sýnav sonuç raporu** üreten **masaüstü uygulama** geliþtirilecektir.

?? Referans proje (incelenecek):

?? https://github.com/BeNKaYS/optik-form-app
---
## **Kullanýlacak Teknolojiler**

* Electron (Windows + macOS derleme)
* React (sekmeli arayüz)
* Node.js
* Excel okuma/yazma (**xlsx**)
* TXT parsing (sabit kolon mantýðý)
* Ayný state ve dosya yönetim mimarisi

---

## **Uygulama Arayüzü (Sekmeli Yapý)**

### **?? Sekme 1 – Yoklama Listesi (Excel)**

* **Kullanýcý ****ilk olarak bu dosyayý yüklemek zorunda**
* **Bu liste ****esas referans veri**
* Optik okuma hatalý olsa bile raporlama **mutlaka bu liste üzerinden** yapýlacak

**Excel sütunlarý (örnek):**

* Ad Soyad
* TC No
* Salon No
* Belge Türü (**src**, **üdy**)
* Kitapçýk Türü (varsa)
* Diðer idari alanlar

?? TC No **primary key** olarak kullanýlacak

---

### **?? Sekme 2 – Optik Okuyucu (TXT)**

* Optik okuyucudan gelen **.txt** dosyasý yüklenir
* Sabit kolon mantýðý ile parse edilir

**TXT Formatý (Sabit Alanlar):**

| **Karakter Aralýðý** | **Açýklama**                    |
| ----------------------------- | --------------------------------------- |
| 0–22                         | Ad Soyad                                |
| 22–33                        | TC No                                   |
| 33–35                        | Salon No                                |
| 35–37                        | **G**? Girmedi                   |
| 37–38                        | Kitapçýk Türü (A / B)               |
| 38+                           | Aday cevaplarý (soru sayýsýna göre) |

**?? Eþleþtirme ****TC No üzerinden**

?? Yoklama listesinde olup optikte olmayanlar ? *Girmedi / Okunamadý*

---

### **?? Sekme 3 – Cevap Anahtarý (Excel)**

* Bakanlýk tarafýndan verilen cevap anahtarý
* **Dinamik yapý** **:**
* Kitapçýk türü sayýsý artabilir
* Soru sayýsý deðiþebilir

**Örnek Yapý:**

* Kitapçýk Türü (A, B, C…)
* Soru No
* Doðru Cevap

Program:

* Adayýn kitapçýk türüne göre doðru anahtarý otomatik seçer

---

### **?? Sekme 4 – Deðerlendirme & Sonuç**

* Tüm veriler yüklendikten sonra **“Deðerlendir”** butonu aktif olur
* Ýþlem sýrasý:
  1. Yoklama listesi baz alýnýr
  2. TC No ile optik veriler eþleþtirilir
  3. Kitapçýk türüne göre cevap anahtarý seçilir
  4. Doðru / Yanlýþ / Boþ hesaplanýr
  5. Girmedi (G) olanlar ayrý iþaretlenir

---

## **Deðerlendirme Kurallarý**

* **G** iþareti varsa:
  * Aday sýnava girmedi
  * Tüm sorular boþ kabul edilir
* Optik verisi yok ama yoklama listesinde varsa:
  * “Okunamadý” olarak raporlanýr
* Belge Türü (**src**, **üdy**):
  * Yoklama listesinden alýnýr
  * TC No’ya göre sonuçlara eklenir

---

## **?? Çýktý Dosyasý**

### **SonuçListesi.xlsx**

**Sütunlar:**

* Ad Soyad
* TC No
* Salon No
* Belge Türü
* Kitapçýk Türü
* Doðru Sayýsý
* Yanlýþ Sayýsý
* Boþ Sayýsý
* Girdi / Girmedi
* Ham Cevaplar (isteðe baðlý)
* Deðerlendirme Durumu (Normal / Okunamadý)

?? Excel formatý dýþa aktarýlýr

?? Windows & macOS uyumlu

---

## **Ek Teknik Notlar**

* Uygulama modüler olacak (ileride optik form modülü ile birleþtirilebilir)
* Dosya yüklenmeden deðerlendirme baþlatýlamaz
* Hatalý dosya formatlarýnda kullanýcý uyarýlýr
* State yönetimi sade ve izlenebilir olacak

---

## **Hedef**

* Okullarda ve kurumlarda **gerçek kullaným**
* Manuel Excel iþlemine gerek kalmadan **tek tuþla deðerlendirme**
* Optik okuma hatalarýna dayanýklý sistem

---

Ýstersen bir sonraki adýmda:

* **?? ****UI wireframe**
* **?? ****React component aðacý**
* **?? ****TXT parse fonksiyonu**
* **?? ****Excel þablon örnekleri**
* **?? ****Deðerlendirme algoritmasýnýn pseudo-code’u**




hangisinden devam edeceðimizi söyle, gazý kökleyelim ??
