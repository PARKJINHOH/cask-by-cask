package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Map;

/**
 * 리뷰 QueryDSL 동적 조회 리포지토리.
 * 공개 사용자 리뷰 목록(카테고리·주류명 키워드 필터)과 카테고리별 집계를 담당한다.
 */
public interface ReviewQueryRepository {

    /**
     * 특정 사용자의 공개 리뷰를 카테고리·주류명 키워드로 필터링해 최신순 페이징 조회한다.
     * <p>공개 조건: 숨김 처리되지 않은 리뷰 + ACTIVE 상태의 주류.
     *
     * @param userId   대상 사용자 ID (필수)
     * @param category 주류 카테고리 필터. {@code null} 이면 전체
     * @param keyword  주류명(nameKo/nameEn) 부분 일치 검색어. 공백/{@code null} 이면 전체
     */
    Page<Review> searchPublicUserReviews(Long userId, SpiritCategory category, String keyword, Pageable pageable);

    /**
     * 특정 사용자의 공개 리뷰 수를 카테고리별로 집계한다.
     * 리뷰가 없는 카테고리도 0 으로 채워 모든 {@link SpiritCategory} 를 포함해 반환한다.
     */
    Map<SpiritCategory, Long> countPublicUserReviewsByCategory(Long userId);
}
