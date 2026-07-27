package com.caskbycask.domain.pricetracker.batch;

import com.caskbycask.domain.pricetracker.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class ExchangeRateRefreshScheduler {

    private final ExchangeRateService exchangeRateService;

    @Scheduled(
            cron = "${exchange-rate.refresh-cron:0 5 0,6,12,18 * * *}",
            zone = "Asia/Seoul",
            scheduler = "exchangeRateTaskScheduler")
    public void refresh() {
        try {
            exchangeRateService.refresh();
        } catch (RuntimeException e) {
            log.error("Exchange-rate refresh failed; keeping the last successful rates", e);
        }
    }
}
