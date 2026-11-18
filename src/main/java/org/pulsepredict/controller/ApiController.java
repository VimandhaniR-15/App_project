package org.pulsepredict.controller;

import org.pulsepredict.config.ReviewRuleProperties;
import org.pulsepredict.model.DashboardSummary;
import org.pulsepredict.model.ImportQuality;
import org.pulsepredict.model.PatientSummary;
import org.pulsepredict.service.CsvImportService;
import org.pulsepredict.service.PatientDataService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ApiController {
    private final PatientDataService patientDataService;
    private final CsvImportService csvImportService;
    private final ReviewRuleProperties rules;

    public ApiController(PatientDataService patientDataService, CsvImportService csvImportService, ReviewRuleProperties rules) {
        this.patientDataService = patientDataService;
        this.csvImportService = csvImportService;
        this.rules = rules;
    }

    @GetMapping("/patients")
    public DashboardSummary patients() {
        return patientDataService.getDashboardSummary();
    }

    @GetMapping("/patients/{patientId}/observations")
    public Map<String, Object> observations(@PathVariable String patientId) {
        List<Map<String, Object>> timeline = patientDataService.getObservationsWithReview(patientId);
        if (timeline == null) throw new ResourceNotFoundException("Patient not found: " + patientId);
        return Map.of("patientId", patientId, "observations", timeline);
    }

    @GetMapping("/rules")
    public Map<String, Object> rules() {
        return Map.of(
                "heartRateHigh", rules.getHeartRateHigh(),
                "heartRateLow", rules.getHeartRateLow(),
                "respiratoryRateHigh", rules.getRespiratoryRateHigh(),
                "spo2Low", rules.getSpo2Low(),
                "heartRateChange", rules.getHeartRateChange(),
                "trendWindowHours", rules.getTrendWindowHours(),
                "uploadedData", patientDataService.hasUploadedData()
        );
    }

    @PostMapping(path = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
        ImportQuality quality = csvImportService.importCsv(file);
        return Map.of("quality", quality, "patients", patientDataService.getPatients());
    }

    @SuppressWarnings("serial")
    public static class ResourceNotFoundException extends RuntimeException {
        public ResourceNotFoundException(String message) { super(message); }
    }
}
