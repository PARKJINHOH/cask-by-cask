package com.caskbycask.domain.review.service;

import com.caskbycask.domain.review.constant.ReviewCommentLimits;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.util.BadWordFilter;
import com.caskbycask.global.util.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 리뷰 종합평가(comment) 저장 전 정제.
 *
 * <p>종합평가는 제한형 에디터가 만든 HTML 로 들어온다. 리뷰와 하위 에디션 등록요청이 같은 규칙을
 * 써야 하므로(요청은 승인 시 리뷰로 그대로 복사된다) 두 서비스가 이 컴포넌트를 공유한다.
 */
@Component
@RequiredArgsConstructor
public class ReviewCommentSanitizer {

    private final HtmlSanitizer htmlSanitizer;
    private final BadWordFilter badWordFilter;

    /**
     * 정제된 종합평가 HTML 을 돌려준다.
     *
     * <p>{@code null} 은 수정 API 에서 "변경 안 함" 을 뜻하므로 그대로 통과시킨다 —
     * 빈 문자열("총평을 지움")과 구분해야 한다.
     */
    public String sanitize(String rawHtml) {
        if (rawHtml == null) return null;

        String cleaned = htmlSanitizer.sanitizeReviewComment(rawHtml);
        String text = htmlSanitizer.sanitizeToPlainText(cleaned);

        // 빈 에디터는 <p></p> 를 보낸다. 그대로 두면 화면의 "총평 없음" 판정이 어긋난다.
        if (text.isBlank()) return "";

        // 길이는 화면 글자수와 같은 기준으로 센다 — text.length() 로 재면 문단 수만큼
        // 더 세어, 에디터에 600/600 으로 보이는 글이 서버에서 반려된다.
        if (htmlSanitizer.countCharactersAsEditor(cleaned) > ReviewCommentLimits.MAX_TEXT_LENGTH) {
            throw new CustomException(ErrorCode.REVIEW_COMMENT_TOO_LONG);
        }
        // 태그로 글자를 쪼개 필터를 피하거나(예: 시<b></b>발) 반대로 태그 이름이 걸리는 일이
        // 없도록, 화면에 실제로 보이는 본문으로 검사한다.
        badWordFilter.validate(text);
        return cleaned;
    }
}
