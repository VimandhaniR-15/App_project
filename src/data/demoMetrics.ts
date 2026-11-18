// PulsePredict Illustrative Model Metrics
// These are DEMO values to show what a model performance page looks like.
// Replace with actual evaluation results after model training.

import type { ModelMetrics } from '../types';

export function getDemoModelMetrics(): ModelMetrics {
  // Generate illustrative ROC curve points
  const rocCurve: { fpr: number; tpr: number }[] = [
    { fpr: 0, tpr: 0 },
    { fpr: 0.01, tpr: 0.15 },
    { fpr: 0.02, tpr: 0.30 },
    { fpr: 0.05, tpr: 0.52 },
    { fpr: 0.08, tpr: 0.65 },
    { fpr: 0.10, tpr: 0.72 },
    { fpr: 0.15, tpr: 0.80 },
    { fpr: 0.20, tpr: 0.85 },
    { fpr: 0.25, tpr: 0.88 },
    { fpr: 0.30, tpr: 0.90 },
    { fpr: 0.40, tpr: 0.93 },
    { fpr: 0.50, tpr: 0.95 },
    { fpr: 0.60, tpr: 0.96 },
    { fpr: 0.70, tpr: 0.97 },
    { fpr: 0.80, tpr: 0.98 },
    { fpr: 0.90, tpr: 0.99 },
    { fpr: 1.0, tpr: 1.0 },
  ];

  // Generate illustrative Precision-Recall curve
  const prCurve: { recall: number; precision: number }[] = [
    { recall: 0, precision: 1.0 },
    { recall: 0.10, precision: 0.95 },
    { recall: 0.20, precision: 0.92 },
    { recall: 0.30, precision: 0.88 },
    { recall: 0.40, precision: 0.84 },
    { recall: 0.50, precision: 0.78 },
    { recall: 0.60, precision: 0.72 },
    { recall: 0.70, precision: 0.64 },
    { recall: 0.75, precision: 0.58 },
    { recall: 0.80, precision: 0.50 },
    { recall: 0.85, precision: 0.42 },
    { recall: 0.90, precision: 0.33 },
    { recall: 0.95, precision: 0.22 },
    { recall: 1.0, precision: 0.12 },
  ];

  const thresholds = [
    { threshold: 0.3, precision: 0.42, recall: 0.92, f1: 0.577 },
    { threshold: 0.4, precision: 0.55, recall: 0.85, f1: 0.668 },
    { threshold: 0.5, precision: 0.68, recall: 0.78, f1: 0.727 },
    { threshold: 0.6, precision: 0.78, recall: 0.68, f1: 0.727 },
    { threshold: 0.7, precision: 0.85, recall: 0.55, f1: 0.668 },
    { threshold: 0.8, precision: 0.92, recall: 0.40, f1: 0.557 },
    { threshold: 0.9, precision: 0.96, recall: 0.22, f1: 0.358 },
  ];

  return {
    auroc: 0.874,
    auprc: 0.621,
    precision: 0.68,
    recall: 0.78,
    specificity: 0.88,
    falseAlarmRate: 0.15,
    leadTimeMinutes: 185,
    confusionMatrix: { tp: 156, fp: 73, fn: 44, tn: 527 },
    rocCurve,
    prCurve,
    thresholds,
  };
}
