package com.caskbycask.domain.deal.service;

import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.dto.DealPostSummaryResponse;
import com.caskbycask.domain.deal.dto.UpdateDealRequest;
import com.caskbycask.domain.deal.entity.DealPost;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.repository.DealPostRepository;
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
        DealPost deal = getOrThrow(id);
        requirePending(deal);
        deal.approve();
    }

    @Transactional
    public void reject(Long id) {
        DealPost deal = getOrThrow(id);
        requirePending(deal);
        deal.reject();
    }

    // [상태전이 가드] 검토 대기(PENDING)에서만 승인/반려 가능 — 이미 반려된 핫딜이
    //   재승인되어 노출되거나, 관리자 중복 클릭으로 상태가 뒤집히는 것을 방지.
    private void requirePending(DealPost deal) {
        if (deal.getStatus() != DealStatus.PENDING) {
            throw new CustomException(ErrorCode.DEAL_ALREADY_PROCESSED);
        }
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
