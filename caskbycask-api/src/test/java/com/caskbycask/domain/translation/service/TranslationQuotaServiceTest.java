package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.entity.TranslationMonthlyUsage;
import com.caskbycask.domain.translation.repository.TranslationMonthlyUsageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TranslationQuotaServiceTest {

    @Mock TranslationMonthlyUsageRepository repository;
    @Mock TranslationMetrics metrics;
    private TranslationQuotaService service;

    @BeforeEach
    void setUp() {
        service = new TranslationQuotaService(repository, metrics);
        ReflectionTestUtils.setField(service, "monthlyCharacterLimit", 450_000L);
    }

    @Test
    void exactMonthlyBoundaryIsAccepted() {
        TranslationMonthlyUsage usage = usage(449_999);
        given(repository.findForUpdate(
                org.mockito.ArgumentMatchers.eq(TranslationQuotaService.PROVIDER),
                org.mockito.ArgumentMatchers.any(LocalDate.class)))
                .willReturn(Optional.of(usage));

        service.reserve(1);

        assertThat(usage.getAllocatedCharacters()).isEqualTo(450_000);
        verify(repository).save(usage);
    }

    @Test
    void oneCharacterPastBoundaryIsRejectedWithoutUpdate() {
        TranslationMonthlyUsage usage = usage(450_000);
        given(repository.findForUpdate(
                org.mockito.ArgumentMatchers.eq(TranslationQuotaService.PROVIDER),
                org.mockito.ArgumentMatchers.any(LocalDate.class)))
                .willReturn(Optional.of(usage));

        assertThatThrownBy(() -> service.reserve(1))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.TRANSLATION_MONTHLY_LIMIT_EXCEEDED);
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void configurationCannotRaiseTheAbsoluteFreeTierHardCap() {
        TranslationMonthlyUsage usage = usage(450_000);
        ReflectionTestUtils.setField(service, "monthlyCharacterLimit", 900_000L);
        given(repository.findForUpdate(
                org.mockito.ArgumentMatchers.eq(TranslationQuotaService.PROVIDER),
                org.mockito.ArgumentMatchers.any(LocalDate.class)))
                .willReturn(Optional.of(usage));

        assertThatThrownBy(() -> service.reserve(1))
                .isInstanceOf(CustomException.class)
                .extracting(error -> ((CustomException) error).getErrorCode())
                .isEqualTo(ErrorCode.TRANSLATION_MONTHLY_LIMIT_EXCEEDED);
        verify(repository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void billingMonthRollsOverAtPacificMidnight() {
        Clock before = Clock.fixed(Instant.parse("2026-03-01T07:59:59Z"), ZoneOffset.UTC);
        Clock after = Clock.fixed(Instant.parse("2026-03-01T08:00:00Z"), ZoneOffset.UTC);

        assertThat(TranslationQuotaService.currentUsageMonth(before))
                .isEqualTo(LocalDate.of(2026, 2, 1));
        assertThat(TranslationQuotaService.currentUsageMonth(after))
                .isEqualTo(LocalDate.of(2026, 3, 1));
    }

    private TranslationMonthlyUsage usage(long allocated) {
        return TranslationMonthlyUsage.builder()
                .provider(TranslationQuotaService.PROVIDER)
                .usageMonth(LocalDate.of(2026, 8, 1))
                .allocatedCharacters(allocated)
                .build();
    }
}
