package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.dto.SpiritListResponse;
import com.drinkindex.domain.spirit.dto.SpiritSearchCondition;
import com.drinkindex.domain.spirit.entity.QSpirit;
import com.drinkindex.domain.spirit.entity.QSpiritImage;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Tuple;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class SpiritQueryRepositoryImpl implements SpiritQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<SpiritListResponse> search(SpiritSearchCondition condition, Pageable pageable) {
        QSpirit spirit = QSpirit.spirit;
        QSpiritImage image = QSpiritImage.spiritImage;

        BooleanBuilder predicate = buildPredicate(condition, spirit);
        OrderSpecifier<?> order = buildOrder(condition.sort(), spirit);

        // ── 1. 데이터 조회 (distillery fetch join) ────────────
        List<Spirit> spirits = queryFactory
                .selectFrom(spirit)
                .leftJoin(spirit.distillery).fetchJoin()
                .where(predicate)
                .orderBy(order)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // ── 2. COUNT 분리 쿼리 ─────────────────────────────────
        Long total = queryFactory
                .select(spirit.count())
                .from(spirit)
                .where(predicate)
                .fetchOne();

        // ── 3. 대표 이미지 IN 배치 조회 ────────────────────────
        Map<Long, String> primaryImages = fetchPrimaryImages(spirits, image);

        // ── 4. DTO 변환 ────────────────────────────────────────
        List<SpiritListResponse> content = spirits.stream()
                .map(s -> SpiritListResponse.of(s, primaryImages.get(s.getId())))
                .toList();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    // ── 동적 조건 빌더 ─────────────────────────────────────────

    private BooleanBuilder buildPredicate(SpiritSearchCondition cond, QSpirit spirit) {
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(spirit.status.eq(cond.status()));

        if (StringUtils.hasText(cond.keyword())) {
            builder.and(
                    spirit.nameKo.containsIgnoreCase(cond.keyword())
                            .or(spirit.nameEn.containsIgnoreCase(cond.keyword()))
            );
        }
        if (cond.category() != null) {
            builder.and(spirit.category.eq(cond.category()));
        }
        if (StringUtils.hasText(cond.country())) {
            builder.and(spirit.country.eq(cond.country()));
        }
        if (cond.minAbv() != null) {
            builder.and(spirit.abv.isNotNull().and(spirit.abv.goe(cond.minAbv())));
        }
        if (cond.maxAbv() != null) {
            builder.and(spirit.abv.isNotNull().and(spirit.abv.loe(cond.maxAbv())));
        }
        if (cond.minScore() != null) {
            builder.and(spirit.avgScore.isNotNull().and(spirit.avgScore.goe(cond.minScore())));
        }
        if (cond.maxScore() != null) {
            builder.and(spirit.avgScore.isNotNull().and(spirit.avgScore.loe(cond.maxScore())));
        }

        return builder;
    }

    // ── 정렬 OrderSpecifier 생성 ───────────────────────────────

    private OrderSpecifier<?> buildOrder(SpiritSort sort, QSpirit spirit) {
        return switch (sort) {
            case SCORE_DESC -> spirit.avgScore.desc().nullsLast();
            case REVIEW_COUNT_DESC -> spirit.reviewCount.desc();
            default -> spirit.createdAt.desc();
        };
    }

    // ── 대표 이미지 배치 조회 ──────────────────────────────────

    private Map<Long, String> fetchPrimaryImages(List<Spirit> spirits, QSpiritImage image) {
        if (spirits.isEmpty()) return Map.of();

        List<Long> ids = spirits.stream().map(Spirit::getId).toList();

        List<Tuple> tuples = queryFactory
                .select(image.spirit.id, image.imageUrl)
                .from(image)
                .where(image.spirit.id.in(ids).and(image.isPrimary.isTrue()))
                .fetch();

        return tuples.stream().collect(Collectors.toMap(
                t -> t.get(image.spirit.id),
                t -> t.get(image.imageUrl)
        ));
    }
}
