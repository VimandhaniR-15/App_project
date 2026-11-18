package org.pulsepredict.model;

public record ImportQuality(
        int totalRecords,
        int totalPatients,
        int missingHeartRate,
        int missingRespiratoryRate,
        int missingSpo2,
        int missingTimestamps,
        int defaultedTimestamps,
        int invalidValues,
        int duplicateTimestamps,
        boolean irregularSampling,
        int skippedRows
) { }
