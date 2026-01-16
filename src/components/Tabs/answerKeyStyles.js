/**
 * @file AnswerKey Styles
 * @description Modern CSS styles for Answer Key Tab
 */

export const answerKeyStyles = `
/* ===== MODERN ANSWER KEY TAB STYLES ===== */

/* Header Section */
.answer-key-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 24px;
    border-radius: 16px;
    margin-bottom: 24px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
}

.header-title-section {
    display: flex;
    align-items: center;
    gap: 16px;
}

.header-icon {
    font-size: 2.5rem;
    background: rgba(255, 255, 255, 0.2);
    padding: 12px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
}

.header-title {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-subtitle {
    margin: 4px 0 0 0;
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.9);
}

.doc-type-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(10px);
    padding: 10px 18px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.badge-icon {
    font-size: 1.2rem;
}

.badge-text {
    color: white;
    font-weight: 600;
    font-size: 0.85rem;
}

/* Upload Section */
.upload-section {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.upload-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    color: #667eea;
    padding: 14px 28px;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.upload-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.upload-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-icon {
    font-size: 1.2rem;
}

.btn-text {
    font-weight: 600;
}

.file-selected {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.2);
    padding: 10px 16px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
}

.file-icon {
    color: #10b981;
    font-weight: bold;
    font-size: 1.1rem;
}

.file-name {
    color: white;
    font-weight: 500;
    font-size: 0.9rem;
}

/* Alert Messages */
.alert {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-radius: 10px;
    margin-top: 16px;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alert-error {
    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    border: 1px solid #f87171;
    color: #b91c1c;
}

.alert-success {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    border: 1px solid #6ee7b7;
    color: #047857;
}

.alert-icon {
    font-size: 1.3rem;
}

.alert-text {
    font-weight: 500;
    font-size: 0.9rem;
}

/* Preview & Mapping Cards */
.preview-card,
.mapping-card {
    background: white;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    flex: 1;
    min-width: 350px;
}

.card-header-modern {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 2px solid #f1f5f9;
}

.card-icon {
    font-size: 1.5rem;
   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.card-title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
}

.card-badge {
    margin-left: auto;
    background: #f1f5f9;
    color: #64748b;
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
}

/* Modern Table */
.modern-table-wrapper {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    margin-bottom: 16px;
}

.preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
}

.th-row-num {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px;
    text-align: center;
    font-weight: 600;
    min-width: 50px;
}

.th-column {
    background: #f8fafc;
    color: #475569;
    padding: 12px;
    text-align: center;
    font-weight: 600;
    border-bottom: 2px solid #e2e8f0;
}

.td-row-num {
    background: #f8fafc;
    color: #64748b;
    padding: 10px;
    text-align: center;
    font-weight: 600;
    border-right: 1px solid #e2e8f0;
}

.td-cell {
    padding: 10px;
    text-align: center;
    color: #1e293b;
    border: 1px solid #f1f5f9;
}

.table-row:hover .td-cell {
    background: #f8fafc;
}

.table-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: #fef3c7;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    color: #92400e;
    border-left: 3px solid #f59e0b;
}

.note-icon {
    font-size: 1rem;
}

/* Mapping Section */
.start-row-input {
    background: #f8fafc;
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    border-left: 3px solid #667eea;
}

.input-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #475569;
    margin-bottom: 10px;
    font-size: 0.9rem;
}

.label-icon {
    font-size: 1.1rem;
}

.number-input {
    width: 80px;
    padding: 10px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    text-align: center;
    font-weight: 600;
    color: #1e293b;
    transition: all 0.2s ease;
}

.number-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Mapping Container */
.mapping-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 450px;
    overflow-y: auto;
    padding-right: 8px;
    margin-bottom: 20px;
}

.mapping-container::-webkit-scrollbar {
    width: 6px;
}

.mapping-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 10px;
}

.mapping-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 10px;
}

.mapping-item {
    background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    padding: 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
}

.mapping-item:hover {
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.mapping-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid #e2e8f0;
}

.mapping-icon {
    font-size: 1.2rem;
}

.mapping-title {
    font-weight: 700;
    color: #667eea;
    font-size: 0.95rem;
}

.mapping-selects {
    display: flex;
    gap: 12px;
}

.select-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.select-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #64748b;
}

.modern-select {
    padding: 10px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #1e293b;
    font-weight: 500;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
}

.modern-select:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modern-select:hover {
    border-color: #cbd5e1;
}

/* Generate Button */
.generate-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.generate-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
}
`;
