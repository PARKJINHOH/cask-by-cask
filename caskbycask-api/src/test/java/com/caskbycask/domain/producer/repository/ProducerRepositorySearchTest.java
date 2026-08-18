package com.caskbycask.domain.producer.repository;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
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

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 관리자 생산자 목록 검색 조건 — 특히 한국어명 필터가 검색 별칭까지 보는지.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class ProducerRepositorySearchTest {

    @Autowired
    private ProducerRepository producerRepository;

    private PageRequest page;

    @BeforeEach
    void setUp() {
        page = PageRequest.of(0, 20);

        producerRepository.save(Producer.builder()
                .type(ProducerType.COGNAC_HOUSE)
                .nameKo("카뮈").nameEn("Camus").country("France")
                .searchKeywords("까뮤 까뮈")
                .build());
        // 별칭이 없는 생산자 — 별칭 조건이 붙어도 이름 매칭이 그대로여야 한다.
        producerRepository.save(Producer.builder()
                .nameKo("글렌피딕").nameEn("Glenfiddich").country("Scotland")
                .build());
    }

    @Test
    @DisplayName("한국어명 필터는 한국어명으로 찾는다")
    void nameKoFilterMatchesNameKo() {
        Page<Producer> result = producerRepository.search(
                null, "카뮈", null, null, null, null, null, page);

        assertThat(result.getContent()).extracting(Producer::getNameKo).containsExactly("카뮈");
    }

    @Test
    @DisplayName("한국어명 필터는 검색 별칭으로도 찾는다")
    void nameKoFilterMatchesSearchKeywords() {
        Page<Producer> result = producerRepository.search(
                null, "까뮤", null, null, null, null, null, page);

        assertThat(result.getContent()).extracting(Producer::getNameKo).containsExactly("카뮈");
    }

    @Test
    @DisplayName("별칭이 없는 생산자도 한국어명으로는 그대로 찾힌다")
    void nameKoFilterMatchesProducerWithoutAlias() {
        Page<Producer> result = producerRepository.search(
                null, "글렌피딕", null, null, null, null, null, page);

        assertThat(result.getContent()).extracting(Producer::getNameKo).containsExactly("글렌피딕");
    }

    @Test
    @DisplayName("이름에도 별칭에도 없는 값은 걸리지 않는다")
    void nameKoFilterMatchesNothingWhenAbsent() {
        Page<Producer> result = producerRepository.search(
                null, "발베니", null, null, null, null, null, page);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("영어명 필터는 별칭을 보지 않는다")
    void nameEnFilterIgnoresSearchKeywords() {
        Page<Producer> result = producerRepository.search(
                null, null, "까뮤", null, null, null, null, page);

        assertThat(result.getContent()).isEmpty();
    }

    @Test
    @DisplayName("한국어명 필터는 다른 조건과 AND 로 걸린다")
    void nameKoFilterCombinesWithOtherFilters() {
        Page<Producer> matched = producerRepository.search(
                null, "까뮤", null, "France", null, null, null, page);
        Page<Producer> mismatched = producerRepository.search(
                null, "까뮤", null, "Scotland", null, null, null, page);

        assertThat(matched.getContent()).extracting(Producer::getNameKo).containsExactly("카뮈");
        assertThat(mismatched.getContent()).isEmpty();
    }

    @Test
    @DisplayName("통합 keyword 검색은 기존대로 이름·별칭을 모두 본다")
    void keywordStillMatchesNamesAndAlias() {
        Page<Producer> byAlias = producerRepository.search(
                "까뮤", null, null, null, null, null, null, page);
        Page<Producer> byNameEn = producerRepository.search(
                "Glenfiddich", null, null, null, null, null, null, page);

        assertThat(byAlias.getContent()).extracting(Producer::getNameKo).containsExactly("카뮈");
        assertThat(byNameEn.getContent()).extracting(Producer::getNameKo).containsExactly("글렌피딕");
    }
}
