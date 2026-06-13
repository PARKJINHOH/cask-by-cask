package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class SpiritQueryRepositoryTest {

    @Autowired
    private SpiritRepository spiritRepository;

    @Autowired
    private ProducerRepository producerRepository;

    private Producer producer;
    private PageRequest page;

    @BeforeEach
    void setUp() {
        producer = producerRepository.save(Producer.builder()
                .nameKo("글렌피딕").nameEn("Glenfiddich")
                .country("Scotland").region("Speyside").build());

        spiritRepository.save(spirit("글렌피딕 12년", "Glenfiddich 12", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("40.0"), new BigDecimal("88.0"), 150, producer));
        spiritRepository.save(spirit("글렌피딕 18년", "Glenfiddich 18", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("43.0"), new BigDecimal("92.0"), 250, producer));
        spiritRepository.save(spirit("헤네시 VSOP", "Hennessy VSOP", SpiritCategory.COGNAC,
                "France", new BigDecimal("40.0"), new BigDecimal("85.0"), 80, null));
        spiritRepository.save(spirit("기타 스피릿", "Other Spirit", SpiritCategory.OTHER,
                "Mexico", new BigDecimal("38.0"), null, 60, null));

        Spirit hidden = spirit("숨김술", "Hidden Spirit", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("40.0"), null, 10, null);
        hidden.hide();
        spiritRepository.save(hidden);

        page = PageRequest.of(0, 20);
    }

    @Test
    @DisplayName("전체 조회 — ACTIVE 상태만 반환")
    void searchAll_returnsOnlyActive() {
        Page<SpiritListResponse> result = search(condition().build());
        assertThat(result.getTotalElements()).isEqualTo(4);
    }

    @Test
    @DisplayName("카테고리 필터")
    void searchByCategory() {
        Page<SpiritListResponse> result = search(condition()
                .category(SpiritCategory.WHISKY).build());
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).allMatch(r -> r.category() == SpiritCategory.WHISKY);
    }

    @Test
    @DisplayName("국가 필터")
    void searchByCountry() {
        Page<SpiritListResponse> result = search(condition()
                .country("Scotland").build());
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).allMatch(r -> "Scotland".equals(r.country()));
    }

    @Test
    @DisplayName("도수 범위 필터 (minAbv=40, maxAbv=42)")
    void searchByAbvRange() {
        Page<SpiritListResponse> result = search(condition()
                .minAbv(new BigDecimal("40.0")).maxAbv(new BigDecimal("42.0")).build());
        assertThat(result.getContent()).allMatch(r ->
                r.abv() != null
                && r.abv().compareTo(new BigDecimal("40.0")) >= 0
                && r.abv().compareTo(new BigDecimal("42.0")) <= 0);
    }

    @Test
    @DisplayName("점수 범위 필터 — avgScore null인 항목 제외")
    void searchByScoreRange() {
        Page<SpiritListResponse> result = search(condition()
                .minScore(new BigDecimal("87.0")).maxScore(new BigDecimal("95.0")).build());
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).allMatch(r ->
                r.avgScore() != null
                && r.avgScore().compareTo(new BigDecimal("87.0")) >= 0
                && r.avgScore().compareTo(new BigDecimal("95.0")) <= 0);
    }

    @Test
    @DisplayName("키워드 검색 — nameKo 부분 일치")
    void searchByKeywordKo() {
        Page<SpiritListResponse> result = search(condition().keyword("글렌").build());
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("키워드 검색 — nameEn 대소문자 무시")
    void searchByKeywordEnCaseInsensitive() {
        Page<SpiritListResponse> result = search(condition().keyword("hennessy").build());
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).nameEn()).isEqualTo("Hennessy VSOP");
    }

    @Test
    @DisplayName("정렬 — SCORE_DESC")
    void sortByScoreDesc() {
        Page<SpiritListResponse> result = search(condition()
                .sort(SpiritSort.SCORE_DESC).build());
        var scores = result.getContent().stream()
                .map(SpiritListResponse::avgScore)
                .filter(s -> s != null)
                .toList();
        for (int i = 0; i < scores.size() - 1; i++) {
            assertThat(scores.get(i)).isGreaterThanOrEqualTo(scores.get(i + 1));
        }
    }

    @Test
    @DisplayName("정렬 — REVIEW_COUNT_DESC")
    void sortByReviewCountDesc() {
        Page<SpiritListResponse> result = search(condition()
                .sort(SpiritSort.REVIEW_COUNT_DESC).build());
        var counts = result.getContent().stream()
                .map(SpiritListResponse::reviewCount).toList();
        for (int i = 0; i < counts.size() - 1; i++) {
            assertThat(counts.get(i)).isGreaterThanOrEqualTo(counts.get(i + 1));
        }
    }

    @Test
    @DisplayName("복합 필터 — 카테고리 + 국가")
    void searchByCategoryAndCountry() {
        Page<SpiritListResponse> result = search(condition()
                .category(SpiritCategory.WHISKY).country("Scotland").build());
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("status 파라미터 미지정(null) 시 전체 상태 반환 — 관리자 전용")
    void searchWithNullStatus_returnsAllStatuses() {
        SpiritSearchCondition cond = new SpiritSearchCondition(
                null, null, null, null, null, null, null,
                null, null, null, null, null, null, null);
        assertThat(cond.status()).isNull();
        Page<SpiritListResponse> result = spiritRepository.search(cond, page);
        assertThat(result.getTotalElements()).isEqualTo(5);
    }

    @Test
    @DisplayName("페이지네이션")
    void pagination() {
        PageRequest firstPage = PageRequest.of(0, 2);
        Page<SpiritListResponse> result = spiritRepository.search(condition().build(), firstPage);
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getTotalPages()).isEqualTo(2);
    }

    // ── Helpers ───────────────────────────────────────────

    private Page<SpiritListResponse> search(SpiritSearchCondition condition) {
        return spiritRepository.search(condition, page);
    }

    private ConditionBuilder condition() {
        return new ConditionBuilder();
    }

    private Spirit spirit(String nameKo, String nameEn, SpiritCategory category,
                          String country, BigDecimal abv, BigDecimal avgScore,
                          int reviewCount, Producer producer) {
        Spirit s = Spirit.builder()
                .nameKo(nameKo).nameEn(nameEn).category(category)
                .country(country).abv(abv).producer(producer).build();
        s.approve();
        s.updateAvgScore(avgScore, reviewCount);
        return s;
    }

    private static class ConditionBuilder {
        private String keyword;
        private SpiritCategory category;
        private String country;
        private BigDecimal minAbv;
        private BigDecimal maxAbv;
        private BigDecimal minScore;
        private BigDecimal maxScore;
        private SpiritSort sort;

        ConditionBuilder keyword(String v)  { keyword = v;  return this; }
        ConditionBuilder category(SpiritCategory v) { category = v; return this; }
        ConditionBuilder country(String v)  { country = v;  return this; }
        ConditionBuilder minAbv(BigDecimal v) { minAbv = v; return this; }
        ConditionBuilder maxAbv(BigDecimal v) { maxAbv = v; return this; }
        ConditionBuilder minScore(BigDecimal v) { minScore = v; return this; }
        ConditionBuilder maxScore(BigDecimal v) { maxScore = v; return this; }
        ConditionBuilder sort(SpiritSort v) { sort = v; return this; }

        SpiritSearchCondition build() {
            return new SpiritSearchCondition(
                    keyword, category, null, null, null,
                    country, null, null, minAbv, maxAbv,
                    minScore, maxScore, SpiritStatus.ACTIVE, sort);
        }
    }
}
