/**
 * @file AnswerKeyLoaderTab.jsx
 * @description Excel'den cevap anahtarı yükleme (Raw Grid / Sağlam Mod)
 * @author Sercan ÖZDEMİR
 * @date 2026-01-15
 */

import { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function AnswerKeyLoaderTab({ attendanceData, onApplyAnswerKey }) {
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

    // Sonuç
    const [generatedKeys, setGeneratedKeys] = useState(null);

    // 1. Belge Türlerini Çıkar (Yoklama Listesinden)
    const docTypes = useMemo(() => {
        if (!attendanceData || attendanceData.length === 0) return [];
        const types = new Set();
        attendanceData.forEach(row => {
            const val = row['BELGE TÜRÜ'] || row['Belge Türü'] || row['belgeTuru'] || row['BelgeTuru'];
            if (val && String(val).trim()) {
                types.add(String(val).trim().toUpperCase());
            }
        });
        return Array.from(types).sort();
    }, [attendanceData]);

    // 2. Excel Yükleme İşlemi (Raw Mode)
    const handleFileUpload = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        setRawGrid([]);
        setGeneratedKeys(null);
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
            // Bu sayede başlık karmaşası, boş başlıklar vs. hiçbiri sorun olmuyor.
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: "A", defval: "" });

            if (jsonData.length === 0) {
                throw new Error("Excel boş görünüyor.");
            }

            // Sütunları belirle (İlk satırdaki keys)
            // { A: "...", B: "..." }
            const allKeys = new Set();
            jsonData.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)));
            const sortedCols = Array.from(allKeys).sort((a, b) => {
                // Harf sıralaması (A, B ... AA, AB) excel mantığına göre yapılabilir
                // Basit string sort AA'yı B'den önce koyar, ama şimdilik yeterli.
                // İdeal: XLSX sütun decode. Ama basitçe uzunluk sonra alfabetik.
                if (a.length === b.length) return a.localeCompare(b);
                return a.length - b.length;
            });

            setRawGrid(jsonData);
            setColumns(sortedCols);
            setSuccess(`✅ Dosya okundu: ${jsonData.length} satır.`);

            // Akıllı Başlangıç Satırı Tahmini
            // Genelde ilk birkaç satır başlık olur. Sayısal veri içeren ilk satırı bulmaya çalışalım.
            // Veya varsayılan 2. satır (ilki başlıktır).
            // Kullanıcıya bırakıyoruz ama varsayılanı 2 yapıyoruz.

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

    // 4. Cevap Dönüştürücü (1->A, A->A)
    const parseAnswer = (val) => {
        if (!val) return '';
        const str = String(val).trim().toUpperCase();
        if (/^[A-E]$/.test(str)) return str;
        if (/^[1-5]$/.test(str)) return String.fromCharCode(64 + parseInt(str)); // 1->A
        // 1A, 2B formatı
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

        const keys = {}; // { SRC1: { A: "...", B: "..." } }
        let hasData = false;

        // RawGrid'i gez
        // startRow 1-based, array 0-based. O yüzden startRow-1.
        const startIndex = Math.max(0, startRow - 1);

        docTypes.forEach(docType => {
            ['A', 'B'].forEach(booklet => {
                const mapKey = `${docType}_${booklet}`;
                const col = mappings[mapKey];

                if (col) {
                    let answers = "";
                    for (let i = startIndex; i < rawGrid.length; i++) {
                        const row = rawGrid[i];
                        const val = row[col]; // Örn: row['C']
                        const parsed = parseAnswer(val);
                        if (parsed) answers += parsed;
                    }

                    if (answers.length > 0) {
                        if (!keys[docType]) keys[docType] = {};
                        keys[docType][booklet] = answers;
                        hasData = true;
                    }
                }
            });
        });

        if (!hasData) {
            setError("Seçilen sütunlardan ve başlama satırından itibaren geçerli cevap verisi bulunamadı.");
            return;
        }

        setGeneratedKeys(keys);
        setSuccess("✅ Cevap anahtarı oluşturuldu! Aşağıdaki matrisi kontrol edip kaydedin.");
    };

    const handleSave = () => {
        if (onApplyAnswerKey && generatedKeys) {
            onApplyAnswerKey(generatedKeys);
        }
    };

    return (
        <div style={styles.container}>
            {/* ÜST KISIM: YÜKLEME */}
            <div style={styles.card}>
                <div style={styles.cardHeader}>
                    <h3>📂 Adım 1: Excel Yükle (Sağlam Mod)</h3>
                    <div style={styles.badgeInfo}>
                        {docTypes.length > 0 ? `${docTypes.length} Belge Türü Bekleniyor` : "Yoklama listesi yok!"}
                    </div>
                </div>
                <div style={styles.uploadRow}>
                    <button onClick={handleFileUpload} style={styles.btnPrimary} disabled={loading}>
                        {loading ? 'Yükleniyor...' : '📁 Excel Seç'}
                    </button>
                    {fileName && <span style={{ color: '#4caf50' }}>{fileName}</span>}
                </div>
                {error && <div style={styles.msgError}>{error}</div>}
                {success && <div style={styles.msgSuccess}>{success}</div>}
            </div>

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
                            * Tablo yukarıdaki gibi A, B, C... sütunları olarak okunmuştur.
                            Cevaplarınızın hangi harfte olduğunu buradan bakarak sağ taraftan seçiniz.
                        </div>
                    </div>

                    {/* SAĞ: AYARLAR */}
                    <div style={{ ...styles.card, flex: 1, minWidth: '300px' }}>
                        <div style={styles.cardHeader}>
                            <h4>⚙️ Adım 2: Eşleştirme</h4>
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

            {/* ALT: SONUÇ MATRİSİ */}
            {generatedKeys && (
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <h3>📋 Adım 3: Kontrol ve Kayıt</h3>
                    </div>
                    <div style={styles.matrixWrapper}>
                        <table style={styles.rawTable}>
                            <thead>
                                <tr>
                                    <th style={styles.thCol}>Belge / Kitapçık</th>
                                    {Array.from({ length: 40 }).map((_, i) => (
                                        <th key={i} style={styles.thRowNum}>{i + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {docTypes.map(dtype => (
                                    ['A', 'B'].map(book => {
                                        const ans = generatedKeys[dtype]?.[book];
                                        if (!ans) return null;
                                        return (
                                            <tr key={`${dtype}_${book}`}>
                                                <td style={{ ...styles.tdCell, fontWeight: 'bold' }}>
                                                    {dtype} ({book})
                                                </td>
                                                {Array.from({ length: 40 }).map((_, i) => (
                                                    <td key={i} style={styles.tdCell}>
                                                        {ans[i] || ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '15px' }}>
                        <button onClick={handleSave} style={styles.btnFinal}>
                            💾 SİSTEME KAYDET
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
