package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SpiritSearchServiceTest {

    @MockitoBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockitoBean
    private ReactiveRedisConnectionFactory reactiveRedisConnectionFactory;

    @MockitoBean
    private JavaMailSender javaMailSender;

    @Autowired
    private SpiritSearchService spiritSearchService;

    @Autowired
    private SpiritService spiritService;

    @Autowired
    private SpiritRepository spiritRepository;

    @Autowired
    private ProducerRepository producerRepository;

    private Spirit targetSpirit;

    @BeforeEach
    void setUp() {
        // 1. 생산자 등록
        Producer producer = Producer.builder()
                .nameKo("글렌알라키 증류소")
                .nameEn("GlenAllachie Distillery")
                .country("스코틀랜드")
                .region("스페이사이드")
                .searchKeywords("알라키, glenallachie")
                .build();
        producerRepository.save(producer);

        // 2. 주류 등록 (글렌알라키 12년)
        targetSpirit = Spirit.builder()
                .nameKo("글렌알라키 12년")
                .nameEn("GlenAllachie 12 Years Old")
                .category(SpiritCategory.WHISKY)
                .producer(producer)
                .abv(new BigDecimal("46.0"))
                .status(SpiritStatus.ACTIVE)
                .build();
        spiritRepository.save(targetSpirit);

        // 크라이겔라키 13년 등록
        Producer craigellachieProducer = Producer.builder()
                .nameKo("크라이겔라키 증류소")
                .nameEn("Craigellachie Distillery")
                .country("스코틀랜드")
                .region("스페이사이드")
                .searchKeywords("크라이겔라키, craigellachie")
                .build();
        producerRepository.save(craigellachieProducer);

        Spirit craigellachie = Spirit.builder()
                .nameKo("크라이겔라키 13년")
                .nameEn("Craigellachie 13 Years Old")
                .category(SpiritCategory.WHISKY)
                .producer(craigellachieProducer)
                .abv(new BigDecimal("46.0"))
                .status(SpiritStatus.ACTIVE)
                .build();
        spiritRepository.save(craigellachie);

        // 3. 인덱스 동기화 강제 수행
        spiritRepository.flush();
    }

    @AfterEach
    void tearDown() {
        spiritRepository.deleteAll();
        producerRepository.deleteAll();
    }

    @Test
    @DisplayName("다양한 한글 변칙 검색어로 글렌알라키 12년이 검색되는지 검증한다")
    void searchSpiritByVariousKeywords() throws Exception {
        // given
        List<String> keywords = List.of(
                "글렌알라키 12년", // 100% 매칭
                "글렌 알라키 12년", // 띄어쓰기 다름
                "글렌알라키12년",   // 띄어쓰기 없음
                "글렌알라키12",    // '년' 생략
                "알라키12"         // 부분 잘림 + 숫자 결합
        );

        for (String keyword : keywords) {
            System.out.println(">>> Testing keyword: [" + keyword + "]");
            // when
            SpiritSearchCondition condition = new SpiritSearchCondition(
                    keyword, null, null, null, null,
                    null, null, null, null, null, null, null,
                    SpiritStatus.ACTIVE, null,
                    null, null, null, null
            );

            // RDBMS + SearchEngine 결합 서비스 호출
            Page<SpiritListResponse> result = spiritService.searchSpirits(condition, PageRequest.of(0, 10));

            // then
            assertThat(result.getContent())
                    .as("검색어 '" + keyword + "'에 대한 검색 결과가 존재해야 합니다.")
                    .isNotEmpty();
            assertThat(result.getContent().get(0).nameKo())
                    .as("검색어 '" + keyword + "'의 첫번째 결과는 '글렌알라키 12년' 이어야 합니다.")
                    .isEqualTo("글렌알라키 12년");
        }
    }

    @Test
    @DisplayName("알라키 검색 시 크라이겔라키 13년은 검색결과에 포함되지 않고 글렌알라키 12년만 포함되어야 한다")
    void searchAlachyShouldNotMatchCraigellachie() throws Exception {
        // given
        String keyword = "알라키";
        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, null, null, null, null,
                null, null, null, null, null, null, null,
                SpiritStatus.ACTIVE, null,
                null, null, null, null
        );

        // when
        Page<SpiritListResponse> result = spiritService.searchSpirits(condition, PageRequest.of(0, 10));

        List<String> names = result.getContent().stream()
                .map(SpiritListResponse::nameKo)
                .toList();

        assertThat(names).contains("글렌알라키 12년");
        assertThat(names).doesNotContain("크라이겔라키 13년");
    }

    @Test
    @DisplayName("자동완성 검색 시 2글자 미만은 빈 결과를 내고, 알라키 입력 시 글렌알라키만 조회되어야 한다")
    void autocompleteTest() {
        // given
        String tooShort = "알";
        String matchKeyword = "알라키";

        // when
        List<com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse> shortResult = 
            spiritSearchService.autocompleteSpirits(tooShort);
        List<com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse> matchResult = 
            spiritSearchService.autocompleteSpirits(matchKeyword);

        // then
        assertThat(shortResult).isEmpty();
        assertThat(matchResult).isNotEmpty();
        
        List<String> names = matchResult.stream()
                .map(com.caskbycask.domain.spirit.dto.SpiritAutocompleteResponse::nameKo)
                .toList();
        assertThat(names).contains("글렌알라키 12년");
        assertThat(names).doesNotContain("크라이겔라키 13년");
    }
}
