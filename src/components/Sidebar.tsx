// PulsePredict Sidebar Component

import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, UserRound, Bell, Upload, BarChart3,
  Settings, Activity, X
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Overview', section: 'Dashboard' },
  { path: '/monitoring', icon: Monitor, label: 'Live Patient Monitoring', section: 'Dashboard' },
  { path: '/patient', icon: UserRound, label: 'Patient Details', section: 'Clinical' },
  { path: '/alerts', icon: Bell, label: 'Early Warning Alerts', section: 'Clinical', hasBadge: true },
  { path: '/upload', icon: Upload, label: 'Data Upload & Quality', section: 'Data' },
  { path: '/performance', icon: BarChart3, label: 'Model Performance', section: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings', section: 'System' },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { alerts } = useAppStore();
  const activeAlertCount = alerts.filter(a => a.status === 'active').length;

  let lastSection = '';

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <NavLink to="/" className="sidebar-brand-logo" onClick={onClose}>
            <div className="sidebar-brand-icon">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div className="sidebar-brand-text">
              <h1>PulsePredict</h1>
              <p>See the Risk Before It Rises</p>
            </div>
          </NavLink>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            style={{
              display: 'none',
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'none',
              border: 'none',
              color: 'var(--gray-400)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const showSection = item.section !== lastSection;
            lastSection = item.section;
            const isActive = location.pathname === item.path ||
              (item.path === '/patient' && location.pathname.startsWith('/patient'));

            return (
              <div key={item.path}>
                {showSection && (
                  <div className="sidebar-section-label">{item.section}</div>
                )}
                <NavLink
                  to={item.path}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon className="icon" size={20} />
                  <span>{item.label}</span>
                  {item.hasBadge && activeAlertCount > 0 && (
                    <span className="badge">{activeAlertCount}</span>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-footer-text">
            <span>⚠ Clinical Prototype</span><br />
            Not for real patient care decisions.
            Requires clinical validation before deployment.
          </p>
        </div>
      </aside>
    </>
  );
}
