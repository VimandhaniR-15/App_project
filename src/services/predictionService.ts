// PulsePredict Prediction Service
// Modular demonstration prediction layer
// Replace this service with a real ML model API for production use

import type { VitalSign, RiskAssessment, ContributingFactor } from '../types';

/**
 * DEMO PREDICTION SERVICE
 * 
 * This generates clearly labeled demonstration risk scores using rule-based
 * heuristics applied to synthetic patient observations. These are NOT validated
 * clinical predictions.
 * 
 * To integrate a trained ML model:
 * 1. Replace computeRiskScore() with an API call to your model server
 * 2. The model should predict future deterioration using only observations
 *    available at the prediction time (no temporal leakage)
 * 3. Update isDemoScore to false for validated predictions
 */

interface PredictionConfig {
  criticalThreshold: number;
  highThreshold: number;
  moderateThreshold: number;
}

const DEFAULT_CONFIG: PredictionConfig = {
  criticalThreshold: 80,
  highThreshold: 60,
  moderateThreshold: 35,
};

// Normal ranges for vital signs
const NORMAL_RANGES = {
  heartRate: { low: 60, high: 100 },
  respiratoryRate: { low: 12, high: 20 },
  systolicBP: { low: 90, high: 140 },
  diastolicBP: { low: 60, high: 90 },
  spO2: { low: 94, high: 100 },
  temperature: { low: 36.1, high: 37.5 },
};

function calculateDeviationScore(value: number | null, range: { low: number; high: number }, weight: number): { score: number; deviation: string } {
  if (value === null) return { score: 0, deviation: 'missing' };

  if (value >= range.low && value <= range.high) {
    return { score: 0, deviation: 'normal' };
  }

  let deviation: number;
  let label: string;
  if (value < range.low) {
    deviation = (range.low - value) / range.low;
    label = 'below normal';
  } else {
    deviation = (value - range.high) / range.high;
    label = 'above normal';
  }

  // Exponential scaling for severe deviations
  const rawScore = Math.min(1, deviation * 2) * weight;
  return { score: rawScore * (1 + deviation), deviation: label };
}

function computeTrend(values: (number | null)[]): 'rising' | 'stable' | 'falling' {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 3) return 'stable';

  const recent = valid.slice(-3);
  const earlier = valid.slice(-6, -3);
  if (earlier.length === 0) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  const change = (recentAvg - earlierAvg) / earlierAvg;
  if (Math.abs(change) < 0.03) return 'stable';
  return change > 0 ? 'rising' : 'falling';
}

export function computeRiskAssessment(
  patientId: string,
  vitals: VitalSign[],
  config: PredictionConfig = DEFAULT_CONFIG
): RiskAssessment {
  const patientVitals = vitals
    .filter(v => v.patientId === patientId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (patientVitals.length === 0) {
    return {
      patientId,
      timestamp: new Date().toISOString(),
      riskScore: 0,
      riskCategory: 'Low',
      trend: 'stable',
      contributingFactors: [],
      isDemoScore: true,
    };
  }

  const latest = patientVitals[patientVitals.length - 1];
  const factors: ContributingFactor[] = [];
  let totalScore = 0;
  let maxWeight = 0;

  // Heart rate assessment
  const hrResult = calculateDeviationScore(latest.heartRate, NORMAL_RANGES.heartRate, 20);
  totalScore += hrResult.score;
  maxWeight += 20;
  if (hrResult.score > 3) {
    factors.push({
      parameter: 'Heart Rate',
      description: `Heart rate ${latest.heartRate} bpm is ${hrResult.deviation}`,
      impact: hrResult.score > 10 ? 'high' : hrResult.score > 5 ? 'medium' : 'low',
      value: `${latest.heartRate} bpm`,
    });
  }

  // Respiratory rate
  const rrResult = calculateDeviationScore(latest.respiratoryRate, NORMAL_RANGES.respiratoryRate, 22);
  totalScore += rrResult.score;
  maxWeight += 22;
  if (rrResult.score > 3) {
    factors.push({
      parameter: 'Respiratory Rate',
      description: `Respiratory rate ${latest.respiratoryRate}/min is ${rrResult.deviation}`,
      impact: rrResult.score > 10 ? 'high' : rrResult.score > 5 ? 'medium' : 'low',
      value: `${latest.respiratoryRate}/min`,
    });
  }

  // Blood pressure
  const sbpResult = calculateDeviationScore(latest.systolicBP, NORMAL_RANGES.systolicBP, 18);
  totalScore += sbpResult.score;
  maxWeight += 18;
  if (sbpResult.score > 3) {
    factors.push({
      parameter: 'Systolic BP',
      description: `Systolic BP ${latest.systolicBP} mmHg is ${sbpResult.deviation}`,
      impact: sbpResult.score > 10 ? 'high' : sbpResult.score > 5 ? 'medium' : 'low',
      value: `${latest.systolicBP} mmHg`,
    });
  }

  // SpO2
  const spo2Result = calculateDeviationScore(latest.spO2, NORMAL_RANGES.spO2, 25);
  totalScore += spo2Result.score;
  maxWeight += 25;
  if (spo2Result.score > 2) {
    factors.push({
      parameter: 'SpO₂',
      description: `Oxygen saturation ${latest.spO2}% is ${spo2Result.deviation}`,
      impact: spo2Result.score > 12 ? 'high' : spo2Result.score > 6 ? 'medium' : 'low',
      value: `${latest.spO2}%`,
    });
  }

  // Temperature
  const tempResult = calculateDeviationScore(latest.temperature, NORMAL_RANGES.temperature, 15);
  totalScore += tempResult.score;
  maxWeight += 15;
  if (tempResult.score > 2) {
    factors.push({
      parameter: 'Temperature',
      description: `Temperature ${latest.temperature}°C is ${tempResult.deviation}`,
      impact: tempResult.score > 8 ? 'high' : tempResult.score > 4 ? 'medium' : 'low',
      value: `${latest.temperature}°C`,
    });
  }

  // Missing data penalty: if many values missing, that itself is concerning
  const nullCount = [latest.heartRate, latest.respiratoryRate, latest.systolicBP, latest.spO2, latest.temperature]
    .filter(v => v === null).length;
  if (nullCount >= 2) {
    totalScore += nullCount * 3;
    factors.push({
      parameter: 'Missing Data',
      description: `${nullCount} vital parameters missing in latest observation`,
      impact: nullCount >= 3 ? 'high' : 'medium',
    });
  }

  // Trend analysis (last 6 observations)
  const recentVitals = patientVitals.slice(-6);
  const hrTrend = computeTrend(recentVitals.map(v => v.heartRate));
  const rrTrend = computeTrend(recentVitals.map(v => v.respiratoryRate));
  const spo2Trend = computeTrend(recentVitals.map(v => v.spO2));

  // Add trend contribution
  if (hrTrend === 'rising') totalScore += 5;
  if (rrTrend === 'rising') totalScore += 5;
  if (spo2Trend === 'falling') totalScore += 8;

  // Overall trend
  let overallTrend: 'rising' | 'stable' | 'falling' = 'stable';
  const risingCount = [hrTrend, rrTrend].filter(t => t === 'rising').length + (spo2Trend === 'falling' ? 1 : 0);
  const fallingCount = [hrTrend, rrTrend].filter(t => t === 'falling').length + (spo2Trend === 'rising' ? 1 : 0);
  if (risingCount >= 2) overallTrend = 'rising';
  else if (fallingCount >= 2) overallTrend = 'falling';

  // Normalize to 0-100
  const riskScore = Math.min(100, Math.max(0, Math.round((totalScore / maxWeight) * 100)));

  // Categorize
  let riskCategory: RiskAssessment['riskCategory'] = 'Low';
  if (riskScore >= config.criticalThreshold) riskCategory = 'Critical';
  else if (riskScore >= config.highThreshold) riskCategory = 'High';
  else if (riskScore >= config.moderateThreshold) riskCategory = 'Moderate';

  return {
    patientId,
    timestamp: latest.timestamp,
    riskScore,
    riskCategory,
    trend: overallTrend,
    contributingFactors: factors,
    isDemoScore: true,
  };
}

export function computeAllRiskAssessments(
  patientIds: string[],
  vitals: VitalSign[],
  config?: PredictionConfig
): RiskAssessment[] {
  return patientIds.map(id => computeRiskAssessment(id, vitals, config));
}

export function computeTimeSeriesRisk(
  patientId: string,
  vitals: VitalSign[],
  windowHours: number = 48,
  config?: PredictionConfig
): RiskAssessment[] {
  const patientVitals = vitals
    .filter(v => v.patientId === patientId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (patientVitals.length === 0) return [];

  const now = new Date(patientVitals[patientVitals.length - 1].timestamp);
  const cutoff = new Date(now.getTime() - windowHours * 3600 * 1000);

  const assessments: RiskAssessment[] = [];
  const filtered = patientVitals.filter(v => new Date(v.timestamp) >= cutoff);

  // Generate assessment at each observation point
  for (let i = 0; i < filtered.length; i++) {
    const subset = filtered.slice(0, i + 1);
    const assessment = computeRiskAssessment(patientId, subset, config);
    assessment.timestamp = filtered[i].timestamp;
    assessments.push(assessment);
  }

  return assessments;
}

// Feature extraction for future ML model integration
export function extractFeatures(patientId: string, vitals: VitalSign[]): Record<string, number | null> {
  const pv = vitals
    .filter(v => v.patientId === patientId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (pv.length === 0) return {};

  const latest = pv[pv.length - 1];
  const recent = pv.slice(-6);

  const getValues = (field: keyof VitalSign) =>
    recent.map(v => v[field] as number | null).filter((v): v is number => v !== null);

  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const std = (arr: number[]) => {
    const m = mean(arr);
    if (m === null || arr.length < 2) return null;
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
  };

  const hrVals = getValues('heartRate');
  const rrVals = getValues('respiratoryRate');
  const spo2Vals = getValues('spO2');
  const sbpVals = getValues('systolicBP');
  const tempVals = getValues('temperature');

  // Time since last observation (hours)
  let timeSinceLastObs = null;
  if (pv.length >= 2) {
    const last = new Date(pv[pv.length - 1].timestamp);
    const prev = new Date(pv[pv.length - 2].timestamp);
    timeSinceLastObs = (last.getTime() - prev.getTime()) / 3600000;
  }

  return {
    hr_current: latest.heartRate,
    hr_mean: mean(hrVals),
    hr_std: std(hrVals),
    hr_change: hrVals.length >= 2 ? hrVals[hrVals.length - 1] - hrVals[0] : null,
    rr_current: latest.respiratoryRate,
    rr_mean: mean(rrVals),
    rr_std: std(rrVals),
    spo2_current: latest.spO2,
    spo2_mean: mean(spo2Vals),
    spo2_min: spo2Vals.length ? Math.min(...spo2Vals) : null,
    sbp_current: latest.systolicBP,
    sbp_mean: mean(sbpVals),
    sbp_min: sbpVals.length ? Math.min(...sbpVals) : null,
    temp_current: latest.temperature,
    temp_mean: mean(tempVals),
    temp_max: tempVals.length ? Math.max(...tempVals) : null,
    missing_count: [latest.heartRate, latest.respiratoryRate, latest.systolicBP, latest.spO2, latest.temperature]
      .filter(v => v === null).length,
    time_since_last_obs: timeSinceLastObs,
    obs_count_recent: recent.length,
  };
}
