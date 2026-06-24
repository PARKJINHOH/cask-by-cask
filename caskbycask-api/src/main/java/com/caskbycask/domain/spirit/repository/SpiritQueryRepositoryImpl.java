package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.QSpirit;
import com.caskbycask.domain.spirit.entity.QSpiritCognacDetail;
import com.caskbycask.domain.spirit.entity.QSpiritImage;
import com.caskbycask.domain.spirit.entity.QSpiritOtherDetail;
import com.caskbycask.domain.spirit.entity.QSpiritWhiskyDetail;
import com.caskbycask.domain.spirit.entity.QSpiritWineDetail;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.producer.entity.QProducer;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.Tuple;
import com.querydsl.jpa.impl.JPAQuery;
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
        return search(condition, pageable, false);
    }

    @Override
    public Page<SpiritListResponse> searchForAdmin(SpiritSearchCondition condition, Pageable pageable) {
        return search(condition, pageable, true);
    }

    private Page<SpiritListResponse> search(SpiritSearchCondition condition, Pageable pageable, boolean includeStyle) {
        QSpirit spirit = QSpirit.spirit;
        QSpiritImage image = QSpiritImage.spiritImage;
        QProducer producer = QProducer.producer;

        BooleanBuilder predicate = buildPredicate(condition, spirit, producer);
        OrderSpecifier<?> order = buildOrder(condition.sort(), spirit);
        boolean hasKeyword = StringUtils.hasText(condition.keyword());

        // ── 1. 데이터 조회 (producer fetch join + 서브타입 조건부 join) ─
        //  키워드 검색 시 생산자명/검색별칭(예: 카뮈↔까뮤)도 매칭하도록 producer 를 alias join
        JPAQuery<Spirit> dataQuery = queryFactory
                .selectFrom(spirit)
                .leftJoin(spirit.producer, producer).fetchJoin();
        if (includeStyle) {
            applyStyleFetchJoin(dataQuery, spirit);
        } else {
            applySubTypeJoin(dataQuery, condition, spirit);
        }
        List<Spirit> spirits = dataQuery
                .where(predicate)
                .orderBy(order)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // ── 2. COUNT 분리 쿼리 ─────────────────────────────────
        JPAQuery<Long> countQuery = queryFactory.select(spirit.count()).from(spirit);
        if (hasKeyword) {
            countQuery.leftJoin(spirit.producer, producer);
        }
        applySubTypeJoin(countQuery, condition, spirit);
        Long total = countQuery.where(predicate).fetchOne();

        // ── 3. 대표 이미지 IN 배치 조회 ────────────────────────
        Map<Long, String> primaryImages = fetchPrimaryImages(spirits, image);

        // ── 4. DTO 변환 ────────────────────────────────────────
        List<SpiritListResponse> content = spirits.stream()
                .map(s -> includeStyle
                        ? SpiritListResponse.ofWithStyle(s, primaryImages.get(s.getId()))
                        : SpiritListResponse.of(s, primaryImages.get(s.getId())))
                .toList();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    private void applyStyleFetchJoin(JPAQuery<Spirit> query, QSpirit spirit) {
        query.leftJoin(spirit.whiskyDetail, QSpiritWhiskyDetail.spiritWhiskyDetail).fetchJoin();
        query.leftJoin(spirit.wineDetail, QSpiritWineDetail.spiritWineDetail).fetchJoin();
        query.leftJoin(spirit.cognacDetail, QSpiritCognacDetail.spiritCognacDetail).fetchJoin();
        query.leftJoin(spirit.otherDetail, QSpiritOtherDetail.spiritOtherDetail).fetchJoin();
    }

    // ── 서브타입 join (필터가 있을 때만 join 추가, fetch join은 사용하지 않음) ──

    private void applySubTypeJoin(JPAQuery<?> query, SpiritSearchCondition cond, QSpirit spirit) {
        if (cond.hasWhiskyStyle()) {
            QSpiritWhiskyDetail whisky = QSpiritWhiskyDetail.spiritWhiskyDetail;
            query.leftJoin(spirit.whiskyDetail, whisky);
        }
        if (cond.hasWineType() || cond.hasWineSensory()) {
            QSpiritWineDetail wine = QSpiritWineDetail.spiritWineDetail;
            query.leftJoin(spirit.wineDetail, wine);
        }
        if (cond.hasCognacGrade()) {
            QSpiritCognacDetail cognac = QSpiritCognacDetail.spiritCognacDetail;
            query.leftJoin(spirit.cognacDetail, cognac);
        }
    }

    // ── 동적 조건 빌더 ─────────────────────────────────────────

    private BooleanBuilder buildPredicate(SpiritSearchCondition cond, QSpirit spirit, QProducer producer) {
        BooleanBuilder builder = new BooleanBuilder();
        if (cond.status() != null) {
            builder.and(spirit.status.eq(cond.status()));
        }

        // 하위 에디션(자식 스피릿)은 카탈로그에서 제외
        builder.and(spirit.parent.isNull());

        if (StringUtils.hasText(cond.keyword())) {
            // 술 이름 + 생산자명/검색별칭(한글 음차 변형 등)까지 매칭
            builder.and(
                    spirit.nameKo.containsIgnoreCase(cond.keyword())
                            .or(spirit.nameEn.containsIgnoreCase(cond.keyword()))
                            .or(producer.nameKo.containsIgnoreCase(cond.keyword()))
                            .or(producer.nameEn.containsIgnoreCase(cond.keyword()))
                            .or(producer.searchKeywords.containsIgnoreCase(cond.keyword()))
            );
        }
        if (cond.category() != null) {
            builder.and(spirit.category.eq(cond.category()));
        }
        if (cond.hasWhiskyStyle()) {
            builder.and(QSpiritWhiskyDetail.spiritWhiskyDetail.style.in(cond.whiskyStyles()));
        }
        if (cond.hasWineType()) {
            builder.and(QSpiritWineDetail.spiritWineDetail.wineType.in(cond.wineTypes()));
        }
        if (cond.hasWineSweetness()) {
            builder.and(QSpiritWineDetail.spiritWineDetail.sweetness.in(cond.wineSweetness()));
        }
        if (cond.hasWineBody()) {
            builder.and(QSpiritWineDetail.spiritWineDetail.body.in(cond.wineBody()));
        }
        if (cond.hasWineAcidity()) {
            builder.and(QSpiritWineDetail.spiritWineDetail.acidity.in(cond.wineAcidity()));
        }
        if (cond.hasWineTannin()) {
            builder.and(QSpiritWineDetail.spiritWineDetail.tannin.in(cond.wineTannin()));
        }
        if (cond.hasCognacGrade()) {
            builder.and(QSpiritCognacDetail.spiritCognacDetail.grade.in(cond.cognacGrades()));
        }
        if (StringUtils.hasText(cond.country())) {
            builder.and(spirit.country.eq(cond.country()));
        }
        if (StringUtils.hasText(cond.region())) {
            builder.and(spirit.region.eq(cond.region()));
        }
        if (cond.producerId() != null) {
            builder.and(spirit.producer.id.eq(cond.producerId()));
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

    @Override
    public List<SpiritListResponse> findListByIds(List<Long> ids, boolean includeStyle) {
        if (ids.isEmpty()) return List.of();

        QSpirit spirit = QSpirit.spirit;
        QSpiritImage image = QSpiritImage.spiritImage;
        QProducer producer = QProducer.producer;

        // 1. Entity 조회 (Fetch Join)
        JPAQuery<Spirit> query = queryFactory
                .selectFrom(spirit)
                .leftJoin(spirit.producer, producer).fetchJoin();

        if (includeStyle) {
            applyStyleFetchJoin(query, spirit);
        }

        List<Spirit> spirits = query
                .where(spirit.id.in(ids))
                .fetch();

        // 2. 검색 엔진 순서(ids)대로 결과 재정렬
        Map<Long, Spirit> spiritMap = spirits.stream()
                .collect(Collectors.toMap(Spirit::getId, s -> s));
        List<Spirit> sortedSpirits = ids.stream()
                .map(spiritMap::get)
                .filter(java.util.Objects::nonNull)
                .toList();

        // 3. 대표 이미지 배치 조회
        Map<Long, String> primaryImages = fetchPrimaryImages(sortedSpirits, image);

        // 4. DTO 변환
        return sortedSpirits.stream()
                .map(s -> includeStyle
                        ? SpiritListResponse.ofWithStyle(s, primaryImages.get(s.getId()))
                        : SpiritListResponse.of(s, primaryImages.get(s.getId())))
                .toList();
    }
}
