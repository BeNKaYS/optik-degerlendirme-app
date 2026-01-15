/**
 * @file AttendanceTab.jsx
 * @description Sınav değerlendirmesi için referans alınacak yoklama listesini (Excel) yükleyen bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState } from 'react';
import { readExcel } from '../../utils/excelHelper';

// ==========================================
//  BİLEŞEN TANIMI
// ==========================================
export default function AttendanceTab({ data, setData, onNext }) {

    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ
    // -------------------------------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');

    // -------------------------------------------------------------------------
    //  İŞLEYİCİLER (HANDLERS)
    // -------------------------------------------------------------------------

    /**
     * Excel dosyasını seçer ve içeriğini JSON formatına çevirir.
     * TC Kimlik sütunu gibi kritik verileri kontrol edebilir.
     */
    const handleFileUpload = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!window.api) {
                throw new Error("Electron API bulunamadı. Lütfen uygulamayı Electron modunda çalıştırın.");
            }
            const filePath = await window.api.selectFile([{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]);
            if (filePath) {
                setFileName(filePath.split(/[/\\]/).pop());
                const jsonData = await readExcel(filePath);

                if (!jsonData || jsonData.length === 0) {
                    throw new Error("Dosya içeriği boş.");
                }

                // Basit bir doğrulama: Sütun adlarını kontrol et
                const headers = Object.keys(jsonData[0]);
                // Gerçek hayat senaryosu için TC kimlik sütununu bulmaya çalışabiliriz
                const tcColumn = headers.find(h => h.toLowerCase().includes('tc') || h.toLowerCase().includes('kimlik'));

                if (!tcColumn) {
                    // Uyarı verebiliriz ama yine de yükleyelim
                    console.warn("TC Kimlik sütunu otomatik tespit edilemedi.");
                }

                setData(jsonData);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            {/* Başlık Alanı */}
            <div className="tab-header">
                <h2>Yoklama Listesi Yükleme</h2>
                <p className="text-secondary">Sınav değerlendirmesi için referans alınacak aday listesini yükleyin.</p>
            </div>

            {/* Dosya Seçim Alanı */}
            <div className="action-area">
                <button className="primary-btn" onClick={handleFileUpload} disabled={loading}>
                    {loading ? 'Yükleniyor...' : 'Excel Dosyası Seç'}
                </button>
                {fileName && <span className="file-name">Seçilen: {fileName}</span>}
            </div>

            {error && (
                <div className="alert error">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Önizleme Alanı (Tablo) */}
            {data && data.length > 0 && (
                <div className="preview-area">
                    <h3>Önizleme ({data.length} Kayıt)</h3>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    {Object.keys(data[0]).map((header, i) => (
                                        <th key={i}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i}>
                                        {Object.values(row).map((val, j) => (
                                            <td key={j}>{val}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="footer-actions">
                        <button className="primary-btn" onClick={onNext}>
                            Devam Et &rarr;
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        .action-area {
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        .file-name {
            font-size: 0.9em;
            color: var(--accent);
            background: rgba(99, 102, 241, 0.1);
            padding: 5px 10px;
            border-radius: 4px;
        }
        .alert.error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid var(--error);
            color: var(--error);
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .preview-area {
            margin-top: 30px;
            animation: fadeIn 0.5s ease;
        }
        .table-wrapper {
            overflow-x: auto;
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        th, td {
            text-align: left;
            padding: 12px 15px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        th {
            background: rgba(255, 255, 255, 0.05);
            font-weight: 600;
            color: var(--text-primary);
        }
        td {
            color: var(--text-secondary);
        }
        tr:hover td {
            background: rgba(255, 255, 255, 0.02);
            color: var(--text-primary);
        }
        .text-small {
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .footer-actions {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
<<<<<<< HEAD

        /* ===== LIGHT MODE STYLES ===== */
        .light-mode .table-wrapper {
            border-color: rgba(0,0,0,0.1);
        }
        .light-mode th {
            background: #f1f5f9;
            color: #1e293b;
            border-bottom: 2px solid rgba(0,0,0,0.1);
        }
        .light-mode td {
            color: #334155;
            border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .light-mode tr:hover td {
            background: rgba(0,0,0,0.02);
            color: #0f172a;
        }
=======
>>>>>>> 26b94059835dcda23ecf6dbacb5943af28eddba8
      `}</style>
        </div>
    );
}
