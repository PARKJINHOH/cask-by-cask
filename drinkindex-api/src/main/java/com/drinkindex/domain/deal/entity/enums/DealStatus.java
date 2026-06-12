package com.drinkindex.domain.deal.entity.enums;

/**
 * 주류 핫딜 검토 상태.
 * PENDING(수신/검토대기) → APPROVED(승인·노출) 또는 REJECTED(반려)
 */
public enum DealStatus {
    PENDING,
    APPROVED,
    REJECTED
}
