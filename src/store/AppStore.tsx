// PulsePredict App Store
// Central state management using React context

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type {
  Patient, VitalSign, Alert, RiskAssessment, AppSettings,
  UploadedDataset, PatientMonitorRow
} from '../types';
import { getDemoPatients, generateDemoVitals, generateDemoAlerts } from '../data/demoData';
import { computeAllRiskAssessments } from '../services/predictionService';

interface AppState {
  patients: Patient[];
  vitals: VitalSign[];
  alerts: Alert[];
  assessments: RiskAssessment[];
  monitorRows: PatientMonitorRow[];
  settings: AppSettings;
  uploadedDataset: UploadedDataset | null;
  isDemo: boolean;
  isLoading: boolean;
}

interface AppActions {
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  setUploadedDataset: (ds: UploadedDataset | null) => void;
  refreshPredictions: () => void;
}

const defaultSettings: AppSettings = {
  criticalThreshold: 80,
  highThreshold: 60,
  moderateThreshold: 35,
  alertCooldownMinutes: 60,
  refreshIntervalSeconds: 30,
  enableNotifications: true,
  enableSoundAlerts: false,
  darkMode: false,
  missingValueRule: 'skip',
  zeroAsMissing: false,
};

const AppContext = createContext<(AppState & AppActions) | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [uploadedDataset, setUploadedDataset] = useState<UploadedDataset | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUploadedDataset = useCallback((dataset: UploadedDataset | null) => {
    setUploadedDataset(dataset);
    if (!dataset) {
      const demoPatients = getDemoPatients();
      const demoVitals = generateDemoVitals();
      const nextAssessments = computeAllRiskAssessments(demoPatients.map(p => p.id), demoVitals, settings);
      setPatients(demoPatients);
      setVitals(demoVitals);
      setAssessments(nextAssessments);
      setAlerts(generateDemoAlerts(demoVitals, nextAssessments));
      return;
    }

    const { mapping, data } = dataset;
    const patientMap = new Map<string, Patient>();
    const readValue = (row: Record<string, string>, column: string): number | null => {
      if (!column) return null;
      const value = row[column]?.trim();
      if (!value) return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const parsedVitals: VitalSign[] = data.flatMap(row => {
      const id = row[mapping.patientId]?.trim();
      const timestamp = row[mapping.timestamp]?.trim();
      if (!id || !timestamp || Number.isNaN(new Date(timestamp).getTime())) return [];
      if (!patientMap.has(id)) patientMap.set(id, {
        id, name: `Patient ${id}`, age: 0, gender: 'M', admissionDate: timestamp,
        bed: 'Unassigned', ward: 'Imported dataset', diagnosis: 'Imported observation data',
      });
      return [{
        patientId: id,
        timestamp: new Date(timestamp).toISOString(),
        heartRate: readValue(row, mapping.heartRate),
        respiratoryRate: readValue(row, mapping.respiratoryRate),
        systolicBP: readValue(row, mapping.systolicBP),
        diastolicBP: readValue(row, mapping.diastolicBP),
        spO2: readValue(row, mapping.spO2),
        temperature: readValue(row, mapping.temperature),
      }];
    }).sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    const importedPatients = [...patientMap.values()];
    const nextAssessments = computeAllRiskAssessments(importedPatients.map(p => p.id), parsedVitals, settings);
    const nextAlerts: Alert[] = nextAssessments.filter(a => a.riskCategory !== 'Low').map(a => ({
      id: `DEMO-${a.patientId}-${a.timestamp}`,
      patientId: a.patientId,
      patientName: patientMap.get(a.patientId)?.name ?? a.patientId,
      timestamp: a.timestamp,
      severity: a.riskCategory,
      riskScore: a.riskScore,
      reason: 'Demonstration threshold reached in imported observations',
      details: a.contributingFactors.map(f => f.description).join('. ') || 'Rule-based demonstration score; not clinically validated.',
      trends: a.contributingFactors.map(f => f.parameter),
      status: 'active',
    }));
    setPatients(importedPatients);
    setVitals(parsedVitals);
    setAssessments(nextAssessments);
    setAlerts(nextAlerts);
  }, [settings]);

  // Initialize with demo data
  useEffect(() => {
    setIsLoading(true);
    const demoPatients = getDemoPatients();
    const demoVitals = generateDemoVitals();
    const demoAssessments = computeAllRiskAssessments(
      demoPatients.map(p => p.id),
      demoVitals
    );
    const demoAlerts = generateDemoAlerts(demoVitals, demoAssessments);

    setPatients(demoPatients);
    setVitals(demoVitals);
    setAssessments(demoAssessments);
    setAlerts(demoAlerts);
    setIsLoading(false);
  }, []);

  const refreshPredictions = useCallback(() => {
    if (patients.length === 0) return;
    const newAssessments = computeAllRiskAssessments(
      patients.map(p => p.id),
      vitals,
      {
        criticalThreshold: settings.criticalThreshold,
        highThreshold: settings.highThreshold,
        moderateThreshold: settings.moderateThreshold,
      }
    );
    setAssessments(newAssessments);
  }, [patients, vitals, settings.criticalThreshold, settings.highThreshold, settings.moderateThreshold]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId
        ? { ...a, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() }
        : a
    ));
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId
        ? { ...a, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
        : a
    ));
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  // Build monitor rows
  const monitorRows: PatientMonitorRow[] = patients.map(patient => {
    const patientVitals = vitals
      .filter(v => v.patientId === patient.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const latestVitals = patientVitals[patientVitals.length - 1] || {
      patientId: patient.id,
      timestamp: '',
      heartRate: null,
      respiratoryRate: null,
      systolicBP: null,
      diastolicBP: null,
      spO2: null,
      temperature: null,
    };

    const riskAssessment = assessments.find(a => a.patientId === patient.id) || {
      patientId: patient.id,
      timestamp: '',
      riskScore: 0,
      riskCategory: 'Low' as const,
      trend: 'stable' as const,
      contributingFactors: [],
      isDemoScore: true,
    };

    const patientAlerts = alerts.filter(a => a.patientId === patient.id && a.status !== 'resolved');
    const activeAlertCount = patientAlerts.filter(a => a.status === 'active').length;
    const alertStatus = activeAlertCount > 0 ? 'active' as const
      : patientAlerts.length > 0 ? 'acknowledged' as const
      : 'none' as const;

    return { patient, latestVitals, riskAssessment, alertStatus, activeAlertCount };
  });

  const isDemo = uploadedDataset === null;

  return (
    <AppContext.Provider value={{
      patients, vitals, alerts, assessments, monitorRows, settings,
      uploadedDataset, isDemo, isLoading,
      acknowledgeAlert, resolveAlert, updateSettings,
      setUploadedDataset: applyUploadedDataset, refreshPredictions,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
