package com.drinkindex.domain.deal.service;

import com.drinkindex.domain.deal.dto.InternalDealRequest;
import com.drinkindex.domain.deal.entity.DealPost;
import com.drinkindex.domain.deal.repository.DealPostRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
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

    /** 크롤러 수신 → PENDING 적재. sourceUrl 중복은 409(멱등). */
    @Transactional
    public void ingest(InternalDealRequest req) {
        if (dealPostRepository.existsBySourceUrl(req.sourceUrl())) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        DealPost deal = DealPost.builder()
                .sourceUrl(req.sourceUrl())
                .sourceSite(req.sourceSite())
                .drinkName(req.drinkName())
                .drinkCategory(req.drinkCategory())
                .originalPrice(req.originalPrice())
                .dealPrice(req.dealPrice())
                .discountRate(req.discountRate())
                .currency(req.currency() != null && !req.currency().isBlank() ? req.currency() : "KRW")
                .seller(req.seller())
                .dealCondition(req.dealCondition())
                .expiryInfo(req.expiryInfo())
                .confidenceScore(req.confidenceScore())
                .summaryKo(req.summaryKo())
                .crawledAt(req.crawledAt() != null ? req.crawledAt().toLocalDateTime() : null)
                .build();

        try {
            // saveAndFlush: 동시 수신 레이스로 인한 unique 위반을 이 시점에 잡아 멱등 처리
            dealPostRepository.saveAndFlush(deal);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        log.info("[deal] 수신 저장 site={} url={}", req.sourceSite(), req.sourceUrl());
    }
}
