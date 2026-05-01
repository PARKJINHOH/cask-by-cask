package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.spirit.entity.QSpirit;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.util.List;

@RequiredArgsConstructor
public class SpiritQueryRepositoryImpl implements SpiritQueryRepository {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Spirit> search(
            SpiritCategory category,
            String country,
            BigDecimal minAbv,
            BigDecimal maxAbv,
            BigDecimal minScore,
            BigDecimal maxScore,
            String keyword,
            SpiritSort sort,
            Pageable pageable
    ) {
        QSpirit spirit = QSpirit.spirit;
        BooleanBuilder builder = new BooleanBuilder();
        builder.and(spirit.status.eq(SpiritStatus.ACTIVE));

        if (category != null) {
            builder.and(spirit.category.eq(category));
        }
        if (StringUtils.hasText(country)) {
            builder.and(spirit.country.eq(country));
        }
        if (minAbv != null) {
            builder.and(spirit.abv.isNotNull().and(spirit.abv.goe(minAbv)));
        }
        if (maxAbv != null) {
            builder.and(spirit.abv.isNotNull().and(spirit.abv.loe(maxAbv)));
        }
        if (minScore != null) {
            builder.and(spirit.avgScore.isNotNull().and(spirit.avgScore.goe(minScore)));
        }
        if (maxScore != null) {
            builder.and(spirit.avgScore.isNotNull().and(spirit.avgScore.loe(maxScore)));
        }
        if (StringUtils.hasText(keyword)) {
            builder.and(
                    spirit.nameKo.containsIgnoreCase(keyword)
                            .or(spirit.nameEn.containsIgnoreCase(keyword))
            );
        }

        SpiritSort effectiveSort = sort != null ? sort : SpiritSort.LATEST;
        OrderSpecifier<?> order = switch (effectiveSort) {
            case SCORE_DESC -> spirit.avgScore.desc().nullsLast();
            case REVIEW_COUNT_DESC -> spirit.reviewCount.desc();
            default -> spirit.createdAt.desc();
        };

        List<Spirit> content = queryFactory
                .selectFrom(spirit)
                .leftJoin(spirit.distillery).fetchJoin()
                .where(builder)
                .orderBy(order)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long total = queryFactory
                .select(spirit.count())
                .from(spirit)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }
}
