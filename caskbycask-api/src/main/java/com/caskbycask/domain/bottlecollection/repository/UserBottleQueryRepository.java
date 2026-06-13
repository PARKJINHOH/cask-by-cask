package com.caskbycask.domain.bottlecollection.repository;

import com.caskbycask.domain.bottlecollection.dto.BottleStatsDto;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.QUserBottle;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserBottleQueryRepository {

    private final JPAQueryFactory queryFactory;
    private static final QUserBottle bottle = QUserBottle.userBottle;

    public Page<UserBottle> findByUser(Long userId, SpiritCategory category,
                                       BottleStatus status, Pageable pageable) {
        BooleanBuilder where = buildWhere(userId, category, status, null);

        List<UserBottle> content = queryFactory
            .selectFrom(bottle)
            .leftJoin(bottle.spirit).fetchJoin()
            .where(where)
            .orderBy(bottle.purchaseDate.desc(), bottle.id.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        return PageableExecutionUtils.getPage(content, pageable,
            () -> queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne());
    }

    public Page<UserBottle> findPublicByUser(Long userId, SpiritCategory category, Pageable pageable) {
        BooleanBuilder where = buildWhere(userId, category, null, true);

        List<UserBottle> content = queryFactory
            .selectFrom(bottle)
            .leftJoin(bottle.spirit).fetchJoin()
            .where(where)
            .orderBy(bottle.purchaseDate.desc(), bottle.id.desc())
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        return PageableExecutionUtils.getPage(content, pageable,
            () -> queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne());
    }

    public BottleStatsDto getStats(Long userId) {
        var totals = queryFactory
            .select(bottle.count(), bottle.price.sum())
            .from(bottle)
            .where(bottle.user.id.eq(userId))
            .fetchOne();

        long totalCount = totals != null ? totals.get(bottle.count()) : 0L;
        long totalPrice = (totals != null && totals.get(bottle.price.sum()) != null)
            ? totals.get(bottle.price.sum()).longValue() : 0L;

        Long openedRaw = queryFactory
            .select(bottle.count())
            .from(bottle)
            .where(bottle.user.id.eq(userId), bottle.status.eq(BottleStatus.OPENED))
            .fetchOne();
        long openedCount = openedRaw != null ? openedRaw : 0L;

        List<BottleStatsDto.CategoryStat> categoryStats = queryFactory
            .select(Projections.constructor(BottleStatsDto.CategoryStat.class,
                bottle.category, bottle.count()))
            .from(bottle)
            .where(bottle.user.id.eq(userId))
            .groupBy(bottle.category)
            .fetch();

        return new BottleStatsDto(totalCount, totalPrice, openedCount,
            totalCount - openedCount, categoryStats);
    }

    private BooleanBuilder buildWhere(Long userId, SpiritCategory category,
                                      BottleStatus status, Boolean isPublic) {
        BooleanBuilder where = new BooleanBuilder();
        where.and(bottle.user.id.eq(userId));
        if (category != null) where.and(bottle.category.eq(category));
        if (status != null) where.and(bottle.status.eq(status));
        if (Boolean.TRUE.equals(isPublic)) where.and(bottle.isPublic.isTrue());
        return where;
    }
}
