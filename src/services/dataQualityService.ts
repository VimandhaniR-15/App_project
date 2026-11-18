// PulsePredict Data Quality Analysis Service
// Analyzes uploaded clinical data for quality issues

import type { DataQualityReport, ColumnMapping } from '../types';

export function analyzeDataQuality(
  data: Record<string, string>[],
  mapping: ColumnMapping
): DataQualityReport {
  if (data.length === 0) {
    return {
      totalRecords: 0,
      totalPatients: 0,
      timeRange: { start: '', end: '' },
      missingValues: {},
      duplicateTimestamps: 0,
      irregularSampling: { mean: 0, std: 0, min: 0, max: 0 },
      invalidMeasurements: [],
      overallScore: 0,
    };
  }

  const totalRecords = data.length;
  const patientIds = new Set(data.map(r => r[mapping.patientId]).filter(Boolean));
  const totalPatients = patientIds.size;

  // Time range
  const timestamps = data
    .map(r => r[mapping.timestamp])
    .filter(Boolean)
    .map(t => new Date(t))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const timeRange = {
    start: timestamps.length > 0 ? timestamps[0].toISOString() : '',
    end: timestamps.length > 0 ? timestamps[timestamps.length - 1].toISOString() : '',
  };

  // Missing values analysis
  const vitalFields: [string, string][] = [
    [mapping.heartRate, 'Heart Rate'],
    [mapping.respiratoryRate, 'Respiratory Rate'],
    [mapping.systolicBP, 'Systolic BP'],
    [mapping.diastolicBP, 'Diastolic BP'],
    [mapping.spO2, 'SpO₂'],
    [mapping.temperature, 'Temperature'],
  ].filter(([col]) => col) as [string, string][];

  const missingValues: Record<string, { count: number; percentage: number }> = {};
  for (const [col, label] of vitalFields) {
    const missing = data.filter(r => {
      const v = r[col];
      return v === undefined || v === null || v === '' || v === 'NaN' || v === 'nan';
    }).length;
    missingValues[label] = {
      count: missing,
      percentage: Math.round((missing / totalRecords) * 10000) / 100,
    };
  }

  // Duplicate timestamps per patient
  let duplicateTimestamps = 0;
  const tsMap = new Map<string, Set<string>>();
  for (const row of data) {
    const pid = row[mapping.patientId];
    const ts = row[mapping.timestamp];
    if (!pid || !ts) continue;
    const key = `${pid}`;
    if (!tsMap.has(key)) tsMap.set(key, new Set());
    const set = tsMap.get(key)!;
    if (set.has(ts)) duplicateTimestamps++;
    else set.add(ts);
  }

  // Irregular sampling analysis
  const intervals: number[] = [];
  for (const pid of patientIds) {
    const patientTs = data
      .filter(r => r[mapping.patientId] === pid && r[mapping.timestamp])
      .map(r => new Date(r[mapping.timestamp]).getTime())
      .filter(t => !isNaN(t))
      .sort((a, b) => a - b);
    for (let i = 1; i < patientTs.length; i++) {
      intervals.push((patientTs[i] - patientTs[i - 1]) / 60000); // minutes
    }
  }

  const meanInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
  const stdInterval = intervals.length > 1
    ? Math.sqrt(intervals.reduce((s, v) => s + (v - meanInterval) ** 2, 0) / intervals.length)
    : 0;

  const irregularSampling = {
    mean: Math.round(meanInterval * 10) / 10,
    std: Math.round(stdInterval * 10) / 10,
    min: intervals.length > 0 ? Math.round(Math.min(...intervals) * 10) / 10 : 0,
    max: intervals.length > 0 ? Math.round(Math.max(...intervals) * 10) / 10 : 0,
  };

  // Invalid measurements
  const invalidMeasurements: { field: string; count: number; details: string }[] = [];
  const ranges: Record<string, [number, number, string]> = {
    [mapping.heartRate]: [20, 250, 'Heart Rate'],
    [mapping.respiratoryRate]: [2, 60, 'Respiratory Rate'],
    [mapping.systolicBP]: [40, 300, 'Systolic BP'],
    [mapping.diastolicBP]: [20, 200, 'Diastolic BP'],
    [mapping.spO2]: [0, 100, 'SpO₂'],
    [mapping.temperature]: [30, 45, 'Temperature'],
  };

  for (const [col, [min, max, label]] of Object.entries(ranges)) {
    if (!col) continue;
    const invalid = data.filter(r => {
      const v = parseFloat(r[col]);
      return !isNaN(v) && (v < min || v > max);
    }).length;
    if (invalid > 0) {
      invalidMeasurements.push({
        field: label,
        count: invalid,
        details: `${invalid} values outside range [${min}–${max}]`,
      });
    }
  }

  // Overall quality score
  const totalMissingPercent = Object.values(missingValues).reduce((s, v) => s + v.percentage, 0) / Math.max(1, Object.keys(missingValues).length);
  const totalInvalid = invalidMeasurements.reduce((s, v) => s + v.count, 0);
  const invalidPercent = (totalInvalid / totalRecords) * 100;
  const dupPercent = (duplicateTimestamps / totalRecords) * 100;

  const overallScore = Math.max(0, Math.min(100, Math.round(
    100 - totalMissingPercent * 1.5 - invalidPercent * 3 - dupPercent * 2 - (stdInterval > 60 ? 10 : 0)
  )));

  return {
    totalRecords,
    totalPatients,
    timeRange,
    missingValues,
    duplicateTimestamps,
    irregularSampling,
    invalidMeasurements,
    overallScore,
  };
}
