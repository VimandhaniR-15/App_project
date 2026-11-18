package org.pulsepredict.service;

import org.junit.jupiter.api.Test;
import org.pulsepredict.config.ReviewRuleProperties;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CsvImportServiceTest {
    @Test
    void sortsRowsAndKeepsMissingOrInvalidVitalsEmpty() {
        PatientDataService data = new PatientDataService(new ReviewRuleProperties());
        CsvImportService importer = new CsvImportService(data);
        String csv = "patient_id,heart_rate,timestamp,respiratory_rate,spo2\n"
                + "P-1,130,2026-04-01T11:00:00Z,25,89\n"
                + "P-1,invalid,2026-04-01T10:00:00Z,,";
        MockMultipartFile file = new MockMultipartFile("file", "observations.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        var quality = importer.importCsv(file);
        List<Map<String, Object>> timeline = data.getObservationsWithReview("P-1");

        assertEquals(2, quality.totalRecords());
        assertEquals(1, quality.missingHeartRate());
        assertEquals(1, quality.missingRespiratoryRate());
        assertEquals(1, quality.missingSpo2());
        assertEquals(1, quality.invalidValues());
        assertEquals("2026-04-01T10:00:00Z", timeline.get(0).get("timestamp").toString());
        assertEquals(null, timeline.get(0).get("heartRate"));
    }

    @Test
    void requiresPatientIdAndHeartRateHeaders() {
        PatientDataService data = new PatientDataService(new ReviewRuleProperties());
        CsvImportService importer = new CsvImportService(data);
        MockMultipartFile file = new MockMultipartFile("file", "bad.csv", "text/csv", "patient_id,pulse\nP-1,80".getBytes(StandardCharsets.UTF_8));
        assertThrows(IllegalArgumentException.class, () -> importer.importCsv(file));
    }
}
