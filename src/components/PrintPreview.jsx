/**
 * @file PrintPreview.jsx
 * @description Yazdırma önizleme ve PDF çıktısı modal bileşeni
 * @author Sercan ÖZDEMİR
 * @date 2026
 */

import { useState, useRef, useEffect } from 'react';
import './PrintPreview.css';

export default function PrintPreview({ data, onClose, reportType = 'salonList', answerKey = null }) {
    const printRef = useRef();
    const [logoBase64, setLogoBase64] = useState('');
    const [cheatingThreshold, setCheatingThreshold] = useState(90);
    const [cheatingAnalysis, setCheatingAnalysis] = useState([]);
    
    // Özelleştirme ayarları
    const [showLogo, setShowLogo] = useState(true);
    const [showSubtitle, setShowSubtitle] = useState(true);
    const [subtitle, setSubtitle] = useState('');
    
    // TC Maskeleme
    const [maskTCEnabled, setMaskTCEnabled] = useState(true);
    
    // Rapor Başlığı
    const [reportTitle, setReportTitle] = useState('');
    
    // İmza Etiketleri
    const [signature1, setSignature1] = useState('Şube Müdürü');
    const [signature2, setSignature2] = useState('Başkan');
    const [signature3, setSignature3] = useState('Üye');
    
    // Sayfa Ayarları
    const [fontSize, setFontSize] = useState(7); // 5-10 pt
    const [pageOrientation, setPageOrientation] = useState('portrait'); // portrait, landscape
    const [pageScale, setPageScale] = useState(100); // 50-150

    // Modal açıldığında body scroll'u kilitle
    useEffect(() => {
        // Mevcut scroll pozisyonunu kaydet
        const scrollY = window.scrollY;
        
        // Body'yi fixed yap ve scroll pozisyonunu koru
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';
        
        // Modal kapanınca geri al
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, []);

    // Logo'yu base64 formatına çevir
    useEffect(() => {
        fetch('/logo.png')
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setLogoBase64(reader.result);
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => console.error('Logo yüklenemedi:', err));
    }, []);

    // Salonları grupla
    const salonGroups = data.reduce((acc, item) => {
        const salon = item['Salon No'] || 'Diğer';
        if (!acc[salon]) acc[salon] = [];
        acc[salon].push(item);
        return acc;
    }, {});

    const salons = Object.keys(salonGroups).sort((a, b) => 
        String(a).localeCompare(String(b), undefined, { numeric: true })
    );

    // İhlal analizi yap
    useEffect(() => {
        if (reportType === 'cheating' && data && data.length > 0) {
            analyzeCheating();
        }
    }, [reportType, data, cheatingThreshold, answerKey]);

    const analyzeCheating = () => {
        const suspicious = [];
        const byRoom = {};
        
        data.forEach(r => {
            if (r.Durum !== 'Girdi' || !r.Cevaplar) return;
            const room = r['Salon No'] || 'Genel';
            if (!byRoom[room]) byRoom[room] = [];
            byRoom[room].push(r);
        });

        Object.keys(byRoom).forEach(room => {
            const students = byRoom[room];
            for (let i = 0; i < students.length; i++) {
                for (let j = i + 1; j < students.length; j++) {
                    const s1 = students[i];
                    const s2 = students[j];
                    if (s1['Kitapçık'] !== s2['Kitapçık']) continue;

                    const booklet = s1['Kitapçık'];
                    const docType = s1['Belge Türü'];
                    const ans1 = s1.Cevaplar;
                    const ans2 = s2.Cevaplar;

                    let match = 0, total = 0, sharedCorrect = 0, sharedWrong = 0;
                    const keyMap = answerKey?.[booklet]?.[docType] || answerKey?.[booklet]?.['GENEL'];
                    const len = Math.max(ans1.length, ans2.length);

                    for (let k = 0; k < len; k++) {
                        const c1 = ans1[k], c2 = ans2[k];
                        if (c1 || c2) {
                            total++;
                            if (c1 === c2) {
                                match++;
                                if (keyMap) {
                                    const correctAns = keyMap[k + 1];
                                    if (correctAns) {
                                        if (c1 === correctAns) sharedCorrect++;
                                        else sharedWrong++;
                                    }
                                }
                            }
                        }
                    }

                    const similarity = total === 0 ? 0 : (match / total) * 100;
                    if (similarity >= cheatingThreshold) {
                        suspicious.push({
                            room, booklet, docType,
                            student1: s1, student2: s2,
                            similarity: similarity.toFixed(1),
                            sharedCorrect, sharedWrong
                        });
                    }
                }
            }
        });

        setCheatingAnalysis(suspicious);
    };

    // PDF stilleri - ortak kullanım için
    const getPrintStyles = () => `<style>
        *{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
        body{background:#fff;font-family:Arial,sans-serif}
        @page{size:A4 portrait;margin:5mm}
        @media print{
            *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
            .print-page{page-break-after:always !important;page-break-inside:avoid !important}
            .print-page:last-child{page-break-after:auto !important}
        }
        .print-page{width:210mm;min-height:280mm;background:#fff;padding:10mm 15mm;box-sizing:border-box;page-break-after:always;page-break-inside:avoid}
        .print-page:last-child{page-break-after:auto}
        .print-header{text-align:center;margin-bottom:10px;border-bottom:2px solid #333;padding-bottom:8px}
        .print-logo-img{width:60px;height:auto;margin-bottom:5px}
        .print-header h2{margin:3px 0;font-size:11px;font-weight:600;color:#333}
        .print-header h3{margin:3px 0;font-size:10px;font-weight:600;color:#444}
        .print-header h1{margin:8px 0 5px;font-size:16px;font-weight:700;color:#000}
        .print-info{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#666;margin-top:5px}
        .salon-badge{background:#007bff !important;color:#fff !important;padding:3px 10px;border-radius:4px;font-weight:600;font-size:10px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .print-table{width:100%;border-collapse:collapse;margin:8px 0}
        .print-table thead{background:#e0e0e0 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .print-table th{border:1px solid #333;padding:3px 2px;text-align:center;font-weight:700;font-size:7pt;background:#e0e0e0 !important}
        .print-table td{border:1px solid #666;padding:2px 3px;font-size:7pt}
        .print-table td:nth-child(1),.print-table td:nth-child(6),.print-table td:nth-child(7),.print-table td:nth-child(8),.print-table td:nth-child(9),.print-table td:nth-child(10),.print-table td:nth-child(11),.print-table td:nth-child(12){text-align:center}
        .print-table tr.failure{background-color:#ffcccc !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .print-table tr.failure td{background-color:#ffcccc !important}
        .print-table tr.exempt{background-color:#fff4e5 !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .print-table tr.exempt td{background-color:#fff4e5 !important}
        .print-footer{margin-top:10px;font-size:7pt}
        .footer-note{font-style:italic;margin-bottom:5px;color:#555}
        .footer-stats{margin:5px 0;color:#333;font-size:7pt}
        .signatures{display:flex;justify-content:space-around;margin-top:15px;padding-top:10px}
        .signature-box{text-align:center;min-width:120px}
        .signature-line{border-top:1px solid #333;margin-bottom:5px;width:150px;margin-left:auto;margin-right:auto}
        .signature-label{font-weight:600;font-size:8pt}
        .student-info-box{border:2px solid #333;padding:15px;margin:15px 0;border-radius:8px;background:#f9f9f9 !important}
        .info-row{display:flex;margin-bottom:10px;font-size:11pt}
        .info-row .label{font-weight:700;width:100px;color:#333}
        .info-row .value{flex:1;color:#000}
        .performance-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin:20px 0}
        .perf-item{text-align:center;padding:15px;border:2px solid #ddd;border-radius:8px;background:#fafafa !important}
        .perf-label{font-size:9pt;color:#666;margin-bottom:8px;font-weight:600}
        .perf-value{font-size:20pt;font-weight:700}
        .perf-value.correct{color:#28a745 !important}
        .perf-value.wrong{color:#dc3545 !important}
        .perf-value.empty{color:#ffc107 !important}
        .perf-value.net,.perf-value.score{color:#007bff !important}
        .result-box{text-align:center;margin:20px 0}
        .result-badge{display:inline-block;padding:12px 30px;font-size:16pt;font-weight:700;border-radius:8px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .result-badge.success{background:#d4edda !important;color:#155724 !important;border:2px solid #28a745}
        .result-badge.fail{background:#f8d7da !important;color:#721c24 !important;border:2px solid #dc3545}
        .summary-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin:20px 0}
        .stat-card{text-align:center;padding:20px;border:2px solid #ddd;border-radius:8px;background:#fafafa !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .stat-card.success{border-color:#28a745;background:#d4edda !important}
        .stat-card.fail{border-color:#dc3545;background:#f8d7da !important}
        .stat-label{font-size:10pt;color:#666;margin-bottom:8px;font-weight:600}
        .stat-value{font-size:28pt;font-weight:700;color:#000}
        .stat-percent{font-size:12pt;color:#333;margin-top:5px}
        .score-stats,.salon-breakdown{margin:20px 0}
        .score-stats h3,.salon-breakdown h3{border-bottom:2px solid #333;padding-bottom:8px;margin-bottom:12px;font-size:12pt}
        .score-info{display:flex;justify-content:space-around;padding:15px;background:#f9f9f9 !important;border-radius:8px;font-size:11pt}
        .no-cheating{text-align:center;padding:40px}
        .cheating-summary{margin:15px 0;padding:10px;background:#fff3cd !important;border-radius:6px;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}
        .cheating-table td{font-size:8pt}
        .similarity-cell{color:#dc3545 !important;font-weight:700}
        .correct-cell{color:#28a745 !important}
        .wrong-cell{color:#dc3545 !important}
    </style>`;

    // Yazdırma işlemi - PDF ile aynı stiller
    const handlePrint = async () => {
        try {
            // Logo'yu yükle
            let base64Logo = logoBase64;
            if (!base64Logo) {
                try {
                    const response = await fetch('/logo.png');
                    const blob = await response.blob();
                    base64Logo = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(blob);
                    });
                } catch (err) {
                    console.warn('Logo yüklenemedi');
                    base64Logo = '';
                }
            }

            // HTML içeriğini al ve logo'yu base64 yap
            let htmlContent = printRef.current.innerHTML;
            if (base64Logo) {
                htmlContent = htmlContent.replace(/src="\/logo\.png"/g, `src="${base64Logo}"`);
            }

            // Yeni pencerede aç ve yazdır
            const printWindow = window.open('', '_blank', 'width=800,height=600');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Yazdır</title>
                    ${getPrintStyles()}
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                window.close();
                            }, 500);
                        };
                    <\/script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } catch (error) {
            console.error('Yazdırma hatası:', error);
            // Fallback olarak normal print
            window.print();
        }
    };

    // PDF kaydetme
    const handleSavePDF = async () => {
        if (window.api && window.api.printToPDF) {
            try {
                // Logo'yu yükle (eğer henüz yüklenmediyse)
                let base64Logo = logoBase64;
                if (!base64Logo) {
                    try {
                        const response = await fetch('/logo.png');
                        const blob = await response.blob();
                        base64Logo = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(blob);
                        });
                    } catch (err) {
                        console.warn('Logo yüklenemedi, logo olmadan devam ediliyor');
                        base64Logo = '';
                    }
                }
                
                // Logo'yu base64 olarak değiştir
                let htmlContent = printRef.current.innerHTML;
                if (base64Logo) {
                    htmlContent = htmlContent.replace(/src="\/logo\.png"/g, `src="${base64Logo}"`);
                }
                const html = getPrintStyles() + htmlContent;
                
                const filename = reportType === 'salonList' ? 'Salon_Listeleri' : 
                                reportType === 'individual' ? 'Bireysel_Raporlar' : 
                                reportType === 'cheating' ? 'Ihlal_Raporu' : 'Ozet_Rapor';
                const saved = await window.api.printToPDF(html, filename);
                if (saved) {
                    alert('PDF başarıyla kaydedildi!');
                }
            } catch (error) {
                console.error('PDF kaydetme hatası:', error);
                alert('PDF kaydetme sırasında hata oluştu: ' + error.message);
            }
        } else {
            handlePrint();
        }
    };

    // Öğrenci sayısına göre dinamik stil hesapla - fontSize ayarını da dahil et
    const getTableStyle = (studentCount) => {
        // fontSize artık doğrudan pt değeri (5-10)
        return { fontSize: `${fontSize}pt` };
    };

    const getCellPadding = (studentCount) => {
        // Font boyutuna göre padding ayarla (fontSize 5-10 arası)
        const paddingMultiplier = fontSize / 7; // 7pt normal kabul edilir
        
        let basePadding;
        if (studentCount <= 25) {
            basePadding = 3;
        } else if (studentCount <= 35) {
            basePadding = 2;
        } else {
            basePadding = 1.5;
        }
        
        const vPad = Math.round(basePadding * paddingMultiplier);
        const hPad = Math.round(basePadding * paddingMultiplier * 0.8);
        return `${vPad}px ${hPad}px`;
    };

    // TC numarasını maskele: 320******48 şeklinde (veya tam göster)
    const formatTC = (tc) => {
        if (!tc) return '-';
        const tcStr = String(tc);
        if (!maskTCEnabled) return tcStr;
        if (tcStr.length < 5) return tcStr;
        const first3 = tcStr.slice(0, 3);
        const last2 = tcStr.slice(-2);
        const middleLength = tcStr.length - 5;
        const stars = '*'.repeat(middleLength);
        return `${first3}${stars}${last2}`;
    };

    // Rapor başlığını getir (özel veya varsayılan)
    const getReportTitle = (defaultTitle) => {
        return reportTitle.trim() || defaultTitle;
    };

    // Salon listesi formatı - Her salon ayrı sayfada
    const renderSalonList = () => {
        return salons.map(salon => {
            const students = salonGroups[salon];
            const enteredCount = students.filter(s => !String(s.Durum).includes('GİRMEDİ')).length;
            const passedCount = students.filter(s => String(s.Sonuç).includes('Başarılı')).length;
            const tableStyle = getTableStyle(students.length);
            const cellPadding = getCellPadding(students.length);
            const thStyle = { padding: cellPadding };

            return (
                <div key={salon} className="print-page">
                    <div className="print-header">
                        {showLogo && <img src="/logo.png" alt="MEB Logo" className="print-logo-img" />}
                        <h2>T.C. MİLLİ EĞİTİM BAKANLIĞI</h2>
                        {showSubtitle && subtitle && <h3 className="print-subtitle">{subtitle}</h3>}
                        <h1>{getReportTitle('SINAV SONUÇ LİSTESİ')}</h1>
                        <div className="print-info">
                            <span>Tarih: {new Date().toLocaleDateString('tr-TR')}</span>
                            <span className="salon-badge">Salon: {salon}</span>
                        </div>
                    </div>

                    <table className="print-table" style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Sıra</th>
                                <th style={thStyle}>TC No</th>
                                <th style={thStyle}>Ad Soyad</th>
                                <th style={thStyle}>Belge Türü</th>
                                <th style={thStyle}>Durum</th>
                                <th style={thStyle}>Kitapçık</th>
                                <th style={thStyle}>Doğru</th>
                                <th style={thStyle}>Yanlış</th>
                                <th style={thStyle}>Boş</th>
                                <th style={thStyle}>Net</th>
                                <th style={thStyle}>Puan</th>
                                <th style={thStyle}>Sonuç</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student, idx) => {
                                const net = student.Doğru - (student.Yanlış * 0.25);
                                const isFailure = String(student.Sonuç).includes('Başarısız') || String(student.Durum).toLowerCase().includes('girmedi');
                                const isExempt = String(student.Durum).includes('MUAF');
                                const tdStyle = { padding: cellPadding };
                                
                                return (
                                    <tr key={idx} className={isFailure ? 'failure' : isExempt ? 'exempt' : ''}>
                                        <td style={tdStyle}>{idx + 1}</td>
                                        <td style={tdStyle}>{formatTC(student['TC Kimlik'])}</td>
                                        <td style={tdStyle}>{student['Ad Soyad']}</td>
                                        <td style={tdStyle}>{student['Belge Türü']}</td>
                                        <td style={tdStyle}>{student.Durum}</td>
                                        <td style={tdStyle}>{student.Kitapçık || '-'}</td>
                                        <td style={tdStyle}>{student.Doğru}</td>
                                        <td style={tdStyle}>{student.Yanlış}</td>
                                        <td style={tdStyle}>{student.Boş}</td>
                                        <td style={tdStyle}>{net.toFixed(2)}</td>
                                        <td style={tdStyle}>{student.Puan}</td>
                                        <td style={tdStyle}>{student.Sonuç}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    <div className="print-footer">
                        <p className="footer-note">
                            Not: Yeterli notu alamayanlar ile başarısız olanların durumu kırmızı kalemle işaretlenmiştir.
                        </p>
                        <p className="footer-stats">
                            {new Date().toLocaleDateString('tr-TR')} günü yapılan test sınavına giren <strong>({enteredCount})</strong> kişinin isimleri ve imtihan sonuçları yukarıda açıklanmıştır.
                        </p>
                        <p className="footer-stats">
                            Sınava giren öğrenciden <strong>({passedCount})</strong> kişi başarılı olmuştur.
                        </p>
                        
                        <div className="signatures">
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <div className="signature-label">{signature1}</div>
                            </div>
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <div className="signature-label">{signature2}</div>
                            </div>
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <div className="signature-label">{signature3}</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // Bireysel rapor formatı
    const renderIndividualReports = () => {
        return data.map((student, idx) => (
            <div key={idx} className="print-page individual-report">
                <div className="print-header">
                    {showLogo && <img src="/logo.png" alt="MEB Logo" className="print-logo-img" />}
                    <h2>T.C. MİLLİ EĞİTİM BAKANLIĞI</h2>
                    {showSubtitle && subtitle && <h3 className="print-subtitle">{subtitle}</h3>}
                    <h1>{getReportTitle('BİREYSEL SINAV PERFORMANS RAPORU')}</h1>
                </div>

                <div className="student-info-box">
                    <div className="info-row">
                        <span className="label">Öğrenci:</span>
                        <span className="value">{student['Ad Soyad']}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">TC No:</span>
                        <span className="value">{formatTC(student['TC Kimlik'])}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">Sınav:</span>
                        <span className="value">{getReportTitle('SINAV SONUÇ LİSTESİ')}</span>
                    </div>
                    <div className="info-row">
                        <span className="label">Tarih:</span>
                        <span className="value">{new Date().toLocaleDateString('tr-TR')}</span>
                    </div>
                </div>

                <div className="performance-summary">
                    <div className="perf-item">
                        <div className="perf-label">Doğru</div>
                        <div className="perf-value correct">{student.Doğru}</div>
                    </div>
                    <div className="perf-item">
                        <div className="perf-label">Yanlış</div>
                        <div className="perf-value wrong">{student.Yanlış}</div>
                    </div>
                    <div className="perf-item">
                        <div className="perf-label">Boş</div>
                        <div className="perf-value empty">{student.Boş}</div>
                    </div>
                    <div className="perf-item">
                        <div className="perf-label">Net</div>
                        <div className="perf-value net">{(student.Doğru - student.Yanlış * 0.25).toFixed(2)}</div>
                    </div>
                    <div className="perf-item">
                        <div className="perf-label">Puan</div>
                        <div className="perf-value score">{student.Puan}</div>
                    </div>
                </div>

                <div className="result-box">
                    <div className={`result-badge ${String(student.Sonuç).includes('Başarılı') ? 'success' : 'fail'}`}>
                        {student.Sonuç}
                    </div>
                </div>

                <div className="print-footer">
                    <p className="footer-note">
                        Bu rapor otomatik olarak oluşturulmuştur.
                    </p>
                </div>
            </div>
        ));
    };

    // Özet rapor
    const renderSummaryReport = () => {
        const totalStudents = data.length;
        const passedStudents = data.filter(s => String(s.Sonuç).includes('Başarılı')).length;
        const failedStudents = data.filter(s => String(s.Sonuç).includes('Başarısız')).length;
        const avgScore = totalStudents > 0 ? (data.reduce((sum, s) => sum + parseFloat(s.Puan || 0), 0) / totalStudents).toFixed(2) : '0';
        const maxScore = totalStudents > 0 ? Math.max(...data.map(s => parseFloat(s.Puan || 0))) : 0;
        const minScore = totalStudents > 0 ? Math.min(...data.map(s => parseFloat(s.Puan || 0))) : 0;

        return (
            <div className="print-page summary-report">
                <div className="print-header">
                    {showLogo && <img src="/logo.png" alt="MEB Logo" className="print-logo-img" />}
                    <h2>T.C. MİLLİ EĞİTİM BAKANLIĞI</h2>
                    {showSubtitle && subtitle && <h3 className="print-subtitle">{subtitle}</h3>}
                    <h1>{getReportTitle('SINAV ANALİZ ÖZET RAPORU')}</h1>
                    <div className="print-info">
                        <span>Tarih: {new Date().toLocaleDateString('tr-TR')}</span>
                    </div>
                </div>

                <div className="summary-stats">
                    <div className="stat-card">
                        <div className="stat-label">Toplam Öğrenci</div>
                        <div className="stat-value">{totalStudents}</div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-label">Başarılı</div>
                        <div className="stat-value">{passedStudents}</div>
                        <div className="stat-percent">{totalStudents > 0 ? ((passedStudents / totalStudents) * 100).toFixed(1) : 0}%</div>
                    </div>
                    <div className="stat-card fail">
                        <div className="stat-label">Başarısız</div>
                        <div className="stat-value">{failedStudents}</div>
                        <div className="stat-percent">{totalStudents > 0 ? ((failedStudents / totalStudents) * 100).toFixed(1) : 0}%</div>
                    </div>
                </div>

                <div className="score-stats">
                    <h3>Puan İstatistikleri</h3>
                    <div className="score-info">
                        <div>Ortalama: <strong>{avgScore}</strong></div>
                        <div>En Yüksek: <strong>{maxScore}</strong></div>
                        <div>En Düşük: <strong>{minScore}</strong></div>
                    </div>
                </div>

                <div className="salon-breakdown">
                    <h3>Salon Bazlı Performans</h3>
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>Salon</th>
                                <th>Öğrenci Sayısı</th>
                                <th>Başarılı</th>
                                <th>Başarı Oranı</th>
                                <th>Ortalama Puan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salons.map(salon => {
                                const students = salonGroups[salon];
                                const passed = students.filter(s => String(s.Sonuç).includes('Başarılı')).length;
                                const avg = (students.reduce((sum, s) => sum + parseFloat(s.Puan || 0), 0) / students.length).toFixed(2);
                                
                                return (
                                    <tr key={salon}>
                                        <td>{salon}</td>
                                        <td>{students.length}</td>
                                        <td>{passed}</td>
                                        <td>{((passed / students.length) * 100).toFixed(1)}%</td>
                                        <td>{avg}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // İhlal analizi raporu
    const renderCheatingReport = () => {
        // Salonlara göre grupla
        const byRoom = {};
        cheatingAnalysis.forEach(item => {
            if (!byRoom[item.room]) byRoom[item.room] = [];
            byRoom[item.room].push(item);
        });

        return (
            <div className="print-page cheating-report">
                <div className="print-header">
                    {showLogo && <img src="/logo.png" alt="MEB Logo" className="print-logo-img" />}
                    <h2>T.C. MİLLİ EĞİTİM BAKANLIĞI</h2>
                    {showSubtitle && subtitle && <h3 className="print-subtitle">{subtitle}</h3>}
                    <h1>{getReportTitle('⚠️ SINAV İHLALİ ANALİZ RAPORU')}</h1>
                    <div className="print-info">
                        <span>Tarih: {new Date().toLocaleDateString('tr-TR')}</span>
                        <span>Benzerlik Eşiği: %{cheatingThreshold}</span>
                    </div>
                </div>

                {cheatingAnalysis.length === 0 ? (
                    <div className="no-cheating">
                        <span className="check-icon">✅</span>
                        <h3>Şüpheli Durum Tespit Edilmedi</h3>
                        <p>%{cheatingThreshold} ve üzeri benzerlik oranına sahip öğrenci çifti bulunamadı.</p>
                    </div>
                ) : (
                    <>
                        <div className="cheating-summary">
                            <p><strong>Toplam {cheatingAnalysis.length}</strong> şüpheli eşleşme tespit edildi.</p>
                        </div>

                        <table className="print-table cheating-table">
                            <thead>
                                <tr>
                                    <th>Sıra</th>
                                    <th>Salon</th>
                                    <th>Kitapçık</th>
                                    <th>Öğrenci 1</th>
                                    <th>Öğrenci 2</th>
                                    <th>Benzerlik</th>
                                    <th>Ortak Doğru</th>
                                    <th>Ortak Yanlış</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cheatingAnalysis.map((item, idx) => (
                                    <tr key={idx} className="suspicious-row">
                                        <td>{idx + 1}</td>
                                        <td>{item.room}</td>
                                        <td>{item.booklet}</td>
                                        <td>
                                            <div>{item.student1['Ad Soyad']}</div>
                                            <small>{formatTC(item.student1['TC Kimlik'])} - {item.student1.Puan} Puan</small>
                                        </td>
                                        <td>
                                            <div>{item.student2['Ad Soyad']}</div>
                                            <small>{formatTC(item.student2['TC Kimlik'])} - {item.student2.Puan} Puan</small>
                                        </td>
                                        <td className="similarity-cell">%{item.similarity}</td>
                                        <td className="correct-cell">{item.sharedCorrect}</td>
                                        <td className="wrong-cell">{item.sharedWrong}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="print-footer">
                            <p className="footer-note">
                                Not: Bu rapor sadece istatistiksel benzerliğe dayanmaktadır. 
                                Kesin hüküm için detaylı inceleme yapılmalıdır.
                            </p>
                            <div className="signatures">
                                <div className="signature-box">
                                    <div className="signature-line"></div>
                                    <div className="signature-label">{signature1}</div>
                                </div>
                                <div className="signature-box">
                                    <div className="signature-line"></div>
                                    <div className="signature-label">{signature2}</div>
                                </div>
                                <div className="signature-box">
                                    <div className="signature-line"></div>
                                    <div className="signature-label">{signature3}</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="print-preview-modal">
            <div className="print-preview-header no-print">
                <h2>📄 Rapor Önizleme</h2>
                <div className="header-actions">
                    <button onClick={handlePrint} className="btn btn-primary">
                        🖨️ Yazdır
                    </button>
                    <button onClick={handleSavePDF} className="btn btn-success">
                        📄 PDF Kaydet
                    </button>
                    <button onClick={onClose} className="btn btn-close">
                        ❌
                    </button>
                </div>
            </div>

            <div className="print-preview-body">
                {/* Sol Panel - Özelleştirme Seçenekleri */}
                <div className="print-sidebar no-print">
                    <div className="sidebar-section">
                        <h3>📋 Rapor Ayarları</h3>
                        
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={showLogo} 
                                onChange={(e) => setShowLogo(e.target.checked)} 
                            />
                            <span>Logo Göster</span>
                        </label>
                        
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={showSubtitle} 
                                onChange={(e) => setShowSubtitle(e.target.checked)} 
                            />
                            <span>Alt Başlık Göster</span>
                        </label>
                        
                        {showSubtitle && (
                            <input 
                                type="text" 
                                className="subtitle-input"
                                placeholder="Kurum adı veya başlık..."
                                value={subtitle}
                                onChange={(e) => setSubtitle(e.target.value)}
                            />
                        )}
                        
                        <label className="checkbox-item">
                            <input 
                                type="checkbox" 
                                checked={maskTCEnabled} 
                                onChange={(e) => setMaskTCEnabled(e.target.checked)} 
                            />
                            <span>TC Kimlik Maskele</span>
                        </label>
                        
                        <div className="input-section">
                            <label>📝 Rapor Başlığı</label>
                            <input 
                                type="text" 
                                className="subtitle-input"
                                placeholder="Özel başlık (boş bırakılırsa varsayılan)"
                                value={reportTitle}
                                onChange={(e) => setReportTitle(e.target.value)}
                            />
                        </div>

                        {reportType === 'cheating' && (
                            <div className="threshold-section">
                                <label>Benzerlik Eşiği (%)</label>
                                <input 
                                    type="number" 
                                    className="threshold-input"
                                    min="50" 
                                    max="100" 
                                    value={cheatingThreshold}
                                    onChange={(e) => setCheatingThreshold(Number(e.target.value))}
                                />
                                <small>{cheatingAnalysis.length} şüpheli eşleşme</small>
                            </div>
                        )}
                    </div>
                    
                    {/* İmza Etiketleri */}
                    <div className="sidebar-section">
                        <h3>✍️ İmza Etiketleri</h3>
                        <div className="signature-inputs">
                            <input 
                                type="text" 
                                className="signature-input"
                                placeholder="İmza 1"
                                value={signature1}
                                onChange={(e) => setSignature1(e.target.value)}
                            />
                            <input 
                                type="text" 
                                className="signature-input"
                                placeholder="İmza 2"
                                value={signature2}
                                onChange={(e) => setSignature2(e.target.value)}
                            />
                            <input 
                                type="text" 
                                className="signature-input"
                                placeholder="İmza 3"
                                value={signature3}
                                onChange={(e) => setSignature3(e.target.value)}
                            />
                        </div>
                    </div>
                    
                    {/* Sayfa Ayarları */}
                    <div className="sidebar-section">
                        <h3>📐 Sayfa Ayarları</h3>
                        
                        <div className="setting-row">
                            <label>Yazı Boyutu</label>
                            <div className="scale-container">
                                <input 
                                    type="range" 
                                    className="scale-slider"
                                    min="5" 
                                    max="15" 
                                    step="0.5"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                />
                                <span className="scale-value">{fontSize}pt</span>
                            </div>
                        </div>
                        
                        <div className="setting-row">
                            <label>Sayfa Yönü</label>
                            <select 
                                className="setting-select"
                                value={pageOrientation}
                                onChange={(e) => setPageOrientation(e.target.value)}
                            >
                                <option value="portrait">📄 Dikey</option>
                                <option value="landscape">📃 Yatay</option>
                            </select>
                        </div>
                        
                        <div className="setting-row">
                            <label>Ölçek</label>
                            <div className="scale-container">
                                <input 
                                    type="range" 
                                    className="scale-slider"
                                    min="50" 
                                    max="150" 
                                    step="10"
                                    value={pageScale}
                                    onChange={(e) => setPageScale(Number(e.target.value))}
                                />
                                <span className="scale-value">%{pageScale}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Panel - Önizleme */}
                <div 
                    className={`print-preview-content ${pageOrientation === 'landscape' ? 'landscape' : ''}`} 
                    ref={printRef}
                    style={{ 
                        '--page-scale': pageScale / 100,
                        '--font-size-multiplier': fontSize === 'small' ? 0.85 : fontSize === 'large' ? 1.15 : 1
                    }}
                >
                    {reportType === 'salonList' && renderSalonList()}
                    {reportType === 'individual' && renderIndividualReports()}
                    {reportType === 'summary' && renderSummaryReport()}
                    {reportType === 'cheating' && renderCheatingReport()}
                </div>
            </div>
        </div>
    );
}
