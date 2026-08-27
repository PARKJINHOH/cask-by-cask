package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.entity.TranslationMonthlyUsage;
import com.caskbycask.domain.translation.repository.TranslationMonthlyUsageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;

import java.time.Clock;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = "translation.monthly-character-limit=450000")
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TranslationQuotaService.class, QuerydslConfig.class, JpaAuditingConfig.class})
class TranslationQuotaConcurrencyTest {

    @Autowired TranslationQuotaService service;
    @Autowired TranslationMonthlyUsageRepository repository;
    @MockitoBean TranslationMetrics metrics;

    @Test
    void concurrentReservationsNeverExceedMonthlyHardCap() throws Exception {
        service.reserve(449_999);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<ErrorCode>> results = List.of(
                    executor.submit(() -> reserveOne(start)),
                    executor.submit(() -> reserveOne(start)));
            start.countDown();

            assertThat(results.stream().map(this::get).toList())
                    .containsExactlyInAnyOrder(null, ErrorCode.TRANSLATION_MONTHLY_LIMIT_EXCEEDED);
        } finally {
            executor.shutdownNow();
        }

        TranslationMonthlyUsage usage = repository.findByProviderAndUsageMonth(
                        TranslationQuotaService.PROVIDER,
                        TranslationQuotaService.currentUsageMonth(Clock.systemUTC()))
                .orElseThrow();
        assertThat(usage.getAllocatedCharacters()).isEqualTo(450_000);
    }

    private ErrorCode reserveOne(CountDownLatch start) throws InterruptedException {
        start.await();
        try {
            service.reserve(1);
            return null;
        } catch (CustomException e) {
            return e.getErrorCode();
        }
    }

    private ErrorCode get(Future<ErrorCode> future) {
        try {
            return future.get();
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }
}
