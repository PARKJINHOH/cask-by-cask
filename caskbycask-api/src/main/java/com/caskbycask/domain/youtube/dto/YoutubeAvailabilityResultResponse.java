package com.caskbycask.domain.youtube.dto;

import com.caskbycask.domain.youtube.service.YoutubeAvailabilityService.SweepResult;

/**
 * 가용성 점검 결과.
 * <p>{@code skipped} 는 확인에 실패해 <b>상태를 바꾸지 않은</b> 건수다 — 실패를 삭제로 오해해
 * 멀쩡한 영상을 내리지 않기 위한 안전장치이며, 이 수가 계속 크면 네트워크를 의심해야 한다.
 */
public record YoutubeAvailabilityResultResponse(
        int checked,
        int hidden,
        int restored,
        int skipped,
        long autoHiddenTotal
) {
    public static YoutubeAvailabilityResultResponse of(SweepResult result, long autoHiddenTotal) {
        return new YoutubeAvailabilityResultResponse(
                result.checked(), result.hidden(), result.restored(), result.skipped(), autoHiddenTotal);
    }
}
