package com.caskbycask.domain.spirit.repository;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
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
                null, null, null, null, null, null, null,
                null, null, null, null);
        assertThat(cond.status()).isNull();
        Page<SpiritListResponse> result = spiritRepository.search(cond, page);
        assertThat(result.getTotalElements()).isEqualTo(5);
    }

    @Test
    @DisplayName("대표 에디션 — 목록 카드는 표시 순서의 마지막 에디션으로 링크한다")
    void canonicalPathPointsToLastDisplayedVariant() {
        Spirit master = spiritRepository.save(spirit("아드벡 우거다일", "Ardbeg Uigeadail",
                SpiritCategory.WHISKY, "Scotland", new BigDecimal("54.2"), null, 0, producer));
        // 저장 순서를 표시 순서와 다르게 섞어, 등록 순이 아니라 displayOrder 가 기준임을 확인한다
        Spirit lastEdition = spiritRepository.save(variant(master, "Batch 3", 2));
        spiritRepository.save(variant(master, "Batch 1", 0));
        spiritRepository.save(variant(master, "Batch 2", 1));

        SpiritListResponse row = searchOne("우거다일");

        assertThat(row.id()).isEqualTo(master.getId());
        assertThat(row.canonicalPathKo()).startsWith("/ko/spirits/" + lastEdition.getId() + "-");
        assertThat(row.canonicalPathEn()).startsWith("/en/spirits/" + lastEdition.getId() + "-");
    }

    @Test
    @DisplayName("대표 에디션 — 표시 순서가 없는 에디션은 목록 맨 뒤로 취급한다")
    void canonicalPathTreatsNullDisplayOrderAsLast() {
        Spirit master = spiritRepository.save(spirit("탈리스커 스톰", "Talisker Storm",
                SpiritCategory.WHISKY, "Scotland", new BigDecimal("45.8"), null, 0, producer));
        spiritRepository.save(variant(master, "Batch 1", 0));
        Spirit unordered = spiritRepository.save(variant(master, "Batch 2", null));

        SpiritListResponse row = searchOne("스톰");

        assertThat(row.canonicalPathKo()).startsWith("/ko/spirits/" + unordered.getId() + "-");
    }

    @Test
    @DisplayName("대표 에디션 — 숨김 에디션이 마지막이어도 활성 에디션을 링크한다")
    void canonicalPathSkipsHiddenVariant() {
        Spirit master = spiritRepository.save(spirit("라가불린 8년", "Lagavulin 8",
                SpiritCategory.WHISKY, "Scotland", new BigDecimal("48.0"), null, 0, producer));
        Spirit visible = spiritRepository.save(variant(master, "Batch 1", 0));
        Spirit hiddenEdition = variant(master, "Batch 2", 1);
        hiddenEdition.hide();
        spiritRepository.save(hiddenEdition);

        SpiritListResponse row = searchOne("라가불린");

        assertThat(row.canonicalPathKo()).startsWith("/ko/spirits/" + visible.getId() + "-");
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

    /** 키워드로 마스터 1건만 걸리는 상황을 전제로 그 행을 꺼낸다. */
    private SpiritListResponse searchOne(String keyword) {
        Page<SpiritListResponse> result = search(condition().keyword(keyword).build());
        assertThat(result.getContent()).hasSize(1);
        return result.getContent().get(0);
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
        s.updateAvgScore(avgScore, reviewCount, reviewCount);
        return s;
    }

    /** 마스터에 달리는 하위 에디션(배치). */
    private Spirit variant(Spirit master, String variantValue, Integer displayOrder) {
        Spirit v = Spirit.builder()
                .nameKo(master.getNameKo()).nameEn(master.getNameEn())
                .category(master.getCategory()).country(master.getCountry())
                .producer(master.getProducer())
                .parent(master)
                .variantType(VariantType.BATCH)
                .variantValue(variantValue)
                .displayOrder(displayOrder)
                .build();
        v.approve();
        return v;
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
                    minScore, maxScore, SpiritStatus.ACTIVE, sort,
                    null, null, null, null);
        }
    }
}
