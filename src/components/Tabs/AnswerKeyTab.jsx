/**
 * @file AnswerKeyTab.jsx
 * @description Cevap Anahtarı Yönetimi (Raw Grid / Sağlam Mod)
 * @author Sercan ÖZDEMİR
 * @date 2026-01-15
 */

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function AnswerKeyTab({ data, setData, attendanceData, onNext, onSave }) {
    // Durumlar
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Veri
    const [fileName, setFileName] = useState('');
    const [rawGrid, setRawGrid] = useState([]);      // Tüm Excel verisi (Raw)
    const [columns, setColumns] = useState([]);      // Mevcut sütun harfleri (A, B, C...)

    // Konfigürasyon
    const [startRow, setStartRow] = useState(2);     // Cevapların başladığı satır (1-based)
    const [mappings, setMappings] = useState({});    // { "SRC1_A": "C", "SRC1_B": "E" }

    // Sonuç (Oluşturulan veya Mevcut)
    const [generatedKeys, setGeneratedKeys] = useState(null);
    const [isEditing, setIsEditing] = useState(false); // Manuel düzenleme modu

    // Mevcut veri varsa yükle
    useEffect(() => {
        if (data && Object.keys(data).length > 0 && !generatedKeys && rawGrid.length === 0) {
            setGeneratedKeys(data);
        }
    }, [data]);

    // 1. Belge Türlerini Çıkar (Yoklama Listesinden)
    const docTypes = useMemo(() => {
        // Eğer yoklama listesi boşsa ama mevcut cevap anahtarı varsa, oradan türleri alabiliriz
        const types = new Set();

        if (attendanceData && attendanceData.length > 0) {
            attendanceData.forEach(row => {
                const val = row['BELGE TÜRÜ'] || row['Belge Türü'] || row['belgeTuru'] || row['BelgeTuru'];
                if (val && String(val).trim()) {
                    types.add(String(val).trim().toUpperCase());
                }
            });
        }

        // Mevcut veriden de ekle (yedek)
        if (generatedKeys) {
            // generatedKeys yapısı: { "A": { "SRC1": {...} }, "B": { ... } }
            Object.keys(generatedKeys).forEach(booklet => {
                const bookletData = generatedKeys[booklet];
                if (bookletData) {
                    Object.keys(bookletData).forEach(dtype => types.add(dtype));
                }
            });
        }

        return Array.from(types).sort();
    }, [attendanceData, generatedKeys]);

    // 2. Excel Yükleme İşlemi (Raw Mode)
    const handleFileUpload = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setRawGrid([]);
        setGeneratedKeys(null); // Yeni yüklemede sıfırla
        setMappings({});

        try {
            if (!window.api) throw new Error("Electron API bulunamadı.");

            const filePath = await window.api.selectFile([
                { name: 'Excel Dosyaları', extensions: ['xlsx', 'xls'] }
            ]);

            if (!filePath) {
                setLoading(false);
                return;
            }

            setFileName(filePath.split(/[/\\]/).pop());

            const buffer = await window.api.readFileBuffer(filePath);
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            // header: "A" seçeneği ile sütunları A, B, C... olarak alıyoruz.
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: "A", defval: "" });

            if (jsonData.length === 0) {
                throw new Error("Excel boş görünüyor.");
            }

            // Sütunları belirle
            const allKeys = new Set();
            jsonData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
            const sortedCols = Array.from(allKeys).sort((a, b) => {
                if (a.length === b.length) return a.localeCompare(b);
                return a.length - b.length;
            });

            setRawGrid(jsonData);
            setColumns(sortedCols);
            setSuccess(`✅ Dosya okundu: ${jsonData.length} satır. Lütfen sütunları eşleştirin.`);

        } catch (err) {
            console.error(err);
            setError(err.message || "Yükleme hatası.");
        } finally {
            setLoading(false);
        }
    };

    // 3. Eşleştirme Değişimi
    const handleMappingChange = (key, column) => {
        setMappings(prev => ({
            ...prev,
            [key]: column
        }));
    };

    // 4. Cevap Dönüştürücü
    const parseAnswer = (val) => {
        if (!val) return '';
        const str = String(val).trim().toUpperCase();
        if (/^[A-E]$/.test(str)) return str;
        if (/^[1-5]$/.test(str)) return String.fromCharCode(64 + parseInt(str)); // 1->A
        const match = str.match(/[A-E]/);
        if (match) return match[0];
        return '';
    };

    // 5. Cevap Anahtarı Oluştur
    const handleGenerate = () => {
        setError(null);
        if (Object.keys(mappings).length === 0) {
            setError("Lütfen en az bir kitapçık için sütun seçiniz.");
            return;
        }

        /**
         * evaluator.js'in beklediği yapı:
         * {
         *   "A": {
         *      "SRC1": { 1: "A", 2: "B", ... },
         *      "ÜDY3": { 1: "D", 2: "C", ... }
         *   },
         *   "B": { ... }
         * }
         */
        const keys = { "A": {}, "B": {} };
        let hasData = false;
        const startIndex = Math.max(0, startRow - 1);

        docTypes.forEach(docType => {
            ['A', 'B'].forEach(booklet => {
                const mapKey = `${docType}_${booklet}`;
                const col = mappings[mapKey];

                if (col) {
                    const answersObj = {};
                    let qCount = 0;

                    for (let i = startIndex; i < rawGrid.length; i++) {
                        const row = rawGrid[i];
                        const val = row[col];
                        const parsed = parseAnswer(val);
                        // Boş olsa bile soru numarasını ilerletmek gerekebilir mi?
                        // Genelde raw data'da boş satır olmaz, sırasıyla 1, 2, 3 gider.
                        // RawGrid index'i değil, soru sayısını 1'den başlatarak ekleyelim.
                        if (parsed) {
                            answersObj[qCount + 1] = parsed;
                            qCount++;
                            hasData = true;
                        } else {
                            // Eğer satırda veri yoksa ama döngü devam ediyorsa? 
                            // Genelde cevap anahtarı sütunu ardışık doludur.
                            // Boşluğu atlıyoruz, soru numarasını artırmıyoruz (veya artırıyoruz?).
                            // Güvenli yöntem: Sadece dolu cevapları alıp sıraya dizmek.
                            // Eğer Excel'de boşluk varsa soru iptal demektir genelde.
                            // Şimdilik sadece dolu olanları sırayla alıp 1,2,3 diye diziyoruz.
                            // Eğer satır bazlı gitmek gerekirse logic değişmeli.
                            // Standart: Sütundaki harfler yukarıdan aşağıya cevaplardır.
                        }
                    }

                    if (qCount > 0) {
                        keys[booklet][docType] = answersObj;
                    }
                }
            });
        });

        if (!hasData) {
            setError("Seçilen sütunlardan ve başlama satırından itibaren geçerli cevap verisi bulunamadı.");
            return;
        }

        setGeneratedKeys(keys);
        setSuccess("✅ Cevap anahtarı oluşturuldu! Aşağıdan kontrol edip kaydedin.");
    };

    const handleSave = () => {
        if (generatedKeys) {
            // App.jsx tarafında tanımladığımız save fonksiyonunu çağırıyoruz
            if (onSave) {
                onSave(generatedKeys);
            } else {
                setData(generatedKeys); // Fallback old behavior
            }

            // onNext genelde EvaluationTab'a geçişi tetikler
            setSuccess("✅ Kaydedildi! Şimdi 'Değerlendirme' sekmesine geçip butona basın.");
            setIsEditing(false);
            if (onNext) setTimeout(onNext, 1000);
        }
    };

    // Manuel düzenleme handler'ı
    const handleCellEdit = (booklet, docType, questionNum, value) => {
        setGeneratedKeys(prev => {
            const newKeys = JSON.parse(JSON.stringify(prev)); // Deep copy
            if (!newKeys[booklet]) newKeys[booklet] = {};
            if (!newKeys[booklet][docType]) newKeys[booklet][docType] = {};

            if (value && /^[A-E]$/.test(value)) {
                newKeys[booklet][docType][questionNum] = value;
            } else if (!value) {
                delete newKeys[booklet][docType][questionNum];
            }
            return newKeys;
        });
    };

    return (
        <div className="tab-content glass-panel" style={{ overflowY: 'auto' }}>
            {/* ÜST KISIM: YÜKLEME */}
            <div style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📂 Cevap Anahtarı Yükle (Sağlam Mod)</h3>
                    <span style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', color: 'var(--accent)' }}>
                        {docTypes.length > 0 ? `${docTypes.length} Belge Türü` : "Belge Türü Yok"}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button onClick={handleFileUpload} className="primary-btn" disabled={loading}>
                        {loading ? 'Yükleniyor...' : '📁 Excel Dosyası Seç'}
                    </button>
                    {fileName && <span style={{ color: 'var(--success)' }}>{fileName}</span>}
                </div>
                {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>{error}</div>}
                {success && <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '10px', marginTop: '10px', borderRadius: '4px' }}>{success}</div>}
            </div>

            {/* ORTA: HARİTALAMA (Sadece Raw Grid Varsa) */}
            {rawGrid.length > 0 && (
                <div style={styles.bodyGrid}>
                    {/* SOL: ÖNİZLEME */}
                    <div style={{ ...styles.card, flex: 1, minWidth: '300px' }}>
                        <div style={styles.cardHeader}>
                            <h4>🔍 Veri Önizleme (İlk 5 Satır)</h4>
                        </div>
                        <div style={styles.tableWrapper}>
                            <table style={styles.rawTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.thRowNum}>#</th>
                                        {columns.map(c => (
                                            <th key={c} style={styles.thCol}>{c}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawGrid.slice(0, 5).map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.tdRowNum}>{idx + 1}</td>
                                            {columns.map(c => (
                                                <td key={c} style={styles.tdCell}>
                                                    {row[c] || ''}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={styles.note}>
                            * Tablo harf sütunları olarak (A, B...) okunmuştur. Kitapçıkları manuel eşleştirin.
                        </div>
                    </div>

                    {/* SAĞ: AYARLAR */}
                    <div style={{ ...styles.card, flex: 1, minWidth: '300px' }}>
                        <div style={styles.cardHeader}>
                            <h4>⚙️ Eşleştirme</h4>
                        </div>

                        <div style={styles.settingRow}>
                            <label>Cevaplar kaçıncı satırdan başlıyor?</label>
                            <input
                                type="number"
                                min="1"
                                value={startRow}
                                onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
                                style={styles.inputNum}
                            />
                        </div>

                        <div style={styles.mappingList}>
                            {docTypes.map(dtype => (
                                <div key={dtype} style={styles.mappingGroup}>
                                    <div style={styles.groupTitle}>{dtype}</div>
                                    <div style={styles.groupRow}>
                                        <div style={styles.pair}>
                                            <span>A Kitapçığı:</span>
                                            <select
                                                style={styles.select}
                                                value={mappings[`${dtype}_A`] || ''}
                                                onChange={(e) => handleMappingChange(`${dtype}_A`, e.target.value)}
                                            >
                                                <option value="">Seçiniz</option>
                                                {columns.map(c => <option key={c} value={c}>Sütun {c}</option>)}
                                            </select>
                                        </div>
                                        <div style={styles.pair}>
                                            <span>B Kitapçığı:</span>
                                            <select
                                                style={styles.select}
                                                value={mappings[`${dtype}_B`] || ''}
                                                onChange={(e) => handleMappingChange(`${dtype}_B`, e.target.value)}
                                            >
                                                <option value="">Seçiniz</option>
                                                {columns.map(c => <option key={c} value={c}>Sütun {c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleGenerate} style={styles.btnSecondary}>
                            ⚡ Cevap Anahtarı Oluştur
                        </button>
                    </div>
                </div>
            )}

            {/* ALT: SONUÇ MATRİSİ (Generated Keys Varsa) */}
            {generatedKeys && (
                <div className="glass-panel" style={{ padding: '15px', marginTop: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>📋 {rawGrid.length > 0 ? "Oluşturulan Matris" : "Mevcut Cevap Anahtarı"}</h3>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                background: isEditing ? 'var(--success)' : 'var(--accent)',
                                color: 'white',
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                fontSize: '0.85rem'
                            }}
                        >
                            {isEditing ? '✅ Düzenlemeyi Bitir' : '✏️ Düzenle'}
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr>
                                    <th style={{ background: 'var(--hover-bg)', padding: '8px', color: 'var(--text-primary)', minWidth: '100px', textAlign: 'left' }}>Belge / Kitapçık</th>
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <th key={i} style={{ background: 'var(--hover-bg)', padding: '4px', color: 'var(--text-secondary)', minWidth: '24px', textAlign: 'center', fontSize: '10px' }}>{i + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {docTypes.map(dtype => (
                                    ['A', 'B'].map(book => {
                                        const ansObj = generatedKeys[book]?.[dtype];
                                        if (!ansObj) return null;
                                        return (
                                            <tr key={`${dtype}_${book}`}>
                                                <td style={{ border: '1px solid var(--border)', padding: '6px', fontWeight: 'bold', color: 'var(--text-primary)', background: 'var(--hover-bg)' }}>
                                                    {dtype} ({book})
                                                </td>
                                                {Array.from({ length: 40 }).map((_, i) => (
                                                    <td key={i} style={{ border: '1px solid var(--border)', padding: '2px', textAlign: 'center' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                maxLength={1}
                                                                value={ansObj[i + 1] || ''}
                                                                onChange={(e) => handleCellEdit(book, dtype, i + 1, e.target.value.toUpperCase())}
                                                                style={{
                                                                    width: '20px',
                                                                    padding: '2px',
                                                                    textAlign: 'center',
                                                                    border: '1px solid var(--accent)',
                                                                    borderRadius: '3px',
                                                                    background: 'var(--bg-primary)',
                                                                    color: 'var(--text-primary)',
                                                                    fontSize: '11px'
                                                                }}
                                                            />
                                                        ) : (
                                                            <span style={{ color: 'var(--text-secondary)' }}>{ansObj[i + 1] || ''}</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
                        <button onClick={handleSave} style={{
                            background: 'var(--success)',
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                        }}>
                            💾 DEĞERLENDİRMEYE GEÇ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        color: '#eee',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflowY: 'auto'
    },
    card: {
        background: 'rgba(30,30,50,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '15px',
        borderRadius: '8px'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '10px',
        borderBottom: '1px solid #444',
        paddingBottom: '5px'
    },
    bodyGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px'
    },
    btnPrimary: {
        background: '#3f51b5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer'
    },
    btnSecondary: {
        background: '#ff9800', color: 'white', padding: '12px', width: '100%', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px'
    },
    btnFinal: {
        background: '#4caf50', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
    },
    uploadRow: { display: 'flex', alignItems: 'center', gap: '15px' },
    msgError: { background: 'rgba(255,0,0,0.2)', color: '#ff8a80', padding: '10px', marginTop: '10px', borderRadius: '4px' },
    msgSuccess: { background: 'rgba(0,255,0,0.1)', color: '#a5d6a7', padding: '10px', marginTop: '10px', borderRadius: '4px' },

    // Tablo
    tableWrapper: { overflowX: 'auto', marginBottom: '10px' },
    rawTable: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' },
    thRowNum: { background: '#222', padding: '5px', color: '#777' },
    thCol: { background: '#333', padding: '8px', color: '#fff', minWidth: '40px' },
    thRowNum: { background: '#333', padding: '4px', color: '#aaa', minWidth: '20px', textAlign: 'center' },
    tdRowNum: { background: '#252525', padding: '5px', color: '#666', textAlign: 'center' },
    tdCell: { border: '1px solid #444', padding: '6px', textAlign: 'center' },

    // Ayarlar
    settingRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' },
    inputNum: { background: '#111', border: '1px solid #555', color: '#fff', padding: '5px', width: '60px' },
    mappingList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto' },
    mappingGroup: { background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px' },
    groupTitle: { fontWeight: 'bold', marginBottom: '5px', color: '#90caf9' },
    groupRow: { display: 'flex', gap: '10px' },
    pair: { display: 'flex', flexDirection: 'column', flex: 1, gap: '2px', fontSize: '11px' },
    select: { background: '#222', color: '#fff', border: '1px solid #555', padding: '5px' },
    badgeInfo: { background: 'rgba(0,100,255,0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' },
    note: { fontSize: '11px', color: '#aaa', fontStyle: 'italic' },
    matrixWrapper: { overflowX: 'auto', border: '1px solid #444' }
};
