import { Activity, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDemoModelMetrics } from '../data/demoMetrics';

const metrics = getDemoModelMetrics();
const metricCards = [
  ['AUROC', metrics.auroc.toFixed(3), 'Discrimination'],
  ['AUPRC', metrics.auprc.toFixed(3), 'Precision / recall'],
  ['Precision', `${Math.round(metrics.precision * 100)}%`, 'Illustrative'],
  ['Sensitivity', `${Math.round(metrics.recall * 100)}%`, 'Illustrative'],
  ['Specificity', `${Math.round(metrics.specificity * 100)}%`, 'Illustrative'],
  ['False alarms', `${metrics.falseAlarmRate.toFixed(2)}`, 'per patient-day'],
];

export default function PerformancePage() {
  const matrix = metrics.confusionMatrix;
  return (
    <main className="page-container animate-in">
      <div className="notice-banner notice-info"><Activity size={18} /><div><strong>Illustrative evaluation only</strong><span>These values are placeholders for interface demonstration and are not results from a trained or validated model.</span></div></div>
      <section className="stat-cards-grid analytics-metrics">
        {metricCards.map(([label, value, hint]) => <article className="metric-card" key={label}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>)}
      </section>
      <div className="grid-2 analytics-charts">
        <section className="card"><div className="card-header"><div><h3>ROC curve</h3><p>Area under curve · illustrative</p></div><span className="chart-chip">AUROC {metrics.auroc.toFixed(3)}</span></div><div className="card-body chart-container"><ResponsiveContainer width="100%" height="100%"><LineChart data={metrics.rocCurve}><CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" /><XAxis dataKey="fpr" type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} /><YAxis dataKey="tpr" type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} /><Tooltip formatter={(value) => `${Math.round(Number(value) * 100)}%`} /><Line dataKey="tpr" name="Sensitivity" type="monotone" stroke="#159c9a" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></section>
        <section className="card"><div className="card-header"><div><h3>Precision–recall curve</h3><p>Illustrative threshold performance</p></div><span className="chart-chip">AUPRC {metrics.auprc.toFixed(3)}</span></div><div className="card-body chart-container"><ResponsiveContainer width="100%" height="100%"><LineChart data={metrics.prCurve}><CartesianGrid strokeDasharray="3 3" stroke="#e5edf2" /><XAxis dataKey="recall" type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} /><YAxis dataKey="precision" type="number" domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} /><Tooltip formatter={(value) => `${Math.round(Number(value) * 100)}%`} /><Line dataKey="precision" name="Precision" type="monotone" stroke="#4f7ee8" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></section>
      </div>
      <div className="grid-2">
        <section className="card"><div className="card-header"><div><h3>Illustrative confusion matrix</h3><p>At a demonstration threshold</p></div></div><div className="card-body"><div className="confusion-matrix"><span></span><span>Predicted event</span><span>Predicted no event</span><strong>Observed event</strong><b className="matrix-tp">{matrix.tp}<small>True positive</small></b><b className="matrix-fn">{matrix.fn}<small>False negative</small></b><strong>Observed no event</strong><b className="matrix-fp">{matrix.fp}<small>False positive</small></b><b className="matrix-tn">{matrix.tn}<small>True negative</small></b></div></div></section>
        <section className="card"><div className="card-header"><div><h3>Threshold trade-offs</h3><p>Illustrative precision, recall, and F1</p></div></div><div className="card-body table-container"><table className="data-table"><thead><tr><th>Threshold</th><th>Precision</th><th>Recall</th><th>F1</th></tr></thead><tbody>{metrics.thresholds.map(row => <tr key={row.threshold}><td>{Math.round(row.threshold * 100)}%</td><td>{Math.round(row.precision * 100)}%</td><td>{Math.round(row.recall * 100)}%</td><td>{Math.round(row.f1 * 100)}%</td></tr>)}</tbody></table></div></section>
      </div>
      <section className="card split-guidance"><div className="card-header"><div><h3><ShieldCheck size={17} /> Evaluation and leakage controls</h3><p>Required before any clinical interpretation</p></div><ArrowUpRight size={18} /></div><div className="card-body guidance-grid"><div><strong>Patient-level split</strong><p>Assign each patient to exactly one of train, validation, or test. Keep all of a patient's admissions and observations together.</p></div><div><strong>Temporal integrity</strong><p>Construct each prediction only from observations available at that timestamp. Outcomes and future measurements must not enter features.</p></div><div><strong>Clinical validation</strong><p>Report calibration, subgroup performance, alert burden, and prospective safety results before considering deployment.</p></div></div></section>
    </main>
  );
}