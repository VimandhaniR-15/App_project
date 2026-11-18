package org.pulsepredict.service;

import org.junit.jupiter.api.Test;
import org.pulsepredict.config.ReviewRuleProperties;
import org.pulsepredict.model.Observation;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PatientDataServiceTest {
    @Test
    void earlierReviewDoesNotUseFutureObservation() {
        PatientDataService service = new PatientDataService(new ReviewRuleProperties());
        Instant earlier = Instant.parse("2026-04-01T10:00:00Z");
        service.replaceObservations(List.of(
                new Observation("P-1", earlier.plusSeconds(3600), 140.0, 18.0, 96.0),
                new Observation("P-1", earlier, 80.0, 18.0, 96.0)
        ));

        List<Map<String, Object>> timeline = service.getObservationsWithReview("P-1");
        assertEquals(earlier, timeline.get(0).get("timestamp"));
        assertEquals("ROUTINE", ((org.pulsepredict.model.ReviewResult) timeline.get(0).get("review")).status());
        assertEquals("REVIEW", ((org.pulsepredict.model.ReviewResult) timeline.get(1).get("review")).status());
    }

    @Test
    void reviewReasonsNameTheRuleAndObservedValue() {
        PatientDataService service = new PatientDataService(new ReviewRuleProperties());
        Instant time = Instant.parse("2026-04-01T10:00:00Z");
        service.replaceObservations(List.of(new Observation("P-2", time, 130.0, 28.0, 88.0)));

        var review = service.getPatients().get(0).review();
        assertEquals("REVIEW", review.status());
        assertEquals(3, review.reasons().size());
        assertTrue(review.reasons().get(0).contains("130 bpm"));
    }
}
