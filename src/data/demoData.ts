// PulsePredict Synthetic Demo Data Generator
// Generates realistic but entirely synthetic patient data for demonstration

import type { Patient, VitalSign, Alert, RiskAssessment } from '../types';

// Demo patients with varied scenarios
const DEMO_PATIENTS: Patient[] = [
  { id: 'PP-001', name: 'James Mitchell', age: 67, gender: 'M', admissionDate: '2026-10-16T08:30:00', bed: 'ICU-A1', ward: 'ICU-A', diagnosis: 'Sepsis' },
  { id: 'PP-002', name: 'Maria Santos', age: 54, gender: 'F', admissionDate: '2026-10-16T14:15:00', bed: 'ICU-A2', ward: 'ICU-A', diagnosis: 'Post-cardiac surgery' },
  { id: 'PP-003', name: 'Robert Chen', age: 72, gender: 'M', admissionDate: '2026-10-17T02:00:00', bed: 'ICU-A3', ward: 'ICU-A', diagnosis: 'Pneumonia' },
  { id: 'PP-004', name: 'Sarah Johnson', age: 45, gender: 'F', admissionDate: '2026-10-16T19:00:00', bed: 'ICU-B1', ward: 'ICU-B', diagnosis: 'Trauma - MVA' },
  { id: 'PP-005', name: 'William Park', age: 61, gender: 'M', admissionDate: '2026-10-17T06:00:00', bed: 'ICU-B2', ward: 'ICU-B', diagnosis: 'COPD Exacerbation' },
  { id: 'PP-006', name: 'Emma Davis', age: 38, gender: 'F', admissionDate: '2026-10-17T10:30:00', bed: 'ICU-B3', ward: 'ICU-B', diagnosis: 'Diabetic Ketoacidosis' },
  { id: 'PP-007', name: 'David Wilson', age: 79, gender: 'M', admissionDate: '2026-10-16T22:00:00', bed: 'ICU-C1', ward: 'ICU-C', diagnosis: 'Acute Renal Failure' },
  { id: 'PP-008', name: 'Lisa Thompson', age: 55, gender: 'F', admissionDate: '2026-10-17T00:30:00', bed: 'ICU-C2', ward: 'ICU-C', diagnosis: 'GI Hemorrhage' },
  { id: 'PP-009', name: 'Michael Brown', age: 63, gender: 'M', admissionDate: '2026-10-16T11:00:00', bed: 'ICU-C3', ward: 'ICU-C', diagnosis: 'Stroke' },
  { id: 'PP-010', name: 'Jennifer Lee', age: 48, gender: 'F', admissionDate: '2026-10-17T04:00:00', bed: 'ICU-D1', ward: 'ICU-D', diagnosis: 'Post-surgical monitoring' },
  { id: 'PP-011', name: 'Thomas Anderson', age: 70, gender: 'M', admissionDate: '2026-10-16T16:00:00', bed: 'ICU-D2', ward: 'ICU-D', diagnosis: 'Congestive Heart Failure' },
  { id: 'PP-012', name: 'Patricia Martinez', age: 59, gender: 'F', admissionDate: '2026-10-17T08:00:00', bed: 'ICU-D3', ward: 'ICU-D', diagnosis: 'Liver Failure' },
  { id: 'PP-013', name: 'Christopher Taylor', age: 42, gender: 'M', admissionDate: '2026-10-17T12:00:00', bed: 'ICU-A4', ward: 'ICU-A', diagnosis: 'Drug Overdose' },
  { id: 'PP-014', name: 'Amanda White', age: 66, gender: 'F', admissionDate: '2026-10-16T20:00:00', bed: 'ICU-B4', ward: 'ICU-B', diagnosis: 'Pulmonary Embolism' },
  { id: 'PP-015', name: 'Daniel Harris', age: 51, gender: 'M', admissionDate: '2026-10-17T14:00:00', bed: 'ICU-C4', ward: 'ICU-C', diagnosis: 'Acute Pancreatitis' },
];

// Patient scenario types for data generation
type ScenarioType = 'stable' | 'gradual_deterioration' | 'improving' | 'noisy_stable' | 'sudden_spike' | 'intermittent_issues';

const PATIENT_SCENARIOS: Record<string, ScenarioType> = {
  'PP-001': 'gradual_deterioration',
  'PP-002': 'improving',
  'PP-003': 'gradual_deterioration',
  'PP-004': 'stable',
  'PP-005': 'intermittent_issues',
  'PP-006': 'improving',
  'PP-007': 'sudden_spike',
  'PP-008': 'noisy_stable',
  'PP-009': 'gradual_deterioration',
  'PP-010': 'stable',
  'PP-011': 'intermittent_issues',
  'PP-012': 'gradual_deterioration',
  'PP-013': 'improving',
  'PP-014': 'sudden_spike',
  'PP-015': 'stable',
};

// Baseline vital signs
interface VitalBaseline {
  heartRate: number;
  respiratoryRate: number;
  systolicBP: number;
  diastolicBP: number;
  spO2: number;
  temperature: number;
}

const BASELINES: Record<string, VitalBaseline> = {
  'PP-001': { heartRate: 88, respiratoryRate: 18, systolicBP: 130, diastolicBP: 78, spO2: 95, temperature: 37.8 },
  'PP-002': { heartRate: 76, respiratoryRate: 14, systolicBP: 118, diastolicBP: 72, spO2: 98, temperature: 36.8 },
  'PP-003': { heartRate: 92, respiratoryRate: 22, systolicBP: 140, diastolicBP: 85, spO2: 93, temperature: 38.2 },
  'PP-004': { heartRate: 80, respiratoryRate: 16, systolicBP: 120, diastolicBP: 75, spO2: 97, temperature: 37.0 },
  'PP-005': { heartRate: 85, respiratoryRate: 20, systolicBP: 135, diastolicBP: 80, spO2: 92, temperature: 37.2 },
  'PP-006': { heartRate: 100, respiratoryRate: 24, systolicBP: 110, diastolicBP: 65, spO2: 96, temperature: 37.5 },
  'PP-007': { heartRate: 78, respiratoryRate: 16, systolicBP: 145, diastolicBP: 90, spO2: 96, temperature: 37.1 },
  'PP-008': { heartRate: 90, respiratoryRate: 18, systolicBP: 105, diastolicBP: 65, spO2: 95, temperature: 36.9 },
  'PP-009': { heartRate: 82, respiratoryRate: 17, systolicBP: 155, diastolicBP: 92, spO2: 96, temperature: 37.0 },
  'PP-010': { heartRate: 72, respiratoryRate: 14, systolicBP: 115, diastolicBP: 70, spO2: 98, temperature: 36.7 },
  'PP-011': { heartRate: 95, respiratoryRate: 20, systolicBP: 100, diastolicBP: 62, spO2: 93, temperature: 37.3 },
  'PP-012': { heartRate: 88, respiratoryRate: 19, systolicBP: 108, diastolicBP: 68, spO2: 94, temperature: 37.6 },
  'PP-013': { heartRate: 110, respiratoryRate: 26, systolicBP: 95, diastolicBP: 55, spO2: 94, temperature: 36.2 },
  'PP-014': { heartRate: 105, respiratoryRate: 28, systolicBP: 100, diastolicBP: 60, spO2: 90, temperature: 37.4 },
  'PP-015': { heartRate: 82, respiratoryRate: 16, systolicBP: 125, diastolicBP: 75, spO2: 97, temperature: 37.0 },
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function addNoise(value: number, stdDev: number, rng: () => number): number {
  // Box-Muller transform for normal distribution
  const u1 = rng();
  const u2 = rng();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return value + normal * stdDev;
}

function applyScenario(
  baseline: VitalBaseline,
  scenario: ScenarioType,
  progress: number, // 0-1 how far through the 48-hour window
  rng: () => number
): Partial<VitalBaseline> {
  const vitals = { ...baseline };

  switch (scenario) {
    case 'stable':
      vitals.heartRate = addNoise(baseline.heartRate, 3, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate, 1.5, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP, 5, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP, 3, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2, 0.8, rng));
      vitals.temperature = addNoise(baseline.temperature, 0.2, rng);
      break;

    case 'gradual_deterioration':
      vitals.heartRate = addNoise(baseline.heartRate + progress * 30, 4, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate + progress * 10, 2, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP - progress * 25, 6, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP - progress * 15, 4, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2 - progress * 8, 1.2, rng));
      vitals.temperature = addNoise(baseline.temperature + progress * 1.5, 0.3, rng);
      break;

    case 'improving':
      vitals.heartRate = addNoise(baseline.heartRate - progress * 15, 3, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate - progress * 5, 1.5, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP + progress * 10, 5, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP + progress * 5, 3, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2 + progress * 3, 0.8, rng));
      vitals.temperature = addNoise(baseline.temperature - progress * 0.8, 0.2, rng);
      break;

    case 'noisy_stable':
      vitals.heartRate = addNoise(baseline.heartRate, 8, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate, 3, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP, 12, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP, 8, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2, 2, rng));
      vitals.temperature = addNoise(baseline.temperature, 0.5, rng);
      break;

    case 'sudden_spike': {
      const spikeStart = 0.6;
      const spikeEnd = 0.8;
      const inSpike = progress >= spikeStart && progress <= spikeEnd;
      const spikeIntensity = inSpike ? Math.sin(((progress - spikeStart) / (spikeEnd - spikeStart)) * Math.PI) : 0;
      vitals.heartRate = addNoise(baseline.heartRate + spikeIntensity * 40, 4, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate + spikeIntensity * 12, 2, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP - spikeIntensity * 30, 6, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP - spikeIntensity * 18, 4, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2 - spikeIntensity * 10, 1.5, rng));
      vitals.temperature = addNoise(baseline.temperature + spikeIntensity * 2, 0.3, rng);
      break;
    }

    case 'intermittent_issues': {
      const episodic = Math.sin(progress * Math.PI * 4) > 0.5;
      const bump = episodic ? 1 : 0;
      vitals.heartRate = addNoise(baseline.heartRate + bump * 20, 5, rng);
      vitals.respiratoryRate = addNoise(baseline.respiratoryRate + bump * 6, 2, rng);
      vitals.systolicBP = addNoise(baseline.systolicBP - bump * 15, 5, rng);
      vitals.diastolicBP = addNoise(baseline.diastolicBP - bump * 8, 3, rng);
      vitals.spO2 = Math.min(100, addNoise(baseline.spO2 - bump * 4, 1, rng));
      vitals.temperature = addNoise(baseline.temperature + bump * 0.8, 0.2, rng);
      break;
    }
  }

  // Clamp to physiological ranges
  vitals.heartRate = Math.max(40, Math.min(180, Math.round(vitals.heartRate)));
  vitals.respiratoryRate = Math.max(6, Math.min(45, Math.round(vitals.respiratoryRate)));
  vitals.systolicBP = Math.max(60, Math.min(220, Math.round(vitals.systolicBP)));
  vitals.diastolicBP = Math.max(30, Math.min(130, Math.round(vitals.diastolicBP)));
  vitals.spO2 = Math.max(70, Math.min(100, Math.round(vitals.spO2)));
  vitals.temperature = Math.max(34, Math.min(42, Math.round(vitals.temperature * 10) / 10));

  return vitals;
}

export function generateDemoVitals(): VitalSign[] {
  const vitals: VitalSign[] = [];
  const now = new Date('2026-10-18T20:00:00');
  const hoursBack = 48;

  for (const patient of DEMO_PATIENTS) {
    const rng = seededRandom(patient.id.charCodeAt(3) * 1000 + patient.id.charCodeAt(4));
    const scenario = PATIENT_SCENARIOS[patient.id];
    const baseline = BASELINES[patient.id];

    // Generate observations at irregular intervals (15-90 min)
    let currentTime = new Date(now.getTime() - hoursBack * 3600 * 1000);
    let obsIndex = 0;

    while (currentTime < now) {
      // Irregular sampling: 15-90 min intervals
      const intervalMinutes = 15 + rng() * 75;
      currentTime = new Date(currentTime.getTime() + intervalMinutes * 60 * 1000);
      if (currentTime > now) break;

      const progress = (currentTime.getTime() - (now.getTime() - hoursBack * 3600 * 1000)) / (hoursBack * 3600 * 1000);

      const applied = applyScenario(baseline, scenario, progress, rng);

      // Introduce missing values (~5% chance per field)
      const missingSeed = rng();

      vitals.push({
        patientId: patient.id,
        timestamp: currentTime.toISOString(),
        heartRate: missingSeed < 0.03 && obsIndex > 2 ? null : (applied.heartRate ?? null),
        respiratoryRate: rng() < 0.04 && obsIndex > 2 ? null : (applied.respiratoryRate ?? null),
        systolicBP: rng() < 0.05 && obsIndex > 2 ? null : (applied.systolicBP ?? null),
        diastolicBP: rng() < 0.05 && obsIndex > 2 ? null : (applied.diastolicBP ?? null),
        spO2: rng() < 0.03 && obsIndex > 2 ? null : (applied.spO2 ?? null),
        temperature: rng() < 0.06 && obsIndex > 2 ? null : (applied.temperature ?? null),
      });

      obsIndex++;
    }
  }

  return vitals.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function generateDemoAlerts(vitals: VitalSign[], assessments: RiskAssessment[]): Alert[] {
  const alerts: Alert[] = [];
  const seenKeys = new Set<string>();

  for (const assessment of assessments) {
    if (assessment.riskCategory === 'Low') continue;
    // Only generate alert if not already generated for same patient+hour
    const hourKey = `${assessment.patientId}-${assessment.timestamp.slice(0, 13)}`;
    if (seenKeys.has(hourKey)) continue;
    seenKeys.add(hourKey);

    const patient = DEMO_PATIENTS.find(p => p.id === assessment.patientId);
    if (!patient) continue;

    const latestVital = vitals
      .filter(v => v.patientId === assessment.patientId && v.timestamp <= assessment.timestamp)
      .pop();

    const trends: string[] = [];
    if (latestVital) {
      if (latestVital.heartRate && latestVital.heartRate > 110) trends.push('Elevated heart rate');
      if (latestVital.respiratoryRate && latestVital.respiratoryRate > 25) trends.push('Elevated respiratory rate');
      if (latestVital.spO2 !== null && latestVital.spO2 < 92) trends.push('Low oxygen saturation');
      if (latestVital.systolicBP && latestVital.systolicBP < 90) trends.push('Hypotension');
      if (latestVital.temperature && latestVital.temperature > 38.5) trends.push('Fever');
    }

    if (trends.length === 0) {
      if (assessment.riskCategory === 'Critical') trends.push('Multiple parameters trending toward critical ranges');
      else trends.push('Gradual trend change detected');
    }

    const severity = assessment.riskCategory;
    const reasons: Record<string, string> = {
      Critical: 'Immediate attention required — multiple vital signs in critical range',
      High: 'Significant deterioration trend detected across vital parameters',
      Moderate: 'Early warning — one or more parameters trending outside normal range',
      Low: 'Minor fluctuation detected',
    };

    // Only generate a fraction of possible alerts to avoid flooding
    if (assessment.riskCategory === 'Moderate' && Math.random() > 0.3) continue;

    const alertId = `ALT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    alerts.push({
      id: alertId,
      patientId: assessment.patientId,
      patientName: patient.name,
      timestamp: assessment.timestamp,
      severity,
      riskScore: assessment.riskScore,
      reason: reasons[severity],
      details: `${assessment.contributingFactors.map(f => f.description).join('. ')}.`,
      trends,
      status: 'active',
    });
  }

  // Keep only recent meaningful alerts (last 24 hours, max ~30)
  const now = new Date('2026-10-18T20:00:00');
  const cutoff = new Date(now.getTime() - 24 * 3600 * 1000);
  return alerts
    .filter(a => new Date(a.timestamp) > cutoff)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);
}

export function getDemoPatients(): Patient[] {
  return [...DEMO_PATIENTS];
}

export function getPatientById(id: string): Patient | undefined {
  return DEMO_PATIENTS.find(p => p.id === id);
}
