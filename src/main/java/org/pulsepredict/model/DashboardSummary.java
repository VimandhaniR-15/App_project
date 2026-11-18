package org.pulsepredict.model;

import java.time.Instant;
import java.util.List;

public record DashboardSummary(
        int patientCount,
        int reviewCount,
        Instant latestObservation,
        List<PatientSummary> patients
) { }
