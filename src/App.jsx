
import { useState, useEffect } from 'react';
import AttendanceTab from './components/Tabs/AttendanceTab';
import OpticalTab from './components/Tabs/OpticalTab';
import AnswerKeyTab from './components/Tabs/AnswerKeyTab';
import EvaluationTab from './components/Tabs/EvaluationTab';
import ReportsTab from './components/Tabs/ReportsTab';
import ExamsTab from './components/Tabs/ExamsTab';
import StatsTab from './components/Tabs/StatsTab';
import HelpModal from './components/HelpModal';
import CheatingReport from './components/CheatingReport';
import AboutTab from './components/Tabs/AboutTab';
import './App.css';

// ANA UYGULAMA BİLEŞENİ
const MainApp = () => {
  const [activeTab, setActiveTab] = useState('exams');
  const [showHelp, setShowHelp] = useState(false);
  const [theme, setTheme] = useState('light');

  // Help Modal Logic (Startup & F1 Shortcut)
  useEffect(() => {
    const shouldHide = localStorage.getItem('hideHelpOnStartup') === 'true';
    if (!shouldHide) {
      setShowHelp(true);
    }
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowHelp(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme Logic
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  // Data States
  const [examInfo, setExamInfo] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [opticalData, setOpticalData] = useState(null);
  const [answerKeyData, setAnswerKeyData] = useState(null);
  const [results, setResults] = useState(null);

  const handleStartExam = (examOrName) => {
    if (typeof examOrName === 'object' && examOrName.id) {
      setExamInfo({
        id: examOrName.id,
        name: examOrName.name,
        timestamp: examOrName.timestamp
      });
    } else {
      setExamInfo({
        id: Date.now().toString(),
        name: examOrName,
        timestamp: Date.now()
      });
    }
    setAttendanceData(null);
    setOpticalData(null);
    setAnswerKeyData(null);
    setResults(null);
    setActiveTab('attendance');
  };

  const handleLoadExam = (exam) => {
    if (!exam || !exam.data) return;
    setExamInfo({
      id: exam.id,
      name: exam.name.split(' _')[0] || exam.name,
      timestamp: exam.timestamp
    });
    setAttendanceData(exam.data.attendanceData || null);
    setOpticalData(exam.data.opticalData || null);
    setAnswerKeyData(exam.data.answerKeyData || null);
    setResults(exam.data.results || null);
    setActiveTab('evaluation');
  };

  // Helper to ensure consistent saving with metadata
  const saveCurrentExam = async (overrideData = {}) => {
    if (!examInfo || !window.api?.saveExam) return;

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}_${String(today.getMonth() + 1).padStart(2, '0')}_${today.getFullYear()}`;
    let finalName = examInfo.name;
    if (!finalName.includes(dateStr)) {
      finalName = `${finalName} _${dateStr}`;
    }

    const currentData = {
      attendanceData,
      opticalData,
      answerKeyData,
      results,
      ...overrideData
    };

    const examObj = {
      id: examInfo.id,
      name: finalName,
      timestamp: Date.now(),
      hasAttendance: !!currentData.attendanceData,
      hasOptical: !!currentData.opticalData,
      hasAnswerKey: !!currentData.answerKeyData,
      hasResults: !!currentData.results,
      data: currentData
    };

    try {
      await window.api.saveExam(examObj);
      console.log("Sınav kaydedildi:", finalName);
    } catch (e) {
      console.error("Kayıt hatası:", e);
    }
  };

  const handleAutoSave = async (calculatedResults) => {
    await saveCurrentExam({ results: calculatedResults || results });
  };

  const handleOpenCheating = (exam) => {
    if (exam) {
      handleLoadExam(exam);
    }
    setActiveTab('cheating');
  };

  return (
    <div className="app-container">
      <header className="app-header glass-panel">
        <div className="header-top">
          <h1>Sınav Değerlendirme</h1>
          <span className="badge">v1.4.0</span>
        </div>
        <nav className="tabs">
          <button className={activeTab === 'exams' ? 'active' : ''} onClick={() => setActiveTab('exams')}>1. Sınavlar</button>
          <button className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>
            2. Yoklama Listesi {attendanceData && <span className="status-dot success"></span>}
          </button>
          <button className={activeTab === 'optical' ? 'active' : ''} onClick={() => setActiveTab('optical')}>
            3. Optik Veriler {opticalData && <span className="status-dot success"></span>}
          </button>
          <button className={activeTab === 'answerKey' ? 'active' : ''} onClick={() => setActiveTab('answerKey')}>
            4. Cevap Anahtarı {answerKeyData && <span className="status-dot success"></span>}
          </button>
          <button className={activeTab === 'evaluation' ? 'active' : ''} onClick={() => setActiveTab('evaluation')}>
            5. Değerlendirme {results && <span className="status-dot success"></span>}
          </button>
          <button className={activeTab === 'reports' ? 'active' : ''} onClick={() => setActiveTab('reports')}>
            6. Raporlar {results && <span className="status-dot success"></span>}
          </button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
            7. İstatistikler
          </button>
          <button
            className={`about-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
            style={{ marginLeft: 'auto', border: '1px solid var(--accent)' }}
          >
            ℹ️ Hakkında
          </button>
        </nav>
      </header>
      <main className="app-content">
        {activeTab === 'attendance' && <AttendanceTab data={attendanceData} setData={setAttendanceData} onNext={() => setActiveTab('optical')} />}
        {activeTab === 'optical' && <OpticalTab data={opticalData} setData={setOpticalData} attendanceData={attendanceData} onNext={() => setActiveTab('answerKey')} />}
        {activeTab === 'answerKey' && <AnswerKeyTab data={answerKeyData} setData={setAnswerKeyData} attendanceData={attendanceData} onNext={() => setActiveTab('evaluation')} onSave={(newData) => {
          setAnswerKeyData(newData);
          saveCurrentExam({ answerKeyData: newData });
        }} />}
        {activeTab === 'evaluation' && <EvaluationTab attendanceData={attendanceData} opticalData={opticalData} answerKeyData={answerKeyData} results={results} setResults={setResults} onSave={handleAutoSave} />}
        {activeTab === 'reports' && <ReportsTab results={results} examName={examInfo?.name} answerKey={answerKeyData} />}
        {activeTab === 'exams' && <ExamsTab currentData={{ attendanceData, opticalData, answerKeyData, results }} onLoadExam={handleLoadExam} onStartExam={handleStartExam} />}
        {activeTab === 'stats' && <StatsTab onOpenCheating={handleOpenCheating} />}
        {activeTab === 'cheating' && <CheatingReport results={results} examName={examInfo?.name} answerKey={answerKeyData} />}
        {activeTab === 'about' && <AboutTab theme={theme} setTheme={setTheme} />}
      </main>
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};

// ROOT COMPONENT
export default function App() {
  return <MainApp />;
}
