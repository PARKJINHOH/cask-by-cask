package com.caskbycask.domain.ainews.entity.enums;

/**
 * 출처별 마지막 수집 결과.
 *
 * <p>{@code SUCCESS} 와 {@code NO_RESULT} 를 나눈 이유는, 예전에 둘이 뭉쳐 있었기 때문이다 —
 * 제한 검색이 정상 완료되기만 하면 모든 출처가 '수집 성공'으로 찍혀서 실제로 깨진 출처를 아무도 몰랐다.
 * 지금은 근거를 실제로 가져온 경우만 {@code SUCCESS} 이고, 정상 확인했지만 새 소식이 없었으면
 * {@code NO_RESULT} 다. 확인 자체가 실패하면 {@code ERROR} 이며 사유를 함께 남긴다.
 */
public enum AiNewsSourceCrawlStatus {
    NOT_CHECKED,
    SUCCESS,
    NO_RESULT,
    ERROR
}
