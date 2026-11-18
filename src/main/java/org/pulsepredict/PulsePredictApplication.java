package org.pulsepredict;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PulsePredictApplication {
    public static void main(String[] args) {
        SpringApplication.run(PulsePredictApplication.class, args);
    }
}
