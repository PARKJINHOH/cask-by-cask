package com.drinkindex.domain.deal.service;

import com.drinkindex.domain.deal.dto.DealPostDetailResponse;
import com.drinkindex.domain.deal.dto.DealPostSummaryResponse;
import com.drinkindex.domain.deal.dto.UpdateDealRequest;
import com.drinkindex.domain.deal.entity.DealPost;
import com.drinkindex.domain.deal.entity.enums.DealStatus;
import com.drinkindex.domain.deal.repository.DealPostRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
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

    @Transactional(readOnly = true)
    public Page<DealPostSummaryResponse> list(DealStatus status, int page, int size) {
        DealStatus target = (status != null) ? status : DealStatus.PENDING;
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        return dealPostRepository.findAllByStatusOrderByCreatedAtDesc(target, pageable)
                .map(DealPostSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public DealPostDetailResponse detail(Long id) {
        return DealPostDetailResponse.from(getOrThrow(id));
    }

    @Transactional
    public void approve(Long id) {
        getOrThrow(id).approve();
    }

    @Transactional
    public void reject(Long id) {
        getOrThrow(id).reject();
    }

    @Transactional
    public DealPostDetailResponse update(Long id, UpdateDealRequest req) {
        DealPost deal = getOrThrow(id);
        deal.applyAdminEdit(
                req.drinkName(), req.drinkCategory(), req.originalPrice(), req.dealPrice(),
                req.discountRate(), req.seller(), req.dealCondition(), req.expiryInfo(), req.summaryKo()
        );
        return DealPostDetailResponse.from(deal);
    }

    private DealPost getOrThrow(Long id) {
        return dealPostRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.DEAL_NOT_FOUND));
    }
}
