/**
 * @file EvaluationTab.jsx
 * @description Sınav değerlendirme sürecini yöneten, sonuçları hesaplayan ve listeleyen bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState, useMemo } from 'react';
import { evaluateExam } from '../../utils/evaluator';
import { saveExcel } from '../../utils/excelHelper';

// ==========================================
//  BİLEŞEN TANIMI
// ==========================================
export default function EvaluationTab({ attendanceData, opticalData, answerKeyData, results, setResults, onSave }) {

    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ
    // -------------------------------------------------------------------------
    const [evaluating, setEvaluating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [msg, setMsg] = useState(null);
    const [activeSalon, setActiveSalon] = useState('all'); // Salon filtresi
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' }); // Sıralama

    // Değerlendirme yapılabilmesi için gerekli veri kontrolü
    const canEvaluate = attendanceData && opticalData && answerKeyData;

    // -------------------------------------------------------------------------
    //  İŞLEYİCİLER (HANDLERS)
    // -------------------------------------------------------------------------

    /**
     * Sınav değerlendirme işlemini başlatır.
     * Evaluator utils fonksiyonunu kullanır.
     */
    const handleEvaluate = () => {
        setEvaluating(true);
        setMsg(null);
        setTimeout(() => {
            try {
                const res = evaluateExam(attendanceData, opticalData, answerKeyData);
                setResults(res);
                setMsg({ type: 'success', text: `Değerlendirme tamamlandı. ${res.length} öğrenci hesaplandı.` });

                // Otomatik Kayıt (Eğer tanımlıysa)
                if (onSave) {
                    onSave(res);
                }
            } catch (e) {
                setMsg({ type: 'error', text: e.message });
            } finally {
                setEvaluating(false);
            }
        }, 100);
    };

    /**
     * Sonuçları Excel formatında dışa aktarır.
     */
    const handleExport = async () => {
        if (!results) return;
        setExporting(true);
        try {
            // UI'daki sütunlarla birebir aynı temiz veri oluştur
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
                setMsg({ type: 'success', text: `Dosya kaydedildi: ${path}` });
            }
        } catch (e) {
            setMsg({ type: 'error', text: e.message });
        } finally {
            setExporting(false);
        }
    };

    // -------------------------------------------------------------------------
    //  HESAPLANAN DEĞERLER (MEMOIZED)
    // -------------------------------------------------------------------------

    // Benzersiz salon listesini oluştur
    const salons = useMemo(() => {
        if (!results) return [];
        const s = new Set(results.map(r => r['Salon No']).filter(Boolean));
        return Array.from(s).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
    }, [results]);

    // Aktif salon filtresine göre sonuçları filtrele
    const filteredResults = useMemo(() => {
        if (!results) return [];
        let filtered = activeSalon === 'all' ? [...results] : results.filter(r => String(r['Salon No']) === String(activeSalon));
        
        // Sıralama uygula
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                // Sayısal değerler için
                if (['Doğru', 'Yanlış', 'Boş', 'Puan'].includes(sortConfig.key)) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = String(aVal || '').toLocaleLowerCase('tr-TR');
                    bVal = String(bVal || '').toLocaleLowerCase('tr-TR');
                }
                
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return filtered;
    }, [results, activeSalon, sortConfig]);

    // Sıralama fonksiyonu
    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // Sıralama ikonu
    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕️';
        return sortConfig.direction === 'desc' ? '🔽' : '🔼';
    };

    // Anlık istatistikler (Filtrelenmiş listeye göre)
    const stats = useMemo(() => {
        if (!filteredResults || filteredResults.length === 0) return null;

        const entered = filteredResults.filter(r => r.Durum === 'Girdi').length;
        const passed = filteredResults.filter(r => r.Sonuç === 'Başarılı').length;

        return {
            total: filteredResults.length,
            entered: entered,
            passed: passed,
            successRate: entered > 0 ? ((passed / entered) * 100).toFixed(2) : '0.00',
            avgScore: (filteredResults.filter(r => r.Durum === 'Girdi').reduce((acc, r) => acc + parseFloat(r.Puan || 0), 0) / (entered || 1)).toFixed(2)
        };
    }, [filteredResults]);

    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            <div className="tab-header">
                <h2>Değerlendirme ve Sonuç</h2>
                <p className="text-secondary">Tüm veriler hazır olduğunda değerlendirmeyi başlatın.</p>
            </div>

            {/* Durum Kartları */}
            <div className="status-cards">
                <div className={`card ${attendanceData ? 'ready' : 'missing'}`}>
                    <span>Yoklama Listesi</span>
                    <strong>{attendanceData ? 'Hazır' : 'Eksik'}</strong>
                </div>
                <div className={`card ${opticalData ? 'ready' : 'missing'}`}>
                    <span>Optik Veriler</span>
                    <strong>{opticalData ? 'Hazır' : 'Eksik'}</strong>
                </div>
                <div className={`card ${answerKeyData ? 'ready' : 'missing'}`}>
                    <span>Cevap Anahtarı</span>
                    <strong>{answerKeyData ? 'Hazır' : 'Eksik'}</strong>
                </div>
            </div>

            {/* Değerlendir Butonu */}
            <div className="action-area centered">
                <button
                    className="primary-btn large-btn"
                    onClick={handleEvaluate}
                    disabled={!canEvaluate || evaluating}
                >
                    {evaluating ? 'Hesaplanıyor...' : 'DEĞERLENDİR'}
                </button>
            </div>

            {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}

            {/* Sonuçlar */}
            {results && (
                <div className="results-container">

                    {/* Salon Filtre Tabları */}
                    {salons.length > 0 && (
                        <div className="salon-tabs">
                            <button
                                className={`tab-btn ${activeSalon === 'all' ? 'active' : ''}`}
                                onClick={() => setActiveSalon('all')}
                            >
                                Tümü
                            </button>
                            {salons.map(s => (
                                <button
                                    key={s}
                                    className={`tab-btn ${activeSalon === s ? 'active' : ''}`}
                                    onClick={() => setActiveSalon(s)}
                                >
                                    Salon {s}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* İstatistik Kutucukları */}
                    {stats && (
                        <div className="stats-row">
                            <div className="stat-box">
                                <label>Sınava Giren</label>
                                <span>{stats.entered} / {stats.total}</span>
                            </div>
                            <div className="stat-box">
                                <label>Başarılı</label>
                                <span className="text-success">
                                    {stats.passed}
                                    <small className="text-secondary" style={{ fontSize: '0.8rem', marginLeft: '8px' }}>
                                        (%{stats.successRate})
                                    </small>
                                </span>
                            </div>
                            <div className="stat-box">
                                <label>Ortalama Puan</label>
                                <span className="text-accent">{stats.avgScore}</span>
                            </div>
                        </div>
                    )}

                    {/* Sonuç Listesi Tablosu */}
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>Sıra</th>
                                    <th className="sortable" onClick={() => handleSort('Salon No')}>
                                        Salon {getSortIcon('Salon No')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('TC Kimlik')}>
                                        TC No {getSortIcon('TC Kimlik')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Ad Soyad')}>
                                        Ad Soyad {getSortIcon('Ad Soyad')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Belge Türü')}>
                                        Belge {getSortIcon('Belge Türü')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Durum')}>
                                        Durum {getSortIcon('Durum')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Kitapçık')}>
                                        Kitapçık {getSortIcon('Kitapçık')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Doğru')}>
                                        Doğru {getSortIcon('Doğru')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Yanlış')}>
                                        Yanlış {getSortIcon('Yanlış')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Boş')}>
                                        Boş {getSortIcon('Boş')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Puan')}>
                                        Puan {getSortIcon('Puan')}
                                    </th>
                                    <th className="sortable" onClick={() => handleSort('Sonuç')}>
                                        Sonuç {getSortIcon('Sonuç')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((r, i) => (
                                    <tr key={i} className={r.Durum !== 'Girdi' ? 'row-dimmed' : ''}>
                                        <td>{i + 1}</td>
                                        <td>{r['Salon No']}</td>
                                        <td className="font-mono">{r['TC Kimlik']}</td>
                                        <td>{r['Ad Soyad']}</td>
                                        <td>{r['Belge Türü']}</td>
                                        <td>
                                            <span className={`tag ${r.Durum === 'Girdi' ? 'tag-info' : 'tag-warn'}`}>
                                                {r.Durum}
                                            </span>
                                        </td>
                                        <td>{r['Kitapçık'] || '-'}</td>
                                        <td>{r.Doğru}</td>
                                        <td>{r.Yanlış}</td>
                                        <td>{r.Boş}</td>
                                        <td className="font-bold">{r.Puan}</td>
                                        <td>
                                            {r.Durum === 'Girdi' && (
                                                <span className={`tag ${r.Sonuç === 'Başarılı' ? 'tag-success' : 'tag-error'}`}>
                                                    {r.Sonuç}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="export-area">
                        <button className="secondary-btn" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'Kaydediliyor...' : '📥 Excel Olarak İndir'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        .status-cards { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            margin: 25px 0; 
        }
        .card { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
            padding: 20px 25px; 
            border-radius: 16px; 
            text-align: center; 
            border: 2px solid transparent;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        .card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .card.ready { 
            border-color: var(--success); 
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
        }
        .card.missing { 
            border-color: var(--error); 
            opacity: 0.5;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02));
        }
        .card span { 
            display: block; 
            font-size: 0.85rem; 
            margin-bottom: 8px; 
            color: var(--text-secondary);
            font-weight: 500;
        }
        .card strong {
            font-size: 1.1rem;
            letter-spacing: 0.5px;
        }
        .card.ready strong { color: var(--success); }
        .card.missing strong { color: var(--error); }
        
        .action-area.centered { 
            display: flex;
            justify-content: center; 
            margin: 30px 0;
        }
        .large-btn { 
            font-size: 1.1rem; 
            padding: 16px 50px; 
            border-radius: 12px;
            font-weight: 700;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px var(--accent-glow);
            transition: all 0.3s ease;
        }
        .large-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px var(--accent-glow);
        }
        .large-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .alert { 
            padding: 15px 20px; 
            border-radius: 12px; 
            margin: 20px 0; 
            text-align: center;
            font-weight: 500;
        }
        .alert.success { 
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05)); 
            color: var(--success); 
            border: 1px solid var(--success); 
        }
        .alert.error { 
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05)); 
            color: var(--error); 
            border: 1px solid var(--error); 
        }

        .salon-tabs { 
            display: flex; 
            gap: 8px; 
            margin-bottom: 25px; 
            overflow-x: auto; 
            padding: 5px;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 12px;
        }
        .tab-btn { 
            background: transparent; 
            border: none; 
            color: var(--text-secondary); 
            padding: 10px 18px; 
            border-radius: 8px; 
            cursor: pointer; 
            white-space: nowrap;
            font-weight: 500;
            font-size: 0.9rem;
            transition: all 0.2s ease;
        }
        .tab-btn.active { 
            background: var(--accent); 
            color: white; 
            box-shadow: 0 2px 10px var(--accent-glow);
        }
        .tab-btn:hover:not(.active) { 
            background: rgba(255,255,255,0.08);
            color: var(--text-primary);
        }
        
        .stats-row { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 25px; 
            justify-content: center;
            flex-wrap: wrap;
        }
        .stat-box { 
            background: linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
            padding: 20px 35px; 
            border-radius: 16px; 
            text-align: center; 
            min-width: 150px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }
        .stat-box:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }
        .stat-box label { 
            display: block; 
            font-size: 0.85rem; 
            color: var(--text-secondary); 
            margin-bottom: 10px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .stat-box span { 
            font-size: 1.8rem; 
            font-weight: 700; 
            color: var(--text-primary);
            display: flex;
            align-items: baseline;
            justify-content: center;
        }
        
        .table-wrapper { 
            max-height: 400px; 
            overflow-y: auto; 
            overflow-x: auto; 
            border: 1px solid rgba(255,255,255,0.1); 
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th { 
            position: sticky; 
            top: 0; 
            background: linear-gradient(180deg, #1e293b, #0f172a); 
            z-index: 10; 
            padding: 14px 12px; 
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 0.5px;
            color: var(--text-secondary);
        }
        th.sortable {
            cursor: pointer;
            user-select: none;
            transition: all 0.2s ease;
        }
        th.sortable:hover {
            background: linear-gradient(180deg, #334155, #1e293b);
            color: var(--accent);
        }
        td { 
            padding: 12px; 
            border-bottom: 1px solid rgba(255,255,255,0.05); 
        }
        tbody tr:hover {
            background: rgba(255, 255, 255, 0.03);
        }
        .row-dimmed { opacity: 0.5; }
        
        .font-mono { font-family: monospace; letter-spacing: 0.5px; }
        .font-bold { font-weight: 700; }
        .text-success { color: var(--success); }
        .text-accent { color: var(--accent); }
        
        .tag { 
            padding: 5px 12px; 
            border-radius: 20px; 
            font-size: 0.7rem; 
            font-weight: 600; 
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .tag-info { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .tag-success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .tag-warn { background: rgba(251, 191, 36, 0.2); color: var(--warning); }
        .tag-error { background: rgba(239, 68, 68, 0.2); color: var(--error); }
        
        .export-area { 
            margin-top: 25px; 
            text-align: center; 
        }
        .secondary-btn { 
            background: transparent; 
            border: 2px solid var(--accent); 
            color: var(--accent); 
            padding: 12px 25px; 
            border-radius: 10px; 
            cursor: pointer; 
            transition: all 0.3s ease;
            font-weight: 600;
            font-size: 0.95rem;
        }
        .secondary-btn:hover { 
            background: var(--accent); 
            color: white; 
            transform: translateY(-2px);
            box-shadow: 0 4px 15px var(--accent-glow);
        }

        /* ===== LIGHT MODE STYLES ===== */
        .light-mode .card { 
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.01)); 
        }
        .light-mode .card.ready {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02));
        }
        .light-mode .card span { color: #64748b; }

        .light-mode .stat-box { 
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.01));
            border-color: rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .salon-tabs {
            background: rgba(0, 0, 0, 0.03);
        }
        .light-mode .tab-btn:hover:not(.active) { 
            background: rgba(0,0,0,0.05);
            color: #1e293b;
        }

        .light-mode .table-wrapper { 
            border-color: rgba(0,0,0,0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        .light-mode th { 
            background: linear-gradient(180deg, #f1f5f9, #e2e8f0); 
            color: #475569;
        }
        .light-mode th.sortable:hover {
            background: linear-gradient(180deg, #e2e8f0, #cbd5e1);
            color: var(--accent);
        }
        .light-mode td { 
            color: #334155;
            border-bottom: 1px solid rgba(0,0,0,0.05); 
        }
        .light-mode tbody tr:hover {
            background: rgba(0, 0, 0, 0.02);
        }
        .light-mode .row-dimmed { opacity: 0.4; }
      `}</style>
        </div>
    );
}
