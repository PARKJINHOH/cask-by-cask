package com.caskbycask.domain.bottlecollection.repository;

import com.caskbycask.domain.bottlecollection.dto.BottleStatsDto;
import com.caskbycask.domain.bottlecollection.dto.UserBottleSortKey;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.QUserBottle;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.spirit.entity.QSpirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.core.types.dsl.StringExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserBottleQueryRepository {

    private final JPAQueryFactory queryFactory;
    private static final QUserBottle bottle = QUserBottle.userBottle;
    private static final QSpirit spirit = new QSpirit("bottleSpirit");
    private static final QSpirit parentSpirit = new QSpirit("bottleParentSpirit");

    public Page<UserBottle> findByUser(Long userId, SpiritCategory category,
                                       BottleStatus status, LocalDate startDate,
                                       LocalDate endDate, UserBottleSortKey sortKey,
                                       Sort.Direction sortDirection, String lang,
                                       Pageable pageable) {
        BooleanBuilder where = buildWhere(userId, category, status, null, startDate, endDate);
        Order order = sortDirection == Sort.Direction.ASC ? Order.ASC : Order.DESC;
        List<OrderSpecifier<?>> orderSpecifiers = new ArrayList<>();
        orderSpecifiers.add(primaryOrder(sortKey, order, lang));
        if (sortKey == UserBottleSortKey.NAME) {
            // 화면 제목은 이름 + 시리즈 + 에디션 값 순서이므로 같은 순서로 정렬한다.
            // 값이 없는 정규 제품은 빈 문자열로 취급해 일반 문자열 정렬과 동일하게 둔다.
            orderSpecifiers.add(new OrderSpecifier<>(order, localizedSeriesIdentifier(lang).coalesce("")));
            orderSpecifiers.add(new OrderSpecifier<>(order, localizedVariantValue(lang).coalesce("")));
        }
        orderSpecifiers.add(new OrderSpecifier<>(order, bottle.id));

        return findPage(where, pageable, orderSpecifiers.toArray(OrderSpecifier[]::new));
    }

    private Page<UserBottle> findPage(BooleanBuilder where, Pageable pageable,
                                      OrderSpecifier<?>... orderSpecifiers) {
        List<Long> pageIds = queryFactory
            .select(bottle.id)
            .from(bottle)
            .leftJoin(bottle.spirit, spirit)
            .leftJoin(spirit.parent, parentSpirit)
            .where(where)
            .orderBy(orderSpecifiers)
            .offset(pageable.getOffset())
            .limit(pageable.getPageSize())
            .fetch();

        if (pageIds.isEmpty()) {
            Long total = queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne();
            return new PageImpl<>(List.of(), pageable, total != null ? total : 0L);
        }

        // 페이지 대상 ID를 먼저 확정한 뒤 연관 데이터를 한 번에 가져온다. 컬렉션 fetch join과
        // DB 페이지네이션을 직접 결합하지 않아 중복/인메모리 페이지네이션과 N+1을 모두 피한다.
        List<UserBottle> fetched = queryFactory
            .selectFrom(bottle)
            .distinct()
            .leftJoin(bottle.spirit, spirit).fetchJoin()
            .leftJoin(spirit.parent, parentSpirit).fetchJoin()
            .leftJoin(bottle.images).fetchJoin()
            // ID 선조회와 동일하게 2차 조회에도 사용자·필터 조건을 다시 강제한다.
            .where(where, bottle.id.in(pageIds))
            .fetch();
        Map<Long, UserBottle> byId = fetched.stream()
            .collect(Collectors.toMap(
                UserBottle::getId,
                Function.identity(),
                (existing, ignored) -> existing));
        List<UserBottle> content = pageIds.stream()
            .map(byId::get)
            .filter(java.util.Objects::nonNull)
            .toList();

        return PageableExecutionUtils.getPage(content, pageable,
            () -> queryFactory.select(bottle.count()).from(bottle).where(where).fetchOne());
    }

    public Page<UserBottle> findPublicByUser(Long userId, SpiritCategory category, Integer year, Pageable pageable) {
        LocalDate startDate = year != null ? LocalDate.of(year, 1, 1) : null;
        LocalDate endDate = year != null ? LocalDate.of(year, 12, 31) : null;
        BooleanBuilder where = buildWhere(userId, category, null, true, startDate, endDate);
        return findPage(where, pageable, bottle.purchaseDate.desc().nullsLast(), bottle.id.desc());
    }

    public BottleStatsDto getStats(Long userId, SpiritCategory category, BottleStatus status,
                                   LocalDate startDate, LocalDate endDate) {
        BooleanBuilder where = buildWhere(userId, category, status, null, startDate, endDate);

        var totals = queryFactory
            .select(bottle.count(), bottle.price.sum())
            .from(bottle)
            .where(where)
            .fetchOne();

        long totalCount = totals != null ? totals.get(bottle.count()) : 0L;
        long totalPrice = (totals != null && totals.get(bottle.price.sum()) != null)
            ? totals.get(bottle.price.sum()).longValue() : 0L;

        Long openedRaw = queryFactory
            .select(bottle.count())
            .from(bottle)
            .where(where, bottle.status.eq(BottleStatus.OPENED))
            .fetchOne();
        long openedCount = openedRaw != null ? openedRaw : 0L;

        List<BottleStatsDto.CategoryStat> categoryStats = queryFactory
            .select(Projections.constructor(BottleStatsDto.CategoryStat.class,
                bottle.category, bottle.count()))
            .from(bottle)
            .where(where)
            .groupBy(bottle.category)
            .fetch();

        return new BottleStatsDto(totalCount, totalPrice, openedCount,
            totalCount - openedCount, categoryStats);
    }

    public List<Integer> getPurchaseYears(Long userId, boolean publicOnly) {
        var yearExpression = Expressions.numberTemplate(Integer.class, "year({0})", bottle.purchaseDate);
        BooleanBuilder where = new BooleanBuilder()
            .and(bottle.user.id.eq(userId))
            .and(bottle.purchaseDate.isNotNull());
        if (publicOnly) where.and(bottle.isPublic.isTrue());

        return queryFactory
            .select(yearExpression)
            .from(bottle)
            .where(where)
            .distinct()
            .orderBy(yearExpression.desc())
            .fetch();
    }

    private BooleanBuilder buildWhere(Long userId, SpiritCategory category,
                                      BottleStatus status, Boolean isPublic,
                                      LocalDate startDate, LocalDate endDate) {
        BooleanBuilder where = new BooleanBuilder();
        // 모든 보관함 조회는 호출자의 userId 조건을 쿼리 자체에서 강제한다.
        where.and(bottle.user.id.eq(userId));
        if (category != null) where.and(bottle.category.eq(category));
        if (status != null) where.and(bottle.status.eq(status));
        if (Boolean.TRUE.equals(isPublic)) where.and(bottle.isPublic.isTrue());
        if (startDate != null) where.and(bottle.purchaseDate.goe(startDate));
        if (endDate != null) where.and(bottle.purchaseDate.loe(endDate));
        return where;
    }

    private OrderSpecifier<?> primaryOrder(UserBottleSortKey sortKey, Order order, String lang) {
        UserBottleSortKey safeSortKey = sortKey != null ? sortKey : UserBottleSortKey.PURCHASE_DATE;
        return switch (safeSortKey) {
            case NAME -> new OrderSpecifier<>(order, localizedName(lang), OrderSpecifier.NullHandling.NullsLast);
            case CATEGORY -> new OrderSpecifier<>(order, bottle.category);
            case PURCHASE_DATE -> new OrderSpecifier<>(order, bottle.purchaseDate,
                OrderSpecifier.NullHandling.NullsLast);
            case PRICE -> new OrderSpecifier<>(order, bottle.price, OrderSpecifier.NullHandling.NullsLast);
            case STATUS -> new OrderSpecifier<>(order, bottle.status);
            case VISIBILITY -> new OrderSpecifier<>(order, bottle.isPublic);
        };
    }

    private StringExpression localizedName(String lang) {
        StringExpression registeredName = "en".equalsIgnoreCase(lang)
            ? new CaseBuilder()
                .when(spirit.nameEn.isNotNull().and(spirit.nameEn.ne("")))
                .then(spirit.nameEn)
                .otherwise(spirit.nameKo)
            : spirit.nameKo;
        return new CaseBuilder()
            .when(spirit.id.isNotNull())
            .then(registeredName)
            .otherwise(bottle.spiritNameText);
    }

    private StringExpression localizedSeriesIdentifier(String lang) {
        if ("en".equalsIgnoreCase(lang)) {
            return new CaseBuilder()
                .when(spirit.seriesIdentifierEn.isNotNull().and(spirit.seriesIdentifierEn.ne("")))
                .then(spirit.seriesIdentifierEn)
                .when(parentSpirit.seriesIdentifierEn.isNotNull().and(parentSpirit.seriesIdentifierEn.ne("")))
                .then(parentSpirit.seriesIdentifierEn)
                .when(spirit.seriesIdentifier.isNotNull().and(spirit.seriesIdentifier.ne("")))
                .then(spirit.seriesIdentifier)
                .otherwise(parentSpirit.seriesIdentifier);
        }
        return new CaseBuilder()
            .when(spirit.seriesIdentifier.isNotNull().and(spirit.seriesIdentifier.ne("")))
            .then(spirit.seriesIdentifier)
            .otherwise(parentSpirit.seriesIdentifier);
    }

    private StringExpression localizedVariantValue(String lang) {
        return "en".equalsIgnoreCase(lang)
            ? new CaseBuilder()
                .when(spirit.variantValueEn.isNotNull().and(spirit.variantValueEn.ne("")))
                .then(spirit.variantValueEn)
                .otherwise(spirit.variantValue)
            : spirit.variantValue;
    }
}
