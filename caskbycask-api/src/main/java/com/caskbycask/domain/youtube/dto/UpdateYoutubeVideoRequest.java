package com.caskbycask.domain.youtube.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 영상 관리 요청 (노출·고정·유형·주류 태그).
 * <p>
 * {@code spiritIds} 는 <b>보낸 목록이 곧 전체</b>다 — null 이면 태그를 건드리지 않고,
 * 빈 배열이면 모두 해제한다. 부분 추가/삭제 API 를 따로 두지 않기 위한 규약이다.
 */
public record UpdateYoutubeVideoRequest(
        Boolean visible,

        Boolean pinned,

        @Size(max = 200)
        String hiddenReason,

        /** VIDEO / SHORTS. 자동 수집이 갈래를 못 갈랐을 때 관리자가 바로잡는다. */
        @Size(max = 20)
        String videoType,

        List<Long> spiritIds
) {
}
