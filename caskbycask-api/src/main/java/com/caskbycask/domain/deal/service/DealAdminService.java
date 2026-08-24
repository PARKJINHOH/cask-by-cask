package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.CreateDealRequest;
import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.dto.DealPostSummaryResponse;
import com.caskbycask.domain.deal.dto.UpdateDealRequest;
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DealAdminService {

    /** 관리자 직접 등록 식별용 출처 값. 프론트 SITE_LABEL 과 짝을 맞춘다. */
    private static final String ADMIN_SOURCE_SITE = "ADMIN";
    /** 원문 URL 이 없는 관리자 등록의 내부 멱등키 접두사. http(s) 가 아니라 링크로 열리지 않는다. */
    private static final String ADMIN_SOURCE_URL_PREFIX = "admin://deal/";
    private static final int ADMIN_CONFIDENCE_SCORE = 10;

    private final DealPostRepository dealPostRepository;
    private final SpiritRepository spiritRepository;
    private final DealExchangeRateApplier exchangeRateApplier;

    @Transactional(readOnly = true)
    public Page<DealPostSummaryResponse> list(DealStatus status, String drinkName, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        String normalizedDrinkName = normalizeSearchKeyword(drinkName);

        if (status != null && normalizedDrinkName != null) {
            return dealPostRepository
                    .findAllByStatusAndDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
                            status, normalizedDrinkName, pageable)
                    .map(DealPostSummaryResponse::from);
        }
        if (normalizedDrinkName != null) {
            return dealPostRepository
                    .findAllByDrinkNameContainingIgnoreCaseOrderByCreatedAtDesc(
                            normalizedDrinkName, pageable)
                    .map(DealPostSummaryResponse::from);
        }
        if (status == null) {
            return dealPostRepository.findAllByOrderByCreatedAtDesc(pageable)
                    .map(DealPostSummaryResponse::from);
        }
        return dealPostRepository.findAllByStatusOrderByCreatedAtDesc(status, pageable)
                .map(DealPostSummaryResponse::from);
    }

    private String normalizeSearchKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return keyword.trim();
    }

    @Transactional(readOnly = true)
    public DealPostDetailResponse detail(Long id) {
        return DealPostDetailResponse.from(getOrThrow(id));
    }

    /**
     * 관리자 직접 가격 등록.
     *
     * <p>크롤러 수집분과 달리 사람이 확인한 값이므로 검토 대기를 건너뛰고 바로 승인·노출로 저장한다.
     * 가격 차트는 {@code spirit_id + status=APPROVED + is_visible=true} 조건으로 집계하므로,
     * 주류 연결이 없으면 어디에도 나타나지 않는 유령 데이터가 된다 → 여기서 필수로 막는다.
     *
     * <p>{@code source_url} 은 NOT NULL + UNIQUE(크롤러 멱등키)다. 관리자 등록은 원문이 없을 수
     * 있으므로 비어 있으면 내부 키({@code admin://deal/{UUID}})를 생성해 크롤러 멱등성을 깨지 않는다.
     */
    @Transactional
    public DealPostDetailResponse create(CreateDealRequest req) {
        Spirit spirit = spiritRepository.findById(req.spiritId())
                .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));

        Integer originalPrice = DealPriceNormalizer.normalizePrice(req.originalPrice());
        Integer dealPrice = DealPriceNormalizer.normalizePrice(req.dealPrice());
        if (originalPrice <= 0 || dealPrice <= 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String sourceUrl = resolveAdminSourceUrl(req.sourceUrl());
        if (dealPostRepository.existsBySourceUrl(sourceUrl)) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        // [가격 정확도] 가격 차트는 deal 금액을 원화 축 하나로 집계한다. 외화는 저장 시점에
        //   exchangeRateApplier 가 원화로 환산해 박제하므로(V96) 이제 외화 등록도 허용한다.
        //   지원하지 않는 통화는 resolveCurrency 가 DEAL_CURRENCY_NOT_SUPPORTED 로 막는다.
        String currency = DealPriceNormalizer.normalizeCurrency(req.currency());

        DealPost deal = DealPost.builder()
                .sourceUrl(sourceUrl)
                .sourceSite(ADMIN_SOURCE_SITE)
                .drinkName(blankToNull(req.drinkName()) != null ? req.drinkName().trim() : spirit.getNameKo())
                .drinkCategory(blankToNull(req.drinkCategory()) != null
                        ? req.drinkCategory().trim() : spirit.getCategory().name())
                .volumeMl(req.volumeMl())
                .originalPrice(originalPrice)
                .dealPrice(dealPrice)
                .discountRate(DealPriceNormalizer.calculateDiscountRate(originalPrice, dealPrice))
                .currency(currency)
                .seller(blankToNull(req.seller()))
                .dealCondition(blankToNull(req.dealCondition()))
                .expiryInfo(blankToNull(req.expiryInfo()))
                // 관리자가 직접 확인한 값이라 AI 신뢰도 최상. 차트 정가 후보 선정 시 우선순위로 쓰인다.
                .confidenceScore(ADMIN_CONFIDENCE_SCORE)
                .summaryKo(blankToNull(req.summaryKo()))
                .spirit(spirit)
                .storeType(req.storeType() != null ? req.storeType() : StoreType.DOMESTIC)
                .crawledAt(req.observedAt() != null
                        ? req.observedAt().atStartOfDay() : LocalDateTime.now())
                .isVisible(true)
                .status(DealStatus.APPROVED)
                .build();

        // 관리자가 지정한 관측일(observedAt) 환율로 환산한다. 미지정이면 최신 환율.
        exchangeRateApplier.applyForDate(deal, req.observedAt());

        try {
            // saveAndFlush: 동시 등록 레이스로 인한 unique 위반을 이 시점에 잡는다.
            dealPostRepository.saveAndFlush(deal);
        } catch (DataIntegrityViolationException e) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_EXISTS);
        }

        return DealPostDetailResponse.from(deal);
    }

    private String resolveAdminSourceUrl(String rawSourceUrl) {
        String trimmed = blankToNull(rawSourceUrl);
        if (trimmed != null) {
            return trimmed.trim();
        }
        return ADMIN_SOURCE_URL_PREFIX + UUID.randomUUID();
    }

    private String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value;
    }

    @Transactional
    public DealPostDetailResponse approve(Long id, UpdateDealRequest req) {
        DealPost deal = getOrThrow(id);
        requirePending(deal);
        if (req != null) {
            applyUpdate(deal, req);
        } else if (deal.resolveDealPriceKrw() == null) {
            // 수집 시점에 환율을 못 구했던 딜은 승인이 자연스러운 재시도 지점이다.
            // 여기서도 실패하면 환산값 없이 남아 차트에서 제외된다(백필로 나중에 채운다).
            exchangeRateApplier.applyForDate(deal, resolveRateDate(deal));
        }
        deal.approve();
        return DealPostDetailResponse.from(deal);
    }



    // [상태전이 가드] 검토 대기(PENDING)에서만 승인 가능 — 이미 처리된 핫딜이
    //   재승인되어 노출되거나, 관리자 중복 클릭으로 상태가 뒤집히는 것을 방지.
    private void requirePending(DealPost deal) {
        if (deal.getStatus() != DealStatus.PENDING) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_PROCESSED);
        }
    }

    @Transactional
    public DealPostDetailResponse update(Long id, UpdateDealRequest req) {
        DealPost deal = getOrThrow(id);
        applyUpdate(deal, req);
        return DealPostDetailResponse.from(deal);
    }

    @Transactional
    public void delete(Long id) {
        DealPost deal = getOrThrow(id);
        dealPostRepository.delete(deal);
    }

    @Transactional
    public void deleteBulk(java.util.List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return;
        }
        dealPostRepository.deleteAllByIdInBatch(ids);
    }

    private void applyUpdate(DealPost deal, UpdateDealRequest req) {
        Spirit spirit = null;
        if (req.spiritId() != null) {
            spirit = spiritRepository.findById(req.spiritId())
                    .orElseThrow(() -> new CustomException(ErrorCode.SPIRIT_NOT_FOUND));
        }

        Integer originalPrice = DealPriceNormalizer.normalizePrice(req.originalPrice());
        Integer dealPrice = DealPriceNormalizer.normalizePrice(req.dealPrice());

        deal.applyAdminEdit(
                req.drinkName(), req.drinkCategory(), originalPrice, dealPrice, req.volumeMl(),
                DealPriceNormalizer.calculateDiscountRate(originalPrice, dealPrice),
                DealPriceNormalizer.normalizeCurrency(req.currency()), req.seller(),
                req.dealCondition(), req.expiryInfo(), req.summaryKo()
        );
        deal.linkSpiritAndStoreType(spirit, req.storeType());
        // 금액·통화가 바뀌었을 수 있으므로 원화 환산을 다시 확정한다.
        // 이 경로에는 원래 통화 검증이 없어 외화가 원화로 오염되는 통로였다.
        exchangeRateApplier.applyForDate(deal, resolveRateDate(deal));
    }

    /** 환산 기준일 — 수집(관측) 시점을 우선한다. 없으면 최신 환율(null). */
    private LocalDate resolveRateDate(DealPost deal) {
        return deal.getCrawledAt() != null ? deal.getCrawledAt().toLocalDate() : null;
    }

    private DealPost getOrThrow(Long id) {
        return dealPostRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DEAL_NOT_FOUND));
    }
}
