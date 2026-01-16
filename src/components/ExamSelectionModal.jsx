import React, { useState } from 'react';

const ExamSelectionModal = ({ isOpen, onClose, exams, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');

    if (!isOpen) return null;

    const filteredExams = exams
        .filter(exam => exam.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => b.timestamp - a.timestamp); // Sort by date descending

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content exam-select-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>📂 Geçmiş Sınavlar</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <input
                        type="text"
                        placeholder="Sınav adı ara..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />

                    <div className="exam-list-container">
                        {filteredExams.length === 0 ? (
                            <div className="no-data">Kayıtlı sınav bulunamadı.</div>
                        ) : (
                            <ul className="exam-list">
                                {filteredExams.map(exam => (
                                    <li
                                        key={exam.id}
                                        onClick={() => { onSelect(exam.id); onClose(); }}
                                        className="exam-item"
                                    >
                                        <span className="exam-name">{exam.name}</span>
                                        <span className="exam-date">
                                            {new Date(exam.timestamp).toLocaleDateString('tr-TR', {
                                                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease;
                }
                .exam-select-modal { width: 500px; max-height: 80vh; display: flex; flex-direction: column; background: #1e293b; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
                .modal-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
                .modal-header h2 { margin: 0; font-size: 1.25rem; color: white; }
                .close-btn { background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; transition: color 0.2s; }
                .close-btn:hover { color: white; }
                
                .search-input { width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: white; margin-bottom: 15px; font-size: 1rem; box-sizing: border-box; }
                .modal-body { padding: 20px; overflow: hidden; display: flex; flex-direction: column; height: 100%; }
                .exam-list-container { flex-grow: 1; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
                .exam-list { list-style: none; padding: 0; margin: 0; }
                .exam-item { padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.2s; }
                .exam-item:hover { background: rgba(255,255,255,0.05); }
                .exam-name { font-weight: 500; font-size: 1rem; color: #fff; }
                .exam-date { font-size: 0.8rem; color: #94a3b8; }
                /* ===== LIGHT MODE STYLES ===== */
                .light-mode .exam-select-modal {
                    background: #ffffff;
                    border-color: rgba(0,0,0,0.15);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                }
                .light-mode .modal-header {
                    border-bottom-color: rgba(0,0,0,0.1);
                }
                .light-mode .modal-header h2 {
                    color: #0f172a;
                }
                .light-mode .close-btn {
                    color: #64748b;
                }
                .light-mode .close-btn:hover {
                    color: #0f172a;
                }
                .light-mode .search-input {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                    color: #0f172a;
                }
                .light-mode .search-input::placeholder {
                    color: #94a3b8;
                }
                .light-mode .exam-list-container {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                }
                .light-mode .exam-item {
                    border-bottom-color: #e2e8f0;
                }
                .light-mode .exam-item:hover {
                    background: white;
                }
                .light-mode .exam-name {
                    color: #0f172a;
                }
                .light-mode .exam-date {
                    color: #64748b;
                }
                .light-mode .no-data {
                    color: #64748b;
                    text-align: center;
                    padding: 20px;
                    font-style: italic;
                }

                /* Common Styles Fixes */
                .no-data {
                    color: rgba(255,255,255,0.5);
                    text-align: center;
                    padding: 20px;
                }
            `}</style>
        </div>
    );
};

export default ExamSelectionModal;
