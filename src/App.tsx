import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider } from './store/AppStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import OverviewPage from './pages/OverviewPage';
import MonitoringPage from './pages/MonitoringPage';
import PatientDetailPage from './pages/PatientDetailPage';
import AlertsPage from './pages/AlertsPage';
import UploadPage from './pages/UploadPage';
import PerformancePage from './pages/PerformancePage';
import SettingsPage from './pages/SettingsPage';

const pageCopy: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Overview', subtitle: 'ICU command center · Anticipate deterioration earlier' },
  '/monitoring': { title: 'Live Patient Monitoring', subtitle: 'Prioritized view of current patient status' },
  '/patient': { title: 'Patient Details', subtitle: 'Longitudinal observations and risk context' },
  '/alerts': { title: 'Early Warning Alerts', subtitle: 'Review, acknowledge, and resolve demonstration alerts' },
  '/upload': { title: 'Data Upload & Quality', subtitle: 'Inspect clinical observation data before analysis' },
  '/performance': { title: 'Model Performance', subtitle: 'Illustrative evaluation metrics · Not validated' },
  '/settings': { title: 'Settings', subtitle: 'Configure demonstration thresholds and data handling' },
};

function Workspace() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const key = location.pathname.startsWith('/patient') ? '/patient' : location.pathname;
  const copy = pageCopy[key] ?? pageCopy['/'];

  return (
    <div className="app-layout">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="main-content content-with-sidebar">
        <Header title={copy.title} subtitle={copy.subtitle} onMenuClick={() => setMenuOpen(true)} />
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/patient" element={<PatientDetailPage />} />
          <Route path="/patient/:patientId" element={<PatientDetailPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <footer className="app-footer">PulsePredict · See the Risk Before It Rises. <span>Clinical decision-support prototype — not for real patient-care decisions.</span></footer>
      </div>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppProvider><Workspace /></AppProvider></BrowserRouter>;
}