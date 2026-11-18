// PulsePredict Header Component

import { Menu, Bell, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/AppStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { isDemo, alerts, refreshPredictions } = useAppStore();
  const activeAlertCount = alerts.filter(a => a.status === 'active').length;

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <div className="header-title">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="header-right">
        <span className={`header-badge ${isDemo ? 'badge-demo' : 'badge-live'}`}>
          <span className="badge-dot" />
          {isDemo ? 'DEMO DATA' : 'UPLOADED · DEMO MODEL'}
        </span>
        <button
          className="header-icon-btn"
          onClick={refreshPredictions}
          title="Refresh predictions"
        >
          <RefreshCw size={18} />
        </button>
        <button className="header-icon-btn" title="Alert notifications">
          <Bell size={18} />
          {activeAlertCount > 0 && (
            <span className="notification-count">
              {activeAlertCount > 9 ? '9+' : activeAlertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
