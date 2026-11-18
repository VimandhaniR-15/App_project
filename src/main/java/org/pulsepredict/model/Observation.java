package org.pulsepredict.model;

import java.time.Instant;

public record Observation(
        String patientId,
        Instant timestamp,
        Double heartRate,
        Double respiratoryRate,
        Double spo2
) { }
