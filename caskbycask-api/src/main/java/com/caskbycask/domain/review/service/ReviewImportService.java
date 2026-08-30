package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.client.ReviewSourceClient;
import com.caskbycask.domain.review.dto.ReviewImportFetchResponse;
import com.caskbycask.domain.review.support.ReviewSourceUrlParser;
import com.caskbycask.domain.review.support.ReviewSourceUrlParser.SourceReference;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * 공개 게시글 본문을 읽어 주기만 하는 서비스. <b>아무것도 저장하지 않는다.</b>
 * <p>
 * 붙여넣기가 원래의 주 경로이고 이 경로는 보조 수단이다. 원문 사이트가 막거나 형식을 바꾸면
 * 실패로 끝나고, 화면은 "본문을 복사해 붙여넣어 주세요"로 되돌아간다.
 */
@Service
@RequiredArgsConstructor
public class ReviewImportService {

    private final ReviewSourceClient reviewSourceClient;

    @Value("${review-import.enabled:true}")
    private boolean enabled;

    /**
     * 아카라이브 채널 허용 목록. 주류 채널 밖에서 리뷰를 가져올 이유가 없고,
     * 좁혀 두면 이 기능이 사이트 전체를 읽는 통로가 되지 않는다.
     */
    @Value("${review-import.arcalive-channels:alcohol}")
    private List<String> arcaliveChannels;

    public ReviewImportFetchResponse fetch(String url) {
        if (!enabled) throw new CustomException(ErrorCode.REVIEW_IMPORT_UNSUPPORTED_URL);

        SourceReference reference = ReviewSourceUrlParser.parse(url);
        if (reference == null || !isAllowedChannel(reference)) {
            throw new CustomException(ErrorCode.REVIEW_IMPORT_UNSUPPORTED_URL);
        }

        ReviewSourceClient.SourcePost post = reviewSourceClient.fetch(reference);
        if (post == null) throw new CustomException(ErrorCode.REVIEW_IMPORT_FETCH_FAILED);

        return new ReviewImportFetchResponse(
                reference.site(), post.title(), post.content(), post.canonicalUrl());
    }

    private boolean isAllowedChannel(SourceReference reference) {
        if (reference.site() != ReviewSourceUrlParser.SourceSite.ARCALIVE) return true;
        return arcaliveChannels.stream()
                .map(channel -> channel.trim().toLowerCase(Locale.ROOT))
                .anyMatch(channel -> channel.equals(reference.boardId()));
    }
}
