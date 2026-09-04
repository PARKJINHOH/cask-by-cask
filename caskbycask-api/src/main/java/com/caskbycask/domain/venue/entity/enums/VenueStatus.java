package com.caskbycask.domain.venue.entity.enums;

import java.util.Set;

/**
 * 장소의 생애주기. <b>승인 상태가 아니다</b> — 제보 승인은 전적으로 venue_register_request 가 맡는다.
 *
 * <p>폐업(CLOSED)을 소프트 삭제로 처리하지 않는 이유: 폐업은 실제 상태이고
 * "그 바 아직 하나?" 라는 검색이 실제로 들어온다. 문서 페이지({@code /venues/{id}})는 살려 두고
 * 지도 마커·사이트맵·JSON-LD 에서만 뺀다.
 */
public enum VenueStatus {
    /** 공개 — 지도 마커·목록·사이트맵에 나온다. 좌표가 반드시 있어야 한다. */
    ACTIVE,
    /** 비공개 — 등록 중이거나 관리자가 내린 상태. 어디에도 노출되지 않는다. */
    HIDDEN,
    /** 폐업 — 목록에 배지로 남고 문서 페이지도 살아 있지만 마커에서는 빠진다. */
    CLOSED;

    /**
     * 비회원에게 보여도 되는 상태. 목록·상세·카운트 조회는 전부 이 집합으로 거른다 —
     * 각 쿼리에서 {@code status != HIDDEN} 을 따로 쓰면 한 군데를 빠뜨렸을 때
     * 비공개 장소가 조용히 새어 나간다.
     */
    public static final Set<VenueStatus> PUBLIC_STATUSES = Set.of(ACTIVE, CLOSED);
}
