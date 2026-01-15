import { useState, useEffect } from 'react';

export default function CheatingReport({ results, examName, answerKey }) {
    const [analysis, setAnalysis] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [threshold, setThreshold] = useState(90);

    useEffect(() => {
        if (results && results.length > 0) {
            analyzeData(results);
        } else {
            setAnalysis([]);
        }
    }, [results, threshold, answerKey]);

    const analyzeData = (data) => {
        setCalculating(true);
        setTimeout(() => {
            const suspicious = [];

            // 1. Group by Salon (Room)
            const byRoom = {};
            data.forEach(r => {
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

                        // Must use same booklet to copy effectively (or at least check same booklet)
                        if (s1['Kitapçık'] !== s2['Kitapçık']) continue;

                        const booklet = s1['Kitapçık'];
                        const docType = s1['Belge Türü'];
                        const ans1 = s1.Cevaplar;
                        const ans2 = s2.Cevaplar;

                        let match = 0;
                        let total = 0;
                        let sharedCorrect = 0;
                        let sharedWrong = 0;

                        // Get Answer Key for this student group if available
                        // Handle fallback logic similar to AnswerKeyTab? Assuming direct match first.
                        const keyMap = answerKey?.[booklet]?.[docType] || answerKey?.[booklet]?.['GENEL'];

                        const len = Math.max(ans1.length, ans2.length);

                        for (let k = 0; k < len; k++) {
                            const c1 = ans1[k];
                            const c2 = ans2[k];

                            if (c1 || c2) {
                                total++;
                                if (c1 === c2) {
                                    match++;
                                    // Calculate shared correctness if key exists
                                    if (keyMap) {
                                        const qNum = k + 1;
                                        const correctAns = keyMap[qNum];
                                        if (correctAns) {
                                            if (c1 === correctAns) {
                                                sharedCorrect++;
                                            } else {
                                                sharedWrong++;
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        const similarity = total === 0 ? 0 : (match / total) * 100;

                        if (similarity >= threshold) {
                            suspicious.push({
                                room,
                                booklet,
                                docType,
                                student1: s1,
                                student2: s2,
                                similarity: similarity.toFixed(1),
                                sharedCorrect,
                                sharedWrong
                            });
                        }
                    }
                }
            });

            setAnalysis(suspicious);
            setCalculating(false);
        }, 100);
    };

    if (!results) return <div className="loading">Analiz için veri bekleniyor...</div>;

    return (
        <div className="tab-content glass-panel" style={{ animation: 'fadeIn 0.3s ease' }}>
            <header className="report-header">
                <div>
                    <h2>⚠️ Sınav İhlali Analiz Raporu</h2>
                    <p className="text-secondary">{examName ? `${examName} sınavı için analiz sonuçları.` : 'Analiz sonuçları.'}</p>
                </div>
                <div className="controls">
                    <label>Benzerlik Eşiği (%):</label>
                    <input
                        type="number"
                        min="50"
                        max="100"
                        value={threshold}
                        onChange={(e) => setThreshold(Number(e.target.value))}
                    />
                    <button className="primary-btn" onClick={() => window.print()}>🖨️ Yazdır</button>
                </div>
            </header>

            {calculating ? (
                <div className="loading">Analiz yapılıyor...</div>
            ) : (
                <div className="report-content">
                    {analysis.length === 0 ? (
                        <div className="no-issues">
                            <span className="check-icon">✅</span>
                            <p>Şüpheli bir durum tespit edilemedi.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table className="cheating-table">
                                <thead>
                                    <tr>
                                        <th>Salon</th>
                                        <th>Kitapçık</th>
                                        <th>Belge Türü</th>
                                        <th>Öğrenci 1</th>
                                        <th>Öğrenci 2</th>
                                        <th>Benzerlik</th>
                                        <th>Benzer Doğru</th>
                                        <th>Benzer Yanlış</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.map((item, index) => (
                                        <tr key={index}>
                                            <td>{item.room}</td>
                                            <td><span className="badge">{item.booklet}</span></td>
                                            <td>{item.docType}</td>
                                            <td>
                                                <div className="student-name">{item.student1['Ad Soyad']}</div>
                                                <small>{item.student1['TC Kimlik']} ({item.student1.Puan} Puan)</small>
                                            </td>
                                            <td>
                                                <div className="student-name">{item.student2['Ad Soyad']}</div>
                                                <small>{item.student2['TC Kimlik']} ({item.student2.Puan} Puan)</small>
                                            </td>
                                            <td>
                                                <span className="similarity-badge">%{item.similarity}</span>
                                            </td>
                                            <td style={{ color: '#34d399', fontWeight: 'bold' }}>
                                                {item.sharedCorrect}
                                            </td>
                                            <td style={{ color: '#f87171', fontWeight: 'bold' }}>
                                                {item.sharedWrong}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .report-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: var(--glass-border); margin-bottom: 20px; }
                
                .controls { display: flex; align-items: center; gap: 15px; }
                .controls input { padding: 8px; width: 60px; text-align: center; border-radius: 6px; border: var(--glass-border); background: var(--bg-tertiary); color: var(--text-primary); }
                
                .cheating-table { width: 100%; border-collapse: collapse; }
                .cheating-table th { text-align: left; padding: 15px; background: var(--bg-secondary); color: var(--text-secondary); font-weight: 600; }
                .cheating-table td { padding: 15px; border-bottom: var(--glass-border); }
                
                .student-name { font-weight: 500; color: var(--text-primary); font-size: 1.05rem; }
                .student-name + small { color: var(--text-secondary); font-size: 0.85rem; }
                .badge { background: var(--hover-bg); padding: 4px 8px; border-radius: 4px; }
                .similarity-badge { background: rgba(239, 68, 68, 0.2); color: #f87171; padding: 6px 10px; border-radius: 6px; font-weight: bold; }
                
                .no-issues { text-align: center; padding: 50px; color: #34d399; font-size: 1.2rem; }
                .check-icon { font-size: 64px; display: block; margin-bottom: 10px; }

<<<<<<< HEAD
                /* ===== LIGHT MODE STYLES ===== */
                .light-mode .report-header {
                    border-bottom-color: rgba(0,0,0,0.1);
                }
                .light-mode .controls input {
                    background: #ffffff;
                    border-color: rgba(0,0,0,0.2);
                    color: #0f172a;
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
                .light-mode .badge {
                    background: rgba(0,0,0,0.05);
                    color: #334155;
                }

=======
>>>>>>> 26b94059835dcda23ecf6dbacb5943af28eddba8
                @media print {
                    .no-print, header button { display: none; }
                    .glass-panel { background: white !important; color: black !important; box-shadow: none; border: none; }
                    .cheating-table th { color: black; background: #eee; }
                    .cheating-table td, .student-name { color: black; border-bottom: 1px solid #ccc; }
                    .badge { border: 1px solid #ccc; color: black; }
                    .similarity-badge { border: 1px solid black; color: black; background: #eee; }
                }
            `}</style>
        </div>
    );
}
