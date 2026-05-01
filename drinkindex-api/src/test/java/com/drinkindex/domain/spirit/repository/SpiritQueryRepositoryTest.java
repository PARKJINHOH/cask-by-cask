package com.drinkindex.domain.spirit.repository;

import com.drinkindex.domain.distillery.entity.Distillery;
import com.drinkindex.domain.distillery.repository.DistilleryRepository;
import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.global.config.QuerydslConfig;
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
@Import(QuerydslConfig.class)
class SpiritQueryRepositoryTest {

    @Autowired
    private SpiritRepository spiritRepository;

    @Autowired
    private DistilleryRepository distilleryRepository;

    private Distillery distillery;
    private PageRequest page;

    @BeforeEach
    void setUp() {
        distillery = distilleryRepository.save(Distillery.builder()
                .nameKo("글렌피딕")
                .nameEn("Glenfiddich")
                .country("Scotland")
                .region("Speyside")
                .build());

        spiritRepository.save(activeSpirit("글렌피딕 12년", "Glenfiddich 12", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("40.0"), new BigDecimal("88.0"), 150, distillery));
        spiritRepository.save(activeSpirit("글렌피딕 18년", "Glenfiddich 18", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("43.0"), new BigDecimal("92.0"), 250, distillery));
        spiritRepository.save(activeSpirit("헤네시 VSOP", "Hennessy VSOP", SpiritCategory.COGNAC,
                "France", new BigDecimal("40.0"), new BigDecimal("85.0"), 80, null));
        spiritRepository.save(activeSpirit("돈 훌리오", "Don Julio", SpiritCategory.TEQUILA,
                "Mexico", new BigDecimal("38.0"), null, 60, null));

        Spirit hidden = activeSpirit("숨김술", "Hidden Spirit", SpiritCategory.WHISKY,
                "Scotland", new BigDecimal("40.0"), null, 10, null);
        hidden.hide();
        spiritRepository.save(hidden);

        page = PageRequest.of(0, 20);
    }

    @Test
    @DisplayName("전체 조회 - ACTIVE 상태만 반환")
    void searchAll_returnsOnlyActive() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, null, SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getContent()).allMatch(s -> s.getStatus() == SpiritStatus.ACTIVE);
    }

    @Test
    @DisplayName("카테고리 필터")
    void searchByCategory() {
        Page<Spirit> result = spiritRepository.search(
                SpiritCategory.WHISKY, null, null, null, null, null, null, SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).allMatch(s -> s.getCategory() == SpiritCategory.WHISKY);
    }

    @Test
    @DisplayName("국가 필터")
    void searchByCountry() {
        Page<Spirit> result = spiritRepository.search(
                null, "Scotland", null, null, null, null, null, SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getContent()).allMatch(s -> "Scotland".equals(s.getCountry()));
    }

    @Test
    @DisplayName("도수 범위 필터 (minAbv=40, maxAbv=42)")
    void searchByAbvRange() {
        Page<Spirit> result = spiritRepository.search(
                null, null, new BigDecimal("40.0"), new BigDecimal("42.0"),
                null, null, null, SpiritSort.LATEST, page);
        assertThat(result.getContent()).allMatch(s ->
                s.getAbv() != null
                && s.getAbv().compareTo(new BigDecimal("40.0")) >= 0
                && s.getAbv().compareTo(new BigDecimal("42.0")) <= 0);
    }

    @Test
    @DisplayName("점수 범위 필터 - avgScore null인 항목 제외")
    void searchByScoreRange() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null,
                new BigDecimal("87.0"), new BigDecimal("95.0"),
                null, SpiritSort.LATEST, page);
        assertThat(result.getContent()).allMatch(s ->
                s.getAvgScore() != null
                && s.getAvgScore().compareTo(new BigDecimal("87.0")) >= 0
                && s.getAvgScore().compareTo(new BigDecimal("95.0")) <= 0);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("키워드 검색 (nameKo 부분 일치)")
    void searchByKeywordKo() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, "글렌", SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("키워드 검색 (nameEn 대소문자 무시)")
    void searchByKeywordEnCaseInsensitive() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, "hennessy", SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getNameEn()).isEqualTo("Hennessy VSOP");
    }

    @Test
    @DisplayName("정렬 — SCORE_DESC")
    void sortByScoreDesc() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, null, SpiritSort.SCORE_DESC, page);
        var scores = result.getContent().stream()
                .filter(s -> s.getAvgScore() != null)
                .map(Spirit::getAvgScore)
                .toList();
        for (int i = 0; i < scores.size() - 1; i++) {
            assertThat(scores.get(i)).isGreaterThanOrEqualTo(scores.get(i + 1));
        }
    }

    @Test
    @DisplayName("정렬 — REVIEW_COUNT_DESC")
    void sortByReviewCountDesc() {
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, null, SpiritSort.REVIEW_COUNT_DESC, page);
        var counts = result.getContent().stream().map(Spirit::getReviewCount).toList();
        for (int i = 0; i < counts.size() - 1; i++) {
            assertThat(counts.get(i)).isGreaterThanOrEqualTo(counts.get(i + 1));
        }
    }

    @Test
    @DisplayName("복합 필터 — 카테고리 + 국가")
    void searchByCategoryAndCountry() {
        Page<Spirit> result = spiritRepository.search(
                SpiritCategory.WHISKY, "Scotland", null, null, null, null, null, SpiritSort.LATEST, page);
        assertThat(result.getTotalElements()).isEqualTo(2);
    }

    @Test
    @DisplayName("페이지네이션")
    void pagination() {
        PageRequest firstPage = PageRequest.of(0, 2);
        Page<Spirit> result = spiritRepository.search(
                null, null, null, null, null, null, null, SpiritSort.LATEST, firstPage);
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(4);
        assertThat(result.getTotalPages()).isEqualTo(2);
    }

    private Spirit activeSpirit(String nameKo, String nameEn, SpiritCategory category,
                                String country, BigDecimal abv, BigDecimal avgScore,
                                int reviewCount, Distillery distillery) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(category)
                .country(country)
                .abv(abv)
                .distillery(distillery)
                .build();
        spirit.approve();
        spirit.updateAvgScore(avgScore, reviewCount);
        return spirit;
    }
}
