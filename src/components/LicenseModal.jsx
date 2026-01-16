import React, { useState } from 'react';

export default function LicenseModal({ onSuccess }) {
    const [key, setKey] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const result = await window.api.submitLicenseKey(key.trim());
            if (result.success) {
                onSuccess(result);
            } else {
                setError(result.message);
            }
        } catch (e) {
            setError('Bir hata olu\u015ftu: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="license-overlay">
            <div className="license-modal">
                <div className="modal-header">
                    <h2>{'\uD83D\uDD10'} {'Yaz\u0131l\u0131m Etkinle\u015ftirme'}</h2>
                </div>

                <div className="modal-body">
                    <p className="description">
                        {'L\u00fctfen \u00fcr\u00fcn lisans anahtar\u0131n\u0131z\u0131 giriniz.'} <br />
                        <span className="sub-text">{'Geli\u015ftirici: Sercan \u00d6ZDEM\u0130R (BeNKaYS)'}</span>
                    </p>

                    {error && <div className="error-alert">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <textarea
                            className="license-input"
                            placeholder={'Lisans anahtar\u0131n\u0131 buraya yap\u0131\u015ft\u0131r\u0131n...'}
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            rows={4}
                        />

                        <button
                            type="submit"
                            className="activate-btn"
                            disabled={loading || !key.trim()}
                        >
                            {loading ? 'Kontrol Ediliyor...' : 'Etkinle\u015ftir & Ba\u015flat \uD83D\uDE80'}
                        </button>
                    </form>
                </div>

                <div className="modal-footer">
                    <div className="support-links">
                        <small>{'Destek E-posta: '}<a href="mailto:sercanozdemir@yandex.com">sercanozdemir@yandex.com</a></small>
                        <a
                            href="https://wa.me/905068858585?text=Merhaba%20lisans%20ile%20ilgili%20destek%20almak%20istiyorum"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whatsapp-link"
                        >
                            {'\uD83D\uDCAC'} WhatsApp Destek
                        </a>
                    </div>
                </div>
            </div>

            <style>{`
                .license-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(15, 23, 42, 0.95);
                    backdrop-filter: blur(10px);
                    z-index: 9999;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.3s;
                }
                .license-modal {
                    width: 500px;
                    max-width: 90%;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    padding: 30px;
                    text-align: center;
                    border: 1px solid rgba(255,255,255,0.1);
                    box-sizing: border-box;
                }
                .modal-header h2 {
                    margin: 0 0 10px;
                    color: #1e293b;
                    font-size: 1.5rem;
                    font-weight: 700;
                }
                .description {
                    color: #64748b;
                    margin-bottom: 25px;
                    line-height: 1.6;
                }
                .sub-text {
                    font-size: 0.85rem;
                    color: #94a3b8;
                    display: block;
                    margin-top: 5px;
                }
                .license-input {
                    display: block;
                    width: 100%;
                    box-sizing: border-box;
                    padding: 15px;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.95rem;
                    color: #334155;
                    margin-bottom: 20px;
                    resize: none;
                    transition: all 0.2s;
                    background: #f8fafc;
                }
                .license-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    background: white;
                    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
                }
                .activate-btn {
                    width: 100%;
                    padding: 14px;
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    color: white;
                    border: none;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 1rem;
                    letter-spacing: 0.5px;
                }
                .activate-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);
                }
                .activate-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .error-alert {
                    background: #fef2f2;
                    color: #dc2626;
                    padding: 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                    border: 1px solid #fee2e2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-footer {
                    margin-top: 25px;
                    border-top: 1px solid #f1f5f9;
                    padding-top: 20px;
                }
                .support-links {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    align-items: center;
                }
                .support-links small {
                    color: #94a3b8;
                    font-size: 0.85rem;
                }
                .support-links a {
                    color: #3b82f6;
                    text-decoration: none;
                    font-weight: 500;
                }
                .whatsapp-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background-color: #25D366;
                    color: white !important;
                    padding: 10px 20px;
                    border-radius: 50px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    transition: all 0.2s;
                    text-decoration: none;
                    box-shadow: 0 4px 6px rgba(37, 211, 102, 0.2);
                }
                .whatsapp-link:hover {
                    transform: translateY(-2px);
                    background-color: #128C7E;
                    box-shadow: 0 6px 12px rgba(37, 211, 102, 0.3);
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
}
