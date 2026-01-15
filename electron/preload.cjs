/**
 * @file preload.cjs
 * @description Electron Preload Script.
 * Ana süreç (Main Process) ile Arayüz (Renderer Process) arasındaki güvenli köprüyü kurar.
 * @author Sercan ÖZDEMİR
 * @date 2024
 */

const { contextBridge, ipcRenderer } = require('electron');

// 'window.api' nesnesini tarayıcı tarafına (React) expose et
contextBridge.exposeInMainWorld('api', {
    // Dosya İşlemleri
    selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
    readFileBuffer: (path) => ipcRenderer.invoke('read-file-buffer', path),
    readFileText: (path) => ipcRenderer.invoke('read-file-text', path),
    saveFile: (buffer, name) => ipcRenderer.invoke('save-file', buffer, name),
    printToPDF: (html, filename) => ipcRenderer.invoke('print-to-pdf', html, filename),

    // Pencere Yönetimi
    minimize: () => ipcRenderer.send('minimize-window'),
    maximize: () => ipcRenderer.send('maximize-window'),
    close: () => ipcRenderer.send('close-window'),

    // Kopya Analizi (Yeni Pencere)
    openCheatingWindow: (data) => ipcRenderer.send('open-cheating-window', data),
    getCheatingData: () => ipcRenderer.invoke('get-cheating-data'),

    // Veritabanı (Sınav Yönetimi) İşlemleri
    getExams: () => ipcRenderer.invoke('get-exams'),
    getExamById: (id) => ipcRenderer.invoke('get-exam-by-id', id),
    saveExam: (exam) => ipcRenderer.invoke('save-exam', exam),
    deleteExam: (id) => ipcRenderer.invoke('delete-exam', id)
});
