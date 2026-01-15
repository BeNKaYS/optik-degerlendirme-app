import React, { useState, useEffect } from 'react';

export default function HelpModal({ onClose }) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('hideHelpOnStartup');
        if (stored === 'true') setDontShowAgain(true);
    }, []);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('hideHelpOnStartup', 'true');
        } else {
            localStorage.removeItem('hideHelpOnStartup');
        }
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📖 Kullanım Kılavuzu</h2>
                    <button className="close-btn" onClick={handleClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <section>
                        <h3>🚀 1. Başlangıç (Sınav Yönetimi)</h3>
                        <p>Uygulamayı açtığınızda <strong>Sınav Yönetimi</strong> ekranı sizi karşılar.</p>
                        <ul>
                            <li><strong>Yeni Sınav:</strong> Sınav ismini yazıp <code>BAŞLA</code> butonuna tıklayın.</li>
                            <li><strong>Kayıtlı Sınavlar:</strong> Listedeki sınavları <code>📂 Yükle</code> ile açabilir veya <code>🗑️ Sil</code> ile kaldırabilirsiniz.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>📋 2. Yoklama Listesi Yükleme</h3>
                        <p>Sınava girecek adayların listesini yükleyin.</p>
                        <ul>
                            <li><strong>Dosya:</strong> .xlsx veya .xls</li>
                            <li><strong>Gerekli Sütunlar:</strong> <code>TC Kimlik</code>, <code>Ad Soyad</code>, <code>Belge Türü</code> (SRC1, ÜDY3 vb.).</li>
                        </ul>
                    </section>

                    <section>
                        <h3>👁️ 3. Optik Veri Yükleme</h3>
                        <p>Optik okuyucudan alınan ham metin verilerini işleyin.</p>
                        <ul>
                            <li><strong>Dosya:</strong> .txt veya .fmt</li>
                            <li><strong>Ayarlar:</strong> Sağ panelden Ad, Soyad, TC gibi alanların başlangıç ve uzunluk değerlerini girip <code>Uygula</code> diyerek önizlemeyi kontrol edin.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>🔑 4. Cevap Anahtarı</h3>
                        <p>Doğru/Yanlış hesaplaması için cevap anahtarı yükleyin.</p>
                        <ul>
                            <li>Excel <strong>Sayfa İsimleri</strong> (Sheet) kitapçık türü olmalıdır (A, B).</li>
                            <li>Sütun başlıkları belge türü olmalıdır (SRC1, ÜDY3).</li>
                        </ul>
                    </section>

                    <section>
                        <h3>⚖️ 5. Değerlendirme ve Sonuç</h3>
                        <p>Tüm veriler "Hazır" olduğunda <code>DEĞERLENDİR</code> butonuna basın.</p>
                        <ul>
                            <li>Sonuçları salon bazlı filtreleyebilirsiniz.</li>
                            <li><code>📥 Excel Olarak İndir</code> ile resmi formatta rapor alabilirsiniz.</li>
                        </ul>
                    </section>

                    <section>
                        <h3>📊 6. İstatistikler</h3>
                        <p>Sınav başarı durumunu ve geçmiş sınavlarla karşılaştırmalı trendleri inceleyin. Sayfayı PDF olarak kaydetmek için <code>🖨️ PDF / Yazdır</code> butonunu kullanın.</p>
                    </section>

                    <section>
                        <h3>🎨 7. Tema Değiştirme</h3>
                        <p>Uygulama varsayılan olarak açık tema (light mode) ile açılır. Koyu tema için <strong>Hakkında</strong> sekmesine gidin ve tema değiştirme butonunu kullanın.</p>
                    </section>

                    <section>
                        <h3>⚡ 8. Klavye Kısayolları</h3>
                        <ul>
                            <li><code>F1</code> - Bu yardım penceresini aç/kapat</li>
                            <li><code>Ctrl/Cmd + S</code> - Mevcut sınavı kaydet</li>
                        </ul>
                    </section>

                    <div className="version-info">
                        <strong>Versiyon:</strong> 1.4.0 | <strong>Güncelleme:</strong> 15 Ocak 2026
                    </div>

                    <div className="developer-info">
                        <strong>Geliştirici:</strong> Sercan ÖZDEMİR (BeNKaYS) | <em>sercanozdemir@yandex.com</em>
                    </div>
                </div>

                <div className="modal-footer">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                        />
                        Başlangıçta bir daha gösterme
                    </label>
                    <button className="primary-btn" onClick={handleClose}>Anladım</button>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    z-index: 1000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.2s;
                }
                .modal-content {
                    width: 800px;
                    max-width: 90%;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-bottom: 15px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    margin-bottom: 15px;
                }
                .modal-header h2 { margin: 0; font-size: 1.5rem; color: var(--accent); }
                .close-btn {
                    background: none; border: none; font-size: 2rem; color: rgba(255,255,255,0.6); cursor: pointer;
                }
                .close-btn:hover { color: white; }
                
                .modal-body {
                    overflow-y: auto;
                    padding-right: 10px;
                    flex: 1;
                }
                .modal-footer {
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(255,255,255,0.7);
                    font-size: 0.9rem;
                    cursor: pointer;
                }
                section { margin-bottom: 25px; }
                section h3 { color: #e2e8f0; margin-bottom: 10px; font-size: 1.1rem; border-left: 3px solid var(--accent); padding-left: 10px; }
                section p { font-size: 0.95rem; color: rgba(255,255,255,0.8); margin-bottom: 5px; }
                section ul { margin: 5px 0 0 20px; color: rgba(255,255,255,0.7); font-size: 0.9rem; }
                section li { margin-bottom: 5px; }
                
                .developer-info {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255,255,255,0.1);
                    text-align: center;
                    font-size: 0.9rem;
                    color: rgba(255,255,255,0.5);
                }

<<<<<<< HEAD
                /* Code styling for dark mode */
                code {
                    background: rgba(255, 255, 255, 0.1);
                    color: #a5b4fc;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 0.9em;
                }

                /* ===== LIGHT MODE STYLES ===== */
                .light-mode .modal-content {
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(0,0,0,0.15);
                }
                .light-mode .modal-header {
                    border-bottom: 1px solid rgba(0,0,0,0.1);
                }
                .light-mode .modal-header h2 {
                    color: var(--accent);
                }
                .light-mode .close-btn {
                    color: rgba(0,0,0,0.6);
                }
                .light-mode .close-btn:hover {
                    color: #000;
                }
                .light-mode section h3 {
                    color: #1e293b;
                }
                .light-mode section p {
                    color: #334155;
                }
                .light-mode section ul {
                    color: #475569;
                }
                .light-mode section li {
                    color: #475569;
                }
                .light-mode code {
                    background: rgba(79, 70, 229, 0.1);
                    color: #4f46e5;
                }
                .light-mode .modal-footer {
                    border-top: 1px solid rgba(0,0,0,0.1);
                }
                .light-mode .checkbox-label {
                    color: #475569;
                }
                .light-mode .developer-info {
                    border-top: 1px solid rgba(0,0,0,0.1);
                    color: #64748b;
                }

=======
>>>>>>> 26b94059835dcda23ecf6dbacb5943af28eddba8
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}
