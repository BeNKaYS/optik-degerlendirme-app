/**
 * @file OpticalTab.jsx
 * @description Optik okuyucu çıktılarının (TXT/FMT) yüklendiği, parse edildiği ve doğrulandığı bileşen.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

import { useState } from 'react';
import { parseOpticalData } from '../../utils/txtParser';

// ==========================================
//  BİLEŞEN TANIMI
// ==========================================
export default function OpticalTab({ data, setData, attendanceData, onNext }) {

    // -------------------------------------------------------------------------
    //  STATE YÖNETİMİ
    // -------------------------------------------------------------------------
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fileName, setFileName] = useState('');
    const [rawText, setRawText] = useState(null); // Ham veri (String olarak saklanır)

    // Parse Ayarları (Varsayılan Değerler)
    const [showSettings, setShowSettings] = useState(false);
    const [parserConfig, setParserConfig] = useState({
        sira: { start: 0, length: 0 },
        tcNo: { start: 22, length: 11 },
        adSoyad: { start: 0, length: 22 },
        salonNo: { start: 33, length: 2 },
        girmedi: { start: 35, length: 2 },
        kitapcik: { start: 37, length: 1 },
        cevaplar: { start: 38, length: '' } // Boş = Satır sonuna kadar
    });

    // -------------------------------------------------------------------------
    //  YARDIMCI VE MANTIK FONKSİYONLARI
    // -------------------------------------------------------------------------

    /**
     * Parse ayarlarını günceller.
     */
    const handleConfigChange = (field, key, value) => {
        // Boş string veya sayısal değer olarak sakla
        const parsedValue = value === '' ? '' : (isNaN(parseInt(value)) ? '' : parseInt(value));
        setParserConfig(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [key]: parsedValue
            }
        }));
    };

    /**
     * UI için tutulan "boş string" değerlerini sayısal konfigurasyona çevirir.
     */
    const getCleanConfig = () => {
        const cleanConfig = {};
        Object.keys(parserConfig).forEach(key => {
            cleanConfig[key] = {
                start: parseInt(parserConfig[key].start) || 0,
                length: parserConfig[key].length === '' ? null : parseInt(parserConfig[key].length)
            };
        });
        return cleanConfig;
    };

    /**
     * Mükerrer TC kimlik numaralarını filtreler.
     * Kural: Eğer aynı TC birden fazla geçiyorsa, dosyadaki SON giriş geçerlidir.
     */
    const filterDuplicates = (rawData) => {
        const uniqueMap = new Map();

        rawData.forEach(item => {
            // TC No geçerli ise anahtar olarak kullan, yoksa ID kullan (benzersiz olsun)
            const key = (item.tcNo && item.tcNo.trim().length > 0) ? item.tcNo.trim() : `__no_tc_${item.id}`;
            uniqueMap.set(key, item); // Varsa üzerine yazar (sonuncuyu tutar)
        });

        // Map değerlerini diziye çevir ve ID'ye göre yeniden sırala
        return Array.from(uniqueMap.values()).sort((a, b) => a.id - b.id);
    };

    /**
     * TC Kimlik doğrulaması yapar.
     * @param {string} tc - Öğrenci TC Kimlik No
     * @returns {boolean} Geçerli mi?
     */
    const isValidTC = (tc) => {
        if (!tc) return false;
        const cleaned = String(tc).trim();
        // TC tam 11 haneli olmalı ve sadece rakam içermeli
        return /^\d{11}$/.test(cleaned);
    };

    /**
     * Öğrencinin yoklama listesinde olup olmadığını kontrol eder.
     * Sadece TAM EŞLEŞMEyi kabul eder.
     * @param {string} tc - Öğrenci TC Kimlik No
     * @returns {{ status: 'valid' | 'invalid' | 'registered' | 'unregistered' | 'unknown', message: string }}
     */
    const getStudentStatus = (tc) => {
        const cleanedTc = String(tc || '').trim();

        // TC Doğrulama: Tam 11 hane mi?
        if (!isValidTC(cleanedTc)) {
            return {
                status: 'invalid',
                message: `Geçersiz TC (${cleanedTc.length} hane)`
            };
        }

        if (!attendanceData) {
            return { status: 'unknown', message: '-' };
        }

        // TAM EŞLEŞMEyle ara (includes DEĞİL, === kullan)
        const exists = attendanceData.some(row => {
            return Object.values(row).some(val => {
                const valStr = String(val).trim();
                // TC sütunu genelde 11 haneli olmalı, tam eşleşme yap
                return valStr === cleanedTc;
            });
        });

        return exists
            ? { status: 'registered', message: 'Listede Var' }
            : { status: 'unregistered', message: 'Listede Yok' };
    };

    /**
     * Optik veri istatistiklerini hesaplar
     */
    const getOpticalStats = () => {
        if (!data || data.length === 0) return null;

        // Toplam kayıt sayısı
        const totalRecords = data.length;

        // Benzersiz TC sayısı (tekrar edenler hariç)
        const tcSet = new Set(data.filter(d => d.tcNo && d.tcNo.trim()).map(d => d.tcNo.trim()));
        const uniqueTcCount = tcSet.size;

        // Tekrar eden TC sayısı (rawText'ten parse edilen orijinal verideki tekrarlar)
        // data zaten filtrelenmiş olduğu için rawText'i yeniden parse etmemiz gerekir
        let duplicateCount = 0;
        if (rawText) {
            try {
                const cleanConfig = getCleanConfig();
                const allParsedData = parseOpticalData(rawText, cleanConfig);
                const tcCounts = {};
                allParsedData.forEach(item => {
                    if (item.tcNo && item.tcNo.trim()) {
                        const tc = item.tcNo.trim();
                        tcCounts[tc] = (tcCounts[tc] || 0) + 1;
                    }
                });
                duplicateCount = Object.values(tcCounts).filter(count => count > 1).reduce((sum, count) => sum + (count - 1), 0);
            } catch (e) {
                duplicateCount = 0;
            }
        }

        // Girmedi durumundaki öğrenci sayısı - Durum sütununda "G" olanlar
        const notAttendedCount = data.filter(d =>
            d.girmediDurumu && d.girmediDurumu.trim().toUpperCase() === 'G'
        ).length;

        // Sınava giren ve cevap veren sayısı - Cevaplar sütunu dolu ve Durum "G" olmayan
        const attendedCount = data.filter(d =>
            d.ogrenciCevaplari &&
            d.ogrenciCevaplari.trim().length > 0 &&
            (!d.girmediDurumu || d.girmediDurumu.trim().toUpperCase() !== 'G')
        ).length;

        // Benzersiz salon sayısı
        const salonSet = new Set(data.filter(d => d.salonNo).map(d => d.salonNo));
        const salonCount = salonSet.size;

        // Kitapçık türleri
        const kitapcikSet = new Set(data.filter(d => d.kitapcikTuru).map(d => d.kitapcikTuru));
        const kitapcikTypes = Array.from(kitapcikSet).join(', ') || '-';

        return {
            totalRecords,
            uniqueTcCount,
            duplicateCount,
            notAttendedCount,
            attendedCount,
            salonCount,
            kitapcikTypes
        };
    };

    const stats = getOpticalStats();

    // -------------------------------------------------------------------------
    //  İŞLEYİCİLER (HANDLERS)
    // -------------------------------------------------------------------------

    /**
     * Dosya yükleme ve parse işlemini yönetir.
     */
    const handleFileUpload = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!window.api) throw new Error("Electron API unavailable");

            const filePath = await window.api.selectFile([{ name: 'Data Files', extensions: ['txt', 'fmt'] }]);
            if (filePath) {
                setFileName(filePath.split(/[/\\]/).pop());
                const textContent = await window.api.readFileText(filePath);
                setRawText(textContent); // Ham veriyi sakla

                const cleanConfig = getCleanConfig();
                const parsedData = parseOpticalData(textContent, cleanConfig);

                if (parsedData.length === 0) {
                    throw new Error("Dosyada geçerli satır bulunamadı.");
                }

                const uniqueData = filterDuplicates(parsedData);
                setData(uniqueData);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Ayarları uygulayarak veriyi yeniden parse eder.
     */
    const applySettings = () => {
        console.log('applySettings called, rawText:', rawText ? 'exists' : 'null');
        if (!rawText) {
            setError("Lütfen önce bir dosya yükleyiniz. (Ayarların geçerli olması için ham veri gerekli)");
            return;
        }
        try {
            console.log('Parsing with config:', parserConfig);
            const cleanConfig = getCleanConfig();
            console.log('Clean config:', cleanConfig);
            const parsedData = parseOpticalData(rawText, cleanConfig);

            if (parsedData.length === 0) throw new Error("Dosyada geçerli satır bulunamadı.");

            const uniqueData = filterDuplicates(parsedData);
            setData(uniqueData);
            setError(null);
        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    const handleExportConfig = async () => {
        try {
            if (!window.api) return;
            const jsonStr = JSON.stringify(parserConfig, null, 2);
            const encoder = new TextEncoder();
            const buffer = encoder.encode(jsonStr);
            await window.api.saveFile(buffer, 'optik-ayar.json');
        } catch (err) {
            console.error(err);
            setError('Ayarlar dışa aktarılamadı.');
        }
    };

    const handleImportConfig = async () => {
        try {
            if (!window.api) return;
            const filePath = await window.api.selectFile([{ name: 'JSON Config', extensions: ['json'] }]);
            if (filePath) {
                const jsonStr = await window.api.readFileText(filePath);
                const config = JSON.parse(jsonStr);
                setParserConfig(config);
            }
        } catch (err) {
            console.error(err);
            setError('Ayarlar yüklenirken hata oluştu. Dosya formatını kontrol edin.');
        }
    };

    // -------------------------------------------------------------------------
    //  RENDER
    // -------------------------------------------------------------------------
    return (
        <div className="tab-content glass-panel">
            {/* Başlık */}
            <div className="tab-header">
                <h2>Optik Veri Yükleme (TXT/FMT)</h2>
                <p className="text-secondary">Optik okuyucudan alınan ham veri dosyasını yükleyin.</p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="action-area">
                <button className="primary-btn" onClick={handleFileUpload} disabled={loading}>
                    {loading ? 'Yükleniyor...' : 'Dosya Seç'}
                </button>
                <button className="settings-toggle-btn" onClick={() => setShowSettings(!showSettings)}>
                    <span>⚙️</span> {showSettings ? 'Ayarları Gizle' : 'Format Ayarları'}
                </button>
                {fileName && <span className="file-name">Seçilen: {fileName}</span>}
            </div>

            {/* Ayar Paneli */}
            {showSettings && (
                <div className="settings-panel">
                    <div className="settings-header">
                        <div className="settings-title">
                            <span className="settings-icon">⚙️</span>
                            <h3>TXT Format Ayarları</h3>
                        </div>
                        <div className="setting-actions">
                            <button className="action-btn import" onClick={handleImportConfig}>
                                <span>📂</span> İçe Aktar
                            </button>
                            <button className="action-btn export" onClick={handleExportConfig}>
                                <span>💾</span> Dışa Aktar
                            </button>
                        </div>
                    </div>

                    <div className="settings-table">
                        <div className="settings-table-header">
                            <div className="col-field">Alan</div>
                            <div className="col-start">Başlangıç Pozisyonu</div>
                            <div className="col-length">Uzunluk (Karakter)</div>
                        </div>

                        {[
                            { key: 'sira', label: 'Sıra No', icon: '#️⃣' },
                            { key: 'tcNo', label: 'TC Kimlik', icon: '🆔' },
                            { key: 'adSoyad', label: 'Adı Soyadı', icon: '👤' },
                            { key: 'salonNo', label: 'Salon No', icon: '🏫' },
                            { key: 'girmedi', label: 'Durum', icon: '📋' },
                            { key: 'kitapcik', label: 'Kitapçık', icon: '📖' },
                            { key: 'cevaplar', label: 'Cevaplar', icon: '✏️' }
                        ].map((field) => (
                            <div className="settings-table-row" key={field.key}>
                                <div className="col-field">
                                    <span className="field-icon">{field.icon}</span>
                                    <span className="field-label">{field.label}</span>
                                </div>
                                <div className="col-start">
                                    <input
                                        type="number"
                                        min="0"
                                        value={parserConfig[field.key].start}
                                        onChange={(e) => handleConfigChange(field.key, 'start', e.target.value)}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="col-length">
                                    <input
                                        type="number"
                                        min="0"
                                        value={parserConfig[field.key].length}
                                        onChange={(e) => handleConfigChange(field.key, 'length', e.target.value)}
                                        placeholder={field.key === 'cevaplar' ? "Boş=Satır sonu" : "0"}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="settings-footer">
                        <div className="footer-hint">
                            <span className="hint-icon">💡</span>
                            <span>Uzunluk alanı boş bırakılırsa satır sonuna kadar okunur</span>
                        </div>
                        <button className="apply-btn" onClick={() => { console.log('Button clicked'); applySettings(); }}>
                            <span>✅</span> Uygula ve Yenile
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div className="alert error">
                    <span>⚠️ {error}</span>
                </div>
            )}

            {/* Veri Önizleme Tablosu */}
            {data && data.length > 0 && (
                <div className="preview-area">
                    {/* İstatistik Kartları */}
                    {stats && (
                        <div className="optical-stats-grid">
                            <div className="optical-stat-card">
                                <div className="stat-icon">📊</div>
                                <div className="stat-content">
                                    <span className="stat-label">OKUNAN VERİ</span>
                                    <span className="stat-value">{stats.totalRecords}</span>
                                </div>
                            </div>
                            <div className="optical-stat-card warning">
                                <div className="stat-icon">🔄</div>
                                <div className="stat-content">
                                    <span className="stat-label">TEKRAR EDEN</span>
                                    <span className="stat-value">{stats.duplicateCount}</span>
                                </div>
                            </div>
                            <div className="optical-stat-card success">
                                <div className="stat-icon">✅</div>
                                <div className="stat-content">
                                    <span className="stat-label">SINAVA GİREN</span>
                                    <span className="stat-value">{stats.attendedCount} <small>/ {stats.totalRecords}</small></span>
                                </div>
                            </div>
                            <div className="optical-stat-card error">
                                <div className="stat-icon">❌</div>
                                <div className="stat-content">
                                    <span className="stat-label">GİRMEDİ</span>
                                    <span className="stat-value">{stats.notAttendedCount}</span>
                                </div>
                            </div>
                            <div className="optical-stat-card info">
                                <div className="stat-icon">🏫</div>
                                <div className="stat-content">
                                    <span className="stat-label">SALON SAYISI</span>
                                    <span className="stat-value">{stats.salonCount}</span>
                                </div>
                            </div>
                            <div className="optical-stat-card">
                                <div className="stat-icon">📖</div>
                                <div className="stat-content">
                                    <span className="stat-label">KİTAPÇIK</span>
                                    <span className="stat-value small">{stats.kitapcikTypes}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-between">
                        <h3>Okunan Veriler ({data.length} Satır)</h3>
                        {attendanceData && <span className="badge">Yoklama Listesi ile Eşleşiyor</span>}
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Sıra</th>
                                    <th>TC No</th>
                                    <th>Ad Soyad</th>
                                    <th>Salon</th>
                                    <th>Durum</th>
                                    <th>Kitapçık</th>
                                    <th>Cevaplar</th>
                                    <th>Liste Durumu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((row, i) => {
                                    const statusResult = getStudentStatus(row.tcNo);
                                    return (
                                        <tr key={i} className={statusResult.status === 'invalid' ? 'row-warning' : ''}>
                                            <td>{row.id}</td>
                                            <td className={statusResult.status === 'invalid' ? 'text-warning' : ''}>
                                                {row.tcNo}
                                                {statusResult.status === 'invalid' && <small className="tc-error"> ⚠️</small>}
                                            </td>
                                            <td>{row.adSoyad}</td>
                                            <td>{row.salonNo}</td>
                                            <td>{row.girmediDurumu || '-'}</td>
                                            <td>{row.kitapcikTuru}</td>
                                            <td className="font-mono">{row.ogrenciCevaplari}</td>
                                            <td>
                                                {statusResult.status === 'registered' && <span className="text-success">{statusResult.message}</span>}
                                                {statusResult.status === 'unregistered' && <span className="text-error">{statusResult.message}</span>}
                                                {statusResult.status === 'invalid' && <span className="text-warning">{statusResult.message}</span>}
                                                {statusResult.status === 'unknown' && <span className="text-secondary">{statusResult.message}</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
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
        .action-area { margin: 20px 0; display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
        .file-name { font-size: 0.9em; color: var(--accent); background: rgba(99, 102, 241, 0.1); padding: 5px 10px; border-radius: 4px; }
        
        /* Format Ayarları Butonu */
        .settings-toggle-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 18px;
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }
        .settings-toggle-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        
        .alert.error { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--error); color: var(--error); padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .preview-area { margin-top: 30px; animation: fadeIn 0.5s ease; }
        
        /* ===== OPTICAL STATS CARDS ===== */
        .optical-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .optical-stat-card {
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        
        .optical-stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }
        
        .optical-stat-card .stat-icon {
            font-size: 1.5rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(99, 102, 241, 0.15);
            border-radius: 10px;
        }
        
        .optical-stat-card.warning .stat-icon {
            background: rgba(245, 158, 11, 0.15);
        }
        
        .optical-stat-card.success .stat-icon {
            background: rgba(34, 197, 94, 0.15);
        }
        
        .optical-stat-card.error .stat-icon {
            background: rgba(239, 68, 68, 0.15);
        }
        
        .optical-stat-card.info .stat-icon {
            background: rgba(59, 130, 246, 0.15);
        }
        
        .optical-stat-card .stat-content {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .optical-stat-card .stat-label {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .optical-stat-card .stat-value {
            font-size: 1.4rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .optical-stat-card .stat-value.small {
            font-size: 1rem;
        }
        
        .optical-stat-card .stat-value small {
            font-size: 0.8rem;
            font-weight: 400;
            color: var(--text-secondary);
        }
        
        .optical-stat-card.warning .stat-value {
            color: #f59e0b;
        }
        
        .optical-stat-card.success .stat-value {
            color: #22c55e;
        }
        
        .optical-stat-card.error .stat-value {
            color: #ef4444;
        }
        
        .optical-stat-card.info .stat-value {
            color: #3b82f6;
        }
        
        /* Light Mode Stats Cards */
        .light-mode .optical-stat-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-color: rgba(0, 0, 0, 0.08);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .optical-stat-card:hover {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }
        
        .light-mode .optical-stat-card .stat-label {
            color: #64748b;
        }
        
        .light-mode .optical-stat-card .stat-value {
            color: #1e293b;
        }
        
        .light-mode .optical-stat-card .stat-value small {
            color: #94a3b8;
        }
        .table-wrapper { overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th, td { text-align: left; padding: 12px 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        th { background: rgba(255, 255, 255, 0.05); font-weight: 600; color: var(--text-primary); }
        td { color: var(--text-secondary); }
        tr:hover td { background: rgba(255, 255, 255, 0.02); color: var(--text-primary); }
        .text-small { font-size: 0.8rem; color: var(--text-secondary); }
        .font-mono { font-family: monospace; letter-spacing: 1px; }
        .text-success { color: var(--success); }
        .text-error { color: var(--error); }
        .text-warning { color: #f59e0b; font-weight: 600; }
        .row-warning { background: rgba(245, 158, 11, 0.1) !important; }
        .row-warning:hover td { background: rgba(245, 158, 11, 0.15) !important; }
        .tc-error { color: #f59e0b; font-size: 0.8rem; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .footer-actions { margin-top: 20px; display: flex; justify-content: flex-end; }
        
        /* ===== SETTINGS PANEL - COMPACT STYLES ===== */
        .settings-panel {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%);
            padding: 16px;
            border-radius: 12px;
            margin-bottom: 20px;
            border: 1px solid rgba(99, 102, 241, 0.2);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            max-width: 700px;
        }
        
        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .settings-title {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .settings-title h3 {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .settings-icon {
            font-size: 1.1rem;
        }
        
        .setting-actions {
            display: flex;
            gap: 6px;
        }
        
        .action-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 5px 10px;
            font-size: 0.75rem;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: var(--text-secondary);
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .action-btn:hover {
            background: rgba(255, 255, 255, 0.12);
            color: var(--text-primary);
        }
        
        .action-btn.import:hover {
            border-color: var(--warning);
            color: var(--warning);
        }
        
        .action-btn.export:hover {
            border-color: var(--accent);
            color: var(--accent);
        }
        
        /* Settings Table - Compact */
        .settings-table {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .settings-table-header {
            display: grid;
            grid-template-columns: 120px 1fr 1fr;
            gap: 8px;
            padding: 8px 12px;
            background: rgba(99, 102, 241, 0.15);
            font-weight: 600;
            font-size: 0.7rem;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .settings-table-row {
            display: grid;
            grid-template-columns: 120px 1fr 1fr;
            gap: 8px;
            padding: 6px 12px;
            align-items: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            transition: background 0.2s ease;
        }
        
        .settings-table-row:hover {
            background: rgba(255, 255, 255, 0.03);
        }
        
        .settings-table-row:last-child {
            border-bottom: none;
        }
        
        .col-field {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .field-icon {
            font-size: 0.85rem;
            width: 18px;
            text-align: center;
        }
        
        .field-label {
            font-size: 0.8rem;
            color: var(--text-primary);
        }
        
        .col-start, .col-length {
            position: relative;
        }
        
        .settings-table-row input {
            width: 100%;
            padding: 5px 8px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 5px;
            color: var(--text-primary);
            font-size: 0.8rem;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.2s ease;
            box-sizing: border-box;
        }
        
        .settings-table-row input:focus {
            outline: none;
            border-color: var(--accent);
            background: rgba(99, 102, 241, 0.1);
            box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
        }
        
        .settings-table-row input::placeholder {
            color: rgba(255, 255, 255, 0.3);
            font-style: italic;
            font-size: 0.75rem;
        }
        
        .input-hint {
            display: block;
            font-size: 0.65rem;
            color: var(--text-secondary);
            margin-top: 2px;
            font-style: italic;
        }
        
        /* Settings Footer */
        .settings-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 12px;
            padding-top: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .footer-hint {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.75rem;
            color: var(--text-secondary);
        }
        
        .hint-icon {
            font-size: 0.85rem;
        }
        
        .apply-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
            border: none;
            border-radius: 6px;
            color: white;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }
        
        .apply-btn:hover:not(:disabled) {
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }
        
        .apply-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            box-shadow: none;
        }
        
        .secondary-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .secondary-btn:hover { background: rgba(255,255,255,0.15); }
        
        /* Light mode - Settings Toggle Button */
        .light-mode .settings-toggle-btn {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
        }

        /* ===== LIGHT MODE STYLES ===== */
        .light-mode .settings-panel {
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, rgba(139, 92, 246, 0.03) 100%);
            border-color: rgba(99, 102, 241, 0.15);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        }
        
        .light-mode .settings-header {
            border-bottom-color: rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .settings-title h3 {
            color: #1e293b;
        }
        
        .light-mode .action-btn {
            background: rgba(0, 0, 0, 0.04);
            border-color: rgba(0, 0, 0, 0.12);
            color: #64748b;
        }
        
        .light-mode .action-btn:hover {
            background: rgba(0, 0, 0, 0.08);
            color: #1e293b;
        }
        
        .light-mode .settings-table {
            background: #ffffff;
            border-color: rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .settings-table-header {
            background: rgba(99, 102, 241, 0.08);
            color: var(--accent);
        }
        
        .light-mode .settings-table-row {
            border-bottom-color: rgba(0, 0, 0, 0.06);
        }
        
        .light-mode .settings-table-row:hover {
            background: rgba(99, 102, 241, 0.03);
        }
        
        .light-mode .field-label {
            color: #1e293b;
        }
        
        .light-mode .settings-table-row input {
            background: #f8fafc;
            border-color: rgba(0, 0, 0, 0.12);
            color: #1e293b;
        }
        
        .light-mode .settings-table-row input:focus {
            background: #ffffff;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .light-mode .settings-table-row input::placeholder {
            color: rgba(0, 0, 0, 0.3);
        }
        
        .light-mode .input-hint {
            color: #94a3b8;
        }
        
        .light-mode .settings-footer {
            border-top-color: rgba(0, 0, 0, 0.08);
        }
        
        .light-mode .footer-hint {
            color: #64748b;
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
        .light-mode tr:hover td {
            background: rgba(0,0,0,0.02);
            color: #0f172a;
        }
      `}</style>
        </div>
    );
}
