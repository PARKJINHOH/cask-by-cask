package com.caskbycask.domain.review.repository;

import com.caskbycask.domain.review.entity.QReview;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.QSpirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.user.entity.QUser;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.Tuple;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class ReviewQueryRepositoryImpl implements ReviewQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Review> searchPublicUserReviews(Long userId, SpiritCategory category, String keyword,
                                               Pageable pageable) {
        QReview review = QReview.review;
        QSpirit spirit = QSpirit.spirit;
        QUser user = QUser.user;

        BooleanBuilder predicate = publicUserPredicate(userId, review, spirit);
        if (category != null) {
            predicate.and(spirit.category.eq(category));
        }
        String normalizedKeyword = normalizeKeyword(keyword);
        if (normalizedKeyword != null) {
            predicate.and(
                    spirit.nameKo.containsIgnoreCase(normalizedKeyword)
                            .or(spirit.nameEn.containsIgnoreCase(normalizedKeyword))
            );
        }

        // ── 1. 데이터 조회 (user·spirit fetch join 으로 N+1 방지) ──
        List<Review> content = queryFactory
                .selectFrom(review)
                .join(review.user, user).fetchJoin()
                .join(review.spirit, spirit).fetchJoin()
                .where(predicate)
                .orderBy(review.createdAt.desc(), review.id.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // ── 2. COUNT 분리 쿼리 (fetch join 없이 필요한 join 만) ──
        Long total = queryFactory
                .select(review.count())
                .from(review)
                .join(review.spirit, spirit)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    @Override
    public Map<SpiritCategory, Long> countPublicUserReviewsByCategory(Long userId) {
        QReview review = QReview.review;
        QSpirit spirit = QSpirit.spirit;

        List<Tuple> rows = queryFactory
                .select(spirit.category, review.count())
                .from(review)
                .join(review.spirit, spirit)
                .where(publicUserPredicate(userId, review, spirit))
                .groupBy(spirit.category)
                .fetch();

        return toCategoryCounts(rows, spirit, review);
    }

    /** {@code (category, count)} 튜플을 모든 카테고리가 채워진 맵으로 변환한다. */
    private Map<SpiritCategory, Long> toCategoryCounts(List<Tuple> rows, QSpirit spirit, QReview review) {
        Map<SpiritCategory, Long> counts = new EnumMap<>(SpiritCategory.class);
        for (SpiritCategory value : SpiritCategory.values()) {
            counts.put(value, 0L);
        }
        for (Tuple row : rows) {
            SpiritCategory rowCategory = row.get(spirit.category);
            if (rowCategory == null) continue;
            Long rowCount = row.get(review.count());
            counts.put(rowCategory, rowCount != null ? rowCount : 0L);
        }
        return counts;
    }

    @Override
    public Page<Review> searchMyReviews(Long userId, SpiritCategory category, Pageable pageable) {
        QReview review = QReview.review;
        QSpirit spirit = QSpirit.spirit;
        QUser user = QUser.user;

        BooleanBuilder predicate = new BooleanBuilder().and(review.user.id.eq(userId));
        if (category != null) {
            predicate.and(spirit.category.eq(category));
        }

        List<Review> content = queryFactory
                .selectFrom(review)
                .join(review.user, user).fetchJoin()
                .join(review.spirit, spirit).fetchJoin()
                .where(predicate)
                .orderBy(review.createdAt.desc(), review.id.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(review.count())
                .from(review)
                .join(review.spirit, spirit)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    @Override
    public Map<SpiritCategory, Long> countMyReviewsByCategory(Long userId) {
        QReview review = QReview.review;
        QSpirit spirit = QSpirit.spirit;

        List<Tuple> rows = queryFactory
                .select(spirit.category, review.count())
                .from(review)
                .join(review.spirit, spirit)
                .where(review.user.id.eq(userId))
                .groupBy(spirit.category)
                .fetch();

        return toCategoryCounts(rows, spirit, review);
    }

    /** 공개 노출 조건: 본인 리뷰 + 숨김 아님 + 주류 ACTIVE */
    private BooleanBuilder publicUserPredicate(Long userId, QReview review, QSpirit spirit) {
        return new BooleanBuilder()
                .and(review.user.id.eq(userId))
                .and(review.isHidden.isFalse())
                .and(spirit.status.eq(SpiritStatus.ACTIVE));
    }

    /** 공백만 있는 검색어는 필터로 취급하지 않는다. */
    private String normalizeKeyword(String keyword) {
        return StringUtils.hasText(keyword) ? keyword.trim() : null;
    }
}
