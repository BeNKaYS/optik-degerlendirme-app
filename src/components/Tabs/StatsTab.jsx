/**
 * @file StatsTab.jsx
 * @description Sınav istatistiklerini, trend analizlerini ve detaylı raporları gösteren bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState, useEffect, useMemo } from 'react';
import CheatingModal from '../CheatingModal';
import ExamSelectionModal from '../ExamSelectionModal';

// ==========================================
//  ALT BİLEŞENLER (SUB-COMPONENTS)
// ==========================================

/**
 * Basit bir SVG Çizgi Grafik Bileşeni.
 * @param {Array} data - Grafik verisi
 * @param {string} dataKey - Gösterilecek veri anahtarı (prop)
 * @param {string} color - Çizgi rengi
 * @param {string} label - Grafik başlığı
 */
const LineChart = ({ data, dataKey, color, label, suffix = '' }) => {
    if (!data || data.length === 0) return <div className="no-data">Veri yok</div>;

    const height = 180;
    const width = 600;
    const padding = 20;

    const values = data.map(d => d[dataKey]);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);

    const getX = (index) => (index / (data.length - 1 || 1)) * (width - padding * 2) + padding;
    const getY = (value) => height - padding - ((value - min) / (max - min || 1)) * (height - padding * 2);

    const points = data.map((d, i) => `${getX(i)},${getY(d[dataKey])}`).join(' ');

    return (
        <div className="chart-container">
            <h4>{label}</h4>
            <div className="svg-wrapper">
                <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
                    {/* Grid Çizgileri */}
                    {[0, 25, 50, 75, 100].map((val) => (
                        <line key={val} x1={padding} y1={getY(val)} x2={width - padding} y2={getY(val)} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
                    ))}
                    {/* Veri Çizgisi */}
                    <polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Noktalar ve Etiketler */}
                    {data.map((d, i) => (
                        <g key={i} className="chart-point">
                            <circle cx={getX(i)} cy={getY(d[dataKey])} r="4" fill="#1e293b" stroke={color} strokeWidth="2" />
                            {/* Değer Etiketi */}
                            <text x={getX(i)} y={getY(d[dataKey]) - 15} textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="bold">
                                {Number(d[dataKey]).toFixed(1)}{suffix}
                            </text>
                            {/* Tarih Etiketi */}
                            <text x={getX(i)} y={height - 2} textAnchor="middle" fill="#94a3b8" fontSize="11">
                                {d.shortDate}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
};

// ==========================================
//  ANA BİLEŞEN TANIMI
// ==========================================
export default function StatsTab({ onOpenCheating }) {
    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ
    // -------------------------------------------------------------------------
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [compareCount, setCompareCount] = useState(3); // Varsayılan: Son 3 sınavı karşılaştır
    const [showCheatingModal, setShowCheatingModal] = useState(false);
    const [showExamSelectModal, setShowExamSelectModal] = useState(false);

    // -------------------------------------------------------------------------
    //  VERİ YÜKLEME
    // -------------------------------------------------------------------------
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (!window.api?.getExams) return;
        setLoading(true);
        try {
            const list = await window.api.getExams();

            // Her sınav için tam veriyi yükle (getExams sadece metadata döndürür)
            const processedPromises = list.map(async (exam) => {
                let fullExamData = exam.data || {};

                // Eğer results yoksa, tam veriyi getExamById ile al
                if (!fullExamData.results && window.api?.getExamById) {
                    try {
                        const fullExam = await window.api.getExamById(exam.id);
                        if (fullExam && fullExam.data) {
                            fullExamData = fullExam.data;
                        }
                    } catch (e) {
                        console.warn('Sınav verisi alınamadı:', exam.id, e);
                    }
                }

                const results = fullExamData.results || [];
                const entered = results.filter(r => r.Durum === 'Girdi');
                const passed = results.filter(r => r.Sonuç === 'Başarılı');

                const avg = entered.length > 0
                    ? entered.reduce((acc, r) => acc + parseFloat(r.Puan || 0), 0) / entered.length
                    : 0;

                const rate = entered.length > 0 ? (passed.length / entered.length) * 100 : 0;

                return {
                    ...exam,
                    data: fullExamData,
                    date: exam.timestamp,
                    shortDate: new Date(exam.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
                    avgScore: avg,
                    successRate: rate,
                    enteredCount: entered.length,
                    rawResults: results
                };
            });

            const processed = (await Promise.all(processedPromises))
                .sort((a, b) => a.date - b.date); // Tarihe göre eskiden yeniye sırala

            setExams(processed);

            // Varsayılan olarak son sınavı seç
            if (processed.length > 0) {
                setSelectedExamId(processed[processed.length - 1].id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // -------------------------------------------------------------------------
    //  İSTATİSTİK HESAPLAMALARI
    // -------------------------------------------------------------------------

    // 1. Seçili Sınav Analizi (Yoksa sonuncuyu al, o da yoksa null)
    const activeExam = useMemo(() => {
        if (!selectedExamId) return exams.length > 0 ? exams[exams.length - 1] : null;
        return exams.find(e => e.id === selectedExamId) || null;
    }, [exams, selectedExamId]);

    // Belge Türüne Göre Gruplandırılmış İstatistikler
    const groupStats = useMemo(() => {
        if (!activeExam) return [];
        const groups = {};

        activeExam.rawResults.forEach(r => {
            if (r.Durum !== 'Girdi') return;
            const type = r['Belge Türü'] || 'GENEL';
            if (!groups[type]) groups[type] = { scores: [], passed: 0 };

            groups[type].scores.push(parseFloat(r.Puan));
            if (r.Sonuç === 'Başarılı') groups[type].passed++;
        });

        return Object.keys(groups).map(type => {
            const g = groups[type];
            const count = g.scores.length;
            const avg = g.scores.reduce((a, b) => a + b, 0) / count;
            const min = Math.min(...g.scores);
            const max = Math.max(...g.scores);
            const rate = (g.passed / count) * 100;
            const failed = count - g.passed;

            return { type, count, avg, min, max, rate, passed: g.passed, failed };
        });
    }, [activeExam]);

    // Son Sınav Toplam İstatistikleri (Total Row)
    const totalStats = useMemo(() => {
        if (!activeExam) return null;
        let passed = 0, failed = 0, sum = 0, count = 0;
        let min = 1000, max = -1;

        activeExam.rawResults.forEach(r => {
            if (r.Durum !== 'Girdi') return;
            const score = parseFloat(r.Puan);
            count++;
            sum += score;
            if (r.Sonuç === 'Başarılı') passed++; else failed++;
            if (score < min) min = score;
            if (score > max) max = score;
        });

        if (count === 0) return null;
        return {
            count, passed, failed,
            avg: sum / count,
            min, max,
            rate: (passed / count) * 100
        };
    }, [activeExam]);

    // 2. Karşılaştırmalı Veri (Son N Sınav)
    const comparisonData = useMemo(() => {
        return exams.slice(-1 * compareCount);
    }, [exams, compareCount]);


    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            {/* Header */}
            <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h2>İstatistikler</h2>
                    <p className="text-secondary">Detaylı analiz ve gelişim raporları.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>

                    <button
                        className="primary-btn"
                        onClick={() => window.print()}
                        title="Bu sayfayı yazdır veya PDF olarak kaydet"
                    >
                        🖨️ PDF / Yazdır
                    </button>
                </div>
            </div>

            {loading && <div className="loading">Yükleniyor...</div>}

            {!loading && exams.length === 0 && <div className="empty-alert">Veri bulunamadı.</div>}

            {activeExam && (
                <div className="stats-container">

                    {/* BÖLÜM 1: SEÇİLİ SINAV ANALİZİ */}
                    <div className="section latest-section">
                        <div className="section-header">
                            <h3>📊 Sınav Analizi</h3>
                            <button
                                className="exam-select-btn"
                                onClick={() => setShowExamSelectModal(true)}
                                title="Farklı bir sınav seçmek için tıkla"
                            >
                                <span>{activeExam.name}</span>
                                <span className="icon">🔽</span>
                            </button>
                        </div>

                        {/* Belge Türlerine Göre Tablo */}
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Belge Türü</th>
                                        <th>Öğrenci Sayısı</th>
                                        <th>Başarılı</th>
                                        <th>Başarısız</th>
                                        <th>Başarı %</th>
                                        <th>Ortalama</th>
                                        <th>Min Puan</th>
                                        <th>Max Puan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupStats.map(stat => (
                                        <tr key={stat.type}>
                                            <td className="font-bold">{stat.type}</td>
                                            <td>{stat.count}</td>
                                            <td style={{ color: '#34d399', fontWeight: 'bold' }}>{stat.passed}</td>
                                            <td style={{ color: '#f87171', fontWeight: 'bold' }}>{stat.failed}</td>
                                            <td>
                                                <span className={`badge ${stat.rate >= 70 ? 'badge-green' : 'badge-red'}`}>
                                                    %{stat.rate.toFixed(1)}
                                                </span>
                                            </td>
                                            <td>{stat.avg.toFixed(2)}</td>
                                            <td>{stat.min.toFixed(2)}</td>
                                            <td>{stat.max.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {groupStats.length === 0 && (
                                        <tr><td colSpan="8" className="text-center">Sınava giren öğrenci verisi bulunamadı.</td></tr>
                                    )}
                                    {/* TOTAL ROW */}
                                    {totalStats && (
                                        <tr className="total-row">
                                            <td className="font-bold">TOPLAM</td>
                                            <td className="font-bold">{totalStats.count}</td>
                                            <td style={{ color: '#34d399', fontWeight: 'bold' }}>{totalStats.passed}</td>
                                            <td style={{ color: '#f87171', fontWeight: 'bold' }}>{totalStats.failed}</td>
                                            <td>
                                                <span className={`badge ${totalStats.rate >= 70 ? 'badge-green' : 'badge-red'}`}>
                                                    %{totalStats.rate.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="font-bold">{totalStats.avg.toFixed(2)}</td>
                                            <td className="font-bold">{totalStats.min.toFixed(2)}</td>
                                            <td className="font-bold">{totalStats.max.toFixed(2)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* BÖLÜM 2: KARŞILAŞTIRMALI ANALİZ */}
                    <div className="section compare-section">
                        <div className="section-header">
                            <h3>📈 Geçmiş Sınav Karşılaştırması</h3>
                            <div className="input-control">
                                <label>Son Kaç Sınav:</label>
                                <input
                                    type="number"
                                    min="2"
                                    max="50"
                                    value={compareCount}
                                    onChange={(e) => setCompareCount(Number(e.target.value))}
                                    className="small-input"
                                />
                            </div>
                        </div>

                        {comparisonData.length < 2 ? (
                            <div className="info-box">Karşılaştırma için en az 2 sınav verisi gereklidir.</div>
                        ) : (
                            <div className="charts-grid">
                                <LineChart
                                    data={comparisonData}
                                    dataKey="successRate"
                                    color="#10b981"
                                    label="Başarı Oranı (%)"
                                    suffix="%"
                                />
                                <LineChart
                                    data={comparisonData}
                                    dataKey="avgScore"
                                    color="#3b82f6"
                                    label="Ortalama Puan"
                                />
                            </div>
                        )}

                        <div className="trend-summary">
                            <small className="text-secondary">
                                * Grafikler son {comparisonData.length} sınavı baz alır.
                            </small>
                        </div>
                    </div>

                </div>
            )}

            <ExamSelectionModal
                isOpen={showExamSelectModal}
                onClose={() => setShowExamSelectModal(false)}
                exams={exams}
                onSelect={setSelectedExamId}
            />

            <style>{`
                .section { margin-bottom: 30px; animation: slideUp 0.4s ease; }
                .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
                .section-header h3 { font-size: 1.2rem; color: var(--text-primary); margin: 0; }
                
                .exam-select-btn { 
                    display: flex; 
                    align-items: center; 
                    gap: 10px; 
                    background: var(--hover-bg); 
                    border: var(--glass-border); 
                    padding: 8px 15px; 
                    border-radius: 8px; 
                    color: var(--text-primary); 
                    font-size: 1rem; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                }
                .exam-select-btn:hover { background: var(--hover-bg); border-color: var(--accent); }
                .exam-select-btn .icon { opacity: 0.7; font-size: 0.8rem; }
                
                .exam-tag { background: rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 6px; font-size: 0.9rem; }
                
                .divider { height: 1px; background: var(--glass-border); margin: 30px 0; }
                
                .table-wrapper { border: var(--glass-border); border-radius: 8px; overflow: hidden; }
                table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                th { background: var(--bg-secondary); padding: 12px; text-align: center; font-size: 0.9rem; color: var(--text-secondary); }
                td { padding: 12px; border-bottom: var(--glass-border); text-align: center; }
                
                th:first-child, td:first-child { text-align: left; padding-left: 20px; }
                
                tr:last-child td { border-bottom: none; }
                .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .chart-container { background: var(--bg-tertiary); padding: 15px; border-radius: 10px; border: var(--glass-border); }
                
                .empty-alert, .info-box { padding: 20px; text-align: center; background: var(--bg-tertiary); border-radius: 8px; color: var(--text-secondary); }

                /* ===== LIGHT MODE STYLES ===== */
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
                .total-row {
                    background: rgba(255, 255, 255, 0.1);
                    border-top: 2px solid rgba(255, 255, 255, 0.3);
                    font-weight: bold;
                }
                .light-mode .total-row {
                    background: #e2e8f0 !important;
                    border-top: 2px solid #cbd5e1 !important;
                    color: #1e293b;
                }
                .light-mode tr[style*="background"] {
                    background: rgba(0,0,0,0.04) !important;
                    border-top: 2px solid rgba(0,0,0,0.1) !important;
                }
                .light-mode .exam-select-btn {
                    background: rgba(0,0,0,0.03);
                    border-color: rgba(0,0,0,0.15);
                    color: #0f172a;
                }
                .light-mode .exam-select-btn:hover {
                    background: rgba(0,0,0,0.06);
                }
                .light-mode .exam-tag {
                    background: rgba(0,0,0,0.05);
                    color: #334155;
                }
                .light-mode .divider {
                    background: rgba(0,0,0,0.1);
                }
                .light-mode .chart-container {
                    background: #f8fafc;
                    border-color: rgba(0,0,0,0.1);
                }
                .light-mode .chart-svg line {
                    stroke: rgba(0,0,0,0.08);
                }
                .light-mode .chart-point circle[fill] {
                    fill: #ffffff;
                }
                .light-mode .chart-point text {
                    fill: #0f172a !important;
                }
                .light-mode .empty-alert, .light-mode .info-box {
                    background: #f1f5f9;
                    color: #64748b;
                }

                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}
