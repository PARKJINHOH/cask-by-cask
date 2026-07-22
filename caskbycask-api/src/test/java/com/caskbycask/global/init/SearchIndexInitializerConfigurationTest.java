package com.caskbycask.global.init;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.boot.actuate.health.Status;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;

class SearchIndexInitializerConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(EntityManager.class, () -> mock(EntityManager.class))
            .withUserConfiguration(TestConfiguration.class);

    @Test
    void startupMassIndexingRemainsEnabledByDefault() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(SearchIndexInitializer.class));
    }

    @AfterEach
    void clearInterruptedFlag() {
        Thread.interrupted();
    }

    @Test
    void invalidMassIndexThreadCountFailsConfiguration() {
        contextRunner
                .withPropertyValues("search.mass-index-on-startup.threads-to-load-objects=0")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void massIndexThreadCountAboveMaximumFailsConfiguration() {
        contextRunner
                .withPropertyValues("search.mass-index-on-startup.threads-to-load-objects=17")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void malformedMassIndexThreadCountFailsConfiguration() {
        contextRunner
                .withPropertyValues("search.mass-index-on-startup.threads-to-load-objects=not-a-number")
                .run(context -> assertThat(context).hasFailed());
    }

    @Test
    void massIndexFailureKeepsApiAvailableButMarksSearchReadinessDown() throws Exception {
        SearchIndexInitializer initializer = spy(new SearchIndexInitializer(mock(EntityManager.class), 4));
        doThrow(new IllegalStateException("index failure")).when(initializer).rebuildIndex();

        initializer.run(mock(org.springframework.boot.ApplicationArguments.class));

        assertThat(initializer.health().getStatus()).isEqualTo(Status.DOWN);
    }

    @Test
    void successfulMassIndexMarksSearchReadinessUp() throws Exception {
        SearchIndexInitializer initializer = spy(new SearchIndexInitializer(mock(EntityManager.class), 4));
        doNothing().when(initializer).rebuildIndex();

        initializer.run(mock(org.springframework.boot.ApplicationArguments.class));

        assertThat(initializer.health().getStatus()).isEqualTo(Status.UP);
    }

    @Test
    void interruptionIsRestoredAndPropagatedToApplicationStartup() throws Exception {
        SearchIndexInitializer initializer = spy(new SearchIndexInitializer(mock(EntityManager.class), 4));
        doThrow(new InterruptedException("interrupted")).when(initializer).rebuildIndex();

        assertThatThrownBy(() -> initializer.run(mock(org.springframework.boot.ApplicationArguments.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Hibernate Search Mass Indexing was interrupted");
        assertThat(Thread.currentThread().isInterrupted()).isTrue();
        assertThat(initializer.health().getStatus()).isEqualTo(Status.DOWN);
    }

    @Configuration(proxyBeanMethods = false)
    @Import(SearchIndexInitializer.class)
    static class TestConfiguration {
    }
}
