package org.pulsepredict.model;

public record PatientSummary(
        String patientId,
        Observation latestObservation,
        ReviewResult review,
        int observationCount
) { }
