package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.pricetracker.entity.ExchangeRate;
import com.caskbycask.domain.pricetracker.entity.enums.PriceCurrency;
import com.caskbycask.domain.pricetracker.service.ExchangeRateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * deal_posts 의 원화 환산값을 확정한다.
 *
 * <p>가격 차트는 price_reports 와 deal_posts 를 원화 축 하나로 합친다. price_reports 는
 * {@code PriceReportService.resolvePricing()} 에서 환율을 박제하지만 deal 은 그런 경로가 없어
 * 외화 금액이 그대로 원화로 집계돼 왔다. 저장·수정 시점마다 이 컴포넌트를 태워 의미를 맞춘다.
 *
 * <p>환율 조회에 실패해도 예외를 던지지 않는다. 크롤러 수집분이 통째로 유실되는 편보다
 * 환산값을 비워 두고 차트에서만 빠지는 편이 낫기 때문이다(백필로 나중에 채운다).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DealExchangeRateApplier {

    private final ExchangeRateService exchangeRateService;

    /** 최신 환율로 환산한다. 신규 수집·관리자 등록 경로용. */
    public void apply(DealPost deal) {
        applyForDate(deal, null);
    }

    /**
     * 기준일 환율로 환산한다. {@code rateDate} 가 null 이면 최신 환율을 쓴다.
     *
     * @return 환산에 성공했으면 true
     */
    public boolean applyForDate(DealPost deal, LocalDate rateDate) {
        if (deal.isKrw()) {
            deal.applyExchangeRate(null, null);
            return true;
        }

        PriceCurrency currency = DealPriceNormalizer.resolveCurrency(deal.getCurrency());
        try {
            if (rateDate == null) {
                ExchangeRate rate = exchangeRateService.getRequiredRate(currency);
                deal.applyExchangeRate(rate.getKrwPerUnit(), rate.getEffectiveDate());
            } else {
                ExchangeRateService.RateQuote quote =
                        exchangeRateService.getHistoricalRate(currency, rateDate);
                deal.applyExchangeRate(quote.krwPerUnit(), quote.effectiveDate());
            }
            return true;
        } catch (RuntimeException e) {
            // 환산 실패는 수집 실패가 아니다. KRW 컬럼을 비워 차트에서만 제외한다.
            deal.applyExchangeRate(null, null);
            log.warn("Deal KRW conversion skipped: currency={}, rateDate={}, reason={}",
                    currency, rateDate, e.getMessage());
            return false;
        }
    }
}
