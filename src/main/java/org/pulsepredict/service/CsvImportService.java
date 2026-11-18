package org.pulsepredict.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.pulsepredict.model.ImportQuality;
import org.pulsepredict.model.Observation;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
public class CsvImportService {
    private final PatientDataService patientDataService;

    public CsvImportService(PatientDataService patientDataService) {
        this.patientDataService = patientDataService;
    }

    public ImportQuality importCsv(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("Choose a non-empty CSV file.");
        List<Observation> imported = new ArrayList<>();
        int missingTimestamps = 0, defaultedTimestamps = 0, invalidValues = 0, skippedRows = 0;
        try (CSVParser parser = CSVParser.parse(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8),
                CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).setTrim(true).setIgnoreEmptyLines(true).get())) {
            Map<String, String> headers = new HashMap<>();
            parser.getHeaderMap().keySet().forEach(header -> headers.put(header.trim().toLowerCase(Locale.ROOT), header));
            if (!headers.containsKey("patient_id") || !headers.containsKey("heart_rate")) {
                throw new IllegalArgumentException("CSV must include patient_id and heart_rate columns.");
            }
            Instant fallbackBase = Instant.now();
            List<CSVRecord> rows = parser.getRecords();
            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                CSVRecord row = rows.get(rowIndex);
                String patientId = value(row, headers, "patient_id");
                if (patientId == null || patientId.isBlank()) { skippedRows++; continue; }
                TimestampResult time = parseTimestamp(value(row, headers, "timestamp"));
                if (time.missing()) missingTimestamps++;
                if (time.defaulted()) defaultedTimestamps++;
                NumberResult heartRate = number(value(row, headers, "heart_rate"), 1, 300);
                NumberResult respiratoryRate = number(value(row, headers, "respiratory_rate"), 1, 100);
                NumberResult spo2 = number(value(row, headers, "spo2"), 0, 100);
                invalidValues += heartRate.invalid() + respiratoryRate.invalid() + spo2.invalid();
                Instant timestamp = time.timestamp() == null
                    ? fallbackBase.minusSeconds((long) (rows.size() - 1 - rowIndex) * 60L)
                    : time.timestamp();
                imported.add(new Observation(patientId.trim(), timestamp, heartRate.value(), respiratoryRate.value(), spo2.value()));
            }
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw new IllegalArgumentException("Could not read this CSV. Check that it is valid UTF-8 with a header row.", exception);
        }
        if (imported.isEmpty()) throw new IllegalArgumentException("No usable patient rows were found. Ensure patient_id values are present.");

        imported.sort(java.util.Comparator.comparing(Observation::patientId).thenComparing(Observation::timestamp));
        Set<String> seen = new HashSet<>();
        int duplicates = 0, missingHeartRate = 0, missingRespiratoryRate = 0, missingSpo2 = 0;
        Map<String, List<Instant>> patientTimes = new TreeMap<>();
        for (Observation observation : imported) {
            if (observation.heartRate() == null) missingHeartRate++;
            if (observation.respiratoryRate() == null) missingRespiratoryRate++;
            if (observation.spo2() == null) missingSpo2++;
            if (!seen.add(observation.patientId() + "\u0000" + observation.timestamp())) duplicates++;
            patientTimes.computeIfAbsent(observation.patientId(), ignored -> new ArrayList<>()).add(observation.timestamp());
        }
        boolean irregular = isIrregular(patientTimes);
        patientDataService.replaceObservations(imported);
        return new ImportQuality(imported.size(), patientTimes.size(), missingHeartRate, missingRespiratoryRate,
                missingSpo2, missingTimestamps, defaultedTimestamps, invalidValues, duplicates, irregular, skippedRows);
    }

    private static String value(CSVRecord row, Map<String, String> headers, String name) {
        String column = headers.get(name);
        if (column == null || !row.isMapped(column) || !row.isSet(column)) return null;
        String value = row.get(column).trim();
        return value.isEmpty() ? null : value;
    }

    private static NumberResult number(String raw, double minimum, double maximum) {
        if (raw == null) return new NumberResult(null, 0);
        try {
            double parsed = Double.parseDouble(raw);
            if (!Double.isFinite(parsed) || parsed < minimum || parsed > maximum) return new NumberResult(null, 1);
            return new NumberResult(parsed, 0);
        } catch (NumberFormatException exception) {
            return new NumberResult(null, 1);
        }
    }

    private static TimestampResult parseTimestamp(String raw) {
        if (raw == null) return new TimestampResult(null, true, true);
        try { return new TimestampResult(Instant.parse(raw), false, false); }
        catch (DateTimeParseException ignored) { }
        try { return new TimestampResult(OffsetDateTime.parse(raw).toInstant(), false, false); }
        catch (DateTimeParseException ignored) { }
        try { return new TimestampResult(LocalDateTime.parse(raw).atZone(ZoneId.systemDefault()).toInstant(), false, false); }
        catch (DateTimeParseException ignored) { }
        try { return new TimestampResult(LocalDate.parse(raw).atStartOfDay(ZoneId.systemDefault()).toInstant(), false, false); }
        catch (DateTimeParseException ignored) { }
        return new TimestampResult(null, false, true);
    }

    private static boolean isIrregular(Map<String, List<Instant>> patientTimes) {
        for (List<Instant> times : patientTimes.values()) {
            if (times.size() < 3) continue;
            List<Long> gaps = new ArrayList<>();
            for (int i = 1; i < times.size(); i++) {
                long minutes = java.time.Duration.between(times.get(i - 1), times.get(i)).toMinutes();
                if (minutes > 0) gaps.add(minutes);
            }
            if (gaps.size() < 2) continue;
            double mean = gaps.stream().mapToLong(Long::longValue).average().orElse(0);
            if (mean == 0) continue;
            double variance = gaps.stream().mapToDouble(gap -> Math.pow(gap - mean, 2)).average().orElse(0);
            if (Math.sqrt(variance) / mean > 0.25 || gaps.stream().anyMatch(gap -> gap > 360)) return true;
        }
        return false;
    }

    private record NumberResult(Double value, int invalid) { }
    private record TimestampResult(Instant timestamp, boolean missing, boolean defaulted) { }
}
