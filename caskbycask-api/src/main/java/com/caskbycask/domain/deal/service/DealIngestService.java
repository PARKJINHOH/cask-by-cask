package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.InternalDealRequest;
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class DealIngestService {

    private final DealPostRepository dealPostRepository;
    private final DealExchangeRateApplier exchangeRateApplier;

    /** 크롤러 수신 → PENDING 적재. sourceUrl 중복은 409(멱등). */
    @Transactional
    public void ingest(InternalDealRequest req) {
        if (dealPostRepository.existsBySourceUrl(req.sourceUrl())) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        Integer originalPrice = DealPriceNormalizer.normalizePrice(req.originalPrice());
        Integer dealPrice = DealPriceNormalizer.normalizePrice(req.dealPrice());

        DealPost deal = DealPost.builder()
                .sourceUrl(req.sourceUrl())
                .sourceSite(req.sourceSite())
                .drinkName(req.drinkName())
                .drinkCategory(req.drinkCategory())
                .volumeMl(req.volumeMl())
                .originalPrice(originalPrice)
                .dealPrice(dealPrice)
                .discountRate(DealPriceNormalizer.calculateDiscountRate(originalPrice, dealPrice))
                .currency(DealPriceNormalizer.normalizeCurrency(req.currency()))
                .seller(req.seller())
                .dealCondition(req.dealCondition())
                .expiryInfo(req.expiryInfo())
                .confidenceScore(req.confidenceScore())
                .summaryKo(req.summaryKo())
                .crawledAt(req.crawledAt() != null ? req.crawledAt().toLocalDateTime() : null)
                .build();

        // 외화 딜은 여기서 원화 환산을 박제한다. 실패해도 적재는 계속하고 차트에서만 빠진다.
        exchangeRateApplier.apply(deal);

        try {
            // saveAndFlush: 동시 수신 레이스로 인한 unique 위반을 이 시점에 잡아 멱등 처리
            dealPostRepository.saveAndFlush(deal);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        log.info("[deal] 수신 저장 site={} url={}", req.sourceSite(), req.sourceUrl());
    }
}
