// PulsePredict Alerts Center Page

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle,
  TrendingUp, ChevronDown, Bell, BellOff, User
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';

type FilterSeverity = 'all' | 'Critical' | 'High' | 'Moderate' | 'Low';
type FilterStatus = 'all' | 'active' | 'acknowledged' | 'resolved';

export default function AlertsPage() {
  const { alerts, acknowledgeAlert, resolveAlert } = useAppStore();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<FilterSeverity>('all');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [tab, setTab] = useState<'active' | 'history'>('active');

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Tab filter
    if (tab === 'active') {
      result = result.filter(a => a.status !== 'resolved');
    } else {
      result = result.filter(a => a.status === 'resolved');
    }

    // Search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a =>
        a.patientName.toLowerCase().includes(s) ||
        a.patientId.toLowerCase().includes(s) ||
        a.reason.toLowerCase().includes(s)
      );
    }

    // Severity filter
    if (severity !== 'all') {
      result = result.filter(a => a.severity === severity);
    }

    // Status filter
    if (status !== 'all') {
      result = result.filter(a => a.status === status);
    }

    return result;
  }, [alerts, search, severity, status, tab]);

  const activeCount = alerts.filter(a => a.status === 'active').length;
  const ackedCount = alerts.filter(a => a.status === 'acknowledged').length;
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;

  const severityDot = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'critical';
      case 'High': return 'high';
      case 'Moderate': return 'moderate';
      default: return 'low';
    }
  };

  return (
    <div className="page-container animate-in">
      {/* Summary Cards */}
      <div className="stat-cards-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card red">
          <div className="stat-card-value">{activeCount}</div>
          <div className="stat-card-label">Active Alerts</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-value">{ackedCount}</div>
          <div className="stat-card-label">Acknowledged</div>
        </div>
        <div className="stat-card green">
          <div className="stat-card-value">{resolvedCount}</div>
          <div className="stat-card-label">Resolved</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-card-value">{alerts.length}</div>
          <div className="stat-card-label">Total Alerts (24h)</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          <Bell size={14} style={{ marginRight: 6, display: 'inline' }} />
          Active & Acknowledged ({activeCount + ackedCount})
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          <BellOff size={14} style={{ marginRight: 6, display: 'inline' }} />
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <Search size={16} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search alerts by patient, ID, or reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select
            className="select"
            value={severity}
            onChange={e => setSeverity(e.target.value as FilterSeverity)}
          >
            <option value="all">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Moderate">Moderate</option>
            <option value="Low">Low</option>
          </select>
          {tab === 'active' && (
            <select
              className="select"
              value={status}
              onChange={e => setStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="acknowledged">Acknowledged</option>
            </select>
          )}
        </div>
      </div>

      {/* Alert List */}
      {filteredAlerts.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">
                {tab === 'active' ? <Bell size={28} /> : <BellOff size={28} />}
              </div>
              <h3>No {tab === 'active' ? 'active' : 'resolved'} alerts</h3>
              <p>
                {tab === 'active'
                  ? 'All alerts have been resolved. The system will generate new alerts when criteria are met.'
                  : 'No resolved alerts in the current filter. Try adjusting your search.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`alert-item ${severityDot(alert.severity)} ${alert.status}`}
            >
              <div className={`alert-severity-dot ${severityDot(alert.severity)}`} />
              <div className="alert-content">
                <div className="alert-title">
                  <span className={`risk-badge ${
                    alert.severity === 'Critical' ? 'risk-critical' :
                    alert.severity === 'High' ? 'risk-high' :
                    alert.severity === 'Moderate' ? 'risk-moderate' : 'risk-low'
                  }`} style={{ marginRight: 8 }}>
                    {alert.severity}
                  </span>
                  {alert.reason}
                </div>
                <div className="alert-desc">
                  {alert.details}
                </div>
                <div className="alert-meta">
                  <span>
                    <User size={12} />
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => navigate(`/patient/${alert.patientId}`)}
                    >
                      {alert.patientName} ({alert.patientId})
                    </span>
                  </span>
                  <span>
                    <Clock size={12} />
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                  <span>
                    <AlertTriangle size={12} />
                    Risk: {alert.riskScore}%
                  </span>
                  {alert.trends.length > 0 && (
                    <span>
                      <TrendingUp size={12} />
                      {alert.trends.join(', ')}
                    </span>
                  )}
                </div>
                {alert.status !== 'active' && (
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
                    {alert.status === 'acknowledged' && alert.acknowledgedAt &&
                      `Acknowledged at ${new Date(alert.acknowledgedAt).toLocaleString()}`}
                    {alert.status === 'resolved' && alert.resolvedAt &&
                      `Resolved at ${new Date(alert.resolvedAt).toLocaleString()}`}
                  </div>
                )}
              </div>
              <div className="alert-actions">
                {alert.status === 'active' && (
                  <>
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle size={14} /> Acknowledge
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      <XCircle size={14} /> Resolve
                    </button>
                  </>
                )}
                {alert.status === 'acknowledged' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    <XCircle size={14} /> Resolve
                  </button>
                )}
                {alert.status === 'resolved' && (
                  <span style={{ fontSize: 12, color: 'var(--success-600)', fontWeight: 600 }}>
                    ✓ Resolved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--gray-400)',
        padding: '12px', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)'
      }}>
        ⚠ PulsePredict does not simulate actual hospital notifications and does not contact medical personnel.
        All alerts are demonstration-only and based on synthetic data processing.
      </div>
    </div>
  );
}
