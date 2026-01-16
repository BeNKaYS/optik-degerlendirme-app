/**
 * @file AnswerKeyTab.jsx
 * @description Cevap Anahtarı Yönetimi (Raw Grid / Sağlam Mod)
 * @author Sercan ÖZDEMİR
 * @date 2026-01-15
 */

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { answerKeyStyles } from './answerKeyStyles';

export default function AnswerKeyTab({ data, setData, attendanceData, onNext, onSave }) {
    // Inject styles
    useEffect(() => {
        const styleId = 'answer-key-modern-styles';
        if (!document.getElementById(styleId)) {
            const styleTag = document.createElement('style');
            styleTag.id = styleId;
            styleTag.textContent = answerKeyStyles;
            document.head.appendChild(styleTag);
        }
    }, []);
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
            <div className="answer-key-header">
                <div className="header-top">
                    <div className="header-title-section">
                        <span className="header-icon">📚</span>
                        <div>
                            <h2 className="header-title">Cevap Anahtarı Yükle</h2>
                            <p className="header-subtitle">Excel dosyasından otomatik cevap anahtarı oluşturun</p>
                        </div>
                    </div>
                    <div className="doc-type-badge">
                        <span className="badge-icon">📋</span>
                        <span className="badge-text">{docTypes.length > 0 ? `${docTypes.length} Belge Türü` : "Belge Türü Yok"}</span>
                    </div>
                </div>

                <div className="upload-section">
                    <button onClick={handleFileUpload} className="upload-btn" disabled={loading}>
                        <span className="btn-icon">📁</span>
                        <span className="btn-text">{loading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}</span>
                    </button>
                    {fileName && (
                        <div className="file-selected">
                            <span className="file-icon">✓</span>
                            <span className="file-name">{fileName}</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span className="alert-icon">⚠️</span>
                        <span className="alert-text">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="alert alert-success">
                        <span className="alert-icon">✅</span>
                        <span className="alert-text">{success}</span>
                    </div>
                )}
            </div>

            {/* ORTA: HARİTALAMA (Sadece Raw Grid Varsa) */}
            {rawGrid.length > 0 && (
                <div style={styles.bodyGrid}>
                    {/* SOL: ÖNİZLEME */}
                    <div className="preview-card">
                        <div className="card-header-modern">
                            <span className="card-icon">🔍</span>
                            <h4 className="card-title">Veri Önizleme</h4>
                            <span className="card-badge">İlk 5 Satır</span>
                        </div>
                        <div className="modern-table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th className="th-row-num">#</th>
                                        {columns.map(c => (
                                            <th key={c} className="th-column">{c}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawGrid.slice(0, 5).map((row, idx) => (
                                        <tr key={idx} className="table-row">
                                            <td className="td-row-num">{idx + 1}</td>
                                            {columns.map(c => (
                                                <td key={c} className="td-cell">
                                                    {row[c] || ''}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="table-note">
                            <span className="note-icon">💡</span>
                            <span>Tablo harf sütunları (A, B, C...) olarak okundu. Kitapçıkları manuel eşleştirin.</span>
                        </div>
                    </div>

                    {/* SAĞ: AYARLAR */}
                    <div className="mapping-card">
                        <div className="card-header-modern">
                            <span className="card-icon">⚙️</span>
                            <h4 className="card-title">Eşleştirme Ayarları</h4>
                        </div>

                        <div className="start-row-input">
                            <label className="input-label">
                                <span className="label-icon">📍</span>
                                <span>Cevaplar kaçıncı satırdan başlıyor?</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={startRow}
                                onChange={(e) => setStartRow(parseInt(e.target.value) || 1)}
                                className="number-input"
                            />
                        </div>

                        <div className="mapping-container">
                            {docTypes.map(dtype => (
                                <div key={dtype} className="mapping-item">
                                    <div className="mapping-header">
                                        <span className="mapping-icon">📄</span>
                                        <span className="mapping-title">{dtype}</span>
                                    </div>
                                    <div className="mapping-selects">
                                        <div className="select-group">
                                            <label className="select-label">A Kitapçığı:</label>
                                            <select
                                                className="modern-select"
                                                value={mappings[`${dtype}_A`] || ''}
                                                onChange={(e) => handleMappingChange(`${dtype}_A`, e.target.value)}
                                            >
                                                <option value="">Seçiniz</option>
                                                {columns.map(c => <option key={c} value={c}>Sütun {c}</option>)}
                                            </select>
                                        </div>
                                        <div className="select-group">
                                            <label className="select-label">B Kitapçığı:</label>
                                            <select
                                                className="modern-select"
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

                        <button onClick={handleGenerate} className="generate-btn">
                            <span className="btn-icon">⚡</span>
                            <span>Cevap Anahtarı Oluştur</span>
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
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        height: '100%',
        overflowY: 'auto'
    },
    card: {
        background: 'var(--bg-secondary)',
        border: 'var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        padding: '20px',
        borderRadius: '12px'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        borderBottom: '1px solid var(--bg-tertiary)',
        paddingBottom: '10px'
    },
    bodyGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '20px'
    },
    btnPrimary: {
        background: 'var(--accent)', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
    },
    btnSecondary: {
        background: 'var(--warning)', color: 'white', padding: '12px', width: '100%', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
    },
    btnFinal: {
        background: 'var(--success)', color: 'white', padding: '15px 30px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
    },
    uploadRow: { display: 'flex', alignItems: 'center', gap: '15px' },
    msgError: { background: '#fee2e2', color: '#b91c1c', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #fecaca', fontSize: '14px' },
    msgSuccess: { background: '#dcfce7', color: '#15803d', padding: '12px', marginTop: '10px', borderRadius: '8px', border: '1px solid #bbf7d0', fontSize: '14px' },

    // Table Styles
    tableWrapper: { overflowX: 'auto', marginBottom: '10px', borderRadius: '8px', border: 'var(--glass-border)' },
    rawTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'var(--bg-secondary)' },
    thRowNum: { background: 'var(--bg-tertiary)', padding: '10px', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' },
    thCol: { background: 'var(--bg-secondary)', padding: '10px', color: 'var(--text-primary)', minWidth: '40px', fontWeight: '600', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' },
    tdRowNum: { background: 'var(--bg-tertiary)', padding: '8px', color: 'var(--text-secondary)', textAlign: 'center', borderRight: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)' },
    tdCell: { border: '1px solid var(--glass-border)', padding: '8px', textAlign: 'center', color: 'var(--text-primary)' },

    // Settings
    settingRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' },
    inputNum: { background: 'var(--bg-secondary)', border: '1px solid #cbd5e1', color: 'var(--text-primary)', padding: '8px', width: '70px', borderRadius: '6px', textAlign: 'center' },
    mappingList: { display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' },
    mappingGroup: { background: 'var(--bg-tertiary)', padding: '15px', borderRadius: '8px', border: 'var(--glass-border)' },
    groupTitle: { fontWeight: '600', marginBottom: '10px', color: 'var(--accent)', fontSize: '14px' },
    groupRow: { display: 'flex', gap: '10px', marginBottom: '5px' },
    pair: { display: 'flex', flexDirection: 'column', flex: 1, gap: '4px', fontSize: '12px' },
    select: { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid #cbd5e1', padding: '6px', borderRadius: '6px', width: '100%' },
    badgeInfo: { background: 'var(--bg-primary)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid #cbd5e1' },
    note: { fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '5px' },
    matrixWrapper: { overflowX: 'auto', border: 'var(--glass-border)', borderRadius: '8px', marginTop: '10px' }
};
