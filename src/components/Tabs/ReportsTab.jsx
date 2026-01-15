/**
 * @file ReportsTab.jsx
 * @description Raporlama ve yazdırma işlemlerini yöneten sekme
 * @author Sercan ÖZDEMİR
 * @date 2026
 */

import { useState } from 'react';
import { saveExcel } from '../../utils/excelHelper';
import PrintPreview from '../PrintPreview';

export default function ReportsTab({ results, examName, answerKey }) {
    const [exporting, setExporting] = useState(false);
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printReportType, setPrintReportType] = useState('salonList');
    const [msg, setMsg] = useState(null);

    // Excel dışa aktarma
    const handleExportExcel = async () => {
        if (!results) return;
        setExporting(true);
        try {
            const cleanResults = results.map((r, i) => ({
                'Sıra': i + 1,
                'Salon No': r['Salon No'],
                'TC No': r['TC Kimlik'],
                'Ad Soyad': r['Ad Soyad'],
                'Belge Türü': r['Belge Türü'],
                'Durum': r.Durum,
                'Kitapçık': r.Kitapçık || '-',
                'Doğru': r.Doğru,
                'Yanlış': r.Yanlış,
                'Boş': r.Boş,
                'Puan': r.Puan,
                'Sonuç': r.Sonuç
            }));

            const path = await saveExcel(cleanResults, 'SonucListesi.xlsx', 'Salon No');
            if (path) {
                setMsg({ type: 'success', text: `Excel dosyası kaydedildi: ${path}` });
            }
        } catch (e) {
            setMsg({ type: 'error', text: e.message });
        } finally {
            setExporting(false);
        }
    };

    const openPrintPreview = (type) => {
        setPrintReportType(type);
        setShowPrintPreview(true);
    };

    if (!results || results.length === 0) {
        return (
            <div className="tab-content glass-panel">
                <div className="tab-header">
                    <h2>📄 Raporlar ve Yazdırma</h2>
                    <p className="text-secondary">Rapor oluşturmak için önce değerlendirme yapmalısınız.</p>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📋</div>
                    <h3>Henüz Değerlendirme Yapılmadı</h3>
                    <p>Rapor oluşturmak için:</p>
                    <ol style={{ textAlign: 'left', display: 'inline-block', marginTop: '20px' }}>
                        <li>Yoklama listesini yükleyin</li>
                        <li>Optik verileri yükleyin</li>
                        <li>Cevap anahtarını yükleyin</li>
                        <li>Değerlendirme sekmesinden sınavı değerlendirin</li>
                    </ol>
                </div>
                <style>{`
                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: var(--text-secondary);
                    }
                    .empty-icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                        opacity: 0.3;
                    }
                    .empty-state h3 {
                        color: var(--text-primary);
                        margin-bottom: 10px;
                    }
                    .empty-state ol {
                        color: var(--text-secondary);
                        line-height: 2;
                    }
                `}</style>
            </div>
        );
    }

    const stats = {
        total: results.length,
        entered: results.filter(r => r.Durum === 'Girdi').length,
        passed: results.filter(r => r.Sonuç === 'Başarılı').length,
    };
    stats.successRate = stats.entered > 0 ? ((stats.passed / stats.entered) * 100).toFixed(1) : '0.0';

    // PrintPreview açıksa sadece onu göster
    if (showPrintPreview) {
        return (
            <PrintPreview
                data={results}
                onClose={() => setShowPrintPreview(false)}
                reportType={printReportType}
                answerKey={answerKey}
            />
        );
    }

    return (
        <div className="tab-content glass-panel">
            <div className="tab-header">
                <h2>📄 Raporlar ve Yazdırma</h2>
                <p className="text-secondary">
                    {examName ? `${examName} - ` : ''}
                    {stats.total} öğrenci için raporlar hazır
                </p>
            </div>

            {msg && (
                <div className={`alert ${msg.type}`}>
                    {msg.text}
                </div>
            )}

            {/* Özet İstatistikler */}
            <div className="stats-overview">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                        <div className="stat-label">Toplam Öğrenci</div>
                        <div className="stat-value">{stats.total}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">✍️</div>
                    <div className="stat-info">
                        <div className="stat-label">Sınava Giren</div>
                        <div className="stat-value">{stats.entered}</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                        <div className="stat-label">Başarılı</div>
                        <div className="stat-value">
                            {stats.passed}
                            <span className="stat-percent">%{stats.successRate}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rapor Türleri */}
            <div className="reports-grid">
                {/* Salon Listeleri */}
                <div className="report-card">
                    <div className="report-icon print">🖨️</div>
                    <h3>Salon Listeleri</h3>
                    <p>Her salon için ayrı sayfa, yazdırmaya hazır resmi format.</p>
                    <ul className="report-features">
                        <li>✓ Okul başlığı ile</li>
                        <li>✓ İmza alanları</li>
                        <li>✓ İstatistik notları</li>
                    </ul>
                    <button 
                        className="report-btn print-btn" 
                        onClick={() => openPrintPreview('salonList')}
                    >
                        🖨️ Yazdır / PDF
                    </button>
                </div>

                {/* Bireysel Raporlar */}
                <div className="report-card">
                    <div className="report-icon individual">📄</div>
                    <h3>Bireysel Raporlar</h3>
                    <p>Her öğrenci için detaylı performans raporu. Veliye verilebilir.</p>
                    <ul className="report-features">
                        <li>✓ Öğrenci bilgileri</li>
                        <li>✓ Görsel performans kartı</li>
                        <li>✓ Başarı durumu</li>
                    </ul>
                    <button 
                        className="report-btn individual-btn" 
                        onClick={() => openPrintPreview('individual')}
                    >
                        📄 Oluştur
                    </button>
                </div>

                {/* Özet Rapor */}
                <div className="report-card">
                    <div className="report-icon summary">📈</div>
                    <h3>Özet Rapor</h3>
                    <p>İdare ve yönetim için genel başarı analizi ve istatistikler.</p>
                    <ul className="report-features">
                        <li>✓ Salon karşılaştırması</li>
                        <li>✓ Başarı oranları</li>
                        <li>✓ Puan dağılımı</li>
                    </ul>
                    <button 
                        className="report-btn summary-btn" 
                        onClick={() => openPrintPreview('summary')}
                    >
                        📊 Görüntüle
                    </button>
                </div>

                {/* İhlal Analizi Raporu */}
                <div className="report-card">
                    <div className="report-icon cheating">⚠️</div>
                    <h3>İhlal Analizi Raporu</h3>
                    <p>Kopya şüphesi taşıyan öğrenci eşleşmeleri ve benzerlik oranları.</p>
                    <ul className="report-features">
                        <li>✓ Salon bazlı analiz</li>
                        <li>✓ Benzerlik yüzdesi</li>
                        <li>✓ Şüpheli eşleşmeler</li>
                    </ul>
                    <button 
                        className="report-btn cheating-btn" 
                        onClick={() => openPrintPreview('cheating')}
                    >
                        ⚠️ Rapor Oluştur
                    </button>
                </div>
            </div>

            <style>{`
                .alert {
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    text-align: center;
                }
                .alert.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: var(--success);
                    border: 1px solid var(--success);
                }
                .alert.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error);
                    border: 1px solid var(--error);
                }

                .stats-overview {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }

                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    background: rgba(255, 255, 255, 0.05);
                    padding: 25px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .stat-card.success {
                    background: rgba(16, 185, 129, 0.1);
                    border-color: var(--success);
                }

                .stat-icon {
                    font-size: 40px;
                }

                .stat-info {
                    flex: 1;
                }

                .stat-label {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    margin-bottom: 5px;
                }

                .stat-value {
                    font-size: 2rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .stat-percent {
                    font-size: 1rem;
                    margin-left: 10px;
                    color: var(--success);
                }

                .reports-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 25px;
                    margin-top: 30px;
                }

                .report-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 25px;
                    transition: all 0.3s ease;
                }

                .report-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    border-color: var(--accent);
                }

                .report-icon {
                    font-size: 48px;
                    margin-bottom: 15px;
                    display: inline-block;
                    padding: 15px;
                    border-radius: 50%;
                }

                .report-icon.excel {
                    background: rgba(33, 150, 83, 0.2);
                }

                .report-icon.print {
                    background: rgba(59, 130, 246, 0.2);
                }

                .report-icon.individual {
                    background: rgba(168, 85, 247, 0.2);
                }

                .report-icon.summary {
                    background: rgba(245, 158, 11, 0.2);
                }

                .report-icon.cheating {
                    background: rgba(239, 68, 68, 0.2);
                }

                .report-card h3 {
                    margin: 10px 0;
                    font-size: 1.3rem;
                    color: var(--text-primary);
                }

                .report-card p {
                    color: var(--text-secondary);
                    margin: 10px 0;
                    font-size: 0.9rem;
                    line-height: 1.6;
                }

                .report-features {
                    list-style: none;
                    padding: 15px 0;
                    margin: 0;
                }

                .report-features li {
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    padding: 5px 0;
                }

                .report-btn {
                    width: 100%;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin-top: 10px;
                }

                .excel-btn {
                    background: #219653;
                    color: white;
                }

                .excel-btn:hover {
                    background: #1a7741;
                }

                .print-btn {
                    background: #3b82f6;
                    color: white;
                }

                .print-btn:hover {
                    background: #2563eb;
                }

                .individual-btn {
                    background: #a855f7;
                    color: white;
                }

                .individual-btn:hover {
                    background: #9333ea;
                }

                .summary-btn {
                    background: #f59e0b;
                    color: white;
                }

                .summary-btn:hover {
                    background: #d97706;
                }

                .cheating-btn {
                    background: #ef4444;
                    color: white;
                }

                .cheating-btn:hover {
                    background: #dc2626;
                }

                .report-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                /* Light Mode */
                .light-mode .stat-card {
                    background: rgba(0, 0, 0, 0.03);
                    border-color: rgba(0, 0, 0, 0.1);
                }

                .light-mode .stat-card.success {
                    background: rgba(16, 185, 129, 0.1);
                }

                .light-mode .report-card {
                    background: rgba(0, 0, 0, 0.03);
                    border-color: rgba(0, 0, 0, 0.1);
                }

                .light-mode .report-card:hover {
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                }
            `}</style>
        </div>
    );
}
