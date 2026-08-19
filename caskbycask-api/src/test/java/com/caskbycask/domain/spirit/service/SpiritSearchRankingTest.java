package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
import com.caskbycask.domain.spirit.dto.SpiritListResponse;
import com.caskbycask.domain.spirit.dto.SpiritSearchCondition;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SpiritSearchRankingTest {

    @MockitoBean
    private RedisConnectionFactory redisConnectionFactory;

    @MockitoBean
    private ReactiveRedisConnectionFactory reactiveRedisConnectionFactory;

    @MockitoBean
    private JavaMailSender javaMailSender;

    @Autowired
    private SpiritService spiritService;

    @Autowired
    private SpiritRepository spiritRepository;

    @Autowired
    private ProducerRepository producerRepository;

    @AfterEach
    void tearDown() {
        spiritRepository.deleteAll();
        producerRepository.deleteAll();
    }

    @Test
    @DisplayName("attached brand and age keyword ranks the exact spirit before age-only matches")
    void searchCompactBrandAndAgePrioritizesExactSpiritForPublicAndAdmin() {
        Producer balvenieProducer = producerRepository.save(producer(
                "\uBC1C\uBCA0\uB2C8 \uC99D\uB958\uC18C",
                "The Balvenie Distillery",
                "balvenie"));
        Producer cardhuProducer = producerRepository.save(producer(
                "\uCE74\uB4C0 \uC99D\uB958\uC18C",
                "Cardhu Distillery",
                null));
        Producer benriachProducer = producerRepository.save(producer(
                "\uBCA4\uB9AC\uC545 \uC99D\uB958\uC18C",
                "Benriach Distillery",
                null));

        Spirit balvenie12 = spiritRepository.save(activeSpirit(
                "\uB354 \uBC1C\uBCA0\uB2C8 12\uB144",
                "The Balvenie 12 Years Old",
                balvenieProducer));
        Spirit cardhu12 = spiritRepository.save(activeSpirit(
                "\uCE74\uB4C0 12\uB144",
                "Cardhu 12 Years Old",
                cardhuProducer));
        Spirit benriach12 = spiritRepository.save(activeSpirit(
                "\uBCA4\uB9AC\uC545 12\uB144",
                "Benriach 12 Years Old",
                benriachProducer));
        spiritRepository.flush();

        Page<SpiritListResponse> publicResult = spiritService.searchSpirits(
                searchCondition("\uBC1C\uBCA0\uB2C812", SpiritStatus.ACTIVE),
                PageRequest.of(0, 10));
        Page<SpiritListResponse> adminResult = spiritService.searchSpiritsForAdmin(
                searchCondition("\uBC1C\uBCA0\uB2C812", null),
                PageRequest.of(0, 10));

        assertThat(publicResult.getContent()).extracting(SpiritListResponse::id)
                .first()
                .isEqualTo(balvenie12.getId());
        assertThat(adminResult.getContent()).extracting(SpiritListResponse::id)
                .first()
                .isEqualTo(balvenie12.getId());
        assertThat(publicResult.getContent()).extracting(SpiritListResponse::id)
                .doesNotContain(cardhu12.getId(), benriach12.getId());
    }

    @Test
    @DisplayName("exact Korean brand keyword excludes other spirits sharing only a prefix")
    void searchExactKoreanBrandExcludesSimilarPrefixesEverywhere() {
        Producer glenturretProducer = producerRepository.save(producer(
                "\uAE00\uB80C\uD130\uB81B \uC99D\uB958\uC18C",
                "The Glenturret Distillery",
                null));
        Producer glenfiddichProducer = producerRepository.save(producer(
                "\uAE00\uB80C\uD53C\uB515 \uC99D\uB958\uC18C",
                "Glenfiddich Distillery",
                null));
        Producer glendronachProducer = producerRepository.save(producer(
                "\uB354 \uAE00\uB80C\uB4DC\uB85C\uB099 \uC99D\uB958\uC18C",
                "The GlenDronach Distillery",
                null));

        Spirit glenturret12 = spiritRepository.save(activeSpirit(
                "\uAE00\uB80C\uD130\uB81B 12\uB144",
                "The Glenturret 12 Years Old",
                glenturretProducer));
        Spirit glenturret15 = spiritRepository.save(activeSpirit(
                "\uAE00\uB80C\uD130\uB81B 15\uB144",
                "The Glenturret 15 Years Old",
                glenturretProducer));
        Spirit glenfiddich12 = spiritRepository.save(activeSpirit(
                "\uAE00\uB80C\uD53C\uB515 12\uB144",
                "Glenfiddich 12 Years Old",
                glenfiddichProducer));
        Spirit glendronach15 = spiritRepository.save(activeSpirit(
                "\uB354 \uAE00\uB80C\uB4DC\uB85C\uB099 15\uB144",
                "The GlenDronach 15 Years Old",
                glendronachProducer));
        spiritRepository.flush();

        Page<SpiritListResponse> publicResult = spiritService.searchSpirits(
                searchCondition("\uAE00\uB80C\uB4DC\uB85C\uB099", SpiritStatus.ACTIVE),
                PageRequest.of(0, 10));
        Page<SpiritListResponse> adminResult = spiritService.searchSpiritsForAdmin(
                searchCondition("\uAE00\uB80C\uB4DC\uB85C\uB099", null),
                PageRequest.of(0, 10));
        List<Long> autocompleteIds = spiritService.autocomplete("\uAE00\uB80C\uB4DC\uB85C\uB099").stream()
                .map(response -> response.id())
                .toList();

        assertThat(publicResult.getContent()).extracting(SpiritListResponse::id)
                .containsExactly(glendronach15.getId());
        assertThat(adminResult.getContent()).extracting(SpiritListResponse::id)
                .containsExactly(glendronach15.getId());
        assertThat(autocompleteIds).containsExactly(glendronach15.getId());
        assertThat(publicResult.getContent()).extracting(SpiritListResponse::id)
                .doesNotContain(glenturret12.getId(), glenturret15.getId(), glenfiddich12.getId());
    }

    private Producer producer(String nameKo, String nameEn, String searchKeywords) {
        return Producer.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .country("Scotland")
                .region("Speyside")
                .searchKeywords(searchKeywords)
                .build();
    }

    private Spirit activeSpirit(String nameKo, String nameEn, Producer producer) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(SpiritCategory.WHISKY)
                .producer(producer)
                .abv(new BigDecimal("40.0"))
                .status(SpiritStatus.ACTIVE)
                .build();
        spirit.updateAvgScore(BigDecimal.ZERO, 0, 0);
        return spirit;
    }

    private SpiritSearchCondition searchCondition(String keyword, SpiritStatus status) {
        return new SpiritSearchCondition(
                keyword, null, null, null, null,
                null, null, null, null, null, null, null,
                status, null,
                null, null, null, null
        );
    }
}
