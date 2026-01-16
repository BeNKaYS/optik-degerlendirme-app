/**
 * @file OpticalTab.jsx
 * @description Optik okuyucu çıktılarının (TXT/FMT) yüklendiği, parse edildiği ve doğrulandığı bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState, useEffect, useRef } from 'react';
import { parseOpticalData } from '../../utils/txtParser';

// ==========================================
//  BİLEŞEN TANIMI
// ==========================================

export default function OpticalTab({ data, setData, attendanceData, onNext }) {

    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ & REF
    // -------------------------------------------------------------------------
    const fileInputRef = useRef(null);
    const handleTriggerUpload = () => fileInputRef.current?.click();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [rawText, setRawText] = useState(null); // Ham veri (String olarak saklanır)

    // Alanlar State'i
    const [fields, setFields] = useState(() => {
        const savedFields = localStorage.getItem('optical_parser_fields');
        if (savedFields) {
            try {
                const parsed = JSON.parse(savedFields);
                if (Array.isArray(parsed)) return parsed;
            } catch (e) {
                console.error("Kayıtlı alanlar okunamadı:", e);
            }
        }
        return [
            { key: 'sira', label: 'Sıra No', icon: '#️⃣', color: '#3b82f6', charset: '' },
            { key: 'tcNo', label: 'TC Kimlik', icon: '🆔', color: '#ef4444', charset: '0-9' },
            { key: 'adSoyad', label: 'Adı Soyadı', icon: '👤', color: '#172554', charset: 'A-Z' },
            { key: 'salonNo', label: 'Salon No', icon: '🏫', color: '#f97316', charset: '0-9' },
            { key: 'girmedi', label: 'Durum', icon: '📋', color: '#dc2626', charset: 'İ,G' },
            { key: 'kitapcik', label: 'Kitapçık', icon: '📖', color: '#7c3aed', charset: 'A,B' },
            { key: 'cevaplar', label: 'Cevaplar', icon: '✏️', color: '#10b981', charset: 'A,B,C,D' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('optical_parser_fields', JSON.stringify(fields));
    }, [fields]);

    // Parse Ayarları (Varsayılan Değerler)
    const [showSettings, setShowSettings] = useState(false);

    // Selection Mode States
    const [isEditMode, setIsEditMode] = useState(false);
    const [activeField, setActiveField] = useState(""); // Dropdown selection
    const [selectionStart, setSelectionStart] = useState(null);
    const [selectionEnd, setSelectionEnd] = useState(null);
    const [activeRowIndex, setActiveRowIndex] = useState(0); // Satır haritası için aktif satır indeksi
    const [isEditingFields, setIsEditingFields] = useState(false); // Alan düzenleme modu

    // FMT/BLDM Analysis State
    const [formatAnalysis, setFormatAnalysis] = useState([]); // Array of parsed objects
    const [parserConfig, setParserConfig] = useState(() => {
        // LocalStorage'dan kayıtlı ayarları okumayı dene
        const savedConfig = localStorage.getItem('optical_parser_config');
        if (savedConfig) {
            try {
                const parsed = JSON.parse(savedConfig);
                if (parsed && typeof parsed === 'object') return parsed;
            } catch (e) {
                console.error("Kayıtlı ayarlar okunamadı:", e);
            }
        }
        // Varsayılan Değerler
        return {
            sira: { start: 0, length: 0 },
            tcNo: { start: 22, length: 11 },
            adSoyad: { start: 0, length: 22 },
            salonNo: { start: 33, length: 2 },
            girmedi: { start: 35, length: 1 }, // Düzeltildi: 1 karakter
            kitapcik: { start: 36, length: 1 }, // Düzeltildi: 36'dan başlıyor
            cevaplar: { start: 37, length: '' } // Düzeltildi: 37'den başlıyor
        };
    });

    // parserConfig değiştiğinde LocalStorage'a kaydet (Debounce gerekebilir ama şimdilik direkt kaydedelim)
    // useEffect hook'u bu component içinde başka bir yere ekleyeceğiz, burası state tanımı.
    useEffect(() => {
        localStorage.setItem('optical_parser_config', JSON.stringify(parserConfig));
    }, [parserConfig]);


    // -------------------------------------------------------------------------
    //  YARDIMCI VE MANTIK FONKSİYONLARI
    // -------------------------------------------------------------------------

    /**
     * Parse ayarlarını günceller.
     */
    const handleConfigChange = (field, key, value) => {
        // Boş string veya sayısal değer olarak sakla
        const parsedValue = value === '' ? '' : (isNaN(parseInt(value)) ? '' : parseInt(value));
        setParserConfig(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [key]: parsedValue
            }
        }));
    };

    /**
     * UI için tutulan "boş string" değerlerini sayısal konfigurasyona çevirir.
     */
    const getCleanConfig = () => {
        const cleanConfig = {};
        Object.keys(parserConfig).forEach(key => {
            const fieldDef = fields.find(f => f.key === key);
            cleanConfig[key] = {
                start: parseInt(parserConfig[key].start) || 0,
                length: parserConfig[key].length === '' ? null : parseInt(parserConfig[key].length),
                charset: fieldDef?.charset || null
            };
        });
        return cleanConfig;
    };

    /**
     * Mükerrer TC kimlik numaralarını filtreler.
     * Kural: Eğer aynı TC birden fazla geçiyorsa, dosyadaki SON giriş geçerlidir.
     */
    const filterDuplicates = (rawData) => {
        const uniqueMap = new Map();

        rawData.forEach(item => {
            // TC No geçerli ve yeterli uzunlukta ise anahtar olarak kullan (Mükerrer kontrolü)
            // Eğer TC No kısa (örn: "0", "1") veya tamamen 0 ise (örn: "00000000000"), benzersiz ID kullan (Hepsini göster)
            const isValidTC = item.tcNo && item.tcNo.trim().length >= 5 && !/^0+$/.test(item.tcNo.trim());
            const key = isValidTC ? item.tcNo.trim() : `__no_tc_${item.id}`;
            uniqueMap.set(key, item); // Varsa üzerine yazar (sonuncuyu tutar)
        });

        // Map değerlerini diziye çevir ve ID'ye göre yeniden sırala
        return Array.from(uniqueMap.values()).sort((a, b) => a.id - b.id);
    };

    /**
     * TC Kimlik doğrulaması yapar.
     * @param {string} tc - Öğrenci TC Kimlik No
     * @returns {boolean} Geçerli mi?
     */
    const isValidTC = (tc) => {
        if (!tc) return false;
        const cleaned = String(tc).trim();
        // TC tam 11 haneli olmalı ve sadece rakam içermeli
        return /^\d{11}$/.test(cleaned);
    };

    /**
     * Öğrencinin yoklama listesinde olup olmadığını kontrol eder.
     * Sadece TAM EŞLEŞMEyi kabul eder.
     * @param {string} tc - Öğrenci TC Kimlik No
     * @returns {{ status: 'valid' | 'invalid' | 'registered' | 'unregistered' | 'unknown', message: string }}
     */
    const getStudentStatus = (tc) => {
        const cleanedTc = String(tc || '').trim();

        // TC Doğrulama: Tam 11 hane mi?
        if (!isValidTC(cleanedTc)) {
            return {
                status: 'invalid',
                message: `Geçersiz TC (${cleanedTc.length} hane)`
            };
        }

        if (!attendanceData) {
            return { status: 'unknown', message: '-' };
        }

        // TAM EŞLEŞMEyle ara (includes DEĞİL, === kullan)
        const exists = attendanceData.some(row => {
            return Object.values(row).some(val => {
                const valStr = String(val).trim();
                // TC sütunu genelde 11 haneli olmalı, tam eşleşme yap
                return valStr === cleanedTc;
            });
        });

        return exists
            ? { status: 'registered', message: 'Listede Var' }
            : { status: 'unregistered', message: 'Listede Yok' };
    };

    /**
     * Optik veri istatistiklerini hesaplar
     */
    const getOpticalStats = () => {
        if (!data || data.length === 0) return null;

        // Toplam kayıt sayısı
        const totalRecords = data.length;

        // Benzersiz TC sayısı (tekrar edenler hariç)
        const tcSet = new Set(data.filter(d => d.tcNo && d.tcNo.trim()).map(d => d.tcNo.trim()));
        const uniqueTcCount = tcSet.size;

        // Tekrar eden TC sayısı (rawText'ten parse edilen orijinal verideki tekrarlar)
        // data zaten filtrelenmiş olduğu için rawText'i yeniden parse etmemiz gerekir
        let duplicateCount = 0;
        if (rawText) {
            try {
                const cleanConfig = getCleanConfig();
                const allParsedData = parseOpticalData(rawText, cleanConfig);
                const tcCounts = {};
                allParsedData.forEach(item => {
                    if (item.tcNo && item.tcNo.trim()) {
                        const tc = item.tcNo.trim();
                        tcCounts[tc] = (tcCounts[tc] || 0) + 1;
                    }
                });
                duplicateCount = Object.values(tcCounts).filter(count => count > 1).reduce((sum, count) => sum + (count - 1), 0);
            } catch (e) {
                duplicateCount = 0;
            }
        }

        // Girmedi durumundaki öğrenci sayısı - Durum sütununda "G" olanlar
        const notAttendedCount = data.filter(d =>
            d.girmediDurumu && d.girmediDurumu.trim().toUpperCase() === 'G'
        ).length;

        // Sınava giren ve cevap veren sayısı - Cevaplar sütunu dolu ve Durum "G" olmayan
        const attendedCount = data.filter(d =>
            d.ogrenciCevaplari &&
            d.ogrenciCevaplari.trim().length > 0 &&
            (!d.girmediDurumu || d.girmediDurumu.trim().toUpperCase() !== 'G')
        ).length;

        // Benzersiz salon sayısı
        const salonSet = new Set(data.filter(d => d.salonNo).map(d => d.salonNo));
        const salonCount = salonSet.size;

        // Kitapçık türleri
        const kitapcikSet = new Set(data.filter(d => d.kitapcikTuru).map(d => d.kitapcikTuru));
        const kitapcikTypes = Array.from(kitapcikSet).join(', ') || '-';

        return {
            totalRecords,
            uniqueTcCount,
            duplicateCount,
            notAttendedCount,
            attendedCount,
            salonCount,
            kitapcikTypes
        };
    };

    const stats = getOpticalStats();

    /**
     * Verilen indeksteki alanı bulur.
     */
    const getFieldAt = (index) => {
        // parserConfig üzerinden kontrol et
        for (const field of fields) {
            const config = parserConfig[field.key];
            if (!config) continue; // Config yoksa atla
            const start = parseInt(config.start) || 0;
            // Uzunluk boş ise (cevaplar sonu) 120'ye kadar varsayalım
            let len = config.length === '' ? (120 - start) : (parseInt(config.length) || 0);

            if (index >= start && index < start + len) {
                return field;
            }
        }
        return null;
    };

    /**
     * Seçim Modu: Hücreye tıklama işlemi
     */
    const handleCellClick = (index) => {
        if (!isEditMode) return;

        if (selectionStart === null) {
            // İlk tıklama - Başlangıç
            setSelectionStart(index);
            setSelectionEnd(null);
        } else {
            // İkinci tıklama - Bitiş
            const start = Math.min(selectionStart, index);
            const end = Math.max(selectionStart, index);

            setSelectionStart(start);
            setSelectionEnd(end);
            // Kullanıcı artık dropdown'dan alan seçip header'daki Kaydet butonuna basacak
        }
    };

    /**
     * Seçilen alanı işaretle (henüz kaydetme)
     */
    const handleFieldAssign = (fieldKey) => {
        setSelectedFieldKey(fieldKey);
    };
    /**
     * Kullanıcı "Kaydet" butonuna bastığında atamayı yap
     */
    const handleConfirmAssignment = () => {
        if (selectionStart === null || selectionEnd === null || !activeField) return;

        const start = selectionStart;
        const length = selectionEnd - selectionStart + 1;

        // Config'i güncelle
        handleConfigChange(activeField, 'start', start);
        handleConfigChange(activeField, 'length', length);

        // Seçimi temizle
        resetSelection();
    };

    const resetSelection = () => {
        setSelectionStart(null);
        setSelectionEnd(null);
        setActiveField(''); // Dropdown'u da sıfırla - yanlışlıkla tekrar atama yapılmasın
    };

    // -------------------------------------------------------------------------
    //  İŞLEYİCİLER (HANDLERS)
    // -------------------------------------------------------------------------

    /**
     * Dosya yükleme ve parse işlemini yönetir.
     */
    const handleFileUpload = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!window.api) throw new Error("Electron API unavailable");

            const filePath = await window.api.selectFile([{ name: 'Data Files', extensions: ['txt', 'fmt'] }]);
            if (filePath) {
                setFileName(filePath.split(/[/\\]/).pop());
                const textContent = await window.api.readFileText(filePath);
                setRawText(textContent); // Ham veriyi sakla

                const cleanConfig = getCleanConfig();
                const parsedData = parseOpticalData(textContent, cleanConfig);

                if (parsedData.length === 0) {
                    throw new Error("Dosyada geçerli satır bulunamadı.");
                }

                const uniqueData = filterDuplicates(parsedData);
                setData(uniqueData);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ayarları uygulayarak veriyi yeniden parse eder.
     */
    const applySettings = () => {
        console.log('applySettings called, rawText:', rawText ? 'exists' : 'null');
        if (!rawText) {
            // setError("Lütfen önce bir dosya yükleyiniz. (Ayarların geçerli olması için ham veri gerekli)");
            // return;
            // KULLANICI İSTEĞİ: Dosya olmasa da ayarlar kaydedilsin (State'te zaten duruyor)
            alert("Ayarlar güncellendi! (Henüz dosya yüklenmediği için önizleme yapılamıyor)");
            return;
        }
        try {
            console.log('Parsing with config:', parserConfig);
            const cleanConfig = getCleanConfig();
            console.log('Clean config:', cleanConfig);
            const parsedData = parseOpticalData(rawText, cleanConfig);

            if (parsedData.length === 0) throw new Error("Dosyada geçerli satır bulunamadı.");

            const uniqueData = filterDuplicates(parsedData);
            setData(uniqueData);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const handleExportConfig = async () => {
        try {
            if (!window.api) return;
            const jsonStr = JSON.stringify(parserConfig, null, 2);
            const encoder = new TextEncoder();
            const buffer = encoder.encode(jsonStr);
            await window.api.saveFile(buffer, 'optik-ayar.json');
        } catch (err) {
            console.error(err);
            setError('Ayarlar dışa aktarılamadı.');
        }
    };

    const handleImportConfig = async () => {
        try {
            if (!window.api) return;
            const filePath = await window.api.selectFile([{ name: 'JSON Config', extensions: ['json'] }]);
            if (filePath) {
                const jsonStr = await window.api.readFileText(filePath);
                const config = JSON.parse(jsonStr);
                setParserConfig(config);
            }
        } catch (err) {
            console.error(err);
            setError('Ayarlar yüklenirken hata oluştu. Dosya formatını kontrol edin.');
        }
    };

    const clearSettings = () => {
        setParserConfig({
            sira: { start: 0, length: 0 },
            tcNo: { start: 0, length: 0 },
            adSoyad: { start: 0, length: 0 },
            salonNo: { start: 0, length: 0 },
            girmedi: { start: 0, length: 0 },
            kitapcik: { start: 0, length: 0 },
            cevaplar: { start: 0, length: 0 },
        });
    };

    /**
     * FMT/BLDM Format Dosyası Yükleme ve Detaylı Analiz
     */
    const handleFormatUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            try {
                const lines = content.split(/\r?\n/);
                const newConfig = { ...parserConfig };
                let newFields = [...fields]; // Mevcut alanların kopyası
                let hasChanges = false;
                const analysisResult = [];

                let answerBlocks = [];

                lines.forEach((line, index) => {
                    if (!line.trim()) return;

                    // Format: ... = StartCol = EndCol = Type = ... = [LABEL]
                    const parts = line.split('=');
                    // Index 2: Start Col, Index 3: End Col
                    if (parts.length < 5) return;

                    const rawStartCol = parseInt(parts[2], 10);
                    const rawEndCol = parseInt(parts[3], 10);

                    if (isNaN(rawStartCol) || isNaN(rawEndCol)) return;

                    // Dosya 1-based, Biz 0-based
                    const start = rawStartCol - 1;
                    // Uzunluk: Bitiş - Başlangıç + 1
                    const length = rawEndCol - rawStartCol + 1;

                    // Label bulma
                    let label = "BİLİNMİYOR";
                    const labelMatch = line.match(/\[(.*?)\]/);
                    if (labelMatch) {
                        label = labelMatch[1].trim(); // Köşeli parantez içi
                    }

                    // Tip Belirleme
                    const typeCode = parts[4];
                    const type = typeCode === 'K' ? 'Karakter' : (typeCode === 'S' ? 'Sayı' : typeCode);

                    // --- OTOMATİK EŞLEŞTİRME VE DİNAMİK ALAN ---
                    const upperLabel = label.toUpperCase();
                    let matchedKey = null;

                    // 1. Standart Alanlar
                    if (['TC', 'ADAYNO', 'TCNO', 'OGRENCI NO', 'TC KIMLIK'].some(k => upperLabel.includes(k))) {
                        matchedKey = 'tcNo';
                    } else if (['AD SOYAD', 'ADI', 'ISIM', 'AD', 'SOYAD'].some(k => upperLabel.includes(k)) && !upperLabel.includes('BABA')) {
                        matchedKey = 'adSoyad';
                    } else if (['SINIF', 'SALON', 'DERSLIK'].some(k => upperLabel.includes(k))) {
                        matchedKey = 'salonNo';
                    } else if (['KITAPCIK', 'KITAPÇIK', 'TÜR', 'TUR'].some(k => upperLabel.includes(k))) {
                        matchedKey = 'kitapcik';
                    } else if (['DURUM', 'GIRMEDI', 'IPTAL'].some(k => upperLabel.includes(k))) {
                        matchedKey = 'girmedi';
                    } else if (upperLabel.includes('CEVAP')) {
                        // Cevapları ayrı topla
                        answerBlocks.push({ start, end: start + length });
                        matchedKey = 'cevaplar'; // Sadece işaretlemek için
                    }

                    // 2. Dinamik Alan Eşleştirme veya Oluşturma
                    if (!matchedKey) {
                        // Bu etikete sahip bir alan zaten var mı?
                        const existingField = newFields.find(f => f.label.toUpperCase() === upperLabel);

                        if (existingField) {
                            matchedKey = existingField.key;
                        } else {
                            // YOKSA YENİ OLUŞTUR
                            // Renk seçimi (basit bir döngü veya rastgele)
                            const colors = ['#f472b6', '#22d3ee', '#a78bfa', '#fbbf24', '#34d399'];
                            const randomColor = colors[Math.floor(Math.random() * colors.length)];

                            const newKey = `field_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                            const newDiffField = {
                                key: newKey,
                                label: label, // Orijinal label
                                icon: "🏷️",
                                color: randomColor
                            };
                            newFields.push(newDiffField);
                            matchedKey = newKey;
                        }
                    }

                    // Config güncelle (Cevaplar hariç, onlar toplu yapılacak)
                    if (matchedKey && matchedKey !== 'cevaplar') {
                        newConfig[matchedKey] = { start, length };
                        hasChanges = true;
                    }

                    // Analiz listesine ekle
                    analysisResult.push({ lineNo: index + 1, original: line, start, length, label, type, rawStart: rawStartCol, rawEnd: rawEndCol });
                });

                // Cevap bloklarını birleştir
                if (answerBlocks.length > 0) {
                    const minStart = Math.min(...answerBlocks.map(b => b.start));
                    const maxEndPos = Math.max(...answerBlocks.map(b => b.end));
                    newConfig.cevaplar = { start: minStart, length: maxEndPos - minStart };
                    hasChanges = true;
                }

                setFormatAnalysis(analysisResult);
                alert(`${analysisResult.length} satır analiz edildi. Sağ panelde detayları görebilirsiniz.`);

            } catch (err) {
                console.error(err);
                setError('Format dosyası işlenirken hata oluştu.');
            }
        };
        reader.readAsText(file, 'ISO-8859-9'); // Türkçe karakter desteği için
    };




    // -------------------------------------------------------------------------
    //  DİNAMİK ALAN YÖNETİMİ
    // -------------------------------------------------------------------------

    const addField = () => {
        const newKey = `field_${Date.now()}`;
        const newField = {
            key: newKey,
            label: "Yeni Alan",
            icon: "📝",
            color: "#64748b"
        };

        setFields([...fields, newField]);

        // Config'e de ekle
        setParserConfig(prev => ({
            ...prev,
            [newKey]: { start: 0, length: 5 }
        }));
    };

    const removeField = (keyToRemove) => {
        if (!confirm("Bu alanı silmek istediğinize emin misiniz?")) return;

        setFields(fields.filter(f => f.key !== keyToRemove));

        // Config'den silmek şart değil ama temizlik için iyi olur
        const newConfig = { ...parserConfig };
        delete newConfig[keyToRemove];
        setParserConfig(newConfig);

        if (activeField === keyToRemove) setActiveField("");
    };

    const updateFieldLabel = (key, newLabel) => {
        setFields(fields.map(f => f.key === key ? { ...f, label: newLabel } : f));
    };

    const updateFieldCharset = (key, newCharset) => {
        setFields(fields.map(f => f.key === key ? { ...f, charset: newCharset } : f));
    };


    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            {/* Başlık */}
            <div className="tab-header">
                <h2>Optik Veri Yükleme (TXT/FMT)</h2>
                <p className="text-secondary">Optik okuyucudan alınan ham veri dosyasını yükleyin.</p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="action-area">
                <button className="primary-btn" onClick={handleFileUpload} disabled={loading}>
                    {loading ? 'Yükleniyor...' : 'Dosya Seç'}
                </button>
                <button className="settings-toggle-btn" onClick={() => setShowSettings(!showSettings)}>
                    <span>⚙️</span> {showSettings ? 'Ayarları Gizle' : 'Format Ayarları'}
                </button>
                {fileName && <span className="file-name">Seçilen: {fileName}</span>}
            </div>


            {/* Satır Haritası - Always Visible */}
            <div className="settings-panel row-map-panel">
                <div className="settings-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <div className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h3>Satır Haritası & Seçim</h3>
                        {/* Satır Navigasyonu */}
                        {rawText && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <button
                                    className="secondary-btn"
                                    style={{ padding: '2px 8px', fontSize: '0.9rem', height: '24px' }}
                                    onClick={() => setActiveRowIndex(prev => Math.max(0, prev - 1))}
                                    disabled={activeRowIndex === 0}
                                    title="Önceki Satır"
                                >
                                    ◀
                                </button>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>
                                    {activeRowIndex + 1} / {rawText.split(/\r?\n/).filter(line => line.trim().length > 0).length}
                                </span>
                                <button
                                    className="secondary-btn"
                                    style={{ padding: '2px 8px', fontSize: '0.9rem', height: '24px' }}
                                    onClick={() => setActiveRowIndex(prev => Math.min(rawText.split(/\r?\n/).filter(line => line.trim().length > 0).length - 1, prev + 1))}
                                    disabled={!rawText || activeRowIndex >= rawText.split(/\r?\n/).filter(line => line.trim().length > 0).length - 1}
                                    title="Sonraki Satır"
                                >
                                    ▶
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Header Field Chooser */}
                        {isEditMode && (
                            <select
                                value={activeField}
                                onChange={(e) => setActiveField(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    cursor: 'pointer',
                                    height: '24px',
                                    outline: 'none',
                                    color: activeField ? fields.find(f => f.key === activeField)?.color : 'inherit',
                                    fontWeight: activeField ? 'bold' : 'normal'
                                }}
                            >
                                <option value="">-- Hızlı Ata --</option>
                                {fields.map(f => (
                                    <option key={f.key} value={f.key} style={{ color: f.color, fontWeight: 'bold' }}>
                                        {f.icon} {f.label}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            className={`secondary-btn ${isEditMode ? 'active-edit-btn' : ''}`}
                            onClick={() => {
                                setIsEditMode(!isEditMode);
                                resetSelection();
                            }}
                            style={{
                                fontSize: '0.75rem',
                                padding: '4px 10px',
                                background: isEditMode ? '#3b82f6' : 'rgba(0,0,0,0.05)',
                                color: isEditMode ? 'white' : 'inherit',
                                border: 'none'
                            }}
                        >
                            {isEditMode ? 'Düzenleme Modu: AÇIK' : 'Düzenle'}
                        </button>

                        {/* Kaydet/İptal Butonları - Sadece seçim yapıldığında görünür */}
                        {isEditMode && selectionStart !== null && selectionEnd !== null && (
                            <>
                                <button
                                    className="header-cancel-btn"
                                    onClick={resetSelection}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 12px',
                                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        marginLeft: '8px'
                                    }}
                                >
                                    ❌ İptal
                                </button>
                                <button
                                    className="header-save-btn"
                                    onClick={handleConfirmAssignment}
                                    disabled={!activeField}
                                    style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 12px',
                                        background: activeField
                                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                            : '#94a3b8',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: activeField ? 'pointer' : 'not-allowed',
                                        fontWeight: '600',
                                        marginLeft: '8px'
                                    }}
                                >
                                    ✅ Kaydet
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-small text-secondary mb-2" style={{ marginBottom: '10px', fontSize: '0.8rem', paddingLeft: '4px' }}>
                    {isEditMode
                        ? (activeField
                            ? <span><strong>{fields.find(f => f.key === activeField)?.label}</strong> alanı seçili. Haritada aralık belirleyin.</span>
                            : (selectionStart !== null && selectionEnd === null
                                ? "Şimdi bitiş karakterine tıklayın..."
                                : "Aralık seçmek için başlangıç ve bitiş kutularına tıklayın."))
                        : "Detaylı görünüm. Aralık belirlemek için 'Düzenle' butonuna basın."}
                </div>

                <div className="ruler-wrapper">
                    {/* Ruler Numbers */}
                    <div className="ruler-numbers">
                        {Array.from({ length: Math.ceil((rawText ? rawText.split(/\r?\n/)[activeRowIndex || 0].length : 120) / 10) + 1 }).map((_, i) => (
                            <span key={i} style={{ left: `${i * 10 * 10}px` }}>{i * 10}</span>
                        ))}
                    </div>
                    {/* Grid Visualization */}
                    <div className="row-map-grid" style={{ width: 'fit-content', minWidth: '100%' }}>
                        {Array.from({ length: rawText ? rawText.split(/\r?\n/)[activeRowIndex || 0].length : 120 }).map((_, i) => {
                            const field = getFieldAt(i);
                            const char = rawText ? (rawText.split(/\r?\n/)[activeRowIndex || 0]?.[i] || '') : '';

                            // Selection Highlighting Logic
                            let isSelected = false;
                            let isInRange = false;

                            if (selectionStart !== null) {
                                if (selectionEnd !== null) {
                                    // Full range selected
                                    isInRange = i >= selectionStart && i <= selectionEnd;
                                } else {
                                    // Only start selected
                                    isSelected = i === selectionStart;
                                }
                            }

                            return (
                                <div
                                    key={i}
                                    className={`grid-cell ${isEditMode ? 'edit-mode-cell' : ''} ${isSelected ? 'selected-cell' : ''} ${isInRange ? 'range-cell' : ''}`}
                                    style={{
                                        backgroundColor: isInRange ? 'rgba(59, 130, 246, 0.4)' : (field ? field.color : 'transparent'),
                                        color: isInRange ? '#fff' : (field ? '#ffffff' : '#1e293b'),
                                        fontWeight: (field || isInRange) ? 'bold' : 'normal',
                                        cursor: isEditMode ? 'crosshair' : 'default'
                                    }}
                                    onClick={() => handleCellClick(i)}
                                    title={`Index: ${i} ${field ? `| ${field.label}` : ''} ${char ? `| Char: ${char}` : ''}`}
                                >
                                    {char}
                                    <div className="cell-index">{i % 10}</div>
                                </div>
                            );
                        })}
                    </div>


                </div>
            </div>

            {/* Ayar Paneli ve Format Tablosu Container */}
            {showSettings && (
                <div style={{ display: 'grid', gridTemplateColumns: formatAnalysis.length > 0 ? '1fr 1fr' : '1fr', gap: '20px', marginTop: '20px' }}>

                    {/* SOL PANEL: Ayarlar */}
                    <div className="settings-panel" style={{ marginTop: 0 }}>
                        <div className="settings-header">
                            <div className="settings-title">
                                <span className="settings-icon">⚙️</span>
                                <h3>TXT Format Ayarları</h3>
                            </div>
                            <div className="setting-actions">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFormatUpload}
                                    style={{ display: 'none' }}
                                    accept=".fmt,.bldm,.txt"
                                />
                                <button className="action-btn" onClick={handleTriggerUpload} style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                                    <span>📄</span> Format Yükle
                                </button>
                                <button className="action-btn import" onClick={handleImportConfig}>
                                    <span>📂</span> İçe Aktar
                                </button>
                                <button className="action-btn export" onClick={handleExportConfig}>
                                    <span>💾</span> Dışa Aktar
                                </button>
                            </div>
                        </div>

                        <div className="settings-table">
                            <div className="settings-table-header">
                                <div className="col-field">Alan</div>
                                <div className="col-start">Başlangıç Pozisyonu</div>
                                <div className="col-length">Uzunluk (Karakter)</div>
                                <div className="col-charset">Karakter Seti</div>
                                <div></div>
                            </div>

                            {fields.map((field) => (
                                <div className="settings-table-row" key={field.key}>
                                    <div className="col-field" style={{ gap: '4px' }}>
                                        <div style={{ width: '20px', display: 'flex', justifyContent: 'center' }}>
                                            <span className="field-icon" style={{ color: field.color }}>{field.icon}</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => updateFieldLabel(field.key, e.target.value)}
                                            disabled={!isEditingFields}
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                fontWeight: 'bold',
                                                fontSize: '0.8rem',
                                                color: '#1e293b',
                                                width: '100%',
                                                padding: '2px'
                                            }}
                                        />
                                    </div>
                                    <div className="col-start">
                                        <input
                                            type="number"
                                            min="0"
                                            value={parserConfig[field.key]?.start ?? 0}
                                            onChange={(e) => handleConfigChange(field.key, 'start', e.target.value)}
                                            placeholder="0"
                                            disabled={!isEditingFields}
                                        />
                                    </div>
                                    <div className="col-length">
                                        <input
                                            type="number"
                                            min="0"
                                            value={parserConfig[field.key]?.length ?? 0}
                                            onChange={(e) => handleConfigChange(field.key, 'length', e.target.value)}
                                            placeholder={field.key === 'cevaplar' ? "Boş=Satır sonu" : "0"}
                                            disabled={!isEditingFields}
                                        />
                                    </div>
                                    <div className="col-charset">
                                        <input
                                            type="text"
                                            value={field.charset || ''}
                                            onChange={(e) => updateFieldCharset(field.key, e.target.value)}
                                            placeholder="A,B,C"
                                            disabled={!isEditingFields}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        {isEditingFields && (
                                            <button
                                                className="secondary-btn"
                                                onClick={() => removeField(field.key)}
                                                style={{
                                                    padding: '4px',
                                                    color: '#ef4444',
                                                    fontSize: '0.8rem',
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer'
                                                }}
                                                title="Alanı Sil"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}


                            <div style={{ padding: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                {!isEditingFields ? (
                                    <button
                                        className="secondary-btn"
                                        onClick={() => setIsEditingFields(true)}
                                        style={{ width: '100%', border: '1px solid #6366f1', background: '#eef2ff', color: '#6366f1', fontWeight: 'bold' }}
                                    >
                                        ✏️ Alan Düzenle
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                                        <button
                                            className="secondary-btn"
                                            onClick={addField}
                                            style={{ width: '100%', border: '1px dashed #cbd5e1', background: '#f8fafc' }}
                                        >
                                            + Yeni Alan Ekle
                                        </button>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                className="secondary-btn"
                                                onClick={() => setIsEditingFields(false)}
                                                style={{ flex: 1, background: '#10b981', color: 'white', fontWeight: 'bold' }}
                                            >
                                                ✅ Kaydet
                                            </button>
                                            <button
                                                className="secondary-btn"
                                                onClick={() => setIsEditingFields(false)}
                                                style={{ flex: 1, background: '#ef4444', color: 'white', fontWeight: 'bold' }}
                                            >
                                                ❌ İptal
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="settings-footer">
                            <div className="footer-hint"></div>
                            <button className="secondary-btn" onClick={clearSettings} style={{ marginRight: '10px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                                🧹 Temizle
                            </button>
                            <button className="apply-btn" onClick={applySettings}>
                                ✅ Uygula ve Yenile
                            </button>
                        </div>
                    </div>

                    {/* SAĞ PANEL: Format Analiz Tablosu */}
                    {formatAnalysis.length > 0 && (
                        <div className="settings-panel format-analysis-panel" style={{ marginTop: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="settings-header">
                                <div className="settings-title">
                                    <span style={{ fontSize: '1.5rem' }}>📋</span>
                                    <h3>Biçim Dosyası Analizi</h3>
                                    <span className="analysis-badge">{formatAnalysis.length} Alan</span>
                                </div>
                                <button className="secondary-btn clear-analysis-btn" onClick={() => setFormatAnalysis([])}>
                                    🗑️ Temizle
                                </button>
                            </div>

                            <div className="format-analysis-list">
                                {formatAnalysis.map((item, idx) => (
                                    <div key={idx} className="analysis-item">
                                        <div className="analysis-item-header">
                                            <span className={`label-badge ${item.label === 'BİLİNMİYOR' ? 'unknown' : 'known'}`}>
                                                {item.label}
                                            </span>
                                            <span className={`type-chip type-${item.type.toLowerCase()}`}>
                                                {item.type === 'Karakter' ? '🔤' : '🔢'} {item.type}
                                            </span>
                                        </div>
                                        <div className="analysis-item-details">
                                            <div className="detail-group">
                                                <span className="detail-label">Pozisyon:</span>
                                                <span className="detail-value">{item.rawStart} → {item.rawEnd}</span>
                                            </div>
                                            <div className="detail-group">
                                                <span className="detail-label">Uzunluk:</span>
                                                <span className="detail-value highlight">{item.length} karakter</span>
                                            </div>
                                            <div className="detail-group" style={{ gridColumn: '1 / -1', marginTop: '8px', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                                                <span className="detail-label" style={{ display: 'block', marginBottom: '4px' }}>FMT Göster:</span>
                                                <code style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e40af', wordBreak: 'break-all' }}>{item.original}</code>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {
                error && (
                    <div className="alert error">
                        <span>⚠️ {error}</span>
                    </div>
                )
            }

            {/* Veri Önizleme Tablosu */}
            {
                data && data.length > 0 && (
                    <div className="preview-area">
                        {/* İstatistik Kartları */}
                        {stats && (
                            <div className="optical-stats-grid">
                                <div className="optical-stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-content">
                                        <span className="stat-label">OKUNAN VERİ</span>
                                        <span className="stat-value">{stats.totalRecords}</span>
                                    </div>
                                </div>
                                <div className="optical-stat-card warning">
                                    <div className="stat-icon">🔄</div>
                                    <div className="stat-content">
                                        <span className="stat-label">TEKRAR EDEN</span>
                                        <span className="stat-value">{stats.duplicateCount}</span>
                                    </div>
                                </div>
                                <div className="optical-stat-card success">
                                    <div className="stat-icon">✅</div>
                                    <div className="stat-content">
                                        <span className="stat-label">SINAVA GİREN</span>
                                        <span className="stat-value">{stats.attendedCount} <small>/ {stats.totalRecords}</small></span>
                                    </div>
                                </div>
                                <div className="optical-stat-card error">
                                    <div className="stat-icon">❌</div>
                                    <div className="stat-content">
                                        <span className="stat-label">GİRMEDİ</span>
                                        <span className="stat-value">{stats.notAttendedCount}</span>
                                    </div>
                                </div>
                                <div className="optical-stat-card info">
                                    <div className="stat-icon">🏫</div>
                                    <div className="stat-content">
                                        <span className="stat-label">SALON SAYISI</span>
                                        <span className="stat-value">{stats.salonCount}</span>
                                    </div>
                                </div>
                                <div className="optical-stat-card">
                                    <div className="stat-icon">📖</div>
                                    <div className="stat-content">
                                        <span className="stat-label">KİTAPÇIK</span>
                                        <span className="stat-value small">{stats.kitapcikTypes}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-between">
                            <h3>Okunan Veriler ({data.length} Satır)</h3>
                            {attendanceData && <span className="badge">Yoklama Listesi ile Eşleşiyor</span>}
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        {/* Sıra Sütunu Sabit */}
                                        <th>Sıra</th>

                                        {/* Dinamik Alan Başlıkları (Sıra hariç, çünkü sabit ekledik) */}
                                        {fields.filter(f => f.key !== 'sira').map(field => (
                                            <th key={field.key}>{field.label}</th>
                                        ))}

                                        {/* Liste Durumu Sabit */}
                                        <th>Liste Durumu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => {
                                        const statusResult = getStudentStatus(row.tcNo);
                                        return (
                                            <tr key={i} className={statusResult.status === 'invalid' ? 'row-warning' : ''}>
                                                {/* Sıra Değeri (row.id genelde sıra nosudur) */}
                                                <td>{row.id}</td>

                                                {/* Dinamik Alan Değerleri */}
                                                {fields.filter(f => f.key !== 'sira').map(field => {
                                                    // TC No Özel İşlemi
                                                    if (field.key === 'tcNo') {
                                                        return (
                                                            <td key={field.key} className={statusResult.status === 'invalid' ? 'text-warning' : ''}>
                                                                {row[field.key]}
                                                                {statusResult.status === 'invalid' && <small className="tc-error"> ⚠️</small>}
                                                            </td>
                                                        );
                                                    }
                                                    // Cevaplar Özel İşlemi (Monospace Font)
                                                    if (field.key === 'cevaplar') {
                                                        return (
                                                            <td key={field.key} className="font-mono">{row.ogrenciCevaplari || row[field.key]}</td>
                                                        );
                                                    }
                                                    // Diğer Alanlar - Özel Eşleştirmeler
                                                    let displayValue = row[field.key];

                                                    if (field.key === 'kitapcik') displayValue = row.kitapcikTuru || row[field.key];
                                                    if (field.key === 'girmedi') displayValue = row.girmediDurumu || row[field.key];

                                                    return (
                                                        <td key={field.key}>{displayValue}</td>
                                                    );
                                                })}

                                                {/* Liste Durumu Değeri */}
                                                <td>
                                                    {statusResult.status === 'registered' && <span className="text-success">{statusResult.message}</span>}
                                                    {statusResult.status === 'unregistered' && <span className="text-error">{statusResult.message}</span>}
                                                    {statusResult.status === 'invalid' && <span className="text-warning">{statusResult.message}</span>}
                                                    {statusResult.status === 'unknown' && <span className="text-secondary">{statusResult.message}</span>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>


                        <div className="footer-actions">
                            <button className="primary-btn" onClick={onNext}>
                                Devam Et &rarr;
                            </button>
                        </div>
                    </div>
                )
            }

            <style>{`
        .action-area { margin: 20px 0; display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
        .file-name { font-size: 0.9em; color: var(--accent); background: rgba(99, 102, 241, 0.1); padding: 5px 10px; border-radius: 4px; }
        
        /* Format Ayarları Butonu */
        .settings-toggle-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .settings-toggle-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        
        .alert.error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .preview-area { margin-top: 30px; animation: fadeIn 0.5s ease; }
        
        /* ===== OPTICAL STATS CARDS ===== */
        .optical-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .optical-stat-card {
            background: var(--bg-secondary);
            border: var(--glass-border);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
            box-shadow: var(--glass-shadow);
        }
        
        .optical-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .optical-stat-card .stat-icon {
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 10px;
        }
        
        .optical-stat-card.warning .stat-icon {
            background: rgba(245, 158, 11, 0.1);
        }
        
        .optical-stat-card.success .stat-icon {
            background: rgba(34, 197, 94, 0.1);
        }
        
        .optical-stat-card.error .stat-icon {
            background: rgba(239, 68, 68, 0.1);
        }
        
        .optical-stat-card.info .stat-icon {
            background: rgba(59, 130, 246, 0.1);
        }
        
        .optical-stat-card .stat-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .optical-stat-card .stat-label {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .optical-stat-card .stat-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .optical-stat-card .stat-value.small {
            font-size: 1rem;
        }
        
        .optical-stat-card .stat-value small {
            font-size: 0.8rem;
            font-weight: 400;
            color: var(--text-secondary);
        }
        
        .optical-stat-card.warning .stat-value {
            color: #d97706;
        }
        
        .optical-stat-card.success .stat-value {
            color: #16a34a;
        }
        
        .optical-stat-card.error .stat-value {
            color: #dc2626;
        }
        
        .optical-stat-card.info .stat-value {
            color: #2563eb;
        }
        
        /* Light Mode Stats Cards */
        .light-mode .optical-stat-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-color: rgba(0, 0, 0, 0.08);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .optical-stat-card:hover {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
        
        .light-mode .optical-stat-card .stat-label {
            color: #64748b;
        }
        
        .light-mode .optical-stat-card .stat-value {
            color: #1e293b;
        }
        
        .light-mode .optical-stat-card .stat-value small {
            color: #94a3b8;
        }
        .table-wrapper { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        th { background: rgba(255, 255, 255, 0.05); font-weight: 600; color: var(--text-primary); }
        td { color: var(--text-secondary); }
        tr:hover td { background: rgba(255, 255, 255, 0.02); color: var(--text-primary); }
        .text-small { font-size: 0.8rem; color: var(--text-secondary); }
        .font-mono { font-family: monospace; letter-spacing: 1px; }
        .text-success { color: var(--success); }
        .text-error { color: var(--error); }
        .text-warning { color: #f59e0b; font-weight: 600; }
        .row-warning { background: rgba(245, 158, 11, 0.1) !important; }
        .row-warning:hover td { background: rgba(245, 158, 11, 0.15) !important; }
        .tc-error { color: #f59e0b; font-size: 0.8rem; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .footer-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
        
        /* ===== SETTINGS PANEL - COMPACT STYLES ===== */
        .settings-panel {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid rgba(99, 102, 241, 0.15);
            box-shadow: var(--glass-shadow);
            max-width: 700px;
        }
        
        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .settings-title {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .settings-title h3 {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .settings-icon {
            font-size: 1.1rem;
        }
        
        .setting-actions {
            display: flex;
            gap: 6px;
        }
        
        .action-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 5px 10px;
            font-size: 0.75rem;
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.12);
            color: var(--text-secondary);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-btn:hover {
            background: rgba(0, 0, 0, 0.08);
            color: var(--text-primary);
        }
        
        .action-btn.import:hover {
            border-color: var(--warning);
            color: #d97706; /* Darker orange */
        }
        
        .action-btn.export:hover {
            border-color: var(--accent);
            color: var(--accent);
        }
        
        /* Settings Table - Compact */
        .settings-table {
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .settings-table-header {
            display: grid;
            grid-template-columns: 120px 100px 100px 120px 40px;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(99, 102, 241, 0.08);
            font-weight: 600;
            font-size: 0.7rem;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .settings-table-row {
            display: grid;
            grid-template-columns: 120px 100px 100px 120px 40px;
            gap: 8px;
            padding: 6px 12px;
            align-items: center;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            transition: background 0.2s ease;
        }
        
        .settings-table-row:hover {
            background: rgba(99, 102, 241, 0.03);
        }
        
        .settings-table-row:last-child {
            border-bottom: none;
        }
        
        .col-field {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .field-icon {
            font-size: 0.85rem;
            width: 18px;
            text-align: center;
        }
        
        .field-label {
            font-size: 0.8rem;
            color: var(--text-primary);
        }
        
        .col-start, .col-length, .col-charset {
            position: relative;
        }
        
        .settings-table-row input {
            width: 100%;
            padding: 5px 8px;
            background: #f8fafc;
            border: 1px solid rgba(0, 0, 0, 0.12);
            border-radius: 5px;
            color: var(--text-primary);
            font-size: 0.8rem;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }
        
        .settings-table-row input:focus {
            outline: none;
            border-color: var(--accent);
            background: #ffffff;
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        
        .settings-table-row input::placeholder {
            color: rgba(0, 0, 0, 0.3);
            font-style: italic;
            font-size: 0.75rem;
        }
        
        .input-hint {
            display: block;
            font-size: 0.65rem;
            color: var(--text-secondary);
            margin-top: 2px;
            font-style: italic;
        }
        
        /* Settings Footer */
        .settings-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(0, 0, 0, 0.08);
        }
        
        .footer-hint {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .hint-icon {
            font-size: 0.85rem;
        }
        
        .apply-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }
        
        .apply-btn:hover:not(:disabled) {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .apply-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            box-shadow: none;
        }
        
        .secondary-btn {
            background: rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.1);
            color: var(--text-secondary);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .secondary-btn:hover { background: rgba(0,0,0,0.1); color: var(--text-primary); }

        /* Row Map Styles */
        .row-map-panel {
            margin-bottom: 15px;
            overflow: hidden;
            background: #ffffff; /* Explicit background */
            max-width: 100% !important;
        }
        
        .ruler-wrapper {
            position: relative;
            height: 140px;
            overflow-x: auto;
            overflow-y: hidden;
            background: #ffffff;
            border: 2px solid rgba(99, 102, 241, 0.2);
            border-radius: 12px;
            margin-top: 10px;
            width: 100%;
            box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
            padding-left: 40px;
        }
        
        /* Custom scrollbar for ruler */
        .ruler-wrapper::-webkit-scrollbar {
            height: 10px;
        }
        .ruler-wrapper::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 5px;
        }
        .ruler-wrapper::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border-radius: 5px;
        }
        .ruler-wrapper::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        }
        
        .ruler-numbers {
            position: absolute;
            top: 8px;
            left: 40px;
            width: 1500px;
            font-size: 0.75rem;
            color: #3b82f6;
            pointer-events: none;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
        }
        
        .ruler-numbers span {
            position: absolute;
            transform: translateX(-50%);
        }
        
        .row-map-grid {
            position: absolute;
            top: 32px;
            left: 40px;
            display: flex;
            padding-left: 0;
            width: 1500px;
        }
        
        .grid-cell {
            width: 12px;
            height: 75px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding-top: 6px;
            border-right: 1px solid rgba(0,0,0,0.06);
            border-bottom: 2px solid rgba(0,0,0,0.08);
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.8rem;
            position: relative;
            box-sizing: border-box;
            transition: all 0.2s ease;
        }
        
        .grid-cell:nth-child(10n) {
            border-right: 2px solid rgba(59, 130, 246, 0.3);
        }
        
        .grid-cell.edit-mode-cell:hover {
            background-color: rgba(59, 130, 246, 0.1) !important;
            transform: scale(1.05);
            z-index: 10;
        }

        .grid-cell.selected-cell {
            background-color: #2563eb !important;
            color: white !important;
        }

        .grid-cell.range-cell {
            box-shadow: inset 0 0 0 2px #2563eb;
        }

        .field-selector-modal {
            position: absolute;
            top: -150px; /* Satır haritasının üzerinde */
            background: white;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            z-index: 100;
            width: 200px;
            padding: 0;
            overflow: hidden;
            animation: fadeIn 0.2s ease;
        }

        .modal-header {
            background: #f8fafc;
            padding: 8px 12px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
        }
        
        .close-btn { background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; line-height: 1; }
        .close-btn:hover { color: #ef4444; }

        .modal-body { padding: 8px; }
        .modal-body p { margin: 0 0 8px 0; font-size: 0.7rem; color: var(--text-secondary); }

        .field-options {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .field-option-btn {
            text-align: left;
            padding: 6px 10px;
            border: 1px solid rgba(0,0,0,0.05);
            background: white;
            border-radius: 4px;
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.1s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .field-option-btn:hover {
            background: #f1f5f9;
            transform: translateX(2px);
        }

        .field-option-btn.selected {
            background: #dbeafe;
            border-color: #3b82f6;
            font-weight: 600;
            transform: translateX(4px);
        }

        .modal-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(0,0,0,0.05);
        }

        .btn-save, .btn-cancel {
            flex: 1;
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-save {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }

        .btn-save:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-cancel {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
        }

        .btn-cancel:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        
        .cell-index {
            position: absolute;
            bottom: 4px;
            font-size: 0.6rem;
            color: inherit;
            opacity: 0.7;
            pointer-events: none;
            font-weight: 600;
        }

        /* ===== FORMAT ANALYSIS PANEL - MODERN DESIGN ===== */
        .format-analysis-panel {
            max-width: 100% !important;
        }

        .analysis-badge {
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
            margin-left: auto;
        }

        .clear-analysis-btn {
            font-size: 0.75rem !important;
            padding: 6px 12px !important;
            background: rgba(239, 68, 68, 0.1) !important;
            border: 1px solid rgba(239, 68, 68, 0.3) !important;
            color: #dc2626 !important;
        }

        .clear-analysis-btn:hover {
            background: rgba(239, 68, 68, 0.2) !important;
            border-color: #dc2626 !important;
        }

        .analysis-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
        }

        .summary-item {
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
        }

        .summary-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            border-color: #3b82f6;
        }

        .summary-icon {
            font-size: 1.8rem;
            background: rgba(59, 130, 246, 0.1);
            width: 45px;
            height: 45px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
        }

        .summary-label {
            font-size: 0.7rem;
            color: #64748b;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .summary-value {
            font-size: 1.3rem;
            font-weight: 700;
            color: #1e293b;
            line-height: 1;
        }

        .format-analysis-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 600px;
            overflow-y: auto;
            padding-right: 8px;
        }

        .format-analysis-list::-webkit-scrollbar {
            width: 6px;
        }

        .format-analysis-list::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
        }

        .format-analysis-list::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
        }

        .format-analysis-list::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }

        .analysis-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 10px 12px;
            transition: all 0.2s ease;
            animation: slideInUp 0.2s ease;
        }

        .analysis-item:hover {
            border-color: #3b82f6;
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.15);
            transform: translateX(4px);
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .analysis-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            gap: 8px;
        }

        .label-badge {
            flex: 1;
            padding: 5px 12px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.75rem;
            display: inline-block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .label-badge.known {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }

        .label-badge.unknown {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
        }

        .type-chip {
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 0.65rem;
            font-weight: 600;
            white-space: nowrap;
        }

        .type-chip.type-karakter {
            background: rgba(139, 92, 246, 0.1);
            color: #7c3aed;
            border: 1px solid rgba(139, 92, 246, 0.3);
        }

        .type-chip.type-sayı {
            background: rgba(59, 130, 246, 0.1);
            color: #2563eb;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .analysis-item-details {
            display: flex;
            gap: 16px;
            padding-top: 8px;
            border-top: 1px solid #f1f5f9;
        }

        .detail-group {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .detail-label {
            font-size: 0.65rem;
            color: #64748b;
            font-weight: 500;
        }

        .detail-value {
            font-size: 0.7rem;
            color: #1e293b;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
        }

        .detail-value.highlight {
            color: #3b82f6;
            background: rgba(59, 130, 246, 0.1);
            padding: 2px 8px;
            border-radius: 4px;
        }

      `}</style>
        </div >
    );
}
