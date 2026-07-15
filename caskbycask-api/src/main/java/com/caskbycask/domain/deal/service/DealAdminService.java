package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.dto.DealPostSummaryResponse;
import com.caskbycask.domain.deal.dto.UpdateDealRequest;
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DealAdminService {

    private final DealPostRepository dealPostRepository;
    private final SpiritRepository spiritRepository;

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

    @Transactional
    public DealPostDetailResponse approve(Long id, UpdateDealRequest req) {
        DealPost deal = getOrThrow(id);
        requirePending(deal);
        if (req != null) {
            applyUpdate(deal, req);
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
    }

    private DealPost getOrThrow(Long id) {
        return dealPostRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DEAL_NOT_FOUND));
    }
}
