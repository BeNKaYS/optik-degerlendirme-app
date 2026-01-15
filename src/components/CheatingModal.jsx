import { useState, useEffect, useMemo } from 'react';

/**
 * @component CheatingModal
 * @description Analyzes exam results for potential cheating (high similarity in same room/booklet).
 * @param {boolean} isOpen
 * @param {Function} onClose
 * @param {Array} results - Array of student result objects
 */
const CheatingModal = ({ isOpen, onClose, results }) => {
    const [analysis, setAnalysis] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [threshold, setThreshold] = useState(90); // Similarity Percentage Threshold

    useEffect(() => {
        if (isOpen && results && results.length > 0) {
            analyzeData();
        }
    }, [isOpen, results, threshold]);

    const analyzeData = () => {
        setCalculating(true);
        setTimeout(() => {
            const suspicious = [];

            // 1. Group by Salon (Room)
            const byRoom = {};
            results.forEach(r => {
                if (r.Durum !== 'Girdi' || !r.Cevaplar) return;
                const room = r['Salon No'] || 'Genel';
                if (!byRoom[room]) byRoom[room] = [];
                byRoom[room].push(r);
            });

            // 2. Compare pairs within each room
            Object.keys(byRoom).forEach(room => {
                const students = byRoom[room];

                for (let i = 0; i < students.length; i++) {
                    for (let j = i + 1; j < students.length; j++) {
                        const s1 = students[i];
                        const s2 = students[j];

                        // Must use same booklet to copy effectively (usually)
                        if (s1['Kitapçık'] !== s2['Kitapçık']) continue;

                        const ans1 = s1.Cevaplar;
                        const ans2 = s2.Cevaplar;

                        // Compare answers
                        let match = 0;
                        let total = 0;
                        const len = Math.max(ans1.length, ans2.length);

                        for (let k = 0; k < len; k++) {
                            const c1 = ans1[k];
                            const c2 = ans2[k];

                            // Only count if at least one has marked something (ignore double blanks?)
                            // Or generally compare string similarity
                            if (c1 || c2) {
                                total++;
                                if (c1 === c2) match++;
                            }
                        }

                        // Calculate percentage
                        const similarity = total === 0 ? 0 : (match / total) * 100;

                        if (similarity >= threshold) {
                            suspicious.push({
                                room,
                                booklet: s1['Kitapçık'],
                                student1: s1,
                                student2: s2,
                                similarity: similarity.toFixed(1),
                                matchCount: match,
                                totalCount: total
                            });
                        }
                    }
                }
            });

            setAnalysis(suspicious);
            setCalculating(false);
        }, 100); // Allow UI to render loading state
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content cheating-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⚠️ Olası Sınav İhlalleri (Kopya Analizi)</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div className="controls">
                        <label>Benzerlik Eşiği (%):</label>
                        <input
                            type="number"
                            min="50"
                            max="100"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                        />
                        <span className="info-text">
                            (Aynı salon ve kitapçık türüne sahip olup, cevapları %{threshold} üzeri eşleşenler)
                        </span>
                    </div>

                    {calculating ? (
                        <div className="loading">Analiz yapılıyor...</div>
                    ) : (
                        <div className="results-list">
                            {analysis.length === 0 ? (
                                <div className="no-issues">
                                    <span className="check-icon">✅</span>
                                    <p>Şüpheli bir durum tespit edilemedi.</p>
                                </div>
                            ) : (
                                <table className="cheating-table">
                                    <thead>
                                        <tr>
                                            <th>Salon</th>
                                            <th>Kitapçık</th>
                                            <th>Öğrenci 1</th>
                                            <th>Öğrenci 2</th>
                                            <th>Benzerlik</th>
                                            <th>Puanlar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analysis.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.room}</td>
                                                <td><span className="badge">{item.booklet}</span></td>
                                                <td>
                                                    <div className="student-name">{item.student1['Ad Soyad']}</div>
                                                    <small>{item.student1['TC Kimlik']}</small>
                                                </td>
                                                <td>
                                                    <div className="student-name">{item.student2['Ad Soyad']}</div>
                                                    <small>{item.student2['TC Kimlik']}</small>
                                                </td>
                                                <td>
                                                    <span className="similarity-badge">%{item.similarity}</span>
                                                </td>
                                                <td>
                                                    {item.student1.Puan} / {item.student2.Puan}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="secondary-btn" onClick={onClose}>Kapat</button>
                    <button className="primary-btn" onClick={() => window.print()}>🖨️ Yazdır</button>
                </div>
            </div>

            <style>{`
                .cheating-modal { width: 90%; max-width: 900px; height: 80vh; display: flex; flex-direction: column; }
                .controls { padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 15px; }
                .controls input { padding: 5px; width: 60px; text-align: center; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: transparent; color: white; }
                .info-text { font-size: 0.85rem; color: #94a3b8; }
                
                .results-list { flex-grow: 1; overflow-y: auto; }
                .no-issues { text-align: center; padding: 50px; color: #34d399; }
                .check-icon { font-size: 48px; display: block; margin-bottom: 10px; }
                
                .cheating-table { width: 100%; border-collapse: collapse; }
                .cheating-table th { text-align: left; padding: 10px; background: rgba(255,255,255,0.05); color: #94a3b8; font-weight: 600; }
                .cheating-table td { padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
                .student-name { font-weight: 500; color: white; }
                .student-name + small { color: #64748b; font-size: 0.8rem; }
                
                .similarity-badge { background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
                
<<<<<<< HEAD
                /* ===== LIGHT MODE STYLES ===== */
                .light-mode .controls {
                    background: rgba(0,0,0,0.03);
                }
                .light-mode .controls input {
                    background: #ffffff;
                    border-color: rgba(0,0,0,0.2);
                    color: #0f172a;
                }
                .light-mode .info-text {
                    color: #64748b;
                }
                .light-mode .cheating-table th {
                    background: #f1f5f9;
                    color: #1e293b;
                }
                .light-mode .cheating-table td {
                    color: #334155;
                    border-bottom-color: rgba(0,0,0,0.05);
                }
                .light-mode .student-name {
                    color: #0f172a;
                }
                .light-mode .student-name + small {
                    color: #64748b;
                }

=======
>>>>>>> 26b94059835dcda23ecf6dbacb5943af28eddba8
                @media print {
                    .controls { display: none; }
                    .modal-footer { display: none; }
                    .modal-header .close-btn { display: none; }
                    .cheating-modal { width: 100%; height: auto; border: none; box-shadow: none; background: white; color: black; }
                    .student-name, .cheating-table th, .cheating-table td { color: black !important; border-color: #ddd; }
                    .similarity-badge { border: 1px solid black; }
                }
            `}</style>
        </div>
    );
};

export default CheatingModal;
