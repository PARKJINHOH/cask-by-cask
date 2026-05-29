package com.drinkindex.domain.notice.dto;

import lombok.Getter;

@Getter
public class NoticeRecommendResponse {

    private final boolean recommended;
    private final long recommendCount;

    private NoticeRecommendResponse(boolean recommended, long recommendCount) {
        this.recommended = recommended;
        this.recommendCount = recommendCount;
    }

    public static NoticeRecommendResponse of(boolean recommended, long recommendCount) {
        return new NoticeRecommendResponse(recommended, recommendCount);
    }
}
