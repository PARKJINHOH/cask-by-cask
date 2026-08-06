package com.caskbycask.domain.score.service;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.community.repository.PostCommentRepository;
import com.caskbycask.domain.community.repository.PostRepository;
import com.caskbycask.domain.pricetracker.repository.PriceReportRepository;
import com.caskbycask.domain.review.repository.ReviewRepository;
import com.caskbycask.domain.score.entity.ScoreHistory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 점수 이력의 referenceType/referenceId 를 프론트 라우트 경로(linkUrl)로 변환한다.
 *
 * <p>한 페이지(보통 20건)의 이력을 referenceType 별로 묶어 배치 조회하므로 N+1 을 피한다.
 * 자식 엔티티(댓글/리뷰/가격제보)는 부모(게시글/술)로 거슬러 올라가 사용자 화면 경로를 만든다.
 * 매핑할 수 없는 액션(출석/관리자 조정/삭제된 원본 등)은 링크 없이(null) 남긴다.
 *
 * <p>참고: 게시글 상세는 id 로 조회하며 boardType 경로 세그먼트는 표시용이라
 *   잘못돼도 로딩에는 지장이 없지만, 정확한 경로를 위해 boardType 도 함께 해석한다.
 */
@Component
@RequiredArgsConstructor
public class ScoreHistoryLinkResolver {

    private final PostRepository postRepository;
    private final PostCommentRepository postCommentRepository;
    private final ReviewRepository reviewRepository;
    private final PriceReportRepository priceReportRepository;

    /** @return scoreHistoryId → linkUrl (링크 없는 항목은 키 미존재) */
    public Map<Long, String> resolveLinks(List<ScoreHistory> histories) {
        if (histories == null || histories.isEmpty()) return Map.of();

        // referenceType 별 referenceId 수집
        Map<Long, Long> postIds   = idsByType(histories, "POST");
        Map<Long, Long> commentIds = idsByType(histories, "COMMENT");
        Map<Long, Long> reviewIds = idsByType(histories, "SPIRIT_REVIEW");
        Map<Long, Long> priceIds  = idsByType(histories, "PRICE_REPORT");
        Map<Long, Long> wishSpiritIds = idsByType(histories, "WISHLIST"); // referenceId = spiritId

        // 배치 조회 후 referenceId → url 매핑 구성
        Map<Long, String> postUrl    = postUrls(postIds.values());
        Map<Long, String> commentUrl = commentUrls(commentIds.values());
        Map<Long, String> reviewUrl  = spiritReviewUrls(reviewIds.values());
        Map<Long, String> priceUrl   = priceUrls(priceIds.values());

        Map<Long, String> result = new HashMap<>();
        for (ScoreHistory h : histories) {
            String url = resolveOne(h, postUrl, commentUrl, reviewUrl, priceUrl, wishSpiritIds);
            if (url != null) result.put(h.getId(), url);
        }
        return result;
    }

    private String resolveOne(ScoreHistory h,
                              Map<Long, String> postUrl, Map<Long, String> commentUrl,
                              Map<Long, String> reviewUrl, Map<Long, String> priceUrl,
                              Map<Long, Long> wishSpiritIds) {
        String type = h.getReferenceType();
        Long ref = h.getReferenceId();
        if (type == null || ref == null) return null;
        return switch (type) {
            case "POST"          -> postUrl.get(ref);
            case "COMMENT"       -> commentUrl.get(ref);
            case "SPIRIT_REVIEW" -> reviewUrl.get(ref);
            case "PRICE_REPORT"  -> priceUrl.get(ref);
            case "WISHLIST"      -> "/spirits/" + ref; // referenceId 가 곧 spiritId
            default              -> null;              // SPIRIT_REQUEST/ATTENDANCE 등은 링크 없음
        };
    }

    /** 해당 referenceType 이력들의 referenceId 수집 (null 제외) */
    private Map<Long, Long> idsByType(List<ScoreHistory> histories, String type) {
        return histories.stream()
                .filter(h -> type.equals(h.getReferenceType()) && h.getReferenceId() != null)
                .collect(Collectors.toMap(
                        ScoreHistory::getId, ScoreHistory::getReferenceId, (a, b) -> a));
    }

    private Map<Long, String> postUrls(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<Long, String> map = new HashMap<>();
        for (Object[] row : postRepository.findIdAndBoardTypeByIdIn(ids)) {
            Long postId = (Long) row[0];
            map.put(postId, postPath((BoardType) row[1], postId));
        }
        return map;
    }

    private Map<Long, String> commentUrls(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<Long, String> map = new HashMap<>();
        for (Object[] row : postCommentRepository.findPostInfoByIdIn(ids)) {
            Long commentId = (Long) row[0];
            Long postId    = (Long) row[1];
            // 댓글 전용 앵커가 아직 없으므로 댓글이 달린 게시글로 이동
            map.put(commentId, postPath((BoardType) row[2], postId));
        }
        return map;
    }

    private Map<Long, String> spiritReviewUrls(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<Long, String> map = new HashMap<>();
        for (Object[] row : reviewRepository.findIdAndSpiritIdByIdIn(ids)) {
            map.put((Long) row[0], "/spirits/" + row[1]);
        }
        return map;
    }

    private Map<Long, String> priceUrls(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<Long, String> map = new HashMap<>();
        for (Object[] row : priceReportRepository.findIdAndSpiritIdByIdIn(ids)) {
            map.put((Long) row[0], "/price-tracker/spirits/" + row[1]);
        }
        return map;
    }

    private String postPath(BoardType boardType, Long postId) {
        return "/community/" + boardType.path() + "/" + postId;
    }
}
