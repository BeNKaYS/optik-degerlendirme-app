/**
 * @file ExamsTab.jsx
 * @description Sınavların oluşturulduğu, listelendiği ve yüklendiği ana yönetim ekranı.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState, useEffect } from 'react';

// ==========================================
//  BİLEŞEN TANIMI
// ==========================================
export default function ExamsTab({
    currentData,
    onLoadExam,
    onStartExam,
    onDeleteExam
}) {
    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ
    // -------------------------------------------------------------------------
    const [exams, setExams] = useState([]);
    const [examName, setExamName] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    // -------------------------------------------------------------------------
    //  YARDIMCI ENDPOİNTS VEYA MANTIK
    // -------------------------------------------------------------------------

    /**
     * Sınav listesini backend'den (dosya sistemi) çeker.
     */
    const refreshExams = async () => {
        if (!window.api?.getExams) return;
        setLoading(true);
        try {
            const list = await window.api.getExams();
            // Tarihe göre tersten sırala (En yeni en üstte)
            list.sort((a, b) => b.timestamp - a.timestamp);
            setExams(list);
        } catch (e) {
            console.error(e);
            setMsg({ type: 'error', text: 'Sınav listesi alınamadı. Lütfen uygulamayı yeniden başlatın.' });
        } finally {
            setLoading(false);
        }
    };

    // İlk açılışta listeyi çek
    useEffect(() => {
        refreshExams();
    }, []);

    // -------------------------------------------------------------------------
    //  İŞLEYİCİLER (HANDLERS)
    // -------------------------------------------------------------------------

    /**
     * Yeni sınav başlatma süreci.
     * 1. Boş bir sınav objesi oluşturur.
     * 2. Backend'e kaydeder.
     * 3. Uygulama state'ini günceller ve kullanıcıyı Yoklama sekmesine yönlendirir.
     */
    const handleStart = async () => {
        if (!examName.trim()) {
            setMsg({ type: 'error', text: 'Lütfen bir sınav adı girin.' });
            return;
        }

        setLoading(true);
        try {
            // Tarih etiketi ekle
            const today = new Date();
            const dateStr = `${String(today.getDate()).padStart(2, '0')}_${String(today.getMonth() + 1).padStart(2, '0')}_${today.getFullYear()}`;
            const finalName = `${examName} _${dateStr}`;

            // Boş sınav yapısı
            const newExam = {
                id: Date.now().toString(),
                name: finalName,
                timestamp: Date.now(),
                data: {}
            };

            // Veritabanına kaydet
            if (window.api?.saveExam) {
                await window.api.saveExam(newExam);
            }

            // Global State'e bildir - tam objeyi gönder
            onStartExam(newExam);

            setMsg({ type: 'success', text: `"${finalName}" oluşturuldu. Başlıyor...` });
            setExamName('');
            await refreshExams();
        } catch (e) {
            setMsg({ type: 'error', text: 'Oluşturma hatası: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Sınav kaydını siler.
     */
    const handleDelete = async (id) => {
        if (!confirm('Bu sınav kaydını silmek istediğinize emin misiniz?')) return;
        try {
            await window.api.deleteExam(id);
            await refreshExams();
        } catch (e) {
            setMsg({ type: 'error', text: 'Silme işlemi başarısız.' });
        }
    };

    /**
     * Sınav verilerini yükler (tam veriyi çeker).
     */
    const handleLoadExam = async (examId) => {
        setLoading(true);
        try {
            const fullExam = await window.api.getExamById(examId);
            if (fullExam) {
                onLoadExam(fullExam);
            } else {
                setMsg({ type: 'error', text: 'Sınav verisi bulunamadı.' });
            }
        } catch (e) {
            setMsg({ type: 'error', text: 'Sınav yüklenemedi: ' + e.message });
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            <div className="tab-header">
                <h2>Sınav Yönetimi</h2>
                <p className="text-secondary">Yeni bir sınav başlatın veya kayıtlı sınavları yönetin.</p>
            </div>

            {/* Yeni Sınav Başlatma Alanı */}
            <div className="save-section">
                <h3>Yeni Sınav Başlat</h3>
                <div className="input-group">
                    <input
                        type="text"
                        placeholder="Sınav Adı (Örn: SRC Kızıltepe)"
                        value={examName}
                        onChange={(e) => setExamName(e.target.value)}
                        className="glass-input"
                    />
                    <button
                        className="primary-btn"
                        onClick={handleStart}
                        disabled={loading}
                    >
                        {loading ? 'Oluşturuluyor...' : 'BAŞLA'}
                    </button>
                </div>
                <div className="save-info">
                    <small className="text-secondary">
                        "BAŞLA" butonuna tıkladığınızda sınav oluşturulur ve Yoklama Listesi adımına yönlendirilirsiniz.
                        Değerlendirme sonucunda veriler otomatik olarak kaydedilir.
                    </small>
                </div>
            </div>

            {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

            <div className="divider"></div>

            {/* Sınav Listesi */}
            <div className="list-section">
                <h3>Kayıtlı Sınavlar</h3>
                {exams.length === 0 ? (
                    <div className="empty-state">Henüz kayıtlı sınav bulunmuyor.</div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Sınav Adı</th>
                                    <th>Kayıt Tarihi</th>
                                    <th>Veri Durumu</th>
                                    <th style={{ textAlign: 'right' }}>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exams.map(exam => {
                                    // Yeni yapı: meta bilgiler doğrudan exam objesinde
                                    const hasAtt = exam.hasAttendance;
                                    const hasOpt = exam.hasOptical;
                                    const hasKey = exam.hasAnswerKey;
                                    const hasRes = exam.hasResults;

                                    return (
                                        <tr key={exam.id}>
                                            <td className="font-bold">{exam.name}</td>
                                            <td className="text-secondary">
                                                {new Date(exam.timestamp).toLocaleString('tr-TR')}
                                            </td>
                                            <td>
                                                <div className="data-badges">
                                                    {hasAtt && <span className="badge badge-blue">Yoklama</span>}
                                                    {hasOpt && <span className="badge badge-green">Optik</span>}
                                                    {hasKey && <span className="badge badge-purple">Anahtar</span>}
                                                    {hasRes && <span className="badge badge-orange">Sonuç</span>}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <button
                                                    className="action-btn load-btn"
                                                    onClick={() => handleLoadExam(exam.id)}
                                                    title="Yükle"
                                                >
                                                    📂 Yükle
                                                </button>
                                                <button
                                                    className="action-btn delete-btn"
                                                    onClick={() => handleDelete(exam.id)}
                                                    title="Sil"
                                                >
                                                    🗑️ Sil
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style>{`
                .save-section {
                    background: rgba(255, 255, 255, 0.03);
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .input-group {
                    display: flex;
                    gap: 15px;
                    margin: 15px 0 5px 0;
                }
                .glass-input {
                    flex: 1;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 12px 15px;
                    border-radius: 8px;
                    color: white;
                    font-size: 1rem;
                }
                .glass-input:focus {
                    outline: none;
                    border-color: var(--accent);
                }
                .divider {
                    height: 1px;
                    background: rgba(255, 255, 255, 0.1);
                    margin: 30px 0;
                }
                .table-wrapper {
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    overflow: hidden;
                }
                table { width: 100%; border-collapse: collapse; }
                th { background: rgba(0, 0, 0, 0.3); padding: 15px; text-align: left; font-weight: 600; color: var(--text-secondary); }
                td { padding: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                tr:last-child td { border-bottom: none; }
                tr:hover { background: rgba(255, 255, 255, 0.02); }

                .data-badges { display: flex; gap: 5px; flex-wrap: wrap; }
                .badge { padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
                .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
                .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; }
                .badge-purple { background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
                .badge-orange { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

                .action-btn {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 5px 10px;
                    border-radius: 4px;
                    transition: all 0.2s;
                    margin-left: 5px;
                }
                .load-btn:hover { background: rgba(59, 130, 246, 0.2); }
                .delete-btn:hover { background: rgba(239, 68, 68, 0.2); }

                .alert { padding: 12px; border-radius: 6px; margin-top: 15px; }
                .alert.success { background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
                .alert.error { background: rgba(239, 68, 68, 0.1); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .text-secondary { color: rgba(255, 255, 255, 0.6); }

                /* ===== LIGHT MODE STYLES ===== */
                .light-mode .save-section {
                    background: rgba(0,0,0,0.02);
                    border-color: rgba(0,0,0,0.1);
                }
                .light-mode .glass-input {
                    background: #ffffff;
                    border-color: rgba(0,0,0,0.2);
                    color: #0f172a;
                }
                .light-mode .glass-input::placeholder {
                    color: #94a3b8;
                }
                .light-mode .divider {
                    background: rgba(0,0,0,0.1);
                }
                .light-mode .table-wrapper {
                    border-color: rgba(0,0,0,0.1);
                }
                .light-mode th {
                    background: #f1f5f9;
                    color: #1e293b;
                }
                .light-mode td {
                    color: #334155;
                    border-bottom-color: rgba(0,0,0,0.05);
                }
                .light-mode tr:hover {
                    background: rgba(0,0,0,0.02);
                }
                .light-mode .text-secondary {
                    color: #64748b;
                }
                .light-mode .empty-state {
                    color: #94a3b8;
                }
            `}</style>
        </div>
    );
}
