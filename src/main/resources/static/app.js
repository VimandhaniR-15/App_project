const state = { patients: [], selectedId: '', query: '' };
const $ = (selector) => document.querySelector(selector);
const number = (value, digits = 0) => value == null || !Number.isFinite(value) ? '—' : Number(value).toFixed(digits);
const dateTime = (value) => value ? new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

async function request(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Request failed (${response.status})`);
  return payload;
}

async function loadDashboard() {
  try {
    const [overview, rules] = await Promise.all([request('/api/patients'), request('/api/rules')]);
    state.patients = overview.patients || [];
    if (!state.patients.some((patient) => patient.patientId === state.selectedId)) state.selectedId = state.patients[0]?.patientId || '';
    $('#summary-patients').textContent = overview.patientCount ?? state.patients.length;
    $('#summary-flags').textContent = overview.reviewCount ?? '0';
    $('#summary-updated').textContent = overview.latestObservation ? new Date(overview.latestObservation).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
    $('#patient-count').textContent = state.patients.length;
    renderRules(rules);
    renderPatients();
    renderPatientSelect();
    if (state.selectedId) await loadTrends(state.selectedId);
    else $('#trend-chart').innerHTML = '<div class="chart-empty">No observations are available yet.</div>';
  } catch (error) {
    $('#patient-table').innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(error.message)}. Refresh to try again.</td></tr>`;
  }
}

function renderPatients() {
  const filtered = state.patients.filter((patient) => patient.patientId.toLowerCase().includes(state.query.toLowerCase()));
  const table = $('#patient-table');
  if (!filtered.length) {
    table.innerHTML = `<tr><td colspan="6" class="empty-state">${state.patients.length ? 'No patient IDs match your search.' : 'No patient observations found.'}</td></tr>`;
  } else {
    table.innerHTML = filtered.map((patient) => {
      const observation = patient.latestObservation;
      const hasData = observation && (observation.heartRate != null || observation.respiratoryRate != null || observation.spo2 != null);
      const status = patient.review?.status || 'ROUTINE';
      const isReview = status === 'REVIEW';
      return `<tr class="patient-row ${patient.patientId === state.selectedId ? 'selected' : ''}" data-patient="${escapeHtml(patient.patientId)}" tabindex="0" aria-label="View ${escapeHtml(patient.patientId)} trends">
        <td><div class="patient-id"><span class="patient-avatar">${escapeHtml(patient.patientId.slice(0, 2).toUpperCase())}</span>${escapeHtml(patient.patientId)}</div></td>
        <td class="time-value">${dateTime(observation?.timestamp)}</td>
        <td class="vital-value ${hasData && observation.heartRate != null && (observation.heartRate < 45 || observation.heartRate > 120) ? 'alert' : ''}">${number(observation?.heartRate)}</td>
        <td class="vital-value ${hasData && observation.respiratoryRate > 24 ? 'warn' : ''}">${number(observation?.respiratoryRate)}</td>
        <td class="vital-value ${hasData && observation.spo2 < 92 ? 'alert' : ''}">${number(observation?.spo2)}</td>
        <td><span class="status-pill ${isReview ? 'status-review' : hasData ? 'status-routine' : 'status-empty'}">${isReview ? 'Review' : hasData ? 'Routine' : 'No values'}</span></td>
      </tr>`;
    }).join('');
  }
  $('#table-caption').textContent = `Showing ${filtered.length} of ${state.patients.length} patients`;
  table.querySelectorAll('.patient-row').forEach((row) => {
    const select = () => selectPatient(row.dataset.patient);
    row.addEventListener('click', select);
    row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
  });
}

function renderPatientSelect() {
  const select = $('#patient-select');
  select.innerHTML = '<option value="">Select patient</option>' + state.patients.map((patient) => `<option value="${escapeHtml(patient.patientId)}" ${patient.patientId === state.selectedId ? 'selected' : ''}>${escapeHtml(patient.patientId)}</option>`).join('');
}

async function selectPatient(patientId) {
  state.selectedId = patientId;
  renderPatients();
  renderPatientSelect();
  await loadTrends(patientId);
  if (window.innerWidth < 760) $('#trends').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadTrends(patientId) {
  try {
    const result = await request(`/api/patients/${encodeURIComponent(patientId)}/observations`);
    $('#trend-caption').textContent = `${result.observations.length} chronological observations · ${patientId}`;
    $('#trend-range').textContent = result.observations.length ? `${dateTime(result.observations[0].timestamp)} – ${dateTime(result.observations.at(-1).timestamp)}` : 'No observations';
    drawTrends(result.observations);
  } catch (error) {
    $('#trend-chart').innerHTML = `<div class="chart-empty">${escapeHtml(error.message)}</div>`;
  }
}

function drawTrends(observations) {
  const chart = $('#trend-chart');
  if (!observations.length) { chart.innerHTML = '<div class="chart-empty">No observations available for this patient.</div>'; return; }
  const series = [
    { key: 'heartRate', label: 'HR', color: '#4c80df', cls: 'blue', min: 35, max: 150 },
    { key: 'respiratoryRate', label: 'RR', color: '#8b74d6', cls: 'purple', min: 5, max: 40 },
    { key: 'spo2', label: 'SpO₂', color: '#21aaa0', cls: 'teal', min: 70, max: 100 }
  ];
  const width = 700, height = 47, pad = 4;
  chart.innerHTML = series.map((metric) => {
    const values = observations.map((observation, index) => ({ x: observations.length === 1 ? width / 2 : pad + index * (width - 2 * pad) / (observations.length - 1), value: observation[metric.key] }));
    let chunks = [], segment = [];
    values.forEach((point) => { if (point.value == null || !Number.isFinite(point.value)) { if (segment.length) chunks.push(segment); segment = []; return; } const y = height - pad - Math.max(0, Math.min(1, (point.value - metric.min) / (metric.max - metric.min))) * (height - 2 * pad); segment.push(`${point.x.toFixed(1)},${y.toFixed(1)}`); });
    if (segment.length) chunks.push(segment);
    const lines = chunks.filter((chunk) => chunk.length > 1).map((chunk) => `<polyline points="${chunk.join(' ')}" fill="none" stroke="${metric.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
    const dots = values.filter((point) => point.value != null && Number.isFinite(point.value)).map((point) => { const y = height - pad - Math.max(0, Math.min(1, (point.value - metric.min) / (metric.max - metric.min))) * (height - 2 * pad); return `<circle cx="${point.x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="${metric.color}"><title>${metric.label}: ${number(point.value, 1)}</title></circle>`; }).join('');
    return `<div class="chart-row"><span class="chart-row-label ${metric.cls}">${metric.label}</span><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="${metric.label} chronological trend">${lines}${dots}</svg></div>`;
  }).join('');
}

function renderRules(rules) {
  $('#rule-list').innerHTML = [
    ['marker-blue', 'Heart rate', `Review if < ${number(rules.heartRateLow)} or > ${number(rules.heartRateHigh)} bpm`],
    ['marker-purple', 'Respiratory rate', `Review if > ${number(rules.respiratoryRateHigh)} /min`],
    ['marker-teal', 'Oxygen saturation', `Review if < ${number(rules.spo2Low)}%`],
    ['marker-amber', 'Heart-rate change', `Review if change ≥ ${number(rules.heartRateChange)} bpm within ${number(rules.trendWindowHours)} hours`]
  ].map(([marker, label, text]) => `<div class="rule-item"><span class="rule-marker ${marker}"></span><div><strong>${label}</strong><small>${text}</small></div></div>`).join('');
}

$('#patient-search').addEventListener('input', (event) => { state.query = event.target.value.trim(); renderPatients(); });
$('#patient-select').addEventListener('change', (event) => { if (event.target.value) selectPatient(event.target.value); });
$('#refresh-button').addEventListener('click', loadDashboard);
$('.banner-close').addEventListener('click', () => $('.safety-banner').remove());
$('#upload-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = $('#csv-file').files[0];
  if (!file) return;
  const button = $('#upload-button'), result = $('#upload-result');
  button.disabled = true; button.textContent = 'Inspecting…'; result.className = 'upload-result'; result.textContent = '';
  const formData = new FormData(); formData.append('file', file);
  try {
    const data = await request('/api/upload', { method: 'POST', body: formData });
    const quality = data.quality;
    result.innerHTML = `<strong>Import inspected successfully.</strong> Loaded ${quality.totalRecords} rows for ${quality.totalPatients} patients.${quality.duplicateTimestamps ? ` Found ${quality.duplicateTimestamps} duplicate patient timestamps.` : ''}<div class="quality-grid"><span class="quality-chip">Missing HR: ${quality.missingHeartRate}</span><span class="quality-chip">Missing RR: ${quality.missingRespiratoryRate}</span><span class="quality-chip">Missing SpO₂: ${quality.missingSpo2}</span><span class="quality-chip">Invalid values ignored: ${quality.invalidValues}</span><span class="quality-chip">Missing timestamps defaulted: ${quality.defaultedTimestamps}</span>${quality.irregularSampling ? `<span class="quality-chip">Irregular sampling detected</span>` : '<span class="quality-chip">Sampling intervals broadly consistent</span>'}</div>`;
    await loadDashboard();
    $('#patients').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { result.className = 'upload-result error'; result.textContent = error.message; }
  finally { button.disabled = false; button.innerHTML = 'Upload and inspect <span>→</span>'; }
});

loadDashboard();
