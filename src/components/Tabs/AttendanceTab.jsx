/**
 * @file AttendanceTab.jsx
 * @description Sınav değerlendirmesi için referans alınacak yoklama listesini (Excel) yükleyen bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState, useEffect } from 'react';
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

    // -------------------------------------------------------------------------
    //  PERSISTENCE (Kalıcılık)
    // -------------------------------------------------------------------------
    useEffect(() => {
        // 1. Mount olduğunda LocalStorage'dan veri var mı kontrol et
        const savedFileName = localStorage.getItem('attendance_file_name');
        const savedDataStr = localStorage.getItem('attendance_data');

        if (savedFileName) {
            setFileName(savedFileName);
        }

        // Eğer App.jsx'te data yoksa ama storage'da varsa, storage'dan yükle
        if (savedDataStr && (!data || data.length === 0)) {
            try {
                const parsedData = JSON.parse(savedDataStr);
                setData(parsedData);
            } catch (e) {
                console.error("Kayıtlı yoklama verisi okunamadı:", e);
            }
        }
    }, [data, setData]);



    // Data değiştiğinde (ve boş değilse) storage'ı güncelle (handleFileUpload içinde de yapabiliriz ama burası daha garanti)
    // ANCAK: App.jsx'ten silindiğinde storage'dan da silinmesini istemiyorsak dikkatli olmalıyız.
    // Kullanıcı açıkça "X" ile sildiğinde storage temizlenmeli.
    // Dosya yüklendiğinde storage güncellenmeli.
    // Bu yüzden useEffect yerine handler'lar içinde yönetmek daha güvenli olabilir.

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
                const name = filePath.split(/[/\\]/).pop();
                setFileName(name);
                const jsonData = await readExcel(filePath);

                if (!jsonData || jsonData.length === 0) {
                    throw new Error("Dosya içeriği boş.");
                }

                // Basit bir doğrulama: Sütun adlarını kontrol et
                const headers = Object.keys(jsonData[0]);
                const tcColumn = headers.find(h => h.toLowerCase().includes('tc') || h.toLowerCase().includes('kimlik'));

                if (!tcColumn) {
                    console.warn("TC Kimlik sütunu otomatik tespit edilemedi.");
                }

                setData(jsonData);

                // KALICILIK: Kaydet
                localStorage.setItem('attendance_file_name', name);
                localStorage.setItem('attendance_data', JSON.stringify(jsonData));


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
                {fileName && (
                    <span className="file-name">
                        Seçilen: {fileName}
                        <button
                            className="remove-file-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setFileName('');
                                setData(null);
                                // KALICILIK: Sil
                                localStorage.removeItem('attendance_file_name');
                                localStorage.removeItem('attendance_data');
                            }}
                            title="Dosyayı Kaldır"
                        >
                            ✕
                        </button>
                    </span>
                )}
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
                                    {/* Tüm satırlardaki benzersiz anahtarları (sütunları) bul */}
                                    {Array.from(new Set(data.flatMap(row => Object.keys(row)))).map((header, i) => (
                                        <th key={i}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => (
                                    <tr key={i}>
                                        {Array.from(new Set(data.flatMap(r => Object.keys(r)))).map((header, j) => (
                                            <td key={j}>{row[header] || ''}</td>
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
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .remove-file-btn {
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 50%;
            width: 18px;
            height: 18px;
            font-size: 0.7rem;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        .remove-file-btn:hover {
            background: #dc2626;
            transform: scale(1.1);
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
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            margin-bottom: 15px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        th {
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%);
            padding: 16px;
            text-align: left;
            font-weight: 700;
            color: #0f172a;
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(0, 0, 0, 0.1);
        }
        td {
            padding: 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.05);
            color: #1e293b;
            font-weight: 500;
        }
        tr:hover td {
            background: rgba(102, 126, 234, 0.05);
            color: #0f172a;
        }
        .text-small {
            font-size: 0.8rem;
            color: #64748b;
        }
        .footer-actions {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
      `}</style>
        </div>
    );
}
