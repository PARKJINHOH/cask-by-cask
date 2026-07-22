package com.caskbycask.domain.user.controller;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.test.context.support.TestPropertySourceUtils;

import static org.assertj.core.api.Assertions.assertThat;

class DevAuthControllerProfileTest {

    @Test
    void controllerIsAvailableOnlyInLocalProfile() {
        assertControllerPresence("local", true);
        assertControllerPresence("dev", false);
        assertControllerPresence("prod", false);
    }

    private void assertControllerPresence(String profile, boolean expected) {
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().setActiveProfiles(profile);
            TestPropertySourceUtils.addInlinedPropertiesToEnvironment(
                    context,
                    "admin.seed.email=local-admin@example.com",
                    "admin.seed.password=local-password"
            );
            context.register(DevAuthController.class);
            context.refresh();

            assertThat(context.getBeansOfType(DevAuthController.class)).hasSize(expected ? 1 : 0);
        }
    }
}
