package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.support.SpiritSearchTextNormalizer;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.search.engine.search.predicate.dsl.BooleanPredicateClausesStep;
import org.hibernate.search.engine.search.predicate.dsl.SearchPredicateFactory;
import org.hibernate.search.engine.search.query.SearchResult;
import org.hibernate.search.engine.search.sort.dsl.SearchSortFactory;
import org.hibernate.search.engine.search.sort.dsl.SortFinalStep;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class HibernateSpiritSearchService implements SpiritSearchService {

    private static final List<FieldBoost> COMPACT_FIELDS = List.of(
            new FieldBoost("searchTextKoCompact", 30.0f),
            new FieldBoost("searchTextEnCompact", 24.0f)
    );

    private static final List<TextFieldBoost> TEXT_FIELDS = List.of(
            new TextFieldBoost("nameKo", 8.0f, 3.0f),
            new TextFieldBoost("nameKo_ngram", 0.0f, 1.2f),
            new TextFieldBoost("nameEn", 6.0f, 2.4f),
            new TextFieldBoost("nameEn_ngram", 0.0f, 1.0f),
            new TextFieldBoost("seriesIdentifier", 6.0f, 2.4f),
            new TextFieldBoost("seriesIdentifier_ngram", 0.0f, 1.0f),
            new TextFieldBoost("seriesIdentifierEn", 5.0f, 2.0f),
            new TextFieldBoost("seriesIdentifierEn_ngram", 0.0f, 0.8f),
            new TextFieldBoost("variantValue", 5.0f, 2.0f),
            new TextFieldBoost("variantValue_ngram", 0.0f, 0.8f),
            new TextFieldBoost("variantValueEn", 4.0f, 1.6f),
            new TextFieldBoost("variantValueEn_ngram", 0.0f, 0.7f),
            new TextFieldBoost("producer.nameKo", 4.0f, 1.8f),
            new TextFieldBoost("producer.nameKo_ngram", 0.0f, 0.8f),
            new TextFieldBoost("producer.nameEn", 3.0f, 1.2f),
            new TextFieldBoost("producer.nameEn_ngram", 0.0f, 0.5f),
            new TextFieldBoost("producer.searchKeywords", 0.0f, 1.4f)
    );

    private static final List<FieldBoost> NUMBER_FIELDS = List.of(
            new FieldBoost("nameKo", 2.4f),
            new FieldBoost("nameKo_ngram", 1.2f),
            new FieldBoost("nameEn", 2.0f),
            new FieldBoost("nameEn_ngram", 1.0f),
            new FieldBoost("seriesIdentifier", 2.4f),
            new FieldBoost("seriesIdentifier_ngram", 1.2f),
            new FieldBoost("seriesIdentifierEn", 2.0f),
            new FieldBoost("seriesIdentifierEn_ngram", 1.0f),
            new FieldBoost("variantValue", 2.0f),
            new FieldBoost("variantValue_ngram", 1.0f),
            new FieldBoost("variantValueEn", 1.6f),
            new FieldBoost("variantValueEn_ngram", 0.8f)
    );

    private final EntityManager entityManager;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public Page<Long> searchSpiritIds(SpiritSearchCondition condition, Pageable pageable) {
        SearchSession searchSession = Search.session(entityManager);
        boolean hasKeyword = StringUtils.hasText(condition.keyword());

        SearchResult<Long> result = searchSession.search(Spirit.class)
                .select(f -> f.id(Long.class))
                .where(f -> f.bool(b -> {
                    if (condition.status() != null) {
                        b.must(f.match().field("status").matching(condition.status()));
                    }
                    b.must(f.match().field("hasParent").matching(false));

                    if (hasKeyword) {
                        applyKeywordPredicate(b, f, condition.keyword());
                    }

                    if (condition.category() != null) {
                        b.must(f.match().field("category").matching(condition.category()));
                    }
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

                    if (StringUtils.hasText(condition.country())) {
                        b.must(f.match().field("country").matching(condition.country()));
                    }
                    if (StringUtils.hasText(condition.region())) {
                        b.must(f.match().field("region").matching(condition.region()));
                    }
                    if (condition.producerId() != null) {
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
                .sort(f -> buildSearchSort(f, condition.sort(), hasKeyword))
                .fetch((int) pageable.getOffset(), pageable.getPageSize());

        return new PageImpl<>(result.hits(), pageable, result.total().hitCount());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SpiritAutocompleteResponse> autocompleteSpirits(String keyword) {
        if (!StringUtils.hasText(keyword) || keyword.trim().length() < 2) {
            return List.of();
        }

        String cleanKeyword = keyword.trim().toLowerCase(Locale.ROOT);
        String cacheKeyword = SpiritSearchTextNormalizer.compact(cleanKeyword);
        String redisKey = "autocomplete:v2:" + (StringUtils.hasText(cacheKeyword) ? cacheKeyword : cleanKeyword);

        try {
            String cachedJson = redisTemplate.opsForValue().get(redisKey);
            if (StringUtils.hasText(cachedJson)) {
                return objectMapper.readValue(cachedJson, new TypeReference<List<SpiritAutocompleteResponse>>() {});
            }
        } catch (Exception e) {
            log.error("Failed to read autocomplete cache from Redis", e);
        }

        SearchSession searchSession = Search.session(entityManager);
        SearchResult<Long> result = searchSession.search(Spirit.class)
                .select(f -> f.id(Long.class))
                .where(f -> f.bool(b -> {
                    b.must(f.match().field("status").matching(SpiritStatus.ACTIVE));
                    b.must(f.match().field("hasParent").matching(false));
                    applyKeywordPredicate(b, f, cleanKeyword);
                }))
                .sort(f -> f.composite(c -> {
                    c.add(f.score().desc());
                    c.add(f.field("createdAt").desc());
                }))
                .fetch(0, 10);

        List<Long> ids = result.hits();
        if (ids.isEmpty()) {
            return List.of();
        }

        List<SpiritAutocompleteResponse> autocompleteList = entityManager.createQuery(
                "select new com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse(" +
                        "s.id, s.nameKo, s.nameEn, s.seriesIdentifier, s.seriesIdentifierEn, s.category, " +
                        "(select max(si.imageUrl) from SpiritImage si where si.spirit.id = s.id and si.sortOrder = 0), " +
                        "s.variantType, s.variantValue, s.variantValueEn " +
                        ") from Spirit s where s.id in :ids", SpiritAutocompleteResponse.class)
                .setParameter("ids", ids)
                .getResultList();

        Map<Long, SpiritAutocompleteResponse> map = autocompleteList.stream()
                .collect(Collectors.toMap(SpiritAutocompleteResponse::id, Function.identity()));
        List<SpiritAutocompleteResponse> sortedList = ids.stream()
                .map(map::get)
                .filter(Objects::nonNull)
                .toList();

        try {
            String json = objectMapper.writeValueAsString(sortedList);
            redisTemplate.opsForValue().set(redisKey, json, Duration.ofMinutes(10));
        } catch (Exception e) {
            log.warn("Failed to write autocomplete cache to Redis", e);
        }

        return sortedList;
    }

    private SortFinalStep buildSearchSort(SearchSortFactory f, SpiritSort sort, boolean hasKeyword) {
        SpiritSort effectiveSort = sort != null ? sort : SpiritSort.LATEST;
        if (!hasKeyword) {
            return switch (effectiveSort) {
                case SCORE_DESC -> f.field("avgScore").desc();
                case REVIEW_COUNT_DESC -> f.field("reviewCount").desc();
                default -> f.field("createdAt").desc();
            };
        }
        return f.composite(c -> {
            if (effectiveSort == SpiritSort.SCORE_DESC) {
                c.add(f.field("avgScore").desc());
                c.add(f.score().desc());
            } else if (effectiveSort == SpiritSort.REVIEW_COUNT_DESC) {
                c.add(f.field("reviewCount").desc());
                c.add(f.score().desc());
            } else {
                c.add(f.score().desc());
            }
            c.add(f.field("createdAt").desc());
        });
    }

    private void applyKeywordPredicate(BooleanPredicateClausesStep<?> target,
                                       SearchPredicateFactory f,
                                       String keyword) {
        SpiritSearchTextNormalizer.KeywordParts parts = SpiritSearchTextNormalizer.parts(keyword);
        if (!parts.hasToken()) {
            return;
        }

        target.must(f.bool(keywordBool -> {
            if (parts.hasCompact()) {
                keywordBool.should(f.bool(compactBool -> {
                    addCompactMatches(compactBool, f, parts.compact());
                    compactBool.minimumShouldMatchNumber(1);
                }));
            }
            keywordBool.should(f.bool(tokenGroupBool -> {
                for (String token : parts.textTokens()) {
                    tokenGroupBool.must(f.bool(tokenBool -> {
                        addTextMatches(tokenBool, f, token);
                        tokenBool.minimumShouldMatchNumber(1);
                    }));
                }
                boolean requireNumberTokens = parts.textTokens().isEmpty();
                for (String token : parts.numberTokens()) {
                    var numberPredicate = f.bool(tokenBool -> {
                        addNumberMatches(tokenBool, f, token);
                        tokenBool.minimumShouldMatchNumber(1);
                    });
                    if (requireNumberTokens) {
                        tokenGroupBool.must(numberPredicate);
                    } else {
                        tokenGroupBool.should(numberPredicate);
                    }
                }
            }));
            keywordBool.minimumShouldMatchNumber(1);
        }));
    }

    private void addCompactMatches(BooleanPredicateClausesStep<?> target,
                                   SearchPredicateFactory f,
                                   String compactKeyword) {
        String pattern = "*" + compactKeyword + "*";
        for (FieldBoost field : COMPACT_FIELDS) {
            target.should(f.wildcard().field(field.name()).matching(pattern).boost(field.boost()));
        }
    }

    private void addTextMatches(BooleanPredicateClausesStep<?> target,
                                SearchPredicateFactory f,
                                String token) {
        for (TextFieldBoost field : TEXT_FIELDS) {
            if (field.phraseBoost() > 0.0f) {
                target.should(f.phrase().field(field.name()).matching(token).boost(field.phraseBoost()));
            }
            target.should(f.match().field(field.name()).matching(token).boost(field.matchBoost()));
        }
    }

    private void addNumberMatches(BooleanPredicateClausesStep<?> target,
                                  SearchPredicateFactory f,
                                  String token) {
        for (FieldBoost field : NUMBER_FIELDS) {
            target.should(f.match().field(field.name()).matching(token).boost(field.boost()));
            target.should(f.match().field(field.name()).matching(token).skipAnalysis().boost(field.boost() + 0.4f));
        }
    }

    private record FieldBoost(String name, float boost) {
    }

    private record TextFieldBoost(String name, float phraseBoost, float matchBoost) {
    }
}
