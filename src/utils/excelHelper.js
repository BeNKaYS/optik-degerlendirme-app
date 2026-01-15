/**
 * @file excelHelper.js
 * @description Excel dosyalarını okuma (import) ve stilize ederek kaydetme (export) işlemlerini yönetir.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import XLSX from 'xlsx-js-style';

// ==========================================
//  OKUMA (IMPORT) FONKSİYONLARI
// ==========================================

/**
 * Standart bir Excel dosyasının ilk sayfasını JSON array olarak okur.
 * Yoklama listeleri için kullanılır.
 */
export const readExcel = async (path) => {
    try {
        if (!window.api) return null;
        const buffer = await window.api.readFileBuffer(path);
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (error) {
        console.error("Excel reading error:", error);
        throw error;
    }
};

/**
 * Cevap anahtarı formatına özel okuma yapar.
 * Beklenen Format:
 * - Sayfa isimleri Kitapçık Türü olmalıdır (A, B).
 * - Sütun başlıkları Belge Türü (SRC1, ÜDY3) olmalıdır.
 * - Yapı: [Soru No, Cevap, Soru No, Cevap...] şeklinde matris olabilir.
 */
export const readAnswerKeyExcel = async (path) => {
    try {
        if (!window.api) return null;
        const buffer = await window.api.readFileBuffer(path);
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Yapı: { "A": { "ÜDY3": { 1: "A", ... }, "SRC1": ... }, "B": ... }
        const parsedKey = {};

        workbook.SheetNames.forEach(sheetName => {
            // Kitapçık adı = Sheet Name (A, B...)
            const booklet = sheetName.trim().toUpperCase();
            parsedKey[booklet] = {};

            const sheet = workbook.Sheets[sheetName];
            // Header: 1 ile matris olarak oku
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length < 3) return; // En az başlık + boş + 1 veri satırı lazım

            const headers = data[0]; // ÜDY3, Boş, SRC1, Boş...

            // Sütun çiftlerini gez (Her belge türü 2 sütun kaplar: SoruNo, Cevap)
            for (let i = 0; i < headers.length; i += 2) {
                const docType = headers[i]; // Belge Türü (ÜDY3 vb.)
                if (!docType) continue;

                parsedKey[booklet][docType] = {};

                // 2. satırdan (index 2) itibaren verileri oku
                for (let r = 2; r < data.length; r++) {
                    const row = data[r];
                    const qNo = row[i];     // Soru No
                    const ans = row[i + 1];   // Cevap

                    if (qNo !== undefined && ans !== undefined) {
                        parsedKey[booklet][docType][qNo] = String(ans).trim();
                    }
                }
            }
        });

        return parsedKey;

    } catch (error) {
        console.error("Cevap anahtarı okuma hatası:", error);
        throw error;
    }
}

// ==========================================
//  YAZMA (EXPORT) FONKSİYONLARI
// ==========================================

/**
 * Verileri profesyonel ve resmi formatta Excel'e kaydeder.
 * - Başlıklar, birleştirmeler ve kenarlıklar ekler.
 * - Başarısız öğrencileri kırmızı, muaf olanları turuncu işaretler.
 * - Footer kısmına imza sirküsü ekler.
 * 
 * @param {Array} data - Yazılacak veri listesi
 * @param {string} defaultName - Varsayılan dosya adı
 * @param {string} groupByField - (Opsiyonel) Veriyi sayfalar halinde bölmek için alan adı (örn: 'Salon No')
 */
export const saveExcel = async (data, defaultName, groupByField = null) => {
    try {
        const workbook = XLSX.utils.book_new();
        const dateStr = new Date().toLocaleDateString('tr-TR');

        // Tek bir sayfayı (sheet) oluşturan yardımcı fonksiyon
        const createProfessionalSheet = (sheetData, groupName) => {
            // 1. Veri Hazırlığı
            if (sheetData.length === 0) return XLSX.utils.aoa_to_sheet([]);

            const headers = Object.keys(sheetData[0]);
            const rows = sheetData.map(obj => Object.values(obj));

            // Matris Yapısı: 
            // Row 0: Title
            // Row 1: Date/Salon
            // Row 2: Headers
            // Row 3...: Data
            const wsData = [
                [""], // Row 0
                [""], // Row 1
                headers, // Row 2
                ...rows // Row 3...
            ];

            const lastDataRowParams = 2 + rows.length;

            // --- Footer İstatistikleri ---

            // Sütun İndekslerini Bul
            const resultIndex = headers.indexOf("Sonuç");
            const durumIndex = headers.indexOf("Durum");

            // Başarılı Sayısı
            const passedStudents = rows.filter(r => {
                const val = resultIndex !== -1 ? r[resultIndex] : "";
                return String(val || "").includes('Başarılı');
            }).length;

            // Sınava Giren Sayısı
            const enteredStudents = rows.filter(r => {
                if (durumIndex !== -1) {
                    const val = String(r[durumIndex] || "").toUpperCase();
                    // Girmedi veya Muaf değilse sınava girmiş sayılır
                    return !val.includes('GİRMEDİ') && !val.includes('MUAF') && !val.includes('OKUNMADI');
                }
                return true;
            }).length;

            const footerRows = [
                [], // Spacer
                ["Not: Yeterli notu alamayanlar ile başarısız olanların durumu kırmızı kalemle yazılacaktır."],
                [`.../.../20... günü yapılan test sınavına giren ( ${enteredStudents} ) kişinin isimleri ve imtihan sonuçları yukarıda açıklanmıştır.`],
                [`.../.../20... günü yapılan uygulama sınavına giren ( ${enteredStudents} ) kişiden ( ${passedStudents} ) kişi başarılı olmuştur.`],
                [],
                [],
                ["Şube Müdürü", "", "", "", "Başkan", "", "", "", "Üye"]
            ];

            wsData.push(...footerRows);

            const sheet = XLSX.utils.aoa_to_sheet(wsData);

            // --- STİL VE AYARLAR ---

            // 1. Hücre Birleştirmeleri (Merge)
            sheet['!merges'] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Title
                { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 4 } }, // Date
                { s: { r: 1, c: headers.length - 3 }, e: { r: 1, c: headers.length - 1 } }, // Salon
                // Footers
                { s: { r: lastDataRowParams + 2, c: 0 }, e: { r: lastDataRowParams + 2, c: headers.length - 1 } },
                { s: { r: lastDataRowParams + 3, c: 0 }, e: { r: lastDataRowParams + 3, c: headers.length - 1 } },
                { s: { r: lastDataRowParams + 4, c: 0 }, e: { r: lastDataRowParams + 4, c: headers.length - 1 } }, // Uygulama Sınavı satırı
            ];

            // 2. İçerik Doldurma (Headerlar)
            sheet['A1'].v = "SINAV SONUÇ LİSTESİ";
            sheet['A2'].v = `SINAV TARİHİ: ${dateStr}`;

            // Salon Hücresi: Headers uzunluğuna göre dinamik
            const salonColIndex = headers.length - 3;
            const salonCellRef = XLSX.utils.encode_cell({ r: 1, c: salonColIndex });
            if (!sheet[salonCellRef]) sheet[salonCellRef] = { v: "", t: 's' };
            sheet[salonCellRef].v = `SALON: ${groupName}`;

            // 3. Stil Uygulama (Fontlar, Kenarlıklar, Renkler)
            const range = XLSX.utils.decode_range(sheet['!ref']);
            const thinBorder = { style: "thin" };
            const fullBorder = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
            const fontCalibri16Bold = { name: "Calibri", sz: 16, bold: true };
            const fontHeader = { name: "Calibri", sz: 10, bold: true };
            const fontData = { name: "Calibri", sz: 8 }; // Veriler 8 punto (İSTEK)
            const fontFooter = { name: "Calibri", sz: 10, italic: true };
            const fontFooterBold = { name: "Calibri", sz: 10, italic: true, bold: true };
            const fontSignature = { name: "Calibri", sz: 11, bold: true };

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!sheet[cellRef]) continue;
                    if (!sheet[cellRef].s) sheet[cellRef].s = {};

                    sheet[cellRef].s.font = fontData; // Varsayılan

                    // Header Bölümü
                    if (R === 0 || R === 1) {
                        sheet[cellRef].s.font = fontCalibri16Bold;
                        sheet[cellRef].s.alignment = { horizontal: "center", vertical: "center" };
                        sheet[cellRef].s.border = fullBorder;
                        if (R === 1 && C < headers.length - 3) sheet[cellRef].s.alignment = { horizontal: "left", vertical: "center" };
                    }
                    // Tablo Başlıkları
                    else if (R === 2) {
                        sheet[cellRef].s.font = fontHeader;
                        sheet[cellRef].s.alignment = { horizontal: "center", vertical: "center" };
                        sheet[cellRef].s.border = fullBorder;
                        sheet[cellRef].s.fill = { fgColor: { rgb: "E0E0E0" } };
                    }
                    // Veri Satırları
                    else if (R > 2 && R <= lastDataRowParams) {
                        sheet[cellRef].s.border = fullBorder;
                        sheet[cellRef].s.alignment = { horizontal: "left", vertical: "center" };

                        const rowData = sheetData[R - 3];
                        if (rowData) {
                            if (String(rowData['Sonuç']).includes('Başarısız')) {
                                sheet[cellRef].s.fill = { fgColor: { rgb: "FFCCCC" } }; // Kırmızı arka plan
                            }
                            else if (String(rowData['Durum']).includes('MUAF') || String(rowData['Durum']).includes('Girmedi')) {
                                sheet[cellRef].s.fill = { fgColor: { rgb: "FFF4E5" } }; // Turuncu/Sarı arka plan
                            }
                        }
                    }
                    // Footer
                    else if (R > lastDataRowParams) {
                        if (R >= lastDataRowParams + 2 && R <= lastDataRowParams + 3) {
                            sheet[cellRef].s.font = fontFooter;
                        }
                        else if (R === lastDataRowParams + 4) {
                            sheet[cellRef].s.font = fontFooterBold;
                        }

                        if (R === lastDataRowParams + 7) {
                            sheet[cellRef].s.font = fontSignature;
                            sheet[cellRef].s.alignment = { horizontal: "center" };
                        }
                    }
                }
            }

            // Sütun Genişlikleri
            const widthMap = {
                'Sıra': 3,
                'TC No': 11,
                'Ad Soyad': 20,
                'Belge Türü': 8,
                'Durum': 11,
                'Kitapçık': 5,
                'Doğru': 5,
                'Yanlış': 5,
                'Boş': 5,
                'Puan': 6,
                'Sonuç': 6
            };

            const colWidths = headers.map(header => {
                const key = Object.keys(widthMap).find(k => k.toLowerCase() === header.toLowerCase());
                return { wch: key ? widthMap[key] : 10 };
            });

            sheet['!cols'] = colWidths;

            // Yazdırma Ayarları (A4)
            sheet['!pageSetup'] = { paperSize: 9, orientation: 'portrait', scale: 100 };
            sheet['!margins'] = { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

            return sheet;
        };

        if (groupByField) {
            // Gruplama İsteniyorsa (Örn: Salonlara göre ayrı sayfa)
            const groups = {};
            data.forEach(item => {
                const key = item[groupByField] || 'Diğer';
                if (!groups[key]) groups[key] = [];
                groups[key].push(item);
            });

            const sortedKeys = Object.keys(groups).sort((a, b) =>
                String(a).localeCompare(String(b), undefined, { numeric: true })
            );

            sortedKeys.forEach(key => {
                const reindexed = groups[key].map((item, index) => {
                    const newItem = { ...item };
                    if (newItem['Sıra'] !== undefined) newItem['Sıra'] = index + 1;
                    if (groupByField && newItem[groupByField]) delete newItem[groupByField];
                    return newItem;
                });
                const sheet = createProfessionalSheet(reindexed, key);
                const safeName = String(key).substring(0, 30);
                XLSX.utils.book_append_sheet(workbook, sheet, safeName);
            });

        } else {
            const sheet = createProfessionalSheet(data, "Tümü");
            XLSX.utils.book_append_sheet(workbook, sheet, "Sonuçlar");
        }

        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

        if (window.api) {
            return await window.api.saveFile(buffer, defaultName);
        }
    } catch (error) {
        console.error("Excel kaydetme hatası:", error);
        throw error;
    }
};
