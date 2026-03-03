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

    // Manuel giriş
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [manualDocType, setManualDocType] = useState('GENEL');
    const [manualQuestionCount, setManualQuestionCount] = useState(40);
    const [manualAnswersByType, setManualAnswersByType] = useState({}); // { "SRC1_A": "ABC...", "SRC1_B": "..." }
    const [manualCursorByType, setManualCursorByType] = useState({}); // { "SRC1_A": { pos, answerIndex } }

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

    const parseManualAnswers = (input, questionCount) => {
        const clean = String(input || '').toUpperCase().replace(/[^A-E1-5]/g, '');
        const parsed = clean
            .split('')
            .map((char) => parseAnswer(char))
            .filter(Boolean)
            .slice(0, questionCount);

        const answersObj = {};
        parsed.forEach((ans, idx) => {
            answersObj[idx + 1] = ans;
        });

        return answersObj;
    };

    const handleManualInputChange = (docType, booklet, value) => {
        const key = `${docType}_${booklet}`;
        setManualAnswersByType(prev => ({ ...prev, [key]: value }));
    };

    const handleManualCursorInfo = (docType, booklet, value, cursorPos) => {
        const key = `${docType}_${booklet}`;
        const safePos = Math.max(0, Number(cursorPos) || 0);
        const beforeCursor = String(value || '').slice(0, safePos);
        const validBeforeCursor = beforeCursor.toUpperCase().replace(/[^A-E1-5]/g, '').length;
        const answerIndex = Math.min((Number(manualQuestionCount) || 1), validBeforeCursor + 1);

        setManualCursorByType(prev => ({
            ...prev,
            [key]: {
                pos: safePos + 1,
                answerIndex
            }
        }));
    };

    const getManualStats = (docType, booklet) => {
        const key = `${docType}_${booklet}`;
        const rawValue = String(manualAnswersByType[key] || '');
        const validCountRaw = rawValue.toUpperCase().replace(/[^A-E1-5]/g, '').length;
        const validCount = Math.min(validCountRaw, Number(manualQuestionCount) || 0);
        const cursor = manualCursorByType[key] || { pos: 1, answerIndex: 1 };

        return {
            validCount,
            cursor
        };
    };

    const handleManualGenerate = () => {
        setError(null);
        setSuccess(null);

        const qCount = Math.max(1, Math.min(300, Number(manualQuestionCount) || 40));

        const fallbackDocType = String(manualDocType || '').trim().toUpperCase();
        const targetDocTypes = docTypes.length > 0
            ? docTypes
            : (fallbackDocType ? [fallbackDocType] : []);

        if (targetDocTypes.length === 0) {
            setError('Belge türü bulunamadı. Lütfen manuel belge türü giriniz.');
            return;
        }

        const keys = { A: {}, B: {} };
        let hasManualData = false;

        targetDocTypes.forEach((dtype) => {
            const aRaw = manualAnswersByType[`${dtype}_A`] || '';
            const bRaw = manualAnswersByType[`${dtype}_B`] || '';
            const aAnswers = parseManualAnswers(aRaw, qCount);
            const bAnswers = parseManualAnswers(bRaw, qCount);

            if (Object.keys(aAnswers).length > 0) {
                keys.A[dtype] = { ...aAnswers };
                hasManualData = true;
            }
            if (Object.keys(bAnswers).length > 0) {
                keys.B[dtype] = { ...bAnswers };
                hasManualData = true;
            }
        });

        if (!hasManualData) {
            setError('Manuel giriş için en az bir belge türünde A veya B kitapçığına cevap giriniz.');
            return;
        }

        setGeneratedKeys(keys);
        setIsEditing(true);
        setSuccess('✅ Manuel cevap anahtarı oluşturuldu. Aşağıdaki tablodan düzenleyip kaydedebilirsiniz.');
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

                    <button
                        onClick={() => setShowManualEntry(prev => !prev)}
                        className="upload-btn manual-btn"
                        disabled={loading}
                    >
                        <span className="btn-icon">✍️</span>
                        <span className="btn-text">{showManualEntry ? 'Manuel Alanı Kapat' : 'Manuel Cevap Gir'}</span>
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

            {/* MANUEL GİRİŞ PANELİ */}
            {showManualEntry && (
                <div className="manual-section">
                    <div className="manual-section-header">
                        <h3>✍️ Manuel Cevap Girişi</h3>
                        <div className="manual-section-controls">
                            {docTypes.length === 0 && (
                                <input
                                    type="text"
                                    value={manualDocType}
                                    onChange={(e) => setManualDocType(e.target.value)}
                                    placeholder="Belge Türü (Örn: GENEL)"
                                    className="manual-input"
                                />
                            )}
                            <input
                                type="number"
                                min="1"
                                max="300"
                                value={manualQuestionCount}
                                onChange={(e) => setManualQuestionCount(parseInt(e.target.value) || 1)}
                                className="manual-input manual-input-short"
                                title="Soru Sayısı"
                            />
                            <button onClick={handleManualGenerate} className="generate-btn manual-generate-btn">
                                <span className="btn-icon">⚡</span>
                                <span>Manuel Anahtar Oluştur</span>
                            </button>
                        </div>
                    </div>

                    <div className="manual-cards">
                        {(docTypes.length > 0 ? docTypes : [String(manualDocType || '').trim().toUpperCase() || 'GENEL']).map((dtype) => (
                            <div key={dtype} className="mapping-item manual-card">
                                <div className="mapping-header">
                                    <span className="mapping-icon">📄</span>
                                    <span className="mapping-title">{dtype}</span>
                                </div>

                                <div className="mapping-selects manual-input-grid">
                                    <div className="select-group">
                                        <label className="select-label">A Kitapçığı:</label>
                                        {(() => {
                                            const stats = getManualStats(dtype, 'A');
                                            return (
                                                <div className="manual-text-meta">
                                                    <span>{`Cevap: ${stats.validCount}/${manualQuestionCount}`}</span>
                                                    <span>{`CEVAP: ${stats.cursor.answerIndex}`}</span>
                                                </div>
                                            );
                                        })()}
                                        <input
                                            type="text"
                                            className="manual-text-input"
                                            value={manualAnswersByType[`${dtype}_A`] || ''}
                                            onChange={(e) => handleManualInputChange(dtype, 'A', e.target.value)}
                                            onClick={(e) => handleManualCursorInfo(dtype, 'A', e.target.value, e.target.selectionStart)}
                                            onKeyUp={(e) => handleManualCursorInfo(dtype, 'A', e.target.value, e.target.selectionStart)}
                                            onSelect={(e) => handleManualCursorInfo(dtype, 'A', e.target.value, e.target.selectionStart)}
                                            placeholder="A-E veya 1-5 (örn: A B C D E)"
                                        />
                                    </div>
                                    <div className="select-group">
                                        <label className="select-label">B Kitapçığı:</label>
                                        {(() => {
                                            const stats = getManualStats(dtype, 'B');
                                            return (
                                                <div className="manual-text-meta">
                                                    <span>{`Cevap: ${stats.validCount}/${manualQuestionCount}`}</span>
                                                    <span>{`CEVAP: ${stats.cursor.answerIndex}`}</span>
                                                </div>
                                            );
                                        })()}
                                        <input
                                            type="text"
                                            className="manual-text-input"
                                            value={manualAnswersByType[`${dtype}_B`] || ''}
                                            onChange={(e) => handleManualInputChange(dtype, 'B', e.target.value)}
                                            onClick={(e) => handleManualCursorInfo(dtype, 'B', e.target.value, e.target.selectionStart)}
                                            onKeyUp={(e) => handleManualCursorInfo(dtype, 'B', e.target.value, e.target.selectionStart)}
                                            onSelect={(e) => handleManualCursorInfo(dtype, 'B', e.target.value, e.target.selectionStart)}
                                            placeholder="A-E veya 1-5 (örn: B C D E A)"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="manual-help-text">
                        Manuel girişte harf veya sayı kullanabilirsiniz (A-E / 1-5). Sistem otomatik dönüştürür.
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
