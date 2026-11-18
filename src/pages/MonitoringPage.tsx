// PulsePredict Live Patient Monitoring Page

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Heart, Wind, Thermometer, Droplets, ArrowUpDown,
  TrendingUp, TrendingDown, Minus, AlertCircle, ChevronDown
} from 'lucide-react';
import { useAppStore } from '../store/AppStore';
import type { PatientMonitorRow } from '../types';

type SortField = 'name' | 'riskScore' | 'heartRate' | 'spO2' | 'category';
type FilterCategory = 'all' | 'Critical' | 'High' | 'Moderate' | 'Low';

export default function MonitoringPage() {
  const { monitorRows, isLoading } = useAppStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    let rows = [...monitorRows];

    // Search
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.patient.name.toLowerCase().includes(s) ||
        r.patient.id.toLowerCase().includes(s) ||
        r.patient.bed.toLowerCase().includes(s) ||
        r.patient.diagnosis.toLowerCase().includes(s)
      );
    }

    // Filter by risk
    if (filter !== 'all') {
      rows = rows.filter(r => r.riskAssessment.riskCategory === filter);
    }

    // Sort
    rows.sort((a, b) => {
      let compare = 0;
      switch (sortField) {
        case 'name':
          compare = a.patient.name.localeCompare(b.patient.name);
          break;
        case 'riskScore':
          compare = a.riskAssessment.riskScore - b.riskAssessment.riskScore;
          break;
        case 'heartRate':
          compare = (a.latestVitals.heartRate ?? 0) - (b.latestVitals.heartRate ?? 0);
          break;
        case 'spO2':
          compare = (a.latestVitals.spO2 ?? 100) - (b.latestVitals.spO2 ?? 100);
          break;
        case 'category': {
          const order = { Critical: 4, High: 3, Moderate: 2, Low: 1 };
          compare = (order[a.riskAssessment.riskCategory] || 0) - (order[b.riskAssessment.riskCategory] || 0);
          break;
        }
      }
      return sortAsc ? compare : -compare;
    });

    return rows;
  }, [monitorRows, search, filter, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  };

  if (isLoading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Loading patients...</span></div>;
  }

  const riskColor = (cat: string) => {
    switch (cat) {
      case 'Critical': return 'risk-critical';
      case 'High': return 'risk-high';
      case 'Moderate': return 'risk-moderate';
      default: return 'risk-low';
    }
  };

  const trendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp size={13} style={{ color: 'var(--critical-500)' }} />;
    if (trend === 'falling') return <TrendingDown size={13} style={{ color: 'var(--success-500)' }} />;
    return <Minus size={13} style={{ color: 'var(--gray-400)' }} />;
  };

  const vitalDisplay = (value: number | null, unit?: string) => {
    if (value === null) return <span className="missing-indicator">— missing</span>;
    return <span>{value}{unit}</span>;
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th onClick={() => handleSort(field)} style={{ cursor: 'pointer' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        <ArrowUpDown size={12} style={{ opacity: sortField === field ? 1 : 0.3 }} />
      </span>
    </th>
  );

  const filterCounts = {
    all: monitorRows.length,
    Critical: monitorRows.filter(r => r.riskAssessment.riskCategory === 'Critical').length,
    High: monitorRows.filter(r => r.riskAssessment.riskCategory === 'High').length,
    Moderate: monitorRows.filter(r => r.riskAssessment.riskCategory === 'Moderate').length,
    Low: monitorRows.filter(r => r.riskAssessment.riskCategory === 'Low').length,
  };

  return (
    <div className="page-container animate-in">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-bar">
          <Search size={16} style={{ color: 'var(--gray-400)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search patients by name, ID, bed, or diagnosis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          {(['all', 'Critical', 'High', 'Moderate', 'Low'] as FilterCategory[]).map(cat => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? 'All' : cat} ({filterCounts[cat]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Search size={28} /></div>
                <h3>No patients found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <SortHeader field="name">Patient</SortHeader>
                    <th>Bed</th>
                    <SortHeader field="riskScore">Risk Score</SortHeader>
                    <SortHeader field="category">Category</SortHeader>
                    <th>Trend</th>
                    <SortHeader field="heartRate"><Heart size={13} /> HR</SortHeader>
                    <th><Wind size={13} /> RR</th>
                    <th>BP</th>
                    <SortHeader field="spO2"><Droplets size={13} /> SpO₂</SortHeader>
                    <th><Thermometer size={13} /> Temp</th>
                    <th>Last Obs</th>
                    <th>Alert</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(row => (
                    <PatientRow
                      key={row.patient.id}
                      row={row}
                      onClick={() => navigate(`/patient/${row.patient.id}`)}
                      riskColor={riskColor}
                      trendIcon={trendIcon}
                      vitalDisplay={vitalDisplay}
                      formatTimestamp={formatTimestamp}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--gray-400)' }}>
        Showing {filtered.length} of {monitorRows.length} patients • Click a row to view patient details
      </div>
    </div>
  );
}

function PatientRow({
  row,
  onClick,
  riskColor,
  trendIcon,
  vitalDisplay,
  formatTimestamp,
}: {
  row: PatientMonitorRow;
  onClick: () => void;
  riskColor: (cat: string) => string;
  trendIcon: (trend: string) => React.ReactNode;
  vitalDisplay: (value: number | null, unit?: string) => React.ReactNode;
  formatTimestamp: (ts: string) => string;
}) {
  const bp = row.latestVitals.systolicBP != null && row.latestVitals.diastolicBP != null
    ? `${row.latestVitals.systolicBP}/${row.latestVitals.diastolicBP}`
    : null;

  return (
    <tr
      onClick={onClick}
      className={row.riskAssessment.riskCategory === 'Critical' ? 'pulse-critical' : ''}
    >
      <td>
        <div style={{ fontWeight: 600 }}>{row.patient.name}</div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          {row.patient.id} • {row.patient.diagnosis}
        </div>
      </td>
      <td>{row.patient.bed}</td>
      <td>
        <strong style={{
          fontSize: 17,
          color: row.riskAssessment.riskScore >= 80 ? 'var(--critical-600)' :
            row.riskAssessment.riskScore >= 60 ? '#be123c' :
            row.riskAssessment.riskScore >= 35 ? 'var(--warning-600)' : 'var(--success-600)'
        }}>
          {row.riskAssessment.riskScore}%
        </strong>
      </td>
      <td>
        <span className={`risk-badge ${riskColor(row.riskAssessment.riskCategory)}`}>
          {row.riskAssessment.riskCategory}
        </span>
      </td>
      <td>{trendIcon(row.riskAssessment.trend)}</td>
      <td>{vitalDisplay(row.latestVitals.heartRate)}</td>
      <td>{vitalDisplay(row.latestVitals.respiratoryRate)}</td>
      <td>{bp ? <span>{bp}</span> : <span className="missing-indicator">—</span>}</td>
      <td>
        <span style={{
          color: row.latestVitals.spO2 != null && row.latestVitals.spO2 < 92
            ? 'var(--critical-600)' : undefined,
          fontWeight: row.latestVitals.spO2 != null && row.latestVitals.spO2 < 92 ? 700 : undefined,
        }}>
          {vitalDisplay(row.latestVitals.spO2, '%')}
        </span>
      </td>
      <td>{vitalDisplay(row.latestVitals.temperature, '°C')}</td>
      <td style={{ fontSize: 12, color: 'var(--gray-500)' }}>
        {formatTimestamp(row.latestVitals.timestamp)}
      </td>
      <td>
        {row.alertStatus === 'active' ? (
          <span className="risk-badge risk-critical">
            <AlertCircle size={12} /> {row.activeAlertCount}
          </span>
        ) : row.alertStatus === 'acknowledged' ? (
          <span className="risk-badge risk-moderate">Ack'd</span>
        ) : (
          <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
}
