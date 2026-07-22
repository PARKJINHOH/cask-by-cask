package com.caskbycask.global.init;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.autoconfigure.health.HealthEndpointAutoConfiguration;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.HealthEndpointGroups;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class SearchReadinessHealthGroupTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(new ConfigDataApplicationContextInitializer())
            .withConfiguration(AutoConfigurations.of(
                    HealthEndpointAutoConfiguration.class
            ))
            .withBean("readinessState", HealthIndicator.class, () -> () -> Health.up().build())
            .withBean("searchIndex", HealthIndicator.class, () -> () -> Health.down().build());

    @Test
    void searchIndexDownMakesConfiguredReadinessGroupUnavailable() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            assertThat(context.getEnvironment().getProperty(
                    "management.endpoint.health.group.readiness.include"
            )).isEqualTo("readinessState,searchIndex");

            HealthEndpointGroups groups = context.getBean(HealthEndpointGroups.class);
            assertThat(groups.get("readiness")).isNotNull();
            assertThat(groups.get("readiness").isMember("searchIndex")).isTrue();

            var readiness = context.getBean(HealthEndpoint.class).healthForPath("readiness");
            assertThat(readiness.getStatus()).isEqualTo(Status.DOWN);
            assertThat(groups.get("readiness").getHttpCodeStatusMapper().getStatusCode(Status.DOWN))
                    .isEqualTo(503);
        });
    }
}
