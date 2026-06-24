package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.search.engine.search.query.SearchResult;
import org.hibernate.search.engine.search.sort.dsl.SearchSortFactory;
import org.hibernate.search.mapper.orm.Search;
import org.hibernate.search.mapper.orm.session.SearchSession;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HibernateSpiritSearchService implements SpiritSearchService {

    private final EntityManager entityManager;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<Long> searchSpiritIds(SpiritSearchCondition condition, Pageable pageable) {
        SearchSession searchSession = Search.session(entityManager);

        SearchResult<Long> result = searchSession.search(Spirit.class)
                .select(f -> f.id(Long.class))
                .where(f -> f.bool(b -> {
                    // 1. 기본 필터: status 및 parent 가 없는 마스터 제품
                    if (condition.status() != null) {
                        b.must(f.match().field("status").matching(condition.status()));
                    }
                    b.must(f.match().field("hasParent").matching(false));

                    // 2. 키워드 검색 (글렌알라키 12년 등 다양한 패턴 매칭)
                    if (StringUtils.hasText(condition.keyword())) {
                        b.must(f.bool(kb -> {
                            // 한글명 형태소 및 ngram 검색
                            kb.should(f.match().field("nameKo").matching(condition.keyword()).boost(2.0f));
                            kb.should(f.match().field("nameKo_ngram").matching(condition.keyword()).boost(1.0f));

                            // 영문명 형태소 및 ngram 검색
                            kb.should(f.match().field("nameEn").matching(condition.keyword()).boost(1.5f));
                            kb.should(f.match().field("nameEn_ngram").matching(condition.keyword()).boost(0.8f));

                            // 생산자 정보 매칭
                            kb.should(f.match().field("producer.nameKo").matching(condition.keyword()).boost(1.5f));
                            kb.should(f.match().field("producer.nameKo_ngram").matching(condition.keyword()).boost(0.8f));
                            kb.should(f.match().field("producer.nameEn").matching(condition.keyword()).boost(1.0f));
                            kb.should(f.match().field("producer.nameEn_ngram").matching(condition.keyword()).boost(0.5f));
                            kb.should(f.match().field("producer.searchKeywords").matching(condition.keyword()).boost(1.2f));
                        }));
                    }

                    // 3. 카테고리 필터
                    if (condition.category() != null) {
                        b.must(f.match().field("category").matching(condition.category()));
                    }

                    // 4. 서브타입 상세 필터 (위스키, 와인, 꼬냑 등)
                    if (condition.hasWhiskyStyle()) {
                        b.must(f.bool(sb -> {
                            for (var style : condition.whiskyStyles()) {
                                sb.should(f.match().field("whiskyDetail.style").matching(style));
                            }
                        }));
                    }
                    if (condition.hasWineType()) {
                        b.must(f.bool(sb -> {
                            for (var type : condition.wineTypes()) {
                                sb.should(f.match().field("wineDetail.wineType").matching(type));
                            }
                        }));
                    }
                    if (condition.hasWineSweetness()) {
                        b.must(f.bool(sb -> {
                            for (var sweetness : condition.wineSweetness()) {
                                sb.should(f.match().field("wineDetail.sweetness").matching(sweetness));
                            }
                        }));
                    }
                    if (condition.hasWineBody()) {
                        b.must(f.bool(sb -> {
                            for (var body : condition.wineBody()) {
                                sb.should(f.match().field("wineDetail.body").matching(body));
                            }
                        }));
                    }
                    if (condition.hasWineAcidity()) {
                        b.must(f.bool(sb -> {
                            for (var acidity : condition.wineAcidity()) {
                                sb.should(f.match().field("wineDetail.acidity").matching(acidity));
                            }
                        }));
                    }
                    if (condition.hasWineTannin()) {
                        b.must(f.bool(sb -> {
                            for (var tannin : condition.wineTannin()) {
                                sb.should(f.match().field("wineDetail.tannin").matching(tannin));
                            }
                        }));
                    }
                    if (condition.hasCognacGrade()) {
                        b.must(f.bool(sb -> {
                            for (var grade : condition.cognacGrades()) {
                                sb.should(f.match().field("cognacDetail.grade").matching(grade));
                            }
                        }));
                    }

                    // 5. RDBMS 범위 및 국가/지역 필터
                    if (StringUtils.hasText(condition.country())) {
                        b.must(f.match().field("country").matching(condition.country()));
                    }
                    if (StringUtils.hasText(condition.region())) {
                        b.must(f.match().field("region").matching(condition.region()));
                    }
                    if (condition.producerId() != null) {
                        // Embedded Entity 의 id 매핑 매칭
                        b.must(f.match().field("producer.id").matching(condition.producerId()));
                    }
                    if (condition.minAbv() != null) {
                        b.must(f.range().field("abv").atLeast(condition.minAbv()));
                    }
                    if (condition.maxAbv() != null) {
                        b.must(f.range().field("abv").atMost(condition.maxAbv()));
                    }
                    if (condition.minScore() != null) {
                        b.must(f.range().field("avgScore").atLeast(condition.minScore()));
                    }
                    if (condition.maxScore() != null) {
                        b.must(f.range().field("avgScore").atMost(condition.maxScore()));
                    }
                }))
                .sort(f -> {
                    SpiritSort sort = condition.sort();
                    if (sort == null) {
                        return f.field("createdAt").desc();
                    }
                    return switch (sort) {
                        case SCORE_DESC -> f.field("avgScore").desc();
                        case REVIEW_COUNT_DESC -> f.field("reviewCount").desc();
                        default -> f.field("createdAt").desc();
                    };
                })
                .fetch((int) pageable.getOffset(), pageable.getPageSize());

        return new PageImpl<>(result.hits(), pageable, result.total().hitCount());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpiritAutocompleteResponse> autocompleteSpirits(String keyword) {
        if (!StringUtils.hasText(keyword) || keyword.trim().length() < 2) {
            return List.of();
        }

        String cleanKeyword = keyword.trim().toLowerCase();
        String redisKey = "autocomplete:" + cleanKeyword;

        // 1. Redis 캐시 확인
        try {
            String cachedJson = redisTemplate.opsForValue().get(redisKey);
            if (StringUtils.hasText(cachedJson)) {
                return objectMapper.readValue(cachedJson, new TypeReference<List<SpiritAutocompleteResponse>>() {});
            }
        } catch (Exception e) {
            log.error("Failed to read autocomplete cache from Redis", e);
        }

        // 2. Lucene 검색 (상위 10개 ID 조회)
        SearchSession searchSession = Search.session(entityManager);
        SearchResult<Long> result = searchSession.search(Spirit.class)
                .select(f -> f.id(Long.class))
                .where(f -> f.bool(b -> {
                    b.must(f.match().field("status").matching(SpiritStatus.ACTIVE));
                    b.must(f.match().field("hasParent").matching(false));
                    b.must(f.bool(kb -> {
                        kb.should(f.match().field("nameKo").matching(cleanKeyword).boost(2.0f));
                        kb.should(f.match().field("nameKo_ngram").matching(cleanKeyword).boost(1.0f));
                        kb.should(f.match().field("nameEn").matching(cleanKeyword).boost(1.5f));
                        kb.should(f.match().field("nameEn_ngram").matching(cleanKeyword).boost(0.8f));
                        kb.should(f.match().field("producer.nameKo").matching(cleanKeyword).boost(1.5f));
                        kb.should(f.match().field("producer.nameKo_ngram").matching(cleanKeyword).boost(0.8f));
                        kb.should(f.match().field("producer.nameEn").matching(cleanKeyword).boost(1.0f));
                        kb.should(f.match().field("producer.nameEn_ngram").matching(cleanKeyword).boost(0.5f));
                        kb.should(f.match().field("producer.searchKeywords").matching(cleanKeyword).boost(1.2f));
                    }));
                }))
                .fetch(0, 10);

        List<Long> ids = result.hits();
        if (ids.isEmpty()) {
            return List.of();
        }

        // 3. DB 경량 쿼리 수행 (JPQL 생성자 프로젝션 활용)
        List<SpiritAutocompleteResponse> autocompleteList = entityManager.createQuery(
                "select new com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse(" +
                "s.id, s.nameKo, s.nameEn, s.category, " +
                "(select max(si.imageUrl) from SpiritImage si where si.spirit.id = s.id and si.sortOrder = 0) " +
                ") from Spirit s where s.id in :ids", SpiritAutocompleteResponse.class)
                .setParameter("ids", ids)
                .getResultList();


        // 4. Lucene 스코어 순서(ids 순서)로 정렬 복원
        Map<Long, SpiritAutocompleteResponse> map = autocompleteList.stream()
                .collect(Collectors.toMap(SpiritAutocompleteResponse::id, Function.identity()));
        List<SpiritAutocompleteResponse> sortedList = ids.stream()
                .map(map::get)
                .filter(Objects::nonNull)
                .toList();

        // 5. Redis 캐싱 적용 (10분 만료)
        try {
            String json = objectMapper.writeValueAsString(sortedList);
            redisTemplate.opsForValue().set(redisKey, json, Duration.ofMinutes(10));
        } catch (Exception e) {
            log.warn("Failed to write autocomplete cache to Redis", e);
        }

        return sortedList;
    }
}
