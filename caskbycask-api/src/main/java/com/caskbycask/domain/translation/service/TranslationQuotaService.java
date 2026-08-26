package com.caskbycask.domain.translation.service;

import com.caskbycask.domain.translation.entity.TranslationMonthlyUsage;
import com.caskbycask.domain.translation.repository.TranslationMonthlyUsageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class TranslationQuotaService {

    static final String PROVIDER = "GOOGLE_TRANSLATE";
    static final ZoneId BILLING_ZONE = ZoneId.of("America/Los_Angeles");
    static final long ABSOLUTE_MONTHLY_CHARACTER_LIMIT = 450_000L;

    private final TranslationMonthlyUsageRepository repository;
    private final TranslationMetrics metrics;

    @Value("${translation.monthly-character-limit:450000}")
    private long monthlyCharacterLimit;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void reserve(long characters) {
        if (characters <= 0) return;
        LocalDate usageMonth = currentUsageMonth(Clock.systemUTC());
        repository.ensureMonth(PROVIDER, usageMonth);
        TranslationMonthlyUsage usage = repository.findForUpdate(PROVIDER, usageMonth)
                .orElseThrow(() -> new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE));

        long effectiveLimit = Math.max(0L,
                Math.min(monthlyCharacterLimit, ABSOLUTE_MONTHLY_CHARACTER_LIMIT));
        if (characters > effectiveLimit - usage.getAllocatedCharacters()) {
            metrics.increment("monthly_limit");
            throw new CustomException(ErrorCode.TRANSLATION_MONTHLY_LIMIT_EXCEEDED);
        }

        usage.allocate(characters);
        repository.save(usage);
        metrics.setAllocatedCharacters(usage.getAllocatedCharacters());
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional(readOnly = true)
    public void initializeCurrentMonthGauge() {
        LocalDate usageMonth = currentUsageMonth(Clock.systemUTC());
        long allocated = repository.findByProviderAndUsageMonth(PROVIDER, usageMonth)
                .map(TranslationMonthlyUsage::getAllocatedCharacters)
                .orElse(0L);
        metrics.setAllocatedCharacters(allocated);
    }

    static LocalDate currentUsageMonth(Clock clock) {
        YearMonth month = YearMonth.from(clock.instant().atZone(BILLING_ZONE));
        return month.atDay(1);
    }
}
