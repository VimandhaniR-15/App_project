package org.pulsepredict.service;

import org.pulsepredict.config.ReviewRuleProperties;
import org.pulsepredict.model.DashboardSummary;
import org.pulsepredict.model.Observation;
import org.pulsepredict.model.PatientSummary;
import org.pulsepredict.model.ReviewResult;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class PatientDataService {
    private final ReviewRuleProperties rules;
    private final List<Observation> observations = new CopyOnWriteArrayList<>();
    private volatile boolean uploaded;

    public PatientDataService(ReviewRuleProperties rules) {
        this.rules = rules;
        loadDemoData();
    }

    public List<PatientSummary> getPatients() {
        return groupedObservations().entrySet().stream()
                .map(entry -> {
                    List<Observation> patientObservations = entry.getValue();
                    Observation latest = patientObservations.get(patientObservations.size() - 1);
                    return new PatientSummary(entry.getKey(), latest,
                            evaluate(latest, patientObservations), patientObservations.size());
                })
                .sorted(Comparator.comparing(summary -> summary.patientId().toLowerCase()))
                .toList();
    }

    public DashboardSummary getDashboardSummary() {
        List<PatientSummary> patients = getPatients();
        int flagged = (int) patients.stream().filter(patient -> "REVIEW".equals(patient.review().status())).count();
        Optional<Instant> latest = patients.stream().map(PatientSummary::latestObservation)
                .map(Observation::timestamp).max(Comparator.naturalOrder());
        return new DashboardSummary(patients.size(), flagged, latest.orElse(null), patients);
    }

    public List<Map<String, Object>> getObservationsWithReview(String patientId) {
        List<Observation> timeline = groupedObservations().get(patientId);
        if (timeline == null) return null;
        return timeline.stream().map(observation -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("patientId", observation.patientId());
            row.put("timestamp", observation.timestamp());
            row.put("heartRate", observation.heartRate());
            row.put("respiratoryRate", observation.respiratoryRate());
            row.put("spo2", observation.spo2());
            row.put("review", evaluate(observation, timeline));
            return row;
        }).toList();
    }

    public synchronized void replaceObservations(List<Observation> imported) {
        observations.clear();
        observations.addAll(imported);
        uploaded = true;
    }

    public boolean hasUploadedData() { return uploaded; }
    public ReviewRuleProperties getRules() { return rules; }

    private ReviewResult evaluate(Observation current, List<Observation> timeline) {
        List<String> reasons = new ArrayList<>();
        if (current.heartRate() != null) {
            if (current.heartRate() > rules.getHeartRateHigh()) {
                reasons.add(String.format("Heart rate %.0f bpm is above the demo threshold of %.0f bpm.", current.heartRate(), rules.getHeartRateHigh()));
            } else if (current.heartRate() < rules.getHeartRateLow()) {
                reasons.add(String.format("Heart rate %.0f bpm is below the demo threshold of %.0f bpm.", current.heartRate(), rules.getHeartRateLow()));
            }
        }
        if (current.respiratoryRate() != null && current.respiratoryRate() > rules.getRespiratoryRateHigh()) {
            reasons.add(String.format("Respiratory rate %.0f /min is above the demo threshold of %.0f /min.", current.respiratoryRate(), rules.getRespiratoryRateHigh()));
        }
        if (current.spo2() != null && current.spo2() < rules.getSpo2Low()) {
            reasons.add(String.format("SpO₂ %.0f%% is below the demo threshold of %.0f%%.", current.spo2(), rules.getSpo2Low()));
        }
        if (current.heartRate() != null) {
            long windowSeconds = Math.max(0, rules.getTrendWindowHours()) * 3600;
            timeline.stream()
                    .filter(previous -> previous.timestamp().isBefore(current.timestamp()))
                    .filter(previous -> previous.heartRate() != null)
                    .filter(previous -> Duration.between(previous.timestamp(), current.timestamp()).getSeconds() <= windowSeconds)
                    .max(Comparator.comparing(Observation::timestamp))
                    .ifPresent(previous -> {
                        double change = current.heartRate() - previous.heartRate();
                        if (Math.abs(change) >= rules.getHeartRateChange()) {
                            reasons.add(String.format("Heart rate changed by %+.0f bpm over %d minutes (demo threshold: %.0f bpm within %d hours).",
                                    change, Duration.between(previous.timestamp(), current.timestamp()).toMinutes(),
                                    rules.getHeartRateChange(), rules.getTrendWindowHours()));
                        }
                    });
        }
        return new ReviewResult(reasons.isEmpty() ? "ROUTINE" : "REVIEW", List.copyOf(reasons));
    }

    private Map<String, List<Observation>> groupedObservations() {
        Map<String, List<Observation>> grouped = new LinkedHashMap<>();
        observations.stream().sorted(Comparator.comparing(Observation::timestamp))
                .forEach(observation -> grouped.computeIfAbsent(observation.patientId(), ignored -> new ArrayList<>()).add(observation));
        return grouped;
    }

    private void loadDemoData() {
        Instant now = Instant.now().minusSeconds(3 * 60L);
        String[] ids = {"ICU-101", "ICU-102", "ICU-103", "ICU-104", "ICU-105", "ICU-106"};
        for (int patient = 0; patient < ids.length; patient++) {
            Instant timestamp = now.minus(Duration.ofHours(34));
            for (int index = 0; index < 15; index++) {
                double wave = Math.sin(index * 0.78 + patient) * 5;
                double heartRate = switch (patient) {
                    case 1 -> 88 + index * 2.8 + wave;
                    case 3 -> 105 - index * 1.5 + wave;
                    case 4 -> 75 + (index % 5 == 0 ? 31 : 0) + wave;
                    default -> 77 + patient * 2 + wave;
                };
                double respiratoryRate = 16 + patient % 3 + Math.sin(index * .5) * 2;
                double spo2 = 96 - patient % 2 + Math.sin(index * .42) * 1.2;
                if (patient == 1 && index >= 12) { respiratoryRate += 5; spo2 -= 3; }
                if (patient == 4 && index == 13) spo2 = 89;
                long gapMinutes = 105 + Math.floorMod(patient * 19 + index * 31, 41);
                timestamp = timestamp.plus(Duration.ofMinutes(gapMinutes));
                Double hrValue = (patient == 5 && index % 6 == 2) ? null : round(heartRate);
                Double rrValue = (patient == 2 && index % 5 == 1) ? null : round(respiratoryRate);
                Double spo2Value = (patient == 5 && index % 4 == 0) ? null : round(spo2);
                observations.add(new Observation(ids[patient], timestamp, hrValue, rrValue, spo2Value));
            }
        }
    }

    private static double round(double value) { return Math.round(value * 10.0) / 10.0; }
}
