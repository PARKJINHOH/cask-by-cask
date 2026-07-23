package com.caskbycask.domain.bottlecollection.dto;

/**
 * 내 주류보관함에서 허용하는 서버 정렬 키.
 *
 * <p>클라이언트가 임의의 엔티티 경로나 컬럼명을 전달하지 못하도록 공개 API의
 * 정렬 값을 명시적인 화이트리스트로 제한한다.</p>
 */
public enum UserBottleSortKey {
    NAME,
    CATEGORY,
    PURCHASE_DATE,
    PRICE,
    STATUS,
    VISIBILITY
}
