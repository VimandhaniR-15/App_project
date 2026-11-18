// PulsePredict Types
// AI-Powered ICU Early Warning System

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  admissionDate: string;
  bed: string;
  ward: string;
  diagnosis: string;
}

export interface VitalSign {
  patientId: string;
  timestamp: string;
  heartRate: number | null;
  respiratoryRate: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  spO2: number | null;
  temperature: number | null;
}

export interface RiskAssessment {
  patientId: string;
  timestamp: string;
  riskScore: number; // 0-100
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Critical';
  trend: 'rising' | 'stable' | 'falling';
  contributingFactors: ContributingFactor[];
  isDemoScore: boolean;
}

export interface ContributingFactor {
  parameter: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  value?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  riskScore: number;
  reason: string;
  details: string;
  trends: string[];
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface PatientMonitorRow {
  patient: Patient;
  latestVitals: VitalSign;
  riskAssessment: RiskAssessment;
  alertStatus: 'none' | 'active' | 'acknowledged';
  activeAlertCount: number;
}

export interface DataQualityReport {
  totalRecords: number;
  totalPatients: number;
  timeRange: { start: string; end: string };
  missingValues: Record<string, { count: number; percentage: number }>;
  duplicateTimestamps: number;
  irregularSampling: { mean: number; std: number; min: number; max: number };
  invalidMeasurements: { field: string; count: number; details: string }[];
  overallScore: number;
}

export interface ModelMetrics {
  auroc: number;
  auprc: number;
  precision: number;
  recall: number;
  specificity: number;
  falseAlarmRate: number;
  leadTimeMinutes: number;
  confusionMatrix: { tp: number; fp: number; fn: number; tn: number };
  rocCurve: { fpr: number; tpr: number }[];
  prCurve: { recall: number; precision: number }[];
  thresholds: { threshold: number; precision: number; recall: number; f1: number }[];
}

export interface AppSettings {
  criticalThreshold: number;
  highThreshold: number;
  moderateThreshold: number;
  alertCooldownMinutes: number;
  refreshIntervalSeconds: number;
  enableNotifications: boolean;
  enableSoundAlerts: boolean;
  darkMode: boolean;
  missingValueRule: 'skip' | 'lastKnown' | 'mean';
  zeroAsMissing: boolean;
}

export interface UploadedDataset {
  fileName: string;
  data: Record<string, string>[];
  columns: string[];
  mapping: ColumnMapping;
  qualityReport: DataQualityReport | null;
}

export interface ColumnMapping {
  patientId: string;
  timestamp: string;
  heartRate: string;
  respiratoryRate: string;
  systolicBP: string;
  diastolicBP: string;
  spO2: string;
  temperature: string;
  outcome: string;
}
