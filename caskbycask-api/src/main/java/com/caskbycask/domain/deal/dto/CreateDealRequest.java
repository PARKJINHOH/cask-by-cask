package com.caskbycask.domain.deal.dto;

import com.caskbycask.domain.pricetracker.entity.enums.StoreType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * 관리자 직접 가격 등록 요청 (크롤러 수집이 아닌 수동 입력).
 *
 * <p>크롤러 수신({@link InternalDealRequest})과 달리 사람이 교차검증한 값이므로
 * 검토 대기(PENDING)를 건너뛰고 바로 승인·노출 상태로 저장한다.
 * 대신 가격 차트에 곧바로 반영되므로 아래 항목을 필수로 강제한다.
 * <ul>
 *   <li>{@code spiritId} — 연결된 주류가 없으면 차트에 집계되지 않아 유령 데이터가 된다.</li>
 *   <li>{@code originalPrice}/{@code dealPrice} — 0 이하는 차트에서 걸러진다.</li>
 * </ul>
 *
 * <p>{@code sourceUrl} 은 선택이다. 비우면 서비스가 내부 멱등키({@code admin://deal/...})를
 * 생성한다 — 컬럼이 NOT NULL + UNIQUE 이기 때문이다.
 * 각 {@code @Size} 상한은 DealPost 엔티티 컬럼 길이와 일치시킨다.
 */
public record CreateDealRequest(
        @NotNull Long spiritId,

        @Size(max = 200) String drinkName,
        @Size(max = 50) String drinkCategory,

        @Min(1) @Max(100000) Integer volumeMl,

        @NotNull @Min(1) Integer originalPrice,
        @NotNull @Min(1) Integer dealPrice,

        @Size(max = 10) String currency,
        @Size(max = 200) String seller,
        @Size(max = 500) String dealCondition,
        @Size(max = 200) String expiryInfo,
        String summaryKo,

        StoreType storeType,

        @Size(max = 500)
        @Pattern(regexp = "^$|^https?://.+", message = "출처 URL 은 http(s) URL 형식이어야 합니다.")
        String sourceUrl,

        /** 가격을 확인한 날짜. 차트 X축(관측일)로 쓰인다. 미지정 시 등록 시각. */
        LocalDate observedAt
) {
}
