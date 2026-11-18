package org.pulsepredict.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "review.rules")
public class ReviewRuleProperties {
    private double heartRateHigh = 120;
    private double heartRateLow = 45;
    private double respiratoryRateHigh = 24;
    private double spo2Low = 92;
    private double heartRateChange = 25;
    private long trendWindowHours = 6;

    public double getHeartRateHigh() { return heartRateHigh; }
    public void setHeartRateHigh(double value) { this.heartRateHigh = value; }
    public double getHeartRateLow() { return heartRateLow; }
    public void setHeartRateLow(double value) { this.heartRateLow = value; }
    public double getRespiratoryRateHigh() { return respiratoryRateHigh; }
    public void setRespiratoryRateHigh(double value) { this.respiratoryRateHigh = value; }
    public double getSpo2Low() { return spo2Low; }
    public void setSpo2Low(double value) { this.spo2Low = value; }
    public double getHeartRateChange() { return heartRateChange; }
    public void setHeartRateChange(double value) { this.heartRateChange = value; }
    public long getTrendWindowHours() { return trendWindowHours; }
    public void setTrendWindowHours(long value) { this.trendWindowHours = value; }
}
