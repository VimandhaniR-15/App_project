// PulsePredict Data Upload & Quality Analysis Page

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, CheckCircle, XCircle, AlertTriangle, Info,
  Database, BarChart2, Download, Trash2, Eye, ArrowRight
} from 'lucide-react';
import Papa from 'papaparse';
import { useAppStore } from '../store/AppStore';
import { analyzeDataQuality } from '../services/dataQualityService';
import type { ColumnMapping, DataQualityReport } from '../types';

export default function UploadPage() {
  const { uploadedDataset, setUploadedDataset } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState('');
  const [tab, setTab] = useState<'upload' | 'preview' | 'quality' | 'mapping'>('upload');

  const [mapping, setMapping] = useState<ColumnMapping>({
    patientId: '', timestamp: '', heartRate: '', respiratoryRate: '',
    systolicBP: '', diastolicBP: '', spO2: '', temperature: '', outcome: '',
  });

  const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Only CSV files are supported. Please upload a .csv file.');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum file size is 50MB.');
      return;
    }

    setParsing(true);
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // Keep as strings for flexible handling
      complete: (results) => {
        setParsing(false);

        if (results.errors.length > 0) {
          const criticalErrors = results.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
          if (criticalErrors.length > 0) {
            setError(`CSV parsing errors: ${criticalErrors.map(e => e.message).join('; ')}`);
            return;
          }
        }

        if (!results.data || results.data.length === 0) {
          setError('The CSV file appears to be empty. Please check the file contents.');
          return;
        }

        const data = results.data as Record<string, string>[];
        const cols = results.meta.fields || [];

        setRawData(data);
        setColumns(cols);
        setPreviewRows(data.slice(0, 20));

        // Auto-detect column mapping
        const autoMap: ColumnMapping = { ...mapping };
        for (const col of cols) {
          const lower = col.toLowerCase().replace(/[_\s-]/g, '');
          if (lower.includes('patientid') || lower === 'id' || lower === 'pid' || lower === 'subjectid') autoMap.patientId = col;
          else if (lower.includes('timestamp') || lower.includes('datetime') || lower === 'time' || lower.includes('charttime')) autoMap.timestamp = col;
          else if (lower.includes('heartrate') || lower === 'hr' || lower.includes('pulse')) autoMap.heartRate = col;
          else if (lower.includes('resprate') || lower.includes('respiratoryrate') || lower === 'rr') autoMap.respiratoryRate = col;
          else if (lower.includes('systolic') || lower === 'sbp' || lower.includes('nibps')) autoMap.systolicBP = col;
          else if (lower.includes('diastolic') || lower === 'dbp' || lower.includes('nibpd')) autoMap.diastolicBP = col;
          else if (lower.includes('spo2') || lower.includes('o2sat') || lower.includes('oxygensaturation')) autoMap.spO2 = col;
          else if (lower.includes('temp') || lower.includes('temperature')) autoMap.temperature = col;
          else if (lower.includes('outcome') || lower.includes('mortality') || lower.includes('label') || lower.includes('death')) autoMap.outcome = col;
        }
        setMapping(autoMap);
        setTab('preview');
      },
      error: (err) => {
        setParsing(false);
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const runQualityAnalysis = useCallback(() => {
    if (rawData.length === 0) return;
    if (!mapping.patientId || !mapping.timestamp) {
      setError('Map a patient ID and timestamp column before analyzing this dataset.');
      setTab('mapping');
      return;
    }
    if (![mapping.heartRate, mapping.respiratoryRate, mapping.systolicBP, mapping.diastolicBP, mapping.spO2, mapping.temperature].some(Boolean)) {
      setError('Map at least one vital-sign column before analyzing this dataset.');
      setTab('mapping');
      return;
    }
    setError(null);
    const report = analyzeDataQuality(rawData, mapping);
    setQualityReport(report);
    setUploadedDataset({
      fileName,
      data: rawData,
      columns,
      mapping,
      qualityReport: report,
    });
    setTab('quality');
  }, [rawData, mapping, fileName, columns, setUploadedDataset]);

  const clearData = useCallback(() => {
    setRawData([]);
    setColumns([]);
    setPreviewRows([]);
    setFileName('');
    setQualityReport(null);
    setError(null);
    setMapping({ patientId: '', timestamp: '', heartRate: '', respiratoryRate: '', systolicBP: '', diastolicBP: '', spO2: '', temperature: '', outcome: '' });
    setUploadedDataset(null);
    setTab('upload');
  }, [setUploadedDataset]);

  const qualityScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success-500)';
    if (score >= 60) return 'var(--warning-500)';
    return 'var(--critical-500)';
  };

  return (
    <div className="page-container animate-in">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${tab === 'upload' ? 'active' : ''}`} onClick={() => setTab('upload')}>
          <Upload size={14} style={{ marginRight: 6, display: 'inline' }} />
          Upload
        </button>
        <button
          className={`tab ${tab === 'preview' ? 'active' : ''}`}
          onClick={() => rawData.length > 0 && setTab('preview')}
          style={{ opacity: rawData.length > 0 ? 1 : 0.4 }}
        >
          <Eye size={14} style={{ marginRight: 6, display: 'inline' }} />
          Preview
        </button>
        <button
          className={`tab ${tab === 'mapping' ? 'active' : ''}`}
          onClick={() => rawData.length > 0 && setTab('mapping')}
          style={{ opacity: rawData.length > 0 ? 1 : 0.4 }}
        >
          <Database size={14} style={{ marginRight: 6, display: 'inline' }} />
          Column Mapping
        </button>
        <button
          className={`tab ${tab === 'quality' ? 'active' : ''}`}
          onClick={() => qualityReport && setTab('quality')}
          style={{ opacity: qualityReport ? 1 : 0.4 }}
        >
          <BarChart2 size={14} style={{ marginRight: 6, display: 'inline' }} />
          Quality Report
        </button>
      </div>

      {/* Upload Tab */}
      {tab === 'upload' && (
        <div className="card slide-up">
          <div className="card-body">
            <div
              className={`upload-zone ${dragOver ? 'dragover' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-zone-icon">
                <Upload size={24} />
              </div>
              <h3>Drop your CSV file here</h3>
              <p>or click to browse • Supports clinical observation data in CSV format</p>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-400)' }}>
                Supported formats: Long-format (one observation per row) or wide-format clinical data
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {parsing && (
              <div className="loading-overlay" style={{ padding: 24 }}>
                <div className="spinner" />
                <span>Parsing CSV file...</span>
              </div>
            )}

            {error && (
              <div style={{
                marginTop: 16, padding: '12px 16px', background: 'var(--critical-50)',
                border: '1px solid var(--critical-200)', borderRadius: 'var(--radius-md)',
                color: 'var(--critical-700)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <XCircle size={16} />
                {error}
              </div>
            )}

            {rawData.length > 0 && (
              <div style={{
                marginTop: 16, padding: '12px 16px', background: 'var(--success-50)',
                border: '1px solid var(--success-200)', borderRadius: 'var(--radius-md)',
                color: 'var(--success-700)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
              }}>
                <CheckCircle size={16} />
                Successfully loaded <strong>{fileName}</strong> — {rawData.length.toLocaleString()} records, {columns.length} columns
              </div>
            )}

            <div style={{
              marginTop: 24, padding: 16, background: 'var(--gray-50)',
              borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--gray-600)'
            }}>
              <h4 style={{ marginBottom: 8, color: 'var(--gray-700)' }}>Expected Data Format</h4>
              <p>Your CSV should contain columns for:</p>
              <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
                <li><strong>Patient ID</strong> — unique patient identifier</li>
                <li><strong>Timestamp</strong> — observation date/time (ISO 8601 or common formats)</li>
                <li><strong>Heart Rate</strong> — beats per minute</li>
                <li><strong>Respiratory Rate</strong> — breaths per minute</li>
                <li><strong>Systolic/Diastolic BP</strong> — mmHg</li>
                <li><strong>SpO₂</strong> — oxygen saturation percentage</li>
                <li><strong>Temperature</strong> — degrees Celsius</li>
                <li><strong>Outcome</strong> (optional) — for model evaluation</li>
              </ul>
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-500)' }}>
                <Info size={12} style={{ display: 'inline', marginRight: 4 }} />
                Zero values are NOT automatically treated as missing. Configure missing-value rules in Settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview Tab */}
      {tab === 'preview' && rawData.length > 0 && (
        <div className="card slide-up">
          <div className="card-header">
            <h3>
              <FileText size={16} style={{ display: 'inline', marginRight: 6 }} />
              Data Preview — {fileName}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" onClick={clearData}>
                <Trash2 size={14} /> Clear
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setTab('mapping')}>
                Map Columns <ArrowRight size={14} />
              </button>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ maxHeight: 500 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {columns.map(col => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--gray-400)' }}>{i + 1}</td>
                      {columns.map(col => (
                        <td key={col} style={{
                          color: (row[col] === '' || row[col] === undefined || row[col] === 'NaN')
                            ? 'var(--warning-500)' : undefined,
                          fontStyle: (row[col] === '' || row[col] === undefined) ? 'italic' : undefined,
                        }}>
                          {row[col] === '' || row[col] === undefined ? '(empty)' : row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{
            padding: '12px 24px', borderTop: '1px solid var(--gray-100)',
            fontSize: 12, color: 'var(--gray-500)'
          }}>
            Showing first {previewRows.length} of {rawData.length.toLocaleString()} records
          </div>
        </div>
      )}

      {/* Column Mapping Tab */}
      {tab === 'mapping' && rawData.length > 0 && (
        <div className="card slide-up">
          <div className="card-header">
            <h3>
              <Database size={16} style={{ display: 'inline', marginRight: 6 }} />
              Column Mapping
            </h3>
            <button className="btn btn-primary btn-sm" onClick={runQualityAnalysis}>
              Run Quality Analysis <ArrowRight size={14} />
            </button>
          </div>
          <div className="card-body">
            <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 20 }}>
              Map your CSV columns to the expected clinical parameters. Auto-detected mappings are pre-filled.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { key: 'patientId', label: 'Patient ID', required: true },
                { key: 'timestamp', label: 'Timestamp', required: true },
                { key: 'heartRate', label: 'Heart Rate' },
                { key: 'respiratoryRate', label: 'Respiratory Rate' },
                { key: 'systolicBP', label: 'Systolic BP' },
                { key: 'diastolicBP', label: 'Diastolic BP' },
                { key: 'spO2', label: 'SpO₂ (Oxygen Saturation)' },
                { key: 'temperature', label: 'Temperature' },
                { key: 'outcome', label: 'Outcome (optional)' },
              ].map(field => (
                <div key={field.key}>
                  <label style={{
                    fontSize: 13, fontWeight: 500, color: 'var(--gray-700)',
                    display: 'block', marginBottom: 4
                  }}>
                    {field.label}
                    {field.required && <span style={{ color: 'var(--critical-500)' }}> *</span>}
                  </label>
                  <select
                    className="select"
                    style={{ width: '100%' }}
                    value={mapping[field.key as keyof ColumnMapping]}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">— Select column —</option>
                    {columns.map(col => <option key={col} value={col}>{col}</option>)}
                  </select>
                  {mapping[field.key as keyof ColumnMapping] && (
                    <div style={{ fontSize: 11, color: 'var(--success-600)', marginTop: 2 }}>
                      ✓ Mapped to "{mapping[field.key as keyof ColumnMapping]}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quality Report Tab */}
      {tab === 'quality' && qualityReport && (
        <div className="slide-up">
          {/* Quality Score Header */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
              <h3 style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 8 }}>Data Quality Score</h3>
              <div style={{
                fontSize: 56, fontWeight: 800,
                color: qualityScoreColor(qualityReport.overallScore),
                lineHeight: 1,
              }}>
                {qualityReport.overallScore}%
              </div>
              <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 8 }}>
                {qualityReport.totalRecords.toLocaleString()} records from {qualityReport.totalPatients} patients
              </p>
              {qualityReport.timeRange.start && (
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                  {new Date(qualityReport.timeRange.start).toLocaleString()} — {new Date(qualityReport.timeRange.end).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 20 }}>
            {/* Missing Values */}
            <div className="card">
              <div className="card-header">
                <h3>Missing Values by Variable</h3>
              </div>
              <div className="card-body">
                {Object.entries(qualityReport.missingValues).map(([param, info]) => (
                  <div key={param} className="quality-bar" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--gray-600)', width: 120, flexShrink: 0 }}>
                      {param}
                    </span>
                    <div className="quality-bar-track">
                      <div
                        className="quality-bar-fill"
                        style={{
                          width: `${Math.min(100, info.percentage)}%`,
                          background: info.percentage > 20 ? 'var(--critical-400)' :
                            info.percentage > 5 ? 'var(--warning-400)' : 'var(--success-400)',
                        }}
                      />
                    </div>
                    <span className="quality-bar-label" style={{
                      color: info.percentage > 20 ? 'var(--critical-600)' :
                        info.percentage > 5 ? 'var(--warning-600)' : 'var(--success-600)',
                    }}>
                      {info.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="card">
              <div className="card-header">
                <h3>Quality Metrics</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="setting-row">
                    <div>
                      <div className="setting-label">Duplicate Timestamps</div>
                      <div className="setting-desc">Same patient + timestamp combination</div>
                    </div>
                    <span style={{
                      fontWeight: 700,
                      color: qualityReport.duplicateTimestamps > 0 ? 'var(--warning-600)' : 'var(--success-600)',
                    }}>
                      {qualityReport.duplicateTimestamps}
                    </span>
                  </div>
                  <div className="setting-row">
                    <div>
                      <div className="setting-label">Sampling Interval</div>
                      <div className="setting-desc">Mean ± std (minutes)</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {qualityReport.irregularSampling.mean} ± {qualityReport.irregularSampling.std}
                    </span>
                  </div>
                  <div className="setting-row">
                    <div>
                      <div className="setting-label">Interval Range</div>
                      <div className="setting-desc">Min – Max (minutes)</div>
                    </div>
                    <span style={{ fontWeight: 600 }}>
                      {qualityReport.irregularSampling.min} – {qualityReport.irregularSampling.max}
                    </span>
                  </div>
                </div>

                {/* Invalid Measurements */}
                {qualityReport.invalidMeasurements.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>
                      Invalid Measurements
                    </h4>
                    {qualityReport.invalidMeasurements.map((inv, i) => (
                      <div key={i} style={{
                        padding: '8px 12px', background: 'var(--critical-50)',
                        border: '1px solid var(--critical-200)', borderRadius: 'var(--radius-sm)',
                        fontSize: 12, color: 'var(--critical-700)', marginBottom: 4,
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <AlertTriangle size={14} />
                        <strong>{inv.field}:</strong> {inv.details}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
