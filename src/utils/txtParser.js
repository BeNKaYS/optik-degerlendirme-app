/**
 * @file txtParser.js
 * @description Optik okuyucudan alınan ham TXT/FMT verilerini parse eden modül.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

/**
 * Ham metin verisini yapılandırılmış JSON dizisine çevirir.
 * 
 * @param {string} text - Okunan ham dosya içeriği
 * @param {Object} config - Parse ayarları (başlangıç, uzunluk)
 * @returns {Array} - Parse edilmiş veri satırları
 */
export const parseOpticalData = (text, config = null) => {
    // Varsayılan Konfigürasyon (Eğer config null gelirse)
    const defaults = {
        sira: { start: 0, length: 0 }, // 0 uzunluk = Otomatik (Dosya satır no)
        adSoyad: { start: 0, length: 22 },
        tcNo: { start: 22, length: 11 },
        salonNo: { start: 33, length: 2 },
        girmedi: { start: 35, length: 1 }, // Düzeltildi: 1 karakter
        kitapcik: { start: 36, length: 1 }, // Düzeltildi: 36'dan başlıyor
        cevaplar: { start: 37, length: null } // null = Satır sonuna kadar (Düzeltildi: 37'den başlıyor)
    };

    const cfg = config || defaults;

    // Satır satır böl ve boş satırları at
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);

    return lines.map((line, index) => {

        // Yardımcı: Belirtilen alanı extract et
        const extract = (key) => {
            const setting = cfg[key];
            if (!setting) return '';

            const start = parseInt(setting.start) || 0;
            const len = setting.length;

            // Özel Durum: Cevaplar (Length yoksa sonuna kadar al)
            if (key === 'cevaplar' && (len === null || len === undefined || len === '')) {
                return line.substring(start).trim();
            }

            // Length'i sayıya çevir - string olabilir!
            const parsedLen = parseInt(len);
            if (isNaN(parsedLen) || parsedLen <= 0) return ''; // Uzunluk yoksa boş dön

            let extractedVal = line.substring(start, start + parsedLen).trim();

            // Karakter Seti Filtreleme
            const charset = setting.charset;
            if (charset && charset.trim().length > 0) {
                const allowedSet = new Set();
                if (charset.includes(',')) {
                    // Virgülle ayrılmışsa (örn: A,B,C)
                    charset.split(',').forEach(c => allowedSet.add(c.trim()));
                } else {
                    // Bitişikse (örn: 0123456789)
                    charset.split('').forEach(c => allowedSet.add(c));
                }

                // Sadece izin verilen karakterleri filtrele
                // Boşluk karakteri charset içinde yoksa silinir!
                extractedVal = extractedVal.split('').filter(char => allowedSet.has(char)).join('');
            }

            return extractedVal;
        };

        const siraVal = extract('sira');

        return {
            id: siraVal || (index + 1), // Eğer dosyalda sıra alanı yoksa satır numarasını ver
            adSoyad: extract('adSoyad'),
            tcNo: extract('tcNo'),
            salonNo: extract('salonNo'),
            girmediDurumu: extract('girmedi'),
            kitapcikTuru: extract('kitapcik'),
            ogrenciCevaplari: extract('cevaplar')
        };
    });
};
