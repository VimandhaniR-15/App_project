// PulsePredict Patient Details Page

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Wind, Thermometer, Droplets, Gauge, Activity,
  TrendingUp, TrendingDown, Minus, AlertCircle, Clock, ChevronRight,
  Info, FileWarning
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, AreaChart, Area
} from 'recharts';
import { useAppStore } from '../store/AppStore';
import { computeTimeSeriesRisk } from '../services/predictionService';

type TimeRange = 1 | 6 | 12 | 24 | 48;

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { vitals, assessments, alerts, monitorRows } = useAppStore();
  const [timeRange, setTimeRange] = useState<TimeRange>(24);

  const patient = monitorRows.find(r => r.patient.id === patientId)?.patient;
  const monitorRow = monitorRows.find(r => r.patient.id === patientId);
  const riskAssessment = assessments.find(a => a.patientId === patientId);

  // Filter vitals by time range
  const patientVitals = useMemo(() => {
    const pv = vitals
      .filter(v => v.patientId === patientId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (pv.length === 0) return [];

    const latest = new Date(pv[pv.length - 1].timestamp);
    const cutoff = new Date(latest.getTime() - timeRange * 3600 * 1000);
    return pv.filter(v => new Date(v.timestamp) >= cutoff);
  }, [vitals, patientId, timeRange]);

  // Risk time series
  const riskTimeSeries = useMemo(() =>
    computeTimeSeriesRisk(patientId ?? '', vitals, timeRange),
    [patientId, vitals, timeRange]
  );

  // Patient alerts
  const patientAlerts = alerts
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  // Format chart data
  const chartData = patientVitals.map((v, i) => ({
    time: new Date(v.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    fullTime: new Date(v.timestamp).toLocaleString(),
    hr: v.heartRate,
    rr: v.respiratoryRate,
    sbp: v.systolicBP,
    dbp: v.diastolicBP,
    spo2: v.spO2,
    temp: v.temperature,
    risk: riskTimeSeries[i]?.riskScore ?? null,
  }));

  // Missing data summary
  const missingCounts = {
    'Heart Rate': patientVitals.filter(v => v.heartRate === null).length,
    'Respiratory Rate': patientVitals.filter(v => v.respiratoryRate === null).length,
    'Blood Pressure': patientVitals.filter(v => v.systolicBP === null).length,
    'SpO₂': patientVitals.filter(v => v.spO2 === null).length,
    'Temperature': patientVitals.filter(v => v.temperature === null).length,
  };
  const totalMissing = Object.values(missingCounts).reduce((s, v) => s + v, 0);

  const riskColor = riskAssessment
    ? riskAssessment.riskCategory === 'Critical' ? '#ef4444'
      : riskAssessment.riskCategory === 'High' ? '#e11d48'
      : riskAssessment.riskCategory === 'Moderate' ? '#f59e0b'
      : '#22c55e'
    : '#22c55e';

  const riskScore = riskAssessment?.riskScore ?? 0;
  const circumference = 2 * Math.PI * 44;
  const dashOffset = circumference - (riskScore / 100) * circumference;

  // Keep hooks unconditional while routing between patient selection and detail views.
  if (!patientId || !patient) {
    return (
      <div className="page-container animate-in"><div className="card"><div className="card-body"><div className="empty-state">
        <div className="empty-state-icon"><Activity size={28} /></div><h3>Select a Patient</h3>
        <p>Choose a patient from monitoring to inspect observations and trends. Uploaded datasets become available here after column mapping.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/monitoring')}>Go to Patient Monitoring</button>
      </div></div></div></div>
    );
  }

  return (
    <div className="page-container animate-in">
      {/* Back button */}
      <button
        className="btn btn-outline"
        style={{ marginBottom: 16 }}
        onClick={() => navigate('/monitoring')}
      >
        <ArrowLeft size={16} /> Back to Monitoring
      </button>

      {/* Patient Header */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Risk Gauge */}
            <div className="risk-gauge">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="44" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="44" fill="none"
                  stroke={riskColor}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="risk-gauge-label">
                <span className="risk-gauge-value" style={{ color: riskColor }}>
                  {riskScore}%
                </span>
                <span className="risk-gauge-text">Risk</span>
              </div>
            </div>

            {/* Patient Info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{patient.name}</h2>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
                <span>{patient.id}</span>
                <span>•</span>
                <span>{patient.age}y {patient.gender}</span>
                <span>•</span>
                <span>{patient.bed}</span>
                <span>•</span>
                <span>{patient.diagnosis}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`risk-badge ${
                  riskAssessment?.riskCategory === 'Critical' ? 'risk-critical' :
                  riskAssessment?.riskCategory === 'High' ? 'risk-high' :
                  riskAssessment?.riskCategory === 'Moderate' ? 'risk-moderate' : 'risk-low'
                }`}>
                  {riskAssessment?.riskCategory ?? 'Unknown'}
                </span>
                <span className={`stat-card-trend ${
                  riskAssessment?.trend === 'rising' ? 'trend-up' :
                  riskAssessment?.trend === 'falling' ? 'trend-down' : 'trend-stable'
                }`}>
                  {riskAssessment?.trend === 'rising' ? <TrendingUp size={12} /> :
                   riskAssessment?.trend === 'falling' ? <TrendingDown size={12} /> :
                   <Minus size={12} />}
                  {riskAssessment?.trend ?? 'stable'}
                </span>
                {riskAssessment?.isDemoScore && (
                  <span className="header-badge badge-demo" style={{ fontSize: 11 }}>
                    <span className="badge-dot" />
                    Demo Score
                  </span>
                )}
              </div>
            </div>

            {/* Current Vitals */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px' }}>
              {[
                { icon: Heart, label: 'HR', value: monitorRow?.latestVitals.heartRate, unit: 'bpm', color: '#ef4444' },
                { icon: Wind, label: 'RR', value: monitorRow?.latestVitals.respiratoryRate, unit: '/min', color: '#3b82f6' },
                { icon: Droplets, label: 'SpO₂', value: monitorRow?.latestVitals.spO2, unit: '%', color: '#1ab1b7' },
                { icon: Gauge, label: 'SBP', value: monitorRow?.latestVitals.systolicBP, unit: 'mmHg', color: '#8b5cf6' },
                { icon: Gauge, label: 'DBP', value: monitorRow?.latestVitals.diastolicBP, unit: 'mmHg', color: '#6366f1' },
                { icon: Thermometer, label: 'Temp', value: monitorRow?.latestVitals.temperature, unit: '°C', color: '#f59e0b' },
              ].map(v => (
                <div key={v.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 2 }}>
                    <v.icon size={12} style={{ display: 'inline', marginRight: 3 }} />
                    {v.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.value != null ? 'var(--gray-800)' : 'var(--gray-300)' }}>
                    {v.value != null ? `${v.value}` : '—'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{v.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div className="time-range-btns">
          {([1, 6, 12, 24, 48] as TimeRange[]).map(h => (
            <button
              key={h}
              className={`time-range-btn ${timeRange === h ? 'active' : ''}`}
              onClick={() => setTimeRange(h)}
            >
              {h}h
            </button>
          ))}
        </div>
      </div>

      {/* Vital Sign Charts */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Heart Rate */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Heart size={16} style={{ color: '#ef4444' }} /> Heart Rate
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[40, 160]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={100} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'High', fontSize: 10, fill: '#f59e0b' }} />
                  <ReferenceLine y={60} stroke="#fbbf24" strokeDasharray="5 5" label={{ value: 'Low', fontSize: 10, fill: '#f59e0b' }} />
                  <Line type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={false} connectNulls={false}
                    name="Heart Rate (bpm)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Respiratory Rate */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wind size={16} style={{ color: '#3b82f6' }} /> Respiratory Rate
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[5, 40]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={20} stroke="#fbbf24" strokeDasharray="5 5" />
                  <ReferenceLine y={12} stroke="#fbbf24" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="rr" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false}
                    name="Resp Rate (/min)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Blood Pressure */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gauge size={16} style={{ color: '#8b5cf6' }} /> Blood Pressure
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[40, 200]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={140} stroke="#fbbf24" strokeDasharray="5 5" />
                  <ReferenceLine y={90} stroke="#fbbf24" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="sbp" stroke="#8b5cf6" strokeWidth={2} dot={false} connectNulls={false}
                    name="Systolic (mmHg)" />
                  <Line type="monotone" dataKey="dbp" stroke="#6366f1" strokeWidth={1.5} dot={false} connectNulls={false}
                    name="Diastolic (mmHg)" strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* SpO2 */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Droplets size={16} style={{ color: '#1ab1b7' }} /> Oxygen Saturation (SpO₂)
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1ab1b7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1ab1b7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[80, 100]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={94} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 10, fill: '#ef4444' }} />
                  <Area type="monotone" dataKey="spo2" stroke="#1ab1b7" strokeWidth={2} fill="url(#spo2Grad)"
                    connectNulls={false} name="SpO₂ (%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Temperature */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Thermometer size={16} style={{ color: '#f59e0b' }} /> Temperature
            </h3>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[35, 41]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={37.5} stroke="#fbbf24" strokeDasharray="5 5" />
                  <ReferenceLine y={38.5} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Fever', fontSize: 10, fill: '#ef4444' }} />
                  <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls={false}
                    name="Temperature (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Risk Score Timeline */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={16} style={{ color: 'var(--teal-600)' }} /> Risk Score Timeline
            </h3>
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Demo prediction</span>
          </div>
          <div className="card-body">
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" fontSize={10} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} fontSize={10} stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => [`${value}%`, 'Risk Score']}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime ?? ''} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Critical', fontSize: 10, fill: '#ef4444' }} />
                  <ReferenceLine y={60} stroke="#e11d48" strokeDasharray="5 5" />
                  <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="risk" stroke={riskColor} strokeWidth={2} fill="url(#riskGrad2)"
                    connectNulls name="Risk %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Contributing Factors + Missing Data + Alert Timeline */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Contributing Factors */}
        <div className="card">
          <div className="card-header">
            <h3>Contributing Factors</h3>
            <Info size={14} style={{ color: 'var(--gray-400)' }} />
          </div>
          <div className="card-body">
            {riskAssessment && riskAssessment.contributingFactors.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {riskAssessment.contributingFactors.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px',
                    background: f.impact === 'high' ? 'var(--critical-50)' :
                      f.impact === 'medium' ? 'var(--warning-50)' : 'var(--gray-50)',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${f.impact === 'high' ? 'var(--critical-200)' :
                      f.impact === 'medium' ? 'var(--warning-200)' : 'var(--gray-200)'}`,
                  }}>
                    <span className={`risk-badge ${
                      f.impact === 'high' ? 'risk-critical' :
                      f.impact === 'medium' ? 'risk-moderate' : 'risk-low'
                    }`} style={{ fontSize: 10, padding: '2px 6px' }}>
                      {f.impact}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{f.parameter}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>{f.description}</div>
                      {f.value && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Current: {f.value}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-icon"><Activity size={24} /></div>
                <h3>No Significant Factors</h3>
                <p>All vital signs are within acceptable ranges.</p>
              </div>
            )}
          </div>
        </div>

        {/* Missing Data + Alert Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Missing Data Summary */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileWarning size={16} style={{ color: 'var(--warning-500)' }} />
                Missing Data ({timeRange}h window)
              </h3>
            </div>
            <div className="card-body">
              {totalMissing > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(missingCounts).map(([param, count]) => (
                    <div key={param} className="quality-bar">
                      <span style={{ fontSize: 12, color: 'var(--gray-600)', width: 120 }}>{param}</span>
                      <div className="quality-bar-track">
                        <div
                          className="quality-bar-fill"
                          style={{
                            width: `${Math.min(100, (count / patientVitals.length) * 100)}%`,
                            background: count > 0 ? 'var(--warning-400)' : 'var(--success-400)',
                          }}
                        />
                      </div>
                      <span className="quality-bar-label" style={{
                        color: count > 0 ? 'var(--warning-600)' : 'var(--success-600)'
                      }}>
                        {count}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>
                    {totalMissing} missing values out of {patientVitals.length * 5} total measurements
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--success-600)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ✓ No missing values in the selected time window
                </div>
              )}
            </div>
          </div>

          {/* Alert Timeline */}
          <div className="card">
            <div className="card-header">
              <h3>Alert Timeline</h3>
            </div>
            <div className="card-body" style={{ maxHeight: 250, overflowY: 'auto' }}>
              {patientAlerts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {patientAlerts.map(a => (
                    <div key={a.id} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '8px 12px',
                      borderLeft: `3px solid ${
                        a.severity === 'Critical' ? 'var(--critical-500)' :
                        a.severity === 'High' ? '#e11d48' :
                        a.severity === 'Moderate' ? 'var(--warning-500)' : 'var(--success-500)'
                      }`,
                      background: a.status === 'resolved' ? 'var(--gray-50)' : 'white',
                      opacity: a.status === 'resolved' ? 0.6 : 1,
                      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    }}>
                      <Clock size={13} style={{ marginTop: 2, color: 'var(--gray-400)', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>
                          {a.severity} — {a.riskScore}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{a.reason}</div>
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
                          {new Date(a.timestamp).toLocaleString()} • {a.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--gray-500)', textAlign: 'center', padding: 16 }}>
                  No alerts for this patient
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
